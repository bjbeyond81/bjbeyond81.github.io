import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {messages} from '../src/prompts.js';
import {createVault,validateVault,stats,weeklyDue,dayKey} from '../src/domain.js';
function app({cached=true,online=true,fail=false,loadMs=0}={}){
 let ready=false,loads=0,generations=0,now=Date.parse('2026-10-29T12:00:00Z'),idleCheck,wakeLocks=0;
 const awakeStages=[];
 const documentEvents={};
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const root={querySelectorAll:()=>[],addEventListener(){}};
 const toast={classList:{add(){},remove(){}},textContent:''};
 const FormData=class{get(k){return k==='question'?'Should we buy this?':null;}};
 const ai={aiState:()=>({ready,cached}),capabilities:async()=>{},refreshCache:async()=>({cached}),isAppleMobile:()=>true,
 async loadAI(){loads++;awakeStages.push(['load',wakeLocks>0]);now+=loadMs;if(fail)throw Error('memory allocation failed');ready=true;},async generate(){generations++;awakeStages.push(['generate',wakeLocks>0]);return 'We wanted to save for a trip.';},stop(){ready=false;}};
 const document={hidden:false,querySelector:selector=>selector==='#app'?root:toast,addEventListener(name,callback){documentEvents[name]=callback;}};
 const context=vm.createContext({console,FormData,Date:Clock,Chart:class{},createVault,validateVault,stats,weeklyDue,dayKey,messages,structuredClone,ai,crypto:webcrypto,
 document,window:{addEventListener(){}},localStorage:{getItem(){},setItem(){}},navigator:{onLine:online,storage:{persist:async()=>true},wakeLock:{async request(){wakeLocks++;return {async release(){wakeLocks--;}};}}},matchMedia:()=>({addEventListener(){}}),setTimeout:()=>0,clearTimeout(){},setInterval(fn,ms){if(ms===30000)idleCheck=fn;},URL,location:{href:'https://example.org/twin/'}});
 const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('import.meta.env.PROD','false').replaceAll('import.meta.env.BASE_URL',"'./'").replace(/boot\(\);\s*$/,'');
 vm.runInContext(source,context);
 vm.runInContext("unlocked=true;vault=createVault({name:'QA',goals:['Save for a trip','Sleep regularly','Take time off'],budget:500});render=()=>{};persist=async candidate=>{vault=candidate;};",context);
 const event={target:{closest:()=>({dataset:{form:'ask'}})},preventDefault(){}};
 return {context,submit:()=>context.onSubmit(event),read:code=>vm.runInContext(code,context),counts:()=>({loads,generations}),toast,awakeStages,wakeLocks:()=>wakeLocks,advance:ms=>now+=ms,idle:()=>idleCheck(),visibility(hidden){document.hidden=hidden;documentEvents.visibilitychange();}};
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
test('a long AI operation does not immediately lock the journal when its answer arrives',async()=>{
 const a=app({loadMs:11*60_000});await a.submit();a.idle();
 assert.equal(a.read('unlocked'),true);assert.equal(a.read('vault.chats.length'),1);
 assert.deepEqual(a.awakeStages,[['load',true],['generate',true]]);assert.equal(a.wakeLocks(),0);
 a.advance(9*60_000);a.idle();assert.equal(a.read('unlocked'),true);
 a.advance(61_000);a.idle();assert.equal(a.read('unlocked'),false);
 assert.match(a.read('errorMessage'),/10 minutes/);
});
test('AI failure after a long wait leaves the unlocked journal and error visible',async()=>{
 const a=app({loadMs:11*60_000,fail:true});await a.submit();a.idle();
 assert.equal(a.read('unlocked'),true);assert.equal(a.read('vault.usage.questions'),0);
 assert.equal(a.wakeLocks(),0);
 assert.match(a.read('errorMessage'),/Local AI could not start/);
});
test('background expiry is enforced on return even if the browser suspended its timer',()=>{
 const a=app();a.visibility(true);a.advance(4*60_000);a.visibility(false);assert.equal(a.read('unlocked'),true);
 a.visibility(true);a.advance(6*60_000);a.visibility(false);assert.equal(a.read('unlocked'),false);
 assert.match(a.read('errorMessage'),/5 minutes/);assert.equal(a.read('vault'),null);assert.equal(a.read('key'),null);
});
