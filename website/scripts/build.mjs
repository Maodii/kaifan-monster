import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { siteRoot, publicRoot, projectRoot } from './paths.mjs';
import { renderLegal } from './legal.mjs';
renderLegal();
const dest = path.join(siteRoot,'dist');
fs.rmSync(dest,{recursive:true,force:true});
fs.cpSync(publicRoot,dest,{recursive:true});
const release=JSON.parse(fs.readFileSync(path.join(siteRoot,'release.json'),'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if(!release.passed||!/^\/downloads\/kaifan-monster-[\d.]+-android\.apk$/.test(release.url))throw Error('Invalid verified download');
for(const [file,hash] of [[release.source,release.sha256],[release.harmonySource,release.harmonySha256]]){
  if(sha(path.join(projectRoot,file))!==hash)throw Error('Release changed; run python3 website/scripts/verify-download.py');
}
const download=path.join(dest,release.url.slice(1));
fs.mkdirSync(path.dirname(download),{recursive:true});
fs.copyFileSync(path.join(projectRoot,release.source),download);
fs.writeFileSync(path.join(dest,'downloads.json'),JSON.stringify({version:release.version,versionCode:release.versionCode,url:release.url,bytes:release.bytes,sha256:release.sha256,appGalleryUrl:release.appGalleryUrl},null,2)+'\n');
let home=fs.readFileSync(path.join(dest,'index.html'),'utf8');
home=home.replace(/href="\/downloads\/[^\"]+\.apk"/,`href="${release.url}"`)
  .replace(/data-release-version>[^<]*/,`data-release-version>${release.version}`)
  .replace(/data-release-size>[^<]*/,`data-release-size>${(release.bytes/1024/1024).toFixed(1)} MB`)
  .replace(/data-release-sha>[^<]*/,`data-release-sha>${release.sha256}`);
fs.writeFileSync(path.join(dest,'index.html'),home);
const siteConfig=JSON.parse(fs.readFileSync(path.join(siteRoot,'site-config.json'),'utf8'));
const icpNumber=(process.env.WEBSITE_ICP_NUMBER||siteConfig.icpNumber||'').trim();
if(icpNumber){
  if(!/^[\u4e00-\u9fff]ICP备\d+(?:号)?(?:-\d+)?$/.test(icpNumber))throw Error('请提供真实、完整的ICP备案号');
  const html=fs.readFileSync(path.join(dest,'index.html'),'utf8').replace('<div class="footer-meta">',`<div class="footer-meta"><a class="icp-record" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">${icpNumber}</a>`);
  fs.writeFileSync(path.join(dest,'index.html'),html);
}
fs.writeFileSync(path.join(dest,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`);
console.log(`Static deployment ready: ${dest} (website and one verified Android release; no project files exposed)`);
