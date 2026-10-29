import {readdirSync,readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
export function collectNotices(){
 const dest=resolve('public/licenses');mkdirSync(dest,{recursive:true});
 const sections=['Twin — third-party software notices\n\nBuilt with Llama\nLlama 3.2 is licensed under the Llama 3.2 Community License, Copyright © Meta Platforms, Inc. All Rights Reserved.\nSee LLAMA-3.2-LICENSE.txt and LLAMA-3.2-USE-POLICY.md.\n\nModel sources (weights downloaded by the user; not in this archive):\nhttps://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC\nhttps://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct (Apache-2.0)\nhttps://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct (Apache-2.0; Hugging Face; iPhone lightweight mode)\nhttps://huggingface.co/Xenova/all-MiniLM-L6-v2 (Apache-2.0)\nhttps://huggingface.co/Xenova/whisper-tiny (ONNX conversion: Apache-2.0; original OpenAI Whisper: MIT)\nhttps://github.com/openai/whisper (original model and code)\n\nThe following notices include installed build dependencies for completeness.'];
 if(existsSync(join(dest,'WHISPER-MIT.txt')))sections.push(readFileSync(join(dest,'WHISPER-MIT.txt'),'utf8'));
 function scan(dir){
  if(!existsSync(dir))return;
  for(const e of readdirSync(dir,{withFileTypes:true})){if(!e.isDirectory()||e.name.startsWith('.'))continue;const p=join(dir,e.name);if(e.name.startsWith('@')){scan(p);continue;}
   if(!existsSync(join(p,'package.json')))continue;
   const pkg=JSON.parse(readFileSync(join(p,'package.json'),'utf8'));
   const licenses=readdirSync(p).filter(n=>/^(licen[cs]e|copying|notice)(\.(txt|md))?$/i.test(n));
   sections.push(`\n\n=== ${pkg.name} ${pkg.version} (${typeof pkg.license==='string'?pkg.license:JSON.stringify(pkg.license)}) ===\n`+licenses.map(n=>readFileSync(join(p,n),'utf8')).join('\n'));
   scan(join(p,'node_modules'));
  }
 }
 scan(resolve('node_modules'));writeFileSync(join(dest,'THIRD-PARTY.txt'),sections.join('\n'));
}
if(process.argv[1]?.endsWith('notices.mjs'))collectNotices();
