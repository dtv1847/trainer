/* DTV 1847 – Offline-Speicher. Version ändert sich bei jedem Update automatisch. */
const CACHE = 'dtv-trainer-429a66cf8a';
const FILES = ["./", "dtv-icon.png", "index.html", "masse.html", "plan.html", "technik.html", "training.html", "video.html", "wissen.html", "zirkel.html"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => (k.startsWith('dtv-trainer-') && k !== CACHE) || (k.startsWith('dtv-pose-') && k !== 'dtv-pose-2')).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function timeout(ms){ return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Schriften: aus dem Speicher, im Hintergrund auffrischen
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // Seiten: erst Netz (max. 3 s, damit Updates ankommen), sonst Speicher
  if (req.mode === 'navigate' || req.destination === 'document'){
    e.respondWith(Promise.race([fetch(req), timeout(3000)]).then(r => {
      if (r && r.ok){ const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return r;
    }).catch(async () => (await caches.match(req, {ignoreSearch:true})) || (await caches.match('./')) || (await caches.match('index.html'))));
    return;
  }
  // Skelett-Erkennung (groß): eigener Speicher, bleibt über Updates erhalten
  if (/\/pose[^\/]*$/.test(url.pathname)){
    e.respondWith(caches.open('dtv-pose-2').then(async c => {
      const hit = await c.match(req, {ignoreSearch:true});
      if (hit) return hit;
      const r = await fetch(req);
      if (r && r.ok) c.put(req, r.clone());
      return r;
    }));
    return;
  }
  // Bilder u. Ä.: Speicher zuerst
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r && r.ok){ const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return r;
  })));
});
