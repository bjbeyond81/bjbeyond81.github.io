#!/usr/bin/env node
// Node-only seller utility. Never ship the private key to the static site.
import {generateKeyPairSync,createPrivateKey,sign,randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2); const command=args.shift();
const opt=name=>{const i=args.indexOf('--'+name);return i<0?null:args[i+1];};
if(command==='keygen'){
  const folder=resolve(opt('out')||'../twin-seller-keys'); mkdirSync(folder,{recursive:true,mode:0o700});
  const file=resolve(folder,'twin-private.pem');
  if(existsSync(file))throw new Error('Key already exists. Keep it: existing customer codes depend on this key.');
  const {privateKey,publicKey}=generateKeyPairSync('ed25519');
  writeFileSync(file,privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600,flag:'wx'});
  const raw=publicKey.export({format:'jwk'}).x;
  writeFileSync(resolve(folder,'twin-public.txt'),raw+'\n');
  writeFileSync(resolve(project,'src/license-public.js'),`// Seller public key only. Safe to publish.\nexport const PUBLIC_KEY = ${JSON.stringify(raw)};\n`);
  console.log('Public key configured. Private key saved outside the project. Back it up securely, then rebuild.');
}else if(command==='issue'){
  const path=opt('key'); if(!path)throw new Error('Usage: node scripts/license.mjs issue --key ../twin-seller-keys/twin-private.pem [--order ORDER] [--out code.txt]');
  const payload={version:1,product:'twin',id:randomUUID(),issuedAt:Date.now(),order:opt('order')||null};
  // Deliberately no email, name, or customer PII in a readable license payload.
  const b64=Buffer.from(JSON.stringify(payload)).toString('base64url');const signed='TWIN1.'+b64;
  const code=signed+'.'+sign(null,Buffer.from(signed),createPrivateKey(readFileSync(resolve(path)))).toString('base64url');
  if(opt('out'))writeFileSync(resolve(opt('out')),code+'\n',{flag:'wx',mode:0o600});else console.log(code);
}else{
  console.log('keygen --out ../twin-seller-keys\nissue --key ../twin-seller-keys/twin-private.pem --order ORDER [--out code.txt]');
  process.exitCode=command?1:0;
}
