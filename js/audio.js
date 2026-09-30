// 程序化音樂與音效（WebAudio），全部原創旋律，不需要外部音檔
const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return null;
  let n = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return n + (parseInt(m[3], 10) + 1) * 12;
}
const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

const CHORD_Q = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  dim: [0, 3, 6], sus4: [0, 5, 7], aug: [0, 4, 8],
};
function chord(sym) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(sym);
  let root = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  root = (root + 12) % 12;
  return { root, iv: CHORD_Q[m[3]] || CHORD_Q[''] };
}

// 每首歌：bpm、和弦（每個和弦佔半小節 = 4 個八分音符）、旋律（每個 token = 一個八分音符）
// token: 音名 = 新音符、'-' = 延長、'.' = 休止
const SONGS = {
  title: {
    bpm: 136, lead: 'square', leadVol: 0.16, bass: 'bounce', drums: 'pop', arp: 'up',
    chords: 'C C F F G G C C Am Am F F D7 D7 G G',
    melody: `G4 - C5 - E5 - G5 - | A5 - F5 - C6 - A5 - | B5 - G5 - D6 - B5 - | C6 - - - G5 - E5 - |
             A5 - C6 - E6 - C6 - | F6 - C6 - A5 - F5 - | F#5 - A5 - D6 - C6 - | B5 - - - G5 - - -`,
  },
  meadow: {
    bpm: 150, lead: 'square', leadVol: 0.15, bass: 'bounce', drums: 'pop', arp: 'updown',
    chords: 'C C Am Am F F G G C C Am Am Dm G C C',
    melody: `E5 - G5 - C6 - G5 E5 | A5 - G5 E5 C5 - D5 E5 | F5 - A5 - C6 - A5 F5 | G5 - - - D5 - . . |
             E5 G5 C6 G5 E5 G5 C6 E6 | D6 - C6 - A5 - E5 - | F5 - E5 D5 G5 - B5 - | C6 - - - . . G4 B4`,
  },
  desert: {
    bpm: 124, lead: 'sawtooth', leadVol: 0.1, bass: 'walk', drums: 'tribal', arp: 'up',
    chords: 'Dm Dm Dm Bb A A Dm Dm Gm Gm Dm Dm A7 A7 Dm Dm',
    melody: `D5 - E5 F5 E5 - D5 - | A5 - - G5 F5 E5 D5 - | C#5 - D5 E5 F5 - E5 - | D5 - - - . . A4 - |
             Bb5 - A5 G5 A5 - F5 - | G5 - F5 E5 F5 - D5 - | E5 - F5 G5 A5 - C#6 - | D6 - - - A5 - . .`,
  },
  snow: {
    bpm: 112, lead: 'bell', leadVol: 0.22, bass: 'soft', drums: 'soft', arp: 'bell',
    chords: 'F F Dm Dm Bb Bb C C F F Am Am Bb C F F',
    melody: `A5 - C6 - F5 - A5 - | D6 - C6 A5 F5 - D5 - | Bb5 - D6 - F6 - D6 - | C6 - - - G5 - E5 - |
             F5 A5 C6 F6 E6 - C6 - | E6 - D6 C6 A5 - E5 - | D6 - Bb5 - C6 - E6 - | F6 - - - . . . .`,
  },
  sky: {
    bpm: 132, lead: 'triangle', leadVol: 0.28, bass: 'bounce', drums: 'pop', arp: 'updown',
    chords: 'G G A A Em Em C C G G A A C D G G',
    melody: `B5 - D6 - G5 - A5 B5 | C#6 - - B5 A5 - E5 - | G5 - B5 - E6 - D6 - | C6 - E6 - G5 - - - |
             D6 B5 G5 B5 D6 G6 F#6 D6 | E6 - C#6 - A5 - C#6 - | E6 - D6 C6 F#6 - A6 - | G6 - - - D6 - B5 -`,
  },
  castle: {
    bpm: 144, lead: 'sawtooth', leadVol: 0.1, bass: 'drive', drums: 'march', arp: 'up',
    chords: 'Cm Cm Ab Ab Bb Bb G G Cm Cm Fm Fm Ab G Cm Cm',
    melody: `C5 . C5 Eb5 G5 - F5 Eb5 | Ab5 - G5 F5 Eb5 - C5 - | D5 . D5 F5 Bb5 - Ab5 G5 | G5 - B4 - D5 - G5 - |
             C6 - Bb5 G5 Eb5 - G5 - | F5 - Ab5 - C6 - Ab5 F5 | Eb5 - F5 - D5 - B4 - | C5 - - - G4 - - -`,
  },
  boss: {
    bpm: 172, lead: 'square', leadVol: 0.13, bass: 'drive', drums: 'rock', arp: 'up',
    chords: 'Em Em C D Em Em B B Em Em C D Am B Em Em',
    melody: `E5 E5 G5 E5 B5 - A5 G5 | C6 - B5 A5 D6 - C6 B5 | E5 E5 G5 E5 B5 - E6 - | D#6 - B5 - F#5 - D#5 - |
             G5 G5 B5 G5 E6 - D6 C6 | C6 - B5 A5 D6 - F#6 - | A5 - C6 - B5 - D#6 - | E6 - - - B5 - E5 -`,
  },
  ending: {
    bpm: 110, lead: 'triangle', leadVol: 0.3, bass: 'soft', drums: 'soft', arp: 'bell',
    chords: 'C C G G Am Am Em Em F F C C F G C C',
    melody: `E5 - - D5 C5 - G4 - | D5 - - E5 F5 - D5 - | E5 - - F5 G5 - A5 - | B5 - G5 - E5 - - - |
             A5 - - G5 F5 - A5 - | G5 - - E5 C5 - E5 - | F5 - A5 - D6 - B5 - | C6 - - - - - . .`,
  },
};

