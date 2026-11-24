import {validateCharacter,safePath,spriteAnimationEntries} from './schema.js';
import {skillPlugins} from './plugins/registry.js';
export const images=new Map();
export async function loadImage(url){
 if(images.has(url))return images.get(url);
 const im=new Image();im.src=url;
 try{await im.decode();}catch{throw new Error(`图片无法加载：${url}`);}
 images.set(url,im);return im;
}
export async function loadRoster(){
 const characters=[],errors=[],ids=new Set();
 const res=await fetch('./characters/manifest.json');if(!res.ok)throw new Error('无法读取 characters/manifest.json');
 const manifest=await res.json();
 if(manifest.version!==1||!Array.isArray(manifest.characters))throw new Error('角色注册清单格式错误');
 for(const file of manifest.characters){
  try{
   if(!safePath(file))throw new Error(`非法角色路径：${file}`);
   const r=await fetch('./characters/'+file);if(!r.ok)throw new Error(`${file}: 文件未找到`);
   const c=await r.json(),issues=validateCharacter(c,file);
   if(ids.has(c.id))issues.push(`${file}: id ${c.id} 重复`);
   for(const m of Object.values(c.moves||{}))for(const e of m.effects||[])if(e.type==='plugin'&&!skillPlugins[e.plugin])issues.push(`${file}: 未注册技能 ${e.plugin}`);
   if(issues.length){errors.push(...issues);continue;}
   ids.add(c.id);c.base='./characters/'+file.slice(0,file.lastIndexOf('/')+1);
   await loadImage(c.base+c.portrait);
   for(const [field,a] of spriteAnimationEntries(c)){
    const files=a.files||[a.src];
    for(const src of files){const im=await loadImage(c.base+src);if(im.width!==a.frameWidth*(a.files?1:a.frames)||im.height!==a.frameHeight)throw new Error(`${file}: ${field} ${src} 尺寸错误（${im.width}×${im.height}）`);}
   }
   characters.push(c);
  }catch(e){errors.push(e.message);}
 }
 return {characters,errors};
}
