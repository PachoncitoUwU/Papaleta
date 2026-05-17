// Wave Background Animation
class WaveBackground {
  constructor(container) {
    this.container = container;
    this.svg = null;
    this.paths = [];
    this.lines = [];
    this.mouse = { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };
    this.noise = this.createNoise2D();
    this.raf = null;
    this.bounding = null;
    this.init();
  }

  init() {
    this.setSize();
    this.setLines();
    this.bindEvents();
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  createNoise2D() {
    // Simplex noise implementation
    const grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
    const p = [];
    for(let i=0; i<256; i++) p[i] = Math.floor(Math.random() * 256);
    const perm = [];
    for(let i=0; i<512; i++) perm[i] = p[i & 255];
    
    return (x, y) => {
      const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
      const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
      let n0, n1, n2;
      const s = (x + y) * F2;
      const i = Math.floor(x + s);
      const j = Math.floor(y + s);
      const t = (i + j) * G2;
      const X0 = i - t;
      const Y0 = j - t;
      const x0 = x - X0;
      const y0 = y - Y0;
      let i1, j1;
      if(x0 > y0) {i1=1; j1=0;} else {i1=0; j1=1;}
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1.0 + 2.0 * G2;
      const y2 = y0 - 1.0 + 2.0 * G2;
      const ii = i & 255;
      const jj = j & 255;
      const gi0 = perm[ii + perm[jj]] % 12;
      const gi1 = perm[ii + i1 + perm[jj + j1]] % 12;
      const gi2 = perm[ii + 1 + perm[jj + 1]] % 12;
      let t0 = 0.5 - x0*x0 - y0*y0;
      if(t0 < 0) n0 = 0.0; else { t0 *= t0; n0 = t0 * t0 * (grad3[gi0][0]*x0 + grad3[gi0][1]*y0); }
      let t1 = 0.5 - x1*x1 - y1*y1;
      if(t1 < 0) n1 = 0.0; else { t1 *= t1; n1 = t1 * t1 * (grad3[gi1][0]*x1 + grad3[gi1][1]*y1); }
      let t2 = 0.5 - x2*x2 - y2*y2;
      if(t2 < 0) n2 = 0.0; else { t2 *= t2; n2 = t2 * t2 * (grad3[gi2][0]*x2 + grad3[gi2][1]*y2); }
      return 70.0 * (n0 + n1 + n2);
    };
  }

  setSize() {
    this.bounding = this.container.getBoundingClientRect();
    const { width, height } = this.bounding;
    if (!this.svg) {
      this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.svg.classList.add('wave-svg');
      this.svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
      this.container.appendChild(this.svg);
    }
    this.svg.style.width = `${width}px`;
    this.svg.style.height = `${height}px`;
  }

  setLines() {
    if (!this.svg || !this.bounding) return;
    const { width, height } = this.bounding;
    this.lines = [];
    this.paths.forEach(p => p.remove());
    this.paths = [];

    const xGap = 8;
    const yGap = 8;
    const oWidth = width + 200;
    const oHeight = height + 30;
    const totalLines = Math.ceil(oWidth / xGap);
    const totalPoints = Math.ceil(oHeight / yGap);
    const xStart = (width - xGap * totalLines) / 2;
    const yStart = (height - yGap * totalPoints) / 2;

    for (let i = 0; i < totalLines; i++) {
      const points = [];
      for (let j = 0; j < totalPoints; j++) {
        points.push({
          x: xStart + xGap * i,
          y: yStart + yGap * j,
          wave: { x: 0, y: 0 },
          cursor: { x: 0, y: 0, vx: 0, vy: 0 }
        });
      }
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(99,102,241,0.3)');
      path.setAttribute('stroke-width', '1');
      this.svg.appendChild(path);
      this.paths.push(path);
      this.lines.push(points);
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.container.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
  }

  onResize() {
    this.setSize();
    this.setLines();
  }

  onMouseMove(e) {
    this.updateMousePosition(e.pageX, e.pageY);
  }

  onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.updateMousePosition(touch.clientX, touch.clientY);
  }

  updateMousePosition(x, y) {
    if (!this.bounding) return;
    this.mouse.x = x - this.bounding.left;
    this.mouse.y = y - this.bounding.top + window.scrollY;
    if (!this.mouse.set) {
      this.mouse.sx = this.mouse.x;
      this.mouse.sy = this.mouse.y;
      this.mouse.lx = this.mouse.x;
      this.mouse.ly = this.mouse.y;
      this.mouse.set = true;
    }
  }

  movePoints(time) {
    this.lines.forEach(points => {
      points.forEach(p => {
        const move = this.noise((p.x + time * 0.008) * 0.003, (p.y + time * 0.003) * 0.002) * 8;
        p.wave.x = Math.cos(move) * 12;
        p.wave.y = Math.sin(move) * 6;

        const dx = p.x - this.mouse.sx;
        const dy = p.y - this.mouse.sy;
        const d = Math.hypot(dx, dy);
        const l = Math.max(175, this.mouse.vs);
        if (d < l) {
          const s = 1 - d / l;
          const f = Math.cos(d * 0.001) * s;
          p.cursor.vx += Math.cos(this.mouse.a) * f * l * this.mouse.vs * 0.00035;
          p.cursor.vy += Math.sin(this.mouse.a) * f * l * this.mouse.vs * 0.00035;
        }
        p.cursor.vx += (0 - p.cursor.x) * 0.01;
        p.cursor.vy += (0 - p.cursor.y) * 0.01;
        p.cursor.vx *= 0.95;
        p.cursor.vy *= 0.95;
        p.cursor.x += p.cursor.vx;
        p.cursor.y += p.cursor.vy;
        p.cursor.x = Math.min(50, Math.max(-50, p.cursor.x));
        p.cursor.y = Math.min(50, Math.max(-50, p.cursor.y));
      });
    });
  }

  moved(point, withCursor = true) {
    return {
      x: point.x + point.wave.x + (withCursor ? point.cursor.x : 0),
      y: point.y + point.wave.y + (withCursor ? point.cursor.y : 0)
    };
  }

  drawLines() {
    this.lines.forEach((points, lIndex) => {
      if (points.length < 2 || !this.paths[lIndex]) return;
      const first = this.moved(points[0], false);
      let d = `M ${first.x} ${first.y}`;
      for (let i = 1; i < points.length; i++) {
        const current = this.moved(points[i]);
        d += `L ${current.x} ${current.y}`;
      }
      this.paths[lIndex].setAttribute('d', d);
    });
  }

  tick(time) {
    this.mouse.sx += (this.mouse.x - this.mouse.sx) * 0.1;
    this.mouse.sy += (this.mouse.y - this.mouse.sy) * 0.1;
    const dx = this.mouse.x - this.mouse.lx;
    const dy = this.mouse.y - this.mouse.ly;
    const d = Math.hypot(dx, dy);
    this.mouse.v = d;
    this.mouse.vs += (d - this.mouse.vs) * 0.1;
    this.mouse.vs = Math.min(100, this.mouse.vs);
    this.mouse.lx = this.mouse.x;
    this.mouse.ly = this.mouse.y;
    this.mouse.a = Math.atan2(dy, dx);
    this.movePoints(time);
    this.drawLines();
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', () => this.onResize());
    window.removeEventListener('mousemove', (e) => this.onMouseMove(e));
    this.container.removeEventListener('touchmove', (e) => this.onTouchMove(e));
    if (this.svg) this.svg.remove();
  }
}

// Initialize wave background on login screen
window.addEventListener('DOMContentLoaded', () => {
  const loginScreen = document.getElementById('login');
  if (loginScreen) {
    new WaveBackground(loginScreen);
  }
});
