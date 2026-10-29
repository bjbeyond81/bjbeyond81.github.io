// Updating the app never clears the vault or model storage.
export function workerStatus(worker,{Channel=globalThis.MessageChannel,timeoutMs=3000}={}){
  if(!worker)return Promise.resolve(null);
  return new Promise(resolve=>{
    const channel=new Channel();
    const done=value=>{clearTimeout(timer);channel.port1.close();channel.port2.close();resolve(value);};
    const timer=setTimeout(()=>done(null),timeoutMs);
    channel.port1.onmessage=event=>done(event.data);
    worker.postMessage({type:'TWIN_STATUS'},[channel.port2]);
  });
}
export function waitForInstall(worker,timeoutMs=90_000){
  if(!worker||['installed','activated'].includes(worker.state))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const finish=error=>{clearTimeout(timer);worker.removeEventListener('statechange',changed);error?reject(error):resolve();};
    const changed=()=>{if(['installed','activated'].includes(worker.state))finish();else if(worker.state==='redundant')finish(new Error('UPDATE_INSTALL_FAILED'));};
    const timer=setTimeout(()=>finish(new Error('UPDATE_TIMEOUT')),timeoutMs);
    worker.addEventListener('statechange',changed);changed();
  });
}
export async function applyAppUpdate({serviceWorker=globalThis.navigator?.serviceWorker,baseURL,version,onProgress=()=>{},status=workerStatus,timeoutMs=90_000}){
  if(!serviceWorker)throw new Error('UPDATE_UNSUPPORTED');
  onProgress('checking');
  const registration=await serviceWorker.register(new URL('sw.js',baseURL).href,{scope:new URL('./',baseURL).pathname,updateViaCache:'none'});
  await registration.update();
  const installing=registration.installing;
  if(installing){onProgress('installing');await waitForInstall(installing,timeoutMs);}
  const waiting=registration.waiting;
  if(waiting){
    onProgress('activating');
    // Subscribe before sending the activation message so fast updates cannot be missed.
    const activated=new Promise((resolve,reject)=>{
      const finish=error=>{clearTimeout(timer);waiting.removeEventListener('statechange',changed);error?reject(error):resolve();};
      const changed=()=>{if(waiting.state==='activated')finish();else if(waiting.state==='redundant')finish(new Error('UPDATE_INSTALL_FAILED'));};
      const timer=setTimeout(()=>finish(new Error('UPDATE_TIMEOUT')),timeoutMs);
      waiting.addEventListener('statechange',changed);
      waiting.postMessage({type:'TWIN_APPLY_UPDATE'});changed();
    });
    await activated;
  }
  const active=await status(registration.active);
  if(active?.version!==version)throw new Error('UPDATE_VERSION_UNCONFIRMED');
  onProgress('ready');return active;
}
