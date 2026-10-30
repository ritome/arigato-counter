import {
  GOAL, FLOWER_STEP, FLOWER_COUNT, STORAGE_KEY, load, save, add, undo, reset, totalOf, bloomedCount, dayKey, normalize,
} from './store.js';
import { crossed, EARLY } from './milestones.js';
import { FLOWERS, flowerSVG, budSVG, ICONS } from './flowers.js';
import { renderWeek } from './chart.js';
import { createListener, isSupported } from './speech.js';
import { setupCelebrate, celebrate, toast, floatUp, sparkleBurst, unlockAudio, chime, buzz } from './celebrate.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString('ja-JP');

const FLOWER_MESSAGES = {
  1: '最初の1輪！ 1万回のありがとうが、花になりました。',
  10: '10輪目。10万回のありがとうが、たくさんの人に届いています。',
  25: '25輪目、ちょうど折り返し！ 花畑のまんなかまで来ました。',
  40: '40輪目。ここまで続けてきたこと、ほんとうにすごい。',
  49: '49輪目。残るはあと1輪、ありがとうの大輪だけです。',
};

let state = load();

// ---------- 描画 ----------
function render() {
  const total = totalOf(state);
  const today = new Date();
  const bloomed = bloomedCount(total);

  $('date').textContent = today.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  $('total').textContent = fmt(total);
  $('today').textContent = fmt(state.days[dayKey(today)] || 0);
  $('bloomed').textContent = bloomed;

  const pct = Math.min(100, (total / GOAL) * 100);
  $('goalPct').textContent = `${pct >= 100 ? 100 : pct.toFixed(pct < 10 ? 2 : 1)}%`;
  $('goalFill').style.width = `${pct}%`;

  const inStep = bloomed >= FLOWER_COUNT ? FLOWER_STEP : total % FLOWER_STEP;
  $('ringProg').setAttribute('stroke-dashoffset', String(100 - (inStep / FLOWER_STEP) * 100));
  $('ringProg').style.opacity = inStep ? 1 : 0;
  $('nextText').innerHTML = bloomed >= FLOWER_COUNT
    ? '<b>満開！</b> 50万回のありがとう、おめでとうございます'
    : `次の花 <span class="flower-name">${FLOWERS[bloomed][0]}</span> まで あと <b>${fmt((bloomed + 1) * FLOWER_STEP - total)}</b> 回`;

  const last = state.log[state.log.length - 1];
  $('undoBtn').disabled = !last;
  $('undoBtn').textContent = last && last.n > 1 ? `ひとつ戻す（−${fmt(last.n)}）` : 'ひとつ戻す';

  const weekSum = renderWeek($('week'), state.days, today);
  $('weekSum').textContent = `合計 ${fmt(weekSum)} 回`;
  renderGarden(total, bloomed);
}

function renderGarden(total, bloomed) {
  const g = $('garden');
  if (g.children.length !== FLOWER_COUNT) {
    g.innerHTML = '';
    for (let m = 1; m <= FLOWER_COUNT; m++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'plot';
      b.dataset.m = m;
      b.addEventListener('click', () => openReward(m));
      g.append(b);
    }
  }
  for (const b of g.children) {
    const m = Number(b.dataset.m);
    const open = m <= bloomed;
    const isNext = m === bloomed + 1;
    const key = open ? 'open' : isNext ? `next-${Math.floor(((total % FLOWER_STEP) / FLOWER_STEP) * 10)}` : 'seed';
    const hasMemo = Boolean(state.rewards[m]);
    if (b.dataset.key === key + hasMemo) continue;
    b.dataset.key = key + hasMemo;
    b.className = `plot ${open ? 'bloom' : isNext ? 'next' : 'seed'}${hasMemo ? ' memo' : ''}`;
    b.innerHTML = open ? flowerSVG(m - 1) : isNext ? budSVG((total % FLOWER_STEP) / FLOWER_STEP) : '';
    b.setAttribute('aria-label', open
      ? `${m}輪目 ${FLOWERS[m - 1][0]}（${fmt(m * FLOWER_STEP)}回）${hasMemo ? '・ごほうびメモあり' : ''}`
      : `${m}輪目（${fmt(m * FLOWER_STEP)}回で咲く）${hasMemo ? '・ごほうびメモあり' : ''}`);
  }
}

