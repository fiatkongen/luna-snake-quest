// main.js — App controller, wires everything together
const App = {
  currentLevel: 0,

  init() {
    Audio.init();
    UI.init();
    
    const canvas = document.getElementById('game-canvas');
    Game.init(canvas);
    
    // Wire game callbacks
    Game.onItemCollected = (collected, needed) => {
      UI.updateHUD(Game.lives, collected, needed, Game.levelIdx + 1);
    };
    Game.onLifeLost = (lives) => {
      UI.updateHUD(lives, Game.collected, Game.level.itemsNeeded, Game.levelIdx + 1);
    };
    Game.onLevelComplete = () => {
      const nextIdx = Game.levelIdx + 1;
      Storage.unlockLevel(nextIdx + 1);
      
      if (nextIdx >= LEVELS.length) {
        // Beat all levels!
        setTimeout(() => {
          Audio.playWin();
          UI.show('winScreen');
        }, 500);
      } else {
        setTimeout(() => {
          UI.showLevelComplete(LEVELS[Game.levelIdx], LEVELS[nextIdx]);
        }, 500);
      }
    };
    Game.onGameOver = () => {
      setTimeout(() => UI.show('gameOver'), 500);
    };

    // Button handlers
    document.getElementById('btn-play').addEventListener('click', () => {
      Audio.unlock();
      Audio.playButtonClick();
      const lvl = Storage.getUnlockedLevel();
      this.startLevel(Math.min(lvl, LEVELS.length) - 1);
    });

    document.getElementById('btn-levels').addEventListener('click', () => {
      Audio.unlock();
      Audio.playButtonClick();
      UI.buildLevelGrid();
      UI.show('levelSelect');
    });

    document.getElementById('btn-back-title').addEventListener('click', () => {
      Audio.playButtonClick();
      UI.show('title');
    });

    document.getElementById('btn-start-level').addEventListener('click', () => {
      Audio.unlock();
      Audio.playButtonClick();
      Game.startLevel(this.currentLevel);
      UI.show('gameplay');
      UI.updateHUD(3, 0, LEVELS[this.currentLevel].itemsNeeded, this.currentLevel + 1);
    });

    document.getElementById('btn-next-level').addEventListener('click', () => {
      Audio.playButtonClick();
      this.startLevel(Game.levelIdx + 1);
    });

    document.getElementById('btn-complete-menu').addEventListener('click', () => {
      Audio.playButtonClick();
      Game.stop();
      UI.show('title');
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      Audio.playButtonClick();
      this.startLevel(Game.levelIdx);
    });

    document.getElementById('btn-gameover-menu').addEventListener('click', () => {
      Audio.playButtonClick();
      Game.stop();
      UI.show('title');
    });

    document.getElementById('btn-win-menu').addEventListener('click', () => {
      Audio.playButtonClick();
      Game.stop();
      UI.show('title');
    });

    document.getElementById('btn-mute').addEventListener('click', () => {
      const muted = !Audio.muted;
      Audio.setMuted(muted);
      UI.updateMuteButton(muted);
    });

    // Initialize mute button state
    UI.updateMuteButton(Audio.muted);
    
    // Show title
    UI.show('title');
  },

  startLevel(idx) {
    if (idx < 0 || idx >= LEVELS.length) return;
    this.currentLevel = idx;
    UI.showLevelIntro(LEVELS[idx]);
  }
};

// Start when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
