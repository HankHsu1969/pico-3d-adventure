// 所有 3D 模型：主角皮可、敵人、道具、材質貼圖（全部程序化生成）
import * as THREE from '../lib/three.module.js';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...opts }));
  }
  return matCache.get(key);
}
function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
const G = {
  sphere: new THREE.SphereGeometry(1, 24, 16),
  sphereLo: new THREE.SphereGeometry(1, 12, 8),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 20),
  cone: new THREE.ConeGeometry(1, 1, 12),
  box: new THREE.BoxGeometry(1, 1, 1),
};

function starShape(outer = 1, inner = 0.45, points = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}
export const starGeo = new THREE.ExtrudeGeometry(starShape(1, 0.48), { depth: 0.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3 });
starGeo.center();
const heartShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.9);
  s.bezierCurveTo(0.2, -0.6, 1, -0.2, 1, 0.3);
  s.bezierCurveTo(1, 0.8, 0.4, 1, 0, 0.55);
  s.bezierCurveTo(-0.4, 1, -1, 0.8, -1, 0.3);
  s.bezierCurveTo(-1, -0.2, -0.2, -0.6, 0, -0.9);
  return s;
})();
const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3 });
heartGeo.center();

// ================= 主角：皮可 Pico =================
export function createHero() {
  const C = {
    skin: mat(0xffc79e), cap: mat(0xff7a1c), shirt: mat(0xffc52e), overall: mat(0x1d9aa3),
    glove: mat(0xffffff), boot: mat(0x8a4a22), hair: mat(0x6a3a1c), white: mat(0xffffff, { roughness: 0.3 }),
    pupil: mat(0x2a1608, { roughness: 0.2 }), cheek: mat(0xff9a8a), gold: mat(0xffc400, { metalness: 0.6, roughness: 0.3 }), mouth: mat(0x7a1f1f),
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // 身體（吊帶褲 + 上衣）
  const torso = new THREE.Group();
  torso.position.y = 0.62;
  body.add(torso);
  const pants = mesh(G.sphere, C.overall, 0, -0.05, 0);
  pants.scale.set(0.33, 0.3, 0.29);
  torso.add(pants);
  const shirt = mesh(G.sphere, C.shirt, 0, 0.14, 0);
  shirt.scale.set(0.3, 0.22, 0.26);
  torso.add(shirt);
  const bib = mesh(G.box, C.overall, 0, 0.12, 0.2);
  bib.scale.set(0.3, 0.2, 0.1);
  torso.add(bib);
  [-0.12, 0.12].forEach((x) => {
    const strap = mesh(G.box, C.overall, x, 0.2, 0.05);
    strap.scale.set(0.07, 0.2, 0.46);
    torso.add(strap);
    const btn = mesh(G.sphereLo, C.gold, x, 0.2, 0.26);
    btn.scale.setScalar(0.045);
    torso.add(btn);
  });

  // 頭
  const head = new THREE.Group();
  head.position.y = 1.12;
  body.add(head);
  const skull = mesh(G.sphere, C.skin);
  skull.scale.set(0.36, 0.34, 0.34);
  head.add(skull);
  const hairBack = mesh(G.sphere, C.hair, 0, 0.02, -0.07);
  hairBack.scale.set(0.35, 0.3, 0.31);
  head.add(hairBack);
  [-1, 1].forEach((s) => {
    const burn = mesh(G.sphere, C.hair, s * 0.3, 0.06, 0.06);
    burn.scale.set(0.09, 0.15, 0.13);
    head.add(burn);
  });
  // 帽子
  const capTop = mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), C.cap, 0, 0.1, -0.01);
  capTop.scale.set(0.38, 0.3, 0.37);
  head.add(capTop);
  const brim = mesh(G.cyl, C.cap, 0, 0.12, 0.26);
  brim.scale.set(0.27, 0.04, 0.2);
  brim.rotation.x = 0.12;
  head.add(brim);
  const badge = mesh(G.cyl, C.white, 0, 0.27, 0.27);
  badge.scale.set(0.11, 0.02, 0.11);
  badge.rotation.x = Math.PI / 2 - 0.55;
  head.add(badge);
  const star = mesh(starGeo, C.cap, 0, 0.275, 0.285);
  star.scale.setScalar(0.07);
  star.rotation.x = -0.55;
  head.add(star);
  // 臉
  [-1, 1].forEach((s) => {
    const eye = mesh(G.sphere, C.white, s * 0.12, 0.02, 0.29);
    eye.scale.set(0.085, 0.11, 0.06);
    head.add(eye);
    const pupil = mesh(G.sphere, C.pupil, s * 0.115, 0.01, 0.335);
    pupil.scale.set(0.05, 0.07, 0.03);
    head.add(pupil);
    const shine = mesh(G.sphereLo, C.white, s * 0.1, 0.04, 0.36);
    shine.scale.setScalar(0.017);
    head.add(shine);
    const brow = mesh(G.box, C.hair, s * 0.12, 0.15, 0.3);
    brow.scale.set(0.1, 0.025, 0.03);
    brow.rotation.z = s * -0.15;
    head.add(brow);
    const cheek = mesh(G.sphereLo, C.cheek, s * 0.22, -0.1, 0.24);
    cheek.scale.set(0.06, 0.04, 0.03);
    head.add(cheek);
    const ear = mesh(G.sphereLo, C.skin, s * 0.35, -0.02, 0);
    ear.scale.set(0.05, 0.08, 0.06);
    head.add(ear);
  });
  const nose = mesh(G.sphere, C.skin, 0, -0.07, 0.35);
  nose.scale.set(0.07, 0.06, 0.06);
  head.add(nose);
  const mouth = mesh(new THREE.TorusGeometry(0.07, 0.022, 8, 16, Math.PI), C.mouth, 0, -0.14, 0.3);
  mouth.rotation.z = Math.PI;
  mouth.rotation.x = -0.25;
  head.add(mouth);

  // 手臂（肩膀為樞紐）
  const arms = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.31, 0.83, 0);
    body.add(pivot);
    const sleeve = mesh(G.sphereLo, C.shirt, 0, -0.02, 0);
    sleeve.scale.setScalar(0.11);
    pivot.add(sleeve);
    const arm = mesh(G.cyl, C.skin, 0, -0.15, 0);
    arm.scale.set(0.055, 0.22, 0.055);
    pivot.add(arm);
    const glove = mesh(G.sphere, C.glove, 0, -0.3, 0);
    glove.scale.set(0.11, 0.1, 0.11);
    pivot.add(glove);
    pivot.rotation.z = s * 0.35;
    return pivot;
  });
  // 腿
  const legs = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.14, 0.42, 0);
    body.add(pivot);
    const leg = mesh(G.cyl, C.overall, 0, -0.12, 0);
    leg.scale.set(0.1, 0.22, 0.1);
    pivot.add(leg);
    const boot = mesh(G.sphere, C.boot, 0, -0.32, 0.05);
    boot.scale.set(0.13, 0.1, 0.17);
    pivot.add(boot);
    const sole = mesh(G.cyl, mat(0x5a2e12), 0, -0.4, 0.05);
    sole.scale.set(0.12, 0.03, 0.15);
    pivot.add(sole);
    return pivot;
  });

  // 羽毛（取得彩虹羽毛時在帽子上顯示）
  const feather = new THREE.Group();
  const fm = mesh(G.sphere, mat(0x7ef0ff, { emissive: 0x2299bb, emissiveIntensity: 0.4 }), 0, 0.2, 0);
  fm.scale.set(0.06, 0.22, 0.03);
  feather.add(fm);
  const fm2 = mesh(G.sphere, mat(0xff9ae8, { emissive: 0xaa3388, emissiveIntensity: 0.3 }), 0.07, 0.15, 0);
  fm2.scale.set(0.045, 0.16, 0.025);
  fm2.rotation.z = -0.4;
  feather.add(fm2);
  feather.position.set(-0.28, 0.2, -0.05);
  feather.rotation.z = 0.5;
  feather.visible = false;
  head.add(feather);

  root.userData = { body, head, torso, arms, legs, feather, t: 0 };
  return root;
}

