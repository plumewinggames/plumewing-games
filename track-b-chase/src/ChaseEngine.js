import { ANIMAL_CONFIGS } from './animals/AnimalRegistry.js';
import { STAGE_CONFIGS } from './stages/StageRegistry.js';
import { sound } from '../../core/audio/SynthAudio.js';
import { economy } from '../../core/economy/EconomyManager.js';
import { ads } from '../../core/ads/AdManager.js';

export class ChaseEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    // Virtual base resolution
    this.baseW = 960;
    this.baseH = 540;

    // Configs
    this.animalConfig = ANIMAL_CONFIGS.dodo;
    this.stageConfig = STAGE_CONFIGS[0];
    this.currentLevel = this.stageConfig.levels[0];

    // Engine loop & state
    this.isRunning = false;
    this.distance = 0;
    this.score = 0;
    this.collectedBerries = 0;
    this.hasRevived = false;
    this.invulnerableTimer = 0;

    // Camera Trauma System (0.0 to 1.0)
    this.trauma = 0;
    this.shakeOffset = { x: 0, y: 0 };

    // Lanes (3 depth lanes: Y positions on screen)
    this.lanes = [340, 390, 440];
    this.currentLane = 1; // Start in middle lane
    this.targetLaneY = this.lanes[1];
    this.laneY = this.lanes[1];

    // Animal State
    this.animal = {
      x: 320,
      y: 0,
      vy: 0,
      isGrounded: true,
      isDucking: false,
      isGliding: false,
      hearts: this.animalConfig.hearts
    };

    // Caveman Villain State
    this.caveman = {
      x: 80,
      distanceBehind: 240, // Pixel gap
      malletTimer: 1.8,
      isSlamming: false,
      slamAnimProgress: 0
    };

    // Shockwaves & Obstacles
    this.shockwaves = [];
    this.obstacles = [];
    this.berries = [];
    this.dustParticles = [];

    this.lastTime = 0;
    this.initCanvasSize();
    this.setupInputs();
    this.spawnLevelEntities();
  }

  initCanvasSize() {
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.scale = Math.min(this.canvas.width / this.baseW, this.canvas.height / this.baseH);
      this.offsetX = (this.canvas.width - this.baseW * this.scale) / 2;
      this.offsetY = (this.canvas.height - this.baseH * this.scale) / 2;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  setupInputs() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      sound.init();
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.changeLane(-1);
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.changeLane(1);
      if (e.code === 'Space') this.jump();
      if (e.code === 'KeyC' || e.code === 'ShiftLeft') this.duck(true);
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.animal.isGliding = false;
      if (e.code === 'KeyC' || e.code === 'ShiftLeft') this.duck(false);
    });

    // Touch Controls
    const btnJump = document.getElementById('touch-jump');
    const btnDuck = document.getElementById('touch-duck');
    const btnUp = document.getElementById('touch-up');
    const btnDown = document.getElementById('touch-down');

    if (btnJump) {
      btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); sound.init(); this.jump(); }, { passive: false });
      btnJump.addEventListener('touchend', (e) => { e.preventDefault(); this.animal.isGliding = false; }, { passive: false });
    }
    if (btnDuck) {
      btnDuck.addEventListener('touchstart', (e) => { e.preventDefault(); sound.init(); this.duck(true); }, { passive: false });
      btnDuck.addEventListener('touchend', (e) => { e.preventDefault(); this.duck(false); }, { passive: false });
    }
    if (btnUp) {
      btnUp.addEventListener('touchstart', (e) => { e.preventDefault(); sound.init(); this.changeLane(-1); }, { passive: false });
    }
    if (btnDown) {
      btnDown.addEventListener('touchstart', (e) => { e.preventDefault(); sound.init(); this.changeLane(1); }, { passive: false });
    }
  }

  changeLane(dir) {
    this.currentLane = Math.max(0, Math.min(2, this.currentLane + dir));
    this.targetLaneY = this.lanes[this.currentLane];
  }

  jump() {
    if (this.animal.isGrounded) {
      this.animal.vy = this.animalConfig.jumpForce;
      this.animal.isGrounded = false;
      this.createJumpDust();
    } else if (this.animalConfig.id === 'dodo') {
      // Dodo Flutter-Glide
      this.animal.isGliding = true;
    }
  }

  duck(isDucking) {
    this.animal.isDucking = isDucking;
  }

  spawnLevelEntities() {
    this.obstacles = [];
    this.berries = [];
    for (let x = 700; x < this.currentLevel.length; x += 380 + Math.random() * 280) {
      const lane = Math.floor(Math.random() * 3);
      this.obstacles.push({
        x,
        lane,
        width: 38,
        height: 44,
        hit: false
      });
      // Spawn golden berry near obstacles
      this.berries.push({
        x: x + 120,
        lane,
        collected: false
      });
    }
  }

  start() {
    sound.init();
    ads.gameplayStart();
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  loop(currentTime) {
    if (!this.isRunning) return;
    requestAnimationFrame(this.loop);

    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // MANDATORY GUARDRAIL: Clamped Delta Time (dt <= 0.05s)
    const dt = Math.min(rawDt, 0.05);

    this.update(dt);
    this.render();
  }

  update(dt) {
    // Forward progression
    const runSpeed = this.animalConfig.speed * 60;
    this.distance += runSpeed * dt;
    this.score = Math.floor(this.distance / 10);

    // Invulnerability decay
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    // Smooth lane vertical transitions
    this.laneY += (this.targetLaneY - this.laneY) * 14 * dt;

    // Animal jumping / gravity physics
    if (!this.animal.isGrounded) {
      let gravity = this.animalConfig.gravity * 60;
      if (this.animal.isGliding && this.animal.vy > 0) {
        gravity *= this.animalConfig.glideFactor; // Dodo flutter
      }
      this.animal.vy += gravity * dt;
      this.animal.y += this.animal.vy * 60 * dt;

      if (this.animal.y >= 0) {
        this.animal.y = 0;
        this.animal.vy = 0;
        this.animal.isGrounded = true;
        this.animal.isGliding = false;
        this.createJumpDust();
      }
    }

    // Caveman Mallet Slam Loop (1.4 - 2.0s rhythm)
    this.caveman.malletTimer -= dt;
    if (this.caveman.malletTimer <= 0.3 && !this.caveman.isSlamming) {
      this.caveman.isSlamming = true;
    }

    if (this.caveman.malletTimer <= 0) {
      this.triggerMalletSlam();
      const minI = this.stageConfig.malletIntervalRange[0];
      const maxI = this.stageConfig.malletIntervalRange[1];
      this.caveman.malletTimer = minI + Math.random() * (maxI - minI);
      this.caveman.isSlamming = false;
    }

    // Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.x += 420 * dt; // Advance forward
      sw.radius += 20 * dt;

      // Check collision with animal
      if (!sw.hasHit && Math.abs(sw.x - this.animal.x) < 28) {
        // Check Turtle shell tuck immunity
        const turtleImmune = this.animalConfig.id === 'turtle' && this.animal.isDucking;
        if (!turtleImmune && this.animal.y > -25 && this.invulnerableTimer <= 0) {
          sw.hasHit = true;
          this.takeDamage('Struck by Caveman Shockwave');
        }
      }

      if (sw.x > this.baseW + 100) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Obstacle and Berry Collision
    const animalWorldX = this.distance + this.animal.x;
    for (const obs of this.obstacles) {
      if (!obs.hit && obs.lane === this.currentLane && Math.abs(obs.x - animalWorldX) < 32) {
        if (this.animal.y > -20 && this.invulnerableTimer <= 0) {
          if (this.animalConfig.smashObstacles) {
            // Mammoth heavy dash destroys obstacle!
            obs.hit = true;
            this.createJumpDust();
            sound.playMalletImpact();
          } else {
            obs.hit = true;
            this.takeDamage('Hit Primitive Obstacle');
          }
        }
      }
    }

    for (const b of this.berries) {
      if (!b.collected && b.lane === this.currentLane && Math.abs(b.x - animalWorldX) < 35) {
        b.collected = true;
        this.collectedBerries++;
        economy.addGoldenBerries(1);
        sound.playCollect();
      }
    }

    // Camera Trauma Shake Decay
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - 1.2 * dt);
      const shakeMagnitude = this.trauma * this.trauma * 16;
      this.shakeOffset.x = (Math.random() * 2 - 1) * shakeMagnitude;
      this.shakeOffset.y = (Math.random() * 2 - 1) * shakeMagnitude;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }

    // Level Finish Check
    if (this.distance >= this.currentLevel.length) {
      this.triggerWin();
    }

    this.updateHUD();
  }

  triggerMalletSlam() {
    sound.playMalletImpact();
    sound.playShockwave();
    this.trauma = 0.75; // Heavy screen trauma shake

    // Launch 2.5D shockwave ring from Caveman ground point
    this.shockwaves.push({
      x: this.caveman.x + 60,
      lane: Math.floor(Math.random() * 3),
      radius: 12,
      hasHit: false
    });
  }

  takeDamage(reason) {
    this.animal.hearts--;
    this.invulnerableTimer = 1.2;
    this.trauma = 0.45;
    if (this.animal.hearts <= 0) {
      this.triggerGameOver(reason);
    }
  }

  createJumpDust() {
    for (let i = 0; i < 6; i++) {
      this.dustParticles.push({
        x: this.animal.x + (Math.random() * 20 - 10),
        y: this.laneY + 10,
        vx: (Math.random() - 0.7) * 40,
        vy: -Math.random() * 25,
        alpha: 0.8,
        life: 0.35
      });
    }
  }

  updateHUD() {
    const elDist = document.getElementById('chase-hud-dist');
    const elBerries = document.getElementById('chase-hud-berries');
    const elHearts = document.getElementById('chase-hud-hearts');
    const elProgress = document.getElementById('chase-progress-animal');

    if (elDist) elDist.textContent = `${Math.floor(this.distance)}m / ${this.currentLevel.length}m`;
    if (elBerries) elBerries.textContent = economy.getGoldenBerries();
    if (elHearts) elHearts.textContent = '❤️'.repeat(Math.max(0, this.animal.hearts));
    if (elProgress) {
      const pct = Math.min(100, (this.distance / this.currentLevel.length) * 100);
      elProgress.style.left = `${pct}%`;
    }
  }

  triggerGameOver(reason) {
    this.isRunning = false;
    ads.gameplayStop();
    economy.recordScore('chase', this.currentLevel.id, this.score);

    const modal = document.getElementById('chase-over-modal');
    if (modal) {
      document.getElementById('chase-over-reason').textContent = reason;
      document.getElementById('chase-final-dist').textContent = `${Math.floor(this.distance)}m`;
      document.getElementById('chase-final-berries').textContent = `+${this.collectedBerries} Berries`;

      const reviveBtn = document.getElementById('chase-revive-btn');
      if (reviveBtn) {
        reviveBtn.style.display = this.hasRevived ? 'none' : 'inline-block';
      }

      modal.style.display = 'flex';
    }

    ads.showInterstitial();
  }

  triggerWin() {
    this.isRunning = false;
    ads.gameplayStop();
    ads.happyTime();
    economy.unlockLevel(this.currentLevel.id);
    economy.recordScore('chase', this.currentLevel.id, this.score);
    alert(`🎉 Stage Cleared! Distance: ${Math.floor(this.distance)}m!`);
    location.reload();
  }

  attemptRevive() {
    if (this.hasRevived) return;
    ads.showRewarded(() => {
      this.hasRevived = true;
      this.animal.hearts = 2;
      this.invulnerableTimer = 2.5; // 2.5s invulnerability
      this.caveman.x = Math.max(20, this.caveman.x - 140); // Push Caveman back
      this.isRunning = true;
      this.lastTime = performance.now();
      ads.gameplayStart();
      sound.playRevive();
      const modal = document.getElementById('chase-over-modal');
      if (modal) modal.style.display = 'none';
      requestAnimationFrame(this.loop);
    }, () => {
      alert('Rewarded ad could not be completed.');
    });
  }

  render() {
    this.ctx.save();
    this.ctx.translate(this.offsetX + this.shakeOffset.x, this.offsetY + this.shakeOffset.y);
    this.ctx.scale(this.scale, this.scale);

    // Layer 1: Sky gradient
    const sky = this.ctx.createLinearGradient(0, 0, 0, this.baseH);
    sky.addColorStop(0, this.stageConfig.skyColors[0]);
    sky.addColorStop(1, this.stageConfig.skyColors[1]);
    this.ctx.fillStyle = sky;
    this.ctx.fillRect(0, 0, this.baseW, this.baseH);

    // Layer 2: Distant Mountains (Parallax 0.1x)
    this.ctx.fillStyle = this.stageConfig.distantMountains;
    this.drawMountains(0.1, 180, 70);

    // Layer 3: Mid-range Crags (Parallax 0.35x)
    this.ctx.fillStyle = 'rgba(0,0,0,0.18)';
    this.drawMountains(0.35, 260, 45);

    // Layer 4: Lower-Third Running Horizon Ground (Parallax 1.0x)
    this.ctx.fillStyle = this.stageConfig.groundColor;
    this.ctx.fillRect(0, 310, this.baseW, this.baseH - 310);

    // Draw 3 Depth Lanes
    this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this.ctx.lineWidth = 2;
    this.lanes.forEach(ly => {
      this.ctx.beginPath();
      this.ctx.moveTo(0, ly + 15);
      this.ctx.lineTo(this.baseW, ly + 15);
      this.ctx.stroke();
    });

    // Layer 5: Entities (Sorted by Y lane depth)
    this.drawObstaclesAndBerries();
    this.drawShockwaves();
    this.drawCaveman();
    this.drawAnimal();

    // Layer 6: Dynamic Dust Particles
    this.drawDustParticles();

    this.ctx.restore();
  }

  drawMountains(speed, baseY, height) {
    const offset = (this.distance * speed) % 300;
    this.ctx.beginPath();
    this.ctx.moveTo(-50, this.baseH);
    for (let x = -50; x <= this.baseW + 100; x += 150) {
      const peakX = x - offset;
      this.ctx.lineTo(peakX, baseY - height);
      this.ctx.lineTo(peakX + 75, baseY);
    }
    this.ctx.lineTo(this.baseW + 50, this.baseH);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawCaveman() {
    const cx = this.caveman.x;
    const cy = this.laneY;

    // Contact drop shadow
    this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
    this.ctx.beginPath();
    this.ctx.ellipse(cx + 25, cy + 18, 28, 8, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Caveman Body
    this.ctx.fillStyle = '#b45309';
    this.ctx.fillRect(cx, cy - 50, 42, 60);

    // Mallet
    this.ctx.save();
    this.ctx.translate(cx + 35, cy - 35);
    const angle = this.caveman.isSlamming ? Math.PI / 4 : -Math.PI / 3;
    this.ctx.rotate(angle);
    this.ctx.fillStyle = '#78350f'; // Handle
    this.ctx.fillRect(-4, -40, 8, 45);
    this.ctx.fillStyle = '#57534e'; // Stone mallet head
    this.ctx.fillRect(-18, -60, 36, 24);
    this.ctx.restore();
  }

  drawAnimal() {
    const ax = this.animal.x;
    const ay = this.laneY + this.animal.y;

    // Blinking during invulnerability
    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      return;
    }

    // Dynamic contact drop shadow (scales with jump height)
    const shadowScale = Math.max(0.3, 1 + this.animal.y / 120);
    this.ctx.fillStyle = 'rgba(0,0,0,0.28)';
    this.ctx.beginPath();
    this.ctx.ellipse(ax + 16, this.laneY + 16, 20 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Animal Body
    this.ctx.fillStyle = this.animalConfig.color;
    const height = this.animal.isDucking ? 20 : 36;
    const yPos = this.animal.isDucking ? ay - 10 : ay - 26;
    this.ctx.beginPath();
    this.ctx.roundRect(ax, yPos, 36, height, 10);
    this.ctx.fill();

    // Beak / Head detail
    this.ctx.fillStyle = this.animalConfig.beakColor;
    this.ctx.fillRect(ax + 28, yPos + 6, 12, 10);

    // Eye
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(ax + 20, yPos + 4, 6, 6);
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(ax + 23, yPos + 6, 3, 3);
  }

  drawShockwaves() {
    this.ctx.save();
    for (const sw of this.shockwaves) {
      this.ctx.strokeStyle = '#ef4444';
      this.ctx.lineWidth = 5;
      this.ctx.beginPath();
      this.ctx.ellipse(sw.x, this.lanes[sw.lane] + 12, sw.radius, sw.radius * 0.35, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawObstaclesAndBerries() {
    const animalWorldX = this.distance + this.animal.x;
    for (const obs of this.obstacles) {
      const screenX = obs.x - this.distance;
      if (screenX > -50 && screenX < this.baseW + 50) {
        this.ctx.fillStyle = obs.hit ? '#94a3b8' : '#78350f';
        this.ctx.fillRect(screenX, this.lanes[obs.lane] - 30, obs.width, obs.height);
      }
    }

    for (const b of this.berries) {
      if (!b.collected) {
        const screenX = b.x - this.distance;
        if (screenX > -50 && screenX < this.baseW + 50) {
          this.ctx.fillStyle = '#eab308';
          this.ctx.beginPath();
          this.ctx.arc(screenX, this.lanes[b.lane] - 15, 10, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }

  drawDustParticles() {
    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const p = this.dustParticles[i];
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.alpha -= 0.03;
      if (p.alpha <= 0) {
        this.dustParticles.splice(i, 1);
      } else {
        this.ctx.fillStyle = `rgba(255, 240, 200, ${p.alpha})`;
        this.ctx.fillRect(p.x, p.y, 4, 4);
      }
    }
  }
}
