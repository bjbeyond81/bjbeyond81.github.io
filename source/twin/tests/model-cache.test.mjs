import test from 'node:test';
import assert from 'node:assert/strict';
import {createModelCache,inspectModelCache,modelFiles,CPU_MODEL} from '../src/model-cache.js';
import {EMBEDDING_MODEL} from '../src/domain.js';
const files=[...modelFiles(EMBEDDING_MODEL),...modelFiles(CPU_MODEL)];
function storage(entries={}){
 const maps=new Map(Object.entries(entries).map(([name,urls])=>[name,new Map(urls.map(url=>[url,new Response('public model data')]))]));
 return {has:async name=>maps.has(name),async open(name){if(!maps.has(name))maps.set(name,new Map());const map=maps.get(name);return {async match(url){return map.get(url)?.clone();},async put(url,response){map.set(url,new Response(await response.arrayBuffer()));}};}};
}
test('saved model files survive a new cache instance and need no network or new copy',async()=>{
 const shared=storage({'transformers-cache':files});
 const first=await createModelCache({storage:shared,opfs:null});
 assert.equal((await inspectModelCache(first)).cached,true);
 const restarted=await createModelCache({storage:shared,opfs:null});
 assert.equal((await inspectModelCache(restarted)).cached,true);
 assert.equal(await shared.has('twin-models'),false);
});
test('incomplete downloads and a different quantization are not marked downloaded',async()=>{
 const shared=storage({'twin-models':files.filter(f=>!f.includes(CPU_MODEL)).concat(modelFiles(CPU_MODEL).map(f=>f.replace('model_quantized.onnx','model_q4.onnx')))});
 const state=await inspectModelCache(await createModelCache({storage:shared,opfs:null}));
 assert.equal(state.cached,false);assert.equal(state.status,'partial');assert.equal(state.found,7);
});
test('legacy OPFS files remain readable without resetting or copying them',async()=>{
 const stored=new Map(files.map(url=>[btoa(url).replace(/[/+=]/g,'_').slice(0,180),new Blob(['old saved model'])]));
 const opfs={getDirectory:async()=>({getDirectoryHandle:async()=>({getFileHandle:async name=>({getFile:async()=>{if(!stored.has(name))throw Error('missing');return stored.get(name);}})})})};
 const cache=await createModelCache({storage:null,opfs});
 assert.equal((await inspectModelCache(cache)).cached,true);
 assert.equal(await (await cache.match(files[0])).text(),'old saved model');
});
test('quota errors are surfaced rather than silently claiming model persistence',async()=>{
 const failure=new DOMException('No free space','QuotaExceededError');
 const cache=await createModelCache({storage:{open:async()=>({put:async()=>{throw failure;}}),has:async()=>false},opfs:null});
 await assert.rejects(cache.put(files[0],new Response('data')),error=>error===failure);
 assert.equal((await inspectModelCache(cache)).cached,false);
});
test('files from earlier partial downloads are reused when setup finishes',async()=>{
 const shared=storage({'transformers-cache':files.slice(0,-1)});
 const cache=await createModelCache({storage:shared,opfs:null});
 assert.equal((await inspectModelCache(cache)).cached,false);
 await cache.put(files.at(-1),new Response('last model file'));
 assert.equal((await inspectModelCache(cache)).cached,true);
});
test('missing or denied browser storage does not become a false cached state',async()=>{
 const cache=await createModelCache({storage:null,opfs:{getDirectory:async()=>{throw Error('denied');}}});
 assert.equal((await inspectModelCache(cache)).status,'unavailable');
 await assert.rejects(cache.put(files[0],new Response('data')),/MODEL_CACHE_UNAVAILABLE/);
});
