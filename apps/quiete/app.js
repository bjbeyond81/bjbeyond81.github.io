// Quiete — by BJ Beyond. Tutto resta sul dispositivo.
export const SOUNDS_APP_URL = 'https://bjbeyond.it/frequency/'; // Frequency Studio di BJ Beyond
const SITE_URL = 'https://bjbeyond.it';
const MODELS = ['Llama-3.2-1B-Instruct-q4f16_1-MLC', 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'];
const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.86';

/* ---------- storage ---------- */
const K = 'quiete:';
const db = {
  get(k, d) { try { const v = localStorage.getItem(K + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch {} },
};

/* ---------- i18n ---------- */
const T = {
it: {
nav_home:'Home',nav_breathe:'Respira',nav_chat:'Parla',nav_diary:'Diario',nav_more:'Altro',
footer:'Quiete non è un dispositivo medico né sostituisce un professionista. Stai interagendo con un\'IA.',info_link:'Informazioni e limiti',
hello:['Buonanotte','Buongiorno','Buon pomeriggio','Buonasera'],sub:'Un piccolo spazio per rallentare. Qui, adesso.',
feel_q:'Mi sento…',feelings:{ansioso:'Ansioso/a',stressato:'Stressato/a',triste:'Triste',arrabbiato:'Arrabbiato/a',insonne:'Non riesco a dormire',sopraffatto:'Sopraffatto/a',solo:'Solo/a',calmo:'Abbastanza bene'},
suggest:'Ti propongo',start:'Inizia',
t_breathe:'Respirazione guidata',t_breathe_d:'4-7-8, quadrata, coerente',t_ground:'Grounding 5-4-3-2-1',t_ground_d:'Torna nel presente',t_pmr:'Rilassamento muscolare',t_pmr_d:'Progressivo, 8 minuti',t_reframe:'Riformula un pensiero',t_reframe_d:'Stile CBT',t_grat:'Nota di gratitudine',t_grat_d:'Una cosa buona di oggi',t_mood:'Diario dell\'umore',t_mood_d:'Come stai oggi?',t_chat:'Parla con Quiete',t_chat_d:'Compagna IA locale',t_sound:'Suoni ambient',t_sound_d:'Rumore e drone morbido',
promo_t:'Frequency Studio di BJ Beyond',promo_d:'Per andare più a fondo: Frequency Studio, l\'app di suoni e frequenze di BJ Beyond, pensata per accompagnare respiro, sonno e concentrazione.',promo_b:'Apri Frequency Studio',
promo_ctx:'Vuoi continuare con un suono? Prova Frequency Studio di BJ Beyond →',
by:'Di BJ Beyond, scrittore',
// consent
c_title:'Prima di iniziare',c_intro:'Quiete è uno spazio di calma con tecniche di rilassamento e una compagna basata sull\'intelligenza artificiale. Leggi con attenzione:',
c_items:['Non è un dispositivo medico e non fornisce diagnosi né terapie.','Non sostituisce psicologi, psicoterapeuti o medici.','Stai parlando con un\'intelligenza artificiale (trasparenza ai sensi dell\'AI Act UE). L\'IA può sbagliare: valuta sempre con il tuo giudizio.','È destinata a persone maggiorenni, oppure a minori con un genitore o tutore.','Privacy locale: il modello IA gira nel tuo browser. Nessun dato lascia il dispositivo; tutto è salvato solo qui e puoi cancellarlo quando vuoi.','In caso di pericolo chiama subito il 112.'],
c_ok:'Ho letto e accetto',c_go:'Entra in Quiete',
// crisis
cr_title:'Non sei solo/a. Chiedi aiuto adesso.',cr_d:'Sembra che tu stia attraversando un momento molto difficile. Meriti supporto da una persona reale, subito.',
cr_112:'Emergenza',cr_ta:'Telefono Amico',cr_sam:'Samaritans Onlus',cr_doc:'Parla anche con il tuo medico di base o con uno psicologo. Se sei in pericolo immediato chiama il 112 o vai al pronto soccorso più vicino.',cr_close:'Chiudi',cr_breathe:'Respira con me mentre chiami',
// breathe
b_title:'Respira',b_478:'4-7-8',b_box:'Quadrata',b_coh:'Coerente',b_in:'Inspira',b_hold:'Trattieni',b_out:'Espira',b_start:'Avvia',b_stop:'Ferma',b_hap:'Vibrazione',b_min:'Durata',
b_desc:{'478':'Inspira 4s, trattieni 7s, espira 8s. Utile per addormentarsi.','box':'4s per ogni lato: inspira, trattieni, espira, trattieni.','coh':'5,5 respiri al minuto (5,45s dentro, 5,45s fuori). Equilibrio e calma.'},
b_done:'Ben fatto. Nota come ti senti adesso.',
// grounding
g_title:'Grounding 5-4-3-2-1',g_steps:['Nomina 5 cose che puoi vedere','Nomina 4 cose che puoi toccare','Nomina 3 suoni che puoi sentire','Nomina 2 odori che puoi percepire','Nomina 1 sapore, o una cosa gentile su di te'],g_next:'Avanti',g_done:'Sei qui, nel presente. Ottimo lavoro.',
// pmr
p_title:'Rilassamento muscolare progressivo',p_d:'Contrai ogni gruppo muscolare per 5 secondi, poi rilascia per 10. Senza dolore: se un\'area fa male, saltala.',
p_steps:['Mani e avambracci: stringi i pugni','Braccia: piega i gomiti e contrai i bicipiti','Spalle: portale verso le orecchie','Viso: strizza occhi e fronte','Mascella: stringi leggermente i denti','Petto e schiena: inspira e trattieni','Pancia: contrai gli addominali','Gambe: tendi cosce e polpacci','Piedi: arriccia le dita'],p_tense:'Contrai',p_release:'Rilascia…',p_start:'Inizia',p_done:'Tutto il corpo è più morbido. Resta qualche respiro così.',
// mood
m_title:'Diario dell\'umore',m_q:'Come ti senti, da 1 a 5?',m_note:'Una nota (facoltativa)',m_save:'Salva',m_saved:'Salvato sul dispositivo.',m_chart:'Ultimi 14 giorni',m_empty:'Nessuna voce ancora.',m_faces:['😞','🙁','😐','🙂','😊'],
// reframe
r_title:'Riformula un pensiero',r_d:'Un esercizio ispirato alla terapia cognitivo-comportamentale (non è terapia).',r_sit:'Situazione: cosa è successo?',r_th:'Pensiero automatico: cosa ti sei detto/a?',r_em:'Emozione e intensità (0-100)',r_alt:'Pensiero alternativo, più equilibrato',r_hint:'Domande utili: quali prove ho a favore e contro? Cosa direi a un amico? Esiste un\'altra lettura?',r_save:'Salva',r_list:'Le tue riformulazioni',
// gratitude
gr_title:'Nota di gratitudine',gr_q:'Una cosa, anche piccola, per cui oggi sei grato/a',gr_save:'Salva',gr_list:'Le tue note',
// sound
s_title:'Suoni ambient',s_d:'Un piccolo generatore integrato. Per un\'esperienza completa usa Frequency Studio di BJ Beyond.',s_brown:'Rumore marrone',s_pink:'Rumore rosa',s_drone:'Drone morbido',s_vol:'Volume',s_stop:'Ferma tutto',
// chat
ch_title:'Parla con Quiete',ch_ai:'Stai parlando con un\'intelligenza artificiale, non con una persona. Può sbagliare e non è un terapeuta.',
ch_consent:'Per rispondere, Quiete scarica un piccolo modello IA (circa 0,7–0,9 GB) che resta nel tuo browser. Dopo il download funziona anche offline e nessun messaggio lascia il dispositivo. Consigliata una rete Wi-Fi.',
ch_load:'Scarica e attiva l\'IA locale',ch_simple:'Continua senza IA',ch_nogpu:'Il tuo browser non supporta WebGPU, quindi l\'IA locale non è disponibile. Puoi usare la modalità semplice: ti propongo tecniche in base a ciò che scrivi. Per l\'IA serve Chrome/Edge recente su desktop o Android, oppure Safari 26+.',
ch_ph:'Scrivi come ti senti…',ch_send:'Invia',ch_loading:'Caricamento modello…',ch_ready:'IA locale pronta',ch_mode_simple:'Modalità semplice (senza IA)',ch_clear:'Nuova conversazione',ch_err:'Non sono riuscita a caricare il modello. Passo alla modalità semplice.',
ch_hi:'Ciao, sono Quiete. Sono qui per ascoltarti, senza giudizio. Come ti senti in questo momento?',
// more / info
more_title:'Altro',theme:'Tema',erase:'Cancella tutto',erase_q:'Cancellare tutti i dati (diario, note, chat, modello IA scaricato)? L\'operazione non si può annullare.',erased:'Tutti i dati sono stati cancellati.',install:'Installa l\'app',install_ios:'Su iPhone: tocca Condividi e poi "Aggiungi a Home".',
info_title:'Informazioni e limiti',
},
en: {
nav_home:'Home',nav_breathe:'Breathe',nav_chat:'Talk',nav_diary:'Diary',nav_more:'More',
footer:'Quiete is not a medical device and does not replace a professional. You are interacting with an AI.',info_link:'About & limits',
hello:['Good night','Good morning','Good afternoon','Good evening'],sub:'A small space to slow down. Here, now.',
feel_q:'I feel…',feelings:{ansioso:'Anxious',stressato:'Stressed',triste:'Sad',arrabbiato:'Angry',insonne:'Can\'t sleep',sopraffatto:'Overwhelmed',solo:'Lonely',calmo:'Fairly ok'},
suggest:'Try this',start:'Start',
t_breathe:'Guided breathing',t_breathe_d:'4-7-8, box, coherent',t_ground:'5-4-3-2-1 grounding',t_ground_d:'Come back to now',t_pmr:'Muscle relaxation',t_pmr_d:'Progressive, 8 min',t_reframe:'Reframe a thought',t_reframe_d:'CBT-style',t_grat:'Gratitude note',t_grat_d:'One good thing today',t_mood:'Mood diary',t_mood_d:'How are you today?',t_chat:'Talk to Quiete',t_chat_d:'Local AI companion',t_sound:'Ambient sounds',t_sound_d:'Noise and soft drone',
promo_t:'BJ Beyond Frequency Studio',promo_d:'Go deeper with Frequency Studio, the BJ Beyond sounds and frequencies app, made for breathing, sleep and focus.',promo_b:'Open Frequency Studio',
promo_ctx:'Want to continue with sound? Try BJ Beyond Frequency Studio →',
by:'By BJ Beyond, writer',
c_title:'Before you start',c_intro:'Quiete is a calm space with relaxation techniques and an AI-based companion. Please read:',
c_items:['It is not a medical device and gives no diagnosis or treatment.','It does not replace psychologists, therapists or doctors.','You are talking to an artificial intelligence (EU AI Act transparency). AI can make mistakes: always use your own judgement.','For adults 18+, or minors with a parent or guardian.','Local privacy: the AI model runs in your browser. No data leaves your device; everything is stored here only and you can erase it anytime.','If you are in danger, call 112 now.'],
c_ok:'I have read and accept',c_go:'Enter Quiete',
cr_title:'You are not alone. Reach out now.',cr_d:'It sounds like you are going through something very hard. You deserve support from a real person, right now.',
cr_112:'Emergency',cr_ta:'Telefono Amico',cr_sam:'Samaritans Onlus',cr_doc:'Please also talk to your doctor or a psychologist. If you are in immediate danger call 112 or go to the nearest emergency room.',cr_close:'Close',cr_breathe:'Breathe with me while you call',
b_title:'Breathe',b_478:'4-7-8',b_box:'Box',b_coh:'Coherent',b_in:'Breathe in',b_hold:'Hold',b_out:'Breathe out',b_start:'Start',b_stop:'Stop',b_hap:'Haptics',b_min:'Duration',
b_desc:{'478':'In 4s, hold 7s, out 8s. Helps falling asleep.','box':'4s each side: in, hold, out, hold.','coh':'5.5 breaths per minute (5.45s in, 5.45s out). Balance and calm.'},
b_done:'Well done. Notice how you feel now.',
g_title:'5-4-3-2-1 grounding',g_steps:['Name 5 things you can see','Name 4 things you can touch','Name 3 sounds you can hear','Name 2 things you can smell','Name 1 taste, or one kind thing about yourself'],g_next:'Next',g_done:'You are here, in the present. Great work.',
p_title:'Progressive muscle relaxation',p_d:'Tense each muscle group for 5 seconds, then release for 10. No pain: skip any area that hurts.',
p_steps:['Hands and forearms: make fists','Arms: bend elbows, tense biceps','Shoulders: lift toward ears','Face: squeeze eyes and forehead','Jaw: gently clench','Chest and back: breathe in and hold','Belly: tighten abs','Legs: tense thighs and calves','Feet: curl your toes'],p_tense:'Tense',p_release:'Release…',p_start:'Start',p_done:'Your whole body is softer. Stay with a few breaths.',
m_title:'Mood diary',m_q:'How do you feel, 1 to 5?',m_note:'A note (optional)',m_save:'Save',m_saved:'Saved on device.',m_chart:'Last 14 days',m_empty:'No entries yet.',m_faces:['😞','🙁','😐','🙂','😊'],
r_title:'Reframe a thought',r_d:'An exercise inspired by cognitive behavioural therapy (it is not therapy).',r_sit:'Situation: what happened?',r_th:'Automatic thought: what did you tell yourself?',r_em:'Emotion and intensity (0-100)',r_alt:'Alternative, more balanced thought',r_hint:'Useful questions: evidence for and against? What would I tell a friend? Is there another reading?',r_save:'Save',r_list:'Your reframes',
gr_title:'Gratitude note',gr_q:'One thing, even small, you are grateful for today',gr_save:'Save',gr_list:'Your notes',
s_title:'Ambient sounds',s_d:'A small built-in generator. For the full experience use BJ Beyond Frequency Studio.',s_brown:'Brown noise',s_pink:'Pink noise',s_drone:'Soft drone',s_vol:'Volume',s_stop:'Stop all',
ch_title:'Talk to Quiete',ch_ai:'You are talking to an artificial intelligence, not a person. It can be wrong and is not a therapist.',
ch_consent:'To reply, Quiete downloads a small AI model (about 0.7–0.9 GB) that stays in your browser. After download it works offline and no message leaves your device. Wi-Fi recommended.',
ch_load:'Download and enable local AI',ch_simple:'Continue without AI',ch_nogpu:'Your browser does not support WebGPU, so local AI is unavailable. You can use simple mode: I suggest techniques based on what you write. AI needs recent Chrome/Edge on desktop or Android, or Safari 26+.',
ch_ph:'Write how you feel…',ch_send:'Send',ch_loading:'Loading model…',ch_ready:'Local AI ready',ch_mode_simple:'Simple mode (no AI)',ch_clear:'New conversation',ch_err:'Could not load the model. Switching to simple mode.',
ch_hi:'Hi, I am Quiete. I am here to listen, without judgement. How are you feeling right now?',
more_title:'More',theme:'Theme',erase:'Erase everything',erase_q:'Erase all data (diary, notes, chat, downloaded AI model)? This cannot be undone.',erased:'All data erased.',install:'Install the app',install_ios:'On iPhone: tap Share, then "Add to Home Screen".',
info_title:'About & limits',
}};
let lang = db.get('lang', 'it');
const t = k => (T[lang][k] ?? T.it[k] ?? k);

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const app = $('#app');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const vibrate = p => { if (db.get('haptics', true) && navigator.vibrate) try { navigator.vibrate(p); } catch {} };
let cleanup = null;

/* ---------- crisis detection ---------- */
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const CRISIS = [
 /suicid/, /uccider[mt]i/, /ammazzar[mt]i/, /togliermi la vita/, /farla finita/, /voglio morire/, /vorrei morire/, /meglio (se fossi|essere) mort/, /non voglio piu vivere/, /non ha piu senso vivere/,
 /autolesion/, /tagliarmi/, /mi taglio/, /farmi del male/, /mi faccio del male/, /buttarmi (giu|dal|sotto)/, /impiccar/, /overdose/, /prendere tutte le pillole/,
 /mi (picchia|minaccia|vuole uccidere)/, /sono in pericolo/, /violenza (domestica|su di me)/, /abus(o|ano|ato|ata) di me/,
 /kill myself/, /end my life/, /want to die/, /wanna die/, /better off dead/, /no reason to live/, /self[- ]?harm/, /cut myself/, /hurt myself/, /take my (own )?life/, /i'?m in danger/, /hang myself/, /overdos/,
];
export const isCrisis = txt => { const n = norm(txt); return CRISIS.some(r => r.test(n)); };

function showCrisis() {
  openModal(`<div class="sheet crisis" role="alertdialog" aria-labelledby="crt">
  <h2 id="crt">${t('cr_title')}</h2><p>${t('cr_d')}</p>
  <a class="tel" href="tel:112"><span>${t('cr_112')}</span><b>112</b></a>
  <a class="tel" href="tel:0223272327"><span>${t('cr_ta')}</span><b>02 2327 2327</b></a>
  <a class="tel" href="tel:0677208977"><span>${t('cr_sam')}</span><b>06 77208977</b></a>
  <p class="sm">${t('cr_doc')}</p>
  <div class="row"><button class="btn ghost" data-close>${t('cr_close')}</button><button class="btn" data-close data-go="breathe">${t('cr_breathe')}</button></div></div>`);
}
function openModal(html) { const m = $('#modal'); m.innerHTML = html; m.hidden = false; m.querySelector('button,a')?.focus(); }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }

/* ---------- consent ---------- */
function showConsent() {
  openModal(`<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ct">
  <div class="row"><span class="logo"></span><div><b>Quiete</b><div class="mu sm">by BJ Beyond</div></div></div>
  <h2 id="ct">${t('c_title')}</h2><p class="mu">${t('c_intro')}</p>
  <ul class="check">${t('c_items').map(i => `<li>${i}</li>`).join('')}</ul>
  <label class="cb"><input type="checkbox" id="cok"><span>${t('c_ok')}</span></label>
  <button class="btn block" id="cgo" disabled>${t('c_go')}</button>
  <p class="sm mu" style="text-align:center;margin-top:10px"><a href="#" data-go="info" data-keep>${t('info_link')}</a></p></div>`);
  $('#cok').onchange = e => { $('#cgo').disabled = !e.target.checked; };
  $('#cgo').onclick = () => { db.set('consent', { v: 1, at: Date.now() }); closeModal(); };
}

/* ---------- views ---------- */
const SUGG = { ansioso:['breathe','478'], stressato:['breathe','box'], triste:['gratitude'], arrabbiato:['breathe','coh'], insonne:['pmr'], sopraffatto:['ground'], solo:['chat'], calmo:['mood'] };
const TILE = { breathe:['◯','t_breathe'], ground:['✋','t_ground'], pmr:['〰','t_pmr'], reframe:['✎','t_reframe'], gratitude:['✿','t_grat'], mood:['◔','t_mood'], chat:['✦','t_chat'], sound:['♪','t_sound'] };
const tile = k => `<button class="tile" data-go="${k === 'mood' ? 'diary' : k}"><span class="ic">${TILE[k][0]}</span><b>${t(TILE[k][1])}</b><span class="mu">${t(TILE[k][1] + '_d')}</span></button>`;
const promo = () => `<div class="card promo"><div class="wave"></div><h3>${t('promo_t')}</h3><p class="mu">${t('promo_d')}</p><a class="btn" href="${SOUNDS_APP_URL}" target="_blank" rel="noopener">${t('promo_b')} ↗</a></div>`;
const promoCtx = () => `<p class="sm" style="margin-top:16px"><a href="${SOUNDS_APP_URL}" target="_blank" rel="noopener">${t('promo_ctx')}</a></p>`;

const views = {
home() {
  const h = new Date().getHours(); const g = t('hello')[h < 5 ? 0 : h < 13 ? 1 : h < 18 ? 2 : 3];
  app.innerHTML = `<h1>${g}.</h1><p class="mu">${t('sub')}</p>
  <div class="card"><h3>${t('feel_q')}</h3><div class="feel" id="feel">${Object.entries(t('feelings')).map(([k, v]) => `<button data-f="${k}" aria-pressed="false">${v}</button>`).join('')}</div><div id="sugg"></div></div>
  ${promo()}
  <div class="grid">${['breathe','ground','pmr','reframe','gratitude','mood','chat','sound'].map(tile).join('')}</div>
  <p class="sm mu" style="text-align:center;margin-top:22px"><a href="${SITE_URL}" target="_blank" rel="noopener">${t('by')}</a> · bjbeyond.it</p>`;
  $('#feel').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return;
    document.querySelectorAll('#feel button').forEach(x => x.setAttribute('aria-pressed', x === b));
    const [v, p] = SUGG[b.dataset.f]; if (p) db.set('bmode', p);
    $('#sugg').innerHTML = `<div style="margin-top:14px"><span class="badge">${t('suggest')}</span><div style="margin-top:8px">${tile(v)}</div>${['insonne','ansioso','stressato'].includes(b.dataset.f) ? promoCtx() : ''}</div>`; };
},
breathe() {
  const P = { '478': [['in',4],['hold',7],['out',8]], box: [['in',4],['hold',4],['out',4],['hold',4]], coh: [['in',5.45],['out',5.45]] };
  let mode = db.get('bmode', '478'), running = false, timer = null, endAt = 0;
  const render = () => {
    app.innerHTML = `<h1>${t('b_title')}</h1>
    <div class="seg" role="tablist">${Object.keys(P).map(k => `<button data-m="${k}" class="${k === mode ? 'on' : ''}">${t('b_' + k)}</button>`).join('')}</div>
    <p class="mu sm" style="margin-top:10px">${t('b_desc')[mode]}</p>
    <div class="orb-wrap"><div class="ring"></div><div class="orb" id="orb"></div><div class="phase" id="ph" aria-live="polite">&nbsp;</div></div>
    <div class="row"><button class="btn" id="bgo" style="flex:1">${t('b_start')}</button>
    <label class="row sm"><input type="checkbox" id="hap" ${db.get('haptics', true) ? 'checked' : ''}> ${t('b_hap')}</label>
    <select id="dur" style="width:auto;margin:0">${[1,3,5,10].map(m => `<option value="${m}" ${m === db.get('bdur', 3) ? 'selected' : ''}>${m} min</option>`).join('')}</select></div>
    ${promoCtx()}`;
    app.querySelector('.seg').onclick = e => { const b = e.target.closest('[data-m]'); if (b) { stop(); mode = b.dataset.m; db.set('bmode', mode); render(); } };
    $('#bgo').onclick = () => running ? stop() : start();
    $('#hap').onchange = e => db.set('haptics', e.target.checked);
    $('#dur').onchange = e => db.set('bdur', +e.target.value);
  };
  const stop = (done) => { running = false; clearTimeout(timer); clearInterval(cd); const o = $('#orb'); if (o) { o.style.transitionDuration = '1.5s'; o.style.transform = 'scale(1)'; }
    if ($('#bgo')) $('#bgo').textContent = t('b_start'); if ($('#ph')) $('#ph').innerHTML = done ? t('b_done') : '&nbsp;'; };
  let cd = null;
  const start = () => { running = true; endAt = Date.now() + db.get('bdur', 3) * 60000; $('#bgo').textContent = t('b_stop'); step(0); };
  const step = i => { if (!running) return; const seq = P[mode]; if (Date.now() > endAt && i % seq.length === 0) return stop(true);
    const [ph, s] = seq[i % seq.length]; const o = $('#orb'); if (!o) return;
    o.style.transitionDuration = s + 's'; o.style.transform = ph === 'in' ? 'scale(2)' : ph === 'out' ? 'scale(1)' : o.style.transform;
    vibrate(ph === 'in' ? 40 : ph === 'out' ? [20, 60, 20] : 10);
    let left = Math.ceil(s); const lab = t('b_' + ph);
    const show = () => { if ($('#ph')) $('#ph').innerHTML = `${lab}<small>${left}</small>`; };
    show(); clearInterval(cd); cd = setInterval(() => { left = Math.max(0, left - 1); show(); }, 1000);
    timer = setTimeout(() => step(i + 1), s * 1000); };
  render(); cleanup = () => stop();
},
ground() {
  let i = 0; const S = t('g_steps');
  const r = () => { app.innerHTML = `<h1>${t('g_title')}</h1><div class="card">${i < 5 ? `<div class="step">${5 - i}</div><p style="text-align:center;font-size:19px">${S[i]}</p>
    <div class="bar" style="margin:16px 0"><i style="width:${i * 20}%"></i></div><button class="btn block" id="gn">${t('g_next')}</button>` : `<p style="font-size:19px">${t('g_done')}</p>${promoCtx()}`}</div>`;
    $('#gn') && ($('#gn').onclick = () => { i++; vibrate(20); r(); }); };
  r();
},
pmr() {
  const S = t('p_steps'); let i = -1, tm = null, alive = true;
  const r = (txt, sub) => { app.innerHTML = `<h1>${t('p_title')}</h1><p class="mu">${t('p_d')}</p><div class="card" aria-live="polite">
    ${i < 0 ? `<button class="btn block" id="ps">${t('p_start')}</button>` : i >= S.length ? `<p style="font-size:19px">${t('p_done')}</p>${promoCtx()}` : `<p class="badge">${i + 1}/${S.length}</p><h3 style="margin-top:10px">${S[i]}</h3><div class="step" style="font-size:28px">${txt}</div><p class="mu" style="text-align:center">${sub}</p><div class="bar"><i style="width:${(i / S.length) * 100}%"></i></div>`}</div>`;
    $('#ps') && ($('#ps').onclick = () => { i = 0; run(); }); };
  const run = () => { if (!alive) return; if (i >= S.length) return r();
    let n = 5; const tick = () => { if (!alive) return; r(t('p_tense'), n + 's'); if (n-- > 1) tm = setTimeout(tick, 1000); else { vibrate(30); let m = 10; const rel = () => { if (!alive) return; r(t('p_release'), m + 's'); if (m-- > 1) tm = setTimeout(rel, 1000); else { i++; tm = setTimeout(run, 600); } }; tm = setTimeout(rel, 1000); } };
    tick(); };
  r(); cleanup = () => { alive = false; clearTimeout(tm); };
},
diary() {
  const list = db.get('mood', []);
  app.innerHTML = `<h1>${t('m_title')}</h1><div class="card"><h3>${t('m_q')}</h3><div class="seg" id="faces">${t('m_faces').map((f, i) => `<button data-v="${i + 1}" aria-label="${i + 1}" style="font-size:26px">${f}</button>`).join('')}</div>
  <label class="sm mu" style="display:block;margin-top:12px">${t('m_note')}<textarea class="f" id="mn" rows="2"></textarea></label><button class="btn block" id="ms" disabled>${t('m_save')}</button><p class="sm mu" id="mok"></p></div>
  <div class="card"><h3>${t('m_chart')}</h3>${chart(list)}</div>
  <div class="card">${list.length ? list.slice(-20).reverse().map(e => `<div class="entry"><b>${t('m_faces')[e.v - 1]}</b> <span class="mu sm">${new Date(e.at).toLocaleString(lang)}</span>${e.n ? `<p>${esc(e.n)}</p>` : ''}</div>`).join('') : `<p class="mu">${t('m_empty')}</p>`}</div>
  <div class="grid">${tile('reframe')}${tile('gratitude')}</div>`;
  let v = 0; $('#faces').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; v = +b.dataset.v; document.querySelectorAll('#faces button').forEach(x => x.classList.toggle('on', x === b)); $('#ms').disabled = false; };
  $('#ms').onclick = () => { const n = $('#mn').value.trim(); if (n && isCrisis(n)) showCrisis(); list.push({ v, n, at: Date.now() }); db.set('mood', list); views.diary(); $('#mok').textContent = t('m_saved'); };
},
reframe() {
  const list = db.get('reframe', []);
  app.innerHTML = `<h1>${t('r_title')}</h1><p class="mu">${t('r_d')}</p><div class="card">
  ${[['sit','r_sit'],['th','r_th'],['em','r_em'],['alt','r_alt']].map(([k, l]) => `<label class="sm mu">${t(l)}<textarea class="f" id="r_${k}" rows="2"></textarea></label>`).join('')}
  <p class="sm mu">💡 ${t('r_hint')}</p><button class="btn block" id="rs">${t('r_save')}</button></div>
  ${list.length ? `<h2>${t('r_list')}</h2>` + list.slice().reverse().map(e => `<div class="card sm"><p><b>${t('r_sit')}</b> ${esc(e.sit)}</p><p><b>${t('r_th')}</b> ${esc(e.th)}</p><p><b>${t('r_em')}</b> ${esc(e.em)}</p><p><b>${t('r_alt')}</b> ${esc(e.alt)}</p></div>`).join('') : ''}`;
  $('#rs').onclick = () => { const e = {}; ['sit','th','em','alt'].forEach(k => e[k] = $('#r_' + k).value.trim()); if (!e.sit && !e.th) return;
    if (isCrisis(Object.values(e).join(' '))) showCrisis(); e.at = Date.now(); list.push(e); db.set('reframe', list); views.reframe(); };
},
gratitude() {
  const list = db.get('grat', []);
  app.innerHTML = `<h1>${t('gr_title')}</h1><div class="card"><label class="sm mu">${t('gr_q')}<textarea class="f" id="gq" rows="3"></textarea></label><button class="btn block" id="gs">${t('gr_save')}</button></div>
  ${list.length ? `<h2>${t('gr_list')}</h2><div class="card">` + list.slice().reverse().map(e => `<div class="entry">✿ ${esc(e.n)} <span class="mu sm">· ${new Date(e.at).toLocaleDateString(lang)}</span></div>`).join('') + '</div>' : ''}`;
  $('#gs').onclick = () => { const n = $('#gq').value.trim(); if (!n) return; if (isCrisis(n)) showCrisis(); list.push({ n, at: Date.now() }); db.set('grat', list); views.gratitude(); };
},
sound() {
  app.innerHTML = `<h1>${t('s_title')}</h1><p class="mu">${t('s_d')}</p><div class="card">
  ${['brown','pink','drone'].map(k => `<div class="row" style="justify-content:space-between;margin:8px 0"><b>${t('s_' + k)}</b><button class="btn ghost" data-snd="${k}">${Sound.on[k] ? '■' : '▶'}</button></div>`).join('')}
  <label class="sm mu">${t('s_vol')}<input type="range" id="vol" min="0" max="1" step="0.01" value="${Sound.vol}"></label>
  <button class="btn ghost block" id="sst">${t('s_stop')}</button></div>${promo()}`;
  app.querySelectorAll('[data-snd]').forEach(b => b.onclick = () => { Sound.toggle(b.dataset.snd); b.textContent = Sound.on[b.dataset.snd] ? '■' : '▶'; });
  $('#vol').oninput = e => Sound.setVol(+e.target.value);
  $('#sst').onclick = () => { Sound.stopAll(); views.sound(); };
},
chat() { Chat.render(); },
more() {
  app.innerHTML = `<h1>${t('more_title')}</h1><div class="grid">${['ground','pmr','reframe','gratitude','sound','chat'].map(tile).join('')}</div>
  ${promo()}
  <div class="card"><button class="btn ghost block" data-go="info">${t('info_title')}</button>
  <div style="height:10px"></div><button class="btn ghost block" id="inst">${t('install')}</button><p class="sm mu" id="insth"></p>
  <div style="height:10px"></div><button class="btn block" id="erase" style="background:var(--danger);color:#fff">${t('erase')}</button></div>
  <p class="sm mu" style="text-align:center"><a href="${SITE_URL}" target="_blank" rel="noopener">${t('by')}</a></p>`;
  $('#erase').onclick = eraseAll;
  $('#inst').onclick = async () => { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; } else $('#insth').textContent = t('install_ios'); };
},
info() { app.innerHTML = lang === 'en' ? INFO_EN : INFO_IT; },
};

