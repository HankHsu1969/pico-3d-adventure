// 鍵盤 + 手把 + 觸控（虛擬搖桿與按鈕）
export class Input {
  constructor() {
    this.keys = new Set();
    this.moveX = 0;
    this.moveY = 0;
    this.jumpHeld = false;
    this.runHeld = false;
    this.q = { jump: 0, cam: 0, pause: 0, confirm: 0, back: 0, nav: 0 };
    this.navX = 0;
    this.navY = 0;
    this.touch = { stickId: null, sx: 0, sy: 0, x: 0, y: 0, jump: new Set(), run: new Set() };
    this.touchMode = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 1;
    this.padPrev = {};

    addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (['Space', 'KeyK', 'KeyZ'].includes(e.code)) this.q.jump++;
      if (e.code === 'KeyQ') this.q.cam--;
      if (e.code === 'KeyE') this.q.cam++;
      if (['Escape', 'KeyP'].includes(e.code)) this.q.pause++;
      if (['Enter', 'Space', 'KeyZ', 'KeyK'].includes(e.code)) this.q.confirm++;
      if (['Escape', 'Backspace'].includes(e.code)) this.q.back++;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) { this.navX = -1; this.q.nav++; }
      if (['ArrowRight', 'KeyD'].includes(e.code)) { this.navX = 1; this.q.nav++; }
      if (['ArrowUp', 'KeyW'].includes(e.code)) { this.navY = -1; this.q.nav++; }
      if (['ArrowDown', 'KeyS'].includes(e.code)) { this.navY = 1; this.q.nav++; }
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  // 綁定觸控 UI
  bindTouch(els) {
    const { zone, base, knob, btnJump, btnRun, btnCamL, btnCamR } = els;
    this.els = els;
    const R = 60;
    zone.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      this.setTouchMode(true);
      if (this.touch.stickId !== null) return;
      this.touch.stickId = e.pointerId;
      this.touch.sx = this.touch.x = e.clientX;
      this.touch.sy = this.touch.y = e.clientY;
      base.style.left = e.clientX + 'px';
      base.style.top = e.clientY + 'px';
      base.classList.add('active');
      knob.style.transform = 'translate(-50%,-50%)';
      zone.setPointerCapture(e.pointerId);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.touch.stickId) return;
      let dx = e.clientX - this.touch.sx;
      let dy = e.clientY - this.touch.sy;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        // 搖桿跟著手指拖動
        this.touch.sx += (dx / d) * (d - R);
        this.touch.sy += (dy / d) * (d - R);
        base.style.left = this.touch.sx + 'px';
        base.style.top = this.touch.sy + 'px';
        dx = (dx / d) * R;
        dy = (dy / d) * R;
      }
      this.touch.x = this.touch.sx + dx;
      this.touch.y = this.touch.sy + dy;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
    const end = (e) => {
      if (e.pointerId !== this.touch.stickId) return;
      this.touch.stickId = null;
      base.classList.remove('active');
      knob.style.transform = 'translate(-50%,-50%)';
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    const holdBtn = (el, set, onDown) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        set.add(e.pointerId);
        el.classList.add('down');
        if (onDown) onDown();
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      });
      const up = (e) => {
        set.delete(e.pointerId);
        if (!set.size) el.classList.remove('down');
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
    };
    holdBtn(btnJump, this.touch.jump, () => this.q.jump++);
    holdBtn(btnRun, this.touch.run);
    const tap = (el, fn) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
    tap(btnCamL, () => this.q.cam--);
    tap(btnCamR, () => this.q.cam++);
  }

  setTouchMode(on) {
    if (this.touchMode === on) return;
    this.touchMode = on;
    document.body.classList.toggle('touch', on);
  }

  take(name) {
    const v = this.q[name];
    this.q[name] = 0;
    return v;
  }
  clearQueues() {
    for (const k in this.q) this.q[k] = 0;
  }

  update() {
    const k = this.keys;
    let x = 0, y = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    let jump = k.has('Space') || k.has('KeyK') || k.has('KeyZ');
    let run = k.has('ShiftLeft') || k.has('ShiftRight') || k.has('KeyJ') || k.has('KeyX');

    // 觸控
    if (this.touch.stickId !== null) {
      const dx = (this.touch.x - this.touch.sx) / 60;
      const dy = (this.touch.y - this.touch.sy) / 60;
      x += dx;
      y -= dy;
      if (Math.hypot(dx, dy) > 0.92) run = true; // 推到底自動奔跑
    }
    if (this.touch.jump.size) jump = true;
    if (this.touch.run.size) run = true;

    // 手把
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.hypot(ax, ay) > 0.2) { x += ax; y -= ay; }
      const b = (i) => p.buttons[i] && p.buttons[i].pressed;
      if (b(14)) x -= 1;
      if (b(15)) x += 1;
      if (b(12)) y += 1;
      if (b(13)) y -= 1;
      const edge = (i, fn) => { const now = b(i); if (now && !this.padPrev[i]) fn(); this.padPrev[i] = now; };
      if (b(0)) jump = true;
      if (b(2) || b(1)) run = true;
      edge(0, () => { this.q.jump++; this.q.confirm++; });
      edge(1, () => this.q.back++);
      edge(4, () => this.q.cam--);
      edge(5, () => this.q.cam++);
      edge(9, () => this.q.pause++);
      edge(14, () => { this.navX = -1; this.q.nav++; });
      edge(15, () => { this.navX = 1; this.q.nav++; });
      edge(12, () => { this.navY = -1; this.q.nav++; });
      edge(13, () => { this.navY = 1; this.q.nav++; });
      break;
    }

    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this.moveX = x;
    this.moveY = y;
    this.jumpHeld = jump;
    this.runHeld = run;
  }
}