function pop() {
  const n = $('total');
  n.classList.remove('pop');
  void n.offsetWidth;
  n.classList.add('pop');
}

// ---------- 数える ----------
/** point: タップした位置（tapBtn の左上から）。なければまるの中心からキラキラが出る */
function count(n, source, point) {
  const r = add(state, n, source);
  if (!r) return;
  save(state);
  render();
  pop();
  if (source === 'bulk') {
    floatUp($('tapBtn'), `+${fmt(n)}`);
  } else {
    sparkleBurst($('tapBtn'), point?.x, point?.y);
    floatUp($('tapBtn'), 'ありがとう');
  }
  requestPersistence();
  announce(r.from, r.to);
}

function announce(from, to) {
  const events = crossed(from, to);
  if (!events.length) return;
  const top = events[0];
  const opts = { sound: state.settings.sound, vibrate: state.settings.vibrate };

  if (top.kind === 'goal') {
    celebrate({
      ...opts, level: 'grand', art: flowerSVG(49, 'spin'), kicker: '500,000回 達成',
      title: '花畑が満開です！',
      message: '50輪すべての花が咲きました。50万回のありがとう、本当におめでとうございます。',
      reward: state.rewards[50],
    });
  } else if (top.kind === 'flower') {
    const flowers = events.filter((e) => e.kind === 'flower');
    const m = top.flower;
    celebrate({
      ...opts, level: 'big', art: flowerSVG(m - 1, 'spin'),
      kicker: `${fmt(top.at)}回 ・ ${m}輪目`,
      title: `「${FLOWERS[m - 1][0]}」が咲きました`,
      message: flowers.length > 1
        ? `一度に${flowers.length}輪の花が咲きました。花畑がにぎやかになりましたね。`
        : FLOWER_MESSAGES[m] || `${fmt(top.at)}回のありがとうが、${m}輪目の花になりました。`,
      reward: state.rewards[m],
      actionLabel: state.rewards[m] ? '' : 'ごほうびを決める',
      onAction: () => openReward(m),
    });
  } else if (top.kind === 'early') {
    const e = EARLY[top.at];
    celebrate({
      ...opts, level: 'small', art: ICONS[e.icon], kicker: 'おめでとう',
      title: e.title, message: e.message,
    });
  } else {
    toast($('toast'), `🎉 ${fmt(top.at)}回 キリ番！`);
    if (opts.sound) chime('small');
    if (opts.vibrate) buzz(40);
  }
}

$('tapBtn').addEventListener('click', (e) => {
  unlockAudio();
  // キーボード操作（detail === 0）のときは中心から
  const rect = e.currentTarget.getBoundingClientRect();
  const point = e.detail ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null;
  count(1, 'tap', point);
});

$('undoBtn').addEventListener('click', () => {
  const e = undo(state);
  if (!e) return;
  save(state);
  render();
  toast($('toast'), e.n > 1 ? `${fmt(e.n)}回ぶん戻しました` : '1回戻しました');
});

// ---------- まとめて足す ----------
const bulkDialog = $('bulkDialog');
$('bulkBtn').addEventListener('click', () => {
  $('bulkInput').value = '';
  bulkDialog.showModal();
  $('bulkInput').focus();
});
bulkDialog.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
  $('bulkInput').value = (Number($('bulkInput').value) || 0) + Number(b.dataset.add);
}));
bulkDialog.addEventListener('close', () => {
  if (bulkDialog.returnValue !== 'ok') return;
  const n = Math.floor(Number($('bulkInput').value));
  if (n > 0 && n <= GOAL) {
    unlockAudio();
    count(n, 'bulk');
  }
});

