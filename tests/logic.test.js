import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, add, undo, totalOf, normalize, dayKey, bloomedCount } from '../js/store.js';
import { crossed } from '../js/milestones.js';

test('足すと今日と合計が増え、ひとつ戻すで最後の操作だけ戻る', () => {
  const s = emptyState();
  const now = new Date(2026, 9, 30, 12);
  add(s, 1, 'tap', now);
  add(s, 250, 'bulk', now);
  assert.equal(totalOf(s), 251);
  assert.equal(undo(s).n, 250);
  assert.equal(totalOf(s), 1);
  undo(s);
  assert.equal(totalOf(s), 0);
  assert.deepEqual(s.days, {});
  assert.equal(undo(s), null);
});

test('前の日の操作も、その日から戻す', () => {
  const s = emptyState();
  add(s, 3, 'tap', new Date(2026, 9, 29, 23));
  add(s, 2, 'tap', new Date(2026, 9, 30, 1));
  undo(s); undo(s);
  assert.deepEqual(s.days, {});
});

test('花が咲いた日を記録し、戻すと消える', () => {
  const s = emptyState();
  const now = new Date(2026, 9, 30);
  add(s, 9999, 'bulk', now);
  add(s, 1, 'voice', now);
  assert.equal(s.bloomedOn[1], dayKey(now));
  undo(s);
  assert.equal(s.bloomedOn[1], undefined);
});

test('0 や負の数は足さない', () => {
  const s = emptyState();
  assert.equal(add(s, 0), null);
  assert.equal(add(s, -5), null);
  assert.equal(totalOf(s), 0);
});

test('節目: 100/500/1000 と花とキリ番', () => {
  assert.deepEqual(crossed(99, 100), [{ kind: 'early', at: 100 }]);
  assert.deepEqual(crossed(999, 1000), [{ kind: 'early', at: 1000 }]);
  assert.deepEqual(crossed(1999, 2000), [{ kind: 'kiriban', at: 2000 }]);
  assert.deepEqual(crossed(9999, 10000), [{ kind: 'flower', at: 10000, flower: 1 }]);
  assert.deepEqual(crossed(100, 100), []);
  assert.deepEqual(crossed(101, 499), []);
});

test('節目: まとめ足しで複数越えたら大きい順', () => {
  const ev = crossed(0, 25000);
  assert.deepEqual(ev.map((e) => e.kind), ['flower', 'flower', 'early', 'early', 'early', 'kiriban']);
  assert.equal(ev[0].flower, 2);
  assert.equal(crossed(499999, 500000)[0].kind, 'goal');
  assert.equal(crossed(500000, 600000).length, 0);
});

test('復元: 不正な値を捨て、旧版の形式も読める', () => {
  const s = normalize({
    days: { '2026-10-30': '12000', bad: 5, '2026-10-29': -3 },
    bloom: { 1: '2026-10-30', 2: '2026-10-30' },
    rewards: { 1: 'ケーキ', 99: 'x', 2: '' },
  });
  assert.deepEqual(s.days, { '2026-10-30': 12000 });
  assert.deepEqual(s.bloomedOn, { 1: '2026-10-30' });
  assert.deepEqual(s.rewards, { 1: 'ケーキ' });
  assert.equal(bloomedCount(totalOf(s)), 1);
  assert.throws(() => normalize(null));
  assert.throws(() => normalize({ foo: 1 }));
});