// 程序動畫：state = idle / run / jump / fall / glide / spin / pole / hurt / win
export function animateHero(hero, state, dt, speed = 0) {
  const u = hero.userData;
  u.t += dt;
  const t = u.t;
  const [aL, aR] = u.arms;
  const [lL, lR] = u.legs;
  let bodyY = 0, headTilt = 0, armSwing = 0, legSwing = 0, armOut = 0.35, lean = 0, armUp = 0;
  if (state === 'run') {
    const f = 6 + speed * 1.1;
    const ph = Math.sin(t * f);
    legSwing = ph * Math.min(1, speed / 8) * 0.9;
    armSwing = -legSwing * 0.9;
    bodyY = Math.abs(Math.cos(t * f)) * 0.06;
    lean = Math.min(0.25, speed * 0.02);
  } else if (state === 'idle') {
    bodyY = Math.sin(t * 3) * 0.015;
    headTilt = Math.sin(t * 1.3) * 0.05;
    armOut = 0.3 + Math.sin(t * 3) * 0.03;
  } else if (state === 'jump') {
    legSwing = 0.6;
    armUp = 2.4;
    armOut = 0.3;
  } else if (state === 'fall') {
    legSwing = -0.3;
    armOut = 1.1;
  } else if (state === 'glide') {
    armOut = 1.5;
    legSwing = Math.sin(t * 10) * 0.2;
    lean = 0.3;
  } else if (state === 'pole') {
    armUp = 2.8;
    legSwing = 0.3;
  } else if (state === 'hurt') {
    armOut = 1.3;
    lean = -0.4;
  } else if (state === 'win') {
    armUp = 2.8 + Math.sin(t * 12) * 0.2;
    bodyY = Math.abs(Math.sin(t * 6)) * 0.2;
  }
  const k = Math.min(1, dt * 18);
  const lerp = (a, b) => a + (b - a) * k;
  u.body.position.y = lerp(u.body.position.y, bodyY);
  u.body.rotation.x = lerp(u.body.rotation.x, lean);
  u.head.rotation.z = lerp(u.head.rotation.z, headTilt);
  aL.rotation.x = lerp(aL.rotation.x, armSwing - armUp);
  aR.rotation.x = lerp(aR.rotation.x, -armSwing - (state === 'jump' ? 0.3 : armUp));
  aL.rotation.z = lerp(aL.rotation.z, -armOut);
  aR.rotation.z = lerp(aR.rotation.z, armOut);
  lL.rotation.x = lerp(lL.rotation.x, legSwing);
  lR.rotation.x = lerp(lR.rotation.x, state === 'jump' ? -0.5 : -legSwing);
}

