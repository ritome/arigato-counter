// 50輪の花。1万回ごとに1輪。[名前, 花びらの色, 花びらの数, 中心の色, 形]
// 形: round=丸い花びら / pointed=とがった花びら / heart=先が割れた花びら / layered=八重

export const FLOWERS = [
  ['たんぽぽ', '#F5C842', 14, '#E8A93A', 'pointed'], ['すみれ', '#8A6BC9', 5, '#F5D76E', 'round'],
  ['なのはな', '#F2D43D', 4, '#C9A81E', 'round'], ['れんげ', '#E58FB4', 6, '#F7E3EC', 'round'],
  ['さくら', '#F6B8C8', 5, '#E0607E', 'heart'], ['チューリップ', '#E5484D', 6, '#F5C842', 'pointed'],
  ['すずらん', '#F4F4EE', 6, '#B7D9A8', 'round'], ['ふじ', '#A68BD6', 8, '#E6DCF5', 'round'],
  ['つつじ', '#E85F95', 5, '#B0305E', 'round'], ['ばら', '#D7344F', 8, '#8E1F33', 'layered'],
  ['あじさい', '#6F8FE0', 4, '#C3D0F5', 'round'], ['くちなし', '#FAF6E6', 6, '#F0DE9A', 'pointed'],
  ['ラベンダー', '#9C7FD1', 10, '#6F55A8', 'pointed'], ['ひまわり', '#F7B92E', 16, '#7A4E22', 'pointed'],
  ['あさがお', '#4E7BD8', 5, '#F4F4EE', 'round'], ['はす', '#F2A2B8', 8, '#F5D76E', 'layered'],
  ['ききょう', '#6E66C9', 5, '#E6DCF5', 'pointed'], ['なでしこ', '#EE85A6', 5, '#FBE3E9', 'heart'],
  ['コスモス', '#F08FB0', 8, '#F5C842', 'heart'], ['ひがんばな', '#E0403A', 6, '#F7B092', 'pointed'],
  ['きんもくせい', '#F2A03D', 4, '#E07B1F', 'round'], ['りんどう', '#4F63C8', 5, '#DCE3FA', 'pointed'],
  ['きく', '#F2D85A', 16, '#D6A824', 'layered'], ['ダリア', '#C9407A', 12, '#F5C842', 'layered'],
  ['さざんか', '#EA6E8C', 5, '#F5D76E', 'heart'], ['ポインセチア', '#D23A3A', 6, '#F2D43D', 'pointed'],
  ['つばき', '#C8243B', 5, '#F5D76E', 'round'], ['すいせん', '#F7F2D8', 6, '#F2B53D', 'pointed'],
  ['うめ', '#F3A0B6', 5, '#F5D76E', 'round'], ['ふくじゅそう', '#F4C531', 10, '#C9921E', 'round'],
  ['マーガレット', '#F8F8F2', 12, '#F2C53D', 'round'], ['ガーベラ', '#F2793D', 14, '#7A4E22', 'layered'],
  ['カーネーション', '#E9708E', 10, '#B0305E', 'heart'], ['ポピー', '#EE5A3C', 4, '#2E2A26', 'round'],
  ['しゃくやく', '#F3B4C4', 10, '#F5D76E', 'layered'], ['ぼたん', '#D94A7A', 12, '#F5D76E', 'layered'],
  ['ゆり', '#F8F1F0', 6, '#E8A93A', 'pointed'], ['アイリス', '#6B5BC9', 3, '#F5C842', 'heart'],
  ['クレマチス', '#8E6FD6', 6, '#F4F4EE', 'pointed'], ['ジャスミン', '#F8F8F0', 5, '#F2E3A0', 'round'],
  ['ハイビスカス', '#E6394B', 5, '#F5D76E', 'round'], ['ブーゲンビリア', '#D9479B', 3, '#F4F4EE', 'heart'],
  ['プルメリア', '#F9F2E2', 5, '#F5C842', 'round'], ['ミモザ', '#F5D43B', 10, '#E0B51E', 'round'],
  ['かすみそう', '#F4F4F6', 8, '#E6E6EA', 'round'], ['スイートピー', '#E9A4D8', 4, '#F4F4EE', 'heart'],
  ['フリージア', '#F2C93D', 6, '#E8A93A', 'pointed'], ['アネモネ', '#B9306A', 6, '#2E2A26', 'round'],
  ['カモミール', '#FAFAF4', 14, '#F2C53D', 'round'], ['ありがとうの大輪', '#E0607E', 16, '#F5C842', 'layered'],
];

