// snake-renderer.js — Canvas-drawn snakes with smooth interpolation
const SnakeRenderer = {
  drawSnake(ctx, segments, cellSize, level, time, tickProgress = 1) {
    if (segments.length === 0) return;
    const { snakeColor, isRainbow } = level;
    const t = tickProgress;
    
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      
      // Interpolate position for smooth movement
      const visX = (seg.prevX !== undefined) ? seg.prevX + (seg.x - seg.prevX) * t : seg.x;
      const visY = (seg.prevY !== undefined) ? seg.prevY + (seg.y - seg.prevY) * t : seg.y;
      const x = visX * cellSize;
      const y = visY * cellSize;
      
      const isHead = i === 0;
      const isTail = i === segments.length - 1;
      
      // Color
      let color;
      if (isRainbow) {
        const hue = (i * 40 + time * 0.1) % 360;
        color = `hsl(${hue}, 80%, 60%)`;
      } else {
        const lightness = snakeColor.l + (i === 0 ? 10 : -i * 1.5);
        color = `hsl(${snakeColor.h}, ${snakeColor.s}%, ${Math.max(25, Math.min(80, lightness))}%)`;
      }
      
      ctx.fillStyle = color;
      
      if (isHead) {
        this._drawHead(ctx, x, y, cellSize, seg.dir, color, level, time);
      } else if (isTail) {
        this._drawTail(ctx, x, y, cellSize, color);
      } else {
        this._drawBody(ctx, x, y, cellSize, color, i);
      }
    }
  },

  _drawHead(ctx, x, y, cs, dir, color, level, time) {
    const pad = cs * 0.05;
    const r = cs * 0.2;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2, r);
    ctx.fill();
    
    // Lighter top
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.roundRect(x + pad + 2, y + pad + 2, cs - pad * 2 - 4, (cs - pad * 2) * 0.4, r);
    ctx.fill();
    
    // Eyes
    const eyeSize = cs * 0.16;
    const pupilSize = cs * 0.08;
    let e1x, e1y, e2x, e2y;
    const cx = x + cs / 2;
    const cy = y + cs / 2;
    
    if (dir === 'up')         { e1x = cx - cs*0.2; e1y = cy - cs*0.15; e2x = cx + cs*0.2; e2y = cy - cs*0.15; }
    else if (dir === 'down')  { e1x = cx - cs*0.2; e1y = cy + cs*0.15; e2x = cx + cs*0.2; e2y = cy + cs*0.15; }
    else if (dir === 'left')  { e1x = cx - cs*0.15; e1y = cy - cs*0.2; e2x = cx - cs*0.15; e2y = cy + cs*0.2; }
    else                      { e1x = cx + cs*0.15; e1y = cy - cs*0.2; e2x = cx + cs*0.15; e2y = cy + cs*0.2; }
    
    // White of eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(e1x, e1y, eyeSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e2x, e2y, eyeSize, 0, Math.PI * 2); ctx.fill();
    
    // Pupils (look in direction of movement + slight animation)
    const px = Math.sin(time * 0.003) * 1.5;
    let pdx = 0, pdy = 0;
    if (dir === 'left') pdx = -2;
    else if (dir === 'right') pdx = 2;
    else if (dir === 'up') pdy = -2;
    else if (dir === 'down') pdy = 2;
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(e1x + pdx + px, e1y + pdy, pupilSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e2x + pdx + px, e2y + pdy, pupilSize, 0, Math.PI * 2); ctx.fill();
    
    // Cute blush
    ctx.fillStyle = 'rgba(255,150,150,0.3)';
    ctx.beginPath(); ctx.arc(cx - cs*0.25, cy + cs*0.15, cs*0.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + cs*0.25, cy + cs*0.15, cs*0.1, 0, Math.PI*2); ctx.fill();

    // Tiny smile
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy + cs*0.1, cs*0.12, 0.1*Math.PI, 0.9*Math.PI);
    ctx.stroke();
  },

  _drawBody(ctx, x, y, cs, color, idx) {
    const pad = cs * 0.08;
    const r = cs * 0.18;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2, r);
    ctx.fill();
    
    // Subtle pattern (scales)
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.arc(x + cs/2, y + cs/2, cs * 0.15, 0, Math.PI*2);
    ctx.fill();
  },

  _drawTail(ctx, x, y, cs, color) {
    const pad = cs * 0.15;
    const r = cs * 0.25;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2, r);
    ctx.fill();
  },

  drawPreview(canvas, level) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 200 * dpr;
    canvas.height = 100 * dpr;
    canvas.style.width = '200px';
    canvas.style.height = '100px';
    ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, 200, 100);
    
    const cs = 22;
    const segments = [];
    for (let i = 0; i < 6; i++) {
      segments.push({ x: 1.5 + i * 0.95, y: 2, dir: 'right' });
    }
    segments.reverse();
    
    ctx.save();
    ctx.translate(10, 5);
    this.drawSnake(ctx, segments, cs, level, Date.now(), 1);
    ctx.restore();
  }
};