// ================= 敵人 =================
// 咕姆（可踩）：紫色圓球怪 + 頭上葉子
export function createWalker(theme) {
  const colors = { snow: 0xdfefff, desert: 0xd98a3a, castle: 0x7a3fa0, sky: 0xff8fc8 };
  const g = new THREE.Group();
  const bodyM = mat(colors[theme] || 0x8c5ad8);
  const b = mesh(G.sphere, bodyM, 0, 0.55, 0);
  b.scale.set(0.58, 0.52, 0.55);
  g.add(b);
  const belly = mesh(G.sphere, mat(0xfff0d8), 0, 0.45, 0.22);
  belly.scale.set(0.38, 0.32, 0.35);
  g.add(belly);
  [-1, 1].forEach((s) => {
    const eye = mesh(G.sphere, mat(0xffffff), s * 0.18, 0.72, 0.43);
    eye.scale.set(0.13, 0.16, 0.08);
    g.add(eye);
    const p = mesh(G.sphereLo, mat(0x111111), s * 0.16, 0.7, 0.5);
    p.scale.set(0.06, 0.09, 0.04);
    g.add(p);
    const brow = mesh(G.box, mat(0x2a1030), s * 0.18, 0.9, 0.45);
    brow.scale.set(0.22, 0.05, 0.05);
    brow.rotation.z = s * 0.45;
    g.add(brow);
    const foot = mesh(G.sphere, mat(0x3a2418), s * 0.25, 0.1, 0.05);
    foot.scale.set(0.2, 0.12, 0.26);
    foot.name = s < 0 ? 'footL' : 'footR';
    g.add(foot);
  });
  const fang = mesh(G.cone, mat(0xffffff), 0.1, 0.42, 0.5);
  fang.scale.set(0.05, 0.1, 0.05);
  fang.rotation.x = Math.PI;
  g.add(fang);
  if (theme === 'snow') {
    const hat = mesh(G.cone, mat(0xff4466), 0, 1.15, 0);
    hat.scale.set(0.35, 0.5, 0.35);
    g.add(hat);
  } else {
    const leaf = mesh(G.sphere, mat(0x46c43a), 0.08, 1.12, 0);
    leaf.scale.set(0.2, 0.06, 0.1);
    leaf.rotation.z = 0.5;
    g.add(leaf);
    const stem = mesh(G.cyl, mat(0x3a7a2a), 0, 1.05, 0);
    stem.scale.set(0.03, 0.12, 0.03);
    g.add(stem);
  }
  return g;
}

