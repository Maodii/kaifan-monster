import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { publicRoot as sourceRoot, siteRoot } from './paths.mjs';
const publicRoot=process.env.WEBSITE_SERVE_DIST==='1'?path.join(siteRoot,'dist'):sourceRoot;
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.apk':'application/vnd.android.package-archive','.ttf':'font/ttf','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
export const securityHeaders = {'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",'Permissions-Policy':'camera=(), microphone=(), geolocation=()'};
const server = http.createServer((req,res) => {
  for (const [k,v] of Object.entries(securityHeaders)) res.setHeader(k,v);
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{'Allow':'GET, HEAD'});return res.end();}
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch {res.writeHead(400);return res.end('Bad request');}
  let file;
  {
    // No directory listing, symlink serving, or arbitrary project/output access.
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (relative.split('/').some(p=>p.startsWith('.') || p === '..') || relative.includes('\\')) {res.writeHead(404);return res.end('Not found');}
    file = path.resolve(publicRoot, relative);
    if (!file.startsWith(publicRoot + path.sep)) {res.writeHead(404);return res.end('Not found');}
  }
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || !fs.realpathSync(file).startsWith(publicRoot + path.sep)) throw Error();
    res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');res.setHeader('Content-Length',stat.size);
    if(req.method === 'HEAD') return res.end();
    const stream=fs.createReadStream(file); stream.on('error',()=>res.destroy());stream.pipe(res);
  } catch {res.writeHead(404);res.end('Not found');}
});
const host = process.env.WEBSITE_HOST || '127.0.0.1';
const port = Number(process.env.WEBSITE_PORT || 4178);
server.listen(port, host, () => console.log(`开饭小怪官网预览：http://${host}:${port}`));
