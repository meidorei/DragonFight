import {images} from './assets.js';
import {ACTIONS} from './schema.js';
export const ACTION_NAMES={idle:'待机',walk:'行走',jump:'跳跃',guard:'防御',dodge:'闪避',hurt:'受击',knockdown:'倒地',getup:'起身',ko:'失败',victory:'胜利',light:'轻击',heavy:'重击',air:'空击',skill1:'技能一',skill2:'技能二',skill3:'技能三',ultimate:'大招'};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function mountLab(root,roster,toast,onBack){
 root.innerHTML=`<div class="page-heading"><div><h1>角色实验室</h1><p>对齐每一帧，让你的角色真正走上擂台。</p></div><button id="lab-back" class="ghost">返回菜单</button></div>
 <div class="lab-layout"><aside class="lab-sidebar">
 <label>样板角色<select id="lab-character">${roster.map((c,i)=>`<option value="${i}">${escape(c.name)} · ${escape(c.role)}</option>`).join('')}</select></label>
 <label>动作<select id="lab-action">${ACTIONS.map(a=>`<option value="${a}">${ACTION_NAMES[a]} / ${a}</option>`).join('')}</select></label>
 <h2>导入自己的动作</h2><p>选择一张横向精灵条，或按文件名排序的 PNG 帧序列。文件仅在浏览器中处理。</p>
 <label>PNG 素材<input id="lab-files" type="file" accept="image/png" multiple></label>
 <div class="lab-config"><label>单帧宽<input id="lab-width" type="number" min="32" max="1024" value="256"></label><label>单帧高<input id="lab-height" type="number" min="32" max="1024" value="256"></label><label>脚线 X<input id="lab-x" type="number" min="0" max="1024" value="128"></label><label>脚线 Y<input id="lab-y" type="number" min="0" max="1024" value="232"></label><label>每秒帧数<input id="lab-fps" type="number" min="1" max="60" value="12"></label><label>播放循环<input id="lab-loop" type="checkbox" checked></label></div>
 <div class="docs-links"><a href="./docs/角色制作规范.md" target="_blank">角色规范</a><a href="./docs/AI提示词.md" target="_blank">AI 提示词</a><a href="./templates/character/character.json" download>配置模板</a></div></aside>
 <section><div class="lab-stage"><canvas id="lab-canvas" width="512" height="512" aria-label="动作预览画布"></canvas></div>
 <div class="lab-toolbar"><button id="lab-play" class="small">暂停</button><button id="lab-prev" class="small" aria-label="上一帧">上一帧</button><button id="lab-next" class="small" aria-label="下一帧">下一帧</button><button id="lab-flip" class="small">朝右</button><label><input id="lab-grid" type="checkbox" checked>网格</label><label><input id="lab-box" type="checkbox" checked>判定框</label></div>
 <label>当前帧 <span id="lab-frame-label">1</span><input id="lab-scrub" aria-label="当前帧" type="range" min="0" max="3" value="0" style="width:100%"></label>
 <pre id="lab-info" class="lab-info"></pre><div class="lab-export"><button id="lab-export-png">导出横向精灵条</button><button id="lab-export-json">导出配置片段</button><button id="lab-reset" class="ghost">恢复样板</button></div><p class="settings-note">青色框表示受击区域，粉色十字表示脚底锚点。透明度检查不会自动抠图或修正动作。</p></section></div>`;
 const $=id=>root.querySelector('#'+id),canvas=$('lab-canvas'),ctx=canvas.getContext('2d');
 let def=roster[0],action='idle',imported=null,frame=0,playing=true,flip=1,raf=0,last=0,elapsed=0,alive=true,generation=0;
 const cfg=()=>({frameWidth:Number($('lab-width').value),frameHeight:Number($('lab-height').value),anchor:[Number($('lab-x').value),Number($('lab-y').value)],fps:Number($('lab-fps').value),loop:$('lab-loop').checked});
 function count(){return imported?.frames??def.animations[action].frames;}
 function configure(){const a=def.animations[action];for(const [id,v]of [['width',a.frameWidth],['height',a.frameHeight],['x',a.anchor[0]],['y',a.anchor[1]],['fps',a.fps]])$('lab-'+id).value=v;$('lab-loop').checked=a.loop;frame=0;elapsed=0;updateInfo();}
 function updateInfo(){
  const a=cfg();
  const characterLabel=def.placeholder?'样板：'+def.name+'（占位素材）':'角色：'+def.name;
  $('lab-scrub').max=count()-1;
  $('lab-info').textContent=`${imported?'本地素材':characterLabel}\n${a.frameWidth} × ${a.frameHeight} px / 帧 · ${count()} 帧 · ${a.fps} fps\n锚点 (${a.anchor.join(', ')}) · ${imported?.alpha??'透明 PNG'}\n${imported?'尺寸与帧数量检查通过。请检查轮廓、脚线和连续动作。':'选择自己的 PNG 后可导出素材与配置。'}`;
 }
 function clearImported(){if(imported)for(const im of imported.images)im.close?.();imported=null;$('lab-files').value='';}
 $('lab-character').onchange=()=>{clearImported();def=roster[Number($('lab-character').value)];configure();};
 $('lab-action').onchange=()=>{clearImported();action=$('lab-action').value;configure();};
 $('lab-back').onclick=onBack;$('lab-reset').onclick=()=>{clearImported();configure();};
 $('lab-play').onclick=()=>{playing=!playing;$('lab-play').textContent=playing?'暂停':'播放';};
 function seek(n){playing=false;$('lab-play').textContent='播放';frame=(n+count())%count();elapsed=0;}
 $('lab-prev').onclick=()=>seek(frame-1);$('lab-next').onclick=()=>seek(frame+1);$('lab-scrub').oninput=()=>seek(Number($('lab-scrub').value));$('lab-flip').onclick=()=>{flip*=-1;$('lab-flip').textContent=flip===1?'朝右':'朝左';};
 for(const id of ['width','height','x','y','fps','loop'])$('lab-'+id).onchange=()=>{
  const a=cfg();if(!Number.isInteger(a.frameWidth)||!Number.isInteger(a.frameHeight)||a.frameWidth<32||a.frameWidth>1024||a.frameHeight<32||a.frameHeight>1024||a.fps<1||a.fps>60||!a.anchor.every(Number.isFinite)||a.anchor[0]<0||a.anchor[0]>a.frameWidth||a.anchor[1]<0||a.anchor[1]>a.frameHeight){toast('尺寸、帧率或锚点不合法，已恢复样板参数。');clearImported();configure();return;}
  if(imported&&['width','height'].includes(id)){clearImported();frame=0;toast('帧尺寸已修改，请重新选择素材以检查尺寸。');}updateInfo();
 };
 $('lab-files').onchange=async()=>{
  const token=++generation,files=[...$('lab-files').files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})),a=cfg();if(!files.length)return;
  let ims=[];
  try{
   if(files.length>64||files.some(f=>f.size>16*1024*1024)||files.reduce((n,f)=>n+f.size,0)>64*1024*1024)throw new Error('最多 64 帧；单文件不超过 16MB，总计不超过 64MB。');
   for(const file of files){if(file.type!=='image/png'&&!file.name.toLowerCase().endsWith('.png'))throw new Error('只接受 PNG 图片');ims.push(await createImageBitmap(file));}
   if(!alive||token!==generation){ims.forEach(im=>im.close());return;}
   const sequence=ims.length>1,frames=sequence?ims.length:ims[0].width/a.frameWidth;
   if(!Number.isInteger(frames)||frames<1||frames>64||ims.some(im=>im.height!==a.frameHeight||im.width!==(sequence?a.frameWidth:frames*a.frameWidth)))throw new Error('图片尺寸与单帧设置不一致。精灵条必须仅有一行；序列每张必须为单帧尺寸。');
   if(frames*a.frameWidth>16384)throw new Error('导出精灵条宽度不得超过 16384 像素，请减小帧尺寸或帧数。');
   const probe=document.createElement('canvas');probe.width=ims[0].width;probe.height=ims[0].height;const p=probe.getContext('2d',{willReadFrequently:true});p.drawImage(ims[0],0,0);const data=p.getImageData(0,0,probe.width,probe.height).data;let transparent=0,visible=0;for(let i=3;i<data.length;i+=4){if(data[i]<255)transparent++;if(data[i]>0)visible++;}
   if(!visible)throw new Error('首张图片完全透明，没有可见角色。');
   clearImported();imported={images:ims,sequence,frames,alpha:transparent?'首张图片含透明像素':'警告：首张图片不含透明像素，请先抠图'};frame=0;elapsed=0;updateInfo();
  }catch(e){ims.forEach(im=>im.close());toast(e.message);}
 };
 function sourceFrame(i){const a=imported?cfg():def.animations[action];return imported?{im:imported.images[imported.sequence?i:0],x:imported.sequence?0:i*a.frameWidth,w:a.frameWidth,h:a.frameHeight}:{im:images.get(def.base+(a.files?a.files[i]:a.src)),x:a.files?0:i*a.frameWidth,w:a.frameWidth,h:a.frameHeight};}
 function buildStrip(){const a=cfg(),out=document.createElement('canvas');if(a.frameWidth*count()>16384)throw new Error('精灵条超过 16384 像素，请减少帧数或尺寸');out.width=a.frameWidth*count();out.height=a.frameHeight;const c=out.getContext('2d');for(let i=0;i<count();i++){const s=sourceFrame(i);c.drawImage(s.im,s.x,0,s.w,s.h,i*a.frameWidth,0,a.frameWidth,a.frameHeight);}return out;}
 $('lab-export-png').onclick=()=>{try{buildStrip().toBlob(blob=>{if(blob)download(blob,action+'.png');else toast('导出失败，请减小图片尺寸。');},'image/png');}catch(e){toast('导出失败：'+e.message);}};
 $('lab-export-json').onclick=()=>download(new Blob([JSON.stringify({[action]:{src:action+'.png',...cfg(),frames:count()}},null,2)],{type:'application/json'}),action+'.animation.json');
 function draw(time){if(!alive)return;const delta=last?Math.min(.1,(time-last)/1000):0;last=time;const a=cfg();if(playing){elapsed+=delta*a.fps;while(elapsed>=1){elapsed--;if(frame<count()-1)frame++;else if(a.loop)frame=0;}}
  ctx.clearRect(0,0,512,512);for(let y=0;y<512;y+=24)for(let x=0;x<512;x+=24){ctx.fillStyle=((x+y)/24)%2?'#30394c':'#293246';ctx.fillRect(x,y,24,24);}
  if($('lab-grid').checked){ctx.strokeStyle='#ffffff20';for(let x=0;x<=512;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.moveTo(0,x);ctx.lineTo(512,x);ctx.stroke();}}
  const scale=384/a.frameHeight,cx=256,cy=440;
  const s=sourceFrame(frame);ctx.save();ctx.translate(cx,cy);ctx.scale(flip,1);ctx.drawImage(s.im,s.x,0,s.w,s.h,-a.anchor[0]*scale,-a.anchor[1]*scale,a.frameWidth*scale,384);ctx.restore();
  ctx.strokeStyle='#f47c73';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(512,cy);ctx.moveTo(cx,cy-12);ctx.lineTo(cx,cy+12);ctx.stroke();
  if($('lab-box').checked){ctx.strokeStyle='#7ce7c5';ctx.strokeRect(cx-def.hurtbox.width,cy-def.hurtbox.height*2,def.hurtbox.width*2,def.hurtbox.height*2);}
  $('lab-frame-label').textContent=`${frame+1} / ${count()}`;$('lab-scrub').value=frame;raf=requestAnimationFrame(draw);
 }
 configure();raf=requestAnimationFrame(draw);return ()=>{alive=false;generation++;cancelAnimationFrame(raf);clearImported();};
}