// 刺刺球（不可踩）
export function createSpiky(theme) {
  const g = new THREE.Group();
  const col = theme === 'snow' ? 0x7fd0ff : theme === 'castle' ? 0x444455 : 0xff5a3a;
  const inner = new THREE.Group();
  inner.position.y = 0.6;
  g.add(inner);
  const b = mesh(G.sphere, mat(col), 0, 0, 0);
  b.scale.setScalar(0.5);
  inner.add(b);
  const spikeM = mat(theme === 'snow' ? 0xffffff : 0xfff2c0);
  const dirs = new THREE.IcosahedronGeometry(1, 0).attributes.position;
  const seen = new Set();
  for (let i = 0; i < dirs.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(dirs, i).normalize();
    const key = v.toArray().map((n) => n.toFixed(2)).join();
    if (seen.has(key)) continue;
    seen.add(key);
    const s = mesh(G.cone, spikeM);
    s.scale.set(0.13, 0.35, 0.13);
    s.position.copy(v).multiplyScalar(0.55);
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
    inner.add(s);
  }
  [-1, 1].forEach((s) => {
    const eye = mesh(G.sphere, mat(0xffffff), s * 0.15, 0.1, 0.4);
    eye.scale.set(0.1, 0.13, 0.06);
    inner.add(eye);
    const p = mesh(G.sphereLo, mat(0x111111), s * 0.14, 0.08, 0.45);
    p.scale.set(0.05, 0.07, 0.03);
    inner.add(p);
  });
  g.userData.inner = inner;
  return g;
}

// 嗡嗡蜂（飛行，可踩）
export function createBee() {
  const g = new THREE.Group();
  const b = mesh(G.sphere, mat(0xffd21a), 0, 0, 0);
  b.scale.set(0.45, 0.42, 0.55);
  g.add(b);
  [-0.12, 0.12].forEach((z) => {
    const st = mesh(G.cyl, mat(0x222222), 0, 0, z);
    st.scale.set(0.44, 0.08, 0.44);
    st.rotation.x = Math.PI / 2;
    g.add(st);
  });
  [-1, 1].forEach((s) => {
    const eye = mesh(G.sphere, mat(0xffffff), s * 0.15, 0.12, 0.45);
    eye.scale.set(0.1, 0.12, 0.06);
    g.add(eye);
    const p = mesh(G.sphereLo, mat(0x111111), s * 0.14, 0.1, 0.5);
    p.scale.set(0.05, 0.07, 0.03);
    g.add(p);
    const wing = mesh(G.sphere, mat(0xffffff, { transparent: true, opacity: 0.75 }), s * 0.35, 0.4, -0.05);
    wing.scale.set(0.3, 0.05, 0.18);
    wing.name = 'wing';
    wing.userData.side = s;
    g.add(wing);
  });
  const sting = mesh(G.cone, mat(0x333333), 0, -0.05, -0.62);
  sting.scale.set(0.08, 0.2, 0.08);
  sting.rotation.x = -Math.PI / 2;
  g.add(sting);
  return g;
}

// 壓壓石（會砸下來的石塊）
export function createThwomp() {
  const g = new THREE.Group();
  const b = mesh(G.box, mat(0x8a8fa0, { roughness: 0.9 }), 0, 0, 0);
  b.scale.set(2.4, 2.4, 2.4);
  b.receiveShadow = true;
  g.add(b);
  [-1, 1].forEach((s) => {
    const eye = mesh(G.box, mat(0xffffff), s * 0.5, 0.25, 1.21);
    eye.scale.set(0.5, 0.35, 0.05);
    g.add(eye);
    const p = mesh(G.box, mat(0x111111), s * 0.45, 0.2, 1.24);
    p.scale.set(0.2, 0.25, 0.04);
    g.add(p);
    const brow = mesh(G.box, mat(0x333344), s * 0.5, 0.58, 1.23);
    brow.scale.set(0.65, 0.12, 0.05);
    brow.rotation.z = s * 0.35;
    g.add(brow);
  });
  const mouth = mesh(G.box, mat(0x222222), 0, -0.55, 1.22);
  mouth.scale.set(1.2, 0.2, 0.04);
  g.add(mouth);
  for (let i = 0; i < 4; i++) {
    const sp = mesh(G.cone, mat(0xcfd3dd), 0, 0, 0);
    sp.scale.set(0.25, 0.4, 0.25);
    const a = (i / 4) * Math.PI * 2;
    sp.position.set(Math.cos(a) * 1.3, -1.1, Math.sin(a) * 1.3);
    sp.rotation.x = Math.PI;
    g.add(sp);
  }
  return g;
}

