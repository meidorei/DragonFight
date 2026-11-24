/** @typedef {{src?:string,files?:string[],frameWidth:number,frameHeight:number,frames:number,fps:number,anchor:[number,number]}} SpriteFrames */
/** @typedef {SpriteFrames & {at:number,offset?:[number,number],size?:number}} AttackVfx */
/** @typedef {{startup:number,active:number,recovery:number,damage:number,knockback:number,cost:number,cooldown:number,effects:Object[],animation:string,vfx?:AttackVfx[]}} MoveDefinition */
/** @typedef {{version:1,id:string,name:string,role:string,description:string,color:string,portrait:string,stats:{health:number,speed:number,jump:number},hurtbox:{width:number,height:number},animations:Object,moves:Record<string,MoveDefinition>}} CharacterDefinition */
export const ACTIONS = ['idle','walk','jump','guard','dodge','hurt','knockdown','getup','ko','victory','light','heavy','air','skill1','skill2','skill3','ultimate'];
export const ATTACKS = ['light','heavy','air','skill1','skill2','skill3','ultimate'];
export const EFFECTS = ['melee','projectile','dash','area','shield','buff','plugin'];
export const safePath = p => typeof p === 'string' && p.length > 0 && !p.includes('..') && !p.includes('\\') && !/^(\/|[a-z]+:)/i.test(p) && /^[a-zA-Z0-9_./-]+$/.test(p);
/** Enumerate PNG animations after the character configuration has passed validation. */
export function* spriteAnimationEntries(c) {
  for(const [key,animation] of Object.entries(c.animations))yield [`animations.${key}`,animation];
  for(const key of ATTACKS){
    for(const [index,animation] of (c.moves[key].vfx??[]).entries())yield [`moves.${key}.vfx[${index}]`,animation];
  }
}
/** Pure validator shared by the browser, CLI and tests. Never evaluates character data. */
export function validateCharacter(c, file = 'character.json') {
  const errors=[];
  const err=(p,msg)=>errors.push(`${file}: ${p} ${msg}`);
  const obj=v=>v && typeof v==='object' && !Array.isArray(v);
  const num=(v,p,min,max,int=false)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(int&&!Number.isInteger(v)))err(p,`必须是 ${min}～${max} 的${int?'整数':'数值'}`);};
  function validateSprite(v,p){
    num(v.frameWidth,p+'.frameWidth',32,1024,true);num(v.frameHeight,p+'.frameHeight',32,1024,true);
    num(v.frames,p+'.frames',1,64,true);num(v.fps,p+'.fps',1,60);
    if(!Array.isArray(v.anchor)||v.anchor.length!==2)err(p+'.anchor','需为 [x,y]');
    else {num(v.anchor[0],p+'.anchor[0]',0,v.frameWidth);num(v.anchor[1],p+'.anchor[1]',0,v.frameHeight);}
    if(Array.isArray(v.files)){
      if(v.files.length!==v.frames)err(p+'.files','数量必须等于 frames');
      v.files.forEach((s,i)=>{if(!safePath(s)||!s.endsWith('.png'))err(`${p}.files[${i}]`,'需为 PNG 相对路径');});
    } else if(!safePath(v.src)||!v.src.endsWith('.png'))err(p+'.src','需为横向 PNG 精灵条相对路径');
  }
  if(!obj(c)) return [`${file}: 根节点必须是对象`];
  if(c.version!==1)err('version','仅支持 1');
  if(!/^[a-z][a-z0-9-]{1,39}$/.test(c.id??''))err('id','需为 2～40 位小写字母、数字或连字符');
  for(const k of ['name','role','description'])if(typeof c[k]!=='string'||!c[k].trim()||c[k].length>200)err(k,'需为 1～200 字符的文本');
  if(!/^#[0-9a-f]{6}$/i.test(c.color??''))err('color','需为 #RRGGBB');
  if(!safePath(c.portrait)||!c.portrait.endsWith('.png'))err('portrait','需为角色目录内的 PNG 相对路径');
  for(const [k,min,max] of [['health',100,10000],['speed',60,700],['jump',200,1000]])num(c.stats?.[k],`stats.${k}`,min,max);
  num(c.hurtbox?.width,'hurtbox.width',20,180);num(c.hurtbox?.height,'hurtbox.height',40,250);
  for(const a of ACTIONS){
    const v=c.animations?.[a],p=`animations.${a}`;
    if(!obj(v)){err(p,'缺少动作');continue;}
    validateSprite(v,p);
    if(typeof v.loop!=='boolean')err(p+'.loop','需为布尔值');
  }
  for(const a of ATTACKS){
    const m=c.moves?.[a],p=`moves.${a}`;
    if(!obj(m)){err(p,'缺少招式');continue;}
    if(typeof m.name!=='string'||!m.name.trim())err(p+'.name','需为招式名称');
    if(!ACTIONS.includes(m.animation)||!c.animations?.[m.animation])err(p+'.animation','引用了不存在的动作');
    if(m.knockdown!==undefined&&typeof m.knockdown!=='boolean')err(p+'.knockdown','需为布尔值');
    if(m.phases!==undefined){
      for(const phase of ['startup','active','recovery']){
        const indices=m.phases?.[phase];
        if(!Array.isArray(indices)||!indices.length||indices.length>64)err(`${p}.phases.${phase}`,'需为 1～64 个图片帧索引');
        else indices.forEach((v,i)=>num(v,`${p}.phases.${phase}[${i}]`,0,(c.animations?.[m.animation]?.frames||1)-1,true));
      }
    }
    for(const k of ['startup','active','recovery'])num(m[k],`${p}.${k}`,k==='active'?1:0,600,true);
    for(const [k,min,max] of [['damage',0,2000],['knockback',0,1000],['cost',0,100],['cooldown',0,3600],['stun',0,180]])num(m[k],`${p}.${k}`,min,max,true);
    if(a==='ultimate'&&m.cost!==100)err(p+'.cost','大招固定消耗 100 能量');
    if(m.vfx!==undefined){
      if(!Array.isArray(m.vfx)||m.vfx.length>16)err(p+'.vfx','需为最多 16 项的特效数组');
      else m.vfx.forEach((v,i)=>{
        const q=`${p}.vfx[${i}]`;
        if(!obj(v)){err(q,'需为特效配置对象');return;}
        num(v.at,q+'.at',0,Math.max(0,m.active-1),true);
        if(v.files!==undefined&&(v.src!==undefined||!Array.isArray(v.files)))err(q+'.files','需为 PNG 文件数组，与 src 二选一');
        if(v.size!==undefined)num(v.size,q+'.size',1,1024);
        if(v.offset!==undefined){
          if(!Array.isArray(v.offset)||v.offset.length!==2)err(q+'.offset','需为 [向前,向上]');
          else v.offset.forEach((value,index)=>num(value,`${q}.offset[${index}]`,-1200,1200));
        }
        validateSprite(v,q);
      });
    }
    if(!Array.isArray(m.effects)||!m.effects.length||m.effects.length>16){err(p+'.effects','需包含 1～16 个效果');continue;}
    m.effects.forEach((e,i)=>{
      const q=`${p}.effects[${i}]`;
      if(!obj(e)||!EFFECTS.includes(e.type)){err(q+'.type','未知效果');return;}
      num(e.at,q+'.at',0,Math.max(0,m.active-1),true);
      if(['melee','projectile','area'].includes(e.type)){num(e.range,q+'.range',1,1000);num(e.height,q+'.height',1,500);}
      if(e.type==='area'&&e.visual!==undefined&&e.visual!=='ground-impact')err(q+'.visual','范围攻击特效仅支持 ground-impact');
      if(['projectile','dash'].includes(e.type))num(e.speed,q+'.speed',1,1800);
      if(['projectile','shield','buff'].includes(e.type))num(e.duration,q+'.duration',1,3600,true);
      if(e.type==='shield')num(e.amount,q+'.amount',1,2000);
      if(e.type==='buff')num(e.multiplier,q+'.multiplier',0.1,5);
      if(e.type==='plugin'&&!/^[a-z][a-z0-9-]+$/.test(e.plugin??''))err(q+'.plugin','需为已注册技能 ID');
    });
  }
  return errors;
}
