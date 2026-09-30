// 關卡建構器：平台、碰撞體、道具、敵人、裝飾、主題
import * as THREE from '../lib/three.module.js';
import {
  mat, checkerTex, brickTex, stripeTex, qblockTex, lavaTex,
  createCoin, createGem, createFeather, createHeart, createSpring, createFlag, createGoal,
  createWalker, createSpiky, createBee, createThwomp, createBoss, createBigStar,
} from './models.js';

export const THEMES = {
  meadow: {
    top: ['#74d63e', '#66c634'], side: ['#c98a4b', '#b67a3d'], capSide: 0x4fae2b, sideBrick: false,
    lower: { color: 0x3ab0ff, y: -18, water: true }, fog: 0xbfe7ff, hemi: [0xeaf6ff, 0x7a9a55, 1.1], sun: [0xfff2dd, 2.3],
  },
  desert: {
    top: ['#f7d785', '#eec86f'], side: ['#dca461', '#b98041'], capSide: 0xe6b862, sideBrick: true,
    lower: { color: 0xe9b56a, y: -16 }, fog: 0xffc9a2, hemi: [0xffe6cc, 0xa06a3a, 1.05], sun: [0xffd6a0, 2.4],
  },
  snow: {
    top: ['#ffffff', '#e8f3ff'], side: ['#9dc4e8', '#88b1da'], capSide: 0xe3f0ff, sideBrick: true,
    lower: { color: 0xeef7ff, y: -18 }, fog: 0xdcecff, hemi: [0xf2f8ff, 0x8aa6c8, 1.15], sun: [0xffffff, 2.0],
  },
  sky: {
    top: ['#ffffff', '#fdeeff'], side: ['#c7b6ff', '#b6a2f4'], capSide: 0xf6ecff, sideBrick: false,
    lower: { color: 0xffffff, y: -16, clouds: true }, fog: 0xffe3f3, hemi: [0xfff4ff, 0xb6a0d8, 1.2], sun: [0xfff0dd, 2.2],
  },
  castle: {
    top: ['#77718a', '#68627a'], side: ['#4f4860', '#2c2836'], capSide: 0x5d5770, sideBrick: true,
    lower: { color: 0xff5500, y: -1.5, lava: true }, fog: 0x4a1a24, hemi: [0xffc6a0, 0x40202a, 0.9], sun: [0xffb070, 1.8],
  },
};

const tmpV = new THREE.Vector3();

// 以世界座標設定 UV，讓格子紋路大小一致
function worldUV(geo, ox, oy, oz, scale = 4, cyl = false) {
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + ox, y = p.getY(i) + oy, z = p.getZ(i) + oz;
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    let u, v;
    if (ny > 0.5) { u = x; v = z; }
    else if (cyl) { u = Math.atan2(p.getZ(i), p.getX(i)) * Math.hypot(p.getX(i), p.getZ(i)); v = y; }
    else if (nx > 0.5) { u = z; v = y; }
    else { u = x; v = y; }
    uv.setXY(i, u / scale, v / scale);
  }
  uv.needsUpdate = true;
  return geo;
}

