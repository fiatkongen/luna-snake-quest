// audio.js — Sound effects using Web Audio API (Safari-safe)
const Audio = {
  ctx: null,
  unlocked: false,
  muted: false,

  init() {
    this.muted = Storage.isMuted();
  },

  // Must be called from a user gesture (tap/click)
  unlock() {
    if (this.unlocked) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Play silent buffer to unlock
      const buf = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(0);
      this.unlocked = true;
    } catch(e) {
      console.warn('AudioContext failed:', e);
    }
  },

  setMuted(val) {
    this.muted = val;
    Storage.setMuted(val);
  },

  // Simple synth sounds
  _play(freq, duration, type = 'sine', volume = 0.3) {
    if (this.muted || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch(e) {}
  },

  playPickup() {
    // Cheerful ascending notes
    this._play(523, 0.1, 'sine', 0.25);
    setTimeout(() => this._play(659, 0.1, 'sine', 0.25), 60);
    setTimeout(() => this._play(784, 0.15, 'sine', 0.2), 120);
  },

  playHurt() {
    // Descending "oops"
    this._play(300, 0.15, 'triangle', 0.3);
    setTimeout(() => this._play(200, 0.2, 'triangle', 0.25), 100);
  },

  playLevelComplete() {
    // Fanfare
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => this._play(f, 0.25, 'sine', 0.2), i * 150);
    });
  },

  playGameOver() {
    this._play(250, 0.3, 'triangle', 0.25);
    setTimeout(() => this._play(200, 0.4, 'triangle', 0.2), 200);
  },

  playButtonClick() {
    this._play(600, 0.08, 'sine', 0.15);
  },

  playWin() {
    // Grand fanfare
    const notes = [523, 659, 784, 880, 1047, 1319];
    notes.forEach((f, i) => {
      setTimeout(() => this._play(f, 0.3, 'sine', 0.2), i * 120);
    });
  }
};
