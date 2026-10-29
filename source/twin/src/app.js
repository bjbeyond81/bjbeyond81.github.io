import './style.css';
import Chart from 'chart.js/auto';
import {deriveKey,newSalt,seal,unseal,from64,validateEnvelope} from './crypto.js';
import {readRecord,writeRecord,eraseRecord} from './store.js';
import {createVault,validateVault,stats,projection,retrieve,weeklyDue,dayKey,parseDay,money,EMBEDDING_MODEL} from './domain.js';
import {verifyLicense} from './license.js';
import {messages} from './prompts.js';
import * as ai from './ai.js';
const root=document.querySelector('#app');
const pref=(k,fallback)=>{try{return localStorage.getItem('twin-'+k)||fallback;}catch{return fallback;}};
const savePref=(k,v)=>{try{localStorage.setItem('twin-'+k,v);}catch{}};
let lang=pref('lang','en');if(!['it','en'].includes(lang))lang='en';
let theme=pref('theme','system');
let vault=null,key=null,salt=null,record=null,revision=0,unlocked=false,paid=false,page='today',busy=false,charts=[],activeEpoch=0;
let search='',searchHits=null,scenarioReduction=15,futureText='',patternText='',progressInfo=null,swReady=false,installPrompt=null,hiddenTimer;
let errorMessage='',errorDetail='',caps={mode:'cpu',webgpu:false};
const tr=(it,en)=>lang==='it'?it:en;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
const fmt=n=>money(n,lang);
const dateText=value=>parseDay(value).toLocaleDateString(lang==='it'?'it-IT':'en-GB',{day:'numeric',month:'short'});
const paths={twin:'<ellipse cx="9" cy="12" rx="5" ry="8" transform="rotate(-18 9 12)"/><ellipse cx="15" cy="12" rx="5" ry="8" transform="rotate(18 15 12)"/>',today:'<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-10 4h4"/>',ask:'<path d="M21 11a8 8 0 0 1-8 8H7l-4 3v-7a8 8 0 0 1 8-11h2a8 8 0 0 1 8 7Z"/><path d="M8 11h8m-8 4h5"/>',patterns:'<path d="M4 20V10m8 10V4m8 16v-7"/>',futures:'<path d="M12 21v-7m0 0L5 7m7 7 7-7M5 12V7h5m4 0h5v5"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1v3l-2 2 2 2v3l3 1 1 3h6l1-3 3-1v-3l2-2-2-2V7l-3-1-1-3Z"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',moon:'<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z"/>',mic:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11v1a7 7 0 0 0 14 0v-1m-7 8v3m-4 0h8"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',memory:'<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M9 3v18m4-12h3m-3 4h3"/>',letter:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>',check:'<path d="m5 12 4 4L19 6"/>',spark:'<path d="m12 3 2 6 6 3-6 2-2 7-2-7-6-2 6-3Z"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>'};
const icon=(name)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.spark}</svg>`;
const brand=(mobile=false)=>`<div class="brand ${mobile?'mobile-brand':''}">${icon('twin')}<span>twin<span style="color:var(--muted)">.</span></span></div>`;
function themeApply(){const dark=theme==='dark'||(theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.lang=lang;document.title=tr('Twin — Il tuo spazio, la tua voce','Twin — Your space, your voice');document.querySelector('meta[name=theme-color]').content=dark?'#141c19':'#f5f5f2';}
const langSelect=()=>`<select aria-label="${tr('Lingua','Language')}" data-change="language"><option value="en" ${lang==='en'?'selected':''}>EN</option><option value="it" ${lang==='it'?'selected':''}>IT</option></select>`;
function progressHTML(){return `<div class="progress-panel" aria-live="polite"><progress ${progressInfo?.progress!=null?`value="${progressInfo.progress}"`:''} max="1" ${!busy?'hidden':''}></progress><p data-progress>${esc(progressInfo?.text||'')}</p>${busy?`<button class="action-link" data-action="cancel">${tr('Interrompi','Cancel')}</button>`:''}</div>`;}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),5000);}
function progress(p){progressInfo=p;for(const el of root.querySelectorAll('[data-progress]'))el.textContent=p.text;for(const el of root.querySelectorAll('progress')){el.hidden=false;if(p.progress==null)el.removeAttribute('value');else el.value=p.progress;}}
function friendly(error){
  if(error.message==='AI_WORKER_FAILED'||error.message==='AI_WORKER_MESSAGE_FAILED'||/wasm|WebAssembly|memory|allocation|backend|fetch|network|device lost/i.test(error.message||''))return tr('L’AI locale non è partita. Il diario resta salvato. Riprova con Wi-Fi e spazio libero; se disponibile, prova la modalità CPU.','Local AI could not start. Your diary is still saved. Retry with Wi-Fi and free storage; if available, try CPU mode.');
  if(error.message==='CONFLICT')return tr('Un’altra scheda ha modificato questi dati. Blocca e riapri Twin per caricare la versione aggiornata.','Another tab changed this vault. Lock and reopen Twin to load the latest version.');
  if(error.message==='VAULT_FULL')return tr('Archivio pieno (24 MiB). Esporta un backup e riduci le voci prima di continuare.','Vault full (24 MiB). Export a backup and reduce entries before continuing.');
  if(error.message==='AI_CANCELLED')return tr('Operazione interrotta.','Operation cancelled.');
  if(error.message?.startsWith('LICENSE'))return tr('Codice non valido o verifica non supportata da questo browser.','Invalid code or verification unsupported in this browser.');
  if(error.name==='QuotaExceededError')return tr('Spazio esaurito. Esporta un backup e libera spazio sul dispositivo.','Storage full. Export a backup and free device storage.');
  if(error.name==='OperationError')return tr('Password errata o backup danneggiato.','Wrong password or damaged backup.');
  return tr('Operazione non riuscita. Controlla connessione, spazio e compatibilità del browser. Riprova o usa CPU.','Operation failed. Check connection, storage and browser compatibility. Retry or use CPU.');
}
async function run(fn){
  if(busy)return;busy=true;errorMessage='';errorDetail='';const epoch=activeEpoch;
  root.querySelectorAll('button:not([data-action="cancel"]):not([data-action="lock"]),input,textarea,select').forEach(el=>el.disabled=true);
  root.querySelectorAll('.progress-panel').forEach(el=>{el.querySelector('progress').hidden=false;if(!el.querySelector('[data-action=cancel]')){const b=document.createElement('button');b.type='button';b.className='action-link';b.dataset.action='cancel';b.textContent=tr('Interrompi','Cancel');el.append(b);}});
  try{await fn(epoch);}catch(error){if(epoch===activeEpoch){errorMessage=friendly(error);errorDetail=String(error.message||error).slice(0,1200);toast(errorMessage);}}
  finally{if(epoch===activeEpoch){busy=false;progressInfo=null;render();}}
}
function checkEpoch(epoch){if(epoch!==activeEpoch||!unlocked)throw new Error('AI_CANCELLED');}
async function persist(candidate=vault,epoch=activeEpoch){
  validateVault(candidate);const encrypted=await seal(candidate,key,salt);checkEpoch(epoch);
  const next=await writeRecord(encrypted,revision);checkEpoch(epoch);
  revision=next;record={...encrypted,revision};vault=candidate;
}
async function checkPaid(){paid=false;if(vault?.license){try{await verifyLicense(vault.license);paid=true;}catch{}}}
function demoAllowed(kind){if(paid||vault.usage[kind]<3)return true;page='settings';toast(tr('Limite demo raggiunto. Sblocca Twin con il tuo codice.','Demo limit reached. Unlock Twin with your code.'));render();return false;}
function noAI(){const cached=ai.aiState().cached;toast(cached?tr('Carica i modelli dalla cache in Impostazioni.','Load models from cache in Settings.'):tr('Scarica prima i modelli locali da Impostazioni.','Download the local models in Settings first.'));page='settings';}
function importForm(gate=false){return `<details class="top-gap"><summary class="muted">${tr('Ripristina un backup cifrato','Restore an encrypted backup')}</summary><form data-form="import" class="top-gap"><label>${tr('File JSON Twin','Twin JSON file')}<input type="file" name="backup" accept=".json,application/json" required></label><label>${tr('Password del backup','Backup password')}<input type="password" name="backupPassword" autocomplete="off" required></label><label class="inline-checkbox"><input type="checkbox" required>${tr('Il ripristino sostituisce tutti i dati locali. Ho conservato un backup.','Restoring replaces all local data. I have kept a backup.')}</label><button class="btn secondary" type="submit">${tr('Ripristina','Restore')}</button></form></details>`;}
