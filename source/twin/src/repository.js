import {openDB} from 'idb';
export const MAX_AUDIO_STORAGE=20*1024*1024;
export function openVaultRepository(name){
 let handle;
 async function db(){
  if(!handle){
   const opening=openDB(name,2,{upgrade(database){for(const store of ['vault','meta','audio'])if(!database.objectStoreNames.contains(store))database.createObjectStore(store);},blocking(){opening.then(database=>database.close());}});
   let timer;handle=Promise.race([opening,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('STORAGE_BUSY')),12_000);})]).finally(()=>clearTimeout(timer));
   handle.catch(()=>{handle=null;opening.then(database=>database.close()).catch(()=>{});});
  }
  return handle;
 }
 async function checkRevision(tx,expected){const existing=await tx.objectStore('vault').get('current');if((existing?.revision||0)!==expected)throw new Error('CONFLICT');}
 async function audioChanges(tx,{putAudio=[],deleteAudio=[],replaceAudio=false}={}){
  const audio=tx.objectStore('audio'),meta=tx.objectStore('meta');let used=(await meta.get('audioBytes'))||0;
  if(replaceAudio){await audio.clear();used=0;}
  for(const id of deleteAudio){const old=await audio.get(id);if(old)used-=old.data.byteLength;await audio.delete(id);}
  for(const item of putAudio){
   if(!item||typeof item.id!=='string'||!item.data?.byteLength||item.data.byteLength>4*1024*1024+16)throw new Error('INVALID_AUDIO');
   const old=await audio.get(item.id);used+=item.data.byteLength-(old?.data?.byteLength||0);if(used>MAX_AUDIO_STORAGE)throw new Error('AUDIO_STORAGE_FULL');await audio.put(item,item.id);
  }
  await meta.put(Math.max(0,used),'audioBytes');
 }
 async function write(envelope,expectedRevision,options={}){
  const tx=(await db()).transaction(['vault','meta','audio'],'readwrite');
  try{
   await checkRevision(tx,expectedRevision);const revision=expectedRevision+1;
   if(options.deviceState)await tx.objectStore('meta').put(options.deviceState,'device');
   if(options.legacyRecovery)await tx.objectStore('meta').put(options.legacyRecovery,'legacyRecovery');
   await audioChanges(tx,options);await tx.objectStore('vault').put({...envelope,revision},'current');await tx.done;return revision;
  }catch(error){try{tx.abort();}catch{}await tx.done.catch(()=>{});throw error;}
 }
 return {
  async readRecord(){return (await db()).get('vault','current');},
  async readDeviceState(){return (await db()).get('meta','device');},
  async readSnapshot(){const tx=(await db()).transaction(['vault','meta'],'readonly');const [record,deviceState]=await Promise.all([tx.objectStore('vault').get('current'),tx.objectStore('meta').get('device')]);await tx.done;return {record,deviceState};},
  async saveDeviceState(deviceState,expectedRevision=0){const tx=(await db()).transaction(['vault','meta'],'readwrite');try{await checkRevision(tx,expectedRevision);await tx.objectStore('meta').put(deviceState,'device');await tx.done;}catch(error){try{tx.abort();}catch{}await tx.done.catch(()=>{});throw error;}},
  writeRecord:write,
  async commitDevice(envelope,key,activation,expectedRevision=0,options={}){return write(envelope,expectedRevision,{...options,deviceState:{key,activation}});},
  async getAudio(id){return (await db()).get('audio',id);},
  async allAudio(){return (await db()).getAll('audio');},
  async eraseRecord(){const tx=(await db()).transaction(['vault','meta','audio'],'readwrite');for(const store of ['vault','meta','audio'])await tx.objectStore(store).clear();await tx.done;},
  async close(){if(handle)(await handle).close();handle=null;}
 };
}
