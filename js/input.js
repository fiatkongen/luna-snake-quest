// input.js — Swipe detection for touch + keyboard fallback
const Input = {
  callback: null,
  startX: 0,
  startY: 0,
  MIN_SWIPE: 30,

  init(canvas, callback) {
    this.callback = callback;

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) return; // ignore multi-touch
      e.preventDefault();
      this.startX = e.touches[0].clientX;
      this.startY = e.touches[0].clientY;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault(); // prevent Safari scroll/gestures
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 0) return;
      e.preventDefault();
      const dx = e.changedTouches[0].clientX - this.startX;
      const dy = e.changedTouches[0].clientY - this.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.MIN_SWIPE) return;
      
      // Nearest cardinal direction (handles diagonal swipes)
      if (Math.abs(dx) > Math.abs(dy)) {
        this.callback(dx > 0 ? 'right' : 'left');
      } else {
        this.callback(dy > 0 ? 'down' : 'up');
      }
    }, { passive: false });

    // Keyboard fallback for testing
    document.addEventListener('keydown', (e) => {
      const map = {
        ArrowUp: 'up', ArrowDown: 'down',
        ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right'
      };
      if (map[e.key]) {
        e.preventDefault();
        this.callback(map[e.key]);
      }
    });
  }
};
