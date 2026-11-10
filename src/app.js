import {loadRoster} from './assets.js';
import {createRound,step,Clock,UPGRADES} from './engine.js';
import {Renderer} from './renderer.js';
import {Input,DEFAULT_KEYS,ACTION_LABELS,keyLabel,keyConflicts} from './input.js';
import {AudioEngine} from './audio.js';
import {readStored,writeStored} from './storage.js';
import {mountLab} from './lab.js';
const $=s=>document.querySelector(s),app=$('#app'),dialog=$('#dialog'),dc=$('#dialog-content');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modes={duel:{name:'单人对决',sub:'1V1 · 与人机交锋',tip:'挑选对手，在六十秒内分出高下。'},versus:{name:'同屏双人',sub:'1V1 · 同键盘较量',tip:'两位玩家共用键盘，各自选择角色。'},team:{name:'组队乱斗',sub:'2V2 · 四人同台',tip:'全队倒下判负；最多两名玩家，其余由电脑控制。'},training:{name:'训练场',sub:'无限时间 · 练习招式',tip:'自由调整木桩行为、恢复与能量。'},challenge:{name:'无尽闯关',sub:'1 对 1 · 逐关强化',tip:'每关选择强化，击败不断变强的敌人。'},onslaught:{name:'无尽激战',sub:'1 对 2 · 以一敌二',tip:'基础生命与伤害翻倍，迎战两名敌人。'}};
let roster=[],assetErrors=[],mode='duel',slots=[],activeSlot=0,difficulty='normal',session=null,world=null,renderer=null,paused=false,screen='home',cleanup=null,raf=0,lastTime=0,toastTimer,modalClose=null;
const clock=new Clock(),audio=new AudioEngine();
const saved=readStored('settings',{});
const settings={volume:typeof saved.volume==='number'&&Number.isFinite(saved.volume)?Math.max(0,Math.min(1,saved.volume)):.3,reducedMotion:typeof saved.reducedMotion==='boolean'?saved.reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,keys:structuredClone(DEFAULT_KEYS)};
if(saved.keys&&['p1','p2'].every(p=>Object.keys(DEFAULT_KEYS[p]).every(a=>typeof saved.keys[p]?.[a]==='string'))){
 const candidate=Object.fromEntries(['p1','p2'].map(p=>[p,Object.fromEntries(Object.keys(DEFAULT_KEYS[p]).map(a=>[a,saved.keys[p][a]]))]));
 if(!keyConflicts(candidate).length)settings.keys=candidate;
}
audio.volume=settings.volume;
const input=new Input(settings.keys,pause,()=>audio.activate());
const coarse=()=>matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch-device',coarse());
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);}
function save(key,value){if(!writeStored(key,value))toast('浏览器无法保存数据。本次仍可使用；请检查隐私模式或存储空间。');}
function showModal(html,onClose){dc.innerHTML=html;modalClose=onClose;if(!dialog.open)dialog.showModal();dc.querySelector('[data-close]')?.addEventListener('click',()=>{closeModal();onClose?.();});}
function closeModal(){dialog.close();modalClose=null;}
dialog.addEventListener('cancel',e=>{e.preventDefault();const cb=modalClose;if(cb){closeModal();cb();}});
function leaveScreen(){cleanup?.();cleanup=null;cancelAnimationFrame(raf);input.enabled=false;input.clear();clock.reset();world=null;renderer=null;paused=false;document.body.classList.remove('in-battle');closeModal();}
function errorMarkup(){return assetErrors.length?`<details class="error-box"><summary>${assetErrors.length} 项角色素材或配置问题（无效角色已停用）</summary>${escape(assetErrors.join('\n'))}</details>`:'';}
function home(){
 leaveScreen();screen='home';session=null;
 const a=roster[0],b=roster[1]||a;
 app.innerHTML=`<section class="home-hero"><div class="hero-copy"><div class="edition">你的角色，你的主场</div><h1>DRAGON<br>FIGHT<span>龙 斗</span></h1><p>从一张角色设定，到一次漂亮的击倒。<br>现在，站上属于你的擂台。</p><button id="play" class="primary" ${!roster.length?'disabled':''}>进入对战</button><div class="hint">键盘 / 触控均可游玩 · 无需账号</div></div><div class="hero-art" aria-hidden="true"><div class="hero-kanji">龍</div><div class="hero-orbit"></div>${a?`<img class="hero-character front" src="${a.base+a.portrait}" alt=""><img class="hero-character back" src="${b.base+b.portrait}" alt="">`:''}<span class="art-caption">原创占位角色 / 可替换素材</span></div></section>
 <div class="home-bottom"><section><div class="section-line"><h2>选一种交锋方式</h2><small>准备好了就上场</small></div><div class="mode-teasers"><button class="teaser" data-mode="duel"><div class="mode-icon">1v1</div><strong>单人对决</strong><span>磨练你的第一套连招</span></button><button class="teaser" data-mode="team"><div class="mode-icon">2v2</div><strong>组队乱斗</strong><span>与搭档一起守住擂台</span></button><button class="teaser" data-mode="challenge"><div class="mode-icon">∞</div><strong>无尽挑战</strong><span>每次出发，都更进一步</span></button></div></section><section class="workshop-intro"><h2>下一个上场的，是你创造的角色。</h2><p>查看动作样板，预览 AI 素材，校准每一帧。<br>角色规范和配置模板已经为你准备好。</p><button id="home-lab" class="small ghost">打开角色实验室</button></section></div>${errorMarkup()}<footer class="footer"><span>DragonFight / 本地街机格斗</span><span>${roster.length} 位可用角色 · 6 种模式 · 所有素材本地加载</span></footer>`;
 $('#play').onclick=()=>setup('duel');$('#home-lab').onclick=lab;app.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setup(b.dataset.mode));
}
function defaults(m){
 const first=roster[0],second=roster[1]||first,third=roster[2]||first;
 if(m==='team')return [{character:first,team:0,control:'p1'},{character:third,team:0,control:'cpu'},{character:second,team:1,control:coarse()?'cpu':'p2'},{character:first,team:1,control:'cpu'}];
 if(m==='onslaught')return [{character:first,team:0,control:'p1'},{character:second,team:1,control:'cpu'},{character:third,team:1,control:'cpu'}];
 return [{character:first,team:0,control:'p1'},{character:second,team:1,control:m==='versus'&&!coarse()?'p2':'cpu'}];
}
function setup(next=mode,reset=true){
 closeModal();
 if(!roster.length){toast('没有可用角色，请先修复角色文件。');return;}
 if(screen!=='setup'){leaveScreen();screen='setup';}
 mode=next;if(reset){slots=defaults(mode);activeSlot=0;}
 const challenge=['challenge','onslaught'].includes(mode),record=Number(readStored('record.'+mode,0))||0;
 app.innerHTML=`<div class="page-heading"><div><h1>准备上场</h1><p>选择模式，再为每个位置挑选角色。</p></div><button id="back-home" class="ghost">返回菜单</button></div><div class="setup-layout"><aside class="mode-list" aria-label="游戏模式">${Object.entries(modes).map(([id,m])=>`<button class="mode-choice ${mode===id?'selected':''}" data-mode="${id}" aria-pressed="${mode===id}"><strong>${m.name}</strong><small>${m.sub}</small></button>`).join('')}</aside><section class="setup-main"><div class="setup-top"><p>${modes[mode].tip}${challenge?`<br>最高纪录：${record} 关` :''}</p><label>人机难度<select id="difficulty"><option value="easy">简单</option><option value="normal">普通</option><option value="hard">困难</option></select></label></div><div class="slot-row">${slots.map((s,i)=>`<div class="slot-card ${s.team===1?'blue':''} ${i===activeSlot?'active':''}"><div class="slot-select"><button data-slot="${i}" aria-label="选择${i+1}号位置的角色"><small>${s.team===0?'赤方':'蓝方'} / 位置 ${i+1}</small><strong>${escape(s.character.name)}</strong></button><img src="${s.character.base+s.character.portrait}" alt="${escape(s.character.name)}"></div>${challenge||mode==='training'?`<small>${s.team===0?'1P 玩家':challenge?'每关随机人机':'训练木桩'}</small>`:`<select data-control="${i}" aria-label="位置 ${i+1} 控制方式"><option value="cpu">电脑</option><option value="p1">1P 玩家</option><option value="p2" ${coarse()?'disabled':''}>2P 玩家</option></select>`}</div>`).join('')}</div><div class="section-line"><h2>角色名册</h2><small>正在为位置 ${activeSlot+1} 选人</small></div><div class="roster">${roster.map((c,i)=>`<button class="character-card" data-character="${i}" style="--character-color:${c.color}">${c.placeholder?'<span class="placeholder-tag">占位样板</span>':''}<img src="${c.base+c.portrait}" alt=""><strong>${escape(c.name)}</strong><small>${escape(c.role)} / HP ${c.stats.health}</small></button>`).join('')}</div><div class="start-row"><p>${coarse()?'手机支持一名玩家；其余位置请选择电脑。':'点击位置后选择角色。支持两人共用键盘。'}<br>${escape(slots[activeSlot].character.description)}</p><button id="start-match" class="primary">${challenge?'选择强化并出发':'开始对战'}</button></div></section></div>${errorMarkup()}`;
 $('#back-home').onclick=home;$('#difficulty').value=difficulty;$('#difficulty').onchange=e=>difficulty=e.target.value;
 app.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setup(b.dataset.mode));
 app.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{activeSlot=Number(b.dataset.slot);setup(mode,false);});
 app.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>{slots[activeSlot].character=roster[Number(b.dataset.character)];setup(mode,false);});
 app.querySelectorAll('[data-control]').forEach(s=>{s.value=slots[Number(s.dataset.control)].control;s.onchange=()=>slots[Number(s.dataset.control)].control=s.value;});
 $('#start-match').onclick=startMatch;
}
function startMatch(){
 const players=slots.filter(s=>s.control!=='cpu');if(players.length>2||new Set(players.map(s=>s.control)).size!==players.length){toast('每位玩家只能控制一个位置，最多两名玩家。');return;}
 if(coarse()&&(players.length>1||players.some(s=>s.control==='p2'))){toast('手机只支持 1P；请将其他位置设为电脑。');return;}
 if(!players.length){toast('请至少设置一名玩家。');return;}
 audio.activate();session={mode,slots:slots.map(s=>({...s})),difficulty,score:[0,0],level:1,bonuses:{},cards:[],round:1};
 if(['challenge','onslaught'].includes(mode))chooseUpgrade();else beginRound();
}
function chooseUpgrade(){
 input.enabled=false;input.clear();paused=true;
 const pool=[...UPGRADES];for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 showModal(`<div class="dialog-head"><h2>第 ${session.level} 关 · 选择强化</h2></div><p class="result-meta">强化持续到本次挑战结束，相同效果可以叠加。</p><div class="upgrade-list">${pool.slice(0,3).map(u=>`<button class="upgrade-card" data-upgrade="${u.id}"><strong>${u.name}</strong><small>${u.description}</small></button>`).join('')}</div><p class="settings-note">已获得：${session.cards.join('、')||'尚无强化'}</p><div class="dialog-actions"><button id="abandon-challenge" class="ghost">返回选人</button></div>`,()=>setup(mode));
 dc.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{const u=UPGRADES.find(u=>u.id===b.dataset.upgrade);session.bonuses[u.stat]=(session.bonuses[u.stat]||0)+u.amount;session.cards.push(u.name);closeModal();beginRound();});$('#abandon-challenge').onclick=()=>setup(mode);
}
function beginRound(){
 cleanup?.();cleanup=null;cancelAnimationFrame(raf);closeModal();screen='battle';paused=false;clock.reset();input.clear();document.body.classList.add('in-battle');
 let roundSlots=session.slots;
 if(['challenge','onslaught'].includes(session.mode))roundSlots=session.slots.map(s=>s.team===1?{...s,character:roster[Math.floor(Math.random()*roster.length)]}:s);
 world=createRound({mode:session.mode,slots:roundSlots,difficulty:session.difficulty,level:session.level,bonuses:session.bonuses});
 app.innerHTML=`<section class="round-layout"><div class="arena-bar"><h1>${modes[session.mode].name}<small>${['challenge','onslaught'].includes(session.mode)?'第 '+session.level+' 关':'第 '+session.round+' 回合'} / 落霞道场</small></h1><button id="pause-battle" class="small">暂停 / Esc</button></div>${session.mode==='training'?`<div class="training-controls"><label>木桩<select id="dummy"><option value="idle">静止</option><option value="guard">防御</option><option value="fight">战斗</option></select></label><label><input id="autoheal" type="checkbox" checked>自动恢复</label><label><input id="infinite" type="checkbox" checked>无限能量</label><label><input id="hitboxes" type="checkbox">判定框</label><button id="training-reset" class="small">重置位置</button></div>`:''}<div class="arena"><canvas id="arena-canvas" aria-label="格斗擂台。使用键盘或屏幕按钮操作角色。"></canvas><div class="hud"><div class="team-hud">${hudTeam(0)}</div><div class="timer"><span id="timer">60</span><small>${session.mode==='training'?'自由训练':session.mode==='challenge'||session.mode==='onslaught'?'第 '+session.level+' 关':'三局两胜'}</small><div class="score">${session.score[0]}:${session.score[1]}</div></div><div class="team-hud">${hudTeam(1)}</div></div><div class="touch-controls" aria-label="触屏手柄"><div class="stick" aria-label="移动摇杆，上推跳跃"><span class="stick-knob"></span></div><div class="touch-buttons">${[['skill1','技一'],['skill2','技二'],['skill3','技三'],['ultimate','大招'],['guard','防御'],['dodge','后撤'],['light','轻击'],['heavy','重击']].map(([a,n])=>`<button class="touch-key" data-action="${a}" aria-label="${n}">${n}</button>`).join('')}</div></div></div><div class="battle-help"><span id="key-help"></span><span>靠近出拳 · 满气释放大招</span></div></section>`;
 renderer=new Renderer($('#arena-canvas'));input.attachTouch($('.touch-controls'),()=>audio.activate());$('#pause-battle').onclick=()=>pause();
 $('#key-help').textContent=`${keyLabel(settings.keys.p1.left)} / ${keyLabel(settings.keys.p1.right)} 移动　${keyLabel(settings.keys.p1.jump)} 跳跃　${keyLabel(settings.keys.p1.guard)} 防御　${keyLabel(settings.keys.p1.dodge)} 后撤　${keyLabel(settings.keys.p1.light)} / ${keyLabel(settings.keys.p1.heavy)} 攻击　${keyLabel(settings.keys.p1.skill1)} / ${keyLabel(settings.keys.p1.skill2)} / ${keyLabel(settings.keys.p1.skill3)} 技能　${keyLabel(settings.keys.p1.ultimate)} 大招`;
 if(session.mode==='training'){
  $('#dummy').onchange=e=>world.training.dummy=e.target.value;$('#autoheal').onchange=e=>world.training.autoHeal=e.target.checked;$('#infinite').onchange=e=>world.training.infiniteEnergy=e.target.checked;$('#hitboxes').onchange=e=>world.training.hitboxes=e.target.checked;$('#training-reset').onclick=beginRound;
 }
 input.enabled=true;lastTime=performance.now();renderer.draw(world,settings);updateHUD();
 if(['challenge','onslaught'].includes(session.mode)){
  paused=true;input.enabled=false;const foes=world.fighters.filter(f=>f.team===1);
  showModal(`<div class="dialog-head"><h2>第 ${session.level} 关</h2></div><p>本关对手：${foes.map(f=>escape(f.def.name)).join('、')}</p><p class="result-meta">敌人生命 +${((session.level-1)*5).toFixed(0)}% / 伤害 +${((session.level-1)*3).toFixed(0)}%</p><div class="dialog-actions"><button id="enter-stage" class="primary">迎战</button><button id="stage-exit">返回选人</button></div>`,()=>setup(mode));
  $('#enter-stage').onclick=resume;$('#stage-exit').onclick=()=>setup(mode);
 }
 raf=requestAnimationFrame(loop);
}
function hudTeam(team){return world.fighters.filter(f=>f.team===team).map(f=>`<div class="fighter-hud ${team===1?'blue':''}"><div class="name"><span>${escape(f.def.name)} / ${f.control.toUpperCase()}</span><span id="hp-text-${f.id}"></span></div><div class="hp-track"><div class="hp-fill" id="hp-${f.id}"></div></div><div class="energy-track"><div class="energy-fill" id="energy-${f.id}"></div></div></div>`).join('');}
function updateHUD(){for(const f of world.fighters){$('#hp-'+f.id).style.width=Math.max(0,f.hp/f.maxHp*100)+'%';$('#energy-'+f.id).style.width=f.energy+'%';$('#hp-text-'+f.id).textContent=Math.ceil(f.hp)+(f.shield?' +'+Math.ceil(f.shield):'');}$('#timer').textContent=world.mode==='training'?'∞':Math.ceil(world.remaining/60);}
function loop(time){
 if(screen!=='battle'||!world)return;
 const dt=(time-lastTime)/1000;lastTime=time;
 if(!paused){clock.advance(dt,()=>{if(world.status==='playing'){step(world,input.read());for(const e of world.events)if(['hit','block','roundEnd'].includes(e.type))audio.play(e.type);}});}
 renderer.draw(world,settings);updateHUD();
 if(world.errors.length){toast(world.errors.join('\n'));world.errors=[];}
 if(world.status==='over'&&!paused){paused=true;input.enabled=false;input.clear();roundResult();}
 raf=requestAnimationFrame(loop);
}
function resume(){closeModal();paused=false;input.enabled=true;input.clear();clock.reset();lastTime=performance.now();audio.activate();}
function pause(force=false){
 if(screen!=='battle'||!world||world.status!=='playing')return;
 if(paused){if(!force&&dialog.open&&$('#resume-game'))resume();return;}
 paused=true;input.enabled=false;input.clear();clock.reset();
 showPause();
}
function showPause(){showModal(`<div class="dialog-head"><h2>暂歇片刻</h2></div><p class="result-meta">擂台会等你回来。</p><div class="dialog-actions"><button id="resume-game" class="primary">继续对战</button><button id="pause-settings">设置</button><button id="restart-round">重开本回合</button><button id="quit-game" class="ghost">返回选人</button></div>`,resume);$('#resume-game').onclick=resume;$('#pause-settings').onclick=openSettings;$('#restart-round').onclick=beginRound;$('#quit-game').onclick=()=>setup(mode);}
function roundResult(){
 const win=world.winner,challenge=['challenge','onslaught'].includes(session.mode);
 if(challenge){
  if(win===0){const best=Math.max(session.level,Number(readStored('record.'+session.mode,0))||0);save('record.'+session.mode,best);showModal(`<div class="result-dialog"><p class="result-meta">第 ${session.level} 关</p><h2 class="overlay-title">破关成功</h2><p>你的下一场交锋，正在前方。</p><div class="dialog-actions"><button id="next-stage" class="primary">继续挑战</button><button id="result-exit">返回选人</button></div></div>`,()=>setup(mode));$('#next-stage').onclick=()=>{session.level++;chooseUpgrade();};}
  else if(win==='draw'){showModal(`<div class="result-dialog"><h2 class="overlay-title">势均力敌</h2><p>本关平局，保留强化重新挑战。</p><div class="dialog-actions"><button id="retry-stage" class="primary">重开本关</button><button id="result-exit">返回选人</button></div></div>`,()=>setup(mode));$('#retry-stage').onclick=beginRound;}
  else {showModal(`<div class="result-dialog"><h2 class="overlay-title">挑战结束</h2><p>本次通关 ${session.level-1} 关</p><p class="result-meta">最高纪录：${Number(readStored('record.'+session.mode,0))||0} 关</p><div class="dialog-actions"><button id="new-challenge" class="primary">重新挑战</button><button id="result-exit">返回选人</button></div></div>`,()=>setup(mode));$('#new-challenge').onclick=startMatch;}
 }else{
  if(win!=='draw')session.score[win]++;
  const complete=session.score.some(n=>n>=2),label=win==='draw'?'势均力敌':(win===0?'赤方':'蓝方')+(complete?'获胜':'拿下一回合');
  showModal(`<div class="result-dialog"><p class="result-meta">${complete?'比赛结束':'回合结束'}</p><h2 class="overlay-title">${label}</h2><div class="result-score">${session.score[0]} : ${session.score[1]}</div><p class="result-meta">${win==='draw'?'平局不计分，重新进行本回合。':complete?'每一次交锋，都是新的开始。':'先赢两回合的一方取得胜利。'}</p><div class="dialog-actions"><button id="continue-match" class="primary">${complete?'再战一场':win==='draw'?'重开本回合':'下一回合'}</button><button id="result-exit">返回选人</button></div></div>`,()=>setup(mode));
  $('#continue-match').onclick=()=>{if(complete){session.score=[0,0];session.round=1;}else if(win!=='draw')session.round++;beginRound();};
 }
 $('#result-exit').onclick=()=>setup(mode);
}
function openSettings(){
 if(screen==='battle'&&!paused)pause(true);
 const returnToBattle=screen==='battle',draft=structuredClone(settings.keys);
 showModal(`<div class="dialog-head"><h2>设置</h2><button data-close class="small" aria-label="关闭设置">关闭</button></div><div class="settings-row"><label for="volume">音效音量</label><input id="volume" type="range" min="0" max="100" value="${settings.volume*100}" aria-label="音效音量"></div><div class="settings-row"><label><input id="reduced" type="checkbox" ${settings.reducedMotion?'checked':''}>减少震屏</label></div><h3>键位设置</h3><p class="settings-note">点击键位后按新按键。Esc 用于取消录入；空格始终可供 1P 跳跃。</p><div class="keymap">${Object.entries(ACTION_LABELS).map(([a,name])=>['p1','p2'].map(p=>`<div class="key-row"><span>${p.toUpperCase()} ${name}</span><button data-key="${p}.${a}">${keyLabel(draft[p][a])}</button></div>`).join('')).join('')}</div><p id="key-errors" class="error-box" hidden></p><div class="dialog-actions"><button id="save-settings" class="primary">保存设置</button><button id="reset-keys">恢复默认键位</button></div>`,()=>{removeCapture();if(returnToBattle)showPause();});
 let capture=null;
 function removeCapture(){if(capture){window.removeEventListener('keydown',capture,true);capture=null;}}
 const refresh=()=>{dc.querySelectorAll('[data-key]').forEach(b=>{const [p,a]=b.dataset.key.split('.');b.textContent=keyLabel(draft[p][a]);});const conflicts=keyConflicts(draft);$('#key-errors').hidden=!conflicts.length;$('#key-errors').textContent=conflicts.join('\n');$('#save-settings').disabled=conflicts.length>0;};
 dc.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{removeCapture();refresh();b.textContent='请按键…';capture=e=>{e.preventDefault();e.stopImmediatePropagation();removeCapture();if(e.code!=='Escape'){const [p,a]=b.dataset.key.split('.');draft[p][a]=e.code;}refresh();};window.addEventListener('keydown',capture,true);});
 $('#reset-keys').onclick=()=>{removeCapture();Object.assign(draft,structuredClone(DEFAULT_KEYS));refresh();};
 $('#save-settings').onclick=()=>{removeCapture();settings.keys=draft;settings.volume=Number($('#volume').value)/100;settings.reducedMotion=$('#reduced').checked;input.keys=draft;audio.volume=settings.volume;save('settings',settings);closeModal();toast('设置已保存');if(returnToBattle)showPause();};
}
function lab(){if(!roster.length){toast('请先修复角色配置，至少需要一个有效样板。');return;}leaveScreen();screen='lab';cleanup=mountLab(app,roster,toast,home);}
$('#brand').onclick=home;$('#nav-lab').onclick=lab;$('#nav-settings').onclick=openSettings;$('#rotate-back').onclick=()=>setup(mode);
matchMedia('(orientation: portrait)').addEventListener('change',e=>{if(coarse()&&e.matches)pause(true);});
try{const loaded=await loadRoster();roster=loaded.characters;assetErrors=loaded.errors;home();}catch(e){app.innerHTML=`<div class="empty"><h1>擂台暂时无法打开</h1><p>${escape(e.message)}</p><p>请用 start.bat 启动，再访问本地 HTTP 地址。</p><button id="reload-app">重新加载</button></div>`;$('#reload-app').onclick=()=>location.reload();}