// 中心(20,20)から上に伸びる花びら1枚の path（長さ len、幅 w）
function petalPath(shape, len, w) {
  const tip = 20 - len;
  if (shape === 'pointed') {
    return `M20 20 C${20 - w} ${20 - len * 0.45} ${20 - w * 0.5} ${tip + 2} 20 ${tip} C${20 + w * 0.5} ${tip + 2} ${20 + w} ${20 - len * 0.45} 20 20Z`;
  }
  if (shape === 'heart') {
    return `M20 20 C${20 - w * 1.1} ${20 - len * 0.5} ${20 - w} ${tip} ${20 - w * 0.35} ${tip} Q20 ${tip} 20 ${tip + 2.2} Q20 ${tip} ${20 + w * 0.35} ${tip} C${20 + w} ${tip} ${20 + w * 1.1} ${20 - len * 0.5} 20 20Z`;
  }
  return `M20 20 C${20 - w * 1.2} ${20 - len * 0.55} ${20 - w * 0.8} ${tip} 20 ${tip} C${20 + w * 0.8} ${tip} ${20 + w * 1.2} ${20 - len * 0.55} 20 20Z`;
}

function ring(color, n, shape, len, offset = 0) {
  const w = Math.max(2.2, Math.min(7, 44 / n));
  const d = petalPath(shape, len, w);
  let s = '';
  for (let k = 0; k < n; k++) {
    s += `<path d="${d}" fill="${color}" transform="rotate(${(360 / n) * k + offset} 20 20)"/>`;
  }
  return s;
}

/** i: 0〜49 */
export function flowerSVG(i, extraClass = '') {
  const [, color, n, center, shape] = FLOWERS[i];
  let s = `<svg class="flower ${extraClass}" viewBox="0 0 40 40" aria-hidden="true"><g stroke="rgba(60,40,30,.18)" stroke-width=".5">`;
  if (shape === 'layered') {
    s += ring(color, n, 'round', 18);
    s += `<g opacity=".85" style="filter:brightness(1.12)">${ring(color, n, 'round', 12.5, 180 / n)}</g>`;
  } else {
    s += ring(color, n, shape, 18);
  }
  s += `<circle cx="20" cy="20" r="${n > 10 ? 6 : 4.8}" fill="${center}"/></g>`;
  s += `<circle cx="18.4" cy="18.4" r="1.4" fill="#fff" opacity=".45"/></svg>`;
  return s;
}

// まだ咲いていない花（progress: 0〜1 でつぼみが育つ）
export function budSVG(progress = 0) {
  const h = 6 + progress * 10;
  const r = 2 + progress * 3.5;
  return `<svg class="bud" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M20 36 V${36 - h}" stroke="var(--leaf)" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    ${progress > 0.25 ? `<path d="M20 31 q-6 -1 -7 -6 q5 0 7 4" fill="var(--leaf)"/>` : ''}
    ${progress > 0.55 ? `<path d="M20 28 q6 -1 7 -6 q-5 0 -7 4" fill="var(--leaf)"/>` : ''}
    <ellipse cx="20" cy="${36 - h - r * 0.6}" rx="${r * 0.75}" ry="${r}" fill="var(--accent)" opacity="${0.35 + progress * 0.65}"/>
  </svg>`;
}

export const ICONS = {
  sprout: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 34 V20" stroke="#5E9C76" stroke-width="2.4" stroke-linecap="round"/><path d="M20 22 C14 22 9 18 9 12 C15 12 20 15 20 22Z" fill="#7DBA8F"/><path d="M20 20 C25 20 31 16 31 9 C24 9 20 13 20 20Z" fill="#5E9C76"/></svg>`,
  leaf: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 35 V14" stroke="#5E9C76" stroke-width="2.4" stroke-linecap="round"/><path d="M20 26 C12 26 7 21 7 14 C14 14 20 18 20 26Z" fill="#7DBA8F"/><path d="M20 22 C28 22 33 17 33 10 C26 10 20 14 20 22Z" fill="#5E9C76"/><path d="M20 15 C17 12 17 7 20 4 C23 7 23 12 20 15Z" fill="#9BCDA9"/></svg>`,
  bud: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 36 V18" stroke="#5E9C76" stroke-width="2.4" stroke-linecap="round"/><path d="M20 30 C13 30 9 26 9 21 C15 21 20 24 20 30Z" fill="#7DBA8F"/><ellipse cx="20" cy="12" rx="6" ry="8.5" fill="#E0607E"/><path d="M14 14 Q20 22 26 14 Q24 21 20 21 Q16 21 14 14Z" fill="#5E9C76"/></svg>`,
  star: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 5 L24.2 15 L35 15.8 L26.8 22.8 L29.3 33.4 L20 27.6 L10.7 33.4 L13.2 22.8 L5 15.8 L15.8 15Z" fill="#F5C842" stroke="#E8A93A" stroke-width="1" stroke-linejoin="round"/></svg>`,
};
