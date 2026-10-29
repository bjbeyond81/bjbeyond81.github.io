/* The shell and local WASM are precached; model weights use runtime caches. */
const ROOT = new URL('./', self.location.href);
const PREFIX = 'twin-shell-' + encodeURIComponent(ROOT.pathname) + '-';
const CACHE = PREFIX + 'f0661456b0d36c52';
const FILES = ["./assets/ai-worker-Bke5J9fK.js","./assets/index-DcWqpGjN.js","./assets/index-nmsIXr-x.css","./assets/lib-DWfG8IM1.js","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./icons/twin.svg","./index.html","./licenses/LLAMA-3.2-LICENSE.txt","./licenses/LLAMA-3.2-USE-POLICY.md","./licenses/THIRD-PARTY.txt","./manifest.webmanifest","./ort/ort-wasm-simd-threaded.mjs","./ort/ort-wasm-simd-threaded.wasm","./privacy-it.html","./privacy.html","./terms-it.html","./terms.html"];
self.addEventListener('install', event => event.waitUntil((async()=>{
  const cache = await caches.open(CACHE); // Sequential caching avoids holding several large WASM responses at once on iOS.
  for(const file of FILES)await cache.add(file);
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