export function buildWorld(def) {
  const theme = THEMES[def.theme];
  const root = new THREE.Group();
  const W = {
    def, theme, root,
    colliders: [], coins: [], gems: [], enemies: [], items: [], springs: [], checkpoints: [],
    movers: [], fallers: [], firebars: [], thwomps: [], anims: [], particles: null,
    goal: null, bigStar: null, boss: null, arena: null,
    lavaY: theme.lower.lava ? theme.lower.y : null,
    killY: def.killY ?? -14,
    spawn: new THREE.Vector3(...(def.spawn || [0, 0, 2])),
    gemCount: 0,
  };

  // ---------- 材質 ----------
  const T = theme;
  const topTex = checkerTex(T.top[0], T.top[1]);
  const sideTex = T.sideBrick ? brickTex(T.side[0], T.side[1]) : checkerTex(T.side[0], T.side[1], 0.08);
  const M = {
    top: new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.8 }),
    side: new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.9 }),
    capSide: new THREE.MeshStandardMaterial({ color: T.capSide, roughness: 0.8 }),
    ice: new THREE.MeshStandardMaterial({ map: checkerTex('#bfe9ff', '#a6dcff', 0.02), roughness: 0.15, metalness: 0.1 }),
    iceSide: new THREE.MeshStandardMaterial({ color: 0x8fd0ff, roughness: 0.2, transparent: true, opacity: 0.92 }),
    rainbow: new THREE.MeshStandardMaterial({ map: stripeTex(['#ff6b6b', '#ffb04a', '#ffe14a', '#6be07a', '#4ac8ff', '#9a7bff']), roughness: 0.5 }),
    cloud: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, emissive: 0xffffff, emissiveIntensity: 0.12 }),
    cloudSide: new THREE.MeshStandardMaterial({ color: 0xf1e8ff, roughness: 0.95 }),
    stone: new THREE.MeshStandardMaterial({ map: checkerTex('#8a8599', '#7a758a'), roughness: 0.85 }),
    moverTop: new THREE.MeshStandardMaterial({ map: checkerTex('#ffd23a', '#ffc21a'), roughness: 0.6 }),
    moverSide: new THREE.MeshStandardMaterial({ color: 0x3a7adf, roughness: 0.6 }),
    fallTop: new THREE.MeshStandardMaterial({ map: checkerTex('#ff8a5a', '#ff7446'), roughness: 0.6 }),
    fallSide: new THREE.MeshStandardMaterial({ map: stripeTex(['#ffcc33', '#333333', '#ffcc33', '#333333']), roughness: 0.6 }),
    brick: new THREE.MeshStandardMaterial({ map: brickTex('#d8743a', '#8a3a18'), roughness: 0.7 }),
    q: new THREE.MeshStandardMaterial({ map: qblockTex(false), roughness: 0.4, emissive: 0x553300, emissiveIntensity: 0.25 }),
    qUsed: new THREE.MeshStandardMaterial({ map: qblockTex(true), roughness: 0.8 }),
  };
  W.materials = M;
  W.disposables = [topTex, sideTex, ...Object.values(M)];

  function styleMats(style) {
    switch (style) {
      case 'ice': return { top: M.ice, side: M.iceSide, cap: M.ice, capSide: M.iceSide };
      case 'rainbow': return { top: M.rainbow, side: M.rainbow, cap: null };
      case 'cloud': return { top: M.cloud, side: M.cloudSide, cap: null };
      case 'stone': return { top: M.stone, side: M.side, cap: null };
      case 'mover': return { top: M.moverTop, side: M.moverSide, cap: null };
      case 'faller': return { top: M.fallTop, side: M.fallSide, cap: null };
      default: return { top: M.top, side: M.side, cap: M.top, capSide: M.capSide };
    }
  }

  function addCollider(c) {
    c.delta = new THREE.Vector3();
    W.colliders.push(c);
    return c;
  }

  // 方塊平台：中心 x,z、頂部高度 top、寬 w、深 d、厚 h
  function makeBoxMesh(w, h, d, style, ox, oy, oz) {
    const S = styleMats(style);
    const g = new THREE.Group();
    const geo = worldUV(new THREE.BoxGeometry(w, h, d), ox, oy - h / 2, oz);
    const main = new THREE.Mesh(geo, [S.side, S.side, S.top, S.side, S.side, S.side]);
    main.position.y = -h / 2;
    main.castShadow = true;
    main.receiveShadow = true;
    g.add(main);
    if (S.cap && h > 0.6) {
      const ch = 0.34;
      const cgeo = worldUV(new THREE.BoxGeometry(w + 0.14, ch, d + 0.14), ox, oy - ch / 2, oz);
      const cap = new THREE.Mesh(cgeo, [S.capSide, S.capSide, S.cap, S.capSide, S.capSide, S.capSide]);
      cap.position.y = -ch / 2 + 0.001;
      cap.receiveShadow = true;
      cap.castShadow = true;
      g.add(cap);
    }
    return g;
  }
  function makeCylMesh(r, h, style, ox, oy, oz) {
    const S = styleMats(style);
    const g = new THREE.Group();
    const geo = worldUV(new THREE.CylinderGeometry(r, r * 0.92, h, 32), ox, oy - h / 2, oz, 4, true);
    const m = new THREE.Mesh(geo, [S.side, S.top, S.side]);
    m.position.y = -h / 2;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    if (S.cap && h > 0.6) {
      const cgeo = worldUV(new THREE.CylinderGeometry(r + 0.08, r + 0.08, 0.34, 32), ox, oy - 0.17, oz, 4, true);
      const cap = new THREE.Mesh(cgeo, [S.capSide, S.cap, S.capSide]);
      cap.position.y = -0.17 + 0.001;
      cap.receiveShadow = true;
      g.add(cap);
    }
    if (style === 'cloud') {
      // 雲朵邊緣的蓬鬆球
      const n = Math.max(6, Math.round(r * 3));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const s = new THREE.Mesh(SPH, M.cloud);
        const rr = 0.5 + Math.random() * 0.35;
        s.scale.setScalar(rr);
        s.position.set(Math.cos(a) * r * 0.95, -0.35 - Math.random() * 0.3, Math.sin(a) * r * 0.95);
        g.add(s);
      }
    }
    return g;
  }
  const SPH = new THREE.SphereGeometry(1, 14, 10);

  const B = {
    box(x, top, z, w, d, h = 3, style = 'normal', opts = {}) {
      const g = makeBoxMesh(w, h, d, style, x, top, z);
      g.position.set(x, top, z);
      root.add(g);
      const c = addCollider({
        shape: 'box', min: new THREE.Vector3(x - w / 2, top - h, z - d / 2), max: new THREE.Vector3(x + w / 2, top, z + d / 2),
        ice: style === 'ice' || opts.ice, mesh: g, kind: opts.kind || 'ground',
      });
      return c;
    },
    ground(x, z1, z2, w, top = 0, style = 'normal', h = 4) {
      return B.box(x, top, (z1 + z2) / 2, w, Math.abs(z1 - z2), h, style);
    },
    cyl(x, top, z, r, style = 'normal', h = 3) {
      const g = makeCylMesh(r, h, style, x, top, z);
      g.position.set(x, top, z);
      root.add(g);
      return addCollider({ shape: 'cyl', cx: x, cz: z, r, min: new THREE.Vector3(x - r, top - h, z - r), max: new THREE.Vector3(x + r, top, z + r), ice: style === 'ice', mesh: g, kind: 'ground' });
    },
    // 來回移動平台：to = 位移量 [dx,dy,dz]
    mover(x, top, z, w, d, to, period = 4, phase = 0, h = 0.8) {
      const c = B.box(x, top, z, w, d, h, 'mover');
      c.kind = 'mover';
      W.movers.push({ c, type: 'line', base: new THREE.Vector3(x, top, z), to: new THREE.Vector3(...to), period, phase, w, d, h });
      return c;
    },
    // 繞圈移動平台
    circler(cx, top, cz, radius, w, d, period = 6, phase = 0) {
      const c = B.box(cx + radius, top, cz, w, d, 0.8, 'mover');
      c.kind = 'mover';
      W.movers.push({ c, type: 'circle', base: new THREE.Vector3(cx, top, cz), radius, period, phase, w, d, h: 0.8 });
      return c;
    },
    faller(x, top, z, w, d) {
      const c = B.box(x, top, z, w, d, 0.7, 'faller');
      c.kind = 'faller';
      W.fallers.push({ c, base: new THREE.Vector3(x, top, z), w, d, h: 0.7, timer: 0, state: 'idle', vy: 0, respawn: 0 });
      return c;
    },
    qblock(x, y, z, item = 'coin') {
      const g = new THREE.Mesh(BOXG, M.q);
      g.scale.setScalar(1.2);
      g.position.set(x, y, z);
      g.castShadow = true;
      root.add(g);
      const c = addCollider({ shape: 'box', min: new THREE.Vector3(x - 0.6, y - 0.6, z - 0.6), max: new THREE.Vector3(x + 0.6, y + 0.6, z + 0.6), kind: 'qblock', mesh: g, item, hits: item === 'coin10' ? 8 : 1, used: false, bounce: 0, baseY: y });
      return c;
    },
    brick(x, y, z) {
      const g = new THREE.Mesh(BOXG, M.brick);
      g.scale.setScalar(1.2);
      g.position.set(x, y, z);
      g.castShadow = true;
      root.add(g);
      return addCollider({ shape: 'box', min: new THREE.Vector3(x - 0.6, y - 0.6, z - 0.6), max: new THREE.Vector3(x + 0.6, y + 0.6, z + 0.6), kind: 'brick', mesh: g, bounce: 0, baseY: y });
    },
    coin(x, y, z) {
      const m = createCoin();
      m.position.set(x, y + 0.6, z);
      root.add(m);
      W.coins.push({ m, pos: m.position, taken: false });
    },
    coinLine(x1, y1, z1, x2, y2, z2, n) {
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : i / (n - 1);
        B.coin(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, z1 + (z2 - z1) * t);
      }
    },
    coinArc(x1, z1, x2, z2, y, hgt, n) {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        B.coin(x1 + (x2 - x1) * t, y + Math.sin(t * Math.PI) * hgt, z1 + (z2 - z1) * t);
      }
    },
    coinRing(x, y, z, r, n) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        B.coin(x + Math.cos(a) * r, y, z + Math.sin(a) * r);
      }
    },
    gem(x, y, z) {
      const m = createGem();
      m.position.set(x, y + 0.8, z);
      root.add(m);
      W.gems.push({ m, pos: m.position, taken: false, idx: W.gemCount++ });
    },
    spring(x, top, z, power = 26) {
      const m = createSpring();
      m.position.set(x, top, z);
      root.add(m);
      W.springs.push({ m, pos: m.position, top: top + 0.75, power, squash: 0 });
    },
    checkpoint(x, top, z) {
      const m = createFlag(0x9aa0aa);
      m.position.set(x + 2.5, top, z);
      root.add(m);
      W.checkpoints.push({ m, pos: new THREE.Vector3(x, top, z), on: false });
    },
    goal(x, top, z) {
      const m = createGoal();
      m.position.set(x, top, z);
      root.add(m);
      W.goal = { m, pos: m.position.clone(), top, done: false };
      addCollider({ shape: 'box', min: new THREE.Vector3(x - 0.7, top, z - 0.7), max: new THREE.Vector3(x + 0.7, top + 1, z + 0.7), kind: 'ground', mesh: null });
    },
    bigStar(x, y, z) {
      const m = createBigStar();
      m.position.set(x, y, z);
      m.visible = false;
      root.add(m);
      W.bigStar = { m, pos: m.position, active: false };
    },
    enemy(type, x, y, z, opts = {}) {
      let m;
      if (type === 'walker') m = createWalker(def.theme);
      else if (type === 'spiky') m = createSpiky(def.theme);
      else if (type === 'bee') m = createBee();
      m.position.set(x, y, z);
      root.add(m);
      const e = {
        type, m, pos: m.position, vel: new THREE.Vector3(), home: new THREE.Vector3(x, y, z), alive: true, dying: 0,
        dir: opts.dir || [1, 0], range: opts.range ?? 3, speed: opts.speed ?? (type === 'spiky' ? 2.6 : 2.2),
        amp: opts.amp ?? 3, axis: opts.axis || 'x', t: Math.random() * 6, grounded: false,
        r: type === 'bee' ? 0.55 : 0.55, h: type === 'bee' ? 0.9 : 1.1, chase: type === 'walker' && opts.chase !== false,
        stompable: type !== 'spiky',
      };
      if (type === 'spiky') e.dir = opts.axis === 'z' ? [0, 1] : [1, 0];
      W.enemies.push(e);
      return e;
    },
    thwomp(x, top, z, hover = 5.2) {
      const m = createThwomp();
      root.add(m);
      const c = addCollider({ shape: 'box', min: new THREE.Vector3(), max: new THREE.Vector3(), kind: 'thwomp', mesh: m });
      const th = { m, c, x, z, floor: top, hoverY: top + hover, y: top + hover, state: 'wait', timer: 0, vy: 0 };
      W.thwomps.push(th);
      setThwomp(th);
      return th;
    },
    firebar(x, y, z, len = 4, speed = 1.8, phase = 0) {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      root.add(g);
      const pivot = new THREE.Mesh(BOXG, mat(0x6a5a4a));
      pivot.scale.set(1, 1, 1);
      pivot.position.y = -0.2;
      pivot.castShadow = true;
      g.add(pivot);
      addCollider({ shape: 'box', min: new THREE.Vector3(x - 0.5, y - 0.7, z - 0.5), max: new THREE.Vector3(x + 0.5, y + 0.3, z + 0.5), kind: 'ground', mesh: pivot });
      const arm = new THREE.Group();
      arm.position.y = 0.5;
      g.add(arm);
      const balls = [];
      const n = Math.round(len / 0.8);
      for (let i = 1; i <= n; i++) {
        const b = new THREE.Mesh(SPH, FIRE_MAT);
        b.scale.setScalar(0.38);
        b.position.x = i * 0.8;
        arm.add(b);
        balls.push(b);
      }
      W.firebars.push({ g, arm, balls, speed, angle: phase, center: new THREE.Vector3(x, y + 0.5, z) });
    },
    boss(x, top, z, ax = x, az = z, arenaR = 13) {
      const m = createBoss();
      m.position.set(x, top, z);
      m.rotation.y = 0;
      root.add(m);
      W.boss = { m, pos: m.position, vel: new THREE.Vector3(), hp: 3, state: 'sleep', timer: 0, top, face: 0, inv: 0, fireballs: [], wave: null };
      W.arena = { x: ax, z: az, r: arenaR, top };
    },
    lava() { /* lavaY 由主題決定 */ },
    deco(type, x, y, z, s = 1, rot = 0) {
      const g = makeDeco(type, s);
      g.position.set(x, y, z);
      g.rotation.y = rot;
      root.add(g);
      if (DECO_SOLID[type]) {
        const r = DECO_SOLID[type] * s;
        addCollider({ shape: 'cyl', cx: x, cz: z, r, min: new THREE.Vector3(x - r, y, z - r), max: new THREE.Vector3(x + r, y + (DECO_H[type] || 2) * s, z + r), kind: 'ground', mesh: null });
      }
      return g;
    },
    // 在區域內隨機灑裝飾
    scatter(type, x1, x2, z1, z2, y, n, sMin = 0.8, sMax = 1.3) {
      for (let i = 0; i < n; i++) {
        B.deco(type, x1 + Math.random() * (x2 - x1), y, z1 + Math.random() * (z2 - z1), sMin + Math.random() * (sMax - sMin), Math.random() * 6);
      }
    },
  };

  function setThwomp(th) {
    th.m.position.set(th.x, th.y + 1.2, th.z);
    th.c.min.set(th.x - 1.2, th.y, th.z - 1.2);
    th.c.max.set(th.x + 1.2, th.y + 2.4, th.z + 1.2);
  }
  W.setThwomp = setThwomp;

  // ---------- 遠景：底層水面/沙地/雲海/岩漿 ----------
  const L = T.lower;
  let lowerMat;
  if (L.lava) {
    const lt = lavaTex();
    lt.repeat.set(40, 40);
    lowerMat = new THREE.MeshStandardMaterial({ map: lt, emissive: 0xff3300, emissiveMap: lt, emissiveIntensity: 0.9, roughness: 0.6 });
    W.lavaTex = lt;
    W.disposables.push(lt);
  } else {
    lowerMat = new THREE.MeshStandardMaterial({ color: L.color, roughness: 0.95 });
  }
  W.disposables.push(lowerMat);
  const lower = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), lowerMat);
  lower.rotation.x = -Math.PI / 2;
  lower.position.set(0, L.y, -100);
  lower.receiveShadow = !L.lava;
  root.add(lower);
  W.lower = lower;
  if (L.clouds) {
    for (let i = 0; i < 60; i++) {
      const s = new THREE.Mesh(SPH, M.cloud);
      s.scale.set(4 + Math.random() * 6, 2 + Math.random() * 2, 4 + Math.random() * 6);
      s.position.set((Math.random() - 0.5) * 160, L.y + Math.random() * 2, 20 - Math.random() * 220);
      root.add(s);
    }
  }

  def.build(B, W);
  return W;
}

