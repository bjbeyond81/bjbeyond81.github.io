import {verifyLicense} from './license.js';
import {createVault,validateVault} from './domain.js';
import {deriveKey,from64,unseal,validateEnvelope,to64} from './crypto.js';
import {normalizeCode,newDeviceKey,sealDevice,unsealDevice,sealAudio,unsealAudio,sealCodeBackup,unsealCodeBackup} from './device-vault.js';
export function openDeviceAccess(repository,{verify=verifyLicense}={}){
 async function checkedCode(value){const code=normalizeCode(value);await verify(code);return code;}
 async function state(){return repository.readSnapshot();}
 async function commit(vault,key,code,revision,options,{guard,onCommitStart,onCommitEnd}){
  const encrypted=await sealDevice(vault,key);guard();onCommitStart?.();
  try{await repository.commitDevice(encrypted,key,code,revision,options);}finally{onCommitEnd?.();}
 }
 async function open(){
  const {record,deviceState}=await state();
  if(record?.format==='twin-v1')return {stage:'legacy',record,activation:deviceState?.activation||''};
  if(!deviceState?.activation)return {stage:'activation',record};
  try{await checkedCode(deviceState.activation);}catch{return {stage:'activation',record};}
  if(record&&!deviceState.key)throw new Error('DEVICE_KEY_MISSING');
  if(!record)return {stage:'profile',activation:deviceState.activation,key:deviceState.key};
  const vault=validateVault(await unsealDevice(record,deviceState.key));
  return {stage:'ready',vault,record,key:deviceState.key,activation:deviceState.activation};
 }
 return {
  open,
  async activate(value,{guard=()=>{},onCommitStart,onCommitEnd}={}){
   const code=await checkedCode(value),{record,deviceState}=await state();
   if(record?.format==='twin-device-v2'&&!deviceState?.key)throw new Error('DEVICE_KEY_MISSING');
   const key=deviceState?.key||await newDeviceKey();
   if(record?.format==='twin-device-v2'){
    const vault=validateVault(await unsealDevice(record,key));vault.license=code;await commit(vault,key,code,record.revision,{},{guard,onCommitStart,onCommitEnd});
   }else{guard();await repository.saveDeviceState({key,activation:code},record?.revision||0);}
   return open();
  },
  async createProfile(profile,{guard=()=>{},onCommitStart,onCommitEnd}={}){
   const {record,deviceState}=await state();if(record)throw new Error('CONFLICT');
   const code=await checkedCode(deviceState?.activation);if(!deviceState?.key)throw new Error('DEVICE_KEY_MISSING');
   const vault=validateVault(createVault(profile));vault.license=code;await commit(vault,deviceState.key,code,0,{},{guard,onCommitStart,onCommitEnd});return open();
  },
  async migrate(password,value='',{guard=()=>{},onCommitStart,onCommitEnd}={}){
   const {record,deviceState}=await state();if(record?.format!=='twin-v1')throw new Error('CONFLICT');
   const oldKey=await deriveKey(password,from64(record.salt)),vault=validateVault(await unseal(record,oldKey));
   const code=await checkedCode(value||deviceState?.activation||vault.license);vault.license=code;const key=deviceState?.key||await newDeviceKey();
   await commit(vault,key,code,record.revision,{legacyRecovery:record},{guard,onCommitStart,onCommitEnd});return open();
  },
  async backup(vault,key,activation){
   const code=await checkedCode(activation),audios=[],seen=new Set();
   for(const item of await repository.allAudio()){
    if(!vault.notes.some(n=>n.audio?.id===item.id&&n.id===item.noteId))continue;
    const blob=await unsealAudio(item,key);seen.add(item.id);audios.push({id:item.id,noteId:item.noteId,mimeType:blob.type,duration:item.duration,data:to64(await blob.arrayBuffer())});
   }
   if(vault.notes.some(n=>n.audio&&!seen.has(n.audio.id)))throw new Error('CONFLICT');
   return sealCodeBackup({product:'twin',version:2,vault:validateVault(structuredClone(vault)),audios},code);
  },
  async restore(envelope,value,legacyPassword='',{guard=()=>{},onCommitStart,onCommitEnd}={}){
   const original=await repository.readRecord();
   let data;
   if(envelope?.format==='twin-code-backup-v2'){
    await checkedCode(value);data=await unsealCodeBackup(envelope,value);if(data?.product!=='twin'||data.version!==2||!Array.isArray(data.audios)||data.audios.length>1000)throw new Error('INVALID_BACKUP');
   }else{validateEnvelope(envelope);const oldKey=await deriveKey(legacyPassword,from64(envelope.salt));data={vault:await unseal(envelope,oldKey),audios:[]};}
   const vault=validateVault(data.vault),code=await checkedCode(value||vault.license),key=await newDeviceKey(),putAudio=[],seen=new Set();let total=0;
   for(const item of data.audios){
    const note=vault.notes.find(n=>n.id===item.noteId&&n.audio?.id===item.id);
    if(seen.has(item.id)||!note)throw new Error('INVALID_BACKUP');seen.add(item.id);
    const bytes=from64(item.data,6_000_000);total+=bytes.length;if(total>20*1024*1024)throw new Error('AUDIO_STORAGE_FULL');
    if(note.audio.size!==bytes.length||note.audio.mimeType!==item.mimeType||note.audio.duration!==item.duration)throw new Error('INVALID_BACKUP');
    putAudio.push(await sealAudio(new Blob([bytes],{type:item.mimeType}),key,{id:item.id,noteId:item.noteId,duration:item.duration}));
   }
   if(vault.notes.some(n=>n.audio&&!seen.has(n.audio.id)))throw new Error('INVALID_BACKUP');
   vault.license=code;await commit(vault,key,code,original?.revision||0,{putAudio,replaceAudio:true},{guard,onCommitStart,onCommitEnd});return open();
  }
 };
}
