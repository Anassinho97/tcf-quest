/* Pure content and learning logic; also exercised by tests/validate.cjs. */
(function(root){
'use strict';
const levels=['A1','A2','B1','B2','C1','C2'];
const categories={listening:'Compréhension orale',reading:'Compréhension écrite',structures:'Structures de la langue'};
function unpack(packs){
if(!Array.isArray(packs))return [{id:'packs-invalid'}];
return packs.flatMap((pack,p)=>{
 if(!pack||typeof pack!=='object')return [{id:`pack-invalid-${p}`}];
 if(Array.isArray(pack.questions))return pack.questions;
 if(!Array.isArray(pack.rows))return [{id:pack.id||`pack-invalid-${p}`}];
 return pack.rows.map((r,i)=>{
  const id=`${pack.id}-${String(i+1).padStart(3,'0')}`;if(!Array.isArray(r))return {id};
  const text=pack.category!=='structures',meta=r[text?9:8]||{};
  return {id,category:pack.category,level:r[0],topic:r[1],...(text?{passage:pack.category==='reading'?r[2]:undefined,script:pack.category==='listening'?r[2]:undefined}:{}),question:r[text?3:2],options:r[text?4:3],answer:r[text?5:4],explanation:r[text?6:5],darija:r[text?7:6],tip:r[text?8:7],subtopic:meta.subtopic,difficulty:meta.difficulty||pack.difficulty||r[0],errorType:meta.errorType,errorTypes:meta.errorTypes,example:meta.example,audio:meta.audio||null,source:meta.source||{type:'original',author:pack.author,license:pack.license}};
 });
});}
function normalize(value){return String(value??'').normalize('NFKC').toLocaleLowerCase('fr').replace(/[’‘]/g,"'").replace(/[\p{P}\p{Z}\s]+/gu,' ').trim();}
function validate(questions){
const errors=[],ids=new Set(),prompts=new Set(),documents=new Set(),valid=[];
const coverage=Object.fromEntries(levels.map(l=>[l,{listening:0,reading:0,structures:0}]));
for(const [index,q]of questions.entries()){
 if(!q||typeof q!=='object'){errors.push({id:`entrée-${index}`,errors:['Objet question requis']});continue;}
 const e=[];
 for(const k of ['id','category','level','topic','question','explanation','darija','tip'])if(typeof q[k]!=='string'||!q[k].trim())e.push(`Champ manquant : ${k}`);
 if(!Object.hasOwn(categories,q.category))e.push('Catégorie invalide');if(!levels.includes(q.level))e.push('Niveau invalide');
 if(ids.has(q.id))e.push('ID dupliqué');ids.add(q.id);
 const document=q.passage||q.script||'',key=normalize(q.question)+'|'+normalize(document);
 if(prompts.has(key))e.push('Question dupliquée');prompts.add(key);
 if(document){const d=normalize(document);if(documents.has(d))e.push('Document ou script répété');documents.add(d);}
 if(!Array.isArray(q.options)||q.options.length!==4||q.options.some(a=>typeof a!=='string'||!a.trim())||new Set(q.options.map(normalize)).size!==4)e.push('Quatre options distinctes requises');
 if(!Number.isInteger(q.answer)||q.answer<0||q.answer>3)e.push('Réponse invalide');
 if(q.category==='listening'&&!(typeof q.script==='string'&&q.script.trim())&&!q.audio)e.push('Script ou audio requis');
 if(q.category==='reading'&&!(typeof q.passage==='string'&&q.passage.trim()))e.push('Document absent');
 if(q.audio&&!/^assets\/audio\/[a-zA-Z0-9_\-/]+\.(mp3|wav|ogg|m4a)$/.test(q.audio))e.push('Référence audio invalide');
 for(const k of ['subtopic','difficulty','errorType','example'])if(q[k]!==undefined&&(typeof q[k]!=='string'||!q[k].trim()))e.push(`Métadonnée invalide : ${k}`);
 if(q.errorTypes!==undefined&&(!Array.isArray(q.errorTypes)||q.errorTypes.length!==4||q.errorTypes.some((v,i)=>i===q.answer?v!==null:typeof v!=='string'||!v.trim())))e.push('Types d’erreur invalides');
 if(!q.source||typeof q.source.type!=='string'||!q.source.type.trim()||typeof q.source.license!=='string'||!q.source.license.trim())e.push('Licence/source absente');
 if(e.length)errors.push({id:q.id,errors:e});else{valid.push(q);coverage[q.level][q.category]++;}
}
return {valid,errors,coverage,total:valid.length};}
const blank=()=>({version:1,answers:[],exams:[],sessions:[],schedule:{},active:null});
function day(t=Date.now()){const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function summary(state){const answers=state.answers;const correct=answers.filter(a=>a.correct).length;const today=answers.filter(a=>day(a.at)===day());const dates=new Set(answers.map(a=>day(a.at)));let streak=0;const d=new Date();if(!dates.has(day(d.getTime())))d.setDate(d.getDate()-1);while(dates.has(day(d.getTime()))){streak++;d.setDate(d.getDate()-1);}return {attempted:answers.length,unique:new Set(answers.map(a=>a.id)).size,correct,accuracy:answers.length?Math.round(correct/answers.length*100):0,xp:answers.reduce((s,a)=>s+(a.correct?15:5),0),today:today.length,week:answers.filter(a=>a.at>=Date.now()-7*86400000).length,streak,time:answers.reduce((s,a)=>s+(a.ms||0),0)};}
function breakdown(state,bank,key){const map=new Map(bank.map(q=>[q.id,q]));const groups={};for(const a of state.answers){const q=map.get(a.id);if(!q)continue;const k=q[key];groups[k]||={n:0,c:0};groups[k].n++;groups[k].c+=Number(a.correct);}return Object.entries(groups).map(([name,g])=>({name,...g,pct:Math.round(g.c/g.n*100)}));}
function readiness(state,bank){const rows=breakdown(state,bank,'level');const qualified=rows.filter(r=>r.n>=6&&r.pct>=75);return qualified.sort((a,b)=>levels.indexOf(b.name)-levels.indexOf(a.name))[0]?.name||null;}
function record(state,q,choice,ms,mode){const correct=choice===q.answer,now=Date.now();const row={id:q.id,choice,correct,at:now,ms:Math.max(0,Math.round(ms)),mode};const attempt=state.answers.filter(a=>a.id===q.id&&a.choice>=0).length+1;state.answers.push(root.QuestAnalytics?root.QuestAnalytics.attach(row,q,attempt):row);const prev=state.schedule[q.id]||{interval:0,reps:0,lapses:0};const interval=correct?(prev.reps===0?1:prev.reps===1?3:Math.min(60,Math.max(3,prev.interval*2))):0;state.schedule[q.id]={interval,reps:correct?prev.reps+1:0,lapses:prev.lapses+(correct?0:1),due:now+(correct?interval*86400000:10*60000),last:now,wrong:!correct};return correct;}
function shuffled(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function select(bank,state,filter={}){if(filter.strategy==='weak'&&root.QuestAnalytics)return root.QuestAnalytics.selectWeak(bank,state,filter);let pool=bank.filter(q=>(!filter.category||q.category===filter.category)&&(!filter.level||q.level===filter.level)&&(!filter.topic||q.topic===filter.topic));const seen=new Set(state.answers.map(a=>a.id));const recent=new Set(state.answers.slice(-15).map(a=>a.id));if(filter.strategy==='unseen')pool=pool.filter(q=>!seen.has(q.id));if(filter.strategy==='mistakes')pool=pool.filter(q=>state.schedule[q.id]?.wrong);if(filter.strategy==='due')pool=pool.filter(q=>state.schedule[q.id]?.due<=Date.now());const weak=Object.fromEntries(breakdown(state,bank,'topic').map(r=>[r.name,r.pct]));const weight=q=>{if(filter.strategy==='weak')return (weak[q.topic]??65)+(recent.has(q.id)?100:0);if(['due','mistakes'].includes(filter.strategy))return state.schedule[q.id]?.due||0;return (seen.has(q.id)?100:0)+(recent.has(q.id)?100:0);};return shuffled(pool).sort((a,b)=>weight(a)-weight(b));}
function checkProgress(input,bank){if(!input||input.version!==1||!Array.isArray(input.answers)||!Array.isArray(input.exams)||!Array.isArray(input.sessions))throw Error('Format de sauvegarde non reconnu.');const questionMap=new Map(bank.map(q=>[q.id,q])),ids=new Set(questionMap.keys());for(const a of input.answers)if(!ids.has(a.id)||!Number.isInteger(a.choice)||a.choice< -1||a.choice>3||typeof a.correct!=='boolean'||!Number.isFinite(a.at)||a.at<0||a.at>Date.now()+86400000||!Number.isFinite(a.ms)||a.ms<0||a.ms>86400000)throw Error('Historique des réponses invalide ou pack manquant.');for(const a of input.answers){const q=questionMap.get(a.id);if(a.correct!==(a.choice===q.answer))throw Error('Résultat incohérent.');}for(const e of input.exams){if(typeof e.title!=='string'||e.title.length>100||!Number.isFinite(e.at)||e.at<0||!Number.isFinite(e.ms)||e.ms<0||!Array.isArray(e.ids)||e.ids.length>bank.length||new Set(e.ids).size!==e.ids.length||e.ids.some(id=>!ids.has(id))||!Array.isArray(e.choices)||e.choices.length!==e.ids.length||e.choices.some(c=>!Number.isInteger(c)||c< -1||c>3)||['extra','failed'].some(k=>e[k]!==undefined&&(!Array.isArray(e[k])||e[k].some(id=>!e.ids.includes(id)))))throw Error('Examen invalide.');}const state=blank();const counts=new Map();state.answers=input.answers.map(a=>{const attempt=(counts.get(a.id)||0)+(a.choice>=0?1:0);counts.set(a.id,attempt);return root.QuestAnalytics?root.QuestAnalytics.attach(a,questionMap.get(a.id),attempt):{...a};});state.exams=input.exams.map(e=>({title:e.title,at:e.at,ms:e.ms,ids:[...e.ids],choices:[...e.choices],extra:[...(e.extra||[])],failed:[...(e.failed||[])]}));const bounds=e=>Number.isInteger(e.answerStart)&&Number.isInteger(e.answerEnd)&&e.answerStart>=0&&e.answerEnd>=e.answerStart&&e.answerEnd<=state.answers.length?{answerStart:e.answerStart,answerEnd:e.answerEnd}:{};state.exams=state.exams.map((e,i)=>({...e,...bounds(input.exams[i])}));state.sessions=input.sessions.filter(s=>s&&Number.isFinite(s.at)&&Number.isInteger(s.count)&&s.count>=0).map(s=>({at:s.at,count:s.count,...bounds(s)}));for(const a of state.answers){const p=state.schedule[a.id]||{interval:0,reps:0,lapses:0};const interval=a.correct?(p.reps===0?1:p.reps===1?3:Math.min(60,Math.max(3,p.interval*2))):0;state.schedule[a.id]={interval,reps:a.correct?p.reps+1:0,lapses:p.lapses+(a.correct?0:1),last:a.at,due:a.at+(a.correct?interval*86400000:600000),wrong:!a.correct};}return state;}
root.Quest={levels,categories,unpack,validate,blank,day,summary,breakdown,readiness,record,select,shuffled,checkProgress};
})(typeof window==='undefined'?globalThis:window);
