export const KDF_ITERATIONS = 600_000;
const enc = new TextEncoder(), dec = new TextDecoder();
export function to64(bytes) { let s=''; for(const b of new Uint8Array(bytes)) s+=String.fromCharCode(b); return btoa(s); }
export function from64(s) {
  if(typeof s!=='string' || s.length>40_000_000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw new Error('Invalid base64');
  return Uint8Array.from(atob(s),c=>c.charCodeAt(0));
}
export async function deriveKey(password, salt) {
  const material=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:KDF_ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export function newSalt(){return crypto.getRandomValues(new Uint8Array(16));}
export function validateEnvelope(record) {
  if(!record || record.format!=='twin-v1' || record.kdf!=='PBKDF2-SHA256' || record.iterations!==KDF_ITERATIONS || from64(record.salt).length!==16 || from64(record.iv).length!==12 || from64(record.data).length<16) throw new Error('Invalid Twin backup');
  return record;
}
export async function seal(value,key,salt) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const plain=enc.encode(JSON.stringify(value));
  if(plain.byteLength>24*1024*1024)throw new Error('VAULT_FULL');
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode('Twin/v1')},key,plain);
  return {format:'twin-v1',kdf:'PBKDF2-SHA256',iterations:KDF_ITERATIONS,salt:to64(salt),iv:to64(iv),data:to64(cipher)};
}
export async function unseal(record,key) {
  validateEnvelope(record);
  return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(record.iv),additionalData:enc.encode('Twin/v1')},key,from64(record.data))));
}
