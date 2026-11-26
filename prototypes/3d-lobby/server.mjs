import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.json':'application/json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.svg':'image/svg+xml'};
http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost');let file;
if(u.pathname==='/catalog.json'){const d=JSON.parse(fs.readFileSync(path.join(root,'backend/data/recipes.json')));res.setHeader('Content-Type','application/json');res.end(JSON.stringify(d.recipes));return;}
if(u.pathname.startsWith('/media/'))file=path.join(root,'client/entry/src/main/resources/base/media',path.basename(u.pathname));
else if(u.pathname==='/font.ttf')file=path.join(root,'client/entry/src/main/resources/rawfile/fonts/shiku_hand.ttf');
else file=path.resolve(dir,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
if(!file.startsWith(dir)&&!file.startsWith(path.join(root,'client/entry/src/main/resources/')))throw Error('path');
res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');fs.createReadStream(file).on('error',()=>{res.statusCode=404;res.end('Not found');}).pipe(res);
}catch{res.statusCode=400;res.end('Bad request');}}).listen(4317,'127.0.0.1',()=>console.log('Kitchen 3D preview: http://127.0.0.1:4317'));
