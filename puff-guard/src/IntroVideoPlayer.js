import { sound } from '../../core/audio/SynthAudio.js';

/**
 * IntroVideoPlayer - Cinematic Opening Intro Video & Cutscene Sequence.
 * Renders an ultra-smooth, 60 FPS cinematic prologue with:
 * 1. Catastrophic Submersible Implosion Hook (11,000m Hadal Trench collapse)
 * 2. Surface Plunge & Rapid Diver Rescue Deployment
 * 3. Hero Pufferfish Encounter & Epic Title Sting
 */
export class IntroVideoPlayer {
  constructor(canvasId, onComplete) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onComplete = onComplete;
    this.isPlaying = false;
    this.progress = 0; // 0.0 to 1.0 (Duration ~9.0s)
    this.duration = 9.0;
    this.startTime = 0;
    this.bubbles = [];

    // Load Crushed Submarine Visual
    this.crushedImg = new Image();
    this.crushedImg.src = './assets/scene1_crushed_submarine.jpg';
    this.crushedLoaded = false;
    this.crushedImg.onload = () => { this.crushedLoaded = true; };

    // Glass spiderweb crack lines
    this.crackBranches = [
      [{x: 0.5, y: 0.5}, {x: 0.35, y: 0.35}, {x: 0.2, y: 0.28}, {x: 0.08, y: 0.22}],
      [{x: 0.5, y: 0.5}, {x: 0.65, y: 0.36}, {x: 0.78, y: 0.26}, {x: 0.92, y: 0.18}],
      [{x: 0.5, y: 0.5}, {x: 0.42, y: 0.68}, {x: 0.32, y: 0.82}, {x: 0.22, y: 0.94}],
      [{x: 0.5, y: 0.5}, {x: 0.62, y: 0.69}, {x: 0.74, y: 0.84}, {x: 0.85, y: 0.95}],
      [{x: 0.5, y: 0.5}, {x: 0.28, y: 0.52}, {x: 0.12, y: 0.54}],
      [{x: 0.5, y: 0.5}, {x: 0.72, y: 0.51}, {x: 0.88, y: 0.52}]
    ];