// 咕嚕大王（魔王）
export function createBoss() {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  const skin = mat(0x6b3fa8);
  const body = mesh(G.sphere, skin, 0, 1.5, 0);
  body.scale.set(1.5, 1.4, 1.4);
  inner.add(body);
  const belly = mesh(G.sphere, mat(0xffe0a0), 0, 1.3, 0.55);
  belly.scale.set(1.05, 1.05, 0.95);
  inner.add(belly);
  // 背殼尖刺
  const shell = mesh(G.sphere, mat(0x2f8a3a), 0, 1.7, -0.5);
  shell.scale.set(1.45, 1.3, 1.1);
  inner.add(shell);
  for (let i = 0; i < 7; i++) {
    const a = -0.9 + (i / 6) * 1.8;
    const sp = mesh(G.cone, mat(0xfff2d0), Math.sin(a) * 1.1, 1.8 + Math.cos(a) * 0.9, -1.2);
    sp.scale.set(0.25, 0.6, 0.25);
    sp.rotation.x = -1.1;
    sp.rotation.z = -a * 0.8;
    inner.add(sp);
  }
  // 頭
  const head = new THREE.Group();
  head.position.set(0, 3.1, 0.35);
  inner.add(head);
  const hd = mesh(G.sphere, skin, 0, 0, 0);
  hd.scale.set(0.95, 0.85, 0.9);
  head.add(hd);
  const snout = mesh(G.sphere, mat(0xffe0a0), 0, -0.2, 0.7);
  snout.scale.set(0.6, 0.4, 0.4);
  head.add(snout);
  [-1, 1].forEach((s) => {
    const eye = mesh(G.sphere, mat(0xffffff), s * 0.35, 0.25, 0.7);
    eye.scale.set(0.2, 0.24, 0.1);
    head.add(eye);
    const p = mesh(G.sphereLo, mat(0xcc0000, { emissive: 0x660000 }), s * 0.33, 0.22, 0.79);
    p.scale.set(0.09, 0.12, 0.04);
    head.add(p);
    const brow = mesh(G.box, mat(0xff7a1c), s * 0.35, 0.52, 0.72);
    brow.scale.set(0.45, 0.1, 0.1);
    brow.rotation.z = s * 0.45;
    head.add(brow);
    const horn = mesh(G.cone, mat(0xfff2d0), s * 0.6, 0.75, 0);
    horn.scale.set(0.18, 0.55, 0.18);
    horn.rotation.z = -s * 0.5;
    head.add(horn);
    const fang = mesh(G.cone, mat(0xffffff), s * 0.25, -0.5, 0.95);
    fang.scale.set(0.08, 0.2, 0.08);
    fang.rotation.x = Math.PI;
    head.add(fang);
    // 手腳
    const arm = mesh(G.sphere, skin, s * 1.45, 1.6, 0.3);
    arm.scale.set(0.35, 0.5, 0.35);
    inner.add(arm);
    const claw = mesh(G.sphere, mat(0xffe0a0), s * 1.55, 1.1, 0.45);
    claw.scale.set(0.3, 0.25, 0.3);
    inner.add(claw);
    const foot = mesh(G.sphere, skin, s * 0.7, 0.25, 0.3);
    foot.scale.set(0.45, 0.3, 0.6);
    inner.add(foot);
  });
  // 皇冠
  const crown = new THREE.Group();
  crown.position.y = 0.75;
  head.add(crown);
  const band = mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.3, 16, 1, true), mat(0xffc400, { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }));
  crown.add(band);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const c = mesh(G.cone, mat(0xffc400, { metalness: 0.7, roughness: 0.3 }), Math.cos(a) * 0.45, 0.3, Math.sin(a) * 0.45);
    c.scale.set(0.1, 0.3, 0.1);
    crown.add(c);
  }
  g.userData = { inner, head };
  return g;
}

