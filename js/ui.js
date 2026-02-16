// ui.js — Screen management, HUD, transitions
const UI = {
  screens: {},
  currentScreen: null,

  init() {
    this.screens = {
      title: document.getElementById('title-screen'),
      levelSelect: document.getElementById('level-select'),
      levelIntro: document.getElementById('level-intro'),
      hud: document.getElementById('hud'),
      levelComplete: document.getElementById('level-complete'),
      gameOver: document.getElementById('game-over'),
      winScreen: document.getElementById('win-screen')
    };
  },

  show(screenName) {
    // Hide all screens
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    this.screens.hud.classList.add('hidden');
    
    if (screenName === 'gameplay') {
      this.screens.hud.classList.remove('hidden');
    } else if (this.screens[screenName]) {
      this.screens[screenName].classList.add('active');
    }
    this.currentScreen = screenName;
  },

  updateHUD(lives, collected, needed, levelNum) {
    document.getElementById('hud-hearts').textContent = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
    document.getElementById('hud-items').textContent = `${collected}/${needed}`;
    document.getElementById('hud-level').textContent = `Level ${levelNum}`;
  },

  buildLevelGrid() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    const unlocked = Storage.getUnlockedLevel();
    
    for (let i = 1; i <= 10; i++) {
      const btn = document.createElement('button');
      btn.className = 'level-btn ' + (i <= unlocked ? 'unlocked' : 'locked');
      btn.textContent = i <= unlocked ? i : '🔒';
      if (i <= unlocked) {
        btn.addEventListener('click', () => {
          Audio.playButtonClick();
          App.startLevel(i - 1);
        });
      }
      grid.appendChild(btn);
    }
  },

  showLevelIntro(level) {
    document.getElementById('intro-world-name').textContent = `✨ ${level.name} ✨`;
    document.getElementById('intro-snake-name').textContent = level.snakeName;
    document.getElementById('intro-goal').textContent = `Saml ${level.itemsNeeded} ${level.itemName}!`;
    
    // Snake preview
    const container = document.getElementById('intro-snake-preview');
    container.innerHTML = '';
    const previewCanvas = document.createElement('canvas');
    container.appendChild(previewCanvas);
    SnakeRenderer.drawPreview(previewCanvas, level);
    
    this.show('levelIntro');
  },

  showLevelComplete(level, nextLevel) {
    const msg = document.getElementById('complete-message');
    const snakeName = document.getElementById('complete-snake-name');
    const nextBtn = document.getElementById('btn-next-level');
    
    if (nextLevel) {
      msg.textContent = `Du samlede alle ${level.itemName}!`;
      snakeName.textContent = `Ny slange: ${nextLevel.snakeName}!`;
      nextBtn.style.display = '';
      
      const container = document.getElementById('complete-snake-preview');
      container.innerHTML = '';
      const previewCanvas = document.createElement('canvas');
      container.appendChild(previewCanvas);
      SnakeRenderer.drawPreview(previewCanvas, nextLevel);
    } else {
      msg.textContent = `Du samlede alle ${level.itemName}!`;
      snakeName.textContent = '';
      nextBtn.style.display = 'none';
    }
    
    this.show('levelComplete');
  },

  updateMuteButton(muted) {
    document.getElementById('btn-mute').textContent = muted ? '🔇' : '🔊';
  }
};
