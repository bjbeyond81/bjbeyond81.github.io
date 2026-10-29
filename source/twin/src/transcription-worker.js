import {pipeline,env} from '@huggingface/transformers';
import {createModelCache} from './model-cache.js';
import {downloadModelFile} from './model-download.js';
import {downloadDirectory} from './model-download-storage.js';
const MODEL='Xenova/whisper-tiny';
const FILES=['config.json','generation_config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json','onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx'];
let active=false;
self.onmessage=async({data})=>{
 if(active)return;active=true;
 try{
  env.allowLocalModels=false;env.useBrowserCache=false;env.useCustomCache=true;env.useWasmCache=false;
  const cache=await createModelCache();env.customCache=cache;
  env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;
  env.backends.onnx.wasm.wasmPaths={mjs:new URL('ort-wasm-simd-threaded.mjs',data.wasmPath).href,wasm:new URL('ort-wasm-simd-threaded.wasm',data.wasmPath).href};
  let directory;
  for(const file of FILES){const url=`https://huggingface.co/${MODEL}/resolve/main/${file}`;if(await cache.match(url))continue;directory ||= await downloadDirectory(undefined,true);await downloadModelFile(url,{directory,onProgress:p=>postMessage({type:'progress',...p})});}
  const transcriber=await pipeline('automatic-speech-recognition',MODEL,{device:'wasm',dtype:'q8',session_options:{enableCpuMemArena:false,enableMemPattern:false,graphOptimizationLevel:'basic'},progress_callback:event=>postMessage({type:'progress',phase:'cache',file:event.file||'',progress:typeof event.progress==='number'?event.progress/100:null})});
  postMessage({type:'progress',text:'Transcribing on this device…',progress:null});
  const result=await transcriber(data.audio,{task:'transcribe',...(data.language==='it'?{language:'italian'}:data.language==='en'?{language:'english'}:{}),chunk_length_s:20,stride_length_s:3});
  await transcriber.dispose();
  const text=String(result.text||'').trim();if(!text)throw new Error('VOICE_EMPTY_TRANSCRIPT');postMessage({type:'result',text});
 }catch(error){postMessage({type:'error',error:error.name==='QuotaExceededError'?'MODEL_STORAGE_FULL':String(error.message||error)});}
};
