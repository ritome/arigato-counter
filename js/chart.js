// 直近7日の棒グラフ（SVG）

import { dayKey } from './store.js';

const WEEKDAYS = '日月火水木金土';

export function renderWeek(el, days, today = new Date()) {
  const items = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    items.push({ d, n: days[dayKey(d)] || 0, isToday: i === 0 });
  }
  const max = Math.max(10, ...items.map((x) => x.n));
  const W = 320, H = 150, top = 22, bottom = 28, slot = W / 7, bw = Math.min(26, slot * 0.5);
  const plotH = H - top - bottom;
  const sum = items.reduce((a, x) => a + x.n, 0);

  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="直近7日の回数。合計 ${sum.toLocaleString('ja-JP')} 回">`;
  s += `<line x1="0" x2="${W}" y1="${H - bottom + 0.5}" y2="${H - bottom + 0.5}" class="axis"/>`;
  items.forEach((x, i) => {
    const h = x.n ? Math.max(3, (x.n / max) * plotH) : 0;
    const cx = slot * i + slot / 2;
    const y = H - bottom - h;
    const cls = x.isToday ? 'bar today' : 'bar';
    if (h) s += `<rect class="${cls}" x="${cx - bw / 2}" y="${y}" width="${bw}" height="${h}" rx="${Math.min(6, bw / 2)}"/>`;
    s += `<text class="val${x.n ? '' : ' zero'}" x="${cx}" y="${y - 6}" text-anchor="middle">${x.n ? compact(x.n) : '·'}</text>`;
    const label = x.isToday ? '今日' : `${WEEKDAYS[x.d.getDay()]}`;
    s += `<text class="day${x.isToday ? ' today' : ''}" x="${cx}" y="${H - bottom + 17}" text-anchor="middle">${label}</text>`;
  });
  s += '</svg>';
  el.innerHTML = s;
  return sum;
}

function compact(n) {
  if (n >= 10000) return (n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + '万';
  return n.toLocaleString('ja-JP');
}
