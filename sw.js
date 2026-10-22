// 앱 파일은 네트워크 우선(오프라인이면 캐시), 파비콘은 캐시 우선
const CACHE = 'vault-v2';
const ICONS = 'vault-favicons';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== ICONS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // 서버에 파일이 없거나(사이트 삭제 등) 오프라인이면 저장해 둔 사본으로 실행
    const fromCache = () => caches.match(req).then(r => r || caches.match('./index.html'));
    e.respondWith(fetch(req)
      .then(res => {
        if (!res.ok) return fromCache().then(r => r || res);
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(fromCache));
    return;
  }

  if (url.hostname === 'icons.duckduckgo.com' || url.hostname === 'www.google.com') {
    e.respondWith(caches.open(ICONS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
  }
});
