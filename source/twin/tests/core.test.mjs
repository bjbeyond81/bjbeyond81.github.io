import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,generateKeyPairSync,sign} from 'node:crypto';
import {deriveKey,newSalt,seal,unseal,from64,to64,validateEnvelope} from '../src/crypto.js';
import {createVault,validateVault,stats,projection,retrieve,weeklyDue,correlation,dayKey,EMBEDDING_MODEL} from '../src/domain.js';
import {verifyLicense} from '../src/license.js';
import {messages,SYSTEM_PROMPT} from '../src/prompts.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const profile={name:'Test',goals:['Goal A','Goal B','Goal C'],budget:1000};
const note=(date,spend,sleep=7,mood=3)=>({id:crypto.randomUUID(),date,text:'Private thought',spend,sleep,mood,embedding:null,embeddingModel:EMBEDDING_MODEL});
test('AES-GCM roundtrip: all sensitive content including embeddings stays encrypted',async()=>{
 const salt=newSalt(),key=await deriveKey('test-password-123',salt),v=createVault(profile);v.notes=[{...note('2026-10-01',20),embedding:Array(384).fill(.1)}];
 const r=await seal(v,key,salt);assert.equal(key.extractable,false);assert(!JSON.stringify(r).includes('Private'));assert.deepEqual(await unseal(r,key),v);
 const r2=await seal(v,key,salt);assert.notEqual(r.iv,r2.iv);assert.notEqual(r.data,r2.data);
 await assert.rejects(()=>unseal(r,deriveKey));
 const wrong=await deriveKey('different-password',salt);await assert.rejects(()=>unseal(r,wrong));
 const modified=structuredClone(r);const bytes=from64(modified.data);bytes[8]^=1;modified.data=to64(bytes);await assert.rejects(()=>unseal(modified,key));
});
test('backup rejects unsafe or incompatible parameters before key derivation',()=>{
 assert.throws(()=>validateEnvelope({format:'twin-v1',iterations:1,salt:'!'}));
 assert.throws(()=>from64('invalid!'));assert.throws(()=>validateVault({}));
});
test('vault validation rejects invalid dates, amounts, vectors and IDs',()=>{
 const v=createVault(profile);v.notes=[note('2026-02-30',1)];assert.throws(()=>validateVault(v));
 v.notes=[note('2026-10-01',-1)];assert.throws(()=>validateVault(v));
 v.notes=[{...note('2026-10-01',1),embedding:[1]}];assert.throws(()=>validateVault(v));
 v.notes=[note('2026-10-01',1)];v.notes.push({...v.notes[0]});assert.throws(()=>validateVault(v));
});
test('demo counters cannot be reset by deleting a note',()=>{
 const v=createVault(profile);v.notes=[note('2026-10-01',1)];v.usage.notes=3;assert.equal(validateVault(v).usage.notes,3);v.notes=[];assert.equal(validateVault(v).usage.notes,3);
});
test('multiple entries per day sum money and average mood and sleep',()=>{
 const s=stats([note('2026-10-01',10,6,2),note('2026-10-01',20,8,4),note('2026-10-02',5,9,5)],new Date(2026,9,29));
 assert.equal(s.observedDays,2);assert.equal(s.days[0].spend,30);assert.equal(s.days[0].sleep,7);assert.equal(s.days[0].mood,3);assert.equal(s.averageSpend,17.5);assert.equal(s.monthSpend,35);
});
test('missing days are unknown, future entries are excluded and monthly totals are scoped',()=>{
 const s=stats([note('2026-09-30',10),note('2026-10-01',20),note('2026-10-31',1000)],new Date(2026,9,29));
 assert.equal(s.observedDays,2);assert.equal(s.monthSpend,20);assert.equal(s.averageSpend,15);assert.equal(s.sleepSpendCorrelation,null);
});
test('Pearson correlation requires 7 paired days and variable samples',()=>{
 assert.equal(correlation([1,2],[2,4]),null);assert.equal(correlation(Array(7).fill(7),[1,2,3,4,5,6,7]),null);
 assert(Math.abs(correlation([1,2,3,4,5,6,7],[2,4,6,8,10,12,14])-1)<1e-10);
 assert(Math.abs(correlation([1,2,3,4,5,6,7],[14,12,10,8,6,4,2])+1)<1e-10);
});
test('projection uses only the formula, 13 points, no interest or invented income',()=>{
 const s=stats(Array.from({length:7},(_,i)=>note(`2026-10-0${i+1}`,10)),new Date(2026,9,29));
 const p=projection(s,20);assert.equal(p.baseline.length,13);assert.equal(p.baseline[0],0);assert(Math.abs(p.baseline[12]-3652.425)<.001);assert(Math.abs(p.difference-730.485)<.001);assert.equal(projection({...s,observedDays:6},20),null);assert.equal(projection(s,-1),null);
});
test('RAG ranks by cosine and retrieves at most 5 compatible memories',()=>{
 const notes=Array.from({length:8},(_,i)=>({...note(`2026-10-0${i+1}`,1),embedding:[i+1,8-i]}));
 notes.push({...note('2026-10-09',1),embedding:[100,0],embeddingModel:'other'});
 const results=retrieve(notes,[1,0]);assert.equal(results.length,5);assert.equal(results[0].embedding[0],8);assert(results.every(n=>n.embeddingModel===EMBEDDING_MODEL));
});
test('weekly letters use local Sunday keys and do not duplicate after reload',()=>{
 const sunday=new Date(2026,9,25,23),monday=new Date(2026,9,26,0);assert.equal(weeklyDue([],sunday),'2026-10-25');assert.equal(weeklyDue([],monday),'2026-10-25');assert.equal(weeklyDue([{date:'2026-10-25'}],monday),null);
});
test('Ed25519 accepts a signed license, rejects modified payload, wrong product and wrong key',async()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');const pub=publicKey.export({format:'jwk'}).x;
 const issue=p=>{const data=Buffer.from(JSON.stringify(p)).toString('base64url');const content='TWIN1.'+data;return content+'.'+sign(null,Buffer.from(content),privateKey).toString('base64url');};
 const p={version:1,product:'twin',id:'test-order',issuedAt:Date.now()};const code=issue(p);assert.equal((await verifyLicense(code,pub)).id,'test-order');
 const wrapped=code.match(/.{1,67}/g).join('\n');assert.equal((await verifyLicense(wrapped,pub)).id,'test-order');
 const parts=code.split('.');parts[1]=Buffer.from(JSON.stringify({...p,id:'changed'})).toString('base64url');await assert.rejects(()=>verifyLicense(parts.join('.'),pub));
 await assert.rejects(()=>verifyLicense(issue({...p,product:'other'}),pub));
 await assert.rejects(()=>verifyLicense(issue({...p,expiresAt:1}),pub));
 await assert.rejects(()=>verifyLicense(code,generateKeyPairSync('ed25519').publicKey.export({format:'jwk'}).x));
 await assert.rejects(()=>verifyLicense('not-a-code',pub));
});
test('prompt confines facts to profile, statistics and explicit untrusted memories',()=>{
 const s=stats([],new Date(2026,9,29));const m=messages({profile,statistics:s,memories:[],question:'Should we?',language:'en'});assert(m[0].content.startsWith(SYSTEM_PROMPT));assert(m[0].content.includes('untrusted'));assert(m[1].content.includes('Goal A'));assert(!m[1].content.includes('undefined'));assert(m[0].content.includes('English'));
});
test('backup rejects malformed source dates instead of crashing the memory renderer',()=>{
 const v=createVault(profile);v.chats=[{id:'q',date:'2026-10-01',question:'Q',answer:'A',sources:[{id:'a',date:'invalid',text:'source'}]}];assert.throws(()=>validateVault(v));
 v.chats=[];v.letters=[{id:'l',date:'invalid',text:'letter'}];assert.throws(()=>validateVault(v));
});

test('RAG excludes zero, negative and weak semantic matches and returns a real empty state',()=>{
 const notes=[
  {...note('2026-10-01',1),embedding:[1,0]},
  {...note('2026-10-02',1),embedding:[0,1]},
  {...note('2026-10-03',1),embedding:[-1,0]},
  {...note('2026-10-04',1),embedding:[1,10]},
  {...note('2026-10-05',1),embedding:[0,0]}
 ];
 const results=retrieve(notes,[1,0]);assert.equal(results.length,1);assert(results.every(n=>n.score>=.25));
 assert.deepEqual(retrieve(notes.slice(1),[1,0]),[]);
 assert.equal(retrieve(notes,[1,0],{minScore:.99}).length,1);
});