const BASS = {
  bounce: [0, null, 12, null, 7, null, 12, null],
  walk: [0, null, 7, null, 12, null, 7, 5],
  soft: [0, null, null, null, 7, null, null, null],
  drive: [0, 0, 12, 0, 0, 0, 12, 0],
};
const DRUMS = {
  pop: { k: 'x...x...', s: '..x...x.', h: 'x.x.x.x.' },
  tribal: { k: 'x..x..x.', s: '....x...', h: '.x.x.x.x' },
  soft: { k: 'x.......', s: '....x...', h: '..x...x.' },
  march: { k: 'x...x...', s: '..x.xx.x', h: 'xxxxxxxx' },
  rock: { k: 'x.x.x.x.', s: '..x...x.', h: 'xxxxxxxx' },
};

function parseSong(s) {
  const mel = s.melody.replace(/\|/g, ' ').trim().split(/\s+/);
  const chords = s.chords.trim().split(/\s+/).map(chord);
  // 預先把旋律轉成 { step, midi, len }
  const notes = [];
  for (let i = 0; i < mel.length; i++) {
    const t = mel[i];
    if (t === '-' || t === '.') continue;
    let len = 1;
    while (mel[i + len] === '-') len++;
    notes[i] = { m: midi(t), len };
  }
  return { ...s, len: mel.length, notes, chordList: chords };
}
for (const k in SONGS) SONGS[k] = parseSong(SONGS[k]);

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.musicOn = true;
    this.sfxOn = true;
    this.song = null;
    this.songName = null;
    this.timer = null;
    try {
      const saved = JSON.parse(localStorage.getItem('pico3d-audio') || '{}');
      if (saved.musicOn === false) this.musicOn = false;
      if (saved.sfxOn === false) this.sfxOn = false;
    } catch (e) { /* ignore */ }
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(comp);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.55 : 0;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxOn ? 0.8 : 0;
    this.sfxBus.connect(this.master);
    // 噪音 buffer（鼓、爆破）
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (this.pendingSong) {
      const n = this.pendingSong;
      this.pendingSong = null;
      this.playMusic(n);
    }
  }

  savePrefs() {
    try { localStorage.setItem('pico3d-audio', JSON.stringify({ musicOn: this.musicOn, sfxOn: this.sfxOn })); } catch (e) { /* ignore */ }
  }
  setMusic(on) {
    this.musicOn = on;
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05);
    this.savePrefs();
  }
  setSfx(on) {
    this.sfxOn = on;
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05);
    this.savePrefs();
  }

  // ---------- 基本合成 ----------
  tone(f, t, dur, { type = 'square', vol = 0.2, dest, attack = 0.005, release = 0.08, slideTo, vibrato = 0, lp } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    let node = o;
    if (lp) {
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = lp;
      o.connect(fl);
      node = fl;
    }
    if (vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.value = f * vibrato;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t + 0.08);
      lfo.stop(t + dur + release + 0.05);
    }
    node.connect(g).connect(dest || this.sfxBus);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - 0.01));
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur + release);
    o.start(t);
    o.stop(t + dur + release + 0.05);
  }
  bell(f, t, dur, vol, dest) {
    // 鐘聲：正弦 + 泛音，快速衰減
    const ctx = this.ctx;
    [[1, 1], [2.01, 0.4], [3.98, 0.15]].forEach(([mul, v]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f * mul;
      o.connect(g).connect(dest || this.sfxBus);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * v, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0008, t + Math.max(0.25, dur * 1.6));
      o.start(t);
      o.stop(t + dur * 1.6 + 0.3);
    });
  }
  noiseHit(t, dur, { vol = 0.3, hp = 0, lp = 0, dest, bp = 0 } = {}) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    let node = s;
    const addF = (type, fr) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = fr;
      node.connect(f);
      node = f;
    };
    if (hp) addF('highpass', hp);
    if (lp) addF('lowpass', lp);
    if (bp) addF('bandpass', bp);
    const g = ctx.createGain();
    node.connect(g).connect(dest || this.sfxBus);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }
  kick(t, dest) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    o.connect(g).connect(dest);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.start(t);
    o.stop(t + 0.2);
  }

  // ---------- 音樂 ----------
  playMusic(name) {
    if (!this.ctx) {
      this.pendingSong = name;
      return;
    }
    if (this.songName === name && this.timer) return;
    this.stopMusic();
    this.songName = name;
    this.song = SONGS[name];
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.songGain = this.ctx.createGain();
    this.songGain.gain.value = 1;
    this.songGain.connect(this.musicBus);
    this.timer = setInterval(() => this._schedule(), 25);
  }
  stopMusic(fade = 0.15) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.songName = null;
    if (this.songGain && this.ctx) {
      const g = this.songGain;
      g.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3);
      setTimeout(() => g.disconnect(), fade * 1000 + 400);
    }
    this.songGain = null;
  }
  _schedule() {
    const ctx = this.ctx;
    const s = this.song;
    if (!s || !this.songGain) return;
    const spb = 60 / s.bpm / 2;
    // 分頁切走時避免一次補排一大堆
    if (this.nextTime < ctx.currentTime - 0.3) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.15) {
      this._playStep(this.step, this.nextTime, spb);
      this.nextTime += spb;
      this.step = (this.step + 1) % s.len;
    }
  }
  _playStep(i, t, spb) {
    const s = this.song;
    const dest = this.songGain;
    const n = s.notes[i];
    if (n) {
      const dur = n.len * spb * 0.92;
      if (s.lead === 'bell') this.bell(freq(n.m), t, dur, s.leadVol, dest);
      else this.tone(freq(n.m), t, dur, { type: s.lead, vol: s.leadVol, dest, release: 0.06, vibrato: n.len > 2 ? 0.012 : 0, lp: s.lead === 'sawtooth' ? 2600 : 0 });
    }
    const ch = s.chordList[Math.floor(i / 4) % s.chordList.length];
    const bar = i % 8;
    // 低音
    const bp = BASS[s.bass][bar];
    if (bp !== null && bp !== undefined) {
      const m = 36 + ch.root + bp;
      this.tone(freq(m), t, spb * (s.bass === 'soft' ? 3.5 : 0.85), { type: 'triangle', vol: 0.32, dest, release: 0.05 });
    }
    // 琶音
    if (s.arp) {
      const iv = ch.iv;
      let idx;
      if (s.arp === 'updown') {
        const seq = [0, 1, 2, 1];
        idx = seq[i % 4] % iv.length;
      } else idx = i % iv.length;
      const m = 60 + ch.root + iv[idx] + (ch.root > 6 ? -12 : 0);
      if (s.arp === 'bell') {
        if (i % 2 === 0) this.bell(freq(m + 12), t, spb, 0.05, dest);
      } else this.tone(freq(m), t, spb * 0.5, { type: 'triangle', vol: 0.06, dest, release: 0.03 });
    }
    // 鼓
    const dr = DRUMS[s.drums];
    if (dr) {
      if (dr.k[bar] === 'x') this.kick(t, dest);
      if (dr.s[bar] === 'x') this.noiseHit(t, 0.12, { vol: 0.22, bp: 1800, dest });
      if (dr.h[bar] === 'x') this.noiseHit(t, 0.03, { vol: 0.07, hp: 7000, dest });
    }
  }

  // ---------- 音效 ----------
  play(name) {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.ctx.currentTime + 0.005;
    const T = (f, d, o) => this.tone(f, t + (o?.at || 0), d, o);
    switch (name) {
      case 'jump': T(300, 0.14, { type: 'square', vol: 0.12, slideTo: 700 }); break;
      case 'jump2': T(420, 0.16, { type: 'square', vol: 0.12, slideTo: 1100 }); T(840, 0.1, { type: 'triangle', vol: 0.08, at: 0.05, slideTo: 1600 }); break;
      case 'coin': T(988, 0.06, { type: 'square', vol: 0.1 }); T(1319, 0.22, { type: 'square', vol: 0.1, at: 0.06 }); break;
      case 'stomp': T(600, 0.12, { type: 'square', vol: 0.15, slideTo: 120 }); this.noiseHit(t, 0.1, { vol: 0.15, lp: 1200 }); break;
      case 'bump': T(160, 0.08, { type: 'triangle', vol: 0.3, slideTo: 90 }); break;
      case 'break': this.noiseHit(t, 0.25, { vol: 0.35, lp: 2500 }); T(200, 0.12, { type: 'square', vol: 0.1, slideTo: 60 }); break;
      case 'item': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => T(f, 0.07, { type: 'triangle', vol: 0.18, at: i * 0.06 })); break;
      case 'powerup': [392, 494, 587, 784, 988, 1175, 1568].forEach((f, i) => T(f, 0.08, { type: 'square', vol: 0.1, at: i * 0.055 })); break;
      case 'heart': [659, 784, 1047].forEach((f, i) => T(f, 0.1, { type: 'triangle', vol: 0.2, at: i * 0.08 })); break;
      case 'hurt': T(700, 0.3, { type: 'square', vol: 0.14, slideTo: 150 }); break;
      case 'lose-power': [880, 660, 440, 330].forEach((f, i) => T(f, 0.08, { type: 'square', vol: 0.1, at: i * 0.07 })); break;
      case '1up': [659, 784, 1319, 1047, 1175, 1568].forEach((f, i) => T(f, 0.09, { type: 'square', vol: 0.1, at: i * 0.085 })); break;
      case 'gem':
        [1047, 1319, 1568, 2093, 1568, 2093, 2637].forEach((f, i) => this.bell(f, t + i * 0.07, 0.2, 0.18));
        break;
      case 'spring': T(200, 0.35, { type: 'triangle', vol: 0.3, slideTo: 1200, vibrato: 0.05 }); break;
      case 'checkpoint': [784, 988, 1175, 1568].forEach((f, i) => this.bell(f, t + i * 0.09, 0.3, 0.16)); break;
      case 'fire': this.noiseHit(t, 0.25, { vol: 0.2, bp: 900 }); T(300, 0.2, { type: 'sawtooth', vol: 0.06, slideTo: 80 }); break;
      case 'thud': T(90, 0.25, { type: 'sine', vol: 0.5, slideTo: 40 }); this.noiseHit(t, 0.3, { vol: 0.3, lp: 400 }); break;
      case 'boss-hit': T(500, 0.4, { type: 'sawtooth', vol: 0.14, slideTo: 80, lp: 2000 }); this.noiseHit(t, 0.2, { vol: 0.25, lp: 1500 }); break;
      case 'roar': T(110, 0.9, { type: 'sawtooth', vol: 0.18, slideTo: 70, vibrato: 0.08, lp: 900 }); this.noiseHit(t, 0.8, { vol: 0.15, lp: 700 }); break;
      case 'lava': this.noiseHit(t, 0.4, { vol: 0.3, lp: 900 }); T(800, 0.4, { type: 'square', vol: 0.12, slideTo: 200 }); break;
      case 'select': T(880, 0.05, { type: 'square', vol: 0.08 }); T(1320, 0.07, { type: 'square', vol: 0.08, at: 0.05 }); break;
      case 'move': T(660, 0.04, { type: 'square', vol: 0.06 }); break;
      case 'pause': T(1047, 0.06, { type: 'square', vol: 0.1 }); T(784, 0.06, { type: 'square', vol: 0.1, at: 0.07 }); T(1047, 0.1, { type: 'square', vol: 0.1, at: 0.14 }); break;
      case 'pole': T(300, 0.9, { type: 'square', vol: 0.1, slideTo: 1400 }); break;
      case 'clear':
        this.jingle([['G4', 1], ['C5', 1], ['E5', 1], ['G5', 2], ['E5', 1], ['G5', 4], ['A5', 1], ['B5', 1], ['C6', 6]], 0.1, 'square', 0.13);
        break;
      case 'bigclear':
        this.jingle([['C5', 1], ['E5', 1], ['G5', 1], ['C6', 3], ['A5', 1], ['C6', 1], ['D6', 1], ['E6', 3], ['D6', 1], ['E6', 1], ['F6', 1], ['G6', 8]], 0.11, 'square', 0.13);
        break;
      case 'die':
        this.jingle([['B4', 1], ['F5', 2], ['F5', 1], ['F5', 1.5], ['E5', 1.5], ['D5', 1.5], ['C5', 3]], 0.12, 'square', 0.13);
        break;
      case 'gameover':
        this.jingle([['C5', 2], ['G4', 2], ['E4', 3], ['A4', 1.5], ['B4', 1.5], ['A4', 1.5], ['G#4', 2], ['A#4', 2], ['G#4', 2], ['G4', 6]], 0.12, 'triangle', 0.25);
        break;
      default: break;
    }
  }
  jingle(seq, unit, type, vol) {
    if (!this.ctx || !this.sfxOn) return;
    let t = this.ctx.currentTime + 0.02;
    for (const [n, l] of seq) {
      const f = freq(midi(n));
      this.tone(f, t, unit * l * 0.9, { type, vol, release: 0.08 });
      this.tone(f / 2, t, unit * l * 0.9, { type: 'triangle', vol: vol * 1.4, release: 0.08 });
      t += unit * l;
    }
  }
}
