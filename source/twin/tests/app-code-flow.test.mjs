import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {runInContext} from 'node:vm';
import {generateKeyPairSync,sign,webcrypto} from 'node:crypto';
import {openVaultRepository} from '../src/repository.js';
import {openDeviceAccess} from '../src/access.js';
import {verifyLicense} from '../src/license.js';
import {createVault,validateVault,stats,projection,retrieve,weeklyDue,dayKey,parseDay,money,EMBEDDING_MODEL} from '../src/domain.js';
import {messages} from '../src/prompts.js';
import {sealDevice,sealAudio,unsealAudio} from '../src/device-vault.js';
import {deriveKey,newSalt,seal} from '../src/crypto.js';
import {createVoiceRecorder} from '../src/voice.js';
const {privateKey,publicKey}=generateKeyPairSync('ed25519'),publicRaw=publicKey.export({format:'jwk'}).x;
const payload=Buffer.from(JSON.stringify({product:'twin',version:1,id:'ui-test',issuedAt:Date.now()})).toString('base64url'),signed='TWIN1.'+payload,CODE=signed+'.'+sign(null,Buffer.from(signed),privateKey).toString('base64url');
async function app(t,repo){
 const dom=new JSDOM('<!doctype html><html><head><meta name="theme-color"></head><body><div id="app"></div><div id="toast"></div></body></html>',{url:'https://example.org/apps/twin/',runScripts:'outside-only'}),w=dom.window;
 t.after(()=>dom.window.close());
 Object.defineProperty(w,'crypto',{value:webcrypto});Object.defineProperty(w,'isSecureContext',{value:true});Object.defineProperty(w.navigator,'storage',{value:{persist:async()=>true}});
 w.structuredClone=structuredClone;w.Blob=Blob;w.URL.createObjectURL=URL.createObjectURL;w.URL.revokeObjectURL=URL.revokeObjectURL;w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.confirm=()=>true;
 let ready=false,stops=0;
 w.ai={aiState:()=>({mode:'mobile',ready,cached:true}),capabilities:async()=>({mode:'mobile',webgpu:false}),refreshCache:async()=>({cached:true}),isAppleMobile:()=>true,loadAI:async()=>{ready=true;},generate:async()=> 'We can review our goal before deciding.',embed:async()=>Array(384).fill(.1),stop(){ready=false;stops++;},takeInterruptedTask:()=>null};
 class FakeRecorder{
  static isTypeSupported(type){return type==='audio/mp4';}
  constructor(){this.state='inactive';this.mimeType='audio/mp4';}
  start(){this.state='recording';}
  stop(){if(this.state==='inactive')return;this.state='inactive';this.ondataavailable({data:new Blob(['fictional voice'],{type:'audio/mp4'})});this.onstop();}
 }
 Object.assign(w,{__TWIN_VERSION__:'2.0.0',Chart:class{destroy(){}},createVault,validateVault,stats,projection,retrieve,weeklyDue,dayKey,parseDay,money,EMBEDDING_MODEL,messages,sealDevice,sealAudio,unsealAudio,...repo,
  openDeviceAccess:r=>openDeviceAccess(r,{verify:code=>verifyLicense(code,publicRaw)}),createVoiceRecorder:options=>createVoiceRecorder({...options,mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})},Recorder:FakeRecorder}),decodeVoice:async()=>new Float32Array(16000).fill(.1),transcribeVoice:async()=> 'I took a walk and felt calmer.',stopTranscription(){}});
 const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('import.meta.env.PROD','false').replaceAll('import.meta.env.BASE_URL',"'./'");
 const context=dom.getInternalVMContext();runInContext(source.replace(/boot\(\);\s*$/,'globalThis.__boot=boot();'),context);await w.__boot;
 const submit=async(selector,values)=>{const form=w.document.querySelector(selector);assert(form,selector);for(const [name,value]of Object.entries(values)){const field=form.elements.namedItem(name);assert(field,name);field.value=value;}await w.onSubmit({target:form,preventDefault(){}});};
 const click=async(selector)=>{const button=w.document.querySelector(selector);assert(button,selector);button.click();await new Promise(setImmediate);for(let i=0;i<100&&runInContext('busy',context);i++)await new Promise(resolve=>setTimeout(resolve,10));await new Promise(setImmediate);};
 return {window:w,doc:w.document,submit,click,read:code=>runInContext(code,context),stops:()=>stops};
}
test('customer enters only a code, creates a profile, and reopens without an authentication form',async t=>{
 const repo=openVaultRepository('ui-'+crypto.randomUUID());t.after(()=>repo.close());const a=await app(t,repo);
 assert(a.doc.querySelector('form[data-form=activate]'));assert.equal(a.doc.querySelector('form[data-form=activate] input[type=password]'),null);
 await a.submit('form[data-form=activate]',{code:CODE});assert(a.doc.querySelector('form[data-form=onboard]'));assert.equal(a.doc.querySelector('form[data-form=onboard] input[type=password]'),null);
 await a.submit('form[data-form=onboard]',{name:'UI user',goal1:'Save for a trip',goal2:'Sleep regularly',goal3:'Take time off',budget:'500'});
 assert(a.doc.querySelector('[data-action=voice-record]'));assert.equal(a.doc.querySelector('[data-action=lock]'),null);
 const b=await app(t,repo);assert.equal(b.read('unlocked'),true);assert.equal(b.doc.querySelector('form[data-form=activate]'),null);
 await b.click('[data-page=ask]');await b.submit('form[data-form=ask]',{question:'What should we focus on today?'});assert.equal(b.read('unlocked'),true);assert.equal(b.read('vault.chats.length'),1);
});
test('old password is requested only for migration and is absent from subsequent opens',async t=>{
 const repo=openVaultRepository('ui-legacy-'+crypto.randomUUID());t.after(()=>repo.close());const vault=createVault({name:'Legacy',goals:['Save','Sleep','Walk'],budget:200});vault.license=CODE;const salt=newSalt(),key=await deriveKey('legacy-password-123',salt);await repo.writeRecord(await seal(vault,key,salt),0);
 const a=await app(t,repo);assert(a.doc.querySelector('form[data-form=migrate]'));await a.submit('form[data-form=migrate]',{password:'legacy-password-123',code:''});assert.equal(a.read('unlocked'),true);
 const b=await app(t,repo);assert.equal(b.read('unlocked'),true);assert.equal(b.doc.querySelector('form[data-form=migrate]'),null);
});
test('voice recording can be saved alone, then reviewed transcription is saved as searchable text',async t=>{
 const repo=openVaultRepository('ui-audio-'+crypto.randomUUID());t.after(()=>repo.close());const a=await app(t,repo);
 await a.submit('form[data-form=activate]',{code:CODE});await a.submit('form[data-form=onboard]',{name:'Voice',goal1:'Save',goal2:'Sleep',goal3:'Walk',budget:'400'});
 await a.click('[data-action=voice-record]');await a.click('[data-action=voice-stop]');assert(a.read('voiceDraft.blob.size')>0);
 await a.submit('form[data-form=note]',{text:'',date:dayKey(),spend:'0',sleep:'7'});assert.equal(a.read('vault.notes.length'),1);assert.equal((await repo.allAudio()).length,1);
 await a.click('[data-page=memories]');await a.click('[data-transcribe-note]');assert.match(a.doc.querySelector('form[data-form=edit-note] textarea').value,/took a walk/);
 await a.submit('form[data-form=edit-note]',{text:'I walked outdoors and felt calmer.'});assert.equal(a.read('vault.notes[0].text'),'I walked outdoors and felt calmer.');assert(a.stops()>0);
});
