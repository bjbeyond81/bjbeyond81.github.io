/* The shell and local WASM are precached; model weights use runtime caches. */
const ROOT = new URL('./', self.location.href);
const PREFIX = 'twin-shell-' + encodeURIComponent(ROOT.pathname) + '-';
const CACHE = PREFIX + '__VERSION__';
const FILES = __PRECACHE__;
self.addEventListener('install', event => event.waitUntil((async()=>{
  const cache = await caches.open(CACHE); await cache.addAll(FILES);
})()));
// Updates activate when all older tabs close. No mixed-version forced activation.
self.addEventListener('activate', event => event.waitUntil((async()=>{
  for (const name of await caches.keys()) if (name.startsWith(PREFIX) && name!==CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method!=='GET' || url.origin!==ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  event.respondWith((async()=>{
    const cache = await caches.open(CACHE);
    const hit = await cache.match(event.request, {ignoreSearch:true});
    if(hit) return hit;
    try { return await fetch(event.request); }
    catch(error) { if(event.request.mode==='navigate') return (await cache.match(new URL('index.html',ROOT))) || Response.error(); throw error; }
  })());
});
