import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=process.env.VERIFY_PORT||'4198';
const child=spawn(process.execPath,['tools/server.mjs','--dist'],{cwd:root,env:{...process.env,PORT:port},windowsHide:true,stdio:['ignore','pipe','pipe']});
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('预览服务器启动超时')),8000);child.stdout.on('data',b=>{if(b.toString().includes('已启动')){clearTimeout(timer);resolve();}});child.stderr.on('data',b=>{clearTimeout(timer);reject(new Error(b.toString()));});child.on('error',reject);});
 let count=0;const base=`http://127.0.0.1:${port}/`;
 const get=async p=>{const r=await fetch(base+p,{signal:AbortSignal.timeout(5000)});assert.equal(r.status,200,p);count++;return r;};
 const page=await (await get('')).text();assert(!/https?:\/\//.test(page),'首页不应依赖外站');
 const app=await get('src/app.js');assert(app.headers.get('content-type').includes('javascript'));
 await get('src/style.css');await get('favicon.svg');await get('docs/'+encodeURIComponent('角色制作规范.md'));
 const manifest=await (await get('characters/manifest.json')).json();
 for(const p of manifest.characters){const c=await (await get('characters/'+p)).json(),dir='characters/'+p.slice(0,p.lastIndexOf('/')+1);await get(dir+c.portrait);for(const a of Object.values(c.animations))for(const f of a.files||[a.src])await get(dir+f);}
 assert.equal((await fetch(base+'not-found.png')).status,404);
 assert.equal((await fetch(base+'.git/config')).status,403);
 assert.equal((await fetch(base+'tools/server.mjs')).status,403);
 assert.equal((await fetch(base,{method:'POST'})).status,405);
 console.log(`静态 HTTP 验证通过：${count} 个资源，PNG、模块、中文文档均可访问；缺失文件、私有路径与写请求正确拒绝。`);
}finally{child.kill();}
