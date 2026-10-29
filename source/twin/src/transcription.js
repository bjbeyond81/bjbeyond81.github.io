let worker,rejectJob;
export async function transcribeVoice(audio,language,onProgress=()=>{}){
 if(worker)throw new Error('VOICE_TRANSCRIPTION_BUSY');
 if(!(audio instanceof Float32Array)||!audio.length||audio.length>181*16000)throw new Error('INVALID_AUDIO');
 worker=new Worker(new URL('./transcription-worker.js',import.meta.url),{type:'module'});
 try{return await new Promise((resolve,reject)=>{
  rejectJob=reject;
  worker.onmessage=({data})=>{if(data.type==='progress')onProgress(data);else if(data.type==='result')resolve(data.text);else reject(new Error(data.error||'VOICE_TRANSCRIPTION_FAILED'));};
  worker.onerror=()=>reject(new Error('VOICE_TRANSCRIPTION_FAILED'));worker.onmessageerror=()=>reject(new Error('VOICE_TRANSCRIPTION_FAILED'));
  worker.postMessage({audio,language,wasmPath:new URL(import.meta.env.BASE_URL+'ort/',location.href).href},[audio.buffer]);
 });}finally{worker?.terminate();worker=null;rejectJob=null;}
}
export function stopTranscription(){worker?.terminate();worker=null;rejectJob?.(new Error('AI_CANCELLED'));rejectJob=null;}
