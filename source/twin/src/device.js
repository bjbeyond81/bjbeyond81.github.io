// Keep a slow or broken GPU probe from delaying the encrypted diary UI.
export async function probeWebGPU(gpu,timeoutMs=2500){
 if(!gpu?.requestAdapter)return false;
 let timer;
 try{
  const adapter=await Promise.race([
   Promise.resolve().then(()=>gpu.requestAdapter()),
   new Promise(resolve=>{timer=setTimeout(()=>resolve(null),timeoutMs);})
  ]);
  return Boolean(adapter?.features?.has('shader-f16'));
 }catch{return false;}finally{clearTimeout(timer);}
}
export function appleMobile(userAgent='',platform='',touchPoints=0){
 return /iPhone|iPad|iPod/.test(userAgent)||(platform==='MacIntel'&&touchPoints>1);
}
