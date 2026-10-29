import {pipeline,env} from '@huggingface/transformers';
import {EMBEDDING_MODEL} from './domain.js';
let embedder, generator, engine;
// Never enable a hosted inference API. Downloads are only public model assets.
env.allowLocalModels=false;
env.useBrowserCache=true;
// The service worker already caches local WASM. Avoid a second blob/cache copy.
env.useWasmCache=false;
env.backends.onnx.wasm.numThreads=1; // GitHub Pages has no COOP/COEP / SharedArrayBuffer.
env.backends.onnx.wasm.proxy=false;
let currentId;
const progress=event=>postMessage({id:currentId,type:'progress',progress:typeof event.progress==='number'?Math.min(1,event.progress/100):null,text:event.text||[event.status,event.file].filter(Boolean).join(' ')});
async function initEmbedding(){return embedder ||= await pipeline('feature-extraction',EMBEDDING_MODEL,{device:'wasm',dtype:'q8',progress_callback:progress});}
async function initEngine(mode){
  if(mode==='gpu'){
    const webllm=await import('@mlc-ai/web-llm');
    engine ||= await webllm.CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC',{appConfig:{...webllm.prebuiltAppConfig,cacheBackend:'indexeddb'},initProgressCallback:r=>postMessage({id:currentId,type:'progress',progress:r.progress,text:r.text})},{context_window_size:4096});
  }else{
    generator ||= await pipeline('text-generation','onnx-community/Qwen2.5-0.5B-Instruct',{device:'wasm',dtype:'q8',progress_callback:progress});
  }
}
self.onmessage=async({data})=>{
  const {id,action,args}=data;currentId=id;
  try{
    let result;
    if(action==='configure'){
      // Both Transformer tasks run on CPU. Explicitly use the non-Asyncify WASM build.
      env.backends.onnx.wasm.wasmPaths={
        mjs:new URL('ort-wasm-simd-threaded.mjs',args.wasmPath).href,
        wasm:new URL('ort-wasm-simd-threaded.wasm',args.wasmPath).href
      };
      result=true;
    }else if(action==='embedding'){
      const pipe=await initEmbedding();const output=await pipe(args.text,{pooling:'mean',normalize:true});result=Array.from(output.data);
    }else if(action==='load'){
      await initEmbedding(); await initEngine(args.mode);result={mode:args.mode};
    }else if(action==='generate'){
      await initEngine(args.mode);
      if(args.mode==='gpu'){
        const output=await engine.chat.completions.create({messages:args.messages,max_tokens:300,temperature:0.35});result=output.choices[0].message.content;
        await engine.resetChat(); // No undisclosed conversation context across requests.
      }else{
        const output=await generator(args.messages,{max_new_tokens:160,do_sample:false});
        const generated=output[0].generated_text;result=Array.isArray(generated)?generated.at(-1).content:generated;
      }
    }else throw new Error('Unknown worker action');
    postMessage({id,type:'result',result});
  }catch(error){postMessage({id,type:'error',error:String(error.message||error)});}
};
