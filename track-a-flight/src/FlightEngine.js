import * as THREE from 'three';
import { ARENA_CONFIGS } from './arenas/ArenaRegistry.js';
import { sound } from '../../core/audio/SynthAudio.js';
import { economy } from '../../core/economy/EconomyManager.js';
import { ads } from '../../core/ads/AdManager.js';

export class FlightEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.config = ARENA_CONFIGS.mantaRay; // Default arena
    
    // Engine State
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.resource = 100;
    this.depth = 10;
    this.collectedPearls = 0;
    this.hasRevived = false;

    // Movement & Flight Physics
    this.pos = new THREE.Vector3(0, 0, 0);
    this.prevPos = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, this.config.baseSpeed);
    this.pitch = 0;
    this.yaw = 0;
    this.roll = 0;
    this.steerInput = { x: 0, y: 0 };
    this.touchStart = null;

    // Gates and Obstacles
    this.gates = [];
    this.gateSpacing = 35;
    this.nextGateZ = 40;
    this.activeRingsPool = [];

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.heroMesh = null;
    this.particleInstanced = null;
    this.ambientLight = null;
    this.dirLight = null;

    // Clock
    this.clock = new THREE.Clock();

    this.initThree();
    this.setupInputs();
    this.setupUI();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(this.config.fogColor, this.config.fogNear, this.config.fogFar);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    this.ambientLight = new THREE.AmbientLight(this.config.ambientLight, 1.8);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.dirLight.position.set(0, 20, 10);
    this.scene.add(this.dirLight);

    // Build Hero Model & Environment
    this.buildHeroMesh();
    this.buildInstancedParticles();
    this.spawnInitialGates();

    window.addEventListener('resize', () => this.onResize(), false);
  }

  buildHeroMesh() {
    if (this.heroMesh) this.scene.remove(this.heroMesh);

    // Procedural Manta Ray / Flight Craft Mesh
    const heroGroup = new THREE.Group();

    // Body
    const bodyGeo = new THREE.ConeGeometry(1.2, 3.2, 5);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.config.heroColor),
      emissive: new THREE.Color(this.config.heroGlow),
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    heroGroup.add(bodyMesh);

    // Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(-3.4, -0.6);
    wingShape.lineTo(0, -1.8);
    wingShape.lineTo(3.4, -0.6);
    wingShape.closePath();

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    wingGeo.rotateX(Math.PI / 2);
    const wingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.config.heroGlow),
      emissive: new THREE.Color(this.config.heroColor),
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide
    });
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    wingMesh.position.y = -0.1;
    heroGroup.add(wingMesh);

    this.heroMesh = heroGroup;
    this.scene.add(this.heroMesh);
  }

  buildInstancedParticles() {
    const count = 300;
    const geo = new THREE.SphereGeometry(0.18, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.config.ringColor),
      transparent: true,
      opacity: 0.65
    });

    this.particleInstanced = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 40,
        Math.random() * 300
      );
      dummy.scale.setScalar(Math.random() * 0.8 + 0.4);
      dummy.updateMatrix();
      this.particleInstanced.setMatrixAt(i, dummy.matrix);
    }
    this.particleInstanced.instanceMatrix.needsUpdate = true;
    this.scene.add(this.particleInstanced);
  }

  spawnInitialGates() {
    for (let i = 0; i < 8; i++) {
      this.spawnGate();
    }
  }

  spawnGate() {
    const ringRadius = 4.2;
    const ringGeo = new THREE.TorusGeometry(ringRadius, 0.28, 8, 24);
    const ringMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.config.ringColor),
      emissive: new THREE.Color(this.config.ringCoreColor),
      emissiveIntensity: 0.8,
      roughness: 0.3
    });

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    const x = (Math.random() - 0.5) * 24;
    const y = (Math.random() - 0.5) * 16;
    const z = this.nextGateZ;

    ringMesh.position.set(x, y, z);
    this.scene.add(ringMesh);

    this.gates.push({
      mesh: ringMesh,
      x, y, z,
      radius: ringRadius,
      passed: false
    });

    this.nextGateZ += this.gateSpacing;
  }

  setupInputs() {
    // Mobile Touch Steering (Smoothed delta touch)
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      sound.init();
      const t = e.touches[0];
      this.touchStart = { x: t.clientX, y: t.clientY };
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.touchStart) return;
      const t = e.touches[0];
      const dx = (t.clientX - this.touchStart.x) / (window.innerWidth * 0.25);
      const dy = (t.clientY - this.touchStart.y) / (window.innerHeight * 0.25);
      this.steerInput.x = Math.max(-1, Math.min(1, dx));
      this.steerInput.y = Math.max(-1, Math.min(1, -dy)); // Invert Y for natural flight pitch
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      this.touchStart = null;
      this.steerInput.x = 0;
      this.steerInput.y = 0;
    }, { passive: true });

    // Keyboard Controls (WASD / Arrows)
    const keys = {};
    window.addEventListener('keydown', (e) => {
      sound.init();
      keys[e.code] = true;
      this.updateKeyboardInput(keys);
    });
    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
      this.updateKeyboardInput(keys);
    });
  }

  updateKeyboardInput(keys) {
    let x = 0;
    let y = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) x -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) x += 1;
    if (keys['ArrowUp'] || keys['KeyW']) y += 1;
    if (keys['ArrowDown'] || keys['KeyS']) y -= 1;
    this.steerInput.x = x;
    this.steerInput.y = y;
  }

  setupUI() {
    this.uiScore = document.getElementById('hud-score');
    this.uiResourceBar = document.getElementById('hud-resource-bar');
    this.uiResourceText = document.getElementById('hud-resource-text');
    this.uiDepth = document.getElementById('hud-depth');
    this.uiPearls = document.getElementById('hud-pearls');
  }

  start() {
    sound.init();
    this.isRunning = true;
    this.isPaused = false;
    this.clock.start();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  loop() {
    if (!this.isRunning) return;
    requestAnimationFrame(this.loop);
    if (this.isPaused) return;

    // MANDATORY GUARDRAIL: Clamped Delta Time (dt <= 0.05s)
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);

    this.update(dt);
    this.render();
  }

  update(dt) {
    // Store previous position for frame-crossing interpolation
    this.prevPos.copy(this.pos);

    // Forward flight propulsion
    this.pos.z += this.velocity.z * dt;

    // Lateral and vertical flight steering with inertia
    const steerSpeed = 22;
    this.pos.x += this.steerInput.x * steerSpeed * dt;
    this.pos.y += this.steerInput.y * steerSpeed * dt;

    // Bounds soft clamp
    this.pos.x = Math.max(-28, Math.min(28, this.pos.x));
    this.pos.y = Math.max(-18, Math.min(18, this.pos.y));

    // Dynamic bank and pitch rotation
    this.heroMesh.position.copy(this.pos);
    this.heroMesh.rotation.z = -this.steerInput.x * 0.45;
    this.heroMesh.rotation.x = (Math.PI / 2) - (this.steerInput.y * 0.35);

    // Chase camera positioning
    this.camera.position.set(
      this.pos.x * 0.7,
      this.pos.y * 0.7 + 3.2,
      this.pos.z - 8.5
    );
    this.camera.lookAt(this.pos.x, this.pos.y + 0.5, this.pos.z + 15);

    // Resource Drain (Oxygen / Fuel / Filter)
    if (!this.config.isCalmMode) {
      this.resource -= this.config.resourceDrainRate * dt;
      if (this.resource <= 0) {
        this.triggerGameOver('Depleted ' + this.config.resourceName);
        return;
      }
    }

    // Depth calculation
    this.depth = Math.floor(10 + this.pos.z * 0.4);
    this.score = Math.floor(this.pos.z * 1.5);

    // MANDATORY GUARDRAIL: Frame-crossing linear interpolation collision
    for (let i = 0; i < this.gates.length; i++) {
      const gate = this.gates[i];
      if (!gate.passed && this.prevPos.z < gate.z && this.pos.z >= gate.z) {
        // Precise intersection factor t
        const t = (gate.z - this.prevPos.z) / (this.pos.z - this.prevPos.z);
        const crossX = this.prevPos.x + t * (this.pos.x - this.prevPos.x);
        const crossY = this.prevPos.y + t * (this.pos.y - this.prevPos.y);

        const distSq = (crossX - gate.x) ** 2 + (crossY - gate.y) ** 2;
        if (distSq <= gate.radius ** 2) {
          // Gate passed successfully!
          gate.passed = true;
          const isCenter = distSq <= (gate.radius * 0.35) ** 2;
          this.onGatePassed(gate, isCenter);
        } else {
          // Missed gate
          gate.passed = true;
          gate.mesh.material.color.setHex(0xef4444); // Flash red
        }
      }
    }

    // Gate recycle / progression
    if (this.gates.length > 0 && this.gates[0].z < this.pos.z - 20) {
      const oldGate = this.gates.shift();
      this.scene.remove(oldGate.mesh);
      oldGate.mesh.geometry.dispose();
      oldGate.mesh.material.dispose();
      this.spawnGate();
    }

    // Move instanced particles forward as player progresses
    if (this.particleInstanced) {
      if (this.pos.z > this.particleInstanced.position.z + 150) {
        this.particleInstanced.position.z = this.pos.z;
      }
    }

    // Update HUD
    this.updateHUD();
  }

  onGatePassed(gate, isCenter) {
    gate.mesh.material.color.setHex(0x22c55e); // Flash green
    sound.playGatePass(isCenter);

    // Replenish Resource
    this.resource = Math.min(100, this.resource + this.config.resourceRingReplenish);

    // Pearl / Currency Rewards
    const reward = this.config.currencyReward * (isCenter ? 2 : 1);
    this.collectedPearls += reward;
    economy.addPearls(reward);
    sound.playCollect();
  }

  updateHUD() {
    if (this.uiScore) this.uiScore.textContent = this.score;
    if (this.uiResourceBar) this.uiResourceBar.style.width = `${Math.max(0, this.resource)}%`;
    if (this.uiResourceText) this.uiResourceText.textContent = `${this.config.resourceName}: ${Math.ceil(this.resource)}%`;
    if (this.uiDepth) this.uiDepth.textContent = `${this.depth}m`;
    if (this.uiPearls) this.uiPearls.textContent = economy.getPearls();
  }

  triggerGameOver(reason) {
    this.isRunning = false;
    economy.recordScore('flight', this.config.id, this.score);

    const modal = document.getElementById('game-over-modal');
    if (modal) {
      document.getElementById('game-over-reason').textContent = reason;
      document.getElementById('final-score').textContent = this.score;
      document.getElementById('final-pearls').textContent = `+${this.collectedPearls} Pearls`;
      
      // Revive button availability
      const reviveBtn = document.getElementById('revive-btn');
      if (reviveBtn) {
        reviveBtn.style.display = this.hasRevived ? 'none' : 'inline-block';
      }

      modal.style.display = 'flex';
    }

    ads.showInterstitial();
  }

  attemptRevive() {
    if (this.hasRevived) return;
    ads.showRewarded(() => {
      this.hasRevived = true;
      this.resource = 70;
      this.isRunning = true;
      this.clock.start();
      sound.playRevive();
      const modal = document.getElementById('game-over-modal');
      if (modal) modal.style.display = 'none';
      requestAnimationFrame(this.loop);
    }, () => {
      alert('Rewarded ad could not be completed.');
    });
  }

  // MANDATORY GUARDRAIL: Strict GPU Memory Teardown
  switchArena(newArenaId) {
    if (!ARENA_CONFIGS[newArenaId]) return;
    this.isRunning = false;

    // Complete GPU cleanup
    this.clearWorld();

    this.config = ARENA_CONFIGS[newArenaId];
    this.initThree();
    this.score = 0;
    this.resource = 100;
    this.pos.set(0, 0, 0);
    this.prevPos.set(0, 0, 0);
    this.nextGateZ = 40;
    this.hasRevived = false;
    this.start();
  }

  clearWorld() {
    this.scene.traverse((object) => {
      if (!object.isMesh && !object.isInstancedMesh) return;
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    this.renderer.renderLists.dispose();
    this.gates = [];
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
