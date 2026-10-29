/* Precache the small app shell. Heavy AI runtimes are cached on first use. */
const ROOT = new URL('./', self.location.href);
const PREFIX = 'twin-shell-' + encodeURIComponent(ROOT.pathname) + '-';
const CACHE = PREFIX + '__VERSION__';
const APP_VERSION = '__APP_VERSION__';
const FILES = __PRECACHE__;
const AI_ASSET=/\/(?:assets\/(?:ai-worker|transcription-worker|lib)-|ort\/)/;
self.addEventListener('install', event => event.waitUntil((async()=>{
  const cache = await caches.open(CACHE); // Sequential caching avoids holding several large WASM responses at once on iOS.
  for(const file of FILES)await cache.add(file);
})()));
// Keep one previous shell so another open tab can still load its hashed worker.
self.addEventListener('activate', event => event.waitUntil((async()=>{
  const previous=(await caches.keys()).filter(name=>name.startsWith(PREFIX)&&name!==CACHE);
  for (const name of previous.slice(0,-1)) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('message', event => {
  if(!event.source?.url)return;
  const source=new URL(event.source.url);
  if(source.origin!==ROOT.origin||!source.pathname.startsWith(ROOT.pathname))return;
  if(event.data?.type==='TWIN_STATUS')event.ports?.[0]?.postMessage({version:APP_VERSION});
  if(event.data?.type==='TWIN_APPLY_UPDATE')event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method!=='GET' || url.origin!==ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  event.respondWith((async()=>{
    const cache = await caches.open(CACHE);
    // The recovery page must remain reachable even when an older shell is active.
    if(url.pathname===new URL('update.html',ROOT).pathname){
      try{return await fetch(event.request,{cache:'no-store'});}
      catch{return (await cache.match(event.request,{ignoreSearch:true}))||Response.error();}
    }
    const hit = await cache.match(event.request, {ignoreSearch:true});
    if(hit) return hit;
    if(url.pathname.startsWith(new URL('assets/',ROOT).pathname)){
      for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE){
        const previous=await (await caches.open(name)).match(event.request,{ignoreSearch:true});
        if(previous)return previous;
      }
    }
    try {
      const response=await fetch(event.request);
      // Keep the initial install small, but preserve AI assets for later offline use.
      if(response.ok&&AI_ASSET.test(url.pathname))event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,response.clone())));
      return response;
    }
    catch(error) { if(event.request.mode==='navigate') return (await cache.match(new URL('index.html',ROOT))) || Response.error(); throw error; }
  })());
});
