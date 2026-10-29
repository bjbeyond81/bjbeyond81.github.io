import {prepareModelFiles} from './model-download.js';
self.onmessage=async({data})=>{
  try{
    const result=await prepareModelFiles({mode:data?.mode==='mobile'?'mobile':'cpu',onProgress:p=>postMessage({type:'progress',...p})});
    postMessage({type:'result',result});
  }catch(error){postMessage({type:'error',error:error.name==='QuotaExceededError'?'MODEL_STORAGE_FULL':String(error.message||error)});}
};
