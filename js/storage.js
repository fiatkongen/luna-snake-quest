// storage.js — localStorage wrapper
const Storage = {
  KEY: 'luna-snake-quest',

  _data: null,

  _load() {
    if (this._data) return this._data;
    try {
      const raw = localStorage.getItem(this.KEY);
      this._data = raw ? JSON.parse(raw) : this._defaults();
    } catch {
      this._data = this._defaults();
    }
    return this._data;
  },

  _defaults() {
    return { unlockedLevel: 1, muted: false };
  },

  _save() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this._data));
    } catch { /* localStorage full or blocked */ }
  },

  getUnlockedLevel() {
    return this._load().unlockedLevel;
  },

  unlockLevel(level) {
    const data = this._load();
    if (level > data.unlockedLevel) {
      data.unlockedLevel = level;
      this._save();
    }
  },

  isMuted() {
    return this._load().muted;
  },

  setMuted(val) {
    this._load().muted = val;
    this._save();
  }
};