const BOXG = new THREE.BoxGeometry(1, 1, 1);
const FIRE_MAT = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xff5a00, emissiveIntensity: 1.2, roughness: 0.4 });
export { FIRE_MAT };

const DECO_SOLID = { tree: 0.35, cactus: 0.35, pine: 0.4, pillar: 1.0, snowman: 0.55, mushroom: 0.35 };
const DECO_H = { tree: 2.2, cactus: 2.2, pine: 3, pillar: 8, snowman: 2, mushroom: 2.5 };

function makeDeco(type, s) {
  const g = new THREE.Group();
  const S = new THREE.SphereGeometry(1, 16, 12);
  const add = (geo, m, x, y, z, sx, sy, sz, shadow = true) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.scale.set(sx, sy ?? sx, sz ?? sx);
    o.castShadow = shadow;
    g.add(o);
    return o;
  };
  const CY = new THREE.CylinderGeometry(1, 1, 1, 12);
  const CO = new THREE.ConeGeometry(1, 1, 12);
  switch (type) {
    case 'tree': {
      add(CY, mat(0x8a5a2e), 0, 0.8, 0, 0.22, 1.6, 0.22);
      const greens = [0x49c23a, 0x5fd34a, 0x3fae30];
      add(S, mat(greens[Math.floor(Math.random() * 3)]), 0, 2.3, 0, 1.1, 1.0, 1.1);
      add(S, mat(0x6fe05a), 0.35, 2.75, 0.2, 0.6);
      break;
    }
    case 'bush':
      add(S, mat(0x4cc23d), 0, 0.3, 0, 0.6, 0.5, 0.6);
      add(S, mat(0x5bd24a), 0.5, 0.25, 0.1, 0.45, 0.4, 0.45);
      add(S, mat(0x42b035), -0.45, 0.22, 0, 0.4, 0.35, 0.4);
      break;
    case 'flower': {
      const cols = [0xff5a8a, 0xffd23a, 0xffffff, 0xff8a3a, 0xb07aff];
      add(CY, mat(0x3aa02a), 0, 0.25, 0, 0.03, 0.5, 0.03, false);
      add(S, mat(cols[Math.floor(Math.random() * cols.length)]), 0, 0.55, 0, 0.16, 0.1, 0.16, false);
      add(S, mat(0xffe14a), 0, 0.6, 0, 0.07, 0.05, 0.07, false);
      break;
    }
    case 'cactus':
      add(CY, mat(0x3fae4a), 0, 1.1, 0, 0.35, 2.2, 0.35);
      add(S, mat(0x3fae4a), 0, 2.2, 0, 0.35);
      add(CY, mat(0x3fae4a), 0.55, 1.2, 0, 0.18, 0.2, 0.18).rotation.z = Math.PI / 2;
      add(CY, mat(0x3fae4a), 0.7, 1.5, 0, 0.18, 0.7, 0.18);
      add(S, mat(0xff5aa0), 0, 2.55, 0, 0.12);
      break;
    case 'pyramid': {
      const p = add(new THREE.ConeGeometry(1, 1, 4), mat(0xe3b060, { roughness: 1 }), 0, 0.5, 0, 1, 1, 1, false);
      p.rotation.y = Math.PI / 4;
      break;
    }
    case 'pine':
      add(CY, mat(0x6a4020), 0, 0.5, 0, 0.18, 1, 0.18);
      add(CO, mat(0x2f8a5a), 0, 1.4, 0, 1.0, 1.4, 1.0);
      add(CO, mat(0x3a9a64), 0, 2.2, 0, 0.8, 1.2, 0.8);
      add(CO, mat(0xffffff), 0, 2.9, 0, 0.5, 0.8, 0.5);
      break;
    case 'snowman':
      add(S, mat(0xffffff), 0, 0.55, 0, 0.6);
      add(S, mat(0xffffff), 0, 1.3, 0, 0.42);
      add(S, mat(0xffffff), 0, 1.9, 0, 0.3);
      add(CO, mat(0xff7a1c), 0, 1.9, 0.35, 0.06, 0.3, 0.06).rotation.x = Math.PI / 2;
      add(CY, mat(0x222222), 0, 2.25, 0, 0.25, 0.3, 0.25);
      add(CY, mat(0xff3b5c), 0, 1.58, 0, 0.32, 0.1, 0.32);
      break;
    case 'crystal': {
      const c = add(new THREE.OctahedronGeometry(1, 0), mat(0x9ae6ff, { emissive: 0x3aa0dd, emissiveIntensity: 0.5, roughness: 0.1, transparent: true, opacity: 0.85 }), 0, 1, 0, 0.5, 1.2, 0.5);
      c.rotation.y = Math.random();
      break;
    }
    case 'cloud':
      for (let i = 0; i < 5; i++) add(S, mat(0xffffff, { roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.35 }), (i - 2) * 0.8, Math.sin(i) * 0.2, (Math.random() - 0.5) * 0.6, 0.7 + Math.random() * 0.5, undefined, undefined, false);
      break;
    case 'rainbow': {
      const cols = [0xff5a5a, 0xffa84a, 0xffe14a, 0x6be07a, 0x4ac8ff, 0x9a7bff];
      cols.forEach((c, i) => {
        const t = new THREE.Mesh(new THREE.TorusGeometry(6 - i * 0.35, 0.18, 8, 48, Math.PI), mat(c, { emissive: c, emissiveIntensity: 0.3 }));
        g.add(t);
      });
      break;
    }
    case 'balloon': {
      const cols = [0xff5a8a, 0x4ac8ff, 0xffd23a, 0x6be07a];
      add(S, mat(cols[Math.floor(Math.random() * 4)], { roughness: 0.3 }), 0, 1.5, 0, 0.5, 0.6, 0.5);
      add(CY, mat(0xffffff), 0, 0.5, 0, 0.01, 1.2, 0.01, false);
      break;
    }
    case 'pillar':
      add(CY, mat(0x5a5468, { roughness: 0.9 }), 0, 4, 0, 1, 8, 1);
      add(CY, mat(0x6a6478), 0, 8.1, 0, 1.25, 0.4, 1.25);
      break;
    case 'torch': {
      add(CY, mat(0x3a3440), 0, 0.9, 0, 0.12, 1.8, 0.12);
      add(CY, mat(0x5a5468), 0, 1.85, 0, 0.25, 0.2, 0.25);
      const f = add(CO, FIRE_MAT, 0, 2.25, 0, 0.22, 0.6, 0.22, false);
      f.userData.flicker = true;
      break;
    }
    case 'mushroom': {
      add(CY, mat(0xfff0d8), 0, 0.9, 0, 0.3, 1.8, 0.3);
      add(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xff4a5a), 0, 1.7, 0, 1.1, 0.8, 1.1);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        add(S, mat(0xffffff), Math.cos(a) * 0.7, 2.1, Math.sin(a) * 0.7, 0.18, 0.1, 0.18, false);
      }
      break;
    }
    default: break;
  }
  g.scale.multiplyScalar(s);
  return g;
}
