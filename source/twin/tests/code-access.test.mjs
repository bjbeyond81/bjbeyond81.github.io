import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {openDB} from 'idb';
import {openVaultRepository} from '../src/repository.js';
import {openDeviceAccess} from '../src/access.js';
import {verifyLicense} from '../src/license.js';
import {createVault} from '../src/domain.js';
import {deriveKey,newSalt,seal} from '../src/crypto.js';
import {sealDevice,unsealDevice,sealAudio,unsealAudio,sealCodeBackup,unsealCodeBackup} from '../src/device-vault.js';
const {privateKey,publicKey}=generateKeyPairSync('ed25519'),publicRaw=publicKey.export({format:'jwk'}).x;
function code(id){const payload=Buffer.from(JSON.stringify({version:1,product:'twin',id,issuedAt:Date.now()})).toString('base64url'),signed='TWIN1.'+payload;return signed+'.'+sign(null,Buffer.from(signed),privateKey).toString('base64url');}
const CODE=code('customer-one'),OTHER=code('customer-two'),profile={name:'PRIVATE USER',goals:['Save for a trip','Sleep regularly','Take time off'],budget:500};
const access=repo=>openDeviceAccess(repo,{verify:value=>verifyLicense(value,publicRaw)});
const repository=()=>openVaultRepository('code-test-'+crypto.randomUUID());
async function create(repo){const a=access(repo);await a.activate(CODE);return a.createProfile(profile);}
test('activation is saved once and a reopened journal needs no password or repeated code',async()=>{
 const repo=repository(),a=access(repo);assert.equal((await a.open()).stage,'activation');
 await assert.rejects(a.activate('invalid-code'),/LICENSE/);assert.equal(await repo.readDeviceState(),undefined);
 assert.equal((await a.activate(CODE)).stage,'profile');const state=await a.createProfile(profile);assert.equal(state.stage,'ready');
 assert(!JSON.stringify(await repo.readRecord()).includes('PRIVATE USER'));assert.equal((await repo.readDeviceState()).key.extractable,false);
 const name=(await repo.readDeviceState()).activation;assert.equal(name,CODE);const reopened=await a.open();assert.equal(reopened.vault.profile.name,profile.name);assert.equal(reopened.stage,'ready');
 await repo.close();
});
test('v1 database and encrypted journal migrate atomically after one correct old password',async()=>{
 const name='legacy-'+crypto.randomUUID(),old=await openDB(name,1,{upgrade(db){db.createObjectStore('vault');}}),vault=createVault(profile);vault.license=CODE;
 vault.notes.push({id:'old-note',date:'2026-10-29',text:'PRIVATE LEGACY MEMORY',spend:12,mood:4,sleep:7,embedding:null});vault.usage.notes=1;
 const salt=newSalt(),key=await deriveKey('old-password-123',salt),envelope={...await seal(vault,key,salt),revision:1};await old.put('vault',envelope,'current');old.close();
 const repo=openVaultRepository(name),a=access(repo);assert.equal((await a.open()).stage,'legacy');
 await assert.rejects(a.migrate('wrong-password'));assert.equal((await repo.readRecord()).format,'twin-v1');
 const migrated=await a.migrate('old-password-123');assert.equal(migrated.stage,'ready');assert.equal(migrated.vault.notes[0].text,'PRIVATE LEGACY MEMORY');assert.equal(migrated.vault.license,CODE);assert.equal(migrated.record.format,'twin-device-v2');
 assert.equal((await a.open()).stage,'ready');assert.equal((await a.open()).vault.usage.notes,1);await repo.close();
});
test('voice recordings stay encrypted and code backups restore text and audio with a new device key',async()=>{
 const repo=repository(),state=await create(repo),vault=state.vault,blob=new Blob(['PRIVATE AUDIO CONTENT'],{type:'audio/mp4'}),item=await sealAudio(blob,state.key,{id:'audio-1',noteId:'note-1',duration:4});
 vault.notes.push({id:'note-1',date:'2026-10-29',text:'Reviewed transcript',spend:0,mood:3,sleep:7,embedding:null,audio:{id:item.id,mimeType:item.mimeType,duration:item.duration,size:item.size}});
 await repo.writeRecord(await sealDevice(vault,state.key),state.record.revision,{putAudio:[item]});
 assert(!Buffer.from((await repo.getAudio(item.id)).data).toString().includes('PRIVATE AUDIO CONTENT'));
 const backup=await access(repo).backup(vault,state.key,CODE);assert(!JSON.stringify(backup).includes('Reviewed transcript'));
 const destination=repository();await create(destination);const previous=await destination.readRecord();
 await assert.rejects(access(destination).restore(backup,OTHER));assert.deepEqual(await destination.readRecord(),previous);
 await assert.rejects(access(destination).restore(backup,CODE,'',{guard(){throw new Error('AI_CANCELLED');}}),/AI_CANCELLED/);assert.deepEqual(await destination.readRecord(),previous);
 const malformed=await unsealCodeBackup(backup,CODE);malformed.vault.notes[0].audio.size++;
 await assert.rejects(access(destination).restore(await sealCodeBackup(malformed,CODE),CODE),/INVALID_BACKUP/);assert.deepEqual(await destination.readRecord(),previous);
 const restored=await access(destination).restore(backup,CODE.replaceAll('.','.\n'));assert.equal(restored.vault.notes[0].text,'Reviewed transcript');
 assert.equal(await(await unsealAudio(await destination.getAudio('audio-1'),restored.key)).text(),'PRIVATE AUDIO CONTENT');
 await assert.rejects(unsealDevice(restored.record,state.key));await repo.close();await destination.close();
});
test('voice quota and stale revisions roll back journal, key metadata, and attachments together',async()=>{
 const repo=repository(),state=await create(repo),before=await repo.readRecord();
 const tooMany=Array.from({length:6},(_,i)=>({id:'audio-'+i,data:new ArrayBuffer(4*1024*1024)}));
 await assert.rejects(repo.writeRecord(await sealDevice(state.vault,state.key),before.revision,{putAudio:tooMany}),/AUDIO_STORAGE_FULL/);
 assert.deepEqual(await repo.readRecord(),before);assert.equal((await repo.allAudio()).length,0);
 await repo.writeRecord(await sealDevice(state.vault,state.key),before.revision);await assert.rejects(repo.writeRecord(before,before.revision),/CONFLICT/);await repo.close();
});
test('activation cannot overwrite a journal whose device key is missing',async()=>{
 const repo=repository(),state=await create(repo),before=await repo.readRecord();await repo.saveDeviceState({activation:CODE,key:null},before.revision);
 await assert.rejects(access(repo).open(),/DEVICE_KEY_MISSING/);await assert.rejects(access(repo).activate(CODE),/DEVICE_KEY_MISSING/);assert.deepEqual(await repo.readRecord(),before);await repo.close();
});
test('audio authentication binds recordings to their note and erase removes activation and audio',async()=>{
 const repo=repository(),state=await create(repo),item=await sealAudio(new Blob(['private'],{type:'audio/mp4'}),state.key,{id:'a',noteId:'n',duration:1});
 await assert.rejects(unsealAudio({...item,noteId:'other'},state.key));
 await repo.writeRecord(await sealDevice(state.vault,state.key),state.record.revision,{putAudio:[item]});await repo.eraseRecord();
 assert.equal(await repo.readRecord(),undefined);assert.equal(await repo.readDeviceState(),undefined);assert.equal((await repo.allAudio()).length,0);await repo.close();
});

test('commit hooks cover the entire non-cancellable database write',async()=>{
 const repo=repository();await create(repo);const original=repo.commitDevice;
 let entered,release,starts=0,ends=0;const started=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
 repo.commitDevice=async(...args)=>{entered();await gate;return original(...args);};
 const pending=access(repo).activate(CODE,{onCommitStart(){starts++;},onCommitEnd(){ends++;}});
 await started;assert.equal(starts,1);assert.equal(ends,0);release();await pending;assert.equal(ends,1);await repo.close();
});
