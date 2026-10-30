// お祝い演出：花びらの雨、お祝いの画面、1,000回ごとのお知らせ、100回ごとのひとこと、音、振動、トースト

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const PETAL_COLORS = ['#F6B8C8', '#E0607E', '#F5C842', '#A68BD6', '#7DBA8F', '#F2A03D'];
const GOLD_COLORS = ['#F5C842', '#FAC775', '#E8A93A', '#FFF1B8'];

// ---- 音 ----
let audioCtx = null;
export function unlockAudio() {
  // iOS は操作の中で AudioContext を作らないと鳴らないため、最初のタップで準備する
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* 音なしで続行 */ }
}

const C5 = 523.3, D5 = 587.3, E5 = 659.3, G5 = 784, A5 = 880, B5 = 987.8;
const C6 = 1046.5, E6 = 1318.5, G6 = 1568, C7 = 2093;
// [周波数, 開始(秒), 長さ(秒), 音量]
const arp = (fs, gap, len = 0.9, vol = 0.13, start = 0) => fs.map((f, i) => [f, start + i * gap, len, vol]);
const chord = (fs, at, len, vol) => fs.map((f) => [f, at, len, vol]);
const SONGS = {
  tick: [[E6, 0, 0.12, 0.06]],
  cheer: arp([C6, E6], 0.08, 0.45, 0.08),
  kiriban: arp([G5, B5, D5 * 2], 0.1, 0.8, 0.11),
  small: arp([G5, B5, 1175], 0.12),
  big: [...arp([C5, E5, G5, C6, E6], 0.12), ...chord([C6, E6, G6], 0.75, 1.6, 0.06)],
  bouquet: [
    ...arp([C5, E5, G5, C6], 0.11), ...arp([D5, G5, B5, D5 * 2], 0.11, 0.9, 0.12, 0.5),
    ...arp([E5, A5, C6, E6], 0.11, 0.9, 0.12, 1.0), ...chord([C5, G5, C6, E6, G6], 1.55, 2.4, 0.06),
  ],
  miracle: [
    ...arp([C5, E5, G5, C6, E6, G6], 0.13, 0.9, 0.12),
    ...arp([A5, C6, E6, A5 * 2], 0.13, 0.9, 0.11, 0.9),
    ...arp([G5, B5, D5 * 2, G6], 0.13, 0.9, 0.11, 1.5),
    ...chord([C5, E5, G5, C6, E6, G6], 2.15, 3.6, 0.055),
    ...arp([C7, G6, E6, G6, C7], 0.16, 1.2, 0.05, 3.0),
  ],
};

export function chime(song) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime + 0.02;
  for (const [f, at, len, vol] of SONGS[song]) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    const t = t0 + at;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + len + 0.05);
  }
}

export function buzz(pattern) {
  try { navigator.vibrate?.(pattern); } catch { /* 非対応 */ }
}

// ---- 花びらと星の雨（画面全体の canvas。どの演出からも使う） ----
let rain = null;
let rafId = 0;
let particles = [];
let rainEnd = 0;

export function setupRain(canvas) {
  rain = canvas;
}

