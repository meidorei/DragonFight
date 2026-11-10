import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {networkInterfaces} from 'node:os';
import {spawn} from 'node:child_process';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=process.argv.includes('--dist')?path.join(project,'dist'):project;
const lan=process.argv.includes('--lan'),port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const decoded=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const parts=decoded.split(/[\\/]/);
    if(parts.some(p=>p.startsWith('.')||['node_modules','tools','test','素材'].includes(p))){res.writeHead(403);res.end('Forbidden');return;}
    const file=path.resolve(root,'.'+(decoded==='/'?'/index.html':decoded));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    if(!(await stat(file)).isFile())throw new Error('missing');
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:await readFile(file));
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('文件未找到');}
});
server.on('error',e=>{console.error(`启动失败：${e.message}。端口被占用时可设置 PORT。`);process.exitCode=1;});
server.listen(port,lan?'0.0.0.0':'127.0.0.1',()=>{
  console.log(`DragonFight 已启动：http://localhost:${port}\n关闭窗口或按 Ctrl+C 停止。`);
  if(lan)for(const list of Object.values(networkInterfaces()))for(const n of list??[])if(n.family==='IPv4'&&!n.internal)console.log(`手机地址：http://${n.address}:${port}`);
  if(process.argv.includes('--open')){
    const url=`http://localhost:${port}`;
    if(process.platform==='win32')spawn('rundll32',['url.dll,FileProtocolHandler',url],{windowsHide:true,stdio:'ignore'}).on('error',()=>{});
  }
});
