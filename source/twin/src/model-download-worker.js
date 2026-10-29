import {prepareModelFiles} from './model-download.js';
self.onmessage=async()=>{
  try{
    const result=await prepareModelFiles({onProgress:p=>postMessage({type:'progress',...p})});
    postMessage({type:'result',result});
  }catch(error){postMessage({type:'error',error:error.name==='QuotaExceededError'?'MODEL_STORAGE_FULL':String(error.message||error)});}
};
