import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createModelCache,inspectModelCache,modelFiles,CPU_MODEL,MOBILE_MODEL} from '../src/model-cache.js';
import {EMBEDDING_MODEL} from '../src/domain.js';
import {probeWebGPU,appleMobile} from '../src/device.js';
function session(cached,{store=new Map(),pauseAction,denyStorage=false,full=false}={}){
 const urls=new Set(cached?[...modelFiles(EMBEDDING_MODEL),...modelFiles(full?CPU_MODEL:MOBILE_MODEL)]:[]);
 const preferences=new Map(full?[['twin-ai-quality','full']]:[]);
 const cache={match:async url=>urls.has(url)?new Response('file'):undefined};
 let loads=0,release;
 class Worker{
  postMessage({id,action,args}){if(action==='load')loads++;const answer=()=>queueMicrotask(async()=>this.onmessage?.({data:{id,type:'result',result:action==='load'?{cache:await inspectModelCache(cache,args.mode)}:true}}));if(action===pauseAction)release=answer;else answer();}
  terminate(){}
 }
 const context=vm.createContext({console,URL,Map,Promise,Worker,queueMicrotask,probeWebGPU,appleMobile,inspectModelCache,createModelCache:async()=>cache,
 navigator:{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5},localStorage:{getItem:key=>preferences.get(key)||null,setItem:(key,value)=>preferences.set(key,value)},sessionStorage:{getItem(key){if(denyStorage)throw Error('denied');return store.get(key)||null;},setItem(key,value){if(denyStorage)throw Error('denied');store.set(key,value);},removeItem(key){if(denyStorage)throw Error('denied');store.delete(key);}},location:{href:'https://example.org/twin/'}});
 const source=readFileSync(new URL('../src/ai.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/\bexport /g,'').replaceAll('import.meta.env.BASE_URL',"'./'").replaceAll('import.meta.url',"'https://example.org/twin/ai.js'");
 vm.runInContext(source,context);
 return {context,loads:()=>loads,call:code=>vm.runInContext(code,context),store,release:()=>release?.()};
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
test('AI diagnostics record only task metadata and are cleared after success',async()=>{
 const s=session(true,{pauseAction:'generate'});
 const pending=s.call("generate([{role:'user',content:'private journal content'}])");await new Promise(setImmediate);
 const marker=s.store.get('twin-pending-ai-task');assert(marker);assert(!marker.includes('private'));assert.equal(JSON.parse(marker).action,'generate');
 s.release();await pending;assert.equal(s.store.has('twin-pending-ai-task'),false);
});
test('an interrupted task is detected once after reopening without saving credentials',()=>{
 const store=new Map([['twin-pending-ai-task',JSON.stringify({action:'load',startedAt:Date.now(),id:1})]]);
 const s=session(true,{store});assert.equal(s.call('takeInterruptedTask().action'),'load');assert.equal(s.call('takeInterruptedTask()'),null);
 assert.equal(store.size,0);
 for(const value of ['bad JSON',JSON.stringify({action:'unknown',startedAt:Date.now()}),JSON.stringify({action:'generate',startedAt:Date.now()-25*60*60_000})]){store.set('twin-pending-ai-task',value);assert.equal(s.call('takeInterruptedTask()'),null);}
});
test('manual cancellation clears pending diagnostics and releases the worker',async()=>{
 const s=session(true,{pauseAction:'load'}),pending=s.call('loadAI()').then(()=>null,error=>error);await new Promise(setImmediate);
 assert(s.store.has('twin-pending-ai-task'));s.call('stop()');assert.equal((await pending).message,'AI_CANCELLED');
 assert.equal(s.store.has('twin-pending-ai-task'),false);assert.equal(s.call('aiState().ready'),false);
});
test('blocked diagnostic storage never prevents using saved local AI',async()=>{
 const s=session(true,{denyStorage:true});await s.call('loadAI()');assert.equal(s.call('aiState().ready'),true);assert.equal(s.call('takeInterruptedTask()'),null);
});
test('iPhone defaults to the smaller model and full Qwen requires an explicit selection',async()=>{
 const light=session(true);await light.call('capabilities()');assert.equal(light.call('aiState().mode'),'mobile');assert.equal(light.call('aiState().cached'),true);
 const full=session(true,{full:true});await full.call('capabilities()');assert.equal(full.call('aiState().mode'),'cpu');assert.equal(full.call('aiState().cached'),true);
 await full.call('useMobile()');assert.equal(full.call('aiState().mode'),'mobile');assert.equal(full.call('aiState().cached'),false);
 await full.call('useFullCPU()');assert.equal(full.call('aiState().mode'),'cpu');assert.equal(full.call('aiState().cached'),true);
});
