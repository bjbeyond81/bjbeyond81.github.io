import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createModelCache,inspectModelCache,modelFiles,CPU_MODEL} from '../src/model-cache.js';
import {EMBEDDING_MODEL} from '../src/domain.js';
import {probeWebGPU,appleMobile} from '../src/device.js';
function session(cached){
 const urls=new Set(cached?[...modelFiles(EMBEDDING_MODEL),...modelFiles(CPU_MODEL)]:[]);
 const cache={match:async url=>urls.has(url)?new Response('file'):undefined};
 let loads=0;
 class Worker{
  postMessage({id,action}){if(action==='load')loads++;queueMicrotask(async()=>this.onmessage?.({data:{id,type:'result',result:action==='load'?{cache:await inspectModelCache(cache)}:true}}));}
  terminate(){}
 }
 const context=vm.createContext({console,URL,Map,Promise,Worker,queueMicrotask,probeWebGPU,appleMobile,inspectModelCache,createModelCache:async()=>cache,
 navigator:{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5},localStorage:{getItem:()=> '1'},location:{href:'https://example.org/twin/'}});
 const source=readFileSync(new URL('../src/ai.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/\bexport /g,'').replaceAll('import.meta.env.BASE_URL',"'./'").replaceAll('import.meta.url',"'https://example.org/twin/ai.js'");
 vm.runInContext(source,context);
 return {context,loads:()=>loads,call:code=>vm.runInContext(code,context)};
}
test('a saved flag does not mark a cold or evicted model as running or cached',async()=>{
 const s=session(false);await s.call('capabilities()');
 assert.equal(s.call('aiState().ready'),false);assert.equal(s.call('aiState().cached'),false);
 assert.equal(s.loads(),0);
});
test('locking releases memory but keeps verified saved files for the next question',async()=>{
 const s=session(true);await s.call('capabilities()');
 assert.equal(s.call('aiState().ready'),false);assert.equal(s.call('aiState().cached'),true);
 await s.call('loadAI()');assert.equal(s.call('aiState().ready'),true);
 s.call('stop()');assert.equal(s.call('aiState().ready'),false);assert.equal(s.call('aiState().cached'),true);
 await s.call('loadAI()');assert.equal(s.call('aiState().ready'),true);assert.equal(s.loads(),2);
});
test('two simultaneous starts initialize a single worker session',async()=>{
 const s=session(true);await s.call('Promise.all([loadAI(),loadAI()])');assert.equal(s.loads(),1);
});
