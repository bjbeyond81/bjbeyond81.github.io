import {PUBLIC_KEY} from './license-public.js';
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export async function verifyLicense(code,publicKey=PUBLIC_KEY,now=Date.now()){
  if(!publicKey)throw new Error('LICENSE_NOT_CONFIGURED');
  if(typeof code!=='string'||code.length>4096)throw new Error('LICENSE_INVALID');
  const parts=code.trim().split('.');
  if(parts.length!==3||parts[0]!=='TWIN1'||parts.slice(1).some(s=>!/^[A-Za-z0-9_-]+$/.test(s)))throw new Error('LICENSE_INVALID');
  const payloadBytes=decode(parts[1]), signature=decode(parts[2]);
  const key=await crypto.subtle.importKey('raw',decode(publicKey),{name:'Ed25519'},false,['verify']);
  if(signature.length!==64||!await crypto.subtle.verify('Ed25519',key,signature,new TextEncoder().encode('TWIN1.'+parts[1])))throw new Error('LICENSE_INVALID');
  const p=JSON.parse(new TextDecoder().decode(payloadBytes));
  if(p.product!=='twin'||p.version!==1||typeof p.id!=='string'||!Number.isFinite(p.issuedAt)||p.issuedAt>now+86400000||(p.expiresAt!=null&&(!Number.isFinite(p.expiresAt)||p.expiresAt<now)))throw new Error('LICENSE_INVALID');
  return p;
}
