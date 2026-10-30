// お祝い演出：花びらの舞うオーバーレイ、チャイム音、振動、トースト

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const PETAL_COLORS = ['#F6B8C8', '#E0607E', '#F5C842', '#A68BD6', '#7DBA8F', '#F2A03D'];

let audioCtx = null;
export function unlockAudio() {
  // iOS は操作の中で AudioContext を作らないと鳴らないため、最初のタップで準備する
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* 音なしで続行 */ }
}

/** level: 'tick' | 'small' | 'big' | 'grand' */
export function chime(level) {
  if (!audioCtx) return;
  const notes = {
    tick: [1318.5],
    small: [784, 988, 1175],
    big: [523.3, 659.3, 784, 1046.5, 1318.5],
    grand: [523.3, 659.3, 784, 1046.5, 784, 1046.5, 1318.5, 1568],
  }[level];
  const t0 = audioCtx.currentTime + 0.02;
  const gap = level === 'tick' ? 0 : 0.12;
  notes.forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    const t = t0 + i * gap;
    const len = level === 'tick' ? 0.12 : 0.9;
    const vol = level === 'tick' ? 0.06 : 0.14;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + len + 0.05);
  });
}

export function buzz(pattern) {
  try { navigator.vibrate?.(pattern); } catch { /* 非対応 */ }
}

// ---- 花びらの雨（canvas） ----
let rafId = 0;
function petalRain(canvas, amount, seconds) {
  if (reduceMotion()) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => {
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const ps = Array.from({ length: amount }, () => ({
    x: Math.random() * innerWidth,
    y: -20 - Math.random() * innerHeight * 0.8,
    r: 5 + Math.random() * 7,
    vy: 1.2 + Math.random() * 2.2,
    sway: Math.random() * Math.PI * 2,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.08,
    c: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
  }));
  const end = performance.now() + seconds * 1000;
  cancelAnimationFrame(rafId);
  const step = (now) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let alive = false;
    for (const p of ps) {
      p.y += p.vy;
      p.sway += 0.03;
      p.x += Math.sin(p.sway) * 0.9;
      p.rot += p.vr;
      if (p.y > innerHeight + 20) {
        if (now < end) { p.y = -20; p.x = Math.random() * innerWidth; } else continue;
      }
      alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r * 0.55, p.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (alive) rafId = requestAnimationFrame(step);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  };
  rafId = requestAnimationFrame(step);
}

// ---- お祝いオーバーレイ（順番待ちあり） ----
const queue = [];
let els = null;

export function setupCelebrate(root) {
  els = {
    root,
    canvas: root.querySelector('canvas'),
    art: root.querySelector('[data-art]'),
    kicker: root.querySelector('[data-kicker]'),
    title: root.querySelector('[data-title]'),
    message: root.querySelector('[data-message]'),
    reward: root.querySelector('[data-reward]'),
    ok: root.querySelector('[data-ok]'),
    action: root.querySelector('[data-action]'),
  };
  els.ok.addEventListener('click', close);
  els.action.addEventListener('click', () => {
    const fn = queue[0]?.onAction;
    close();
    fn?.();
  });
  root.addEventListener('keydown', (e) => e.key === 'Escape' && close());
}

/**
 * @param {{ level:'small'|'big'|'grand', art:string, kicker:string, title:string, message:string,
 *           reward?:string, actionLabel?:string, onAction?:()=>void, sound:boolean, vibrate:boolean }} c
 */
export function celebrate(c) {
  queue.push(c);
  if (queue.length === 1) show();
}

function show() {
  const c = queue[0];
  if (!c) return;
  els.root.dataset.level = c.level;
  els.art.innerHTML = c.art;
  els.kicker.textContent = c.kicker;
  els.title.textContent = c.title;
  els.message.textContent = c.message;
  els.reward.hidden = !c.reward;
  els.reward.textContent = c.reward ? `ごほうび：${c.reward}` : '';
  els.action.hidden = !c.actionLabel;
  els.action.textContent = c.actionLabel || '';
  els.root.hidden = false;
  requestAnimationFrame(() => els.root.classList.add('show'));
  els.ok.focus({ preventScroll: true });
  const amount = { small: 40, big: 110, grand: 220 }[c.level];
  petalRain(els.canvas, amount, { small: 2.5, big: 5, grand: 9 }[c.level]);
  if (c.sound) chime(c.level);
  if (c.vibrate) buzz(c.level === 'small' ? [60, 40, 60] : [80, 60, 80, 60, 200]);
}

function close() {
  els.root.classList.remove('show');
  els.root.hidden = true;
  queue.shift();
  if (queue.length) setTimeout(show, 250);
}

// ---- トースト ----
let toastTimer = 0;
export function toast(el, text, ms = 2200) {
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ---- +1 がふわっと浮かぶ ----
export function floatUp(anchor, text) {
  if (reduceMotion()) return;
  const s = document.createElement('span');
  s.className = 'float-up';
  s.textContent = text;
  s.style.left = `${35 + Math.random() * 30}%`;
  anchor.append(s);
  setTimeout(() => s.remove(), 1200);
}
