import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {messages} from '../src/prompts.js';
import {createVault,validateVault,stats,weeklyDue,dayKey} from '../src/domain.js';
function app({cached=true,online=true,fail=false}={}){
 let ready=false,loads=0,generations=0;
 const root={querySelectorAll:()=>[],addEventListener(){}};
 const toast={classList:{add(){},remove(){}},textContent:''};
 const FormData=class{get(k){return k==='question'?'Should we buy this?':null;}};
 const ai={aiState:()=>({ready,cached}),capabilities:async()=>{},refreshCache:async()=>({cached}),isAppleMobile:()=>true,
 async loadAI(){loads++;if(fail)throw Error('memory allocation failed');ready=true;},async generate(){generations++;return 'We wanted to save for a trip.';},stop(){ready=false;}};
 const context=vm.createContext({console,FormData,Chart:class{},createVault,validateVault,stats,weeklyDue,dayKey,messages,structuredClone,ai,crypto:webcrypto,
 document:{querySelector:selector=>selector==='#app'?root:toast,addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem(){},setItem(){}},navigator:{onLine:online,storage:{persist:async()=>true}},matchMedia:()=>({addEventListener(){}}),setTimeout:()=>0,clearTimeout(){},setInterval(){},URL,location:{href:'https://example.org/twin/'}});
 const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('import.meta.env.PROD','false').replaceAll('import.meta.env.BASE_URL',"'./'").replace(/boot\(\);\s*$/,'');
 vm.runInContext(source,context);
 vm.runInContext("unlocked=true;vault=createVault({name:'QA',goals:['Save for a trip','Sleep regularly','Take time off'],budget:500});render=()=>{};persist=async candidate=>{vault=candidate;};",context);
 const event={target:{closest:()=>({dataset:{form:'ask'}})},preventDefault(){}};
 return {context,submit:()=>context.onSubmit(event),read:code=>vm.runInContext(code,context),counts:()=>({loads,generations}),toast};
}
test('Ask Twin starts saved AI and answers the original question without a Settings redirect',async()=>{
 const a=app();await a.submit();
 assert.deepEqual(a.counts(),{loads:1,generations:1});assert.equal(a.read('page'),'today');
 assert.equal(a.read('vault.chats[0].question'),'Should we buy this?');assert.equal(a.read('vault.usage.questions'),1);
});
test('saved files can start when offline; another question reuses the running session',async()=>{
 const a=app({online:false});await a.submit();await a.submit();
 assert.deepEqual(a.counts(),{loads:1,generations:2});
});
test('incomplete offline setup gives a clear error and does not consume a demo question',async()=>{
 const a=app({cached:false,online:false});await a.submit();
 assert.deepEqual(a.counts(),{loads:0,generations:0});assert.equal(a.read('vault.usage.questions'),0);
 assert.match(a.read('errorMessage'),/incomplete on this device/);
});
test('failed AI startup preserves the diary and the question allowance',async()=>{
 const a=app({fail:true});await a.submit();
 assert.equal(a.read('vault.profile.name'),'QA');assert.equal(a.read('vault.usage.questions'),0);assert.equal(a.read('vault.chats.length'),0);assert.equal(a.read('askDraft'),'Should we buy this?');
});
