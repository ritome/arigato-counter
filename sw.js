// オフライン対応。アプリ本体は先にまとめてキャッシュし、更新はバージョンを上げて配る。
// ファイルを変更したら VERSION を上げること。
const VERSION = 'v6';
const APP_CACHE = `arigato-app-${VERSION}`;
const FONT_CACHE = 'arigato-fonts';

const APP_FILES = [
  './',
  'index.html',
  'help.html',
  'styles.css',
  'manifest.webmanifest',
  'js/main.js',
  'js/store.js',
  'js/milestones.js',
  'js/flowers.js',
  'js/chart.js',
  'js/speech.js',
  'js/celebrate.js',
  'icons/favicon-64.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  // GitHub Pages は max-age=600 で配るため、ブラウザの HTTP キャッシュを通すと古いファイルを取り込んでしまう。
  // cache: 'reload' で必ずサーバーから取り直す
  const requests = APP_FILES.map((url) => new Request(url, { cache: 'reload' }));
  e.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(requests)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== APP_CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts：キャッシュ優先（一度読めばオフラインでも同じ書体）
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // ページ遷移：HTML と JS の版をそろえるため、これもキャッシュ優先
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || fetch(req).catch(() => caches.match('index.html'))),
    );
    return;
  }

  // アプリのファイル：キャッシュ優先
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
