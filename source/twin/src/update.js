import {createModelCache,inspectModelCache,cpuModel,modelFiles} from './model-cache.js';
import {appleMobile} from './device.js';
import {EMBEDDING_MODEL} from './domain.js';
import {applyAppUpdate} from './app-update.js';
const VERSION=__TWIN_VERSION__;
let downloadMode=appleMobile(navigator.userAgent,navigator.platform,navigator.maxTouchPoints)?'mobile':'cpu';
try{if(localStorage.getItem('twin-ai-quality')==='full')downloadMode='cpu';}catch{}
let language='en',checking=false,updating=false,state=null,lastStatus='',downloading=false,downloadWorker=null,pauseDownload=null;
try{if(localStorage.getItem('twin-lang')==='it')language='it';}catch{}
const $=id=>document.getElementById(id);
const tr=(en,it)=>language==='it'?it:en;
const stages={checking:['Checking for an app update…','Controllo dell’aggiornamento…'],installing:['Saving the updated app. AI models are kept. Please keep this page open.','Salvataggio dell’app aggiornata. I modelli AI vengono mantenuti. Tieni aperta questa pagina.'],activating:['Applying the update…','Applicazione dell’aggiornamento…'],ready:['Update confirmed. You can open Twin.','Aggiornamento confermato. Puoi aprire Twin.']};
function draw(){
 document.documentElement.lang=language;
 $('language').value=language;
 for(const el of document.querySelectorAll('[data-en]'))el.textContent=el.dataset[language];
 $('version').textContent=`Twin ${VERSION}`;
 if(lastStatus)$('status').textContent=stages[lastStatus]?tr(...stages[lastStatus]):lastStatus;
 if(state?.status==='unavailable'){
  $('result').textContent=tr('Safari could not read model storage. Use a normal, non-private Safari tab.','Safari non ha potuto leggere l’archivio dei modelli. Usa una scheda Safari normale, non privata.');
 }else if(state){
  $('result').textContent=state.cached?tr('All 8 AI files are saved. The next start can reuse them.','Tutti gli 8 file AI sono salvati. Il prossimo avvio può riutilizzarli.'):state.found?tr(`${state.found} of 8 files are saved. Setup is incomplete. Existing files can be reused.`,`${state.found} file su 8 sono salvati. La preparazione è incompleta. I file presenti sono riutilizzabili.`):tr('No complete AI model files were found in this Safari installation.','Non sono stati trovati file completi dei modelli AI in questa installazione Safari.');
  const list=$('files');list.replaceChildren();
  for(const [name,entry] of state.models){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=`${entry.found}/${entry.total} ${tr('files','file')}${entry.bytes?' · '+Math.round(entry.bytes/1e6)+' MB':''}`;list.append(dt,dd);}
 }
}
async function check(){
 if(checking)return;checking=true;$('recheck').disabled=true;
 try{
  const cache=await createModelCache();state=await inspectModelCache(cache,downloadMode);
  state.models=[];
  for(const [name,model] of [[downloadMode==='mobile'?'SmolLM2 · iPhone':'Qwen 2.5 · CPU',cpuModel(downloadMode)],['MiniLM · '+tr('memory','memoria'),EMBEDDING_MODEL]]){
   let found=0,bytes=0;const files=modelFiles(model);
   for(const file of files){const response=await cache.match(file);if(response){found++;bytes+=Number(response.headers.get('content-length'))||0;}}
   state.models.push([name,{found,total:files.length,bytes}]);
  }
  draw();
 }catch{$('result').textContent=tr('Safari could not read model storage. Try a normal, non-private Safari tab.','Safari non ha potuto leggere l’archivio dei modelli. Prova una scheda Safari normale, non privata.');}
 finally{checking=false;$('recheck').disabled=false;}
}
$('language').addEventListener('change',()=>{language=$('language').value;try{localStorage.setItem('twin-lang',language);}catch{}draw();});
$('recheck').addEventListener('click',check);
$('update').addEventListener('click',async()=>{
 if(updating||downloading)return;updating=true;$('update').disabled=true;$('status').classList.remove('error');
 try{
  await applyAppUpdate({baseURL:new URL('./',location.href),version:VERSION,onProgress:stage=>{lastStatus=stage;draw();}});
  $('open').hidden=false;
 }catch(error){
  lastStatus=tr('Update could not be confirmed. Keep this page open, check Wi-Fi and try again.','Aggiornamento non confermato. Tieni aperta questa pagina, controlla il Wi-Fi e riprova.')+` (${error.message})`;
  $('status').textContent=lastStatus;$('status').classList.add('error');
 }finally{updating=false;$('update').disabled=false;}
});

