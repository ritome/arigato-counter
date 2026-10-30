// 節目の判定。from → to の間に越えた節目を、大きいもの順に返す

import { FLOWER_STEP, GOAL } from './store.js';

// 序盤の特別なお祝い
export const EARLY = {
  100: { title: '100回！', message: 'はじめの一歩。小さな芽が顔を出したよ。', icon: 'sprout' },
  500: { title: '500回！', message: 'ありがとうが、すっかり口ぐせになってきたね。', icon: 'leaf' },
  1000: { title: '1,000回！', message: '千のありがとう。最初のつぼみがふくらみはじめたよ。', icon: 'bud' },
};

const RANK = { goal: 4, flower: 3, early: 2, kiriban: 1 };

/**
 * @returns {Array<{kind:'goal'|'flower'|'early'|'kiriban', at:number, flower?:number}>}
 *   大きい順。flower は越えた花ごとに1件
 */
export function crossed(from, to) {
  const events = [];
  if (to <= from) return events;
  for (const at of Object.keys(EARLY).map(Number)) {
    if (from < at && at <= to) events.push({ kind: 'early', at });
  }
  for (let m = Math.floor(from / FLOWER_STEP) + 1; m * FLOWER_STEP <= Math.min(to, GOAL); m++) {
    events.push({ kind: m * FLOWER_STEP === GOAL ? 'goal' : 'flower', at: m * FLOWER_STEP, flower: m });
  }
  // 1,000回ごとのキリ番（1,000回と花の節目は除く）。まとめ足しで大量に出ないよう最後の1つだけ
  const k = Math.floor(to / 1000) * 1000;
  if (k > from && k > 1000 && k % FLOWER_STEP !== 0) events.push({ kind: 'kiriban', at: k });
  return events.sort((a, b) => RANK[b.kind] - RANK[a.kind] || b.at - a.at);
}
