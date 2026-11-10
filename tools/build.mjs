import {mkdir,cp,rm,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkProject} from './check.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.resolve(root,'dist');
const result=await checkProject();if(result.errors.length){console.error(result.errors.join('\n'));process.exit(1);}
// Only our fixed project-local build output can be removed.
if(path.dirname(out)!==root||path.basename(out)!=='dist')throw new Error('构建目录不安全');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const name of ['index.html','favicon.svg','src','characters','docs','templates','LICENSE','README.md'])await cp(path.join(root,name),path.join(out,name),{recursive:true});
await writeFile(path.join(out,'BUILD.txt'),'DragonFight 1.0.0\n静态产物。使用 HTTP 服务运行；无需安装依赖。\n');
console.log(`构建完成：${out}\n使用 npm run preview 预览。`);
