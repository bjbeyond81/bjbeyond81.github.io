import {probeWebGPU,appleMobile} from './device.js';
import {createModelCache,inspectModelCache} from './model-cache.js';
let worker,serial=Promise.resolve(),nextId=0,capabilityTask,loading,lifecycle=0;
const jobs=new Map();
let mode='cpu',ready=false,cacheState={cached:false,status:'checking'};
const preference=()=>{try{return localStorage.getItem('twin-ai-mode');}catch{return null;}};
const fullCPU=()=>{try{return localStorage.getItem('twin-ai-quality')==='full';}catch{return false;}};
// Per-tab diagnostic only: no password, key, question, or journal content is persisted.
const TASK_KEY='twin-pending-ai-task';
let taskSequence=0;
function markTask(action){
  if(!['load','embedding','generate'].includes(action))return null;
  const task={action,startedAt:Date.now(),id:++taskSequence};
  try{sessionStorage.setItem(TASK_KEY,JSON.stringify(task));}catch{}
  return task;
}
function clearTask(task){try{const current=JSON.parse(sessionStorage.getItem(TASK_KEY)||'null');if(!task||(current?.id===task.id&&current?.startedAt===task.startedAt))sessionStorage.removeItem(TASK_KEY);}catch{}}
export function takeInterruptedTask(){
  try{
    const task=JSON.parse(sessionStorage.getItem(TASK_KEY)||'null');clearTask();
    const age=Date.now()-task?.startedAt;
    return task&&['load','embedding','generate'].includes(task.action)&&age>=0&&age<24*60*60_000?{action:task.action}:null;
  }catch{clearTask();return null;}
}
export function capabilities(){
  return capabilityTask ||= (async()=>{
    const webgpu=await probeWebGPU(navigator.gpu);
    mode=isAppleMobile()?(fullCPU()?'cpu':'mobile'):webgpu&&preference()!=='cpu'?'gpu':'cpu';
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
    const task=markTask(action);
    try{return await raw(action,args,progress);}finally{if(task)clearTask(task);}
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
export function useCPU(){stop();mode=isAppleMobile()&&!fullCPU()?'mobile':'cpu';try{localStorage.setItem('twin-ai-mode','cpu');}catch{}return refreshCache();}
export function useMobile(){stop();mode='mobile';try{localStorage.setItem('twin-ai-quality','light');localStorage.setItem('twin-ai-mode','cpu');}catch{}return refreshCache();}
export function useFullCPU(){stop();mode='cpu';try{localStorage.setItem('twin-ai-quality','full');localStorage.setItem('twin-ai-mode','cpu');}catch{}return refreshCache();}
export function stop(reason=new Error('AI_CANCELLED')){lifecycle++;clearTask();worker?.terminate();worker=null;ready=false;loading=null;for(const job of jobs.values())job.reject(reason);jobs.clear();serial=Promise.resolve();}
