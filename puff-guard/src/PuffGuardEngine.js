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
    this.reefPearlsCollected = 0;
    this.isTransitioning = false;

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

    // Hybrid: Marine snow & Suspended luminous plankton
    this.marineSnow = [];
    for (let i = 0; i < 45; i++) {
      this.marineSnow.push({
        x: Math.random() * this.baseW,
        y: Math.random() * this.baseH,
        size: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 6,
        alpha: Math.random() * 0.45 + 0.2,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Hybrid: Distant background roaming megafauna shadow (Whale / Giant Manta)
    this.distantCreature = {
      x: -240,
      y: 85,
      speed: 18,
      phase: 0
    };

    this.player.swimCycle = 0;
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

    // Kinematic flipper swim cycle
    const currentSpeed = Math.hypot(this.player.vx, this.player.vy);
    const kickRate = this.player.isDashing ? 24 : (currentSpeed > 10 ? 12 : 3.5);
    this.player.swimCycle = (this.player.swimCycle || 0) + kickRate * dt;

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

    // 8. Marine Snow & Plankton Drift
    if (this.marineSnow) {
      for (const p of this.marineSnow) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.phase += dt * 2.5;
        if (p.y < 0) { p.y = this.baseH; p.x = Math.random() * this.baseW; }
        if (p.x < 0) p.x = this.baseW;
        if (p.x > this.baseW) p.x = 0;
      }
    }

    // 9. Distant Background Megafauna
    if (this.distantCreature) {
      this.distantCreature.x += this.distantCreature.speed * dt;
      this.distantCreature.phase += dt * 1.8;
      if (this.distantCreature.x > this.baseW + 260) {
        this.distantCreature.x = -260;
        this.distantCreature.y = 70 + Math.random() * 120;
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
      this.reefPearlsCollected = (this.reefPearlsCollected || 0) + 1;
      economy.addPearls(1);
      this.score += Math.floor(points * mult);

      // Instantly advance when all required reef pearls are harvested
      if (this.reefPearlsCollected >= (this.reef.targetPearls || 5)) {
        this.advanceReef();
      }
    } else {
      this.shells += 1;
      economy.addGoldenBerries(1); // Mapped to portfolio currency
      this.score += Math.floor(points * mult);
    }

    // Replenish Air on Prize Collect
    this.player.air = Math.min(this.player.maxAir, this.player.air + 14);
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

  // --- SMOOTH NON-BLOCKING REEF TRANSITION (Zero Alert Dialogs) ---
  advanceReef() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    sound.playRevive();
    ads.happyTime();

    const banner = document.getElementById('reef-cleared-banner');
    const titleEl = document.getElementById('banner-reef-title');
    const subEl = document.getElementById('banner-reef-sub');

    this.reefIndex++;
    if (this.reefIndex >= REEF_CONFIGS.length) {
      if (banner && titleEl && subEl) {
        titleEl.textContent = '🏆 MARIANA TRENCH CONQUERED!';
        subEl.textContent = 'You have mastered all five reefs!';
        banner.style.display = 'block';
      }
      setTimeout(() => {
        this.triggerGameOver('Victory: Master of the Five Reefs');
      }, 3500);
      return;
    }

    const nextReef = REEF_CONFIGS[this.reefIndex];
    if (banner && titleEl && subEl) {
      titleEl.textContent = `Reef ${this.reef.reefNumber} Harvested!`;
      subEl.textContent = `Diving into Reef ${nextReef.reefNumber}: ${nextReef.name} (${nextReef.depth})...`;
      banner.style.display = 'block';
    }

    // Smooth cinematic descent transition
    setTimeout(() => {
      if (banner) banner.style.display = 'none';
      this.reef = nextReef;
      this.reefPearlsCollected = 0;
      this.initReefEntities();
      this.isTransitioning = false;
      this.updateHUD();
    }, 2400);
  }

  updateHUD() {
    const elAir = document.getElementById('hud-air-bar');
    const elScore = document.getElementById('hud-score');
    const elPearls = document.getElementById('hud-pearls');
    const elShells = document.getElementById('hud-shells');
    const elHearts = document.getElementById('hud-hearts');
    const elReef = document.getElementById('hud-reef-name');
    const elGoalPearls = document.getElementById('hud-goal-pearls');

    if (elAir) elAir.style.width = `${Math.max(0, (this.player.air / this.player.maxAir) * 100)}%`;
    if (elScore) elScore.textContent = this.score;
    if (elPearls) elPearls.textContent = this.pearls;
    if (elShells) elShells.textContent = this.shells;
    if (elHearts) elHearts.textContent = '❤️'.repeat(Math.max(0, this.player.hearts));
    if (elReef) elReef.textContent = `Reef ${this.reef.reefNumber}: ${this.reef.name} (${this.reef.depth})`;
    if (elGoalPearls) elGoalPearls.textContent = `${this.reefPearlsCollected || 0}/${this.reef.targetPearls || 5}`;
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

  // --- RENDERING PIPELINE: OPTION 3 HYBRID (Polished Geometry + Volumetric Lighting + 4-Plane Depth) ---
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

    // 1. Water Background Gradient (Depth atmosphere)
    const waterGrad = this.ctx.createLinearGradient(0, 0, 0, this.baseH);
    waterGrad.addColorStop(0, this.reef.waterTop);
    waterGrad.addColorStop(0.72, this.reef.waterBottom);
    waterGrad.addColorStop(1, '#020617');
    this.ctx.fillStyle = waterGrad;
    this.ctx.fillRect(0, 0, this.baseW, this.baseH);

    // 2. Layer 1: Distant Background Silhouettes (Sunken Galleon, Sea Arches, Roaming Megafauna)
    this.drawDistantBackground();

    // 3. Volumetric God Rays (Reefs with surface sunlight)
    if (this.reef.hasGodRays) {
      this.drawGodRays();
    }

    // 4. Layer 2: Suspended Marine Snow & Plankton Motes
    this.drawMarineSnow();

    // 5. Dynamic Caustic Water Nets on Seabed
    this.drawWaterCaustics();

    // 6. Layer 3: Living Interactive Coral Reef Bottom (Swaying Anemones, Staghorn Corals)
    this.drawCoralReef();

    // 7. Oysters & Glowing Prize Drops
    this.drawOystersAndPrizes();

    // 8. Ambient Friendly Fish (Clownfish & Blue Tangs with fluid fins)
    this.drawDecorativeFish();

    // 9. Detailed Predators (Puffers, Apex Tiger Shark, Electric Moray, Barracuda)
    this.drawPredators();

    // 10. Player Diver & Articulated Anatomy
    this.drawPlayer();

    // 11. Volumetric Headlamp Light Cone (Dynamic Screen Blending)
    this.drawDiverHeadlamp();

    // 12. Sonic Pulse Rings & Shockwaves
    this.drawSonicRings();

    // 13. Fizzy Air Bubbles & Sparkles
    this.drawBubblesAndSparkles();

    // 14. Layer 4: Foreground Cinematic Bokeh / Kelp Silhouettes
    this.drawForegroundBokeh();

    // 15. Subtle Inner Border Vignette
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
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

  // --- LAYER 1: DISTANT UNDERWATER BACKGROUND SILHOUETTES ---
  drawDistantBackground() {
    this.ctx.save();

    // Distant mountain ridge and rock arches
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.baseH - 60);
    this.ctx.quadraticCurveTo(this.baseW * 0.2, this.baseH - 120, this.baseW * 0.45, this.baseH - 70);
    this.ctx.quadraticCurveTo(this.baseW * 0.7, this.baseH - 140, this.baseW, this.baseH - 80);
    this.ctx.lineTo(this.baseW, this.baseH);
    this.ctx.lineTo(0, this.baseH);
    this.ctx.closePath();
    this.ctx.fill();

    // Reef 3: Distant Sunken Galleon Silhouette
    if (this.reef.hasShipwreckDebris) {
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      this.ctx.beginPath();
      // Hull
      this.ctx.moveTo(120, this.baseH - 60);
      this.ctx.lineTo(240, this.baseH - 75);
      this.ctx.lineTo(280, this.baseH - 110);
      this.ctx.lineTo(100, this.baseH - 95);
      this.ctx.closePath();
      this.ctx.fill();
      // Broken Mainmast
      this.ctx.fillRect(170, this.baseH - 180, 8, 85);
      this.ctx.fillRect(145, this.baseH - 150, 60, 4);
    }

    // Reef 4: Volcanic Hydrothermal Vent Chimneys
    if (this.reef.hasHeatVents) {
      this.ctx.fillStyle = 'rgba(30, 10, 10, 0.55)';
      this.ctx.fillRect(180, this.baseH - 140, 24, 100);
      this.ctx.fillRect(520, this.baseH - 170, 32, 130);
      this.ctx.fillRect(740, this.baseH - 120, 20, 80);
    }

    // Roaming Megafauna (Giant Whale / Colossal Manta Shadow)
    if (this.distantCreature) {
      const c = this.distantCreature;
      this.ctx.save();
      this.ctx.translate(c.x, c.y);
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';

      // Whale Torso
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, 75, 22, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Pectoral Fin
      this.ctx.beginPath();
      this.ctx.moveTo(-10, 5);
      this.ctx.lineTo(15, 30);
      this.ctx.lineTo(5, 12);
      this.ctx.closePath();
      this.ctx.fill();

      // Tail Fluke with sinusoidal swimming wave
      const tailOsc = Math.sin(c.phase) * 6;
      this.ctx.beginPath();
      this.ctx.moveTo(-70, 0);
      this.ctx.lineTo(-95, -16 + tailOsc);
      this.ctx.lineTo(-95, 16 + tailOsc);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();
    }

    this.ctx.restore();
  }

  // --- VOLUMETRIC SUNBEAM GOD RAYS ---
  drawGodRays() {
    this.ctx.save();
    const time = Date.now() * 0.0008;
    for (let i = 0; i < 5; i++) {
      const x = this.baseW * (0.12 + i * 0.2) + Math.sin(time + i * 1.2) * 28;
      const rayGrad = this.ctx.createLinearGradient(x, 0, x - 120, this.baseH * 0.85);
      rayGrad.addColorStop(0, `rgba(255, 255, 255, ${this.reef.godRayOpacity || 0.28})`);
      rayGrad.addColorStop(0.65, `rgba(186, 230, 253, ${(this.reef.godRayOpacity || 0.28) * 0.4})`);
      rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.ctx.fillStyle = rayGrad;

      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x + 75, 0);
      this.ctx.lineTo(x - 90, this.baseH * 0.9);
      this.ctx.lineTo(x - 175, this.baseH * 0.9);
      this.ctx.closePath();
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  // --- LAYER 2: MARINE SNOW & SUSPENDED PLANKTON ---
  drawMarineSnow() {
    if (!this.marineSnow) return;
    this.ctx.save();

    for (const p of this.marineSnow) {
      // Test if particle is inside the diver's volumetric headlamp cone
      const dx = p.x - this.player.x;
      const dy = p.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      let diff = Math.abs(angle - this.player.angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;

      const inCone = dist < 250 && diff < 0.42;
      const alpha = inCone ? Math.min(0.95, p.alpha * 2.5) : p.alpha;
      const radius = inCone ? p.size * 1.5 : p.size;

      this.ctx.fillStyle = inCone ? 'rgba(224, 242, 254, 0.9)' : `rgba(186, 230, 253, ${alpha})`;
      if (inCone) {
        this.ctx.shadowColor = '#bae6fd';
        this.ctx.shadowBlur = 6;
      } else {
        this.ctx.shadowBlur = 0;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  // --- DYNAMIC CAUSTIC LIGHT NETS ON SEABED ---
  drawWaterCaustics() {
    this.ctx.save();
    this.ctx.strokeStyle = this.reef.causticColor;
    this.ctx.lineWidth = 1.8;
    const time = Date.now() * 0.0022;

    // Layer A: Forward undulating light net
    this.ctx.beginPath();
    for (let x = 0; x <= this.baseW; x += 36) {
      const cy = this.baseH - 42 + Math.sin(x * 0.045 + time) * 7;
      if (x === 0) this.ctx.moveTo(x, cy);
      else this.ctx.quadraticCurveTo(x - 18, cy + 5, x, cy);
    }
    this.ctx.stroke();

    // Layer B: Counter-moving secondary reflection
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    this.ctx.beginPath();
    for (let x = 0; x <= this.baseW; x += 48) {
      const cy = this.baseH - 34 + Math.cos(x * 0.035 - time * 0.8) * 5;
      if (x === 0) this.ctx.moveTo(x, cy);
      else this.ctx.quadraticCurveTo(x - 24, cy - 4, x, cy);
    }
    this.ctx.stroke();

    this.ctx.restore();
  }

  // --- LAYER 3: LIVING CORAL REEF ECOSYSTEM ---
  drawCoralReef() {
    this.ctx.save();
    const time = Date.now() * 0.0018;

    // 1. Organic Sandy Seabed Dune
    const sandGrad = this.ctx.createLinearGradient(0, this.baseH - 46, 0, this.baseH);
    sandGrad.addColorStop(0, '#1e293b');
    sandGrad.addColorStop(1, '#020617');
    this.ctx.fillStyle = sandGrad;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.baseH);
    this.ctx.lineTo(0, this.baseH - 38);
    for (let x = 0; x <= this.baseW; x += 60) {
      const cy = this.baseH - 38 + Math.sin(x * 0.016) * 5;
      this.ctx.lineTo(x, cy);
    }
    this.ctx.lineTo(this.baseW, this.baseH);
    this.ctx.closePath();
    this.ctx.fill();

    // 2. Swaying Sea Anemone Colonies with Soft Inverse Kinematics
    for (let a = 0; a < 6; a++) {
      const ax = 75 + a * 160;
      const ay = this.baseH - 35;
      const anemoneColor = this.reef.corals[a % this.reef.corals.length];

      this.ctx.strokeStyle = anemoneColor;
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';

      // 7 tentacles swaying in current
      for (let t = 0; t < 7; t++) {
        const spread = (t - 3) * 6;
        const sway = Math.sin(time * 2.2 + a + t * 0.4) * 9;
        const tipX = ax + spread + sway;
        const tipY = ay - 24 + Math.cos(time * 1.8 + t) * 4;

        this.ctx.beginPath();
        this.ctx.moveTo(ax + spread * 0.4, ay);
        this.ctx.quadraticCurveTo(ax + spread * 0.7 + sway * 0.5, ay - 12, tipX, tipY);
        this.ctx.stroke();

        // Glowing Bioluminescent Tentacle Tip Bulb
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(tipX, tipY, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // 3. Branching Staghorn Corals
    for (let i = 0; i < 7; i++) {
      const cx = 145 + i * 140;
      const cy = this.baseH - 34;
      const coralColor = this.reef.corals[(i + 1) % this.reef.corals.length];

      this.ctx.fillStyle = coralColor;
      this.ctx.strokeStyle = coralColor;
      this.ctx.lineWidth = 4;
      this.ctx.lineCap = 'round';

      // Central stem
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(cx, cy - 28);
      this.ctx.stroke();

      // Branching arms
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - 14);
      this.ctx.lineTo(cx - 12, cy - 26);
      this.ctx.moveTo(cx, cy - 20);
      this.ctx.lineTo(cx + 14, cy - 32);
      this.ctx.stroke();

      // Soft bulb tips
      this.ctx.fillStyle = '#fef08a';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy - 30, 3.5, 0, Math.PI * 2);
      this.ctx.arc(cx - 12, cy - 28, 3, 0, Math.PI * 2);
      this.ctx.arc(cx + 14, cy - 34, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  // --- OYSTERS & GLOWING PRIZE DROPS ---
  drawOystersAndPrizes() {
    // 1. Ribbed Giant Oysters
    for (const o of this.oysters) {
      this.ctx.save();
      this.ctx.translate(o.x, o.y);

      // Bottom Shell Valve (Ribbed)
      this.ctx.fillStyle = '#334155';
      this.ctx.strokeStyle = '#475569';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, 20, 9, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // Top Shell Valve (Tilts open when active)
      if (o.isOpen) {
        this.ctx.save();
        this.ctx.translate(0, -6);
        this.ctx.rotate(-0.35);
        this.ctx.fillStyle = '#475569';
        this.ctx.beginPath();
        this.ctx.ellipse(0, -6, 20, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();

        // Iridescent Pearl
        if (o.hasPearl) {
          const pulse = Math.sin(Date.now() * 0.006) * 3;
          this.ctx.shadowColor = '#38bdf8';
          this.ctx.shadowBlur = 14 + pulse;

          const pearlGrad = this.ctx.createRadialGradient(-2, -5, 1, 0, -4, 7);
          pearlGrad.addColorStop(0, '#ffffff');
          pearlGrad.addColorStop(0.5, '#bae6fd');
          pearlGrad.addColorStop(1, '#38bdf8');
          this.ctx.fillStyle = pearlGrad;

          this.ctx.beginPath();
          this.ctx.arc(0, -4, 6.5, 0, Math.PI * 2);
          this.ctx.fill();
        }
      } else {
        // Closed shell top
        this.ctx.fillStyle = '#475569';
        this.ctx.beginPath();
        this.ctx.ellipse(0, -3, 20, 7, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      }

      this.ctx.restore();
    }

    // 2. Floating Collectible Pearls & Golden Shells
    for (const p of this.prizes) {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);

      if (p.type === 'pearl') {
        const floatOsc = Math.sin(Date.now() * 0.005 + p.x) * 4;
        this.ctx.shadowColor = '#38bdf8';
        this.ctx.shadowBlur = 12;

        const pearlGrad = this.ctx.createRadialGradient(-2, floatOsc - 2, 1, 0, floatOsc, 8);
        pearlGrad.addColorStop(0, '#ffffff');
        pearlGrad.addColorStop(0.6, '#bae6fd');
        pearlGrad.addColorStop(1, '#0284c7');
        this.ctx.fillStyle = pearlGrad;

        this.ctx.beginPath();
        this.ctx.arc(0, floatOsc, 7.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Specular glint
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(-2, floatOsc - 2, 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Golden Shell
        this.ctx.shadowColor = '#facc15';
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#eab308';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 10, 7, 0.2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#fef08a';
        this.ctx.lineWidth = 1.2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 5, 0, Math.PI);
        this.ctx.stroke();
      }
      this.ctx.restore();
    }
  }

  // --- AMBIENT DECORATIVE FISH WITH FLUID FINS ---
  drawDecorativeFish() {
    for (const f of this.decorativeFish) {
      this.ctx.save();
      this.ctx.translate(f.x, f.y);
      const dir = f.vx > 0 ? 1 : -1;
      this.ctx.scale(dir, 1);

      const tailOsc = Math.sin(f.wigglePhase) * 7;

      if (f.type === 'clownfish') {
        // 1. Vibrant Orange Body Gradient
        const fishGrad = this.ctx.createRadialGradient(-2, -2, 1, 0, 0, f.size);
        fishGrad.addColorStop(0, '#fb923c');
        fishGrad.addColorStop(0.8, '#ea580c');
        fishGrad.addColorStop(1, '#c2410c');
        this.ctx.fillStyle = fishGrad;

        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, f.size, f.size * 0.62, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 2. Crisp White Bands with Dark Trim
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(-3, -f.size * 0.58, 6, f.size * 1.16, 2);
        this.ctx.fill();
        this.ctx.stroke();

        // 3. Flexible Fluttering Tail
        this.ctx.fillStyle = '#ea580c';
        this.ctx.beginPath();
        this.ctx.moveTo(-f.size * 0.8, 0);
        this.ctx.lineTo(-f.size * 1.5, -7 + tailOsc);
        this.ctx.lineTo(-f.size * 1.5, 7 + tailOsc);
        this.ctx.closePath();
        this.ctx.fill();

        // Eye
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(f.size * 0.5, -f.size * 0.15, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(f.size * 0.55, -f.size * 0.18, 1, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Royal Blue Tang with Signature Yellow Tail
        this.ctx.fillStyle = '#1d4ed8';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, f.size, f.size * 0.72, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Black accent swoosh
        this.ctx.fillStyle = '#0f172a';
        this.ctx.beginPath();
        this.ctx.ellipse(-2, -2, f.size * 0.55, f.size * 0.35, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Yellow Paddle Tail
        this.ctx.fillStyle = '#facc15';
        this.ctx.beginPath();
        this.ctx.moveTo(-f.size * 0.75, 0);
        this.ctx.lineTo(-f.size * 1.55, -9 + tailOsc);
        this.ctx.lineTo(-f.size * 1.55, 9 + tailOsc);
        this.ctx.closePath();
        this.ctx.fill();

        // Eye
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(f.size * 0.52, -f.size * 0.18, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(f.size * 0.54, -f.size * 0.18, 1.4, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  // --- DESIGN B: DETAILED ATMOSPHERIC ILLUSTRATIVE PREDATORS ---
  drawPredators() {
    for (const p of this.predators) {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.angle);
      this.ctx.scale(p.scale, p.scale);

      if (p.type === 'puffer') {
        // --- 1. DETAILED PORCUPINE PUFFERFISH (DIODON HYSTRIX) ---
        const isInflated = p.scale > 1.15;
        const radius = 20;

        // Dynamic pupil tracking diver
        const targetAngle = Math.atan2(this.player.y - p.y, this.player.x - p.x) - p.angle;
        const pupilX = Math.cos(targetAngle) * 3.5;
        const pupilY = Math.sin(targetAngle) * 3.5;

        // Breathing mouth gulp animation
        const mouthGulp = Math.sin(Date.now() * 0.006 + p.x) * 2;

        // 3D-Shaded Venomous Spines (Conical shafts with glowing toxic crimson tips)
        if (isInflated) {
          const spineCount = 16;
          for (let a = 0; a < Math.PI * 2; a += (Math.PI * 2) / spineCount) {
            const bx = Math.cos(a) * (radius - 2);
            const by = Math.sin(a) * (radius - 2);
            const tx = Math.cos(a) * (radius + 11);
            const ty = Math.sin(a) * (radius + 11);

            const spineGrad = this.ctx.createLinearGradient(bx, by, tx, ty);
            spineGrad.addColorStop(0, '#78350f');
            spineGrad.addColorStop(0.4, '#f59e0b');
            spineGrad.addColorStop(0.85, '#ef4444');
            spineGrad.addColorStop(1, '#ffffff');
            this.ctx.fillStyle = spineGrad;

            this.ctx.beginPath();
            this.ctx.moveTo(bx + Math.cos(a + 1.57) * 2.8, by + Math.sin(a + 1.57) * 2.8);
            this.ctx.lineTo(tx, ty);
            this.ctx.lineTo(bx - Math.cos(a + 1.57) * 2.8, by - Math.sin(a + 1.57) * 2.8);
            this.ctx.closePath();
            this.ctx.fill();

            // Toxic venom droplet glow at tip
            this.ctx.fillStyle = '#fca5a5';
            this.ctx.beginPath();
            this.ctx.arc(tx, ty, 1.2, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }

        // Spherical Radial Gradient Body (Ivory belly countershaded against golden-olive dorsal)
        const pufferGrad = this.ctx.createRadialGradient(-5, -5, 2, 0, 0, radius);
        pufferGrad.addColorStop(0, '#fef9c3');
        pufferGrad.addColorStop(0.45, '#fde047');
        pufferGrad.addColorStop(0.8, isInflated ? '#ea580c' : '#d97706');
        pufferGrad.addColorStop(1, isInflated ? '#b91c1c' : '#92400e');
        this.ctx.fillStyle = pufferGrad;

        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Textured Pebbled Dermal Stippling on Dorsal
        this.ctx.fillStyle = 'rgba(69, 26, 3, 0.55)';
        const stipples = [
          [-12, -8], [-6, -11], [0, -12], [6, -10],
          [-10, -3], [-3, -6], [3, -5], [9, -4],
          [-8, 3], [-2, 0], [4, 2]
        ];
        for (const [sx, sy] of stipples) {
          this.ctx.beginPath();
          this.ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
          this.ctx.fill();
        }

        // Beak / Fleshy Mouth (breathing gulp)
        this.ctx.fillStyle = '#fde68a';
        this.ctx.strokeStyle = '#b45309';
        this.ctx.lineWidth = 1.2;
        this.ctx.beginPath();
        this.ctx.ellipse(radius - 2, 2, 4 + mouthGulp * 0.5, 3 + mouthGulp * 0.8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Eye: Golden-amber iris with tracking pupil & double specular glint
        this.ctx.fillStyle = '#fef08a';
        this.ctx.beginPath();
        this.ctx.arc(9, -6, 6.5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#b45309';
        this.ctx.beginPath();
        this.ctx.arc(9, -6, 5.2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#1c1917';
        this.ctx.beginPath();
        this.ctx.arc(9 + pupilX * 0.6, -6 + pupilY * 0.6, 3.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Primary specular glint & secondary rim reflection
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(7.5, -8, 1.6, 0, Math.PI * 2);
        this.ctx.arc(11, -4.5, 0.8, 0, Math.PI * 2);
        this.ctx.fill();

        // Translucent Ribbed Pectoral Fin with individual fin rays
        const finWave = Math.sin(Date.now() * 0.012 + p.x) * 5;
        this.ctx.fillStyle = 'rgba(254, 240, 138, 0.65)';
        this.ctx.beginPath();
        this.ctx.ellipse(-7, 9, 9, 5, 0.4 + finWave * 0.08, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#d97706';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(-11, 7);
        this.ctx.lineTo(-4, 11);
        this.ctx.moveTo(-9, 6);
        this.ctx.lineTo(-2, 10);
        this.ctx.stroke();

      } else if (p.type === 'shark') {
        // --- 2. APEX TIGER SHARK (CARCHARHINUS) ---
        const tailOsc = Math.sin(p.wiggle) * 12;

        // Countershaded Muscular Shark Body
        const sharkGrad = this.ctx.createLinearGradient(0, -19, 0, 19);
        sharkGrad.addColorStop(0, '#0f172a');
        sharkGrad.addColorStop(0.3, '#334155');
        sharkGrad.addColorStop(0.68, '#64748b');
        sharkGrad.addColorStop(1, '#f8fafc');
        this.ctx.fillStyle = sharkGrad;

        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 54, 18, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Soft-feathered dark vertical tiger stripes
        this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        for (let s = -22; s <= 18; s += 8) {
          this.ctx.beginPath();
          this.ctx.moveTo(s, -16);
          this.ctx.quadraticCurveTo(s - 2, -7, s - 5, -1);
          this.ctx.stroke();
        }

        // Tall Serrated Dorsal Fin with battle notches
        this.ctx.fillStyle = '#0f172a';
        this.ctx.beginPath();
        this.ctx.moveTo(2, -17);
        this.ctx.lineTo(-15, -38);
        this.ctx.lineTo(-12, -34);
        this.ctx.lineTo(-9, -32);
        this.ctx.lineTo(16, -17);
        this.ctx.closePath();
        this.ctx.fill();

        // Pectoral Stabilizer Fin
        this.ctx.beginPath();
        this.ctx.moveTo(10, 12);
        this.ctx.lineTo(-4, 28);
        this.ctx.lineTo(-12, 22);
        this.ctx.lineTo(2, 12);
        this.ctx.closePath();
        this.ctx.fill();

        // Sweeping Heterocercal Caudal Tail Fin
        this.ctx.beginPath();
        this.ctx.moveTo(-46, 0);
        this.ctx.lineTo(-72, -28 + tailOsc);
        this.ctx.lineTo(-60, 0);
        this.ctx.lineTo(-74, 24 + tailOsc);
        this.ctx.closePath();
        this.ctx.fill();

        // 5 Curved Gill Slits
        this.ctx.strokeStyle = '#020617';
        this.ctx.lineWidth = 1.3;
        for (let g = 0; g < 5; g++) {
          this.ctx.beginPath();
          this.ctx.moveTo(12 + g * 3.2, -5);
          this.ctx.quadraticCurveTo(10 + g * 3.2, 0, 11 + g * 3.2, 7);
          this.ctx.stroke();
        }

        // Ampullae of Lorenzini (Electro-receptor dots on snout)
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        this.ctx.beginPath();
        this.ctx.arc(46, -3, 1, 0, Math.PI * 2);
        this.ctx.arc(49, 1, 1, 0, Math.PI * 2);
        this.ctx.arc(44, 4, 1, 0, Math.PI * 2);
        this.ctx.fill();

        // Cold Predatory Eye with Reflective Glint
        this.ctx.fillStyle = '#fde047';
        this.ctx.beginPath();
        this.ctx.arc(40, -4, 3.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(40, -4, 2.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(39.5, -5, 1, 0, Math.PI * 2);
        this.ctx.fill();

      } else if (p.type === 'eel') {
        // --- 3. ELECTRIC MORAY EEL (GYMNOTHORAX) ---
        this.ctx.strokeStyle = '#064e3b';
        this.ctx.lineWidth = 15;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Sinuous Serpentine Body Curve
        this.ctx.beginPath();
        this.ctx.moveTo(36, 0);
        for (let seg = 1; seg <= 6; seg++) {
          const sx = 36 - seg * 12.5;
          const sy = Math.sin(p.wiggle + seg * 0.62) * 9.5;
          this.ctx.lineTo(sx, sy);
        }
        this.ctx.stroke();

        // Mottled Leopard Rosette Clusters
        this.ctx.fillStyle = '#022c22';
        for (let seg = 1; seg <= 5; seg++) {
          const sx = 36 - seg * 12.5;
          const sy = Math.sin(p.wiggle + seg * 0.62) * 9.5;
          this.ctx.beginPath();
          this.ctx.arc(sx, sy - 2, 3, 0, Math.PI * 2);
          this.ctx.arc(sx + 2, sy + 3, 2.2, 0, Math.PI * 2);
          this.ctx.fill();
        }

        // Multi-Branching Crackling Cyan Lightning Arcs
        this.ctx.strokeStyle = '#67e8f9';
        this.ctx.lineWidth = 2.4;
        this.ctx.shadowColor = '#06b6d4';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.moveTo(28, -6);
        this.ctx.lineTo(15, -15);
        this.ctx.lineTo(2, -7);
        this.ctx.lineTo(-12, -16);
        this.ctx.lineTo(-24, -8);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Open Gaping Jaw with Needle Teeth
        this.ctx.fillStyle = '#064e3b';
        this.ctx.beginPath();
        this.ctx.moveTo(34, -4);
        this.ctx.lineTo(44, -1);
        this.ctx.lineTo(34, 4);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.2;
        this.ctx.beginPath();
        this.ctx.moveTo(38, -2);
        this.ctx.lineTo(40, 1);
        this.ctx.stroke();

        // Fierce Yellow Eye
        this.ctx.fillStyle = '#facc15';
        this.ctx.beginPath();
        this.ctx.arc(32, -3.5, 3.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(32.5, -3.5, 1.6, 0, Math.PI * 2);
        this.ctx.fill();

      } else if (p.type === 'barracuda') {
        // --- 4. SWIFT METALLIC BARRACUDA (SPHYRAENA) ---
        const tailOsc = Math.sin(p.wiggle * 1.5) * 6;

        // Brushed Metallic Torpedo Body
        const terraGrad = this.ctx.createLinearGradient(0, -10, 0, 10);
        terraGrad.addColorStop(0, '#64748b');
        terraGrad.addColorStop(0.35, '#cbd5e1');
        terraGrad.addColorStop(0.5, '#f8fafc');
        terraGrad.addColorStop(0.75, '#94a3b8');
        terraGrad.addColorStop(1, '#334155');
        this.ctx.fillStyle = terraGrad;

        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 44, 9.5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Dark Flank Vertical Bars
        this.ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
        this.ctx.lineWidth = 1.6;
        for (let b = -18; b <= 18; b += 6) {
          this.ctx.beginPath();
          this.ctx.moveTo(b, -7);
          this.ctx.lineTo(b - 2, 4);
          this.ctx.stroke();
        }

        // Heavy Underslung Jaw with Razor Dagger Teeth
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.moveTo(40, -4);
        this.ctx.lineTo(47, 2);
        this.ctx.lineTo(38, 5);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1.2;
        this.ctx.beginPath();
        this.ctx.moveTo(42, -2);
        this.ctx.lineTo(43, 2);
        this.ctx.moveTo(44, -1);
        this.ctx.lineTo(45, 1);
        this.ctx.stroke();

        // Forked Caudal Fin with Black Margins
        this.ctx.fillStyle = '#334155';
        this.ctx.beginPath();
        this.ctx.moveTo(-42, 0);
        this.ctx.lineTo(-58, -16 + tailOsc);
        this.ctx.lineTo(-49, 0);
        this.ctx.lineTo(-58, 16 + tailOsc);
        this.ctx.closePath();
        this.ctx.fill();

        // Piercing Black Eye
        this.ctx.fillStyle = '#0f172a';
        this.ctx.beginPath();
        this.ctx.arc(33, -2, 2.8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(32.5, -2.5, 0.9, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  // --- DESIGN B: ARTICULATED ATMOSPHERIC DIVING SUIT (ADS) ---
  drawPlayer() {
    this.ctx.save();
    this.ctx.translate(this.player.x, this.player.y);
    this.ctx.rotate(this.player.angle);

    // Blinking during invulnerability
    if (this.player.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      this.ctx.restore();
      return;
    }

    // Jax Kinetic Bubble Shield (Iridescent Forcefield)
    if (this.player.isShielded) {
      const shieldPulse = Math.sin(Date.now() * 0.008) * 3;
      this.ctx.save();
      this.ctx.strokeStyle = '#38bdf8';
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = '#67e8f9';
      this.ctx.shadowBlur = 16;

      const shieldGrad = this.ctx.createRadialGradient(0, 0, 10, 0, 0, 38 + shieldPulse);
      shieldGrad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
      shieldGrad.addColorStop(0.85, 'rgba(103, 232, 249, 0.35)');
      shieldGrad.addColorStop(1, 'rgba(255, 255, 255, 0.7)');
      this.ctx.fillStyle = shieldGrad;

      this.ctx.beginPath();
      this.ctx.arc(0, 0, 38 + shieldPulse, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 1. Dual Joint Swimming Flippers with Kinematic Kicking
    const kick1 = Math.sin(this.player.swimCycle || 0) * 9;
    const kick2 = Math.sin((this.player.swimCycle || 0) + Math.PI) * 9;

    this.ctx.fillStyle = this.diver.suitAccent;
    // Leg 1 & Flipper
    this.ctx.beginPath();
    this.ctx.moveTo(-20, -5);
    this.ctx.lineTo(-34, -12 + kick1);
    this.ctx.lineTo(-30, -5 + kick1);
    this.ctx.closePath();
    this.ctx.fill();

    // Leg 2 & Flipper
    this.ctx.beginPath();
    this.ctx.moveTo(-20, 5);
    this.ctx.lineTo(-34, 12 + kick2);
    this.ctx.lineTo(-30, 5 + kick2);
    this.ctx.closePath();
    this.ctx.fill();

    // 2. Reinforced Atmospheric Diving Suit (ADS) Torso
    const suitGrad = this.ctx.createLinearGradient(0, -12, 0, 12);
    suitGrad.addColorStop(0, this.diver.suitAccent);
    suitGrad.addColorStop(0.4, this.diver.color);
    suitGrad.addColorStop(0.8, '#1e293b');
    suitGrad.addColorStop(1, '#0f172a');
    this.ctx.fillStyle = suitGrad;

    this.ctx.beginPath();
    this.ctx.roundRect(-23, -11, 46, 22, 9);
    this.ctx.fill();

    // Titanium Joint Armor Rings & Seam Piping
    this.ctx.strokeStyle = '#94a3b8';
    this.ctx.lineWidth = 1.8;
    this.ctx.beginPath();
    this.ctx.arc(-8, 0, 7, 0, Math.PI * 2);
    this.ctx.stroke();

    // Wrist-Mounted Depth Computer with Glowing LED
    this.ctx.fillStyle = '#22c55e';
    this.ctx.shadowColor = '#4ade80';
    this.ctx.shadowBlur = 6;
    this.ctx.beginPath();
    this.ctx.arc(4, 8, 1.8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // 3. Metallic Dual Scuba Tank with High-Pressure Hoses
    const tankGrad = this.ctx.createLinearGradient(-16, -18, 16, -18);
    tankGrad.addColorStop(0, '#64748b');
    tankGrad.addColorStop(0.5, '#f8fafc');
    tankGrad.addColorStop(1, '#334155');
    this.ctx.fillStyle = tankGrad;
    this.ctx.beginPath();
    this.ctx.roundRect(-16, -18, 32, 7, 3.5);
    this.ctx.fill();

    // Brass regulator valve cap
    this.ctx.fillStyle = '#facc15';
    this.ctx.fillRect(15, -17.5, 4.5, 5.5);

    // High-pressure braided hose loop
    this.ctx.strokeStyle = '#020617';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(15, -14);
    this.ctx.quadraticCurveTo(22, -10, 16, -2);
    this.ctx.stroke();

    // 4. Chrome-Rimmed Diving Mask & Glass Visor with Face Silhouette
    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.ellipse(15, -1, 9.5, 8.5, 0, 0, Math.PI * 2);
    this.ctx.fill();

    const visorGrad = this.ctx.createRadialGradient(14, -2, 1, 15, -1, 8.5);
    visorGrad.addColorStop(0, '#e0f2fe');
    visorGrad.addColorStop(0.65, this.diver.visorColor);
    visorGrad.addColorStop(1, '#0369a1');
    this.ctx.fillStyle = visorGrad;
    this.ctx.beginPath();
    this.ctx.arc(15, -1, 7.6, 0, Math.PI * 2);
    this.ctx.fill();

    // Internal diver eyes silhouette
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    this.ctx.beginPath();
    this.ctx.arc(15.5, -2, 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Visor surface reflection arc
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(15, -1, 5.8, -1.8, -0.6);
    this.ctx.stroke();

    this.ctx.restore();
  }

  // --- VOLUMETRIC DIRECTIONAL HEADLAMP LIGHT CONE ---
  drawDiverHeadlamp() {
    this.ctx.save();
    this.ctx.translate(this.player.x, this.player.y);
    this.ctx.rotate(this.player.angle);

    // Screen Composite for volumetric luminescence
    this.ctx.globalCompositeOperation = 'screen';

    // 45-degree volumetric light beam extending forward
    const beamLength = 260;
    const coneGrad = this.ctx.createRadialGradient(14, -1, 5, 14, -1, beamLength);
    coneGrad.addColorStop(0, 'rgba(224, 242, 254, 0.42)');
    coneGrad.addColorStop(0.35, 'rgba(56, 189, 248, 0.18)');
    coneGrad.addColorStop(0.8, 'rgba(6, 182, 212, 0.06)');
    coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = coneGrad;

    this.ctx.beginPath();
    this.ctx.moveTo(14, -1);
    this.ctx.arc(14, -1, beamLength, -0.42, 0.42);
    this.ctx.closePath();
    this.ctx.fill();

    // Visor Headlamp Lens Glint
    this.ctx.fillStyle = '#ffffff';
    this.ctx.shadowColor = '#67e8f9';
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.arc(15, -1, 3.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  // --- SONIC PULSE RINGS & SHOCKWAVES ---
  drawSonicRings() {
    for (const r of this.soundRings) {
      this.ctx.save();
      this.ctx.strokeStyle = `rgba(56, 189, 248, ${r.alpha})`;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Double-helix inner ripple
      this.ctx.strokeStyle = `rgba(103, 232, 249, ${r.alpha * 0.6})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, Math.max(0, r.radius - 12), 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  // --- FIZZY AIR BUBBLES & STAR SPARKLES ---
  drawBubblesAndSparkles() {
    this.ctx.save();
    for (const b of this.bubbles) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Bubble highlight glint
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(b.x - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.28, 0, Math.PI * 2);
      this.ctx.fill();
    }

    for (const s of this.sparkles) {
      this.ctx.fillStyle = s.color;
      this.ctx.globalAlpha = s.alpha;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  // --- LAYER 4: FOREGROUND CINEMATIC BOKEH & KELP VIGNETTE ---
  drawForegroundBokeh() {
    this.ctx.save();
    const time = Date.now() * 0.0014;

    // Left Bottom Corner: Giant Out-of-Focus Kelp Fronds
    this.ctx.fillStyle = 'rgba(6, 78, 59, 0.42)';
    for (let k = 0; k < 3; k++) {
      const kx = 10 + k * 28;
      const sway = Math.sin(time + k * 0.8) * 16;
      this.ctx.beginPath();
      this.ctx.moveTo(kx - 15, this.baseH);
      this.ctx.quadraticCurveTo(kx + sway, this.baseH - 120, kx - 10 + sway * 1.4, this.baseH - 220);
      this.ctx.quadraticCurveTo(kx + 10 + sway, this.baseH - 100, kx + 25, this.baseH);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Right Bottom Corner: Deep Sea Fan Silhouette
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    this.ctx.beginPath();
    const rx = this.baseW - 20;
    const rSway = Math.sin(time * 0.8) * 8;
    this.ctx.moveTo(rx, this.baseH);
    this.ctx.quadraticCurveTo(rx - 60 + rSway, this.baseH - 70, rx - 90 + rSway, this.baseH - 140);
    this.ctx.quadraticCurveTo(rx - 40, this.baseH - 60, rx + 20, this.baseH);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }
}
