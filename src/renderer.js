import {images} from './assets.js';
import {WIDTH,FLOOR,attackStage,attackFrame} from './engine.js';
export function drawSprite(ctx,def,action,age,x,y,{size=192,flip=1,frame=null,alpha=1}={}){
 const a=def.animations[action]||def.animations.idle;
 let index=frame??Math.floor(age*a.fps/60);index=a.loop?index%a.frames:Math.min(a.frames-1,index);
 const im=images.get(def.base+(a.files?a.files[index]:a.src));if(!im)return;
 const scale=size/a.frameHeight;
 ctx.save();ctx.translate(x,y);ctx.scale(flip,1);ctx.globalAlpha=alpha;
 ctx.drawImage(im,a.files?0:index*a.frameWidth,0,a.frameWidth,a.frameHeight,-a.anchor[0]*scale,-a.anchor[1]*scale,a.frameWidth*scale,size);ctx.restore();
}
function polygon(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
export function drawStage(c){
 const sky=c.createLinearGradient(0,0,0,600);sky.addColorStop(0,'#141c35');sky.addColorStop(.65,'#503747');sky.addColorStop(1,'#d07b68');c.fillStyle=sky;c.fillRect(0,0,1200,675);
 c.fillStyle='#e9c8a4';c.beginPath();c.arc(895,172,81,0,Math.PI*2);c.fill();c.fillStyle='#d4a88e';c.beginPath();c.arc(865,145,13,0,7);c.fill();
 polygon(c,[[0,320],[80,260],[154,284],[284,171],[420,312],[580,236],[755,350],[960,263],[1200,301],[1200,510],[0,510]],'#343144');
 polygon(c,[[0,380],[175,320],[304,370],[455,294],[670,407],[815,330],[1050,375],[1200,295],[1200,520],[0,520]],'#25293a');
 for(const [x,s]of [[90,.8],[1035,1.1]]){c.save();c.translate(x,248);c.scale(s,s);c.fillStyle='#1a2333';c.fillRect(-42,55,13,190);c.fillRect(55,55,13,190);c.fillRect(-68,40,165,17);polygon(c,[[-96,0],[-65,20],[88,20],[120,0],[99,39],[-74,39]],'#192231');c.fillRect(-80,72,180,13);c.restore();}
 c.fillStyle='#232737';c.fillRect(0,438,1200,10);for(let x=0;x<1200;x+=72)c.fillRect(x,445,8,65);
 c.fillStyle='#383640';c.fillRect(0,505,1200,170);c.fillStyle='#cfac8b';c.fillRect(0,505,1200,5);c.fillStyle='#1c2333';c.fillRect(0,510,1200,14);
 c.strokeStyle='#62535a';c.lineWidth=1;for(let x=-600;x<1800;x+=160){c.beginPath();c.moveTo(600+(x-600)*.6,524);c.lineTo(x,675);c.stroke();}for(const y of [552,602,670]){c.beginPath();c.moveTo(0,y);c.lineTo(1200,y);c.stroke();}
 c.save();c.globalAlpha=.06;c.font='bold 230px serif';c.textAlign='center';c.fillStyle='#f8dbb5';c.fillText('龍',600,420);c.restore();
}
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.stage=document.createElement('canvas');this.stage.width=1200;this.stage.height=675;drawStage(this.stage.getContext('2d'));canvas.width=1200;canvas.height=675;}
 draw(w,settings={}){
  const c=this.ctx;c.clearRect(0,0,1200,675);c.save();
  if(!settings.reducedMotion&&w.shake>1)c.translate(Math.sin(w.frame*2.7)*w.shake,Math.cos(w.frame*3.2)*w.shake*.45);
  c.drawImage(this.stage,0,0);
  for(const f of [...w.fighters].sort((a,b)=>b.y-a.y)){
   c.save();c.globalAlpha=f.hp>0?.27:.1;c.fillStyle='#030b19';c.beginPath();c.ellipse(f.x,FLOOR+5,49,11,0,0,7);c.fill();c.restore();
   if(f.buffTime>0){c.strokeStyle=f.def.color;c.lineWidth=2;c.beginPath();c.ellipse(f.x,FLOOR-f.y-65,54,80,0,0,7);c.stroke();}
   const action=f.hp<=0?'ko':f.state;
   let frame=null;
   if(f.attack)frame=attackFrame(f.attack,f.def.animations[action].frames);
   drawSprite(c,f.def,action,f.stateAge,f.x,FLOOR-f.y,{flip:f.facing,frame,alpha:f.invincible>0&&w.frame%6<3?.45:1});
   if(f.shield>0){c.strokeStyle='#9dddf0';c.lineWidth=3;c.globalAlpha=.6;c.beginPath();c.ellipse(f.x,FLOOR-f.y-68,55,78,0,0,7);c.stroke();c.globalAlpha=1;}
   c.fillStyle=f.team===0?'#ff8179':'#90c9ff';c.beginPath();c.moveTo(f.x,FLOOR-f.y-188);c.lineTo(f.x-6,FLOOR-f.y-198);c.lineTo(f.x+6,FLOOR-f.y-198);c.fill();
   c.font='bold 12px sans-serif';c.textAlign='center';c.fillText(f.control==='cpu'?'CPU':f.control.toUpperCase(),f.x,FLOOR-f.y-206);
   if(w.training.hitboxes){
    c.strokeStyle='#7cf4cc';c.lineWidth=2;c.strokeRect(f.x-f.def.hurtbox.width/2,FLOOR-f.y-f.def.hurtbox.height,f.def.hurtbox.width,f.def.hurtbox.height);
    if(f.attack&&attackStage(f.attack)==='active')for(const e of f.attack.move.effects)if(e.type==='melee'||e.type==='area'){c.fillStyle='#ff617650';const width=e.type==='area'?e.range*2:e.range,x=e.type==='area'?f.x-e.range:f.facing===1?f.x:f.x-e.range;c.fillRect(x,FLOOR-f.y-65-e.height/2,width,e.height);}
   }
  }
  for(const p of w.projectiles){c.fillStyle=p.owner.def.color;c.shadowColor=p.owner.def.color;c.shadowBlur=18;c.beginPath();c.ellipse(p.x,FLOOR-p.y,p.width/2,p.height/2,0,0,7);c.fill();c.shadowBlur=0;c.fillStyle='#fff4d7';c.beginPath();c.arc(p.x,FLOOR-p.y,6,0,7);c.fill();}
  for(const v of w.visuals){c.save();c.translate(v.x,FLOOR-v.y);c.strokeStyle=v.color;c.lineWidth=3;c.globalAlpha=v.life/25;const r=(25-v.life)*2+8;if(v.kind==='hit'||v.kind==='spark'){for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.moveTo(Math.cos(a)*r*.4,Math.sin(a)*r*.4);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);c.stroke();}}else{c.beginPath();c.arc(0,0,r,0,7);c.stroke();}c.restore();}
  c.restore();
 }
}
