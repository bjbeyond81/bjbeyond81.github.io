import 'fake-indexeddb/auto';
import test from 'node:test';import assert from 'node:assert/strict';
import {openVaultRepository} from '../src/repository.js';
import {deriveKey,newSalt,seal,unseal} from '../src/crypto.js';
test('IndexedDB persists only encrypted envelopes; competing tabs cannot overwrite newer data',async()=>{
 const name='test-'+crypto.randomUUID();const a=openVaultRepository(name),b=openVaultRepository(name);
 const salt=newSalt(),key=await deriveKey('test-password-123',salt);const first=await seal({name:'PRIVATE',embedding:[.3]},key,salt);
 assert.equal(await a.writeRecord(first,0),1);const loaded=await b.readRecord();assert(!JSON.stringify(loaded).includes('PRIVATE'));assert.equal((await unseal(loaded,key)).name,'PRIVATE');
 const changed=await seal({name:'SECOND'},key,salt);assert.equal(await b.writeRecord(changed,1),2);await assert.rejects(()=>a.writeRecord(first,1),/CONFLICT/);assert.equal((await a.readRecord()).revision,2);
 await a.close();const c=openVaultRepository(name);assert.equal((await c.readRecord()).revision,2);await c.eraseRecord();assert.equal(await c.readRecord(),undefined);await b.close();await c.close();
});