// ---------- ごほうびメモ ----------
const rewardDialog = $('rewardDialog');
let rewardTarget = 0;
function openReward(m) {
  rewardTarget = m;
  const total = totalOf(state);
  const open = m <= bloomedCount(total);
  $('rewardArt').innerHTML = open ? flowerSVG(m - 1) : budSVG(m === bloomedCount(total) + 1 ? (total % FLOWER_STEP) / FLOWER_STEP : 0);
  $('rewardTitle').textContent = open ? `${m}輪目「${FLOWERS[m - 1][0]}」` : `${m}輪目の花`;
  const on = state.bloomedOn[m];
  $('rewardSub').textContent = open
    ? `${fmt(m * FLOWER_STEP)}回で咲きました${on ? `（${on.replace(/-/g, '/')}）` : ''}`
    : `${fmt(m * FLOWER_STEP)}回で咲きます。あと ${fmt(m * FLOWER_STEP - total)} 回。どんな花かはお楽しみに`;
  $('rewardInput').value = state.rewards[m] || '';
  rewardDialog.showModal();
}
rewardDialog.addEventListener('close', () => {
  if (rewardDialog.returnValue !== 'ok') return;
  const v = $('rewardInput').value.trim();
  if (v) state.rewards[rewardTarget] = v;
  else delete state.rewards[rewardTarget];
  save(state);
  render();
  toast($('toast'), v ? 'ごほうびをメモしました' : 'メモを消しました');
});

// ---------- 設定・バックアップ ----------
const menuDialog = $('menuDialog');
function openMenu() {
  $('soundToggle').checked = state.settings.sound;
  $('vibrateToggle').checked = state.settings.vibrate;
  $('backupMsg').textContent = '';
  $('resetMsg').textContent = '';
  $('pasteBox').hidden = true;
  $('resetBox').hidden = true;
  renderUndoReset();
  menuDialog.showModal();
}
$('menuBtn').addEventListener('click', openMenu);
$('backupLink').addEventListener('click', openMenu);
$('soundToggle').addEventListener('change', (e) => { state.settings.sound = e.target.checked; save(state); });
$('vibrateToggle').addEventListener('change', (e) => { state.settings.vibrate = e.target.checked; save(state); });

const backupText = () => JSON.stringify({ app: 'arigato-counter', exportedAt: new Date().toISOString(), ...state });
const say = (t) => { $('backupMsg').textContent = t; };