// ================= 道具 =================
export function createCoin() {
  const g = new THREE.Group();
  const c = mesh(G.cyl, mat(0xffc81a, { metalness: 0.25, roughness: 0.3, emissive: 0xaa7200, emissiveIntensity: 0.55 }));
  c.scale.set(0.42, 0.1, 0.42);
  c.rotation.x = Math.PI / 2;
  g.add(c);
  const inner = mesh(G.box, mat(0xfff0a0, { metalness: 0.2, roughness: 0.3, emissive: 0xaa8800, emissiveIntensity: 0.5 }));
  inner.scale.set(0.1, 0.42, 0.14);
  g.add(inner);
  return g;
}
export function createGem() {
  const g = new THREE.Group();
  const s = mesh(starGeo, mat(0x3dff9a, { emissive: 0x11aa55, emissiveIntensity: 0.7, metalness: 0.3, roughness: 0.2 }));
  s.scale.setScalar(0.75);
  g.add(s);
  [-1, 1].forEach((k) => {
    const e = mesh(G.sphereLo, mat(0x0a3a1f), k * 0.18, 0.1, 0.3);
    e.scale.set(0.06, 0.12, 0.04);
    g.add(e);
  });
  return g;
}
export function createBigStar() {
  const g = new THREE.Group();
  const s = mesh(starGeo, mat(0xffe23a, { emissive: 0xffaa00, emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.2 }));
  s.scale.setScalar(1.6);
  g.add(s);
  const halo = mesh(new THREE.TorusGeometry(2.2, 0.08, 8, 48), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1 }));
  g.add(halo);
  g.userData.halo = halo;
  return g;
}
export function createFeather() {
  const g = new THREE.Group();
  const cols = [0xff6b8a, 0xffc53a, 0x5ae07a, 0x4ac8ff, 0xb77cff];
  cols.forEach((c, i) => {
    const f = mesh(G.sphere, mat(c, { emissive: c, emissiveIntensity: 0.35 }), (i - 2) * 0.12, 0.05 * Math.abs(i - 2) * -1, 0);
    f.scale.set(0.12, 0.55, 0.05);
    f.rotation.z = (i - 2) * -0.28;
    g.add(f);
  });
  const stem = mesh(G.cyl, mat(0xffffff), 0, -0.45, 0);
  stem.scale.set(0.03, 0.4, 0.03);
  g.add(stem);
  return g;
}
export function createHeart() {
  const g = new THREE.Group();
  const h = mesh(heartGeo, mat(0xff3b5c, { emissive: 0xaa0022, emissiveIntensity: 0.4, roughness: 0.25 }));
  h.scale.setScalar(0.5);
  g.add(h);
  return g;
}
export function createSpring() {
  const g = new THREE.Group();
  const base = mesh(G.cyl, mat(0x2a6adf), 0, 0.1, 0);
  base.scale.set(0.7, 0.2, 0.7);
  g.add(base);
  const coil = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const t = mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 20), mat(0xcfd6e0, { metalness: 0.8, roughness: 0.3 }), 0, 0.3 + i * 0.12, 0);
    t.rotation.x = Math.PI / 2;
    coil.add(t);
  }
  g.add(coil);
  const top = mesh(G.cyl, mat(0xff3b3b), 0, 0.68, 0);
  top.scale.set(0.75, 0.14, 0.75);
  g.add(top);
  g.userData = { coil, top };
  return g;
}
export function createFlag(color = 0x9aa0aa) {
  const g = new THREE.Group();
  const pole = mesh(G.cyl, mat(0xeeeeee, { metalness: 0.5 }), 0, 1.5, 0);
  pole.scale.set(0.07, 3, 0.07);
  g.add(pole);
  const ball = mesh(G.sphere, mat(0xffc400, { metalness: 0.6 }), 0, 3.05, 0);
  ball.scale.setScalar(0.15);
  g.add(ball);
  const flagGeo = new THREE.PlaneGeometry(1.1, 0.7, 6, 1);
  flagGeo.translate(0.55, 0, 0);
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }));
  flag.position.set(0.05, 2.6, 0);
  flag.castShadow = true;
  g.add(flag);
  g.userData = { flag };
  return g;
}
export function createGoal() {
  const g = new THREE.Group();
  const base = mesh(G.box, mat(0x9b6a3c), 0, 0.5, 0);
  base.scale.set(1.4, 1, 1.4);
  base.receiveShadow = true;
  g.add(base);
  const pole = mesh(G.cyl, mat(0x55dd66, { metalness: 0.3 }), 0, 5.5, 0);
  pole.scale.set(0.12, 9, 0.12);
  g.add(pole);
  const ball = mesh(G.sphere, mat(0xffc400, { metalness: 0.6, roughness: 0.3 }), 0, 10.1, 0);
  ball.scale.setScalar(0.35);
  g.add(ball);
  const flag = new THREE.Group();
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.3), new THREE.MeshStandardMaterial({ color: 0xff7a1c, side: THREE.DoubleSide }));
  cloth.position.x = -1.05;
  cloth.castShadow = true;
  flag.add(cloth);
  const st = mesh(starGeo, mat(0xffffff), -1.05, 0, 0.05);
  st.scale.setScalar(0.35);
  flag.add(st);
  flag.position.y = 9.2;
  g.add(flag);
  g.userData = { flag };
  return g;
}

