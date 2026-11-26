import fs from 'node:fs';
import path from 'node:path';
import { siteRoot, publicRoot } from './paths.mjs';
import { renderLegal } from './legal.mjs';
renderLegal();
const dest = path.join(siteRoot,'dist');
fs.rmSync(dest,{recursive:true,force:true});
fs.cpSync(publicRoot,dest,{recursive:true});
const siteConfig=JSON.parse(fs.readFileSync(path.join(siteRoot,'site-config.json'),'utf8'));
const icpNumber=(process.env.WEBSITE_ICP_NUMBER||siteConfig.icpNumber||'').trim();
if(icpNumber){
  if(!/^[\u4e00-\u9fff]ICP备\d+(?:号)?(?:-\d+)?$/.test(icpNumber))throw Error('请提供真实、完整的ICP备案号');
  const html=fs.readFileSync(path.join(dest,'index.html'),'utf8').replace('<div class="footer-meta">',`<div class="footer-meta"><a class="icp-record" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">${icpNumber}</a>`);
  fs.writeFileSync(path.join(dest,'index.html'),html);
}
fs.writeFileSync(path.join(dest,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`);
console.log(`Static deployment ready: ${dest} (website only; no app packages or project files exposed)`);
