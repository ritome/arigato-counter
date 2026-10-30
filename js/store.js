// 記録の保存と操作。DOM に依存しない純粋なロジック（tests/ からも読み込む）

export const STORAGE_KEY = 'arigato-counter/v2';
export const GOAL = 500000;
export const FLOWER_STEP = 10000;
export const FLOWER_COUNT = GOAL / FLOWER_STEP; // 50
const LOG_LIMIT = 200;

export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function emptyState() {
  return {
    version: 2,
    days: {},        // { "2026-10-30": 123 }
    rewards: {},     // { "1": "ケーキを買う" }  キーは花の番号（1〜50）
    bloomedOn: {},   // { "1": "2026-12-01" }    花が咲いた日
    log: [],         // [{ d, n, s, t }]         ひとつ戻す用の操作履歴
    settings: { sound: true, vibrate: true },
  };
}

export function totalOf(state) {
  let sum = 0;
  for (const v of Object.values(state.days)) sum += v;
  return sum;
}

export function bloomedCount(total) {
  return Math.min(FLOWER_COUNT, Math.floor(total / FLOWER_STEP));
}

function syncBloomDates(state, before, after, day) {
  const b0 = bloomedCount(before);
  const b1 = bloomedCount(after);
  for (let m = b0 + 1; m <= b1; m++) state.bloomedOn[m] = day;
  for (let m = b1 + 1; m <= b0; m++) delete state.bloomedOn[m];
}

/** n 回足す。{ from, to } を返す */
export function add(state, n, source = 'tap', now = new Date()) {
  n = Math.floor(n);
  if (!(n > 0)) return null;
  const from = totalOf(state);
  const d = dayKey(now);
  state.days[d] = (state.days[d] || 0) + n;
  state.log.push({ d, n, s: source, t: now.getTime() });
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
  const to = from + n;
  syncBloomDates(state, from, to, d);
  return { from, to };
}

/** 最後の操作を取り消す。取り消した操作（なければ null）を返す */
export function undo(state) {
  const last = state.log.pop();
  if (!last) return null;
  const from = totalOf(state);
  const left = (state.days[last.d] || 0) - last.n;
  if (left > 0) state.days[last.d] = left;
  else delete state.days[last.d];
  syncBloomDates(state, from, totalOf(state), last.d);
  return last;
}

/** 読み込んだデータ（保存済み・バックアップ・旧版）を検証して整える。不正なら例外 */
export function normalize(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('データの形式がちがいます');
  const s = emptyState();
  if (!raw.days || typeof raw.days !== 'object') throw new Error('回数の記録が見つかりません');
  for (const [k, v] of Object.entries(raw.days)) {
    const n = Math.floor(Number(v));
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && n > 0) s.days[k] = n;
  }
  for (const [k, v] of Object.entries(raw.rewards || {})) {
    const m = Number(k);
    if (Number.isInteger(m) && m >= 1 && m <= FLOWER_COUNT && typeof v === 'string' && v.trim()) {
      s.rewards[m] = v.slice(0, 200);
    }
  }
  // 旧版（reference/）は bloom、新版は bloomedOn
  const blooms = raw.bloomedOn || raw.bloom || {};
  const done = bloomedCount(totalOf(s));
  for (const [k, v] of Object.entries(blooms)) {
    const m = Number(k);
    if (m >= 1 && m <= done && typeof v === 'string') s.bloomedOn[m] = v;
  }
  if (Array.isArray(raw.log)) {
    s.log = raw.log
      .filter((e) => e && typeof e.d === 'string' && e.n > 0 && (s.days[e.d] || 0) >= e.n)
      .slice(-LOG_LIMIT);
  }
  if (raw.settings && typeof raw.settings === 'object') {
    s.settings.sound = raw.settings.sound !== false;
    s.settings.vibrate = raw.settings.vibrate !== false;
  }
  return s;
}

export function load(storage = globalThis.localStorage) {
  try {
    const text = storage.getItem(STORAGE_KEY) ?? storage.getItem('arigato-counter-v1');
    if (text) return normalize(JSON.parse(text));
  } catch (e) {
    console.warn('記録を読み込めませんでした', e);
  }
  return emptyState();
}

export function save(state, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('記録を保存できませんでした', e);
    return false;
  }
}
