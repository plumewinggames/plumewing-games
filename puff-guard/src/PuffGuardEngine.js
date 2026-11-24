import { DIVER_CONFIGS } from './DiverRegistry.js';
import { REEF_CONFIGS, DIFFICULTY_CONFIGS } from './ReefRegistry.js';
import { sound } from '../../core/audio/SynthAudio.js';
import { economy } from '../../core/economy/EconomyManager.js';
import { ads } from '../../core/ads/AdManager.js';

export class PuffGuardEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    // Virtual base resolution
    this.baseW = 960;
    this.baseH = 540;

    // Configs
    this.diver = DIVER_CONFIGS.maya;
    this.difficulty = DIFFICULTY_CONFIGS.standard;
    this.reefIndex = 0;
    this.reef = REEF_CONFIGS[this.reefIndex];

    // Engine loop & state
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.pearls = 0;
    this.shells = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.hasRevived = false;

    // Player Diver State
    this.player = {
      x: 180,
      y: 270,
      vx: 0,
      vy: 0,
      angle: 0,
      hearts: 3,
      maxHearts: 3,
      air: 100,
      maxAir: 100,
      invulnerableTimer: 0,
      abilityCooldown: 0,
      isShielded: false,
      isDashing: false,
      dashTimer: 0
    };

    // Camera Trauma Shake (0.0 to 1.0)
    this.trauma = 0;
    this.shakeOffset = { x: 0, y: 0 };

    // Dynamic Entities
    this.predators = [];
    this.decorativeFish = [];
    this.prizes = []; // Pearls & Shells
    this.bubbles = [];
    this.sparkles = [];
    this.oysters = [];
    this.soundRings = []; // Soren sonic pulses

    // Timers
    this.predatorSpawnTimer = 0;
    this.lastTime = 0;

    this.initCanvasSize();
    this.setupInputs();
    this.initReefEntities();
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
    this.keys = {};
    window.addEventListener('keydown', (e) => {
      sound.init();
      this.keys[e.code] = true;
      if (e.code === 'Space') this.triggerDiverAbility();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Touch Virtual Joystick / Steer
    this.touchSteer = { x: 0, y: 0 };
    this.touchActive = false;

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      sound.init();
      const t = e.touches[0];
      this.touchStart = { x: t.clientX, y: t.clientY };
      this.touchActive = true;
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.touchStart) return;
      const t = e.touches[0];
      const dx = (t.clientX - this.touchStart.x) / (window.innerWidth * 0.2);
      const dy = (t.clientY - this.touchStart.y) / (window.innerHeight * 0.2);
      this.touchSteer.x = Math.max(-1, Math.min(1, dx));
      this.touchSteer.y = Math.max(-1, Math.min(1, dy));
    }, { passive: false });

    const endTouch = () => {
      this.touchActive = false;
      this.touchSteer.x = 0;
      this.touchSteer.y = 0;
      this.touchStart = null;
    };
    this.canvas.addEventListener('touchend', endTouch, { passive: true });
    this.canvas.addEventListener('touchcancel', endTouch, { passive: true });

    // Touch Ability Button
    const btnAbility = document.getElementById('touch-ability');
    if (btnAbility) {
      btnAbility.addEventListener('touchstart', (e) => {
        e.preventDefault();
        sound.init();
        this.triggerDiverAbility();
      }, { passive: false });
    }
  }

  setDiver(diverId) {
    if (DIVER_CONFIGS[diverId]) {
      this.diver = DIVER_CONFIGS[diverId];
      this.player.maxHearts = this.diver.maxHearts + this.difficulty.heartBonus;
      this.player.hearts = this.player.maxHearts;
      this.player.maxAir = this.diver.airCapacity;
      this.player.air = this.player.maxAir;
    }
  }

  setDifficulty(diffId) {
    if (DIFFICULTY_CONFIGS[diffId]) {
      this.difficulty = DIFFICULTY_CONFIGS[diffId];
      this.player.maxHearts = this.diver.maxHearts + this.difficulty.heartBonus;
      this.player.hearts = this.player.maxHearts;
    }
  }

  initReefEntities() {
    this.predators = [];
    this.decorativeFish = [];
    this.prizes = [];
    this.bubbles = [];
    this.sparkles = [];
    this.oysters = [];
    this.soundRings = [];

    // Spawn schools of friendly, ambient fish (Clownfish, Blue Tangs)
    for (let i = 0; i < 18; i++) {
      this.decorativeFish.push({
        x: Math.random() * this.baseW,
        y: 60 + Math.random() * (this.baseH - 120),
        vx: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 35 + 25),
        type: Math.random() > 0.5 ? 'clownfish' : 'tang',
        wigglePhase: Math.random() * Math.PI * 2,
        size: Math.random() * 8 + 14
      });
    }

    // Spawn Oyster prize beds on reef bottom
    for (let x = 120; x < this.baseW; x += 180) {
      this.oysters.push({
        x,
        y: this.baseH - 42,
        hasPearl: true,
        isOpen: false,
        timer: Math.random() * 4
      });
    }

    // Pre-populate ambient rising bubbles
    for (let i = 0; i < 30; i++) {
      this.bubbles.push({
        x: Math.random() * this.baseW,
        y: Math.random() * this.baseH,
        radius: Math.random() * 5 + 2,
        vy: -Math.random() * 40 - 20,
        alpha: Math.random() * 0.5 + 0.3
      });
    }
  }

  triggerDiverAbility() {
    if (this.player.abilityCooldown > 0) return;

    if (this.diver.id === 'maya') {
      // Hydro-Dash
      this.player.isDashing = true;
      this.player.dashTimer = 0.45;
      this.player.abilityCooldown = this.diver.cooldown;
      sound.playShockwave();
      this.createBurstBubbles(this.player.x, this.player.y, 25);
    } else if (this.diver.id === 'jax') {
      // Kinetic Bubble-Shield
      this.player.isShielded = true;
      this.player.abilityCooldown = this.diver.cooldown;
      sound.playGatePass(true);
      setTimeout(() => { this.player.isShielded = false; }, 3200);
    } else if (this.diver.id === 'soren') {
      // Sonic Pulse Ring
      this.player.abilityCooldown = this.diver.cooldown;
      this.soundRings.push({
        x: this.player.x,
        y: this.player.y,
        radius: 15,
        maxRadius: 280,
        alpha: 0.9
      });
      sound.playMalletImpact();
      this.trauma = 0.4;
    }
  }

  start() {
    sound.init();
    ads.gameplayStart();
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  loop(currentTime) {
    if (!this.isRunning) return;
    requestAnimationFrame(this.loop);
    if (this.isPaused) return;

    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // MANDATORY GUARDRAIL: Clamped Delta Time (dt <= 0.05s)
    const dt = Math.min(rawDt, 0.05);

    this.update(dt);
    this.render();
  }

  update(dt) {
    // 1. Player Diver Movement Physics
    let inputX = 0;
    let inputY = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) inputX -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) inputX += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) inputY -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) inputY += 1;

    if (this.touchActive) {
      inputX = this.touchSteer.x;
      inputY = this.touchSteer.y;
    }

    // Dash speed multiplier for Maya
    let speed = this.diver.baseSpeed * 60;
    if (this.player.isDashing) {
      speed *= 2.6;
      this.player.dashTimer -= dt;
      if (this.player.dashTimer <= 0) this.player.isDashing = false;
      this.createBurstBubbles(this.player.x, this.player.y, 2);
    }

    // Smooth fluid drag acceleration
    this.player.vx += (inputX * speed - this.player.vx) * 8 * dt;
    this.player.vy += (inputY * speed - this.player.vy) * 8 * dt;

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    // Screen Boundary Clamping
    this.player.x = Math.max(30, Math.min(this.baseW - 30, this.player.x));
    this.player.y = Math.max(40, Math.min(this.baseH - 45, this.player.y));

    // Dynamic rotation angle following swimming velocity
    if (Math.abs(this.player.vx) > 5 || Math.abs(this.player.vy) > 5) {
      this.player.angle = Math.atan2(this.player.vy, this.player.vx);
    }

    // Ability cooldown decay
    if (this.player.abilityCooldown > 0) {
      this.player.abilityCooldown = Math.max(0, this.player.abilityCooldown - dt);
    }

    // Invulnerability decay
    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer = Math.max(0, this.player.invulnerableTimer - dt);
    }

    // Air Meter Depletion
    const airDrain = this.diver.airDrainRate * this.difficulty.airDrainMult;
    this.player.air -= airDrain * dt;
    if (this.player.air <= 0) {
      this.takeDamage('Suffocated: Air Depleted');
      this.player.air = 45; // Emergency backup breath
    }

    // Exhaust breathing bubbles
    if (Math.random() < 0.25) {
      this.bubbles.push({
        x: this.player.x - Math.cos(this.player.angle) * 15,
        y: this.player.y - Math.sin(this.player.angle) * 15,
        radius: Math.random() * 4 + 2,
        vy: -Math.random() * 30 - 20,
        alpha: 0.7
      });
    }

    // 2. Predator Spawning & AI Loop
    this.predatorSpawnTimer -= dt;
    if (this.predatorSpawnTimer <= 0) {
      this.spawnPredator();
      this.predatorSpawnTimer = this.reef.predatorSpawnInterval / this.difficulty.predatorSpeedMult;
    }

    // Update Predators
    for (let i = this.predators.length - 1; i >= 0; i--) {
      const pred = this.predators[i];
      pred.wiggle += 0.15;

      // Behavior: Track and pursue player
      const dx = this.player.x - pred.x;
      const dy = this.player.y - pred.y;
      const dist = Math.hypot(dx, dy);

      // Natural enemy specific behaviors
      if (pred.type === 'puffer') {
        // Inflate when close
        if (dist < 180) {
          pred.scale = Math.min(2.4, pred.scale + 2.5 * dt);
        } else {
          pred.scale = Math.max(1.0, pred.scale - 1.5 * dt);
        }
      } else if (pred.type === 'barracuda') {
        // Sudden high-speed dash burst
        pred.burstTimer = (pred.burstTimer || 2.5) - dt;
        if (pred.burstTimer <= 0) {
          pred.speedMultiplier = 2.4;
          sound.playShockwave();
          pred.burstTimer = 3.5;
        } else {
          pred.speedMultiplier = Math.max(1.0, (pred.speedMultiplier || 1.0) - 1.2 * dt);
        }
      }

      const currentSpeed = pred.baseSpeed * (pred.speedMultiplier || 1.0) * this.difficulty.predatorSpeedMult;
      if (dist > 10) {
        pred.x += (dx / dist) * currentSpeed * dt;
        pred.y += (dy / dist) * currentSpeed * dt;
        pred.angle = Math.atan2(dy, dx);
      }

      // Check Collision with Player
      const hitDist = 28 * pred.scale;
      if (dist < hitDist) {
        if (this.player.isShielded) {
          // Jax Bubble-Shield reflects predator!
          pred.x -= (dx / dist) * 160;
          pred.y -= (dy / dist) * 160;
          sound.playMalletImpact();
          this.createBurstBubbles(pred.x, pred.y, 14);
        } else if (this.player.isDashing) {
          // Maya Dash knocks predator away
          pred.x -= (dx / dist) * 120;
          this.createBurstBubbles(pred.x, pred.y, 10);
        } else if (this.player.invulnerableTimer <= 0) {
          this.takeDamage(`Attacked by ${pred.name}`);
        }
      }
    }

    // 3. Sonic Pulse Rings Update (Dr. Soren Ability)
    for (let r = this.soundRings.length - 1; r >= 0; r--) {
      const ring = this.soundRings[r];
      ring.radius += 360 * dt;
      ring.alpha -= 1.2 * dt;

      // Stun and push back all predators caught in ring
      for (const pred of this.predators) {
        const d = Math.hypot(pred.x - ring.x, pred.y - ring.y);
        if (Math.abs(d - ring.radius) < 30) {
          const pushX = (pred.x - ring.x) / d;
          const pushY = (pred.y - ring.y) / d;
          pred.x += pushX * 180 * dt;
          pred.y += pushY * 180 * dt;
          pred.speedMultiplier = 0.3; // Stun slowdown
        }
      }

      if (ring.radius > ring.maxRadius || ring.alpha <= 0) {
        this.soundRings.splice(r, 1);
      }
    }

    // 4. Update Oysters & Pearl Rewards
    for (const oyster of this.oysters) {
      oyster.timer -= dt;
      if (oyster.timer <= 0) {
        oyster.isOpen = !oyster.isOpen;
        oyster.timer = oyster.isOpen ? 3.5 : 5.0;
        if (oyster.isOpen && oyster.hasPearl) {
          this.createSparkles(oyster.x, oyster.y - 12, 5);
        }
      }

      // Collect Pearl if open
      if (oyster.isOpen && oyster.hasPearl) {
        const d = Math.hypot(this.player.x - oyster.x, this.player.y - oyster.y);
        if (d < 38) {
          oyster.hasPearl = false;
          this.collectPrize('pearl', oyster.x, oyster.y - 10, 150);
        }
      }
    }

    // 5. Update Prize Drops (Pearls & Golden Shells)
    for (let p = this.prizes.length - 1; p >= 0; p--) {
      const prize = this.prizes[p];
      prize.y += Math.sin(Date.now() * 0.005 + prize.x) * 0.4;
      prize.life -= dt;

      // Player magnet collection
      const d = Math.hypot(this.player.x - prize.x, this.player.y - prize.y);
      if (d < 45) {
        this.collectPrize(prize.type, prize.x, prize.y, prize.points);
        this.prizes.splice(p, 1);
      } else if (prize.life <= 0) {
        this.prizes.splice(p, 1);
      }
    }

    // 6. Update Ambient Bubbles & Sparkles
    for (let b = this.bubbles.length - 1; b >= 0; b--) {
      const bubble = this.bubbles[b];
      bubble.y += bubble.vy * dt;
      if (bubble.y < -20) {
        this.bubbles.splice(b, 1);
      }
    }

    for (let s = this.sparkles.length - 1; s >= 0; s--) {
      const spk = this.sparkles[s];
      spk.x += spk.vx * dt;
      spk.y += spk.vy * dt;
      spk.alpha -= 1.8 * dt;
      if (spk.alpha <= 0) this.sparkles.splice(s, 1);
    }

    // 7. Ambient Decorative Fish
    for (const f of this.decorativeFish) {
      f.x += f.vx * dt;
      f.wigglePhase += 0.2;
      if (f.x > this.baseW + 50) f.x = -50;
      if (f.x < -50) f.x = this.baseW + 50;
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

    // Check Reef Cleared Victory
    if (this.score >= this.reef.targetScore) {
      this.advanceReef();
    }

    this.updateHUD();
  }

  spawnPredator() {
    const types = this.reef.predators;
    const type = types[Math.floor(Math.random() * types.length)];
    const side = Math.random() > 0.5 ? 1 : 0;
    const x = side === 1 ? this.baseW + 40 : -40;
    const y = 80 + Math.random() * (this.baseH - 160);

    let name = 'Pufferfish';
    let baseSpeed = 40;
    if (type === 'barracuda') { name = 'Swift Barracuda'; baseSpeed = 75; }
    if (type === 'eel') { name = 'Electric Moray'; baseSpeed = 50; }
    if (type === 'shark') { name = 'Tiger Shark'; baseSpeed = 65; }

    this.predators.push({
      x, y,
      type,
      name,
      baseSpeed,
      scale: 1.0,
      wiggle: 0,
      angle: 0
    });
  }

  collectPrize(type, x, y, points) {
    sound.playCollect();
    this.createSparkles(x, y, 8);

    const mult = this.diver.prizeMultiplier * this.difficulty.prizeMult;
    if (type === 'pearl') {
      this.pearls += 1;
      economy.addPearls(1);
      this.score += Math.floor(points * mult);
    } else {
      this.shells += 1;
      economy.addGoldenBerries(1); // Mapped to portfolio currency
      this.score += Math.floor(points * mult);
    }

    // Replenish Air on Prize Collect
    this.player.air = Math.min(this.player.maxAir, this.player.air + 8);
  }

  createBurstBubbles(x, y, count) {
    for (let i = 0; i < count; i++) {
      this.bubbles.push({
        x: x + (Math.random() * 20 - 10),
        y: y + (Math.random() * 20 - 10),
        radius: Math.random() * 6 + 2,
        vy: -Math.random() * 60 - 30,
        alpha: 0.8
      });
    }
  }

  createSparkles(x, y, count) {
    for (let i = 0; i < count; i++) {
      this.sparkles.push({
        x, y,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        alpha: 1.0,
        color: Math.random() > 0.5 ? '#facc15' : '#38bdf8'
      });
    }
  }

  takeDamage(reason) {
    this.player.hearts--;
    this.player.invulnerableTimer = 1.5;
    this.trauma = 0.65;
    sound.playMalletImpact();
    this.createBurstBubbles(this.player.x, this.player.y, 18);

    if (this.player.hearts <= 0) {
      this.triggerGameOver(reason);
    }
  }

  advanceReef() {
    this.isPaused = true;
    sound.playRevive();
    ads.happyTime();

    this.reefIndex++;
    if (this.reefIndex >= REEF_CONFIGS.length) {
      alert('🏆 CONGRATULATIONS! You cleared all 5 reefs and conquered the Abyssal Mariana Trench!');
      location.reload();
      return;
    }

    this.reef = REEF_CONFIGS[this.reefIndex];
    alert(`🎉 REEF CLEARED! Diving deeper into Reef ${this.reef.reefNumber}: ${this.reef.name} (${this.reef.depth})!`);
    this.initReefEntities();
    this.isPaused = false;
  }

  updateHUD() {
    const elAir = document.getElementById('hud-air-bar');
    const elScore = document.getElementById('hud-score');
    const elPearls = document.getElementById('hud-pearls');
    const elShells = document.getElementById('hud-shells');
    const elHearts = document.getElementById('hud-hearts');
    const elReef = document.getElementById('hud-reef-name');

    if (elAir) elAir.style.width = `${Math.max(0, (this.player.air / this.player.maxAir) * 100)}%`;
    if (elScore) elScore.textContent = this.score;
    if (elPearls) elPearls.textContent = this.pearls;
    if (elShells) elShells.textContent = this.shells;
    if (elHearts) elHearts.textContent = '❤️'.repeat(Math.max(0, this.player.hearts));
    if (elReef) elReef.textContent = `Reef ${this.reef.reefNumber}: ${this.reef.name} (${this.reef.depth})`;
  }

  triggerGameOver(reason) {
    this.isRunning = false;
    ads.gameplayStop();
    economy.recordScore('flight', 'puffGuard', this.score);

    const modal = document.getElementById('game-over-modal');
    if (modal) {
      document.getElementById('game-over-reason').textContent = reason;
      document.getElementById('final-score').textContent = this.score;
      document.getElementById('final-prizes').textContent = `+${this.pearls} Pearls • +${this.shells} Shells`;

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
      this.player.hearts = 2;
      this.player.air = this.player.maxAir;
      this.player.invulnerableTimer = 2.5;
      this.isRunning = true;
      this.lastTime = performance.now();
      sound.playRevive();
      ads.gameplayStart();

      const modal = document.getElementById('game-over-modal');
      if (modal) modal.style.display = 'none';
      requestAnimationFrame(this.loop);
    }, () => {
      alert('Rewarded ad could not be completed.');
    });
  }

  // --- RENDERING PIPELINE (Attractive VFX & Clean Border Isolation) ---
  render() {
    // 0. Clean entire display canvas to eliminate trailing ghosts, shake artifacts & border clutter
    this.ctx.fillStyle = '#020617';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(this.offsetX + this.shakeOffset.x, this.offsetY + this.shakeOffset.y);
    this.ctx.scale(this.scale, this.scale);

    // Strict clipping to base 960x540 viewport: prevents entities/particles bleeding into border areas
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.baseW, this.baseH);
    this.ctx.clip();

    // 1. Water Background Gradient
    const waterGrad = this.ctx.createLinearGradient(0, 0, 0, this.baseH);
    waterGrad.addColorStop(0, this.reef.waterTop);
    waterGrad.addColorStop(1, this.reef.waterBottom);
    this.ctx.fillStyle = waterGrad;
    this.ctx.fillRect(0, 0, this.baseW, this.baseH);

    // 2. Volumetric God Rays
    if (this.reef.hasGodRays) {
      this.drawGodRays();
    }

    // 3. Dynamic Water Caustics on Seabed
    this.drawWaterCaustics();

    // 4. Glowing Coral Reef Bottom
    this.drawCoralReef();

    // 5. Oysters & Prize Drops
    this.drawOystersAndPrizes();

    // 6. Ambient Friendly Fish
    this.drawDecorativeFish();

    // 7. Predators (Puffers, Sharks, Eels)
    this.drawPredators();

    // 8. Player Diver
    this.drawPlayer();

    // 9. Sonic Pulse Rings
    this.drawSonicRings();

    // 10. Bubbles & Sparkles
    this.drawBubblesAndSparkles();

    // 11. Subtle inner border vignette to frame gameplay cleanly
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(1, 1, this.baseW - 2, this.baseH - 2);

    this.ctx.restore();

    // Clean outer letterbox / pillarbox mask to ensure crisp razor-sharp margins
    this.ctx.fillStyle = '#020617';
    if (this.offsetX > 0) {
      this.ctx.fillRect(0, 0, Math.ceil(this.offsetX), this.canvas.height);
      this.ctx.fillRect(Math.floor(this.canvas.width - this.offsetX), 0, Math.ceil(this.offsetX), this.canvas.height);
    }
    if (this.offsetY > 0) {
      this.ctx.fillRect(0, 0, this.canvas.width, Math.ceil(this.offsetY));
      this.ctx.fillRect(0, Math.floor(this.canvas.height - this.offsetY), this.canvas.width, Math.ceil(this.offsetY));
    }
  }

  drawGodRays() {
    this.ctx.save();
    this.ctx.fillStyle = `rgba(255, 255, 255, ${this.reef.godRayOpacity || 0.25})`;
    for (let i = 0; i < 6; i++) {
      const x = this.baseW * (0.15 + i * 0.16) + Math.sin(Date.now() * 0.001 + i) * 20;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x + 70, 0);
      this.ctx.lineTo(x - 80, this.baseH);
      this.ctx.lineTo(x - 170, this.baseH);
      this.ctx.closePath();
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawWaterCaustics() {
    this.ctx.save();
    this.ctx.strokeStyle = this.reef.causticColor;
    this.ctx.lineWidth = 1.5;
    const time = Date.now() * 0.002;
    for (let x = 0; x < this.baseW; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.baseH - 45);
      const cy = this.baseH - 35 + Math.sin(x * 0.05 + time) * 8;
      this.ctx.quadraticCurveTo(x + 20, cy, x + 40, this.baseH - 45);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawCoralReef() {
    this.ctx.save();
    // Seabed substrate
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, this.baseH - 35, this.baseW, 35);

    // Glowing coral branches
    for (let i = 0; i < 14; i++) {
      const cx = 40 + i * 65;
      const coralColor = this.reef.corals[i % this.reef.corals.length];
      this.ctx.fillStyle = coralColor;
      this.ctx.beginPath();
      this.ctx.arc(cx, this.baseH - 32, 22, Math.PI, 0);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawOystersAndPrizes() {
    // Oysters
    for (const o of this.oysters) {
      this.ctx.save();
      this.ctx.translate(o.x, o.y);
      this.ctx.fillStyle = '#475569';
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, 18, o.isOpen ? 14 : 7, 0, 0, Math.PI * 2);
      this.ctx.fill();

      if (o.hasPearl && o.isOpen) {
        // Glowing Pearl
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = '#38bdf8';
        this.ctx.shadowBlur = 12;
        this.ctx.beginPath();
        this.ctx.arc(0, -2, 6, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    // Floating Prizes
    for (const p of this.prizes) {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      if (p.type === 'pearl') {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = '#38bdf8';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 7, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = '#facc15';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  drawDecorativeFish() {
    for (const f of this.decorativeFish) {
      this.ctx.save();
      this.ctx.translate(f.x, f.y);
      const dir = f.vx > 0 ? 1 : -1;
      this.ctx.scale(dir, 1);

      // Tail oscillation
      const tailOsc = Math.sin(f.wigglePhase) * 6;

      if (f.type === 'clownfish') {
        // Vibrant Orange Clownfish with White Stripes
        this.ctx.fillStyle = '#ea580c';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, f.size, f.size * 0.6, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // White Stripe
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-2, -f.size * 0.55, 4, f.size * 1.1);

        // Tail
        this.ctx.fillStyle = '#ea580c';
        this.ctx.beginPath();
        this.ctx.moveTo(-f.size * 0.8, 0);
        this.ctx.lineTo(-f.size * 1.4, -6 + tailOsc);
        this.ctx.lineTo(-f.size * 1.4, 6 + tailOsc);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        // Blue Tang
        this.ctx.fillStyle = '#2563eb';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, f.size, f.size * 0.7, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Yellow Tail
        this.ctx.fillStyle = '#facc15';
        this.ctx.beginPath();
        this.ctx.moveTo(-f.size * 0.8, 0);
        this.ctx.lineTo(-f.size * 1.4, -8 + tailOsc);
        this.ctx.lineTo(-f.size * 1.4, 8 + tailOsc);
        this.ctx.closePath();
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  drawPredators() {
    for (const p of this.predators) {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.angle);
      this.ctx.scale(p.scale, p.scale);

      if (p.type === 'puffer') {
        // Inflatable Spiny Pufferfish
        this.ctx.fillStyle = '#facc15';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 18, 0, Math.PI * 2);
        this.ctx.fill();

        // Spines if inflated
        if (p.scale > 1.2) {
          this.ctx.fillStyle = '#dc2626';
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            const sx = Math.cos(a) * 18;
            const sy = Math.sin(a) * 18;
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      } else if (p.type === 'barracuda') {
        // Sleek Silver Barracuda
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 36, 10, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Sharp Teeth Jaw
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.moveTo(34, -4);
        this.ctx.lineTo(38, 0);
        this.ctx.lineTo(34, 4);
        this.ctx.closePath();
        this.ctx.fill();
      } else if (p.type === 'eel') {
        // Electric Moray Eel
        this.ctx.fillStyle = '#059669';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 34, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Electric Spark Arc
        this.ctx.strokeStyle = '#38bdf8';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-20, -10);
        this.ctx.lineTo(0, -15);
        this.ctx.lineTo(20, -10);
        this.ctx.stroke();
      } else if (p.type === 'shark') {
        // Apex Tiger Shark
        this.ctx.fillStyle = '#334155';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 48, 16, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Dorsal Fin
        this.ctx.beginPath();
        this.ctx.moveTo(0, -16);
        this.ctx.lineTo(-12, -34);
        this.ctx.lineTo(12, -16);
        this.ctx.closePath();
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  drawPlayer() {
    this.ctx.save();
    this.ctx.translate(this.player.x, this.player.y);
    this.ctx.rotate(this.player.angle);

    // Blinking during invulnerability
    if (this.player.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      this.ctx.restore();
      return;
    }

    // Jax Kinetic Bubble Shield
    if (this.player.isShielded) {
      this.ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      this.ctx.strokeStyle = '#38bdf8';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 36, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    }

    // Diver Body (Neoprene Wetsuit)
    this.ctx.fillStyle = this.diver.color;
    this.ctx.beginPath();
    this.ctx.roundRect(-22, -10, 44, 20, 8);
    this.ctx.fill();

    // Air Tank on Back
    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.fillRect(-14, -16, 28, 6);

    // Visor Mask
    this.ctx.fillStyle = this.diver.visorColor;
    this.ctx.shadowColor = '#67e8f9';
    this.ctx.shadowBlur = 8;
    this.ctx.beginPath();
    this.ctx.arc(14, 0, 7, 0, Math.PI * 2);
    this.ctx.fill();

    // Flippers / Fins
    this.ctx.fillStyle = this.diver.suitAccent;
    const finWiggle = Math.sin(Date.now() * 0.015) * 6;
    this.ctx.beginPath();
    this.ctx.moveTo(-22, -4);
    this.ctx.lineTo(-34, -12 + finWiggle);
    this.ctx.lineTo(-34, 12 + finWiggle);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  drawSonicRings() {
    for (const r of this.soundRings) {
      this.ctx.save();
      this.ctx.strokeStyle = `rgba(56, 189, 248, ${r.alpha})`;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  drawBubblesAndSparkles() {
    this.ctx.save();
    for (const b of this.bubbles) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    for (const s of this.sparkles) {
      this.ctx.fillStyle = s.color;
      this.ctx.globalAlpha = s.alpha;
      this.ctx.fillRect(s.x, s.y, 3, 3);
    }
    this.ctx.restore();
  }
}
