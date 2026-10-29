let worker, serial=Promise.resolve(), nextId=0;
const jobs=new Map();
let mode='cpu', ready=false;
export async function capabilities(){
  try{const adapter=await navigator.gpu?.requestAdapter();if(adapter?.features.has('shader-f16'))mode='gpu';}catch{}
  return {mode,webgpu:mode==='gpu'};
}
function start(){
  if(worker)return;
  worker=new Worker(new URL('./ai-worker.js',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{const job=jobs.get(data.id);if(!job)return;if(data.type==='progress')job.progress?.(data);else{jobs.delete(data.id);data.type==='error'?job.reject(new Error(data.error)):job.resolve(data.result);}};
  worker.onerror=()=>stop(new Error('AI_WORKER_FAILED'));
}
function raw(action,args,progress){start();return new Promise((resolve,reject)=>{const id=++nextId;jobs.set(id,{resolve,reject,progress});worker.postMessage({id,action,args});});}
function request(action,args,progress){
  const task=serial.catch(()=>{}).then(async()=>{
    await raw('configure',{wasmPath:new URL(import.meta.env.BASE_URL+'ort/',location.href).href});
    return raw(action,args,progress);
  });serial=task;return task;
}
export async function loadAI(progress){await request('load',{mode},progress);ready=true;}
export const embed=(text,progress)=>request('embedding',{text},progress);
export const generate=(messages,progress)=>request('generate',{messages,mode},progress);
export const aiState=()=>({mode,ready});
export function useCPU(){stop();mode='cpu';}
export function stop(reason=new Error('AI_CANCELLED')){worker?.terminate();worker=null;ready=false;for(const job of jobs.values())job.reject(reason);jobs.clear();serial=Promise.resolve();}
