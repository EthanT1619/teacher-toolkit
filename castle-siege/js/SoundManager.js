/**
 * SoundManager - Simple Web Audio API sound effects with mute toggle.
 */
class SoundManager {
  constructor() {
    this.muted = false;
    this.ctx = null;
  }

  _ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  /** Play a tone burst with given frequency pattern. */
  _playTone(frequencies, duration = 0.15, type = 'square', volume = 0.15) {
    if (this.muted) return;
    const ctx = this._ensureContext();
    const now = ctx.currentTime;

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, now + i * duration);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * duration);
      osc.stop(now + (i + 1) * duration + 0.05);
    });
  }

  playAttack() {
    this._playTone([200, 150, 100], 0.08, 'sawtooth', 0.12);
  }

  playRepair() {
    this._playTone([400, 500, 600, 700], 0.1, 'sine', 0.1);
  }

  playShield() {
    this._playTone([300, 400, 500], 0.12, 'triangle', 0.1);
  }

  playCharge() {
    this._playTone([600, 800, 1000], 0.08, 'square', 0.1);
  }

  playExplosion() {
    if (this.muted) return;
    const ctx = this._ensureContext();
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
  }

  playVictory() {
    this._playTone([523, 659, 784, 1047], 0.2, 'sine', 0.12);
  }
}
