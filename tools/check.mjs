import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateCharacter,safePath,spriteAnimationEntries} from '../src/schema.js';
import {skillPlugins} from '../src/plugins/registry.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function checkCharacter(file){
 const errors=[];let c;
 try{c=JSON.parse(await readFile(file,'utf8'));}catch(e){return [`${file}: ${e.message}`];}
 errors.push(...validateCharacter(c,file));if(errors.length)return errors;
 const directory=path.dirname(file);
 async function png(src,width,height){
  try{const b=await readFile(path.join(directory,src));if(b.length<33||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('不是有效 PNG');const w=b.readUInt32BE(16),h=b.readUInt32BE(20);if(width&&(w!==width||h!==height))throw new Error(`尺寸 ${w}×${h}，应为 ${width}×${height}`);if(![4,6].includes(b[25]))errors.push(`${file}: ${src} 必须提供带 alpha 通道的 PNG（RGBA / 灰度 alpha）`);}catch(e){errors.push(`${file}: ${src} ${e.message}`);}
 }
 await png(c.portrait);
 for(const [,a] of spriteAnimationEntries(c)){
  for(const src of a.files||[a.src])await png(src,a.frameWidth*(a.files?1:a.frames),a.frameHeight);
 }
 for(const [name,m]of Object.entries(c.moves))for(const [i,e]of m.effects.entries())if(e.type==='plugin'&&!skillPlugins[e.plugin])errors.push(`${file}: moves.${name}.effects[${i}].plugin 未注册 ${e.plugin}`);
 return errors;
}
export async function checkProject(){
 const errors=[],manifest=JSON.parse(await readFile(path.join(root,'characters/manifest.json'),'utf8')),ids=new Set();
 if(manifest.version!==1||!Array.isArray(manifest.characters)||!manifest.characters.length)throw new Error('characters/manifest.json: 清单格式错误或为空');
 for(const p of manifest.characters){
  if(!safePath(p)){errors.push(`characters/manifest.json: 非法路径 ${p}`);continue;}
  const file=path.join(root,'characters',p);errors.push(...await checkCharacter(file));
  try{const c=JSON.parse(await readFile(file,'utf8'));if(ids.has(c.id))errors.push(`${p}: id ${c.id} 重复`);ids.add(c.id);}catch{}
 }
 errors.push(...await checkCharacter(path.join(root,'templates/character/character.json')));
 async function walk(dir){for(const d of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,d.name);if(d.isDirectory())await walk(full);else if(/\.(m?js)$/.test(d.name)){const result=spawnSync(process.execPath,['--check',full],{encoding:'utf8',windowsHide:true});if(result.status!==0)errors.push(result.stderr||`${full}: 语法检查失败`);}}}
 for(const folder of ['src','tools','test'])if(await stat(path.join(root,folder)).catch(()=>false))await walk(path.join(root,folder));
 return {errors,count:ids.size};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const {errors,count}=await checkProject();if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`检查通过：${count} 位角色、完整模板、PNG 尺寸、技能引用与 JavaScript 语法。`);}catch(e){console.error(e.message);process.exitCode=1;}
}
