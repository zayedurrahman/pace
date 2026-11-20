/* Daily study loop: composes the existing syllabus, class plan, reviews and
   locally saved focus tasks without copying those records into a second list. */
(() => {
  'use strict';
  if (typeof S === 'undefined' || typeof save !== 'function') return;

  const app = document.querySelector('#app');
  if (!app) return;
  const escText = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const todayKey = () => typeof dk === 'function' ? dk() : new Date().toISOString().slice(0,10);
  const dayOffset = (days) => { const d=new Date();d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  let normalized=false,onboardingStep=1;
  const ensureProfile = () => { if(normalized)return;if(!S.paceProfile||typeof S.paceProfile!=='object'||Array.isArray(S.paceProfile))S.paceProfile={complete:false,availableHours:4,subjects:[]};if(!Array.isArray(S.paceProfile.subjects))S.paceProfile.subjects=[];S.mistakes=(Array.isArray(S.mistakes)?S.mistakes:[]).filter(x=>x&&typeof x==='object'&&typeof x.topic==='string'&&typeof x.solution==='string').slice(0,5000).map((x,i)=>({id:String(x.id||`mistake-${i}`),subject:typeof x.subject==='string'?x.subject:'phy',topic:x.topic.slice(0,160),topicKey:typeof x.topicKey==='string'?x.topicKey:'',type:['concept','careless','time','memory'].includes(x.type)?x.type:'concept',solution:x.solution.slice(0,3000),tags:Array.isArray(x.tags)?x.tags.filter(t=>typeof t==='string').slice(0,12):[],createdAt:Number(x.createdAt)||Date.now(),repetitions:Math.max(0,Math.min(4,Number(x.repetitions)||0)),nextReview:Number(x.nextReview)||Date.now()}));normalized=true; };
  const topicForToday = (due) => {
    const preferred=S.paceProfile.subjects||[],sortByPreference=(a,b)=>((preferred.includes(b.t?.s?.id)?1:0)-(preferred.includes(a.t?.s?.id)?1:0));
    if(due.length)return {topic:due.slice().sort(sortByPreference)[0].t,reason:'It is due for spaced revision today.'};
    const weak=typeof weakInfo==='function'?weakInfo():[];
    if(weak.length)return {topic:weak.slice().sort(sortByPreference)[0].t,reason:'This topic is marked as difficult or needs review.'};
    const unfinished=(typeof ALL!=='undefined'?ALL:[]).filter(t=>(S.st[t.k]||0)<3).sort((a,b)=>(preferred.includes(b.s.id)?1:0)-(preferred.includes(a.s.id)?1:0))[0];
    if(unfinished)return {topic:unfinished,reason:'A small step here will move your syllabus forward.'};
    return null;
  };
  const weightedProgress = () => {
    if(typeof ALL==='undefined'||!ALL.length)return 0;
    const stage=[0,.35,.65,1];
    let points=0,max=0;for(const t of ALL){const score=window.PaceEnhancements?.getTopicConfidence?.(t.k)||'amber',factor=score==='red'?.75:score==='green'?1.08:1;points+=stage[S.st[t.k]||0]*factor;max+=factor;}return max?Math.round(points/max*100):0;
  };
  function renderToday(){
    ensureProfile();
    if(!document.querySelector('nav [data-v="home"].on')||document.querySelector('[data-pace-nav].on'))return;
    const heading=app.querySelector('h1');if(!heading)return;
    let panel=app.querySelector('#pace-today-flow');
    if(panel)panel.remove();
    const due=typeof dueInfo==='function'?dueInfo().d:[];
    const suggestion=topicForToday(due);
    const plan=typeof planTasks==='function'&&typeof lplan==='function'&&lplan().active?planTasks():null;
    const planned=plan?.tasks?.filter(x=>!lplan().done[x.key]).slice(0,2)||[];
    const classes=(Array.isArray(S.classes)?S.classes:[]).filter(x=>!x.done&&x.date>=todayKey()).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||''));
    const nextClass=classes[0];
    const now=new Date();
    const todayData=window.PaceEnhancements?.getTodayData?.(todayKey())||{focusSeconds:0,tasks:[],lastBackupAt:null};
    const focusSec=todayData.focusSeconds+Math.max(0,+S.days?.[todayKey()]||0);
    const dateGap=S.exam?Math.max(0,Math.ceil((new Date(`${S.exam}T23:59:59`).getTime()-now.getTime())/86400000)):null;
    const backup=todayData.lastBackupAt;
    const backupDays=backup?Math.floor((Date.now()-backup)/86400000):null;
    const todayTasks=todayData.tasks.slice(0,4);
    const focusGoal=Math.max(1,+S.goal||4);
    const progress=Math.min(100,focusSec/(focusGoal*3600)*100);
    const planHtml=planned.length?planned.map((x,i)=>`<li><span><b>${escText(x.course)}</b><br><span class="mu">${escText(x.title)} · Lecture ${x.n}</span></span><button class="btn sm" data-a="pldone" data-k="${escText(x.key)}" aria-label="Complete ${escText(x.title)}">Complete</button></li>`).join(''):'<li class="pace-flow-empty">No lecture tasks queued today. Add a routine in Classes, or choose a topic below.</li>';
    const taskHtml=todayTasks.length?todayTasks.map(x=>`<li><span><b>${escText(x.text)}</b><small class="mu">${escText((typeof SUBJ!=='undefined'?SUBJ.find(s=>s.id===x.subject)?.n:null)||x.subject)}</small></span><button class="btn sm" data-flow-task="${escText(x.id)}">Done</button><button class="btn sm" data-flow-move="${escText(x.id)}" aria-label="Move ${escText(x.text)} to tomorrow">Tomorrow</button></li>`).join(''):'<li class="pace-flow-empty">No open tasks. Add one small next action below.</li>';
    panel=document.createElement('section');panel.id='pace-today-flow';panel.className='glass pad pace-today-flow';panel.setAttribute('aria-labelledby','pace-today-title');
    panel.innerHTML=`<div class="pace-section-head"><div><p class="pace-eyebrow">TODAY · A REALISTIC NEXT STEP</p><h2 id="pace-today-title">Your study loop</h2><p class="mu">Use the work already in your schedule, syllabus and review queue.</p></div><button class="btn pri" type="button" data-flow-focus>Start focus</button></div>
      <div class="pace-flow-grid">
        <article class="pace-flow-card"><h3>Suggested topic</h3>${suggestion?`<p><b>${escText(typeof lbl==='function'?lbl(suggestion.topic):suggestion.topic.tn)}</b></p><p class="mu">${escText(suggestion.reason)}</p><button class="btn sm" type="button" data-flow-topic="${escText(suggestion.topic.k)}">Open in syllabus</button>`:'<p class="mu">Your tracked syllabus is complete. Add topics or revisit any topic you want to strengthen.</p>'}</article>
        <article class="pace-flow-card"><h3>Next commitment</h3>${nextClass?`<p><b>${escText(nextClass.title)}</b></p><p class="mu">${escText(nextClass.course||'Class')} · ${escText(nextClass.date)}${nextClass.time?' · '+escText(nextClass.time):''}</p><button class="btn sm" data-a="v" data-v="classes">Open classes</button>`:`<p class="mu">No upcoming class is scheduled. Add a class or make a chapter routine in Classes.</p><button class="btn sm" data-a="v" data-v="classes">Plan classes</button>`}${dateGap!==null?`<p class="pace-flow-countdown">HSC exam window · <b>${dateGap}</b> day${dateGap===1?'':'s'} left</p>`:''}</article>
        <article class="pace-flow-card"><h3>Progress today</h3><p class="pace-flow-number">${Math.floor(focusSec/3600)}h ${String(Math.floor(focusSec%3600/60)).padStart(2,'0')}m <span class="mu">focused</span></p><div class="pace-bar" role="progressbar" aria-label="Today's focus goal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><i style="width:${progress}%"></i></div><p class="mu">${Math.round(progress)}% of your ${focusGoal} hour daily goal · ${weightedProgress()}% confidence-weighted syllabus</p></article>
        <article class="pace-flow-card"><div class="pace-section-head"><h3>Due for review</h3><span class="tag">${due.length} topic${due.length===1?'':'s'}</span></div>${due.length?`<p class="mu">${escText(typeof lbl==='function'?lbl(due[0].t):due[0].t.tn)}${due.length>1?` and ${due.length-1} more`:''}</p><button class="btn sm" data-a="v" data-v="rev">Open revision</button>`:'<p class="mu">Nothing due today. Your revision queue will appear here when it is time.</p>'}</article>
      </div>
      <div class="pace-flow-grid pace-flow-lists"><article class="pace-flow-card"><h3>Today's lecture plan</h3><ul class="pace-flow-list">${planHtml}</ul><button class="btn sm" data-a="v" data-v="taskmaker">Edit chapter plan</button></article><article class="pace-flow-card"><h3>Quick tasks</h3><ul class="pace-flow-list">${taskHtml}</ul><form class="pace-flow-add" id="pace-flow-task-form"><label class="sr-only" for="pace-flow-task-text">Add a study task</label><input id="pace-flow-task-text" maxlength="120" placeholder="One next action"><label class="sr-only" for="pace-flow-task-subject">Task subject</label><select id="pace-flow-task-subject">${(typeof SUBJ!=='undefined'?SUBJ:[]).map(s=>`<option value="${escText(s.id)}">${escText(s.n)}</option>`).join('')}</select><button class="btn" type="submit">Add task</button></form><p class="mu">Tasks here are the same checklist used in Focus.</p></article></div>
      <div class="pace-flow-bottom"><button class="btn" type="button" data-flow-onboard>${S.paceProfile.complete?'Edit study preferences':'Set up study preferences'}</button>${backupDays===null||backupDays>7?`<div class="pace-reminder" role="status">${backupDays===null?'No backup saved yet.':'Your last backup was '+backupDays+' days ago.'} <button class="btn sm" data-flow-backup>Export a backup</button></div>`:`<span class="mu">Last backed up ${backupDays} day${backupDays===1?'':'s'} ago.</span>`}<button class="btn" data-flow-mistakes>Open Mistake Notebook${S.mistakes.filter(x=>+x.nextReview<=Date.now()).length?` · ${S.mistakes.filter(x=>+x.nextReview<=Date.now()).length} due`:''}</button></div>`;
    const intro=heading.nextElementSibling;
    if(intro?.tagName==='P')intro.after(panel);else heading.after(panel);
  }

  function onboarding(){
    ensureProfile();
    const profile=S.paceProfile,subjects=(typeof SUBJ!=='undefined'?SUBJ:[]);
    const modal=document.createElement('div');modal.className='pace-overlay';modal.id='pace-flow-modal';
    const dailyTarget=Math.max(1,Math.min(6,Math.round(+profile.availableHours||4)));
    modal.innerHTML=`<section class="glass pace-dialog" role="dialog" aria-modal="true" aria-labelledby="pace-onboard-title" tabindex="-1"><p class="pace-eyebrow">PACE SETUP · OPTIONAL</p><h2 id="pace-onboard-title">Set a study rhythm that fits you</h2><p class="mu">You can skip this now and change these preferences from Today later.</p><div class="pace-onboard-progress" aria-live="polite">Step <b id="pace-onboard-step">1</b> of 3</div><section class="pace-onboard-step" data-onboard-step="1"><h3>1 · Your exam and goal</h3><label>HSC year<input id="pace-onboard-year" type="number" min="2026" max="2035" value="${escText((S.exam||'2028').slice(0,4))}"></label><label>Admission goal<select id="pace-onboard-path"><option value="" ${!S.tk?'selected':''}>Choose later</option><option value="doc" ${S.tk==='doc'?'selected':''}>Doctor</option><option value="eng" ${S.tk==='eng'?'selected':''}>Engineer</option><option value="other" ${profile.goal==='other'?'selected':''}>Other / still deciding</option></select></label></section><section class="pace-onboard-step" data-onboard-step="2" hidden><h3>2 · Your available study time</h3><label>Typical study time each day<select id="pace-onboard-hours">${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${dailyTarget===n?'selected':''}>About ${n} hour${n===1?'':'s'} a day</option>`).join('')}</select></label><fieldset class="pace-subject-picker"><legend>Subjects to prioritize (optional)</legend>${subjects.map(s=>`<label><input type="checkbox" value="${escText(s.id)}" ${!profile.subjects.length||profile.subjects.includes(s.id)?'checked':''}> ${escText(s.n)}</label>`).join('')}</fieldset></section><section class="pace-onboard-step" data-onboard-step="3" hidden><h3>3 · Your plan is ready</h3><p id="pace-onboard-summary" class="mu"></p><p class="mu">Pace will use this to shape suggestions. Your existing syllabus progress, classes, and revision dates stay as they are.</p></section><div class="row pace-onboard-actions"><button class="btn" data-flow-skip>Skip for now</button><button class="btn" data-flow-back hidden>Back</button><button class="btn pri" data-flow-next>Continue</button><button class="btn pri" data-flow-save hidden>Save preferences</button></div></section>`;
    onboardingStep=1;document.body.append(modal);modal.querySelector('#pace-onboard-year')?.focus();
    const close=()=>modal.remove();
    modal.addEventListener('click',e=>{if(e.target===modal)close();});
    modal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const nodes=[...modal.querySelectorAll('button,input,select')].filter(x=>!x.disabled&&!x.hidden&&x.offsetParent!==null);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  }
  function setOnboardingStep(step){onboardingStep=Math.max(1,Math.min(3,step));const modal=document.querySelector('#pace-flow-modal');if(!modal)return;modal.querySelector('#pace-onboard-step').textContent=String(onboardingStep);modal.querySelectorAll('[data-onboard-step]').forEach(x=>x.hidden=+x.dataset.onboardStep!==onboardingStep);modal.querySelector('[data-flow-back]').hidden=onboardingStep===1;modal.querySelector('[data-flow-next]').hidden=onboardingStep===3;modal.querySelector('[data-flow-save]').hidden=onboardingStep!==3;if(onboardingStep===3){const year=modal.querySelector('#pace-onboard-year').value,path=modal.querySelector('#pace-onboard-path').selectedOptions[0].text,hours=modal.querySelector('#pace-onboard-hours').value,subjects=modal.querySelectorAll('.pace-subject-picker input:checked').length;modal.querySelector('#pace-onboard-summary').textContent=`HSC ${year} · ${path} · about ${hours} hour${hours==='1'?'':'s'} a day · ${subjects} prioritized subjects.`;}modal.querySelector(`[data-onboard-step="${onboardingStep}"] input, [data-onboard-step="${onboardingStep}"] select`)?.focus();}
  function saveProfile(skip){
    ensureProfile();
    if(skip){S.paceProfile.complete=true;S.paceProfile.skipped=true;save();renderToday();return;}
    const year=Math.max(2026,Math.min(2035,parseInt(document.querySelector('#pace-onboard-year')?.value,10)||2028));
    const current=S.exam||`${year}-05-01`,monthDay=current.slice(4)||'-05-01';S.exam=`${year}${monthDay}`;
    const path=document.querySelector('#pace-onboard-path')?.value;
    if(path==='doc'||path==='eng'||path==='other'){S.tk=path;document.documentElement.dataset.track=path;if(typeof trackH==='function')trackH();}
    const daily=Math.max(1,Math.min(6,+document.querySelector('#pace-onboard-hours')?.value||4)),weekly=daily*7;
    S.paceProfile={...S.paceProfile,complete:true,skipped:false,goal:path||S.paceProfile.goal||'',availableHours:daily,subjects:[...document.querySelectorAll('.pace-subject-picker input:checked')].map(x=>x.value),updatedAt:Date.now()};
    S.goal=daily;
    window.PaceEnhancements?.setWeeklyTarget?.(weekly);
    save();render();renderToday();
  }
  function openTopic(key){const topic=(typeof ALL!=='undefined'?ALL:[]).find(t=>t.k===key);if(!topic)return;sub=topic.s.id;pp=topic.p;open[topic.c]=1;view='syl';render();window.scrollTo(0,0);}
  function mistakeModal(){
    ensureProfile();const subjects=(typeof SUBJ!=='undefined'?SUBJ:[]);
    const options=(typeof ALL!=='undefined'?ALL:[]).map(t=>`<option value="${escText(t.k)}">${escText(t.s.n)} · ${escText(t.ch)} · ${escText(t.tn)}</option>`).join('');
    const node=document.createElement('div');node.className='pace-overlay';node.id='pace-flow-modal';
    node.innerHTML=`<section class="glass pace-dialog" role="dialog" aria-modal="true" aria-labelledby="pace-mistake-title"><h2 id="pace-mistake-title">Add a mistake to revisit</h2><p class="mu">Keep the correction and the syllabus topic together. It will enter the review queue today.</p><label>Subject<select id="pace-mistake-subject">${subjects.map(s=>`<option value="${escText(s.id)}">${escText(s.n)}</option>`).join('')}</select></label><label>Topic or question<input id="pace-mistake-topic" maxlength="160" placeholder="e.g. Sign error in the lens equation"></label><label>Link a syllabus topic (optional)<select id="pace-mistake-link"><option value="">No linked topic</option>${options}</select></label><label>Mistake type<select id="pace-mistake-type"><option value="concept">Concept gap</option><option value="careless">Careless error</option><option value="time">Time pressure</option><option value="memory">Memory gap</option></select></label><label>Correct solution / what to remember<textarea id="pace-mistake-solution" rows="4" maxlength="3000" placeholder="Write the correct method in your own words"></textarea></label><label>Tags (comma separated)<input id="pace-mistake-tags" maxlength="240" placeholder="formula, units"></label><div class="row"><button class="btn" data-flow-close>Cancel</button><button class="btn pri" data-flow-mistake-save>Save mistake</button></div></section>`;
    document.body.append(node);node.querySelector('#pace-mistake-topic')?.focus();node.addEventListener('click',e=>{if(e.target===node)node.remove();});node.addEventListener('keydown',e=>{if(e.key==='Escape')node.remove();});
  }
  function saveMistake(){
    ensureProfile();const topic=document.querySelector('#pace-mistake-topic')?.value.trim(),solution=document.querySelector('#pace-mistake-solution')?.value.trim();if(!topic||!solution){document.querySelector(!topic?'#pace-mistake-topic':'#pace-mistake-solution')?.focus();return;}
    const topicKey=document.querySelector('#pace-mistake-link')?.value||'';
    const entry={id:`mistake-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,subject:document.querySelector('#pace-mistake-subject')?.value||'phy',topic,topicKey,type:document.querySelector('#pace-mistake-type')?.value||'concept',solution,tags:(document.querySelector('#pace-mistake-tags')?.value||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,12),createdAt:Date.now(),repetitions:0,nextReview:Date.now()};
    S.mistakes.unshift(entry);if(topicKey){S.d[topicKey]=1;S.st[topicKey]=2;}save();document.querySelector('#pace-flow-modal')?.remove();render();renderToday();
  }
  function reviewMistake(id,rating){const m=S.mistakes.find(x=>x.id===id);if(!m)return;const steps={again:1,hard:3,good:7,easy:14};if(rating==='again')m.repetitions=0;else if(rating==='hard')m.repetitions=Math.max(0,+m.repetitions||0);else m.repetitions=Math.min(4,(+m.repetitions||0)+(rating==='easy'?2:1));m.lastReviewed=Date.now();const base=steps[rating]||1,progression=[1,3,7,14,30][Math.min(4,m.repetitions)];const days=rating==='good'||rating==='easy'?progression:base;m.nextReview=Date.now()+days*86400000;save();render();renderToday();}
  function mistakeMarkup(){
    ensureProfile();const all=S.mistakes.slice().sort((a,b)=>(+a.nextReview||0)-(+b.nextReview||0)),due=all.filter(x=>+x.nextReview<=Date.now());
    return `<section class="glass pad mt pace-mistake-notebook"><div class="pace-section-head"><div><h2>Mistake Notebook</h2><p class="mu">Corrections linked to weak topics return on a simple spaced schedule.</p></div><button class="btn pri" data-flow-new-mistake>Add mistake</button></div>${due.length?due.slice(0,8).map(m=>`<article class="pace-mistake-row"><div><b>${escText(m.topic)}</b><small>${escText((typeof SUBJ!=='undefined'?SUBJ.find(s=>s.id===m.subject)?.n:null)||m.subject)} · ${escText(({concept:'Concept gap',careless:'Careless error',time:'Time pressure',memory:'Memory gap'})[m.type]||'Mistake')} · ${escText((m.tags||[]).join(', '))}</small><p>${escText(m.solution)}</p>${m.topicKey?`<button class="btn sm" data-flow-topic="${escText(m.topicKey)}">Open syllabus topic</button>`:''}</div><div class="pace-mistake-ratings"><button class="btn sm" data-flow-rate="again" data-id="${escText(m.id)}">Again · 1d</button><button class="btn sm" data-flow-rate="hard" data-id="${escText(m.id)}">Hard · 3d</button><button class="btn sm" data-flow-rate="good" data-id="${escText(m.id)}">Good</button><button class="btn sm" data-flow-rate="easy" data-id="${escText(m.id)}">Easy</button></div></article>`).join(''):'<p class="mu">No mistake notes due today. Add a tricky question after your next paper or mock.</p>'}${all.filter(x=>+x.nextReview>Date.now()).length?`<details class="pace-mistake-upcoming"><summary>${all.filter(x=>+x.nextReview>Date.now()).length} upcoming mistake review${all.filter(x=>+x.nextReview>Date.now()).length===1?'':'s'}</summary>${all.filter(x=>+x.nextReview>Date.now()).slice(0,8).map(m=>`<p><b>${escText(m.topic)}</b> · ${new Date(+m.nextReview).toLocaleDateString()}</p>`).join('')}</details>`:''}</section>`;
  }
  function decorate(){
    ensureProfile();renderToday();
    if(document.querySelector('nav [data-v="rev"].on')&&!app.querySelector('.pace-mistake-notebook')){app.insertAdjacentHTML('beforeend',mistakeMarkup());}
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-flow-focus],[data-flow-onboard],[data-flow-skip],[data-flow-save],[data-flow-next],[data-flow-back],[data-flow-backup],[data-flow-mistakes],[data-flow-task],[data-flow-move],[data-flow-topic],[data-flow-close],[data-flow-mistake-save],[data-flow-new-mistake],[data-flow-rate]');if(!b)return;
    if(b.hasAttribute('data-flow-focus')){window.PaceEnhancements?.startFocus?.();return;}
    if(b.hasAttribute('data-flow-onboard')){onboarding();return;}
    if(b.hasAttribute('data-flow-skip')){saveProfile(true);document.querySelector('#pace-flow-modal')?.remove();return;}
    if(b.hasAttribute('data-flow-next')){setOnboardingStep(onboardingStep+1);return;}
    if(b.hasAttribute('data-flow-back')){setOnboardingStep(onboardingStep-1);return;}
    if(b.hasAttribute('data-flow-save')){saveProfile(false);document.querySelector('#pace-flow-modal')?.remove();return;}
    if(b.hasAttribute('data-flow-backup')){window.PaceEnhancements?.backup?.();return;}
    if(b.hasAttribute('data-flow-mistakes')){document.querySelector('nav [data-v="rev"]')?.click();return;}
    if(b.hasAttribute('data-flow-task')){window.PaceEnhancements?.toggleTask?.(b.dataset.flowTask);return;}
    if(b.hasAttribute('data-flow-move')){window.PaceEnhancements?.rescheduleTask?.(b.dataset.flowMove,dayOffset(1));return;}
    if(b.hasAttribute('data-flow-topic')){openTopic(b.dataset.flowTopic);return;}
    if(b.hasAttribute('data-flow-close')){document.querySelector('#pace-flow-modal')?.remove();return;}
    if(b.hasAttribute('data-flow-new-mistake')){mistakeModal();return;}
    if(b.hasAttribute('data-flow-mistake-save')){saveMistake();return;}
    if(b.hasAttribute('data-flow-rate')){reviewMistake(b.dataset.id,b.dataset.flowRate);}
  });
  document.addEventListener('submit',e=>{
    if(e.target.id==='pace-flow-task-form'){e.preventDefault();const text=document.querySelector('#pace-flow-task-text')?.value.trim();const subject=document.querySelector('#pace-flow-task-subject')?.value||'phy';if(window.PaceEnhancements?.addTask?.(text,subject,todayKey())){e.target.reset();renderToday();document.querySelector('#pace-flow-task-text')?.focus();}return;}
  });
  const originalRender=render;
  render= function(...args){const result=originalRender.apply(this,args);decorate();return result;};
  decorate();
})();
