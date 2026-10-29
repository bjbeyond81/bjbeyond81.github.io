import {probeWebGPU,appleMobile} from './device.js';
import {createModelCache,inspectModelCache} from './model-cache.js';
let worker,serial=Promise.resolve(),nextId=0,capabilityTask,loading,lifecycle=0;
const jobs=new Map();
let mode='cpu',ready=false,cacheState={cached:false,status:'checking'};
const preference=()=>{try{return localStorage.getItem('twin-ai-mode');}catch{return null;}};
export function capabilities(){
  return capabilityTask ||= (async()=>{
    const webgpu=await probeWebGPU(navigator.gpu);
    mode=webgpu&&!isAppleMobile()&&preference()!=='cpu'?'gpu':'cpu';
    await refreshCache();return {mode,webgpu};
  })();
}
export async function refreshCache(){
  try{cacheState=mode==='gpu'?await request('cache-status',{mode}):await inspectModelCache(await createModelCache(),mode);}
  catch{cacheState={cached:false,status:'unavailable'};}
  return cacheState;
}
function start(){
  if(worker)return;
  worker=new Worker(new URL('./ai-worker.js',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{const job=jobs.get(data.id);if(!job)return;if(data.type==='progress')job.progress?.(data);else{jobs.delete(data.id);data.type==='error'?job.reject(new Error(data.error)):job.resolve(data.result);}};
  worker.onerror=event=>stop(new Error(event.message||'AI_WORKER_FAILED'));
  worker.onmessageerror=()=>stop(new Error('AI_WORKER_MESSAGE_FAILED'));
}
function raw(action,args,progress){start();return new Promise((resolve,reject)=>{const id=++nextId;jobs.set(id,{resolve,reject,progress});worker.postMessage({id,action,args});});}
function request(action,args,progress){
  const epoch=lifecycle;
  const task=serial.catch(()=>{}).then(async()=>{
    if(epoch!==lifecycle)throw new Error('AI_CANCELLED');
    await raw('configure',{wasmPath:new URL(import.meta.env.BASE_URL+'ort/',location.href).href});
    if(epoch!==lifecycle)throw new Error('AI_CANCELLED');
    return raw(action,args,progress);
  });serial=task;return task;
}
export async function loadAI(progress){
  const epoch=lifecycle;
  await capabilities();
  if(epoch!==lifecycle)throw new Error('AI_CANCELLED');
  if(ready)return;
  if(loading)return loading;
  const task=(async()=>{
    try{const result=await request('load',{mode},progress);ready=true;cacheState=result.cache;}
    catch(error){if(epoch===lifecycle)stop(error);throw error;}
  })();
  loading=task;
  try{await task;}finally{if(loading===task)loading=null;}
}
export const isAppleMobile=()=>appleMobile(navigator.userAgent,navigator.platform,navigator.maxTouchPoints);
export const embed=(text,progress)=>request('embedding',{text},progress);
export const generate=(messages,progress)=>request('generate',{messages,mode},progress);
export const aiState=()=>({mode,ready,...cacheState});
export function useCPU(){stop();mode='cpu';try{localStorage.setItem('twin-ai-mode','cpu');}catch{}return refreshCache();}
export function stop(reason=new Error('AI_CANCELLED')){lifecycle++;worker?.terminate();worker=null;ready=false;loading=null;for(const job of jobs.values())job.reject(reason);jobs.clear();serial=Promise.resolve();}
