import {pipeline,env} from '@huggingface/transformers';
import {EMBEDDING_MODEL} from './domain.js';
import {CPU_MODEL,GPU_MODEL,createModelCache,inspectModelCache} from './model-cache.js';
import {prepareModelFiles} from './model-download.js';
let embedder,generator,engine,webllm,currentId,cacheError;
const resourceSources=new Map();
const send=p=>postMessage({id:currentId,type:'progress',...p});
const cacheReady=createModelCache();
// Downloads contain only public model files; never use a hosted inference API.
env.allowLocalModels=false;
env.useBrowserCache=false;
env.useCustomCache=true;
env.customCache={
  async match(request){const hit=await (await cacheReady).match(request);if(hit)resourceSources.set(String(request),'cache');return hit;},
  async put(request,response){try{await (await cacheReady).put(request,response);}catch(error){cacheError=String(error.message||error);throw error;}}
};
const remoteFetch=env.fetch;
env.fetch=(url,options)=>{resourceSources.set(String(url),'download');return remoteFetch(url,options);};
// Local WASM is cached by the service worker. Avoid a second large blob copy.
env.useWasmCache=false;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.proxy=false;
const progress=event=>{
  const file=event.file||'';
  const url=`https://huggingface.co/${event.name}/resolve/main/${file}`;
  const phase=resourceSources.get(url)||'initializing';
  const pct=typeof event.progress==='number'?Math.min(1,event.progress/100):null;
  send({progress:pct,phase,file,text:file,loaded:event.loaded,total:event.total});
};
async function initEmbedding(){return embedder ||= await pipeline('feature-extraction',EMBEDDING_MODEL,{device:'wasm',dtype:'q8',progress_callback:progress});}
async function initEngine(mode){
  if(mode==='gpu'){
    webllm ||= await import('@mlc-ai/web-llm');
    engine ||= await webllm.CreateMLCEngine(GPU_MODEL,{appConfig:{...webllm.prebuiltAppConfig,cacheBackend:'indexeddb'},initProgressCallback:r=>send({progress:r.progress,text:r.text})},{context_window_size:4096});
  }else{
    generator ||= await pipeline('text-generation',CPU_MODEL,{device:'wasm',dtype:'q8',progress_callback:progress});
  }
}
self.onmessage=async({data})=>{
  const {id,action,args}=data;currentId=id;
  try{
    let result;
    if(action==='configure'){
      env.backends.onnx.wasm.wasmPaths={mjs:new URL('ort-wasm-simd-threaded.mjs',args.wasmPath).href,wasm:new URL('ort-wasm-simd-threaded.wasm',args.wasmPath).href};result=true;
    }else if(action==='cache-status'){
      webllm ||= await import('@mlc-ai/web-llm');
      const gpuCached=await webllm.hasModelInCache(GPU_MODEL,{...webllm.prebuiltAppConfig,cacheBackend:'indexeddb'});
      result=await inspectModelCache(await cacheReady,args.mode,gpuCached);
    }else if(action==='embedding'){
      const pipe=await initEmbedding();const output=await pipe(args.text,{pooling:'mean',normalize:true});result=Array.from(output.data);
    }else if(action==='load'){
      // Save missing files before allocating ONNX sessions. Interrupted transfers resume.
      await prepareModelFiles({mode:args.mode,onProgress:send});
      await initEmbedding();await initEngine(args.mode);
      const gpuCached=args.mode==='gpu'?await webllm.hasModelInCache(GPU_MODEL,{...webllm.prebuiltAppConfig,cacheBackend:'indexeddb'}):false;
      const cache=await inspectModelCache(await cacheReady,args.mode,gpuCached);
      result={mode:args.mode,cache:{...cache,error:cacheError}};
    }else if(action==='generate'){
      await initEngine(args.mode);
      if(args.mode==='gpu'){
        const output=await engine.chat.completions.create({messages:args.messages,max_tokens:300,temperature:0.35});result=output.choices[0].message.content;
        await engine.resetChat();
      }else{
        const output=await generator(args.messages,{max_new_tokens:160,do_sample:false});
        const generated=output[0].generated_text;result=Array.isArray(generated)?generated.at(-1).content:generated;
      }
    }else throw new Error('Unknown worker action');
    postMessage({id,type:'result',result});
  }catch(error){postMessage({id,type:'error',error:error.name==='QuotaExceededError'?'MODEL_STORAGE_FULL':String(error.message||error)});}
};