/** amount 枚を seconds 秒降らせる。gold: 0〜1 で金色の星の割合 */
function petalRain(amount, seconds, gold = 0) {
  if (reduceMotion() || !rain) return;
  const ctx = rain.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  rain.width = innerWidth * dpr;
  rain.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const star = () => Math.random() < gold;
  particles = particles.concat(Array.from({ length: amount }, () => {
    const isStar = star();
    return {
      x: Math.random() * innerWidth,
      y: -20 - Math.random() * innerHeight * 0.8,
      r: isStar ? 4 + Math.random() * 5 : 5 + Math.random() * 7,
      vy: 1.2 + Math.random() * 2.2,
      sway: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.08,
      star: isStar,
      c: (isStar ? GOLD_COLORS : PETAL_COLORS)[Math.floor(Math.random() * (isStar ? GOLD_COLORS : PETAL_COLORS).length)],
    };
  }));
  rainEnd = Math.max(rainEnd, performance.now() + seconds * 1000);
  cancelAnimationFrame(rafId);
  const step = (now) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    particles = particles.filter((p) => {
      p.y += p.vy;
      p.sway += 0.03;
      p.x += Math.sin(p.sway) * 0.9;
      p.rot += p.vr;
      if (p.y > innerHeight + 20) {
        if (now >= rainEnd) return false;
        p.y = -20;
        p.x = Math.random() * innerWidth;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      if (p.star) {
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI / 4) * i;
          const rr = i % 2 ? p.r * 0.3 : p.r;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
      } else {
        ctx.ellipse(0, 0, p.r * 0.55, p.r, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
      return true;
    });
    if (particles.length) rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
}

// ---- お祝いの画面（順番待ちあり） ----
const queue = [];
let els = null;

export function setupCelebrate(root) {
  els = {
    root,
    art: root.querySelector('[data-art]'),
    kicker: root.querySelector('[data-kicker]'),
    title: root.querySelector('[data-title]'),
    message: root.querySelector('[data-message]'),
    reward: root.querySelector('[data-reward]'),
    ok: root.querySelector('[data-ok]'),
    action: root.querySelector('[data-action]'),
  };
  els.ok.addEventListener('click', () => close());
  els.action.addEventListener('click', () => close(queue[0]?.onAction));
  root.addEventListener('keydown', (e) => e.key === 'Escape' && close());
}

const LEVELS = {
  // 雨の量・秒数・金色の割合・曲・振動
  small: { amount: 40, seconds: 2.5, gold: 0, song: 'small', buzz: [60, 40, 60] },
  big: { amount: 110, seconds: 5, gold: 0.25, song: 'big', buzz: [80, 60, 80, 60, 200] },
  bouquet: { amount: 170, seconds: 8, gold: 0.4, song: 'bouquet', buzz: [100, 60, 100, 60, 100, 60, 300] },
  miracle: { amount: 240, seconds: 14, gold: 0.5, song: 'miracle', buzz: [120, 80, 120, 80, 120, 80, 500, 120, 500] },
};

/**
 * @param {{ level:'small'|'big'|'bouquet'|'miracle', art:string, kicker:string, title:string, message:string,
 *           reward?:string, okLabel?:string, actionLabel?:string, onAction?:()=>void, onClose?:()=>void,
 *           sound:boolean, vibrate:boolean }} c
 */
export function celebrate(c) {
  queue.push(c);
  if (queue.length === 1) show();
}

export function isCelebrating() {
  return queue.length > 0;
}

function show() {
  const c = queue[0];
  if (!c) return;
  const lv = LEVELS[c.level];
  els.root.dataset.level = c.level;
  els.art.innerHTML = c.art;
  els.kicker.textContent = c.kicker;
  els.title.textContent = c.title;
  els.message.textContent = c.message;
  els.reward.hidden = !c.reward;
  els.reward.textContent = c.reward ? `ごほうび：${c.reward}` : '';
  els.action.hidden = !c.actionLabel;
  els.action.textContent = c.actionLabel || '';
  els.ok.textContent = c.okLabel || 'うれしい！';
  // 文章が読めるよう、お祝いの画面の間は雨をカードの後ろ（暗い背景の上）に降らせる
  if (rain) els.root.prepend(rain);
  els.root.hidden = false;
  requestAnimationFrame(() => els.root.classList.add('show'));
  els.ok.focus({ preventScroll: true });
  petalRain(lv.amount, lv.seconds, lv.gold);
  if (c.sound) chime(lv.song);
  if (c.vibrate) buzz(lv.buzz);
}

function close(then) {
  const c = queue[0];
  els.root.classList.remove('show');
  els.root.hidden = true;
  if (rain) document.body.append(rain);
  queue.shift();
  c?.onClose?.();
  then?.();
  if (queue.length) setTimeout(show, 250);
}

// ---- 1,000回ごとのお知らせ（上から降りてくる。数える手は止めない） ----
let bannerTimer = 0;
export function banner(el, { art, title, message, sound, vibrate }) {
  el.querySelector('[data-art]').innerHTML = art;
  el.querySelector('[data-title]').textContent = title;
  el.querySelector('[data-message]').textContent = message;
  el.hidden = false;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    el.classList.remove('show');
    bannerTimer = setTimeout(() => { el.hidden = true; }, 400);
  }, 3800);
  petalRain(30, 2.5, 0.3);
  if (sound) chime('kiriban');
  if (vibrate) buzz([50, 40, 50]);
}

// ---- 100回ごとのひとこと（まるの上に「200回！」。キラキラ多め） ----
export function cheer(anchor, text, { sound, vibrate }) {
  if (sound) chime('cheer');
  if (vibrate) buzz(30);
  if (reduceMotion()) return;
  const s = document.createElement('span');
  s.className = 'cheer';
  s.textContent = text;
  anchor.append(s);
  setTimeout(() => s.remove(), 1700);
  sparkleBurst(anchor, undefined, undefined, { count: 14, spread: 2 });
}

// ---- トースト ----
let toastTimer = 0;
export function toast(el, text, ms = 2200) {
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ---- タップしたところから小さなキラキラが広がる ----
// x, y は anchor の左上からの位置。省略すると中心
const SPARKLE_COLORS = ['#F5C842', '#F6B8C8', '#FAC775', '#F4C0D1'];
const STAR = 'M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8Z';

export function sparkleBurst(anchor, x, y, { count = 7, spread = 1 } = {}) {
  if (reduceMotion()) return;
  x ??= anchor.clientWidth / 2;
  y ??= anchor.clientHeight / 2;
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const dist = (22 + Math.random() * 26) * spread;
    const size = 8 + Math.random() * 5;
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true"><path d="${STAR}" fill="${SPARKLE_COLORS[i % SPARKLE_COLORS.length]}"/></svg>`;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty('--dx', `${Math.cos(a) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * dist}px`);
    s.style.animationDuration = `${0.7 + Math.random() * 0.25}s`;
    anchor.append(s);
    setTimeout(() => s.remove(), 1000);
  }
}

// ---- ことばがふわっと浮かぶ ----
export function floatUp(anchor, text) {
  if (reduceMotion()) return;
  const s = document.createElement('span');
  s.className = 'float-up';
  s.textContent = text;
  s.style.left = `${35 + Math.random() * 30}%`;
  anchor.append(s);
  setTimeout(() => s.remove(), 1200);
}