    this.initBubbles();
  }

  initBubbles() {
    this.bubbles = [];
    for (let i = 0; i < 55; i++) {
      this.bubbles.push({
        x: Math.random() * 960,
        y: Math.random() * 540,
        radius: Math.random() * 8 + 3,
        speed: Math.random() * 35 + 20,
        wobble: Math.random() * Math.PI * 2
      });
    }
  }

  play() {
    sound.init();
    this.isPlaying = true;
    this.progress = 0;
    this.startTime = performance.now();

    // Trigger Implosion Shockwave Audio
    this.playImplosionAudio();

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  playImplosionAudio() {
    if (!sound.ctx) return;
    const now = sound.ctx.currentTime;

    // 1. Visceral Sub-bass Implosion Drop
    const boom = sound.ctx.createOscillator();
    const boomGain = sound.ctx.createGain();
    boom.type = 'triangle';
    boom.frequency.setValueAtTime(140, now);
    boom.frequency.exponentialRampToValueAtTime(28, now + 1.8);
    boomGain.gain.setValueAtTime(0.85, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    boom.connect(boomGain);
    boomGain.connect(sound.ctx.destination);
    boom.start(now);
    boom.stop(now + 1.8);

    // 2. Metal Screech Shear
    const screech = sound.ctx.createOscillator();
    const screechGain = sound.ctx.createGain();
    screech.type = 'sawtooth';
    screech.frequency.setValueAtTime(320, now);
    screech.frequency.linearRampToValueAtTime(880, now + 0.35);
    screech.frequency.exponentialRampToValueAtTime(75, now + 1.2);
    screechGain.gain.setValueAtTime(0.4, now);
    screechGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    screech.connect(screechGain);
    screechGain.connect(sound.ctx.destination);
    screech.start(now);
    screech.stop(now + 1.2);
  }

  skip() {
    this.isPlaying = false;
    if (this.onComplete) this.onComplete();
  }

  loop(timestamp) {
    if (!this.isPlaying) return;

    const elapsed = (timestamp - this.startTime) / 1000;
    this.progress = Math.min(1.0, elapsed / this.duration);

    this.render(this.progress);

    if (this.progress >= 1.0) {
      this.isPlaying = false;
      setTimeout(() => {
        if (this.onComplete) this.onComplete();
      }, 500);
    } else {
      requestAnimationFrame(this.loop);
    }
  }

  render(p) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.save();

    // ==========================================
    // ACT 1: CATASTROPHIC IMPLOSION (0.0 to 0.38)
    // ==========================================
    if (p < 0.38) {
      const act1P = p / 0.38;

      // Camera Trauma Shake
      const trauma = Math.max(0, 1.0 - act1P);
      const shakeMag = trauma * trauma * 28;
      const shakeX = (Math.random() - 0.5) * shakeMag;
      const shakeY = (Math.random() - 0.5) * shakeMag;
      ctx.translate(shakeX, shakeY);

      if (this.crushedLoaded) {
        // Subtle dramatic zoom-in
        const scale = 1.0 + act1P * 0.08;
        const sw = w / scale;
        const sh = h / scale;
        const sx = (w - sw) / 2;
        const sy = (h - sh) / 2;
        ctx.drawImage(this.crushedImg, sx, sy, sw, sh, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, w, h);
      }

      // Red Flashing Emergency Alarm Strobe
      const strobeAlpha = Math.sin(act1P * 30) > 0 ? 0.38 : 0.06;
      ctx.fillStyle = `rgba(239, 68, 68, ${strobeAlpha})`;
      ctx.fillRect(0, 0, w, h);

      // Spiderweb Glass Cracks Spreading
      const crackProg = Math.min(1.0, act1P * 2.2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;

      this.crackBranches.forEach(branch => {
        ctx.beginPath();
        ctx.moveTo(branch[0].x * w, branch[0].y * h);
        for (let i = 1; i < branch.length; i++) {
          if (i / branch.length <= crackProg) {
            ctx.lineTo(branch[i].x * w, branch[i].y * h);
          }
        }
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      // Disaster HUD Alert
      ctx.fillStyle = '#ef4444';
      ctx.font = '900 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 15;
      ctx.fillText('⚠️ CATASTROPHIC HULL COLLAPSE', w / 2, h * 0.22);

      ctx.fillStyle = '#fef08a';
      ctx.font = '700 13px monospace';
      ctx.fillText('DEPTH: 11,000M • 16,400 PSI • DISTRESS BEACON ACTIVE', w / 2, h * 0.28);
      ctx.shadowBlur = 0;

    } else {
      // ==========================================
      // ACT 2: RAPID DIVER DESCENT (0.38 to 0.70)
      // ==========================================
      const act2P = (p - 0.38) / 0.32;

      // Deep Ocean Water Gradient
      const waterGrad = ctx.createLinearGradient(0, 0, 0, h);
      waterGrad.addColorStop(0, '#06b6d4');
      waterGrad.addColorStop(0.4, '#0369a1');
      waterGrad.addColorStop(1, '#082f49');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 0, w, h);

      // Volumetric God Rays
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const startX = w * (0.2 + i * 0.15) + Math.sin(p * 2 + i) * 30;
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX + 90, 0);
        ctx.lineTo(startX - 120, h);
        ctx.lineTo(startX - 230, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Rising Bubble Stream
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      this.bubbles.forEach(b => {
        b.y -= b.speed * 0.02;
        b.wobble += 0.05;
        if (b.y < -20) b.y = h + 20;
        ctx.beginPath();
        ctx.arc(b.x + Math.sin(b.wobble) * 6, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Passing Hero Pufferfish
      if (p >= 0.42 && p <= 0.88) {
        const fishP = (p - 0.42) / (0.88 - 0.42);
        const fishX = w * 1.1 - fishP * (w * 1.3);
        const fishY = h * 0.52 + Math.sin(fishP * 12) * 24;
        this.drawCinematicPuffer(ctx, fishX, fishY, fishP);
      }

      // Predator Silhouette
      if (p >= 0.58) {
        const sharkP = (p - 0.58) / 0.42;
        const sharkX = -120 + sharkP * (w + 240);
        const sharkY = h * 0.28 + Math.sin(sharkP * 6) * 15;
        this.drawPredatorSilhouette(ctx, sharkX, sharkY);
      }

      // Deployment Banner
      if (p < 0.68) {
        ctx.fillStyle = '#67e8f9';
        ctx.font = '800 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ RESCUE PROTOCOL ENGAGED • DIVER DEPLOYING TO REEF 1', w / 2, h * 0.82);
      }
    }

    // Cinematic Widescreen Letterboxing (Top & Bottom Black Bars)
    const barHeight = Math.min(55, h * 0.1);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, barHeight);
    ctx.fillRect(0, h - barHeight, w, barHeight);

    // ==========================================
    // ACT 3: TITLE REVEAL (0.68 to 1.0)
    // ==========================================
    if (p >= 0.68) {
      const titleAlpha = Math.min(1.0, (p - 0.68) / 0.2);
      ctx.save();
      ctx.globalAlpha = titleAlpha;
      ctx.textAlign = 'center';

      // Title Glow Shadow
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 28;

      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 42px system-ui, sans-serif';
      ctx.fillText('PUFF GUARD', w / 2, h * 0.45);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#facc15';
      ctx.font = '800 15px system-ui, sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('DEFENDERS OF THE FIVE REEFS', w / 2, h * 0.53);

      ctx.restore();
    }

    ctx.restore();
  }

  drawCinematicPuffer(ctx, x, y, progress) {
    ctx.save();
    ctx.translate(x, y);

    const puffScale = 1.0 + Math.sin(progress * Math.PI) * 0.5;
    ctx.scale(puffScale, puffScale);

    // Body
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spines
    ctx.fillStyle = '#eab308';
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      const sx = Math.cos(angle) * 32;
      const sy = Math.sin(angle) * 28;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Belly
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(-4, 8, 20, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-14, -6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(-15, -6, 4, 0, Math.PI * 2);
    ctx.fill();

    // Wiggling Tail Fin
    const tailWiggle = Math.sin(Date.now() * 0.015) * 8;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(44, -14 + tailWiggle);
    ctx.lineTo(44, 14 + tailWiggle);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawPredatorSilhouette(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(8, 47, 73, 0.45)';

    ctx.beginPath();
    ctx.moveTo(70, 0);
    ctx.quadraticCurveTo(20, -22, -60, -8);
    ctx.lineTo(-75, -28);
    ctx.lineTo(-45, 0);
    ctx.lineTo(-90, -4);
    ctx.lineTo(-120, -26);
    ctx.lineTo(-105, 0);
    ctx.lineTo(-125, 22);
    ctx.lineTo(-80, 8);
    ctx.quadraticCurveTo(10, 18, 70, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
