import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAppUpdate,waitForInstall,workerStatus} from '../src/app-update.js';
const baseURL=new URL('https://example.github.io/apps/twin/');
class Worker extends EventTarget{
 constructor(version,state='activated'){super();this.version=version;this.state=state;}
 postMessage(data,ports){if(data.type==='TWIN_STATUS')ports[0].postMessage({version:this.version});if(data.type==='TWIN_APPLY_UPDATE')this.activate?.();}
 change(state){this.state=state;this.dispatchEvent(new Event('statechange'));}
}
test('status handshake confirms the active app version',async()=>{
 assert.equal((await workerStatus(new Worker('1.0.3'))).version,'1.0.3');
 assert.equal(await workerStatus({postMessage(){}},{timeoutMs:10}),null);
});
test('a waiting update activates even while an old app tab is open',async()=>{
 const old=new Worker('1.0.2'),next=new Worker('1.0.3','installed');
 const registration={active:old,waiting:next,update:async()=>{}};
 next.activate=()=>queueMicrotask(()=>{registration.active=next;registration.waiting=null;next.change('activated');});
 let options;const serviceWorker={register:async(url,opts)=>{options={url,...opts};return registration;}};
 const stages=[];const result=await applyAppUpdate({serviceWorker,baseURL,version:'1.0.3',onProgress:s=>stages.push(s)});
 assert.equal(result.version,'1.0.3');assert.equal(options.url,baseURL+'sw.js');
 assert.equal(options.scope,'/apps/twin/');assert.equal(options.updateViaCache,'none');
 assert.deepEqual(stages,['checking','activating','ready']);
});
test('an update is not marked ready until installation has finished',async()=>{
 const next=new Worker('1.0.3','installing');
 const registration={active:new Worker('1.0.2'),installing:next,update:async()=>{}};
 next.activate=()=>queueMicrotask(()=>{registration.active=next;registration.waiting=null;next.change('activated');});
 const serviceWorker={register:async()=>{setTimeout(()=>{registration.installing=null;registration.waiting=next;next.change('installed');},10);return registration;}};
 const stages=[];await applyAppUpdate({serviceWorker,baseURL,version:'1.0.3',onProgress:s=>stages.push(s)});
 assert.deepEqual(stages,['checking','installing','activating','ready']);
});
test('a failed or stalled installation returns an actionable error',async()=>{
 const broken=new Worker('1.0.3','installing');const failed=waitForInstall(broken,50);broken.change('redundant');await assert.rejects(failed,/UPDATE_INSTALL_FAILED/);
 await assert.rejects(waitForInstall(new Worker('1.0.3','installing'),10),/UPDATE_TIMEOUT/);
});
test('an old or unresponsive controller never produces a false update confirmation',async()=>{
 const registration={active:new Worker('1.0.2'),update:async()=>{}};
 await assert.rejects(applyAppUpdate({serviceWorker:{register:async()=>registration},baseURL,version:'1.0.3'}),/UPDATE_VERSION_UNCONFIRMED/);
});
