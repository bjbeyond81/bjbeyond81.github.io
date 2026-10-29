import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import vm from 'node:vm';
const source=readFileSync(new URL('../scripts/sw-template.js',import.meta.url),'utf8').replace('__VERSION__','test1').replace('__PRECACHE__',JSON.stringify(['./index.html','./assets/main.js']));
test('service worker isolates project scopes and serves cached shell offline',async()=>{
 const events={},stores=new Map();let claimed=false;const origin='https://example.github.io/twin/';
 const cacheApi={async open(name){if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return {async addAll(files){for(const file of files)m.set(new URL(file,origin).href,new Response(file));},async match(req){return m.get(new URL(typeof req==='string'?req:req.url||req.href,origin).href)?.clone();}};},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}};
 stores.set('twin-shell-'+encodeURIComponent('/other/')+'-old',new Map());stores.set('twin-shell-'+encodeURIComponent('/twin/')+'-old',new Map());
 const context={URL,Response,caches:cacheApi,fetch:async()=>{throw Error('offline');},self:{location:{href:origin+'sw.js'},clients:{claim:async()=>{claimed=true;}},addEventListener:(name,fn)=>events[name]=fn}};vm.runInNewContext(source,context);
 let promise;events.install({waitUntil:p=>promise=p});await promise;events.activate({waitUntil:p=>promise=p});await promise;assert(claimed);assert(stores.has('twin-shell-'+encodeURIComponent('/other/')+'-old'));assert(!stores.has('twin-shell-'+encodeURIComponent('/twin/')+'-old'));
 events.fetch({request:{url:origin+'index.html',method:'GET',mode:'navigate'},respondWith:p=>promise=p});assert.equal(await(await promise).text(),'./index.html');
 events.fetch({request:{url:origin+'unknown',method:'GET',mode:'navigate'},respondWith:p=>promise=p});assert.equal(await(await promise).text(),'./index.html');
 let intercepted=false;events.fetch({request:{url:'https://huggingface.co/model',method:'GET'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
});
test('built output includes subpath-safe manifest, real PNG icons, precached workers and no private key',()=>{
 const dist=new URL('../dist/',import.meta.url);assert(existsSync(dist));const html=readFileSync(new URL('index.html',dist),'utf8');assert(!html.includes('src="/assets/'));const manifest=JSON.parse(readFileSync(new URL('manifest.webmanifest',dist),'utf8'));assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
 for(const i of manifest.icons){const data=readFileSync(new URL(i.src,dist));assert.equal(data.subarray(1,4).toString(),'PNG');}
 const sw=readFileSync(new URL('sw.js',dist),'utf8');assert(sw.includes('ai-worker-'));assert(!sw.includes('__PRECACHE__'));assert(!sw.includes('__VERSION__'));assert(!existsSync(new URL('twin-private.pem',dist)));
});
