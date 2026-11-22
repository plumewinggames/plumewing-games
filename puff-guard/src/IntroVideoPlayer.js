import { sound } from '../../core/audio/SynthAudio.js';

/**
 * IntroVideoPlayer - Cinematic Opening Intro Video & Cutscene Sequence.
 * Renders an ultra-smooth, 60 FPS cinematic prologue with underwater caustics,
 * surface plunge, marine life pass-bys, and dramatic title sting.
 */
export class IntroVideoPlayer {
  constructor(canvasId, onComplete) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onComplete = onComplete;
    this.isPlaying = false;
    this.progress = 0; // 0.0 to 1.0 (Duration ~8.0s)
    this.duration = 8.0; 
    this.startTime = 0;
    this.bubbles = [];

    this.initBubbles();
  }

  initBubbles() {
    this.bubbles = [];
    for (let i = 0; i < 45; i++) {
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
    sound.playRevive(); // Opening musical chime

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
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

    // Scene 1: Surface Plunge (0.0 to 0.3)
    // Scene 2: Coral Descent & Puffer Encounter (0.3 to 0.7)
    // Scene 3: Title Sting & Predator Shadow (0.7 to 1.0)

    if (p < 0.25) {
      // Transition from sky to underwater plunge
      const plungeFactor = p / 0.25;
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#38bdf8');
      skyGrad.addColorStop(1 - plungeFactor * 0.8, '#bae6fd');
      skyGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Water surface waves rising
      const waveY = h * (1 - plungeFactor);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.65)';
      ctx.beginPath();
      ctx.moveTo(0, waveY);
      for (let x = 0; x <= w; x += 30) {
        ctx.lineTo(x, waveY + Math.sin(x * 0.03 + p * 20) * 12);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

    } else {
      // Underwater Abyssal Gradient
      const depthFactor = (p - 0.25) / 0.75;
      const waterGrad = ctx.createLinearGradient(0, 0, 0, h);
      waterGrad.addColorStop(0, '#06b6d4');
      waterGrad.addColorStop(0.4, '#0369a1');
      waterGrad.addColorStop(1, '#082f49');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 0, w, h);

      // Volumetric God Rays
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
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
        b.y -= b.speed * 0.016;
        b.wobble += 0.05;
        if (b.y < -20) b.y = h + 20;
        ctx.beginPath();
        ctx.arc(b.x + Math.sin(b.wobble) * 6, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Passing Hero Pufferfish
      if (p >= 0.28 && p <= 0.85) {
        const fishP = (p - 0.28) / (0.85 - 0.28);
        const fishX = w * 1.1 - fishP * (w * 1.3);
        const fishY = h * 0.52 + Math.sin(fishP * 12) * 24;
        this.drawCinematicPuffer(ctx, fishX, fishY, fishP);
      }

      // Distant Predator Shadow (0.55 to 0.95)
      if (p >= 0.55) {
        const sharkP = (p - 0.55) / 0.4;
        const sharkX = -120 + sharkP * (w + 240);
        const sharkY = h * 0.28 + Math.sin(sharkP * 6) * 15;
        this.drawPredatorSilhouette(ctx, sharkX, sharkY);
      }
    }

    // Cinematic Widescreen Letterboxing (Top & Bottom Black Bars)
    const barHeight = Math.min(55, h * 0.1);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, barHeight);
    ctx.fillRect(0, h - barHeight, w, barHeight);

    // Title Reveal (0.65 to 1.0)
    if (p >= 0.65) {
      const titleAlpha = Math.min(1.0, (p - 0.65) / 0.2);
      ctx.save();
      ctx.globalAlpha = titleAlpha;
      ctx.textAlign = 'center';

      // Title Glow Shadow
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 25;

      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 38px system-ui, sans-serif';
      ctx.fillText('PUFF GUARD', w / 2, h * 0.45);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#facc15';
      ctx.font = '700 14px system-ui, sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('DEFENDERS OF THE FIVE REEFS', w / 2, h * 0.52);

      ctx.restore();
    }

    ctx.restore();
  }

  drawCinematicPuffer(ctx, x, y, progress) {
    ctx.save();
    ctx.translate(x, y);

    // Dynamic puff inflation curve
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
    ctx.fillStyle = 'rgba(8, 47, 73, 0.45)'; // Murky shadow

    // Shark Silhouette
    ctx.beginPath();
    ctx.moveTo(70, 0);
    ctx.quadraticCurveTo(20, -22, -60, -8); // Dorsal
    ctx.lineTo(-75, -28); // Dorsal fin peak
    ctx.lineTo(-45, 0);
    ctx.lineTo(-90, -4);
    ctx.lineTo(-120, -26); // Upper tail
    ctx.lineTo(-105, 0);
    ctx.lineTo(-125, 22); // Lower tail
    ctx.lineTo(-80, 8);
    ctx.quadraticCurveTo(10, 18, 70, 0); // Underbelly
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
