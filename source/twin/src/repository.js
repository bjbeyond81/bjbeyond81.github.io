import {openDB} from 'idb';
export function openVaultRepository(name){
 let handle;
 async function db(){return handle ||= await openDB(name,1,{upgrade(db){db.createObjectStore('vault');}});}
 return {
  async readRecord(){return (await db()).get('vault','current');},
  async writeRecord(envelope,expectedRevision=0){
   const tx=(await db()).transaction('vault','readwrite');
   const existing=await tx.store.get('current');
   if((existing?.revision||0)!==expectedRevision){tx.abort();await tx.done.catch(()=>{});throw new Error('CONFLICT');}
   const revision=expectedRevision+1;
   await tx.store.put({...envelope,revision},'current');await tx.done;return revision;
  },
  async eraseRecord(){await(await db()).clear('vault');},
  async close(){(await db()).close();handle=null;}
 };
}
