// game.js — Core game engine
const Game = {
  canvas: null,
  ctx: null,
  dpr: 1,
  
  // Grid
  cols: 17,
  rows: 17,
  cellSize: 0,
  offsetX: 0,
  offsetY: 0,
  
  // Background images
  bgImages: {},
  
  // State
  snake: [],
  direction: 'right',
  nextDirection: 'right',
  items: [],
  obstacles: [],
  collected: 0,
  lives: 3,
  level: null,
  levelIdx: 0,
  
  // Timing
  tickInterval: 180,
  lastTick: 0,
  running: false,
  animFrame: null,
  
  // Respawn
  invincible: false,
  invincibleUntil: 0,
  respawnQueue: [], // for gradual body respawn
  
  // Particles
  particles: [],
  
  // Callbacks
  onLevelComplete: null,
  onGameOver: null,
  onItemCollected: null,
  onLifeLost: null,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this._resize();
    window.addEventListener('resize', () => this._resize());
    
    Input.init(canvas, (dir) => this._onSwipe(dir));
    
    // Preload background images
    for (let i = 0; i < LEVELS.length; i++) {
      const img = new Image();
      img.src = `assets/backgrounds/level${i + 1}.png`;
      this.bgImages[i] = img;
    }
  },

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    
    // Calculate cell size to fit grid with padding for HUD
    const hudHeight = 60;
    const padding = 10;
    const availW = w - padding * 2;
    const availH = h - hudHeight - padding * 2;
    this.cellSize = Math.floor(Math.min(availW / this.cols, availH / this.rows));
    this.offsetX = Math.floor((w - this.cols * this.cellSize) / 2);
    this.offsetY = hudHeight + Math.floor((availH - this.rows * this.cellSize) / 2);
  },

  startLevel(levelIdx) {
    this.levelIdx = levelIdx;
    this.level = LEVELS[levelIdx];
    this.tickInterval = this.level.speed;
    this.lives = 3;
    this.collected = 0;
    this.direction = 'right';
    this.nextDirection = 'right';
    this.invincible = false;
    this.particles = [];
    this.respawnQueue = [];
    
    // Init snake in center
    const cx = Math.floor(this.cols / 2);
    const cy = Math.floor(this.rows / 2);
    this.snake = [
      { x: cx, y: cy, dir: 'right' },
      { x: cx - 1, y: cy, dir: 'right' },
      { x: cx - 2, y: cy, dir: 'right' }
    ];
    
    // Generate obstacles
    this._generateObstacles();
    
    // Place items
    this.items = [];
    this._spawnItem();
    
    this.running = true;
    this.lastTick = performance.now();
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this._loop(performance.now());
  },

  stop() {
    this.running = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  },

  _onSwipe(dir) {
    // Prevent reversing into self
    const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
    if (dir !== opposite[this.direction]) {
      this.nextDirection = dir;
    }
  },

  _generateObstacles() {
    this.obstacles = [];
    const count = this.level.obstacles;
    const occupied = new Set();
    
    // Mark snake area as occupied
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const cx = Math.floor(this.cols / 2) + dx;
        const cy = Math.floor(this.rows / 2) + dy;
        occupied.add(`${cx},${cy}`);
      }
    }
    
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 100) {
        const x = 1 + Math.floor(Math.random() * (this.cols - 2));
        const y = 1 + Math.floor(Math.random() * (this.rows - 2));
        const key = `${x},${y}`;
        if (!occupied.has(key)) {
          this.obstacles.push({ x, y });
          occupied.add(key);
          break;
        }
        attempts++;
      }
    }
  },

  _spawnItem() {
    const occupied = new Set();
    this.snake.forEach(s => occupied.add(`${s.x},${s.y}`));
    this.obstacles.forEach(o => occupied.add(`${o.x},${o.y}`));
    this.items.forEach(it => occupied.add(`${it.x},${it.y}`));
    
    let attempts = 0;
    while (attempts < 200) {
      const x = Math.floor(Math.random() * this.cols);
      const y = Math.floor(Math.random() * this.rows);
      if (!occupied.has(`${x},${y}`)) {
        this.items.push({ x, y });
        return;
      }
      attempts++;
    }
  },

  _loop(now) {
    if (!this.running) return;
    this.animFrame = requestAnimationFrame((t) => this._loop(t));
    
    // Process gradual respawn queue
    if (this.respawnQueue.length > 0 && now - this.lastRespawnTick > 80) {
      this.snake.push(this.respawnQueue.shift());
      this.lastRespawnTick = now;
    }
    
    // Tick
    if (now - this.lastTick >= this.tickInterval) {
      this.lastTick = now;
      this._tick(now);
    }
    
    this._draw(now);
  },

  _tick(now) {
    this.direction = this.nextDirection;
    
    const head = this.snake[0];
    const newHead = { x: head.x, y: head.y, dir: this.direction };
    
    switch (this.direction) {
      case 'up': newHead.y--; break;
      case 'down': newHead.y++; break;
      case 'left': newHead.x--; break;
      case 'right': newHead.x++; break;
    }
    
    // Check wall collision
    if (newHead.x < 0 || newHead.x >= this.cols || newHead.y < 0 || newHead.y >= this.rows) {
      this._handleCollision(now);
      return;
    }
    
    // Check self collision (skip if invincible)
    if (!this.invincible) {
      for (let i = 0; i < this.snake.length; i++) {
        if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
          this._handleCollision(now);
          return;
        }
      }
    }
    
    // Check obstacle collision
    if (!this.invincible) {
      for (const obs of this.obstacles) {
        if (obs.x === newHead.x && obs.y === newHead.y) {
          this._handleCollision(now);
          return;
        }
      }
    }
    
    // Move
    this.snake.unshift(newHead);
    
    // Check item pickup
    let ate = false;
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this.items[i].x === newHead.x && this.items[i].y === newHead.y) {
        this.items.splice(i, 1);
        this.collected++;
        ate = true;
        
        // Spawn particles
        this._spawnParticles(newHead.x, newHead.y, 8);
        
        Audio.playPickup();
        if (this.onItemCollected) this.onItemCollected(this.collected, this.level.itemsNeeded);
        
        if (this.collected >= this.level.itemsNeeded) {
          this.running = false;
          Audio.playLevelComplete();
          if (this.onLevelComplete) this.onLevelComplete();
          return;
        }
        
        // Spawn next item
        this._spawnItem();
        break;
      }
    }
    
    if (!ate) {
      this.snake.pop(); // Remove tail if didn't eat
    }
  },

  _handleCollision(now) {
    this.lives--;
    Audio.playHurt();
    
    // Spawn hurt particles
    const head = this.snake[0];
    this._spawnParticles(head.x, head.y, 12, '#ff4444');
    
    if (this.onLifeLost) this.onLifeLost(this.lives);
    
    if (this.lives <= 0) {
      this.running = false;
      Audio.playGameOver();
      if (this.onGameOver) this.onGameOver();
      return;
    }
    
    // Respawn: head in center, body spawns gradually
    const cx = Math.floor(this.cols / 2);
    const cy = Math.floor(this.rows / 2);
    const prevLength = this.snake.length;
    
    this.snake = [{ x: cx, y: cy, dir: 'right' }];
    this.direction = 'right';
    this.nextDirection = 'right';
    
    // Queue remaining segments for gradual respawn
    this.respawnQueue = [];
    for (let i = 1; i < prevLength; i++) {
      this.respawnQueue.push({ x: cx - i, y: cy, dir: 'right' });
    }
    this.lastRespawnTick = now;
    
    // Brief invincibility
    this.invincible = true;
    this.invincibleUntil = now + 2000;
  },

  _spawnParticles(gx, gy, count, color) {
    const px = this.offsetX + gx * this.cellSize + this.cellSize / 2;
    const py = this.offsetY + gy * this.cellSize + this.cellSize / 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.015 + Math.random() * 0.02,
        size: 3 + Math.random() * 5,
        color: color || this.level.snakeAccent
      });
    }
  },

  _draw(now) {
    const ctx = this.ctx;
    const dpr = this.dpr;
    ctx.save();
    ctx.scale(dpr, dpr);
    
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;
    
    // Background
    ctx.fillStyle = this.level ? this.level.bgColor : '#1a0a2e';
    ctx.fillRect(0, 0, w, h);
    
    if (!this.level) { ctx.restore(); return; }
    
    // Grid area
    const gx = this.offsetX;
    const gy = this.offsetY;
    const gw = this.cols * this.cellSize;
    const gh = this.rows * this.cellSize;
    
    // Background image
    const bgImg = this.bgImages[this.levelIdx];
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(bgImg, gx, gy, gw, gh);
      ctx.restore();
    }
    
    // Grid background overlay
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(gx, gy, gw, gh);
    
    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= this.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(gx + c * this.cellSize, gy);
      ctx.lineTo(gx + c * this.cellSize, gy + gh);
      ctx.stroke();
    }
    for (let r = 0; r <= this.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(gx, gy + r * this.cellSize);
      ctx.lineTo(gx + gw, gy + r * this.cellSize);
      ctx.stroke();
    }
    
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(gx, gy, gw, gh);
    
    // Obstacles
    for (const obs of this.obstacles) {
      const ox = gx + obs.x * this.cellSize;
      const oy = gy + obs.y * this.cellSize;
      const cs = this.cellSize;
      ctx.fillStyle = this.level.obstacleColor;
      ctx.beginPath();
      ctx.roundRect(ox + 2, oy + 2, cs - 4, cs - 4, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(ox + 4, oy + 4, cs - 8, (cs - 8) * 0.4, 3);
      ctx.fill();
    }
    
    // Items with glow and bob
    for (const item of this.items) {
      const ix = gx + item.x * this.cellSize + this.cellSize / 2;
      const iy = gy + item.y * this.cellSize + this.cellSize / 2;
      const bob = Math.sin(now * 0.004) * 3;
      
      // Glow
      const grad = ctx.createRadialGradient(ix, iy + bob, 0, ix, iy + bob, this.cellSize * 0.8);
      grad.addColorStop(0, 'rgba(255,255,200,0.3)');
      grad.addColorStop(1, 'rgba(255,255,200,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ix, iy + bob, this.cellSize * 0.8, 0, Math.PI * 2);
      ctx.fill();
      
      // Emoji
      ctx.font = `${this.cellSize * 0.7}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.level.itemEmoji, ix, iy + bob);
    }
    
    // Snake
    const blinking = this.invincible && now < this.invincibleUntil;
    if (!blinking || Math.floor(now / 120) % 2 === 0) {
      ctx.save();
      ctx.translate(gx, gy);
      SnakeRenderer.drawSnake(ctx, this.snake, this.cellSize, this.level, now);
      ctx.restore();
    }
    
    // Check invincibility expiry
    if (this.invincible && now >= this.invincibleUntil) {
      this.invincible = false;
    }
    
    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // gravity
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    ctx.restore();
  }
};
