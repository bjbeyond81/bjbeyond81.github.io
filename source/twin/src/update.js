import {createModelCache,inspectModelCache,CPU_MODEL,modelFiles} from './model-cache.js';
import {EMBEDDING_MODEL} from './domain.js';
import {applyAppUpdate} from './app-update.js';
const VERSION=__TWIN_VERSION__;
let language='en',checking=false,updating=false,state=null,lastStatus='';
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
  const cache=await createModelCache();state=await inspectModelCache(cache);
  state.models=[];
  for(const [name,model] of [['Qwen 2.5 · CPU',CPU_MODEL],['MiniLM · '+tr('memory','memoria'),EMBEDDING_MODEL]]){
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
 if(updating)return;updating=true;$('update').disabled=true;$('status').classList.remove('error');
 try{
  await applyAppUpdate({baseURL:new URL('./',location.href),version:VERSION,onProgress:stage=>{lastStatus=stage;draw();}});
  $('open').hidden=false;
 }catch(error){
  lastStatus=tr('Update could not be confirmed. Keep this page open, check Wi-Fi and try again.','Aggiornamento non confermato. Tieni aperta questa pagina, controlla il Wi-Fi e riprova.')+` (${error.message})`;
  $('status').textContent=lastStatus;$('status').classList.add('error');
 }finally{updating=false;$('update').disabled=false;}
});
draw();check();
