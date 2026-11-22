/**
 * SynthAudio - Zero-dependency procedural Web Audio API sound synthesizer.
 * Eliminates external MP3/WAV assets ($0 asset bandwidth and 0ms load latency).
 */
export class SynthAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;

    // Handle mobile browser audio unlocking
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('click', unlock);
    };
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.3, this.ctx.currentTime);
    }
    return this.muted;
  }

  mute() {
    this.muted = true;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  unmute() {
    this.muted = false;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    }
  }

  // --- Procedural SFX Generators ---

  /** Positive chime on passing through gates or rings */
  playGatePass(isCenter = false) {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const baseFreq = isCenter ? 880 : 587.33; // A5 or D5

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.15);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.35);

    if (isCenter) {
      // Harmonic sparkle
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 2, now + 0.05);
      gain2.gain.setValueAtTime(0.25, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.4);
    }
  }

  /** Heavy Mallet ground impact (Caveman slam) */
  playMalletImpact() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;

    // Sub thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.28);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);

    // Crack noise
    this.playNoiseBurst(0.12, 400, 0.5);
  }

  /** Advancing shockwave whoosh */
  playShockwave() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  /** Systolic Heartbeat Pulse (Nano Drift) */
  playHeartbeat() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;

    const pulse = (timeOffset, freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + timeOffset);
      osc.frequency.exponentialRampToValueAtTime(30, now + timeOffset + 0.12);

      gain.gain.setValueAtTime(0.5, now + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + 0.15);
    };

    pulse(0.0, 75);
    pulse(0.16, 60);
  }

  /** Geiger counter tick (Zone Survey) */
  playGeigerClick() {
    if (!this.initialized || this.muted) return;
    this.playNoiseBurst(0.015, 2500, 0.4);
  }

  /** Currency pickup (Pearls & Golden Berries) */
  playCollect() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Second-Chance Revive chime */
  playRevive() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.35, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  }

  /** Noise burst utility for impacts, clicks, wind */
  playNoiseBurst(duration, filterFreq, volume = 0.3) {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + duration);
  }
}

export const sound = new SynthAudio();
