import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync,statSync} from 'node:fs';import vm from 'node:vm';
const source=readFileSync(new URL('../scripts/sw-template.js',import.meta.url),'utf8').replace('__VERSION__','test1').replace('__APP_VERSION__','1.0.3').replace('__PRECACHE__',JSON.stringify(['./index.html','./assets/main.js']));
test('service worker isolates project scopes and serves cached shell offline',async()=>{
 const events={},stores=new Map();let claimed=false;const origin='https://example.github.io/twin/';
 const cacheApi={async open(name){if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return {async add(file){m.set(new URL(file,origin).href,new Response(file));},async match(req){return m.get(new URL(typeof req==='string'?req:req.url||req.href,origin).href)?.clone();}};},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}};
 stores.set('twin-shell-'+encodeURIComponent('/other/')+'-old',new Map());stores.set('twin-shell-'+encodeURIComponent('/twin/')+'-older',new Map());stores.set('twin-shell-'+encodeURIComponent('/twin/')+'-old',new Map());
 const context={URL,Response,caches:cacheApi,fetch:async()=>{throw Error('offline');},self:{location:{href:origin+'sw.js'},clients:{claim:async()=>{claimed=true;}},addEventListener:(name,fn)=>events[name]=fn}};vm.runInNewContext(source,context);
 let promise;events.install({waitUntil:p=>promise=p});await promise;events.activate({waitUntil:p=>promise=p});await promise;assert(claimed);assert(stores.has('twin-shell-'+encodeURIComponent('/other/')+'-old'));assert(stores.has('twin-shell-'+encodeURIComponent('/twin/')+'-old'));assert(!stores.has('twin-shell-'+encodeURIComponent('/twin/')+'-older'));
 events.fetch({request:{url:origin+'index.html',method:'GET',mode:'navigate'},respondWith:p=>promise=p});assert.equal(await(await promise).text(),'./index.html');
 events.fetch({request:{url:origin+'unknown',method:'GET',mode:'navigate'},respondWith:p=>promise=p});assert.equal(await(await promise).text(),'./index.html');
 let intercepted=false;events.fetch({request:{url:'https://huggingface.co/model',method:'GET'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
});
test('built output includes subpath-safe manifest, real PNG icons, precached workers and no private key',()=>{
 const dist=new URL('../dist/',import.meta.url);assert(existsSync(dist));const html=readFileSync(new URL('index.html',dist),'utf8');assert(!html.includes('src="/assets/'));const manifest=JSON.parse(readFileSync(new URL('manifest.webmanifest',dist),'utf8'));assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
 for(const i of manifest.icons){const data=readFileSync(new URL(i.src,dist));assert.equal(data.subarray(1,4).toString(),'PNG');}
 const sw=readFileSync(new URL('sw.js',dist),'utf8'),listed=JSON.parse(sw.match(/const FILES = (\[.*?\]);/)[1]);assert(listed.some(file=>file.includes('model-download-worker-')));assert(listed.every(file=>!file.includes('/ort/')&&!/ai-worker-|transcription-worker-|lib-/.test(file)));assert(listed.reduce((sum,file)=>sum+statSync(new URL(file.slice(2),dist)).size,0)<3_000_000);assert(!sw.includes('__PRECACHE__'));assert(!sw.includes('__VERSION__'));assert(!sw.includes('__APP_VERSION__'));assert(existsSync(new URL('update.html',dist)));assert(!existsSync(new URL('twin-private.pem',dist)));
});


test('recovery page bypasses a stale shell; prior worker assets remain usable',async()=>{
 const root='https://example.github.io/apps/twin/',events={},stores=new Map();let offline=false,skips=0;
 const cacheApi={async open(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {async add(file){map.set(new URL(file,root).href,new Response('cached '+file));},async match(req){return map.get(new URL(typeof req==='string'?req:req.url||req.href,root).href)?.clone();}};},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}};
 const previous=new Map([[root+'assets/old-worker.js',new Response('prior worker')]]);
 stores.set('twin-shell-'+encodeURIComponent('/apps/twin/')+'-previous',previous);
 stores.set('twin-models',new Map([[root+'public-model',new Response('model')]]));
 const self={location:{href:root+'sw.js'},clients:{claim:async()=>{}},skipWaiting:async()=>{skips++;},addEventListener:(name,fn)=>events[name]=fn};
 vm.runInNewContext(source,{URL,Response,caches:cacheApi,self,fetch:async()=>{if(offline)throw Error('offline');return new Response('fresh recovery page');}});
 let pending;events.install({waitUntil:p=>pending=p});await pending;events.activate({waitUntil:p=>pending=p});await pending;
 events.fetch({request:{url:root+'assets/old-worker.js',method:'GET'},respondWith:p=>pending=p});assert.equal(await(await pending).text(),'prior worker');
 events.fetch({request:{url:root+'update.html',method:'GET',mode:'navigate'},respondWith:p=>pending=p});assert.equal(await(await pending).text(),'fresh recovery page');
 const cache=await cacheApi.open('twin-shell-'+encodeURIComponent('/apps/twin/')+'-test1');await cache.add('./update.html');offline=true;
 events.fetch({request:{url:root+'update.html',method:'GET',mode:'navigate'},respondWith:p=>pending=p});assert.equal(await(await pending).text(),'cached ./update.html');
 let status;events.message({data:{type:'TWIN_STATUS'},source:{url:root+'update.html'},ports:[{postMessage:data=>status=data}]});assert.equal(status.version,'1.0.3');
 events.message({data:{type:'TWIN_APPLY_UPDATE'},source:{url:'https://example.github.io/other/'},waitUntil:p=>pending=p});assert.equal(skips,0);
 events.message({data:{type:'TWIN_APPLY_UPDATE'},source:{url:root+'update.html'},waitUntil:p=>pending=p});await pending;assert.equal(skips,1);assert(stores.has('twin-models'));
});

test('heavy AI assets are not precached but become available offline after first use',async()=>{
 const root='https://example.github.io/apps/twin/',events={},stores=new Map();let offline=false,background;
 const cacheApi={async open(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {async add(file){map.set(new URL(file,root).href,new Response('shell'));},async match(req){return map.get(new URL(typeof req==='string'?req:req.url||req.href,root).href)?.clone();},async put(req,response){map.set(new URL(typeof req==='string'?req:req.url,root).href,new Response(await response.arrayBuffer()));}};},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}};
 const self={location:{href:root+'sw.js'},clients:{claim:async()=>{}},addEventListener:(name,fn)=>events[name]=fn};
 vm.runInNewContext(source,{URL,Response,caches:cacheApi,self,fetch:async()=>{if(offline)throw Error('offline');return new Response('AI runtime');}});
 let pending;events.install({waitUntil:p=>pending=p});await pending;events.activate({waitUntil:p=>pending=p});await pending;
 const request={url:root+'assets/ai-worker-abc.js',method:'GET'};events.fetch({request,respondWith:p=>pending=p,waitUntil:p=>background=p});assert.equal(await(await pending).text(),'AI runtime');await background;
 offline=true;events.fetch({request,respondWith:p=>pending=p,waitUntil:p=>background=p});assert.equal(await(await pending).text(),'AI runtime');
});
