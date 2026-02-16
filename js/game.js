// game.js — Core game engine (infinite world, camera follows snake)
const Game = {
  canvas: null,
  ctx: null,
  dpr: 1,
  
  // Grid (visible area size, not bounds)
  viewCols: 17,
  viewRows: 17,
  cellSize: 0,
  
  // Camera (world coords, centered on snake head)
  camX: 0,
  camY: 0,
  
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
  respawnQueue: [],
  lastRespawnTick: 0,
  
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
    
    const hudHeight = 60;
    const padding = 10;
    const availW = w - padding * 2;
    const availH = h - hudHeight - padding * 2;
    this.cellSize = Math.floor(Math.min(availW / this.viewCols, availH / this.viewRows));
    this.hudHeight = hudHeight;
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
    
    // Init snake at world origin
    this.snake = [
      { x: 0, y: 0, dir: 'right' },
      { x: -1, y: 0, dir: 'right' },
      { x: -2, y: 0, dir: 'right' }
    ];
    
    this.camX = 0;
    this.camY = 0;
    
    // Generate obstacles around start area
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
    const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
    if (dir !== opposite[this.direction]) {
      this.nextDirection = dir;
    }
  },

  _generateObstacles() {
    this.obstacles = [];
    const count = this.level.obstacles;
    const occupied = new Set();
    
    // Mark snake area as occupied (generous zone)
    for (let dx = -4; dx <= 4; dx++) {
      for (let dy = -4; dy <= 4; dy++) {
        occupied.add(`${dx},${dy}`);
      }
    }
    
    // Spawn obstacles in a ring around the start
    const spawnRadius = 12;
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 100) {
        const x = Math.floor(Math.random() * spawnRadius * 2) - spawnRadius;
        const y = Math.floor(Math.random() * spawnRadius * 2) - spawnRadius;
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

  // Spawn more obstacles as snake explores further out
  _maybeSpawnMoreObstacles() {
    if (this.level.obstacles === 0) return;
    const head = this.snake[0];
    const halfView = Math.floor(this.viewCols / 2) + 2;
    
    // Remove obstacles far away (cleanup)
    this.obstacles = this.obstacles.filter(o => 
      Math.abs(o.x - head.x) < 40 && Math.abs(o.y - head.y) < 40
    );
    
    // Keep roughly the same density
    const targetCount = this.level.obstacles;
    if (this.obstacles.length >= targetCount) return;
    
    const occupied = new Set();
    this.snake.forEach(s => occupied.add(`${s.x},${s.y}`));
    this.items.forEach(it => occupied.add(`${it.x},${it.y}`));
    this.obstacles.forEach(o => occupied.add(`${o.x},${o.y}`));
    
    // Safe zone around head
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        occupied.add(`${head.x + dx},${head.y + dy}`);
      }
    }
    
    const needed = targetCount - this.obstacles.length;
    for (let i = 0; i < needed; i++) {
      let attempts = 0;
      while (attempts < 50) {
        // Spawn at edge of visible area
        const angle = Math.random() * Math.PI * 2;
        const dist = halfView + 2 + Math.floor(Math.random() * 5);
        const x = head.x + Math.round(Math.cos(angle) * dist);
        const y = head.y + Math.round(Math.sin(angle) * dist);
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
    const head = this.snake[0];
    const occupied = new Set();
    this.snake.forEach(s => occupied.add(`${s.x},${s.y}`));
    this.obstacles.forEach(o => occupied.add(`${o.x},${o.y}`));
    this.items.forEach(it => occupied.add(`${it.x},${it.y}`));
    
    // Spawn within visible area but not too close
    const halfView = Math.floor(this.viewCols / 2);
    let attempts = 0;
    while (attempts < 200) {
      const x = head.x + Math.floor(Math.random() * (halfView * 2)) - halfView;
      const y = head.y + Math.floor(Math.random() * (halfView * 2)) - halfView;
      // Not too close to head
      if (Math.abs(x - head.x) + Math.abs(y - head.y) < 3) { attempts++; continue; }
      if (!occupied.has(`${x},${y}`)) {
        this.items.push({ x, y });
        return;
      }
      attempts++;
    }
    // Fallback: spawn somewhere nearby
    this.items.push({ x: head.x + 5, y: head.y + 3 });
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
    
    // Smooth camera towards snake head
    const head = this.snake[0];
    this.camX += (head.x - this.camX) * 0.15;
    this.camY += (head.y - this.camY) * 0.15;
    
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
    
    // NO wall collision — infinite world!
    
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
    
    // Maybe spawn more obstacles
    this._maybeSpawnMoreObstacles();
    
    // Check item pickup
    let ate = false;
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this.items[i].x === newHead.x && this.items[i].y === newHead.y) {
        this.items.splice(i, 1);
        this.collected++;
        ate = true;
        
        this._spawnParticles(newHead.x, newHead.y, 8);
        
        Audio.playPickup();
        if (this.onItemCollected) this.onItemCollected(this.collected, this.level.itemsNeeded);
        
        if (this.collected >= this.level.itemsNeeded) {
          this.running = false;
          Audio.playLevelComplete();
          if (this.onLevelComplete) this.onLevelComplete();
          return;
        }
        
        this._spawnItem();
        break;
      }
    }
    
    if (!ate) {
      this.snake.pop();
    }
  },

  _handleCollision(now) {
    this.lives--;
    Audio.playHurt();
    
    const head = this.snake[0];
    this._spawnParticles(head.x, head.y, 12, '#ff4444');
    
    if (this.onLifeLost) this.onLifeLost(this.lives);
    
    if (this.lives <= 0) {
      this.running = false;
      Audio.playGameOver();
      if (this.onGameOver) this.onGameOver();
      return;
    }
    
    // Respawn at current head position (don't teleport)
    const cx = head.x;
    const cy = head.y;
    const prevLength = this.snake.length;
    
    this.snake = [{ x: cx, y: cy, dir: 'right' }];
    this.direction = 'right';
    this.nextDirection = 'right';
    
    this.respawnQueue = [];
    for (let i = 1; i < prevLength; i++) {
      this.respawnQueue.push({ x: cx - i, y: cy, dir: 'right' });
    }
    this.lastRespawnTick = now;
    
    // Clear nearby obstacles so respawn isn't instant death
    this.obstacles = this.obstacles.filter(o =>
      Math.abs(o.x - cx) > 3 || Math.abs(o.y - cy) > 3
    );
    
    this.invincible = true;
    this.invincibleUntil = now + 2000;
  },

  // Convert world coordinates to screen pixel coordinates
  _worldToScreen(wx, wy) {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const screenCX = w / 2;
    const screenCY = this.hudHeight + (h - this.hudHeight) / 2;
    
    return {
      x: screenCX + (wx - this.camX) * this.cellSize,
      y: screenCY + (wy - this.camY) * this.cellSize
    };
  },

  _spawnParticles(gx, gy, count, color) {
    // Store in world coords
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        wx: gx, wy: gy, // world grid position (for screen conversion)
        ox: 0, oy: 0, // pixel offset from grid cell center
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
    const cs = this.cellSize;
    
    // Background
    ctx.fillStyle = this.level ? this.level.bgColor : '#1a0a2e';
    ctx.fillRect(0, 0, w, h);
    
    if (!this.level) { ctx.restore(); return; }
    
    // Calculate visible grid range
    const halfCols = Math.ceil(w / cs / 2) + 1;
    const halfRows = Math.ceil(h / cs / 2) + 1;
    const camFloorX = Math.floor(this.camX);
    const camFloorY = Math.floor(this.camY);
    
    // Background image (tiled across visible area)
    const bgImg = this.bgImages[this.levelIdx];
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      // Tile the bg image across the viewport
      const tileSize = this.viewCols * cs;
      const startWX = camFloorX - halfCols;
      const startWY = camFloorY - halfRows;
      const tileStartX = Math.floor(startWX / this.viewCols) * this.viewCols;
      const tileStartY = Math.floor(startWY / this.viewRows) * this.viewRows;
      for (let tx = tileStartX; tx < camFloorX + halfCols + this.viewCols; tx += this.viewCols) {
        for (let ty = tileStartY; ty < camFloorY + halfRows + this.viewRows; ty += this.viewRows) {
          const sp = this._worldToScreen(tx, ty);
          ctx.drawImage(bgImg, sp.x, sp.y, tileSize, tileSize);
        }
      }
      ctx.restore();
    }
    
    // Grid lines (infinite, subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let gx = camFloorX - halfCols; gx <= camFloorX + halfCols; gx++) {
      const sp = this._worldToScreen(gx, 0);
      ctx.beginPath();
      ctx.moveTo(sp.x, 0);
      ctx.lineTo(sp.x, h);
      ctx.stroke();
    }
    for (let gy = camFloorY - halfRows; gy <= camFloorY + halfRows; gy++) {
      const sp = this._worldToScreen(0, gy);
      ctx.beginPath();
      ctx.moveTo(0, sp.y);
      ctx.lineTo(w, sp.y);
      ctx.stroke();
    }
    
    // Obstacles
    for (const obs of this.obstacles) {
      const sp = this._worldToScreen(obs.x, obs.y);
      if (sp.x < -cs || sp.x > w + cs || sp.y < -cs || sp.y > h + cs) continue;
      ctx.fillStyle = this.level.obstacleColor;
      ctx.beginPath();
      ctx.roundRect(sp.x - cs/2 + 2, sp.y - cs/2 + 2, cs - 4, cs - 4, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(sp.x - cs/2 + 4, sp.y - cs/2 + 4, cs - 8, (cs - 8) * 0.4, 3);
      ctx.fill();
    }
    
    // Items with glow and bob
    for (const item of this.items) {
      const sp = this._worldToScreen(item.x, item.y);
      if (sp.x < -cs*2 || sp.x > w + cs*2 || sp.y < -cs*2 || sp.y > h + cs*2) continue;
      const bob = Math.sin(now * 0.004) * 3;
      
      const grad = ctx.createRadialGradient(sp.x, sp.y + bob, 0, sp.x, sp.y + bob, cs * 0.8);
      grad.addColorStop(0, 'rgba(255,255,200,0.3)');
      grad.addColorStop(1, 'rgba(255,255,200,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y + bob, cs * 0.8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.font = `${cs * 0.7}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.level.itemEmoji, sp.x, sp.y + bob);
    }
    
    // Snake
    const blinking = this.invincible && now < this.invincibleUntil;
    if (!blinking || Math.floor(now / 120) % 2 === 0) {
      ctx.save();
      // SnakeRenderer expects segments in local pixel coords (x * cellSize, y * cellSize)
      // We need to translate so that world coords map to screen
      const origin = this._worldToScreen(0, 0);
      ctx.translate(origin.x - cs/2, origin.y - cs/2);
      SnakeRenderer.drawSnake(ctx, this.snake, cs, this.level, now);
      ctx.restore();
    }
    
    // Check invincibility expiry
    if (this.invincible && now >= this.invincibleUntil) {
      this.invincible = false;
    }
    
    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.ox += p.vx;
      p.oy += p.vy;
      p.vy += 0.05;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      const sp = this._worldToScreen(p.wx, p.wy);
      const px = sp.x + p.ox;
      const py = sp.y + p.oy;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    ctx.restore();
  }
};