// ================= 貼圖 =================
function canvasTex(size, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  draw(x, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function shade(hex, amt) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amt);
  return '#' + c.getHexString();
}
// 棋盤格地面（3D World 風格）
export function checkerTex(a, b, noise = 0.04) {
  return canvasTex(128, (x, s) => {
    const h = s / 2;
    [[0, 0, a], [h, 0, b], [0, h, b], [h, h, a]].forEach(([px, py, c]) => {
      x.fillStyle = c;
      x.fillRect(px, py, h, h);
    });
    for (let i = 0; i < 300; i++) {
      x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * noise})`;
      x.fillRect(Math.random() * s, Math.random() * s, 3, 3);
    }
  });
}
export function brickTex(base, mortar) {
  return canvasTex(128, (x, s) => {
    x.fillStyle = mortar;
    x.fillRect(0, 0, s, s);
    const rows = 4;
    const rh = s / rows;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? s / 4 : 0;
      for (let cI = -1; cI < 2; cI++) {
        x.fillStyle = shade(base, (Math.random() - 0.5) * 0.06);
        x.fillRect(off + cI * (s / 2) + 3, r * rh + 3, s / 2 - 6, rh - 6);
        x.fillStyle = 'rgba(255,255,255,0.15)';
        x.fillRect(off + cI * (s / 2) + 3, r * rh + 3, s / 2 - 6, 4);
      }
    }
  });
}
export function stripeTex(colors) {
  return canvasTex(128, (x, s) => {
    const w = s / colors.length;
    colors.forEach((c, i) => {
      x.fillStyle = c;
      x.fillRect(i * w, 0, w + 1, s);
    });
  });
}
export function qblockTex(used) {
  return canvasTex(128, (x, s) => {
    x.fillStyle = used ? '#9b6a3c' : '#ffc21a';
    x.fillRect(0, 0, s, s);
    x.strokeStyle = used ? '#6b4424' : '#c47a00';
    x.lineWidth = 8;
    x.strokeRect(4, 4, s - 8, s - 8);
    x.fillStyle = used ? '#6b4424' : '#c47a00';
    [[16, 16], [s - 16, 16], [16, s - 16], [s - 16, s - 16]].forEach(([px, py]) => {
      x.beginPath();
      x.arc(px, py, 5, 0, Math.PI * 2);
      x.fill();
    });
    if (!used) {
      x.save();
      x.translate(s / 2, s / 2 + 3);
      x.fillStyle = '#c47a00';
      drawStar(x, 34, 15);
      x.translate(-3, -4);
      x.fillStyle = '#ffffff';
      drawStar(x, 34, 15);
      x.restore();
    }
  }, false);
}
function drawStar(x, R, r) {
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r : R;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    x.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  x.closePath();
  x.fill();
}
export function glowTex() {
  return canvasTex(64, (x, s) => {
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
  }, false);
}
export function lavaTex() {
  return canvasTex(256, (x, s) => {
    x.fillStyle = '#ff4a00';
    x.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) {
      const r = 8 + Math.random() * 30;
      const px = Math.random() * s;
      const py = Math.random() * s;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, Math.random() < 0.5 ? 'rgba(255,230,80,0.9)' : 'rgba(160,20,0,0.6)');
      g.addColorStop(1, 'rgba(255,80,0,0)');
      x.fillStyle = g;
      x.fillRect(px - r, py - r, r * 2, r * 2);
    }
  });
}
