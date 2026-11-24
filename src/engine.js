import {skillPlugins} from './plugins/registry.js';
export const WIDTH=1200, FLOOR=510, STEP=1/60;
export const DIFFICULTY={easy:{reaction:30,chance:.35},normal:{reaction:17,chance:.62},hard:{reaction:8,chance:.87}};
export const UPGRADES=[
 {id:'vital',name:'龙鳞',description:'最大生命 +15%',stat:'health',amount:.15},
 {id:'power',name:'烈焰',description:'基础伤害 +10%',stat:'damage',amount:.10},
 {id:'swift',name:'追风',description:'移动速度 +8%',stat:'speed',amount:.08},
 {id:'energy',name:'蓄势',description:'每关初始能量 +20',stat:'energy',amount:20},
 {id:'guard',name:'铁壁',description:'每关初始护盾 +100',stat:'shield',amount:100},
];
export function random(seed=12345){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
export function challengeModifiers(mode,level=1,bonuses={}){
 return {player:{health:(mode==='onslaught'?2:1)*(1+(bonuses.health||0)),damage:(mode==='onslaught'?2:1)*(1+(bonuses.damage||0)),speed:1+(bonuses.speed||0),energy:Math.min(100,bonuses.energy||0),shield:bonuses.shield||0},enemy:{health:1+.05*(level-1),damage:1+.03*(level-1),speed:1,energy:0,shield:0}};
}
export function createRound({mode='duel',slots,difficulty='normal',level=1,bonuses={},training={},seed=Date.now()}={}){
 const challenge=['challenge','onslaught'].includes(mode),mods=challengeModifiers(mode,level,bonuses);
 const w={mode,difficulty,level,frame:0,remaining:3600,status:'playing',winner:null,hitstop:0,shake:0,events:[],projectiles:[],visuals:[],errors:[],rng:random(seed),training:{dummy:'idle',autoHeal:true,infiniteEnergy:true,...training},debug:null,fighters:[]};
 const counts=[slots.filter(s=>s.team===0).length,slots.filter(s=>s.team===1).length],seen=[0,0];
 w.fighters=slots.map((s,i)=>{
  const m=challenge?(s.team===0?mods.player:mods.enemy):{health:1,damage:1,speed:1,energy:0,shield:0};
  const at=seen[s.team]++;
  return {id:i,def:s.character,team:s.team,control:s.control,x:s.team===0?260-at*135:940+at*135,y:0,vx:0,vy:0,facing:s.team===0?1:-1,hp:s.character.stats.health*m.health,maxHp:s.character.stats.health*m.health,damage:m.damage,speed:s.character.stats.speed*m.speed,energy:m.energy,shield:m.shield,shieldTime:m.shield?999999:0,buff:1,buffTime:0,state:'idle',stateAge:0,stun:0,invincible:0,dodgeCooldown:0,attack:null,cooldowns:{},lastDamage:-999,aiIntent:{},nextThink:0,attackSerial:0};
 });return w;
}
export function setDebugHitboxes(w, enabled){
  w.debug=enabled?(w.debug??{hitboxes:[]}):null;
}
export function setState(f,s){if(f.state!==s){f.state=s;f.stateAge=0;}}
export function attackStage(a){return a.t<a.move.startup?'startup':a.t<a.move.startup+a.move.active?'active':'recovery';}
export function attackFrame(a,frames){
 const m=a.move,phase=attackStage(a),indices=m.phases?.[phase];
 if(indices){const offset=phase==='startup'?0:phase==='active'?m.startup:m.startup+m.active;return indices[Math.min(indices.length-1,Math.floor((a.t-offset)/Math.max(1,m[phase])*indices.length))];}
 return Math.min(frames-1,Math.floor(a.t/(m.startup+m.active+m.recovery)*frames));
}
export function startAttack(w,f,key){
 if(f.hp<=0||f.attack||f.stun>0||['dodge','knockdown','getup'].includes(f.state))return false;
 if(f.y>0&&['light','heavy'].includes(key))key='air';
 if(f.y===0&&key==='air')return false;
 const m=f.def.moves[key];
 if(!m||f.energy<m.cost||(f.cooldowns[key]||0)>0)return false;
 f.energy-=m.cost;f.cooldowns[key]=m.cooldown;
 f.attack={key,move:m,t:0,serial:++f.attackSerial,hits:new Set(),fired:new Set(),plugins:new Map(),facing:f.facing};
 setState(f,m.animation);w.events.push({type:'attack',fighter:f.id,key});return true;
}
function context(w,f,target){return Object.freeze({frame:w.frame,health:f.hp,maxHealth:f.maxHp,energy:f.energy,targetId:target?.id??null,heal(n){if(Number.isFinite(n))f.hp=Math.min(f.maxHp,f.hp+Math.max(0,Math.min(500,n)));},addEnergy(n){if(Number.isFinite(n))f.energy=Math.min(100,Math.max(0,f.energy+n));},visual(kind){w.visuals.push({x:f.x,y:f.y+60,kind:['heal','spark'].includes(kind)?kind:'spark',life:25,color:f.def.color});}});}
function hook(w,f,a,name,target){for(const [id,e] of a.plugins){try{skillPlugins[id]?.[name]?.(context(w,f,target),Object.freeze({...e}));}catch(error){const msg=`${f.def.id}: plugin ${id}.${name}: ${error.message}`;if(!w.errors.includes(msg))w.errors.push(msg);a.plugins.delete(id);}}}
function finishAttack(w,f){if(f.attack)hook(w,f,f.attack,'end');f.attack=null;}
export function hit(w,source,target,move,token,hitSet,impactX=source.x){
 if(target.team===source.team||target.hp<=0||target.invincible>0||hitSet.has(token))return false;
 hitSet.add(token);
 const guarded=target.state==='guard'&&target.y===0&&Math.sign(impactX-target.x)===target.facing;
 let damage=move.damage*source.damage*source.buff*(guarded?.12:1);
 const absorbed=Math.min(target.shield,damage);target.shield-=absorbed;damage-=absorbed;
 target.hp=Math.max(0,target.hp-damage);target.lastDamage=w.frame;
 const dir=Math.sign(target.x-impactX)||source.facing;
 if(move.damage>0){
  target.energy=Math.min(100,target.energy+(guarded?5:7));source.energy=Math.min(100,source.energy+(guarded?3:6));
  target.vx=dir*move.knockback*(guarded?.28:1);
  if(!guarded){finishAttack(w,target);target.stun=move.stun;if(move.knockdown){setState(target,'knockdown');target.stun=42;target.vy=170;}else setState(target,'hurt');}
  else target.stun=7;
  w.hitstop=Math.max(w.hitstop,guarded?2:move.damage>=150?7:4);w.shake=guarded?2:move.damage>=150?12:5;
 }
 if(target.hp<=0){finishAttack(w,target);setState(target,'ko');target.stun=999999;}
 w.events.push({type:guarded?'block':'hit',damage:Math.round(damage),fighter:target.id});
 w.visuals.push({x:target.x,y:target.y+75,kind:guarded?'block':'hit',life:18,color:guarded?'#8ecaff':source.def.color});
 if(source.attack)hook(w,source,source.attack,'hit',target);
 return true;
}
function collision(f,x,y,width,height){return Math.abs(f.x-x)<(f.def.hurtbox.width+width)/2&&f.y<y+height/2&&f.y+f.def.hurtbox.height>y-height/2;}
function effects(w,f,a){
 const m=a.move,t=a.t-m.startup;
 for(const animation of m.vfx??[]){
  if(t!==animation.at)continue;
  const [forward,up]=animation.offset??[0,0];
  const duration=Math.ceil(animation.frames*60/animation.fps);
  w.visuals.push({kind:'attack-vfx',x:f.x+forward*a.facing,y:f.y+up,facing:a.facing,
   base:f.def.base,animation,duration,life:duration+1}); // The spawning step also decrements life.
 }
 for(let i=0;i<m.effects.length;i++){
  const e=m.effects[i];
  if(t<e.at||t>=m.active)continue;
  const first=!a.fired.has(i);a.fired.add(i);
  if(e.type==='melee'||e.type==='area'){
   const x=e.type==='area'?f.x:f.x+a.facing*e.range/2,width=e.type==='area'?e.range*2:e.range;
   const y=f.y+65;
   if(first&&e.type==='area'&&e.visual==='ground-impact'){
    w.visuals.push({kind:'ground-impact',x,y:0,range:e.range,life:25,color:f.def.color});
   }
   if(w.debug)w.debug.hitboxes.push({type:e.type,x,y,width,height:e.height});
   for(const target of w.fighters)if(collision(target,x,y,width,e.height))hit(w,f,target,m,`${i}:${target.id}`,a.hits);
  }else if(first){
   if(e.type==='projectile')w.projectiles.push({owner:f,x:f.x+a.facing*45,y:f.y+70,vx:a.facing*e.speed,life:e.duration,width:e.range,height:e.height,move:m,hits:new Set()});
   if(e.type==='shield'){f.shield+=e.amount;f.shieldTime=e.duration;}
   if(e.type==='buff'){f.buff=e.multiplier;f.buffTime=e.duration;}
   if(e.type==='plugin'){if(skillPlugins[e.plugin]){a.plugins.set(e.plugin,e);try{skillPlugins[e.plugin].start?.(context(w,f),Object.freeze({...e}));}catch(error){w.errors.push(`${f.def.id}: ${e.plugin}: ${error.message}`);a.plugins.delete(e.plugin);}}else w.errors.push(`未注册技能：${e.plugin}`);}
  }
  if(e.type==='dash')f.vx=a.facing*e.speed;
 }
 if(attackStage(a)==='active')hook(w,f,a,'update');
}
export function aiInput(w,f){
 if(w.mode==='training'&&f.team===1&&w.training.dummy!=='fight')return {guard:w.training.dummy==='guard'};
 if(w.frame<f.nextThink)return f.aiIntent;
 const d=DIFFICULTY[w.difficulty]||DIFFICULTY.normal;f.nextThink=w.frame+d.reaction;
 const enemies=w.fighters.filter(t=>t.team!==f.team&&t.hp>0).sort((a,b)=>Math.abs(a.x-f.x)-Math.abs(b.x-f.x));
 const t=enemies[0];if(!t)return {};
 const distance=Math.abs(t.x-f.x),dir=Math.sign(t.x-f.x),r=w.rng();
 let intent={move:distance>110?dir:0};
 if(t.attack&&distance<160&&r<d.chance)intent={guard:true};
 else if(f.energy>=100&&distance<250&&r<d.chance)intent.action='ultimate';
 else if(distance>160&&f.energy>=15&&r<d.chance)intent.action='skill1';
 else if(distance<125&&r<d.chance)intent.action=w.rng()<.65?'light':'heavy';
 else if(f.hp<f.maxHp*.5&&f.energy>=20&&r<.25)intent.action='skill2';
 if(distance>200&&w.rng()<.08)intent.jump=true;
 if(distance<90&&w.rng()<.08)intent.dodge=true;
 f.aiIntent=intent;return intent;
}
function updateFighter(w,f,input){
 f.stateAge++;
 for(const k of Object.keys(f.cooldowns))if(f.cooldowns[k]>0)f.cooldowns[k]--;
 if(f.invincible>0)f.invincible--;if(f.dodgeCooldown>0)f.dodgeCooldown--;
 if(f.shieldTime>0&&--f.shieldTime===0)f.shield=0;
 if(f.buffTime>0&&--f.buffTime===0)f.buff=1;
 if(f.hp>0){
  const target=w.fighters.filter(t=>t.team!==f.team&&t.hp>0).sort((a,b)=>Math.abs(a.x-f.x)-Math.abs(b.x-f.x))[0];
  if(target&&!f.attack&&f.state!=='dodge')f.facing=target.x>=f.x?1:-1;
  if(f.stun>0){f.stun--;if(f.stun===0&&f.state==='knockdown'){setState(f,'getup');f.stun=20;f.invincible=20;}}
  else if(f.state==='dodge'&&f.stateAge<22){}
  else if(!f.attack){
   if(input.dodge&&f.y===0&&f.dodgeCooldown===0){setState(f,'dodge');f.invincible=12;f.dodgeCooldown=48;f.vx=-f.facing*470;}
   else {
    f.vx=(input.move||0)*f.speed*(input.guard?.35:1);
    if(input.jump&&f.y===0&&!input.guard){f.vy=f.def.stats.jump;f.y=.1;}
    setState(f,f.y>0?'jump':input.guard?'guard':f.vx?'walk':'idle');
    if(input.action&&!input.guard)startAttack(w,f,input.action);
   }
  }
  if(f.attack){const a=f.attack;f.vx*=.78;effects(w,f,a);a.t++;if(f.attack===a&&a.t>=a.move.startup+a.move.active+a.move.recovery){finishAttack(w,f);setState(f,f.y>0?'jump':'idle');}}
 }
 f.x=Math.max(55,Math.min(WIDTH-55,f.x+f.vx*STEP));
 if(f.stun>0||f.hp<=0)f.vx*=.88;
 if(f.y>0||f.vy>0){f.y+=f.vy*STEP;f.vy-=1650*STEP;if(f.y<=0){f.y=0;f.vy=0;}}
}
export function adjudicate(w){
 const alive=[0,1].map(team=>w.fighters.filter(f=>f.team===team&&f.hp>0));
 if(!alive[0].length&&!alive[1].length)return 'draw';
 if(!alive[0].length)return 1;if(!alive[1].length)return 0;
 if(w.remaining<=0){const totals=alive.map(fs=>fs.reduce((n,f)=>n+f.hp/f.maxHp,0));return Math.abs(totals[0]-totals[1])<1e-8?'draw':totals[0]>totals[1]?0:1;}
 return null;
}
export function step(w,inputs={}){
 if(w.status!=='playing')return;
 w.events=[];
 if(w.hitstop>0){w.hitstop--;return;}
 if(w.debug)w.debug.hitboxes.length=0;
 w.frame++;w.shake*=.82;
 if(w.mode!=='training')w.remaining--;
 for(const f of w.fighters)updateFighter(w,f,f.control==='cpu'?aiInput(w,f):inputs[f.control]||{});
 // Soft separation stops fighters from occupying the same ground position.
 for(let i=0;i<w.fighters.length;i++)for(let j=i+1;j<w.fighters.length;j++){
  const a=w.fighters[i],b=w.fighters[j];if(a.hp<=0||b.hp<=0||Math.abs(a.y-b.y)>70)continue;
  const d=b.x-a.x,min=(a.def.hurtbox.width+b.def.hurtbox.width)*.42;
  if(Math.abs(d)<min){const push=(min-Math.abs(d))/2,dir=d>=0?1:-1;a.x=Math.max(55,Math.min(WIDTH-55,a.x-push*dir));b.x=Math.max(55,Math.min(WIDTH-55,b.x+push*dir));}
 }
 for(const p of w.projectiles){
  p.x+=p.vx*STEP;p.life--;
  if(w.debug)w.debug.hitboxes.push({type:'projectile',x:p.x,y:p.y,width:p.width,height:p.height});
  for(const t of w.fighters)if(collision(t,p.x,p.y,p.width,p.height)&&hit(w,p.owner,t,p.move,t.id,p.hits,p.x-Math.sign(p.vx)*30)){p.life=0;break;}
 }
 w.projectiles=w.projectiles.filter(p=>p.life>0&&p.x>-100&&p.x<WIDTH+100);
 for(const v of w.visuals)v.life--;w.visuals=w.visuals.filter(v=>v.life>0);
 if(w.mode==='training'){
  for(const f of w.fighters){if(w.training.infiniteEnergy)f.energy=100;if((w.training.autoHeal&&w.frame-f.lastDamage>120)||f.hp<=0){f.hp=f.maxHp;if(f.state==='ko'){f.stun=0;f.invincible=20;setState(f,'getup');}}}
 }else{
  const verdict=adjudicate(w);if(verdict!==null){w.status='over';w.winner=verdict;for(const f of w.fighters)if(f.hp>0&&f.team===verdict){finishAttack(w,f);setState(f,'victory');}w.events.push({type:'roundEnd',winner:verdict});}
 }
}
/** Fixed-step accumulator. Bounds catch-up after stalls; refresh rate does not change simulation speed. */
export class Clock {
 constructor(){this.accumulator=0;}
 advance(seconds,tick){this.accumulator+=Math.min(.25,Math.max(0,seconds));let n=0;while(this.accumulator+1e-10>=STEP){tick();this.accumulator-=STEP;n++;}return n;}
 reset(){this.accumulator=0;}
}