function downloadError(code){
 if(code==='MODEL_STORAGE_FULL'||/quota/i.test(code))return tr('Safari has insufficient storage. Free device storage and retry; do not clear Twin’s site data. Saved parts are kept.','Safari non ha spazio sufficiente. Libera spazio sul dispositivo e riprova; non cancellare i dati del sito Twin. Le parti salvate vengono mantenute.');
 if(code==='MODEL_STORAGE_UNAVAILABLE')return tr('Safari cannot write model files. Use a normal, non-private Safari tab.','Safari non può salvare i modelli. Usa una scheda Safari normale, non privata.');
 if(code==='MODEL_DOWNLOAD_BUSY')return tr('Another Twin tab is saving this file. Close the other Twin tabs, then retry here.','Un’altra scheda Twin sta salvando questo file. Chiudi le altre schede Twin e riprova qui.');
 if(code==='MODEL_DOWNLOAD_PAUSED')return tr('Paused. Saved bytes are kept. Tap Finish AI download to resume.','In pausa. I byte salvati vengono mantenuti. Premi Completa download AI per riprendere.');
 return tr('Download interrupted. Saved bytes are kept. Check Wi-Fi and tap Finish AI download to resume.','Download interrotto. I byte salvati vengono mantenuti. Controlla il Wi-Fi e premi Completa download AI per riprendere.')+` (${code})`;
}
$('download').addEventListener('click',async()=>{
 if(downloading||updating||checking)return;
 downloading=true;$('download').disabled=true;$('update').disabled=true;$('recheck').disabled=true;
 $('download-status').classList.remove('error');$('download-progress').hidden=false;$('download-progress').removeAttribute('value');
 let wakeLock;
 try{
  try{wakeLock=await navigator.wakeLock?.request('screen');}catch{}
  await navigator.storage?.persist?.().catch(()=>false);
  // Confirm the new shell before opening Twin with its new storage reader.
  await applyAppUpdate({baseURL:new URL('./',location.href),version:VERSION,onProgress:stage=>{$('download-status').textContent=tr(...stages[stage]);}});
  $('pause').hidden=false;
  await new Promise((resolve,reject)=>{
   downloadWorker=new Worker(new URL('./model-download-worker.js',import.meta.url),{type:'module'});
   pauseDownload=()=>{downloadWorker?.terminate();reject(new Error('MODEL_DOWNLOAD_PAUSED'));};
   downloadWorker.onmessage=({data})=>{
    if(data.type==='error'){reject(new Error(data.error));return;}
    if(data.type==='result'){data.result.cached?resolve():reject(new Error('MODEL_DOWNLOAD_INCOMPLETE'));return;}
    const bar=$('download-progress');
    if(data.progress==null)bar.removeAttribute('value');else bar.value=data.progress;
    const size=data.total?`${(data.loaded/1e6).toFixed(1)} / ${(data.total/1e6).toFixed(1)} MB`:tr('Connecting…','Connessione…');
    $('download-status').textContent=`${data.phase==='saved'?tr('Saved','Salvato'):tr('Saving','Salvataggio')} · ${size}`;
   };
   downloadWorker.onerror=()=>reject(new Error('MODEL_DOWNLOAD_WORKER_FAILED'));
   downloadWorker.onmessageerror=()=>reject(new Error('MODEL_DOWNLOAD_WORKER_FAILED'));
   downloadWorker.postMessage({action:'prepare',mode:downloadMode});
  });
  await check();
  $('download-status').textContent=tr('All 8 files are saved. You can now open Twin. Starting AI is a separate step.','Tutti gli 8 file sono salvati. Ora puoi aprire Twin. L’avvio dell’AI è un passaggio separato.');
  $('download-progress').value=1;$('open').hidden=false;
 }catch(error){
  $('download-status').classList.add('error');$('download-status').textContent=downloadError(String(error.message||error));
  await check();
 }finally{
  downloadWorker?.terminate();downloadWorker=null;pauseDownload=null;downloading=false;
  $('pause').hidden=true;$('download').disabled=false;$('update').disabled=false;$('recheck').disabled=false;
  try{await wakeLock?.release();}catch{}
 }
});
$('pause').addEventListener('click',()=>pauseDownload?.());
draw();check();
