import {deriveKey,newSalt,to64,from64,KDF_ITERATIONS} from './crypto.js';
const encoder=new TextEncoder(),decoder=new TextDecoder();
export const normalizeCode=code=>String(code||'').replace(/\s+/g,'');
export const newDeviceKey=()=>crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
export async function sealDevice(value,key){
 const plain=encoder.encode(JSON.stringify(value));if(plain.byteLength>24*1024*1024)throw new Error('VAULT_FULL');
 const iv=crypto.getRandomValues(new Uint8Array(12)),data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('Twin/device/v2')},key,plain);
 return {format:'twin-device-v2',iv:to64(iv),data:to64(data)};
}
export async function unsealDevice(record,key){
 if(record?.format!=='twin-device-v2'||from64(record.iv).length!==12||from64(record.data).length<16)throw new Error('INVALID_DEVICE_VAULT');
 return JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(record.iv),additionalData:encoder.encode('Twin/device/v2')},key,from64(record.data))));
}
export async function sealAudio(blob,key,{id,noteId,duration}){
 if(!(blob instanceof Blob)||blob.size===0||blob.size>4*1024*1024||!Number.isFinite(duration)||duration<=0||duration>181||!/^audio\//.test(blob.type))throw new Error('INVALID_AUDIO');
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('Twin/audio/v2/'+id+'/'+noteId)},key,await blob.arrayBuffer());
 return {format:'twin-audio-v2',id,noteId,duration,mimeType:blob.type,size:blob.size,iv:to64(iv),data};
}
export async function unsealAudio(record,key){
 if(record?.format!=='twin-audio-v2'||!record.id||!record.noteId||!/^audio\//.test(record.mimeType)||!record.data?.byteLength||record.data.byteLength>4*1024*1024+16)throw new Error('INVALID_AUDIO');
 const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(record.iv),additionalData:encoder.encode('Twin/audio/v2/'+record.id+'/'+record.noteId)},key,record.data);
 return new Blob([bytes],{type:record.mimeType});
}
export async function sealCodeBackup(value,code){
 const plain=encoder.encode(JSON.stringify(value));if(plain.byteLength>80*1024*1024)throw new Error('BACKUP_FULL');
 const salt=newSalt(),key=await deriveKey(normalizeCode(code),salt),iv=crypto.getRandomValues(new Uint8Array(12));
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('Twin/code-backup/v2')},key,plain);
 return {format:'twin-code-backup-v2',kdf:'PBKDF2-SHA256',iterations:KDF_ITERATIONS,salt:to64(salt),iv:to64(iv),data:to64(data)};
}
export async function unsealCodeBackup(record,code){
 if(record?.format!=='twin-code-backup-v2'||record.kdf!=='PBKDF2-SHA256'||record.iterations!==KDF_ITERATIONS||from64(record.salt).length!==16||from64(record.iv).length!==12)throw new Error('INVALID_BACKUP');
 const bytes=from64(record.data,120_000_000);if(bytes.length<16)throw new Error('INVALID_BACKUP');
 const key=await deriveKey(normalizeCode(code),from64(record.salt));
 return JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(record.iv),additionalData:encoder.encode('Twin/code-backup/v2')},key,bytes)));
}
