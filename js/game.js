// 遊戲核心：渲染、物理、玩家、敵人、魔王、相機
import * as THREE from '../lib/three.module.js';
import { buildWorld, FIRE_MAT } from './world.js';
import { createHero, animateHero, createCoin, createFeather, createHeart, glowTex, mat } from './models.js';

const STEP = 1 / 120;
const R = 0.38, H = 1.5;
const GRAV = 40, JUMP = 15, RUN_JUMP = 16.2, DJUMP = 13.5;
const WALK = 7.5, RUN = 11.5;

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

export class Game {
  constructor(canvas, audio, input, hooks) {
    this.audio = audio;
    this.input = input;
    this.hooks = hooks; // { onHud, onClear, onGameOver, onEnding, onBanner, onLifeLost }
    const mobile = input.touchMode;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile || devicePixelRatio < 2, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1400);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x777777, 1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    const sm = mobile ? 1024 : 2048;
    this.sun.shadow.mapSize.set(sm, sm);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -26;
    sc.right = sc.top = 26;
    sc.near = 1;
    sc.far = 90;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target);

    // 天空背景圓柱（使用 H站 產生的背景圖）
    const skyH = 500 * 2.094 * (9 / 16);
    this.skyH = skyH;
    this.sky = new THREE.Mesh(
      new THREE.CylinderGeometry(500, 500, skyH, 64, 1, true),
      new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, depthWrite: false }),
    );
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    // 主角
    this.hero = createHero();
    this.scene.add(this.hero);
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex(), transparent: true, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2;
    this.scene.add(this.blob);

    // 粒子池
    this.parts = [];
    this.partGeo = new THREE.IcosahedronGeometry(1, 0);
    this.partMats = new Map();

    this.texLoader = new THREE.TextureLoader();
    this.bgCache = new Map();
    this.world = null;
    this.P = null;
    this.camYaw = 0;
    this.camYawT = 0;
    this.focus = new THREE.Vector3();
    this.shake = 0;
    this.acc = 0;
    this.paused = true;
    this.lives = 5;
    this.totalCoins = 0;
    this.score = 0;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1.5 ? 58 : 50;
    this.camera.updateProjectionMatrix();
  }

  loadBg(url) {
    if (this.bgCache.has(url)) return Promise.resolve(this.bgCache.get(url));
    return new Promise((res) => {
      this.texLoader.load(url, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = THREE.MirroredRepeatWrapping;
        t.repeat.x = 3;
        // 取樣地平線顏色當作霧色
        try {
          const c = document.createElement('canvas');
          c.width = 32; c.height = 32;
          const x = c.getContext('2d');
          x.drawImage(t.image, 0, 0, 32, 32);
          const d = x.getImageData(0, Math.floor(32 * 0.66), 32, 2).data;
          let r = 0, g = 0, b = 0;
          for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
          const n = d.length / 4;
          t.userData.fog = new THREE.Color(r / n / 255, g / n / 255, b / n / 255);
          const top = x.getImageData(0, 0, 32, 1).data;
          t.userData.top = new THREE.Color(top[64] / 255, top[65] / 255, top[66] / 255);
          const bot = x.getImageData(0, 30, 32, 2).data;
          let br = 0, bg = 0, bb = 0;
          for (let i = 0; i < bot.length; i += 4) { br += bot[i]; bg += bot[i + 1]; bb += bot[i + 2]; }
          t.userData.bottom = new THREE.Color(br / n / 255, bg / n / 255, bb / n / 255);
        } catch (e) { /* ignore */ }
        this.bgCache.set(url, t);
        res(t);
      }, undefined, () => res(null));
    });
  }

  // ================= 關卡載入 =================
  async loadLevel(def) {
    this.unloadLevel();
    const bg = await this.loadBg(def.bg);
    const W = (this.world = buildWorld(def));
    this.scene.add(W.root);
    const th = W.theme;
    if (bg) {
      this.sky.material.map = bg;
      this.sky.material.needsUpdate = true;
    }
    const fogC = bg?.userData.fog ? bg.userData.fog.clone().lerp(new THREE.Color(th.fog), 0.3) : new THREE.Color(th.fog);
    this.scene.fog = new THREE.Fog(fogC, def.theme === 'castle' ? 50 : 70, def.theme === 'castle' ? 200 : 260);
    this.renderer.setClearColor(bg?.userData.top || fogC);
    // 遠方地面顏色與背景圖底部一致
    if (bg?.userData.bottom && !th.lower.lava) {
      W.lower.material.color.copy(bg.userData.bottom);
      if (!th.lower.clouds) W.lower.position.y = -34;
    }
    this.hemi.color.set(th.hemi[0]);
    this.hemi.groundColor.set(th.hemi[1]);
    this.hemi.intensity = th.hemi[2];
    this.sun.color.set(th.sun[0]);
    this.sun.intensity = th.sun[1];

    this.P = {
      pos: W.spawn.clone(), vel: new THREE.Vector3(), grounded: false, ground: null, coyote: 0, jumpBuf: 0,
      jumpCut: true, canDouble: false, feather: false, hearts: 3, inv: 0, hurtT: 0, state: 'play', facing: Math.PI,
      spin: 0, squash: 0, deadT: 0, poleT: 0, winT: 0, glide: false, respawn: W.spawn.clone(),
    };
    this.level = {
      def, coins: 0, gems: [false, false, false], time: def.time, score: 0, timeBonus: 0, poleBonus: 0,
    };
    this.camYaw = this.camYawT = 0;
    this.focus.copy(this.P.pos).add(_v.set(0, 1.2, 0));
    this.hero.position.copy(this.P.pos);
    this.hero.rotation.y = Math.PI;
    this.hero.userData.feather.visible = false;
    this.hero.visible = true;
    this.hero.scale.setScalar(1);
    this.acc = 0;
    this.paused = false;
    this.bossMusic = false;
    this.audio.playMusic(def.music);
    this.updateCamera(1);
    this.emitHud();
  }

  unloadLevel() {
    if (!this.world) return;
    const W = this.world;
    this.scene.remove(W.root);
    W.root.traverse((o) => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose?.();
    });
    W.disposables.forEach((d) => d.dispose?.());
    for (const p of this.parts) this.scene.remove(p.m);
    this.parts = [];
    this.world = null;
  }

  emitHud() {
    const P = this.P, L = this.level;
    this.hooks.onHud({
      lives: this.lives, hearts: P.hearts, feather: P.feather, coins: this.totalCoins, levelCoins: L.coins,
      gems: L.gems, time: Math.max(0, Math.ceil(L.time)), score: this.score,
    });
  }

  // ================= 主迴圈 =================
  update(dt) {
    if (!this.world || this.paused) return;
    dt = Math.min(dt, 1 / 20);
    const inp = this.input;
    const cam = inp.take('cam');
    if (cam) this.camYawT += cam * (Math.PI / 4);
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 10) {
      this.step(STEP);
      this.acc -= STEP;
      n++;
    }
    if (n >= 10) this.acc = 0;
    this.animate(dt);
    this.updateCamera(dt);
  }

  step(dt) {
    const W = this.world, P = this.P, L = this.level;
    this.t = (this.t || 0) + dt;
    // ---- 平台運動 ----
    for (const mv of W.movers) {
      const c = mv.c;
      const ph = ((this.t / mv.period + mv.phase) % 1) * Math.PI * 2;
      if (mv.type === 'line') {
        const k = (1 - Math.cos(ph)) / 2;
        _v.copy(mv.base).addScaledVector(mv.to, k);
      } else {
        _v.set(mv.base.x + Math.cos(ph) * mv.radius, mv.base.y, mv.base.z + Math.sin(ph) * mv.radius);
      }
      this.placeBox(c, _v, mv.w, mv.h, mv.d);
    }
    for (const f of W.fallers) this.updateFaller(f, dt);
    for (const th of W.thwomps) this.updateThwomp(th, dt);

    if (P.state === 'play') {
      L.time -= dt;
      if (L.time <= 0) { L.time = 0; this.die('time'); }
      this.updatePlayer(dt);
    } else if (P.state === 'dead') {
      P.deadT -= dt;
      if (P.deadMode !== 'fall') {
        P.vel.y -= GRAV * 0.8 * dt;
        P.pos.addScaledVector(P.vel, dt);
      }
      if (P.deadT <= 0) this.afterDeath();
    } else if (P.state === 'pole') {
      this.updatePole(dt);
    } else if (P.state === 'win') {
      P.winT -= dt;
      P.vel.y -= GRAV * dt;
      P.pos.y += P.vel.y * dt;
      const gy = this.groundHeightAt(P.pos.x, P.pos.z, P.pos.y + 0.5);
      if (P.pos.y < gy) { P.pos.y = gy; P.vel.y = 0; }
      if (P.winT <= 0 && !P.winDone) {
        P.winDone = true;
        if (P.winMode === 'star') this.hooks.onEnding(this.resultData());
        else this.hooks.onClear(this.resultData());
      }
    }
    this.updateEnemies(dt);
    if (W.boss) this.updateBoss(dt);
    this.updateItems(dt);
  }

  placeBox(c, center, w, h, d) {
    const nx = center.x - w / 2, ny = center.y - h, nz = center.z - d / 2;
    c.delta.set(nx - c.min.x, ny - c.min.y, nz - c.min.z);
    c.min.set(nx, ny, nz);
    c.max.set(center.x + w / 2, center.y, center.z + d / 2);
    if (c.mesh) c.mesh.position.set(center.x, center.y, center.z);
  }

  updateFaller(f, dt) {
    const c = f.c;
    const P = this.P;
    c.delta.set(0, 0, 0);
    if (f.state === 'idle') {
      if (P.ground === c) { f.state = 'shake'; f.timer = 0.55; }
    } else if (f.state === 'shake') {
      f.timer -= dt;
      c.mesh.position.x = f.base.x + Math.sin(this.t * 70) * 0.08;
      if (f.timer <= 0) { f.state = 'fall'; f.vy = 0; c.mesh.position.x = f.base.x; }
    } else if (f.state === 'fall') {
      f.vy -= 30 * dt;
      const y = c.max.y + f.vy * dt;
      this.placeBox(c, _v.set(f.base.x, y, f.base.z), f.w, f.h, f.d);
      if (y < this.world.killY - 10) { f.state = 'gone'; f.timer = 3; c.dead = true; c.mesh.visible = false; }
    } else if (f.state === 'gone') {
      f.timer -= dt;
      if (f.timer <= 0) {
        f.state = 'idle';
        c.dead = false;
        c.mesh.visible = true;
        this.placeBox(c, f.base, f.w, f.h, f.d);
        c.delta.set(0, 0, 0);
        c.mesh.scale.setScalar(0.01);
        f.pop = 0;
      }
    }
    if (f.pop !== undefined && f.pop < 1) {
      f.pop = Math.min(1, f.pop + dt * 4);
      c.mesh.scale.setScalar(f.pop);
    }
  }

  updateThwomp(th, dt) {
    const P = this.P;
    const prevY = th.y;
    if (th.state === 'wait') {
      if (P.state === 'play' && Math.abs(P.pos.x - th.x) < 2.1 && Math.abs(P.pos.z - th.z) < 2.1 && P.pos.y < th.y) {
        th.state = 'shake'; th.timer = 0.3;
      }
    } else if (th.state === 'shake') {
      th.timer -= dt;
      if (th.timer <= 0) { th.state = 'fall'; th.vy = 0; }
    } else if (th.state === 'fall') {
      th.vy -= 70 * dt;
      th.y += th.vy * dt;
      if (th.y <= th.floor) {
        th.y = th.floor;
        th.state = 'down';
        th.timer = 1.3;
        const d = P.pos.distanceTo(_v.set(th.x, th.floor, th.z));
        if (d < 18) { this.audio.play('thud'); this.shake = Math.max(this.shake, 0.5 * (1 - d / 18)); }
        this.burst(_v.set(th.x, th.floor + 0.1, th.z), 0xcfc8b8, 14, 5, 0.6);
      }
    } else if (th.state === 'down') {
      th.timer -= dt;
      if (th.timer <= 0) th.state = 'rise';
    } else if (th.state === 'rise') {
      th.y = Math.min(th.hoverY, th.y + 3 * dt);
      if (th.y >= th.hoverY) th.state = 'wait';
    }
    this.world.setThwomp(th);
    th.c.delta.set(0, th.y - prevY, 0);
    if (th.state === 'shake') th.m.position.x = th.x + Math.sin(this.t * 80) * 0.06;
    // 被壓到
    if (th.state === 'fall' && P.state === 'play') {
      const c = th.c;
      if (P.pos.x + R > c.min.x && P.pos.x - R < c.max.x && P.pos.z + R > c.min.z && P.pos.z - R < c.max.z && P.pos.y < c.min.y + 0.2 && P.pos.y + H > c.min.y) {
        this.hurt(_v.set(th.x, P.pos.y, th.z), true);
      }
    }
  }

  // ================= 碰撞 =================
  collide(b, dt, rad, hgt, useStep) {
    const cols = this.world.colliders;
    const pos = b.pos, vel = b.vel;
    // 被平台帶著走
    if (b.ground && !b.ground.dead) pos.add(b.ground.delta);
    b.hitWall = false;
    pos.x += vel.x * dt;
    pos.z += vel.z * dt;
    for (const c of cols) {
      if (c.dead) continue;
      if (pos.y >= c.max.y - 0.02 || pos.y + hgt <= c.min.y + 0.02) continue;
      if (c.shape === 'cyl') {
        let dx = pos.x - c.cx, dz = pos.z - c.cz;
        let d = Math.hypot(dx, dz);
        const rr = c.r + rad;
        if (d >= rr) continue;
        if (useStep && b.grounded && c.max.y - pos.y <= 0.45) { pos.y = c.max.y; continue; }
        if (d < 1e-4) { dx = 0; dz = 1; d = 1; }
        pos.x = c.cx + (dx / d) * rr;
        pos.z = c.cz + (dz / d) * rr;
        b.hitWall = true;
      } else {
        const ox = Math.min(pos.x + rad - c.min.x, c.max.x - (pos.x - rad));
        const oz = Math.min(pos.z + rad - c.min.z, c.max.z - (pos.z - rad));
        if (ox <= 0 || oz <= 0) continue;
        if (useStep && b.grounded && c.max.y - pos.y <= 0.45) { pos.y = c.max.y; continue; }
        if (ox < oz) {
          const s = pos.x < (c.min.x + c.max.x) / 2 ? -1 : 1;
          pos.x += s * ox;
          if (vel.x * s < 0) vel.x = 0;
        } else {
          const s = pos.z < (c.min.z + c.max.z) / 2 ? -1 : 1;
          pos.z += s * oz;
          if (vel.z * s < 0) vel.z = 0;
        }
        b.hitWall = true;
      }
    }
    const prevY = pos.y;
    pos.y += vel.y * dt;
    b.grounded = false;
    b.ground = null;
    let bump = null, bumpD = 1e9;
    const hr = rad * 0.8;
    for (const c of cols) {
      if (c.dead) continue;
      let over;
      if (c.shape === 'cyl') over = Math.hypot(pos.x - c.cx, pos.z - c.cz) < c.r + rad * 0.5;
      else over = pos.x + hr > c.min.x && pos.x - hr < c.max.x && pos.z + hr > c.min.z && pos.z - hr < c.max.z;
      if (!over) continue;
      if (vel.y <= 0 && prevY >= c.max.y - 0.3 && pos.y < c.max.y) {
        pos.y = c.max.y;
        vel.y = 0;
        b.grounded = true;
        b.ground = c;
      } else if (vel.y > 0 && prevY + hgt <= c.min.y + 0.3 && pos.y + hgt > c.min.y) {
        const d = Math.hypot(pos.x - (c.min.x + c.max.x) / 2, pos.z - (c.min.z + c.max.z) / 2);
        if (d < bumpD) { bumpD = d; bump = c; }
      }
    }
    if (bump) {
      pos.y = bump.min.y - hgt;
      vel.y = -1;
    }
    return bump;
  }

  groundHeightAt(x, z, fromY) {
    let best = -Infinity;
    for (const c of this.world.colliders) {
      if (c.dead || c.max.y > fromY + 0.1 || c.max.y <= best) continue;
      if (c.shape === 'cyl') { if (Math.hypot(x - c.cx, z - c.cz) > c.r) continue; }
      else if (x < c.min.x || x > c.max.x || z < c.min.z || z > c.max.z) continue;
      best = c.max.y;
    }
    return best;
  }

  // ================= 玩家 =================
  updatePlayer(dt) {
    const P = this.P, inp = this.input, W = this.world;
    const yaw = this.camYaw;
    // 相機相對方向
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let mx = fx * inp.moveY + rx * inp.moveX;
    let mz = fz * inp.moveY + rz * inp.moveX;
    const mag = Math.min(1, Math.hypot(mx, mz));
    if (P.hurtT > 0) { P.hurtT -= dt; mx = mz = 0; }
    const maxS = inp.runHeld ? RUN : WALK;
    const tx = mx * maxS, tz = mz * maxS;
    const ice = P.grounded && P.ground && P.ground.ice;
    const accel = P.grounded ? (ice ? (mag > 0.1 ? 14 : 4) : 60) : 26;
    const dx = tx - P.vel.x, dz = tz - P.vel.z;
    const dl = Math.hypot(dx, dz);
    const stp = accel * dt;
    if (dl <= stp) { P.vel.x = tx; P.vel.z = tz; }
    else { P.vel.x += (dx / dl) * stp; P.vel.z += (dz / dl) * stp; }
    const hs = Math.hypot(P.vel.x, P.vel.z);
    if (mag > 0.1 && P.hurtT <= 0) P.facingT = Math.atan2(mx, mz);

    // 跳躍
    const jp = inp.take('jump');
    if (jp) P.jumpBuf = 0.13;
    else P.jumpBuf -= dt;
    P.coyote = P.grounded ? 0.1 : P.coyote - dt;
    if (P.jumpBuf > 0 && P.coyote > 0) {
      P.vel.y = hs > 9 ? RUN_JUMP : JUMP;
      P.grounded = false;
      P.ground = null;
      P.coyote = 0;
      P.jumpBuf = 0;
      P.jumpCut = false;
      P.canDouble = P.feather;
      this.audio.play('jump');
      this.burst(P.pos, 0xffffff, 5, 2, 0.35, 0.12);
    } else if (jp && !P.grounded && P.canDouble && P.coyote <= 0) {
      P.vel.y = DJUMP;
      P.canDouble = false;
      P.jumpCut = false;
      P.jumpBuf = 0;
      P.spin = 1;
      this.audio.play('jump2');
      this.burst(P.pos, 0x9ae8ff, 10, 3, 0.4, 0.15);
    }
    if (!inp.jumpHeld && P.vel.y > 0 && !P.jumpCut) { P.vel.y *= 0.5; P.jumpCut = true; }
    P.vel.y -= GRAV * dt;
    P.glide = false;
    if (P.feather && inp.jumpHeld && P.vel.y < -3 && !P.canDouble) { P.vel.y = -3; P.glide = true; }
    if (P.vel.y < -32) P.vel.y = -32;

    const wasGround = P.grounded;
    const fallV = P.vel.y;
    const bump = this.collide(P, dt, R, H, true);
    if (bump) this.bumpBlock(bump);
    if (P.grounded && !wasGround) {
      P.squash = Math.min(0.35, -fallV / 60);
      if (fallV < -12) this.burst(P.pos, 0xffffff, 6, 2.5, 0.35, 0.12);
      P.spin = 0;
    }

    if (P.inv > 0) P.inv -= dt;

    // 岩漿
    if (W.lavaY !== null && P.pos.y < W.lavaY + 0.15) {
      P.pos.y = W.lavaY + 0.15;
      P.vel.y = 21;
      P.jumpCut = true;
      P.grounded = false;
      this.audio.play('lava');
      this.burst(P.pos, 0xff6a00, 16, 5, 0.6, 0.2);
      this.hurt(null);
    }
    if (P.pos.y < W.killY) { this.die('fall'); return; }

    // 彈簧
    for (const s of W.springs) {
      if (P.vel.y <= 0 && Math.hypot(P.pos.x - s.pos.x, P.pos.z - s.pos.z) < 0.95 && P.pos.y <= s.top + 0.05 && P.pos.y >= s.top - 0.4) {
        P.pos.y = s.top;
        P.vel.y = s.power;
        P.grounded = false;
        P.ground = null;
        P.jumpCut = true;
        P.canDouble = P.feather;
        s.squash = 1;
        this.audio.play('spring');
      }
    }
    // 金幣
    const cy = P.pos.y + 0.75;
    for (const c of W.coins) {
      if (c.taken) continue;
      const d = Math.hypot(c.pos.x - P.pos.x, c.pos.y - cy, c.pos.z - P.pos.z);
      if (d < 1.05) {
        c.taken = true;
        c.m.visible = false;
        this.addCoin(1);
        this.burst(c.pos, 0xffe066, 6, 3, 0.3, 0.1);
      }
    }
    // 星星寶石
    for (const g of W.gems) {
      if (g.taken) continue;
      if (Math.hypot(g.pos.x - P.pos.x, g.pos.y - cy, g.pos.z - P.pos.z) < 1.3) {
        g.taken = true;
        g.m.visible = false;
        this.level.gems[g.idx] = true;
        this.score += 1000;
        this.audio.play('gem');
        this.burst(g.pos, 0x5affa8, 22, 6, 0.8, 0.18);
        this.hooks.onBanner?.(`星星寶石 ${this.level.gems.filter(Boolean).length} / 3`, 'small');
        this.emitHud();
      }
    }
    // 中繼點
    for (const cp of W.checkpoints) {
      if (!cp.on && Math.hypot(cp.pos.x - P.pos.x, cp.pos.z - P.pos.z) < 3 && Math.abs(cp.pos.y - P.pos.y) < 3) {
        cp.on = true;
        P.respawn.copy(cp.pos);
        cp.m.userData.flag.material.color.set(0xff7a1c);
        this.audio.play('checkpoint');
        this.burst(_v.copy(cp.pos).setY(cp.pos.y + 2.5).setX(cp.pos.x + 2.5), 0xffc43a, 16, 4, 0.7, 0.15);
        this.hooks.onBanner?.('中繼點！', 'small');
      }
    }
    // 終點旗桿
    const g = W.goal;
    if (g && !g.done && Math.abs(P.pos.x - g.pos.x) < 0.95 && Math.abs(P.pos.z - g.pos.z) < 0.95 && P.pos.y > g.top + 0.9 && P.pos.y < g.top + 11) {
      g.done = true;
      P.state = 'pole';
      P.poleT = 0;
      const hgt = Math.max(0, Math.min(1, (P.pos.y - g.top - 1) / 9));
      this.level.poleBonus = hgt > 0.95 ? 5000 : Math.round(hgt * 20) * 100 + 100;
      if (hgt > 0.95) { this.lives++; this.audio.play('1up'); }
      this.score += this.level.poleBonus;
      P.vel.set(0, 0, 0);
      P.pos.x = g.pos.x;
      P.pos.z = g.pos.z + 0.45;
      P.facing = Math.PI;
      this.audio.stopMusic();
      this.audio.play('pole');
    }
    // 大星星（最終關）
    const bs = W.bigStar;
    if (bs && bs.active && bs.ready && P.pos.distanceTo(_v.copy(bs.pos).setY(bs.pos.y - 1)) < 2.4) {
      bs.active = false;
      bs.m.visible = false;
      this.burst(bs.pos, 0xffe23a, 40, 8, 1.2, 0.25);
      this.audio.stopMusic();
      this.audio.play('bigclear');
      this.startWin('star');
    }
  }

  updatePole(dt) {
    const P = this.P, g = this.world.goal;
    P.poleT += dt;
    const flag = g.m.userData.flag;
    if (P.pos.y > g.top + 1) {
      P.pos.y = Math.max(g.top + 1, P.pos.y - 8 * dt);
      flag.position.y = Math.max(1.6, P.pos.y - g.top + 0.8);
    } else if (!P.poleDone) {
      P.poleDone = true;
      this.audio.play('clear');
      this.burst(_v.copy(g.pos).setY(g.top + 10), 0xffc43a, 30, 6, 1.0, 0.2);
      this.startWin('pole');
    }
  }

  startWin(mode) {
    const P = this.P, L = this.level;
    P.state = 'win';
    P.winMode = mode;
    P.winT = mode === 'star' ? 5 : 3.2;
    P.winDone = false;
    P.facing = 0 + this.camYaw;
    P.facingT = P.facing;
    L.timeBonus = Math.ceil(L.time) * 10;
    this.score += L.timeBonus;
    this.emitHud();
  }

  resultData() {
    const L = this.level;
    return { level: L.def, coins: L.coins, gems: L.gems.slice(), timeBonus: L.timeBonus, poleBonus: L.poleBonus, score: this.score, lives: this.lives };
  }

  addCoin(n) {
    this.level.coins += n;
    const before = Math.floor(this.totalCoins / 100);
    this.totalCoins += n;
    this.score += 100 * n;
    this.audio.play('coin');
    if (Math.floor(this.totalCoins / 100) > before) {
      this.lives++;
      this.audio.play('1up');
      this.hooks.onBanner?.('1UP！', 'small');
    }
    this.emitHud();
  }

  bumpBlock(c) {
    const W = this.world;
    // 頂到方塊上的敵人會被打飛
    for (const e of W.enemies) {
      if (e.alive && !e.dying && e.ground === c) this.killEnemy(e, true);
    }
    if (c.kind === 'qblock') {
      c.bounce = 0.18;
      if (c.used) { this.audio.play('bump'); return; }
      const top = _v.set((c.min.x + c.max.x) / 2, c.max.y, (c.min.z + c.max.z) / 2);
      if (c.item === 'coin' || c.item === 'coin10') {
        this.popCoin(top);
        this.addCoin(1);
        c.hits--;
      } else {
        const m = c.item === 'feather' ? createFeather() : createHeart();
        m.position.copy(top).setY(top.y - 0.6);
        W.root.add(m);
        const P = this.P;
        const dir = new THREE.Vector3(P.pos.x - top.x, 0, P.pos.z - top.z);
        if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
        dir.normalize();
        W.items.push({ type: c.item, m, pos: m.position, rise: 0, baseY: top.y + 0.7, taken: false, dir, vy: 7, landed: false });
        this.audio.play('item');
        c.hits = 0;
      }
      if (c.hits <= 0) {
        c.used = true;
        c.mesh.material = W.materials.qUsed;
      }
    } else if (c.kind === 'brick') {
      c.dead = true;
      c.mesh.visible = false;
      this.audio.play('break');
      const p = _v.set((c.min.x + c.max.x) / 2, (c.min.y + c.max.y) / 2, (c.min.z + c.max.z) / 2);
      this.burst(p, 0xd8743a, 12, 7, 0.9, 0.22, 25);
      this.score += 50;
    } else {
      this.audio.play('bump');
    }
  }

  popCoin(at) {
    const m = createCoin();
    m.position.copy(at);
    this.world.root.add(m);
    this.world.items.push({ type: 'popcoin', m, pos: m.position, vy: 12, life: 0.55 });
  }

  hurt(from) {
    const P = this.P;
    if (P.state !== 'play' || P.inv > 0) return;
    if (P.feather) {
      P.feather = false;
      P.canDouble = false;
      this.hero.userData.feather.visible = false;
      this.audio.play('lose-power');
    } else {
      P.hearts--;
      this.audio.play('hurt');
    }
    P.inv = 1.8;
    this.shake = Math.max(this.shake, 0.25);
    if (from) {
      _w.set(P.pos.x - from.x, 0, P.pos.z - from.z);
      if (_w.lengthSq() < 1e-4) _w.set(0, 0, 1);
      _w.normalize();
      P.vel.x = _w.x * 8;
      P.vel.z = _w.z * 8;
      P.vel.y = 9;
      P.jumpCut = true;
      P.hurtT = 0.35;
    }
    this.emitHud();
    if (P.hearts <= 0) this.die('hurt');
  }

  die(mode) {
    const P = this.P;
    if (P.state === 'dead') return;
    P.state = 'dead';
    P.deadMode = mode;
    P.deadT = mode === 'fall' ? 2.2 : 2.8;
    P.vel.set(0, mode === 'fall' ? 0 : 14, 0);
    P.hearts = 0;
    this.audio.stopMusic();
    this.audio.play('die');
    this.emitHud();
  }

  afterDeath() {
    const P = this.P;
    this.lives--;
    if (this.lives <= 0) {
      this.paused = true;
      this.hooks.onGameOver();
      return;
    }
    this.hooks.onLifeLost?.(this.lives);
    P.state = 'play';
    P.pos.copy(P.respawn).add(_v.set(0, 0.2, 0));
    P.vel.set(0, 0, 0);
    P.hearts = 3;
    P.feather = false;
    P.canDouble = false;
    P.inv = 2;
    P.ground = null;
    P.jumpBuf = 0;
    this.input.take('jump');
    this.hero.userData.feather.visible = false;
    if (this.level.time < 100) this.level.time = 100;
    this.focus.copy(P.pos);
    // 魔王戰重來時重置魔王位置
    const B = this.world.boss;
    if (B && B.hp > 0) {
      B.state = 'sleep';
      B.pos.set(this.world.arena.x, B.top, this.world.arena.z - 8);
      B.fireballs.forEach((f) => this.world.root.remove(f.m));
      B.fireballs = [];
      if (B.wave) { this.world.root.remove(B.wave.m); B.wave = null; }
      this.bossMusic = false;
    }
    this.audio.playMusic(this.level.def.music);
    this.emitHud();
  }

  // ================= 敵人 =================
  updateEnemies(dt) {
    const W = this.world, P = this.P;
    for (const e of W.enemies) {
      if (!e.alive) continue;
      e.t += dt;
      if (e.dying) {
        e.dying += dt;
        if (e.flip) {
          e.vel.y -= GRAV * dt;
          e.pos.addScaledVector(e.vel, dt);
          e.m.rotation.z += dt * 10;
          if (e.dying > 1.5) { e.alive = false; e.m.visible = false; }
        } else {
          e.m.scale.set(1.3, Math.max(0.15, 1 - e.dying * 6), 1.3);
          if (e.dying > 0.5) { e.alive = false; e.m.visible = false; }
        }
        continue;
      }
      if (e.type === 'bee') {
        const a = e.t * e.speed;
        const px = e.pos.x;
        const off = Math.sin(a) * e.amp;
        if (e.axis === 'x') e.pos.x = e.home.x + off;
        else e.pos.z = e.home.z + off;
        e.pos.y = e.home.y + Math.sin(e.t * 3) * 0.4;
        const vx = e.pos.x - px;
        e.m.rotation.y = e.axis === 'x' ? (vx >= 0 ? Math.PI / 2 : -Math.PI / 2) : 0;
        e.m.children.forEach((c) => { if (c.name === 'wing') c.rotation.z = c.userData.side * (0.3 + Math.sin(e.t * 40) * 0.5); });
      } else {
        // 地面敵人
        let dx = e.dir[0], dz = e.dir[1];
        let spd = e.speed;
        const toP = _v.set(P.pos.x - e.pos.x, 0, P.pos.z - e.pos.z);
        const dist = toP.length();
        let chasing = false;
        if (e.chase && P.state === 'play' && dist < 7 && Math.abs(P.pos.y - e.pos.y) < 2) {
          chasing = true;
          dx = toP.x / dist;
          dz = toP.z / dist;
          spd = 3.3;
        }
        // 邊緣偵測
        const ax = e.pos.x + dx * 0.8, az = e.pos.z + dz * 0.8;
        const gh = this.groundHeightAt(ax, az, e.pos.y + 0.3);
        const edge = e.grounded && gh < e.pos.y - 0.6;
        if (!chasing) {
          const off = (e.pos.x - e.home.x) * dx + (e.pos.z - e.home.z) * dz;
          if (edge || e.hitWall || off > e.range) { e.dir = [-e.dir[0], -e.dir[1]]; dx = -dx; dz = -dz; }
        } else if (edge) spd = 0;
        e.vel.x = dx * spd;
        e.vel.z = dz * spd;
        e.vel.y -= GRAV * dt;
        this.collide(e, dt, e.r, e.h, false);
        if (e.pos.y < W.killY || (W.lavaY !== null && e.pos.y < W.lavaY)) { e.alive = false; e.m.visible = false; continue; }
        const targetRot = Math.atan2(dx, dz);
        e.m.rotation.y += angleDiff(e.m.rotation.y, targetRot) * Math.min(1, dt * 10);
        if (e.type === 'walker') {
          const w = Math.sin(e.t * 12) * 0.12;
          e.m.children.forEach((c) => { if (c.name === 'footL') c.position.z = 0.05 + w; if (c.name === 'footR') c.position.z = 0.05 - w; });
          e.m.scale.y = 1 + Math.sin(e.t * 12) * 0.04;
        } else if (e.m.userData.inner) {
          e.m.userData.inner.rotation.x += spd * dt * 1.8;
        }
      }
      // 與玩家互動
      if (P.state !== 'play') continue;
      const bottom = e.type === 'bee' ? e.pos.y - 0.45 : e.pos.y;
      const hd = Math.hypot(P.pos.x - e.pos.x, P.pos.z - e.pos.z);
      if (hd < e.r + R && P.pos.y < bottom + e.h && P.pos.y + H > bottom) {
        if (e.stompable && P.vel.y < 0.5 && P.pos.y > bottom + e.h * 0.4) {
          this.killEnemy(e, false);
          P.vel.y = this.input.jumpHeld ? 16 : 11;
          P.jumpCut = true;
          P.canDouble = P.feather;
          P.pos.y = Math.max(P.pos.y, bottom + e.h * 0.8);
        } else this.hurt(e.pos);
      }
    }
  }

  killEnemy(e, flip) {
    e.dying = 0.001;
    this.score += 200;
    if (flip) {
      e.flip = true;
      e.vel.set(0, 10, 0);
      this.audio.play('stomp');
    } else {
      this.audio.play('stomp');
      this.burst(e.pos, 0xffffff, 10, 3, 0.45, 0.16);
    }
    this.emitHud();
  }

  // ================= 魔王 =================
  updateBoss(dt) {
    const W = this.world, B = W.boss, P = this.P, A = W.arena;
    if (B.hp <= 0 && B.state === 'gone') return;
    const inner = B.m.userData.inner;
    B.timer -= dt;
    if (B.inv > 0) B.inv -= dt;
    const toP = _v.set(P.pos.x - B.pos.x, 0, P.pos.z - B.pos.z);
    const dist = toP.length();
    const faceT = Math.atan2(toP.x, toP.z);
    const speedUp = 3 - B.hp;
    switch (B.state) {
      case 'sleep': {
        B.m.rotation.y += angleDiff(B.m.rotation.y, 0) * dt * 3;
        inner.position.y = Math.sin(this.t * 2) * 0.05;
        const inArena = Math.hypot(P.pos.x - A.x, P.pos.z - A.z) < A.r - 1.5;
        if (P.state === 'play' && inArena) {
          B.state = 'intro';
          B.timer = 2.2;
          this.audio.play('roar');
          this.audio.playMusic('boss');
          this.bossMusic = true;
          this.shake = 0.6;
          this.hooks.onBanner?.('魔王：咕嚕大王！', 'boss');
        }
        break;
      }
      case 'intro':
        B.m.rotation.y += angleDiff(B.m.rotation.y, faceT) * dt * 5;
        inner.position.y = Math.abs(Math.sin(this.t * 10)) * 0.3;
        if (B.timer <= 0) { B.state = 'walk'; B.timer = 2.6; B.next = 'fire'; }
        break;
      case 'walk': {
        B.m.rotation.y += angleDiff(B.m.rotation.y, faceT) * dt * 4;
        const sp = 3 + speedUp * 1.3;
        if (dist > 2.5 && P.state === 'play') {
          B.pos.x += (toP.x / dist) * sp * dt;
          B.pos.z += (toP.z / dist) * sp * dt;
        }
        inner.position.y = Math.abs(Math.sin(this.t * 8)) * 0.25;
        inner.rotation.z = Math.sin(this.t * 8) * 0.08;
        if (B.timer <= 0) {
          B.state = B.next;
          B.next = B.next === 'fire' ? 'jump' : 'fire';
          B.timer = B.state === 'fire' ? 1.4 : 0;
          B.shots = 0;
          if (B.state === 'jump') {
            B.vel.set(0, 16, 0);
            const t = 1.1;
            const tx = Math.max(-8, Math.min(8, toP.x / t)), tz = Math.max(-8, Math.min(8, toP.z / t));
            B.vel.x = tx;
            B.vel.z = tz;
            this.audio.play('jump');
          }
        }
        break;
      }
      case 'fire':
        B.m.rotation.y += angleDiff(B.m.rotation.y, faceT) * dt * 6;
        inner.rotation.z = 0;
        inner.position.y = 0;
        if (B.shots < 1 && B.timer < 1.0) {
          B.shots = 1;
          const n = B.hp === 1 ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const a = B.m.rotation.y + (i - (n - 1) / 2) * 0.32;
            const m = new THREE.Mesh(this.partGeo, FIRE_MAT);
            m.scale.setScalar(0.55);
            m.position.set(B.pos.x + Math.sin(a) * 1.8, B.top + 1.0, B.pos.z + Math.cos(a) * 1.8);
            W.root.add(m);
            B.fireballs.push({ m, pos: m.position, vel: new THREE.Vector3(Math.sin(a) * 9, 0, Math.cos(a) * 9), life: 3.5 });
          }
          this.audio.play('fire');
        }
        if (B.timer <= 0) { B.state = 'walk'; B.timer = 2.4 - speedUp * 0.4; }
        break;
      case 'jump':
        B.vel.y -= 32 * dt;
        B.pos.addScaledVector(B.vel, dt);
        inner.position.y = 0;
        if (B.pos.y <= B.top && B.vel.y < 0) {
          B.pos.y = B.top;
          B.vel.set(0, 0, 0);
          this.audio.play('thud');
          this.shake = 0.7;
          this.burst(B.pos, 0xbfb0a0, 20, 7, 0.8, 0.25);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.18, 8, 48), mat(0xffa030, { emissive: 0xff5a00, emissiveIntensity: 1 }));
          ring.rotation.x = Math.PI / 2;
          ring.position.set(B.pos.x, B.top + 0.25, B.pos.z);
          W.root.add(ring);
          if (B.wave) W.root.remove(B.wave.m);
          B.wave = { m: ring, r: 1, x: B.pos.x, z: B.pos.z };
          B.state = 'walk';
          B.timer = 2.2 - speedUp * 0.3;
        }
        break;
      case 'hurt':
        inner.rotation.z = Math.sin(this.t * 30) * 0.15;
        inner.position.y = 0;
        B.m.visible = Math.floor(this.t * 20) % 2 === 0;
        if (B.timer <= 0) {
          B.m.visible = true;
          if (B.hp <= 0) {
            B.state = 'defeat';
            B.timer = 2.5;
            this.audio.play('roar');
            this.audio.stopMusic();
          } else {
            B.state = 'walk';
            B.timer = 1.5;
          }
        }
        break;
      case 'defeat': {
        B.m.rotation.y += dt * 12;
        const k = Math.max(0.01, B.timer / 2.5);
        B.m.scale.setScalar(k);
        B.pos.y = B.top + (1 - k) * 3;
        if (Math.random() < 0.3) this.burst(_v.copy(B.pos).setY(B.pos.y + 2), [0xffe23a, 0xff5a5a, 0x9a7bff][Math.floor(Math.random() * 3)], 3, 6, 0.6, 0.2);
        if (B.timer <= 0) {
          B.state = 'gone';
          B.m.visible = false;
          this.score += 10000;
          this.emitHud();
          const bs = W.bigStar;
          if (bs) {
            bs.m.visible = true;
            bs.active = true;
            bs.ready = false;
            bs.appear = 0;
            this.audio.play('powerup');
            this.hooks.onBanner?.('彩虹大星星出現了！', 'small');
          }
        }
        break;
      }
      default: break;
    }
    // 限制在競技場內
    if (B.state !== 'defeat' && B.state !== 'gone') {
      const ax = B.pos.x - A.x, az = B.pos.z - A.z;
      const ad = Math.hypot(ax, az);
      const maxR = A.r - 2.2;
      if (ad > maxR) { B.pos.x = A.x + (ax / ad) * maxR; B.pos.z = A.z + (az / ad) * maxR; }
    }
    // 衝擊波
    if (B.wave) {
      const wv = B.wave;
      wv.r += dt * 11;
      wv.m.scale.set(wv.r, wv.r, 1);
      if (P.state === 'play' && P.pos.y < B.top + 0.7 && Math.abs(Math.hypot(P.pos.x - wv.x, P.pos.z - wv.z) - wv.r) < 0.7) this.hurt(_v.set(wv.x, 0, wv.z));
      if (wv.r > A.r + 1) { W.root.remove(wv.m); B.wave = null; }
    }
    // 火球
    for (let i = B.fireballs.length - 1; i >= 0; i--) {
      const f = B.fireballs[i];
      f.life -= dt;
      f.pos.addScaledVector(f.vel, dt);
      f.m.rotation.y += dt * 8;
      if (P.state === 'play' && f.pos.distanceTo(_w.copy(P.pos).setY(P.pos.y + 0.75)) < 1.0) this.hurt(f.pos);
      if (f.life <= 0) { W.root.remove(f.m); B.fireballs.splice(i, 1); }
    }
    // 與玩家碰撞
    if (P.state === 'play' && ['intro', 'walk', 'fire', 'jump', 'hurt'].includes(B.state)) {
      const hd = Math.hypot(P.pos.x - B.pos.x, P.pos.z - B.pos.z);
      const headZone = P.pos.y > B.pos.y + 2.2 && P.pos.y < B.pos.y + 4.3;
      if (hd < 1.9 + R && headZone && P.vel.y <= 0 && B.inv <= 0 && B.state !== 'hurt') {
        {
          B.hp--;
          B.inv = 1.6;
          B.state = 'hurt';
          B.timer = 1.4;
          B.vel.set(0, 0, 0);
          B.pos.y = B.top;
          P.vel.y = 19;
          P.jumpCut = true;
          const away = _w.set(P.pos.x - B.pos.x, 0, P.pos.z - B.pos.z).normalize();
          P.vel.x = away.x * 9;
          P.vel.z = away.z * 9;
          P.hurtT = 0.3;
          this.audio.play('boss-hit');
          this.shake = 0.5;
          this.burst(_v.copy(B.pos).setY(B.pos.y + 3.5), 0xffe23a, 20, 6, 0.6, 0.2);
          this.hooks.onBossHp?.(B.hp);
        }
      } else if (hd < 1.5 + R && P.pos.y < B.pos.y + 2.2 && P.pos.y + H > B.pos.y && B.state !== 'hurt') {
        this.hurt(B.pos);
      }
    }
  }

  // ================= 道具 / 動畫 =================
  updateItems(dt) {
    const W = this.world, P = this.P;
    for (const c of W.coins) if (!c.taken) c.m.rotation.y += dt * 3;
    for (const g of W.gems) if (!g.taken) {
      g.m.rotation.y += dt * 1.8;
      g.m.position.y += Math.sin(this.t * 2.5 + g.idx) * dt * 0.4;
    }
    for (const s of W.springs) {
      s.squash = Math.max(0, s.squash - dt * 4);
      const k = 1 - Math.sin(s.squash * Math.PI) * 0.4;
      s.m.userData.coil.scale.y = k;
      s.m.userData.top.position.y = 0.3 + 0.38 * k;
    }
    for (const fb of W.firebars) {
      fb.angle += fb.speed * dt;
      fb.arm.rotation.y = fb.angle;
      if (P.state !== 'play') continue;
      for (const b of fb.balls) {
        const d = b.position.x;
        const bx = fb.center.x + Math.cos(fb.angle) * d;
        const bz = fb.center.z - Math.sin(fb.angle) * d;
        const by = fb.center.y;
        if (Math.hypot(bx - P.pos.x, bz - P.pos.z) < 0.7 && by > P.pos.y - 0.3 && by < P.pos.y + H + 0.2) {
          this.hurt(_v.set(bx, 0, bz));
          break;
        }
      }
    }
    for (const c of W.colliders) {
      if (c.bounce > 0) {
        c.bounce = Math.max(0, c.bounce - dt);
        c.mesh.position.y = c.baseY + Math.sin((c.bounce / 0.18) * Math.PI) * 0.35;
      }
    }
    for (let i = W.items.length - 1; i >= 0; i--) {
      const it = W.items[i];
      if (it.type === 'popcoin') {
        it.vy -= 40 * dt;
        it.pos.y += it.vy * dt;
        it.m.rotation.y += dt * 20;
        it.life -= dt;
        if (it.life <= 0) {
          this.burst(it.pos, 0xffe066, 5, 2.5, 0.3, 0.1);
          W.root.remove(it.m);
          W.items.splice(i, 1);
        }
        continue;
      }
      if (it.rise < 1) {
        it.rise = Math.min(1, it.rise + dt * 2.5);
        it.pos.y = it.baseY - 1.3 + it.rise * 1.3;
      } else if (!it.landed) {
        // 從方塊跳出來，落到地面
        it.vy -= 25 * dt;
        it.pos.x += it.dir.x * 3 * dt;
        it.pos.z += it.dir.z * 3 * dt;
        it.pos.y += it.vy * dt;
        const gy = this.groundHeightAt(it.pos.x, it.pos.z, it.pos.y - 0.6);
        if (it.vy < 0 && it.pos.y - 0.7 <= gy) { it.landed = true; it.baseY = gy + 0.7; }
        if (it.pos.y < W.killY) { W.root.remove(it.m); W.items.splice(i, 1); continue; }
      } else it.pos.y = it.baseY + Math.sin(this.t * 3) * 0.15;
      it.m.rotation.y += dt * 2;
      if (P.state === 'play' && it.rise >= 1 && P.pos.distanceTo(_v.copy(it.pos).setY(it.pos.y - 0.7)) < 1.4) {
        W.root.remove(it.m);
        W.items.splice(i, 1);
        if (it.type === 'feather') {
          P.feather = true;
          this.hero.userData.feather.visible = true;
          this.audio.play('powerup');
          this.hooks.onBanner?.('彩虹羽毛：二段跳＋按住跳躍滑翔！', 'small');
          this.burst(P.pos, 0x9ae8ff, 20, 5, 0.7, 0.18);
        } else {
          P.hearts = Math.min(3, P.hearts + 1);
          this.audio.play('heart');
          this.burst(P.pos, 0xff5a7a, 14, 4, 0.6, 0.15);
        }
        this.score += 1000;
        this.emitHud();
      }
    }
    // 大星星
    const bs = W.bigStar;
    if (bs && bs.m.visible) {
      if (bs.appear < 1) {
        bs.appear = Math.min(1, bs.appear + dt * 0.7);
        bs.m.scale.setScalar(bs.appear);
        if (bs.appear >= 1) bs.ready = true;
      }
      bs.m.rotation.y += dt * 1.5;
      bs.m.userData.halo.rotation.x = this.t * 0.8;
      bs.m.position.y = 2.5 + Math.sin(this.t * 2) * 0.3;
    }
    if (W.lavaTex) W.lavaTex.offset.set(this.t * 0.01, this.t * 0.006);
  }

  animate(dt) {
    const P = this.P, hero = this.hero;
    // 粒子
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      p.v.y -= p.g * dt;
      p.m.position.addScaledVector(p.v, dt);
      const k = Math.max(0, p.life / p.max);
      p.m.scale.setScalar(p.s * (0.3 + 0.7 * k));
      if (p.life <= 0) { this.scene.remove(p.m); this.parts.splice(i, 1); }
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.5);
    if (!P) return;
    hero.position.copy(P.pos);
    if (P.facingT !== undefined) P.facing += angleDiff(P.facing, P.facingT) * Math.min(1, dt * 14);
    hero.rotation.y = P.facing;
    let st;
    const hs = Math.hypot(P.vel.x, P.vel.z);
    if (P.state === 'dead') { st = 'hurt'; hero.rotation.y = this.camYaw; }
    else if (P.state === 'pole') st = 'pole';
    else if (P.state === 'win') { st = 'win'; hero.rotation.y = this.camYaw; }
    else if (P.hurtT > 0) st = 'hurt';
    else if (!P.grounded) st = P.glide ? 'glide' : P.vel.y > 0 ? 'jump' : 'fall';
    else st = hs > 0.6 ? 'run' : 'idle';
    animateHero(hero, st, dt, hs);
    // 二段跳旋轉
    if (P.spin > 0) {
      P.spin = Math.max(0, P.spin - dt * 2.5);
      hero.userData.body.rotation.y = (1 - P.spin) * Math.PI * 2;
    } else hero.userData.body.rotation.y = 0;
    // 落地擠壓
    P.squash = Math.max(0, P.squash - dt * 2);
    const sq = P.squash;
    hero.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
    // 無敵閃爍
    hero.visible = !(P.inv > 0 && P.state === 'play' && Math.floor(P.inv * 15) % 2 === 0);
    // 腳下陰影
    const gy = this.groundHeightAt(P.pos.x, P.pos.z, P.pos.y + 0.05);
    if (gy > -1e8 && P.state !== 'dead') {
      this.blob.visible = true;
      const hgt = P.pos.y - gy;
      this.blob.position.set(P.pos.x, gy + 0.03, P.pos.z);
      const s = Math.max(0.4, 1.3 - hgt * 0.06);
      this.blob.scale.set(s, s, s);
      this.blob.material.opacity = Math.max(0.25, 1 - hgt * 0.05);
    } else this.blob.visible = false;
  }

  updateCamera(dt) {
    const P = this.P;
    if (!P) return;
    this.camYaw += angleDiff(this.camYaw, this.camYawT) * Math.min(1, dt * 6);
    const W = this.world;
    const inArena = W.arena && Math.hypot(P.pos.x - W.arena.x, P.pos.z - W.arena.z) < W.arena.r + 4;
    this.camDist = lerp(this.camDist || 12, inArena ? 18 : 12.5, Math.min(1, dt * 2));
    this.camHgt = lerp(this.camHgt || 4.6, inArena ? 8.5 : 4.6, Math.min(1, dt * 2));
    if (P.state !== 'dead') {
      const k = 1 - Math.exp(-dt * 8);
      let tx = P.pos.x, tz = P.pos.z;
      if (inArena) { tx = lerp(tx, W.arena.x, 0.45); tz = lerp(tz, W.arena.z, 0.45); }
      this.focus.x += (tx - this.focus.x) * k;
      this.focus.z += (tz - this.focus.z) * k;
      const ty = P.pos.y + 1.2;
      const fy = this.focus.y;
      if (P.grounded || P.state !== 'play' || ty < fy - 1.2 || ty > fy + 3.5) {
        this.focus.y += (ty - fy) * (1 - Math.exp(-dt * (P.grounded ? 5 : 3)));
      }
    }
    const yaw = this.camYaw;
    const f = this.focus;
    const cam = this.camera;
    cam.position.set(f.x + Math.sin(yaw) * this.camDist, f.y + this.camHgt, f.z + Math.cos(yaw) * this.camDist);
    if (this.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * this.shake;
      cam.position.y += (Math.random() - 0.5) * this.shake;
    }
    const ahead = inArena ? 3 : 6;
    cam.lookAt(f.x - Math.sin(yaw) * ahead, f.y + (inArena ? 0 : 1.0), f.z - Math.cos(yaw) * ahead);
    this.sky.position.set(cam.position.x, cam.position.y + 0.2 * this.skyH - 30, cam.position.z);
    this.sun.position.set(f.x + 12, f.y + 30, f.z + 14);
    this.sun.target.position.set(f.x, f.y, f.z - 4);
  }

  burst(pos, color, n, speed, life, size = 0.15, g = 12) {
    if (this.parts.length > 220) return;
    let m = this.partMats.get(color);
    if (!m) { m = new THREE.MeshBasicMaterial({ color }); this.partMats.set(color, m); }
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.partGeo, m);
      mesh.position.copy(pos);
      mesh.position.y += 0.3;
      const v = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.2 + 0.2, (Math.random() - 0.5) * 2).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.5));
      this.scene.add(mesh);
      const s = size * (0.6 + Math.random() * 0.8);
      mesh.scale.setScalar(s);
      this.parts.push({ m: mesh, v, life: life * (0.6 + Math.random() * 0.4), max: life, g, s });
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function lerp(a, b, t) { return a + (b - a) * t; }
