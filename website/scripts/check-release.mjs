import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {projectRoot,siteRoot} from './paths.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.WEBSITE_PLAYWRIGHT||'/Users/developer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.WEBSITE_BASE_URL||'https://site.example.invalid';
const expected=JSON.parse(fs.readFileSync(path.join(siteRoot,'release.json'),'utf8'));
const checks=[],screenshots=[];
const browser=await chromium.launch({headless:true});
try{
  for(const [kind,ua,hint] of [
    ['desktop',null,'按你的设备'],
    ['harmony','Mozilla/5.0 (Phone; OpenHarmony 5.0) AppleWebKit/537.36 (KHTML, like Gecko) ArkWeb/4.1.6.1 Chrome/114.0.0.0 Safari/537.36','鸿蒙设备'],
    ['android','Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36','安卓设备'],
    ['ios','Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1','iPhone 或 iPad'],
    ['wechat','Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Mobile Safari/537.36 MicroMessenger/8.0','安卓设备']
  ]){
    const context=await browser.newContext({viewport:{width:kind==='desktop'?1440:390,height:900},...(ua?{userAgent:ua}:{})});
    const page=await context.newPage();page.setDefaultNavigationTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    console.log(`Checking ${kind} release entry`);
    await page.goto(base+'/#download',{waitUntil:'domcontentloaded'});
    assert((await page.locator('#platform-hint').innerText()).includes(hint));
    assert.equal(await page.locator('#appgallery-link').getAttribute('href'),expected.appGalleryUrl);
    assert.equal(await page.locator('#appgallery-link').getAttribute('target'),kind==='desktop'?'_blank':null);
    assert.equal(await page.locator('#android-download').getAttribute('href'),expected.url);
    if(kind==='desktop'){
      await page.locator('.store-qr img').evaluate(image=>image.decode());
      assert(await page.locator('.store-qr img').isVisible());
    }
    assert((await page.locator('[data-release-version]').innerText()).includes(expected.version));
    await page.locator('.release-integrity summary').click();
    assert.equal((await page.locator('[data-release-sha]').textContent()).trim(),expected.sha256);
    if(kind==='wechat')assert((await page.locator('#download-guidance').innerText()).includes('右上角'));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const downloadPromise=page.waitForEvent('download');await page.locator('#android-download').click();const download=await downloadPromise;
    assert.equal(download.suggestedFilename(),expected.url.split('/').at(-1));await download.cancel();
    if(kind==='desktop'||kind==='harmony'){
      const file=`work/screenshots/official-site-download-${kind}.png`;
      await page.locator('#download').screenshot({path:path.join(projectRoot,file)});
      screenshots.push({path:file,kind:'screenshot',capture_tool:'playwright',purpose:'正式下载区布局与平台提示确认'});
    }
    if(kind==='harmony'){
      await page.route('https://appgallery.huawei.com/**',route=>route.fulfill({contentType:'text/html',body:'<title>Official store navigation verified</title>'}));
      await page.locator('#appgallery-link').click();await page.waitForURL(expected.appGalleryUrl);checks.push('Harmony CTA follows the exact official HTTPS store URL without forcing an APK');
    }
    assert.deepEqual(errors,[]);checks.push(`${kind}: platform guidance, store target, APK download event and responsive layout passed`);await context.close();
  }
  const metadata=await (await fetch(base+'/downloads.json')).json();
  for(const key of ['url','version','versionCode','sha256','bytes'])assert.equal(metadata[key],expected[key]);
  const response=await fetch(base+metadata.url,{method:'HEAD'});assert.equal(response.status,200);
  assert.equal(Number(response.headers.get('content-length')),expected.bytes);
  const size=3*1024*1024,count=Math.ceil(expected.bytes/size);
  const parts=await Promise.allSettled(Array.from({length:count},async(_,i)=>{
    const start=i*size,end=Math.min(expected.bytes-1,start+size-1);
    const part=await fetch(base+metadata.url,{headers:{Range:`bytes=${start}-${end}`}});
    assert.equal(part.status,206);assert.equal(part.headers.get('content-range'),`bytes ${start}-${end}/${expected.bytes}`);
    const buffer=Buffer.from(await part.arrayBuffer());assert.equal(buffer.length,end-start+1);
    console.log(`Public APK range ${i+1}/${count} verified`);return buffer;
  }));
  const hash=crypto.createHash('sha256');let bytes=0;
  for(const part of parts){assert.equal(part.status,'fulfilled',part.reason?.message);hash.update(part.value);bytes+=part.value.length;}
  assert.equal(bytes,expected.bytes);assert.equal(hash.digest('hex'),expected.sha256);checks.push('Entire public APK downloaded in memory; byte count and SHA-256 match the signed local release');
  const range=await fetch(base+metadata.url,{headers:{Range:'bytes=0-31'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,32);checks.push('HTTP byte-range requests work for interrupted download recovery');
  for(const privatePath of ['/outputs/kaifan-monster-android-release.apk','/outputs/','/downloads/kaifan-monster-android-debug.apk','/downloads/kaifan-monster-harmony-release.app','/deploy/server.json','/.env'])assert.equal((await fetch(base+privatePath)).status,404);
  for(const legal of ['privacy.html','terms.html'])assert.equal((await fetch(base+'/'+legal)).status,200);
  checks.push('Private outputs, debug/Harmony packages and deployment files stay inaccessible; legal pages remain public');
  const report={passed:true,verifiedAt:new Date().toISOString(),base,version:expected.version,versionCode:expected.versionCode,bytes,sha256:expected.sha256,checks,screenshots:screenshots.map(s=>s.path),limitations:['Browser UA emulation; no physical device install or native AppGallery launch tested','Public AppGallery page does not expose its current listed version; parity was checked against the actual local signed Harmony release']};
  fs.writeFileSync(path.join(projectRoot,'work/reports/official-site-download-public-validation.json'),JSON.stringify(report,null,2)+'\n');
  const manifest=path.join(projectRoot,'work/artifacts.json'),art=JSON.parse(fs.readFileSync(manifest,'utf8'));const names=new Set(screenshots.map(s=>s.path));art.files=art.files.filter(s=>!names.has(s.path)).concat(screenshots);fs.writeFileSync(manifest,JSON.stringify(art,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
