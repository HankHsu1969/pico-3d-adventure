// 主控制：畫面切換、HUD、存檔、主迴圈
import { AudioSys } from './audio.js';
import { Input } from './input.js';
import { Game } from './game.js';
import { LEVELS } from './levels.js';

const $ = (id) => document.getElementById(id);
const audio = new AudioSys();
const input = new Input();
if (input.touchMode) document.body.classList.add('touch');

// ---------- 存檔 ----------
const SAVE_KEY = 'pico3d-save';
let save = { unlocked: 1, gems: {}, cleared: {} };
try { save = { ...save, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; } catch (e) { /* ignore */ }
const writeSave = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };

// ---------- HUD ----------
const HEART = (on) => `<svg viewBox="0 0 24 22"><path d="M12 21s-9-5.6-9-12.2C3 5 5.6 2.5 8.6 2.5c1.6 0 2.8.8 3.4 1.9.6-1.1 1.8-1.9 3.4-1.9C18.4 2.5 21 5 21 8.8 21 15.4 12 21 12 21z" fill="${on ? '#ff3b5c' : 'rgba(0,0,0,0.3)'}" stroke="#fff" stroke-width="2"/></svg>`;
const GEM = (on) => `<svg viewBox="0 0 24 24"><path d="M12 1.8l3 6.5 7 .8-5.2 4.8 1.5 7-6.3-3.6-6.3 3.6 1.5-7L2 9.1l7-.8z" fill="${on ? '#2ee88a' : 'rgba(255,255,255,0.18)'}" stroke="${on ? '#fff' : 'rgba(255,255,255,0.6)'}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
let hudCache = {};
function setHud(d) {
  const set = (id, v, html = false) => {
    if (hudCache[id] === v) return;
    hudCache[id] = v;
    if (html) $(id).innerHTML = v;
    else $(id).textContent = v;
  };
  set('hudLives', d.lives);
  set('hudCoins', d.coins);
  set('hudScore', String(d.score).padStart(7, '0'));
  set('hudHearts', [0, 1, 2].map((i) => HEART(i < d.hearts)).join('') + (d.feather ? '<span class="feather">🪶</span>' : ''), true);
  set('hudGems', d.gems.map(GEM).join(''), true);
}
function setBossHp(hp) {
  $('bossHp').innerHTML = [0, 1, 2].map((i) => `<i class="${i < hp ? '' : 'off'}"></i>`).join('');
}
let bannerTimer = 0;
function banner(text, kind) {
  if (kind === 'small') {
    const t = $('toast');
    t.textContent = text;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
    return;
  }
  const b = $('banner');
  b.className = '';
  b.innerHTML = kind === 'boss' ? `<div class="b-name">${text}</div>` : text;
  void b.offsetWidth;
  b.className = 'show' + (kind === 'boss' ? ' boss' : '');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => (b.className = ''), 2900);
  if (kind === 'boss') $('bossBar').classList.remove('hidden');
}

// ---------- 遊戲 ----------
const game = new Game($('c'), audio, input, {
  onHud: setHud,
  onBanner: banner,
  onBossHp: setBossHp,
  onClear: (r) => showClear(r),
  onEnding: (r) => showEnding(r),
  onGameOver: () => {
    audio.play('gameover');
    show('scrOver');
    setPlaying(false);
  },
  onLifeLost: (lives) => banner(`剩餘 ${lives} 條命`, 'small'),
});
input.bindTouch({
  zone: $('stickZone'), base: $('stickBase'), knob: $('stickKnob'),
  btnJump: $('btnJump'), btnRun: $('btnRun'), btnCamL: $('btnCamL'), btnCamR: $('btnCamR'),
});

let screen = 'scrTitle';
let playing = false;
let curLevel = 0;
let focusIdx = 0;

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('show', s.id === id));
  screen = id;
  focusIdx = 0;
  if (id === 'scrMap') {
    focusIdx = Math.min(save.unlocked, LEVELS.length) - 1;
    const pref = Number(sessionStorage.getItem('pico3d-lastlevel'));
    if (pref && pref <= save.unlocked) focusIdx = pref - 1;
  }
  if (id === 'scrClear') focusIdx = 0;
  updateFocus();
}
function hideScreens() {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('show'));
  screen = null;
}
function focusables() {
  if (!screen) return [];
  return [...$(screen).querySelectorAll('.btn:not(.hidden), .card:not(.locked)')];
}
function updateFocus() {
  const f = focusables();
  document.querySelectorAll('.focus').forEach((e) => e.classList.remove('focus'));
  if (!f.length) return;
  focusIdx = (focusIdx + f.length) % f.length;
  if (!input.touchMode) f[focusIdx].classList.add('focus');
  if (screen === 'scrMap') {
    const cards = f.filter((e) => e.classList.contains('card'));
    const el = f[focusIdx];
    if (el.classList.contains('card')) showMapInfo(Number(el.dataset.level));
    else if (cards.length) showMapInfo(Number(cards[cards.length - 1].dataset.level));
  }
}
function setPlaying(on) {
  playing = on;
  $('hud').classList.toggle('hidden', !on);
  $('btnPause').classList.toggle('hidden', !on);
  $('touch').classList.toggle('hidden', !on);
}

// ---------- 地圖 ----------
function buildMap() {
  const wrap = $('cards');
  wrap.innerHTML = '';
  LEVELS.forEach((L, i) => {
    const locked = L.id > save.unlocked;
    const gems = save.gems[L.id] || [false, false, false];
    const card = document.createElement('button');
    card.className = 'card' + (locked ? ' locked' : '');
    card.dataset.level = L.id;
    card.innerHTML = `
      <div class="thumb" style="background-image:url('${L.bg}')"><div class="num">${L.id}</div>${save.cleared[L.id] ? '<div class="clear-badge">CLEAR</div>' : ''}</div>
      <div class="meta"><div class="name">${L.name}</div><div class="en">${L.en}</div>
      <div class="stars">${gems.map((g) => `<span class="${g ? 'on' : ''}">★</span>`).join('')}</div></div>`;
    card.addEventListener('click', () => {
      if (locked) { audio.play('bump'); return; }
      audio.play('select');
      startLevel(i);
    });
    card.addEventListener('mouseenter', () => { if (!locked) { focusIdx = focusables().indexOf(card); updateFocus(); } });
    wrap.appendChild(card);
  });
  const total = Object.values(save.gems).reduce((s, g) => s + g.filter(Boolean).length, 0);
  $('mapGems').textContent = `★ ${total}/15`;
}
function showMapInfo(id) {
  const L = LEVELS[id - 1];
  $('mapInfo').innerHTML = `<b>世界 ${L.id}：${L.name}</b><br>${L.desc}`;
}

// ---------- 開始關卡 ----------
async function startLevel(i) {
  curLevel = i;
  sessionStorage.setItem('pico3d-lastlevel', LEVELS[i].id);
  hideScreens();
  $('loading').classList.remove('hidden');
  audio.stopMusic();
  await game.loadLevel(LEVELS[i]);
  $('loading').classList.add('hidden');
  $('bossBar').classList.add('hidden');
  setBossHp(3);
  hudCache = {};
  game.emitHud();
  setPlaying(true);
  input.clearQueues();
  const L = LEVELS[i];
  banner(`<div class="b-world">WORLD ${L.id}</div><div class="b-name">${L.name}</div><div class="b-go">GO!</div>`);
}

function showClear(r) {
  setPlaying(false);
  game.paused = true;
  const id = r.level.id;
  save.cleared[id] = true;
  const prev = save.gems[id] || [false, false, false];
  save.gems[id] = prev.map((g, k) => g || r.gems[k]);
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, id + 1));
  writeSave();
  $('clearResult').innerHTML = `
    <div class="gem-row">${r.gems.map((g) => `<span class="${g ? 'on' : ''}">★</span>`).join('')}</div>
    金幣 ${r.coins} 枚　｜　時間獎勵 +${r.timeBonus}<br>旗桿獎勵 +${r.poleBonus}　｜　總分 <b>${r.score}</b>`;
  $('btnNext').classList.toggle('hidden', id >= LEVELS.length);
  $('btnNext').textContent = id === LEVELS.length - 1 ? '前往熔岩城堡 ▶' : '下一關 ▶';
  show('scrClear');
  audio.playMusic('title');
}

function showEnding(r) {
  setPlaying(false);
  game.paused = true;
  const id = r.level.id;
  save.cleared[id] = true;
  const prev = save.gems[id] || [false, false, false];
  save.gems[id] = prev.map((g, k) => g || r.gems[k]);
  writeSave();
  const total = Object.values(save.gems).reduce((s, g) => s + g.filter(Boolean).length, 0);
  $('endResult').innerHTML = `星星寶石收集：<b>${total} / 15</b><br>最終分數：<b>${r.score}</b>${total === 15 ? '<br>🌟 完美收集！你是真正的冒險王！' : ''}`;
  show('scrEnding');
  audio.playMusic('ending');
}

function pause(on) {
  if (!playing && on) return;
  if (on) {
    if (game.P && game.P.state !== 'play') return;
    game.paused = true;
    audio.play('pause');
    $('tglMusic').textContent = `音樂：${audio.musicOn ? '開' : '關'}`;
    $('tglSfx').textContent = `音效：${audio.sfxOn ? '開' : '關'}`;
    show('scrPause');
  } else {
    hideScreens();
    game.paused = false;
    input.clearQueues();
  }
}

// ---------- 按鈕動作 ----------
function act(a) {
  audio.init();
  switch (a) {
    case 'start':
      audio.play('select');
      buildMap();
      show('scrMap');
      audio.playMusic('title');
      goFullscreen();
      break;
    case 'howto': audio.play('select'); show('scrHow'); break;
    case 'back': audio.play('move'); show('scrTitle'); break;
    case 'toTitle':
      audio.play('move');
      game.unloadLevel();
      setPlaying(false);
      show('scrTitle');
      audio.playMusic('title');
      break;
    case 'resume': pause(false); break;
    case 'restart':
      game.paused = true;
      startLevel(curLevel);
      break;
    case 'retry':
      game.lives = 5;
      startLevel(curLevel);
      break;
    case 'toMap':
      audio.play('move');
      if (screen === 'scrOver') game.lives = 5;
      game.unloadLevel();
      setPlaying(false);
      buildMap();
      show('scrMap');
      audio.playMusic('title');
      break;
    case 'next':
      audio.play('select');
      startLevel(Math.min(curLevel + 1, LEVELS.length - 1));
      break;
    case 'music':
      audio.setMusic(!audio.musicOn);
      $('tglMusic').textContent = `音樂：${audio.musicOn ? '開' : '關'}`;
      break;
    case 'sfx':
      audio.setSfx(!audio.sfxOn);
      $('tglSfx').textContent = `音效：${audio.sfxOn ? '開' : '關'}`;
      audio.play('select');
      break;
    default: break;
  }
}
document.querySelectorAll('[data-act]').forEach((b) => {
  b.addEventListener('click', (e) => { e.stopPropagation(); act(b.dataset.act); });
  b.addEventListener('mouseenter', () => { focusIdx = focusables().indexOf(b); updateFocus(); });
});
$('btnPause').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); pause(true); });
// 第一次互動時啟動音訊
['pointerdown', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, () => { audio.init(); if (screen === 'scrTitle' && !audio.songName) audio.playMusic('title'); }, { passive: true }));
addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') { input.setTouchMode(true); } else if (e.pointerType === 'mouse' && input.touchMode && !matchMedia('(pointer: coarse)').matches) input.setTouchMode(false); });

function goFullscreen() {
  if (!input.touchMode) return;
  const el = document.documentElement;
  const rq = el.requestFullscreen || el.webkitRequestFullscreen;
  if (rq && !document.fullscreenElement) {
    Promise.resolve(rq.call(el)).then(() => window.screen?.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  }
}

// 失去焦點 / 直立時自動暫停
document.addEventListener('visibilitychange', () => { if (document.hidden && playing && !game.paused) pause(true); });
const portrait = matchMedia('(orientation: portrait) and (pointer: coarse)');
portrait.addEventListener?.('change', () => { if (portrait.matches && playing && !game.paused) pause(true); });

// ---------- 選單鍵盤操作 ----------
function menuInput() {
  const nav = input.take('nav');
  const conf = input.take('confirm');
  const back = input.take('back');
  const f = focusables();
  if (nav && f.length) {
    const horiz = screen === 'scrMap';
    const d = horiz ? (input.navX || input.navY) : (input.navY || input.navX);
    focusIdx += d > 0 ? 1 : -1;
    input.navX = input.navY = 0;
    audio.play('move');
    updateFocus();
  }
  if (conf && f.length) f[Math.max(0, Math.min(f.length - 1, focusIdx))].click();
  if (back) {
    if (screen === 'scrPause') pause(false);
    else if (screen === 'scrHow') act('back');
    else if (screen === 'scrMap') act('toTitle');
  }
}

// ---------- 主迴圈 ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  input.update();
  if (playing && !game.paused) {
    if (input.take('pause')) pause(true);
    input.take('confirm');
    input.take('nav');
    input.take('back');
    game.update(dt);
    const t = Math.max(0, Math.ceil(game.level.time));
    if (hudCache.hudTime !== t) {
      hudCache.hudTime = t;
      $('hudTime').textContent = t;
      $('hudTime').style.color = t <= 60 ? '#ff6a6a' : '';
    }
  } else {
    if (screen === 'scrPause' && input.take('pause')) pause(false);
    else input.take('pause');
    menuInput();
    input.take('jump');
    input.take('cam');
  }
  if (game.world) game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 預先載入圖片
LEVELS.forEach((L) => { const i = new Image(); i.src = L.bg; });
['assets/ending.jpg', 'assets/hero_cut.png'].forEach((s) => { const i = new Image(); i.src = s; });

// 除錯用：?level=3 直接進入關卡
const qp = new URLSearchParams(location.search);
if (qp.get('level')) {
  const n = Math.max(1, Math.min(5, Number(qp.get('level'))));
  save.unlocked = Math.max(save.unlocked, n);
  startLevel(n - 1);
}
window.__game = game;
// 除錯用：以固定影格模擬按鍵
window.__sim = (codes, frames, pressJump = false) => {
  const inp = game.input;
  inp.keys.clear();
  codes.forEach((c) => inp.keys.add(c));
  if (pressJump) inp.q.jump++;
  for (let i = 0; i < frames; i++) { inp.update(); game.update(1 / 60); }
  inp.keys.clear();
  inp.update();
  game.render();
  const p = game.P;
  return { pos: p.pos.toArray().map((v) => +v.toFixed(2)), vy: +p.vel.y.toFixed(1), g: p.grounded, st: p.state, hearts: p.hearts, coins: game.level.coins, feather: p.feather, lives: game.lives, gems: game.level.gems.join() };
};