/* ---------- mood chart ---------- */
function chart(list) {
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - 13 + i); return d; });
  const pts = days.map(d => { const e = list.filter(x => x.at >= +d && x.at < +d + 864e5); return e.length ? e.reduce((a, b) => a + b.v, 0) / e.length : null; });
  const W = 320, H = 140, x = i => 12 + i * (W - 24) / 13, y = v => H - 16 - (v - 1) * (H - 32) / 4;
  let path = '', dots = '';
  pts.forEach((v, i) => { if (v == null) return; path += (path ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); dots += `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="var(--ac)"/>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('m_chart')}">${[1,2,3,4,5].map(v => `<line x1="12" x2="${W - 12}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/>`).join('')}
  <path d="${path}" fill="none" stroke="var(--ac)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}
  ${days.map((d, i) => i % 3 === 0 ? `<text x="${x(i)}" y="${H - 2}" font-size="9" fill="var(--mu)" text-anchor="middle">${d.getDate()}/${d.getMonth() + 1}</text>` : '').join('')}</svg>`;
}

/* ---------- ambient sound (Web Audio) ---------- */
const Sound = {
  ctx: null, master: null, nodes: {}, on: {}, vol: 0.4,
  init() { if (this.ctx) return; this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination); },
  noise(type) { const c = this.ctx, len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    if (type === 'brown') { let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } }
    else { let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898; d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11; b6=w*.115926; } }
    const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const g = c.createGain(); g.gain.value = type === 'pink' ? 0.5 : 0.8; s.connect(g); s.start(); return { out: g, stop: () => s.stop() }; },
  drone() { const c = this.ctx, g = c.createGain(); g.gain.value = 0.12; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600; f.connect(g);
    const os = [110, 164.81, 220.5].map((fr, i) => { const o = c.createOscillator(); o.type = i === 1 ? 'triangle' : 'sine'; o.frequency.value = fr; const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 0.07 + i * 0.03; lg.gain.value = 1.2; l.connect(lg); lg.connect(o.detune); o.connect(f); o.start(); l.start(); return [o, l]; });
    return { out: g, stop: () => os.flat().forEach(o => o.stop()) }; },
  toggle(k) { this.init(); this.ctx.resume(); if (this.on[k]) { const n = this.nodes[k]; n.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3); setTimeout(() => n.stop(), 1200); this.on[k] = false; return; }
    const n = k === 'drone' ? this.drone() : this.noise(k); const tgt = n.out.gain.value; n.out.gain.value = 0; n.out.connect(this.master); n.out.gain.setTargetAtTime(tgt, this.ctx.currentTime, 0.8); this.nodes[k] = n; this.on[k] = true; },
  setVol(v) { this.vol = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1); },
  stopAll() { Object.keys(this.on).forEach(k => this.on[k] && this.toggle(k)); },
};

/* ---------- chat ---------- */
const SYSTEM_IT = `Sei "Quiete", una compagna di supporto emotivo NON clinica, creata per l'app Quiete di BJ Beyond. Rispondi SEMPRE in italiano (se l'utente scrive in un'altra lingua, rispondi in quella lingua).
Il tuo ruolo:
- Ascolta con calore, rifletti ciò che la persona prova e valida le sue emozioni senza giudicare.
- Fai al massimo una domanda aperta e gentile alla volta.
- Quando è utile, proponi UNA tecnica semplice presente nell'app: respirazione 4-7-8, respirazione quadrata, respirazione coerente, grounding 5-4-3-2-1, rilassamento muscolare progressivo, riformulazione di un pensiero, nota di gratitudine, diario dell'umore, oppure ascoltare suoni rilassanti con l'app di suoni e frequenze di BJ Beyond.
- Risposte brevi: 2-4 frasi, tono caldo, semplice, umano. Niente elenchi lunghi.
Regole assolute:
- Non sei una terapeuta, una psicologa o un medico, e non devi mai dire o lasciar intendere di esserlo. Se te lo chiedono, ricorda che sei un'intelligenza artificiale.
- Non fare mai diagnosi, non nominare disturbi come etichette per la persona, non dare consigli medici, su farmaci, dosaggi, sostanze o alimentazione terapeutica.
- Se la persona parla di suicidio, autolesionismo, violenza o pericolo, rispondi con empatia e invitala a chiamare subito il 112, Telefono Amico 02 2327 2327 o Samaritans Onlus 06 77208977, e a contattare un medico o uno psicologo.
- Se un problema dura da tempo o pesa molto, incoraggia con delicatezza a parlarne con un professionista o una persona di fiducia.
- Non inventare fatti, non promettere guarigioni, non fare pressioni.`;
const SYSTEM_EN_NOTE = '\nL\'utente ha scelto l\'interfaccia in inglese: rispondi in inglese.';
const CANNED = {
 it: [[/ansi|agitat|panico|paura|nervos/, 'Sento che c\'è molta agitazione adesso, ed è comprensibile. Proviamo insieme la respirazione 4-7-8: rallenta il corpo in pochi minuti.', 'breathe'],
      [/dorm|sonno|insonn|notte/, 'Quando il sonno non arriva può essere frustrante. Il rilassamento muscolare progressivo aiuta il corpo a lasciare andare; anche un suono morbido può accompagnarti.', 'pmr'],
      [/trist|giu|piang|vuoto/, 'Mi dispiace che tu ti senta così. È giusto dare spazio a questa tristezza. Ti va di scrivere una piccola nota di gratitudine, o di annotare come stai nel diario?', 'gratitude'],
      [/arrabb|rabbia|furios|nervi/, 'La rabbia segnala che qualcosa per te conta. Prima di tutto diamo al corpo un attimo: la respirazione coerente aiuta a scaricare la tensione.', 'breathe'],
      [/stress|lavoro|troppo|sopraff|pressione/, 'Sembra che tu stia portando molto peso. Un passo alla volta: il grounding 5-4-3-2-1 ti aiuta a tornare al presente.', 'ground'],
      [/pens|colpa|sbagliat|fallit|sempre|mai/, 'A volte i pensieri diventano molto duri con noi. Puoi provare a riformularne uno: situazione, pensiero, emozione e un\'alternativa più gentile.', 'reframe'],
      [/sol[oa]|nessuno|isolat/, 'Sentirsi soli pesa. Sono qui ad ascoltarti, e può aiutare anche cercare una persona di fiducia con cui parlare. Vuoi raccontarmi un po\' di più?', null]],
 en: [[/anx|panic|fear|nervous|worr/, 'It sounds like there is a lot of agitation right now, and that makes sense. Let\'s try 4-7-8 breathing together.', 'breathe'],
      [/sleep|insomn|night/, 'When sleep won\'t come it can be frustrating. Progressive muscle relaxation can help your body let go.', 'pmr'],
      [/sad|cry|empty|down/, 'I\'m sorry you feel this way. It\'s okay to make room for sadness. Would a small gratitude note or a mood entry help?', 'gratitude'],
      [/angry|anger|furious/, 'Anger shows that something matters to you. Let\'s give your body a moment with coherent breathing.', 'breathe'],
      [/stress|work|too much|overwhelm/, 'It sounds like you are carrying a lot. One step at a time: 5-4-3-2-1 grounding brings you back to now.', 'ground'],
      [/alone|lonely|nobody/, 'Feeling alone is heavy. I\'m here to listen, and reaching out to someone you trust can help too. Want to tell me more?', null]],
};
const Chat = {
  engine: null, status: db.get('aimode', null), progress: 0, ptext: '', busy: false,
  msgs: db.get('chat', []),
  save() { db.set('chat', this.msgs.slice(-40)); },
  async gpuOk() { try { return !!(navigator.gpu && await navigator.gpu.requestAdapter()); } catch { return false; } },
  async render() {
    const gpu = await this.gpuOk(); if (location.hash.slice(1) !== 'chat' && currentView !== 'chat') return;
    if (!this.msgs.length) this.msgs.push({ role: 'assistant', content: t('ch_hi') });
    const st = this.engine ? `<span class="badge">● ${t('ch_ready')}</span>` : this.status === 'loading' ? `<span class="badge">${t('ch_loading')}</span>` : this.status === 'simple' || !gpu ? `<span class="badge">${t('ch_mode_simple')}</span>` : '';
    const gate = !this.engine && this.status !== 'simple' && this.status !== 'loading';
    app.innerHTML = `<h1>${t('ch_title')}</h1><p class="sm mu">🤖 ${t('ch_ai')}</p><div class="row" style="justify-content:space-between">${st}<button class="chip" id="chc">${t('ch_clear')}</button></div>
    ${gate ? `<div class="card" id="gate">${gpu ? `<p>${t('ch_consent')}</p><div class="row"><button class="btn" id="chl">${t('ch_load')}</button><button class="btn ghost" id="chs">${t('ch_simple')}</button></div>` : `<p>${t('ch_nogpu')}</p><button class="btn" id="chs">${t('ch_simple')}</button>`}</div>` : ''}
    ${this.status === 'loading' ? `<div class="card"><p class="sm" id="pt">${esc(this.ptext)}</p><div class="bar"><i id="pb" style="width:${this.progress}%"></i></div></div>` : ''}
    <div class="chat" id="msgs" aria-live="polite">${this.msgs.map(m => this.bubble(m)).join('')}</div>
    ${gate ? '' : `<form class="composer" id="cf"><textarea id="ci" rows="1" placeholder="${t('ch_ph')}" aria-label="${t('ch_ph')}"></textarea><button class="btn" id="csend">${t('ch_send')}</button></form>`}`;
    $('#chc').onclick = () => { this.msgs = []; this.save(); this.render(); };
    $('#chl') && ($('#chl').onclick = () => this.load());
    $('#chs') && ($('#chs').onclick = () => { this.status = 'simple'; db.set('aimode', 'simple'); this.render(); });
    const f = $('#cf'); if (f) { f.onsubmit = e => { e.preventDefault(); this.send(); }; $('#ci').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); } }; }
    $('#msgs').lastElementChild?.scrollIntoView({ block: 'end' });
  },
  bubble(m) { return `<div class="msg ${m.role === 'user' ? 'u' : 'a'}">${esc(m.content)}${m.go ? `<div style="margin-top:8px"><button class="btn" data-go="${m.go}">${t(TILE[m.go === 'diary' ? 'mood' : m.go][1])} →</button></div>` : ''}</div>`; },
  async load() {
    this.status = 'loading'; this.render();
    try {
      const webllm = await import(/* @vite-ignore */ WEBLLM_URL);
      for (const id of MODELS) {
        try {
          this.engine = await webllm.CreateMLCEngine(id, { initProgressCallback: p => { this.progress = Math.round((p.progress || 0) * 100); this.ptext = p.text || ''; const pb = $('#pb'), pt = $('#pt'); if (pb) pb.style.width = this.progress + '%'; if (pt) pt.textContent = this.ptext; } });
          this.model = id; break;
        } catch (e) { console.warn('Modello non caricato', id, e); }
      }
      if (!this.engine) throw new Error('no model');
      this.status = 'ai'; db.set('aimode', 'ai');
    } catch (e) { console.warn(e); this.status = 'simple'; db.set('aimode', 'simple'); this.msgs.push({ role: 'assistant', content: t('ch_err') }); }
    this.render();
  },
  simpleReply(txt) { const n = norm(txt); for (const [r, a, go] of CANNED[lang]) if (r.test(n)) return { content: a, go };
    return { content: lang === 'en' ? 'Thank you for sharing this with me. Take a slow breath. If you like, a short breathing exercise can help you feel more grounded.' : 'Grazie per avermelo raccontato. Fai un respiro lento. Se ti va, un breve esercizio di respirazione può aiutarti a sentirti più stabile.', go: 'breathe' }; },
  async send() {
    const ci = $('#ci'); const txt = ci.value.trim(); if (!txt || this.busy) return; ci.value = '';
    this.msgs.push({ role: 'user', content: txt });
    if (isCrisis(txt)) { // controllo PRIMA del modello
      this.msgs.push({ role: 'assistant', content: lang === 'en' ? 'What you are feeling matters, and you deserve help from a real person right now. Please call 112, Telefono Amico 02 2327 2327 or Samaritans Onlus 06 77208977. You are not alone.' : 'Quello che senti è importante e meriti l\'aiuto di una persona reale, adesso. Chiama il 112, Telefono Amico 02 2327 2327 o Samaritans Onlus 06 77208977. Non sei solo/a.' });
      this.save(); this.render(); showCrisis(); return;
    }
    if (!this.engine) { const r = this.simpleReply(txt); this.msgs.push({ role: 'assistant', ...r }); this.save(); return this.render(); }
    this.busy = true; const out = { role: 'assistant', content: '…' }; this.msgs.push(out); this.render();
    try {
      const hist = this.msgs.filter(m => m !== out).slice(-10).map(({ role, content }) => ({ role, content }));
      const stream = await this.engine.chat.completions.create({ messages: [{ role: 'system', content: SYSTEM_IT + (lang === 'en' ? SYSTEM_EN_NOTE : '') }, ...hist], stream: true, temperature: 0.6, max_tokens: 220 });
      out.content = ''; const nodes = document.querySelectorAll('#msgs .msg'); const el = nodes[nodes.length - 1];
      for await (const ch of stream) { out.content += ch.choices[0]?.delta?.content || ''; if (el) el.textContent = out.content; }
      if (isCrisis(out.content)) showCrisis();
    } catch (e) { console.warn(e); out.content = this.simpleReply(txt).content; }
    this.busy = false; this.save(); this.render();
  },
};

/* ---------- info page ---------- */
const INFO_IT = `<h1>Informazioni e limiti</h1>
<div class="card"><h3>Cos'è Quiete</h3><p>Quiete, by BJ Beyond, è un'app di benessere per rallentare: respirazione guidata, grounding, rilassamento muscolare, diario dell'umore, esercizi di riformulazione e una compagna conversazionale basata sull'intelligenza artificiale.</p></div>
<div class="card"><h3>Cosa NON è</h3><ul class="check"><li>Non è un dispositivo medico e non è certificata come tale.</li><li>Non fornisce diagnosi, cure, terapie o consigli su farmaci.</li><li>Non sostituisce psicologi, psicoterapeuti, psichiatri o medici.</li><li>Non è un servizio di emergenza e non è monitorata da persone.</li></ul></div>
<div class="card"><h3>Trasparenza sull'IA (AI Act UE)</h3><p>Nella sezione "Parla" interagisci con un sistema di intelligenza artificiale, non con una persona. Il modello (Llama 3.2 1B Instruct o, in alternativa, Qwen2.5 0.5B Instruct, eseguito tramite WebLLM) è piccolo e può produrre risposte imprecise, inappropriate o sbagliate. Valuta sempre con il tuo giudizio. I messaggi che contengono parole legate a crisi vengono intercettati prima del modello e mostrano i numeri di aiuto.</p></div>
<div class="card"><h3>Privacy</h3><p>Nessun account, nessun server, nessun tracciamento. Il modello IA viene scaricato una volta (circa 0,7–0,9 GB, dai server pubblici di Hugging Face / MLC) e poi gira interamente nel tuo browser. Diario, note e conversazioni sono salvati solo su questo dispositivo (localStorage/IndexedDB). Puoi eliminare tutto con "Cancella tutto" nella sezione Altro.</p></div>
<div class="card"><h3>Età</h3><p>Destinata a maggiorenni. I minori possono usarla solo con un genitore o tutore.</p></div>
<div class="card crisis"><h3>Se sei in difficoltà</h3><a class="tel" href="tel:112"><span>Emergenza</span><b>112</b></a><a class="tel" href="tel:0223272327"><span>Telefono Amico</span><b>02 2327 2327</b></a><a class="tel" href="tel:0677208977"><span>Samaritans Onlus</span><b>06 77208977</b></a><p class="sm">Rivolgiti anche al tuo medico o a uno psicologo.</p></div>
<div class="card"><h3>Chi l'ha creata</h3><p>Un progetto di <a href="${SITE_URL}" target="_blank" rel="noopener">BJ Beyond, scrittore</a>. Per suoni e frequenze: <a href="${SOUNDS_APP_URL}" target="_blank" rel="noopener">Frequency Studio, l'app di suoni e frequenze di BJ Beyond</a>.</p><p class="sm mu">Le tecniche proposte sono pratiche di rilassamento diffuse e a scopo informativo. Interrompi se provi disagio.</p></div>`;
const INFO_EN = `<h1>About & limits</h1>
<div class="card"><h3>What Quiete is</h3><p>Quiete, by BJ Beyond, is a wellbeing app to slow down: guided breathing, grounding, muscle relaxation, mood diary, reframing exercises and an AI-based conversational companion.</p></div>
<div class="card"><h3>What it is NOT</h3><ul class="check"><li>Not a medical device.</li><li>No diagnosis, treatment, therapy or medication advice.</li><li>Not a replacement for psychologists, therapists, psychiatrists or doctors.</li><li>Not an emergency service and not monitored by humans.</li></ul></div>
<div class="card"><h3>AI transparency (EU AI Act)</h3><p>In "Talk" you interact with an AI system, not a person. The model (Llama 3.2 1B Instruct, or Qwen2.5 0.5B Instruct as fallback, via WebLLM) is small and can be inaccurate or wrong. Crisis-related messages are intercepted before the model and show help numbers.</p></div>
<div class="card"><h3>Privacy</h3><p>No account, no server, no tracking. The model is downloaded once (about 0.7–0.9 GB from public Hugging Face / MLC servers) and then runs in your browser. Data stays on this device only. Use "Erase everything" in More.</p></div>
<div class="card"><h3>Age</h3><p>For adults 18+; minors only with a parent or guardian.</p></div>
<div class="card crisis"><h3>If you are struggling</h3><a class="tel" href="tel:112"><span>Emergency</span><b>112</b></a><a class="tel" href="tel:0223272327"><span>Telefono Amico</span><b>02 2327 2327</b></a><a class="tel" href="tel:0677208977"><span>Samaritans Onlus</span><b>06 77208977</b></a><p class="sm">Please also contact your doctor or a psychologist.</p></div>
<div class="card"><h3>Made by</h3><p>A project by <a href="${SITE_URL}" target="_blank" rel="noopener">BJ Beyond, writer</a>. Sounds & frequencies: <a href="${SOUNDS_APP_URL}" target="_blank" rel="noopener">BJ Beyond Frequency Studio</a>.</p></div>`;

/* ---------- erase ---------- */
async function eraseAll() {
  if (!confirm(t('erase_q'))) return;
  Sound.stopAll();
  Object.keys(localStorage).filter(k => k.startsWith(K)).forEach(k => localStorage.removeItem(k));
  try { for (const k of await caches.keys()) await caches.delete(k); } catch {}
  try { if (indexedDB.databases) for (const d of await indexedDB.databases()) d.name && indexedDB.deleteDatabase(d.name); } catch {}
  try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch {}
  alert(t('erased')); location.replace(location.pathname);
}

/* ---------- router & chrome ---------- */
let currentView = 'home';
function go(v) {
  if (!views[v]) v = 'home';
  cleanup?.(); cleanup = null; currentView = v;
  if (location.hash.slice(1) !== v) history.replaceState(null, '', '#' + v);
  views[v](); scrollTo(0, 0);
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.go === v));
}
function applyLang() {
  document.documentElement.lang = lang; $('#langBtn').textContent = lang === 'it' ? 'EN' : 'IT';
  document.querySelectorAll('[data-t]').forEach(e => e.textContent = t(e.dataset.t));
  $('#sos').setAttribute('aria-label', lang === 'it' ? 'Emergenza: numeri di aiuto' : 'Emergency: help numbers');
}
function applyTheme() { const th = db.get('theme', matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); document.documentElement.dataset.theme = th; }
document.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) closeModal();
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); if (g.hasAttribute('data-keep')) { closeModal(); go(g.dataset.go); const back = document.createElement('button'); back.className = 'btn block'; back.textContent = '←'; back.onclick = () => { go('home'); showConsent(); }; app.prepend(back); return; } closeModal(); go(g.dataset.go); }
});
$('#sos').onclick = showCrisis;
$('#langBtn').onclick = () => { lang = lang === 'it' ? 'en' : 'it'; db.set('lang', lang); applyLang(); go(currentView); if (!db.get('consent')) showConsent(); };
$('#themeBtn').onclick = () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; db.set('theme', n); applyTheme(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden && db.get('consent')) closeModal(); });
addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v !== currentView) go(v); });
let deferredPrompt = null; addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });

applyTheme(); applyLang(); go(location.hash.slice(1) || 'home');
if (!db.get('consent')) showConsent();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__quiete = { isCrisis, SOUNDS_APP_URL };
