// 節目の判定。from → to の間に越えた節目を、大きいもの順に返す

import { FLOWER_STEP, GOAL } from './store.js';

// 序盤の特別なお祝い
export const EARLY = {
  100: { title: '100回！', message: 'はじめの一歩。小さな芽が顔を出したよ。', icon: 'sprout' },
  500: { title: '500回！', message: 'ありがとうが、すっかり口ぐせになってきたね。', icon: 'leaf' },
  1000: { title: '1,000回！', message: '千のありがとう。最初のつぼみがふくらみはじめたよ。', icon: 'bud' },
};

export const BOUQUET_STEP = 100000;

// goal=50万 / bouquet=10万ごと / flower=1万ごと / early=100,500,1000 / kiriban=1000ごと / hundred=100ごと
const RANK = { goal: 5, bouquet: 4, flower: 3, early: 2, kiriban: 1, hundred: 0 };

/**
 * @returns {Array<{kind:'goal'|'bouquet'|'flower'|'early'|'kiriban'|'hundred', at:number, flower?:number}>}
 *   大きい順。花の節目は越えた花ごとに1件
 */
export function crossed(from, to) {
  const events = [];
  if (to <= from) return events;
  for (const at of Object.keys(EARLY).map(Number)) {
    if (from < at && at <= to) events.push({ kind: 'early', at });
  }
  for (let m = Math.floor(from / FLOWER_STEP) + 1; m * FLOWER_STEP <= Math.min(to, GOAL); m++) {
    const at = m * FLOWER_STEP;
    const kind = at === GOAL ? 'goal' : at % BOUQUET_STEP === 0 ? 'bouquet' : 'flower';
    events.push({ kind, at, flower: m });
  }
  // 1,000回ごと・100回ごとは、まとめ足しで大量に出ないよう最後の1つだけ。上の節目と重なる回は除く
  const k = Math.floor(to / 1000) * 1000;
  if (k > from && k > 1000 && k % FLOWER_STEP !== 0) events.push({ kind: 'kiriban', at: k });
  const h = Math.floor(to / 100) * 100;
  if (h > from && h % 1000 !== 0 && !EARLY[h]) events.push({ kind: 'hundred', at: h });
  return events.sort((a, b) => RANK[b.kind] - RANK[a.kind] || b.at - a.at);
}