$('exportBtn').addEventListener('click', () => {
  const blob = new Blob([backupText()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `arigato-backup-${dayKey()}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  say(`保存しました（合計 ${fmt(totalOf(state))} 回）`);
});

$('copyBtn').addEventListener('click', async () => {
  const text = backupText();
  try {
    await navigator.clipboard.writeText(text);
    say('コピーしました。メモアプリなどに貼りつけて保管してください');
  } catch {
    $('pasteBox').hidden = false;
    $('pasteInput').value = text;
    $('pasteInput').select();
    say('自動でコピーできませんでした。上の文字を選択してコピーしてください');
  }
});

function restoreFrom(text) {
  let next;
  try {
    next = normalize(JSON.parse(text));
  } catch (e) {
    say(`読み込めませんでした：${e.message || 'バックアップの形式ではありません'}`);
    return;
  }
  const msg = `合計 ${fmt(totalOf(next))} 回・ごほうびメモ ${Object.keys(next.rewards).length} 件のデータで、今の記録（${fmt(totalOf(state))} 回）を置きかえます。よろしいですか？`;
  if (!confirm(msg)) return;
  state = next;
  save(state);
  render();
  say(`復元しました（合計 ${fmt(totalOf(state))} 回）`);
}

$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (file) restoreFrom(await file.text());
});
$('pasteToggle').addEventListener('click', () => {
  $('pasteBox').hidden = !$('pasteBox').hidden;
  if (!$('pasteBox').hidden) { $('pasteInput').value = ''; $('pasteInput').focus(); }
});
$('pasteRestore').addEventListener('click', () => restoreFrom($('pasteInput').value));

// ---------- リセット ----------
// 直前の記録を1つだけ取っておき、まちがえて消しても戻せるようにする
const BEFORE_RESET_KEY = `${STORAGE_KEY}/before-reset`;
function beforeReset() {
  try {
    const text = localStorage.getItem(BEFORE_RESET_KEY);
    return text ? normalize(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}
function renderUndoReset() {
  const prev = beforeReset();
  $('undoResetBtn').hidden = !prev;
  if (prev) $('undoResetBtn').textContent = `リセット前に戻す（${fmt(totalOf(prev))} 回）`;
}

$('resetToggle').addEventListener('click', () => {
  const box = $('resetBox');
  box.hidden = !box.hidden;
  if (box.hidden) return;
  const total = totalOf(state);
  $('resetSummary').textContent = `合計 ${fmt(total)} 回・咲いた花 ${bloomedCount(total)} 輪・1週間のグラフをすべてゼロに戻します。`;
  $('keepRewards').checked = true;
  $('resetMsg').textContent = '';
});
$('resetCancel').addEventListener('click', () => { $('resetBox').hidden = true; });
$('resetConfirm').addEventListener('click', () => {
  try {
    localStorage.setItem(BEFORE_RESET_KEY, JSON.stringify(state));
  } catch { /* 取っておけなくてもリセットは続ける */ }
  state = reset(state, { keepRewards: $('keepRewards').checked });
  save(state);
  render();
  $('resetBox').hidden = true;
  renderUndoReset();
  $('resetMsg').textContent = 'ゼロに戻しました。まちがえたときは「リセット前に戻す」で戻せます';
});
$('undoResetBtn').addEventListener('click', () => {
  const prev = beforeReset();
  if (!prev) return;
  const now = totalOf(state);
  if (now > 0 && !confirm(`リセットのあとに数えた ${fmt(now)} 回は消えて、リセット前の ${fmt(totalOf(prev))} 回に戻ります。よろしいですか？`)) return;
  state = prev;
  save(state);
  localStorage.removeItem(BEFORE_RESET_KEY);
  render();
  renderUndoReset();
  $('resetMsg').textContent = `リセット前の記録（${fmt(totalOf(state))} 回）に戻しました`;
});

// ---------- 音声 ----------
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    else { await wakeLock?.release(); wakeLock = null; }
  } catch { /* 非対応・拒否は無視 */ }
}

const micBtn = $('micBtn');
const heard = $('heard');
const listener = isSupported() && createListener({
  onCount(n) {
    count(n, 'voice');
    if (state.settings.sound) chime('tick');
    if (state.settings.vibrate) buzz(20);
  },
  onHeard(text, final) {
    heard.textContent = `「${text}」`;
    heard.classList.toggle('interim', !final);
  },
  onState(s, reason) {
    const on = s === 'listening';
    micBtn.classList.toggle('on', on);
    micBtn.setAttribute('aria-pressed', String(on));
    $('micLabel').textContent = on ? '聞いています…（押すと止まる）' : '声でかぞえる';
    heard.classList.remove('interim');
    if (on) heard.textContent = '「ありがとう」と言ってみてください';
    else heard.textContent = reason || '止めました。タップでも数えられます';
    keepAwake(on);
  },
});

if (listener) {
  micBtn.addEventListener('click', () => {
    unlockAudio();
    listener.active ? listener.stop() : listener.start();
  });
} else {
  micBtn.disabled = true;
  heard.textContent = 'このブラウザは音声認識に対応していません。まるをタップして数えてください（Chrome・Safari 推奨）';
}

// ---------- その他 ----------
let persistAsked = false;
function requestPersistence() {
  if (persistAsked) return;
  persistAsked = true;
  navigator.storage?.persist?.().catch(() => {});
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    render();
    if (listener?.active) keepAwake(true);
  }
});
setInterval(render, 60 * 1000); // 日付が変わったとき用

// 別タブで記録が変わったら反映
addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('arigato-counter')) {
    state = load();
    render();
  }
});

setupCelebrate($('celebrate'));
render();

// 開発中（localhost）はキャッシュが邪魔になるので登録しない。?sw を付けるとオフライン動作を確認できる
const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
if ('serviceWorker' in navigator && (!isDev || location.search.includes('sw'))) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service Worker 登録失敗', e));
}
