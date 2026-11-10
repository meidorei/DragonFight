// Original, deliberately simple chibi stand-ins. No image libraries or downloaded art.
import {mkdir,writeFile,access} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {ACTIONS,ATTACKS} from '../src/schema.js';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(b){let c=0xffffffff;for(const v of b)c=crcTable[(c^v)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(t,b){const type=Buffer.from(t),o=Buffer.alloc(b.length+12);o.writeUInt32BE(b.length);type.copy(o,4);b.copy(o,8);o.writeUInt32BE(crc(Buffer.concat([type,b])),8+b.length);return o;}
function png(w,h,pixels){const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;const raw=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++)pixels.copy(raw,y*(w*4+1)+1,y*w*4,(y+1)*w*4);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
const rgb=s=>s.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
function sheet(color,kind,action,frames){
 const w=256*frames,h=256,p=Buffer.alloc(w*h*4),ink=[28,30,55],cream=[255,221,187],white=[255,249,235],accent=rgb(color);
 for(let f=0;f<frames;f++){
  const phase=f/frames*Math.PI*2;let ox=0,oy=0,angle=0;
  if(action==='idle')oy=Math.round(Math.sin(phase)*2);
  if(action==='walk')oy=-Math.round(Math.abs(Math.sin(phase))*4);
  if(['jump','air'].includes(action))oy=-14;
  if(['knockdown','ko'].includes(action)){angle=-Math.PI/2;ox=55;oy=-45;}
  if(action==='getup'){const down=1-f/Math.max(1,frames-1);angle=-down*Math.PI/2;ox=55*down;oy=-45*down;}
  if(action==='dodge'){ox=-f*5;angle=-.18;}
  const point=(x,y)=>{const dx=x-128,dy=y-228;return [Math.round(128+dx*Math.cos(angle)-dy*Math.sin(angle)+ox),Math.round(228+dx*Math.sin(angle)+dy*Math.cos(angle)+oy)];};
  const dot=(x,y,c)=>{[x,y]=point(x,y);if(x<0||x>=256||y<0||y>=256)return;const i=(y*w+f*256+x)*4;p[i]=c[0];p[i+1]=c[1];p[i+2]=c[2];p[i+3]=255;};
  const ellipse=(cx,cy,rx,ry,c)=>{for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)dot(x,y,c);};
  const line=(x1,y1,x2,y2,r,c)=>{const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1),1);for(let i=0;i<=n;i++)ellipse(x1+(x2-x1)*i/n,y1+(y2-y1)*i/n,r,r,c);};
  const limb=(x1,y1,x2,y2,r,c)=>{line(x1,y1,x2,y2,r+3,ink);line(x1,y1,x2,y2,r,c);};
  const stride=action==='walk'?Math.sin(phase)*15:0;
  limb(111,194,105+stride,224,10,ink);limb(140,194,148-stride,224,10,ink);
  ellipse(106+stride,227,17,6,ink);ellipse(151-stride,227,17,6,ink);
  ellipse(127,172,kind===2?43:32,39,ink);ellipse(127,170,kind===2?39:28,35,accent);
  line(105,181,149,181,4,white);ellipse(135,161,7,7,white);
  const striking=ATTACKS.includes(action),extension=striking?Math.sin(Math.PI*f/Math.max(1,frames-1))*44:0;
  if(action==='guard'){limb(151,150,168,126,11,accent);ellipse(173,121,15,21,ink);ellipse(173,121,11,17,accent);}
  else {limb(149,151,166+extension,163-(action==='ultimate'?extension:0),10,accent);ellipse(171+extension,161-(action==='ultimate'?extension:0),13,13,ink);ellipse(171+extension,160-(action==='ultimate'?extension:0),10,10,white);}
  limb(103,152,91-stride/3,179,9,accent);ellipse(89-stride/3,180,11,11,white);
  ellipse(127,100,49,49,ink);ellipse(129,101,44,43,cream);
  ellipse(119,72,44,24,ink);ellipse(95,92,15,27,ink);
  ellipse(116,68,38,19,kind===1?[221,227,244]:kind===2?[91,76,108]:[63,48,67]);
  line(85,83,164,81,5,accent);
  if(kind===0){limb(88,79,76,55,6,accent);limb(88,79,63,81,5,accent);}
  if(kind===1){ellipse(88,91,12,14,ink);ellipse(88,91,8,10,accent);line(88,81,99,49,3,ink);}
  if(kind===2){ellipse(124,70,36,21,accent);line(125,54,125,79,4,white);}
  ellipse(145,104,5,10,ink);ellipse(149,100,2,3,white);line(158,123,170,121,2,ink);
  ellipse(161,114,7,3,[247,159,153]);
  if(action==='hurt')line(140,99,151,108,3,cream);
  if(action==='victory')limb(104,150,83,107-f*3,9,accent);
 }
 return png(w,h,p);
}
export function definition(id,name,role,color,kind=0){
 const counts={idle:4,walk:6,jump:3,guard:2,dodge:3,hurt:2,knockdown:3,getup:3,ko:3,victory:4,light:4,heavy:5,air:4,skill1:6,skill2:6,skill3:6,ultimate:8};
 const animations=Object.fromEntries(ACTIONS.map(a=>[a,{src:`${a}.png`,frameWidth:256,frameHeight:256,frames:counts[a],fps:['idle','guard'].includes(a)?6:12,loop:['idle','walk','guard'].includes(a),anchor:[128,232]}]));
 const melee=(range=95)=>({type:'melee',at:0,range,height:125});
 const move=(name,animation,startup,active,recovery,damage,cost,effects,extra={})=>{
  const n=counts[animation],front=n>=6?2:1,activeEnd=n>=6?n-3:n-2;
  const seq=(from,to)=>Array.from({length:to-from+1},(_,i)=>from+i);
  return {name,animation,startup,active,recovery,damage,cost,effects,knockback:220,stun:16,cooldown:0,phases:{startup:seq(0,front-1),active:seq(front,activeEnd),recovery:seq(activeEnd+1,n-1)},...extra};
 };
 const moves={
  light:move('探锋','light',6,4,12,45,0,[melee(86)]),
  heavy:move('破阵','heavy',15,6,23,95,0,[melee(110)],{knockback:370,stun:25,knockdown:true}),
  air:move('掠空','air',7,7,14,60,0,[melee(98)]),
  skill1:move(kind===1?'星屑弹':'踏风击','skill1',12,7,22,80,15,kind===1?[{type:'projectile',at:0,range:24,height:40,speed:510,duration:90}]:[{type:'dash',at:0,speed:650},melee(120)],{cooldown:65}),
  skill2:move(kind===2?'磐石壁':'守心','skill2',8,4,20,0,20,[{type:'shield',at:0,amount:kind===2?190:120,duration:240}],{cooldown:300}),
  skill3:move('燃志','skill3',12,4,24,0,25,[{type:'buff',at:0,multiplier:1.4,duration:300}],{cooldown:360}),
  ultimate:move(kind===1?'星河坠落':kind===2?'山岳震':'龙焰破','ultimate',28,12,34,260,100,[{type:'area',at:0,range:kind===1?370:260,height:240}],{knockdown:true,knockback:600,stun:40,cooldown:120})
 };
 return {version:1,id,name,role,description:['近身压制，快速突进。','保持距离，用星屑牵制。','重装防护，蓄势反击。'][kind],color,portrait:'portrait.png',placeholder:true,stats:{health:[1000,900,1250][kind],speed:[280,260,210][kind],jump:[650,680,580][kind]},hurtbox:{width:54,height:122},animations,moves};
}
async function create(dir,c,kind){await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'character.json'),JSON.stringify(c,null,2)+'\n');for(const a of ACTIONS)await writeFile(path.join(dir,`${a}.png`),sheet(c.color,kind,a,c.animations[a].frames));await writeFile(path.join(dir,'portrait.png'),sheet(c.color,kind,'idle',1));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const target=path.join(root,'characters');
 if(!process.argv.includes('--force')){try{await access(path.join(target,'manifest.json'));console.error('已有角色文件；为防止覆盖，已停止。只在确认重建占位素材时使用 --force。');process.exit(1);}catch{}}
 const entries=[['ember','赤练','近战', '#f36c66',0],['nova','星遥','远程','#74baf5',1],['bastion','岩卫','重装','#e6bd70',2]];
 for(const [id,name,role,color,kind] of entries)await create(path.join(target,id),definition(id,name,role,color,kind),kind);
 await writeFile(path.join(target,'manifest.json'),JSON.stringify({version:1,characters:entries.map(e=>`${e[0]}/character.json`)},null,2)+'\n');
 await create(path.join(root,'templates','character'),definition('your-hero','新角色','近战','#ba9bfa'),0);
 console.log('已生成 3 个原创占位角色和完整角色模板（透明 PNG）。');
}
