import {EMBEDDING_MODEL} from './domain.js';
import {downloadDirectory,savedDownload} from './model-download-storage.js';

export const CPU_MODEL='onnx-community/Qwen2.5-0.5B-Instruct';
export const GPU_MODEL='Llama-3.2-1B-Instruct-q4f16_1-MLC';
// Reuse earlier Cache Storage names and OPFS files from existing installs.
export const CACHE_NAMES=['twin-models','transformers-cache'];
const requiredFiles=['config.json','tokenizer.json','tokenizer_config.json','onnx/model_quantized.onnx'];
export const modelFiles=model=>requiredFiles.map(file=>`https://huggingface.co/${model}/resolve/main/${file}`);

export async function createModelCache({storage=globalThis.caches,opfs=globalThis.navigator?.storage}={}){
  let directory,accessible=false;
  try{directory=await (await opfs?.getDirectory?.())?.getDirectoryHandle('twin-models');}catch{}
  if(directory)accessible=true;
  const legacyName=url=>btoa(url).replace(/[/+=]/g,'_').slice(0,180);
  return {
    get available(){return accessible;},
    async match(request){
      const url=typeof request==='string'?request:request.url;
      const streamed=await savedDownload(await downloadDirectory(opfs),url);
      if(streamed){accessible=true;return streamed;}
      for(const name of CACHE_NAMES){
        try{if(storage){const exists=await storage.has(name);accessible=true;if(exists){const response=await (await storage.open(name)).match(url);if(response)return response;}}}catch{}
      }
      // Read existing OPFS files without duplicating hundreds of MB.
      if(directory)try{
        const file=await (await directory.getFileHandle(legacyName(url))).getFile();
        if(file.size)return new Response(file,{headers:{'content-length':String(file.size)}});
      }catch{}
      return undefined;
    },
    async put(request,response){
      // Cache.put commits a complete response atomically. Surface storage failures.
      const url=typeof request==='string'?request:request.url;
      if(storage){const cache=await storage.open(CACHE_NAMES[0]);await cache.put(url,response);return;}
      throw new Error('MODEL_CACHE_UNAVAILABLE');
    }
  };
}

export async function inspectModelCache(cache,mode='cpu',gpuCached=false){
  const files=[...modelFiles(EMBEDDING_MODEL),...(mode==='cpu'?modelFiles(CPU_MODEL):[])];
  let found=0;
  for(const file of files)if(await cache.match(file))found++;
  const complete=found===files.length&&(mode==='cpu'||gpuCached);
  return {cached:complete,status:complete?'complete':found?'partial':cache.available===false?'unavailable':'missing',found,total:files.length};
}
