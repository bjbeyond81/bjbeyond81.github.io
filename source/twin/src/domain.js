export const EMBEDDING_MODEL='Xenova/all-MiniLM-L6-v2';
export const EMBEDDING_DIM=384;
export const dayKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function parseDay(key){return new Date(`${key}T12:00:00`);}
export const money=(n,lang='en')=>new Intl.NumberFormat(lang==='it'?'it-IT':'en-GB',{style:'currency',currency:'EUR',minimumFractionDigits:0,maximumFractionDigits:2}).format(n);
export function createVault(profile){return {version:1,profile,notes:[],chats:[],letters:[],usage:{notes:0,questions:0},license:null};}
export function validateVault(v){
  const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(parseDay(d).getTime())&&dayKey(parseDay(d))===d;
  const str=(s,max)=>typeof s==='string'&&s.length<=max;
  if(!v||v.version!==1||!v.profile||(!str(v.profile.name,80)||!v.profile.name.trim())||!Array.isArray(v.profile.goals)||v.profile.goals.length!==3||v.profile.goals.some(g=>!str(g,240)||!g.trim())||!Number.isFinite(v.profile.budget)||v.profile.budget<0||v.profile.budget>1e8) throw new Error('Invalid profile');
  if(!Array.isArray(v.notes)||v.notes.length>20000||!Array.isArray(v.chats)||v.chats.length>5000||!Array.isArray(v.letters)||v.letters.length>1000||!v.usage||!Number.isSafeInteger(v.usage.notes)||!Number.isSafeInteger(v.usage.questions)||v.usage.notes<0||v.usage.questions<0) throw new Error('Invalid vault');
  const ids=new Set();
  const audioIds=new Set();
  for(const n of v.notes){
    if(!str(n.id,80)||ids.has(n.id)||!/^\d{4}-\d{2}-\d{2}$/.test(n.date)||Number.isNaN(parseDay(n.date).getTime())||dayKey(parseDay(n.date))!==n.date||!str(n.text,6000)||!Number.isFinite(n.spend)||n.spend<0||n.spend>1e7||!Number.isInteger(n.mood)||n.mood<1||n.mood>5||!Number.isFinite(n.sleep)||n.sleep<0||n.sleep>24) throw new Error('Invalid note');
    ids.add(n.id);
    if(n.audio){if(!str(n.audio.id,80)||!n.audio.id||audioIds.has(n.audio.id)||!str(n.audio.mimeType,120)||!/^audio\//.test(n.audio.mimeType)||!Number.isFinite(n.audio.duration)||n.audio.duration<=0||n.audio.duration>181||!Number.isInteger(n.audio.size)||n.audio.size<1||n.audio.size>4*1024*1024)throw new Error('Invalid audio note');audioIds.add(n.audio.id);}
    if(n.embedding!==null && (!Array.isArray(n.embedding)||n.embedding.length!==EMBEDDING_DIM||n.embedding.some(x=>!Number.isFinite(x)))) throw new Error('Invalid embedding');
  }
  for(const c of v.chats) if(!str(c.id,80)||!validDate(c.date)||!str(c.question,1000)||!str(c.answer,12000)||!Array.isArray(c.sources)||c.sources.length>5||c.sources.some(s=>!str(s.id,80)||!validDate(s.date)||!str(s.text,6000))) throw new Error('Invalid chat');
  for(const c of v.chats)if(c.goals!=null&&(!Array.isArray(c.goals)||c.goals.length!==3||c.goals.some(g=>!str(g,240))))throw new Error('Invalid chat goals');
  for(const l of v.letters) if(!str(l.id,80)||!validDate(l.date)||!str(l.text,12000)) throw new Error('Invalid letter');
  v.usage.notes=Math.max(v.usage.notes,v.notes.length); v.usage.questions=Math.max(v.usage.questions,v.chats.length);
  return v;
}
export function correlation(xs,ys){
  if(xs.length<7||xs.length!==ys.length)return null;
  const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
  const mx=mean(xs),my=mean(ys); let n=0,a=0,b=0;
  xs.forEach((x,i)=>{n+=(x-mx)*(ys[i]-my);a+=(x-mx)**2;b+=(ys[i]-my)**2;});
  return a&&b ? n/Math.sqrt(a*b) : null;
}
export function stats(notes,now=new Date()){
  // Multiple entries are aggregated by day. Sleep/mood use daily means; expenses are additive.
  const grouped=new Map(); const today=dayKey(now);
  for(const n of notes.filter(n=>n.date<=today)){
    const d=grouped.get(n.date)||{date:n.date,spend:0,mood:0,sleep:0,count:0};
    d.spend+=n.spend;d.mood+=n.mood;d.sleep+=n.sleep;d.count++; grouped.set(n.date,d);
  }
  const days=[...grouped.values()].map(d=>({...d,mood:d.mood/d.count,sleep:d.sleep/d.count})).sort((a,b)=>a.date.localeCompare(b.date));
  const month=today.slice(0,7); const monthly=days.filter(d=>d.date.startsWith(month));
  const weekdays=Array.from({length:7},(_,i)=>{const ds=days.filter(d=>parseDay(d.date).getDay()===i);return {day:i,count:ds.length,mean:ds.length?ds.reduce((a,d)=>a+d.spend,0)/ds.length:null};});
  const mean=key=>days.length?days.reduce((a,d)=>a+d[key],0)/days.length:null;
  return {asOf:today,month,days,observedDays:days.length,total:days.reduce((a,d)=>a+d.spend,0),monthSpend:monthly.reduce((a,d)=>a+d.spend,0),monthDays:monthly.length,averageSpend:mean('spend'),averageMood:mean('mood'),averageSleep:mean('sleep'),sleepSpendCorrelation:correlation(days.map(d=>d.sleep),days.map(d=>d.spend)),weekdays,highestWeekday:weekdays.filter(d=>d.count>=2).sort((a,b)=>b.mean-a.mean)[0]||null};
}
export function projection(stat,reduction){
  if(stat.observedDays<7||!Number.isFinite(reduction)||reduction<0||reduction>100)return null;
  const monthly=stat.averageSpend*365.2425/12;
  return {assumption:'mean of recorded days; missing days are unknown; no interest, income or inflation',observedDays:stat.observedDays,reduction,monthlyBaseline:monthly,baseline:Array.from({length:13},(_,i)=>monthly*i),changed:Array.from({length:13},(_,i)=>monthly*(1-reduction/100)*i),difference:monthly*12*reduction/100};
}
export function cosine(a,b){if(a.length!==b.length)return -1;let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]**2;bb+=b[i]**2;}return aa&&bb?dot/Math.sqrt(aa*bb):-1;}
export function retrieve(notes,embedding,{minScore=.25,limit=5}={}){return notes.filter(n=>n.embedding?.length===embedding.length&&n.embeddingModel===EMBEDDING_MODEL).map(n=>({...n,score:cosine(n.embedding,embedding)})).filter(n=>n.score>=minScore).sort((a,b)=>b.score-a.score).slice(0,limit);}
export function weeklyDue(letters,now=new Date()){
  // Latest Sunday, noon avoids daylight-saving date arithmetic errors.
  const sun=new Date(now.getFullYear(),now.getMonth(),now.getDate()-now.getDay(),12);
  const due=dayKey(sun); return letters.some(l=>l.date===due)?null:due;
}
