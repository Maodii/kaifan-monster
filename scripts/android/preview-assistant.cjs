const {
  chromium,
} = require("/Users/developer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const http = require("http"),
  fs = require("fs"),
  crypto = require("crypto"),
  path = require("path"),
  assert = require("assert/strict"),
  { HostAdapter, root } = require("./host-adapter.cjs");
const packageManifest=fs.readFileSync(path.join(root,'android/app/src/main/AndroidManifest.xml'),'utf8');
const expectedVersionLabel='Android '+packageManifest.match(/android:versionName="([^"]+)"/)[1]+' · '+packageManifest.match(/android:versionCode="(\d+)"/)[1];
const parityInput=process.argv.includes("--parity-input-only");
const iteration90=process.argv.includes("--interaction90-only");
let iteration90Report;
const draftUi = process.argv.includes("--source-ui");
const compactOnly = process.argv.includes("--compact-search-only");
let compactReport;
const iconOnly=process.argv.includes("--icon-hearts-only");
let iconReport;
const clarityOnly=process.argv.includes("--search-clarity-only");
let clarityReport;
const pixelOnly=process.argv.includes("--pixel-polish-only");
let pixelReport;
const previewOnly=process.argv.includes("--motion-preview");
const motionOnly=process.argv.includes("--motion-only");
let motionReport;
const responsiveOnly = process.argv.includes("--responsive-only");
let responsiveReport;
const uiReport = parityInput ? "android-parity-input.json" : iteration90 ? "interaction90-ui.json" : clarityOnly ? "android-search-clarity.json" : iconOnly ? (draftUi?"android-source-icon-hearts.json":"android-icon-hearts.json") : previewOnly ? "android-motion-preview.json" : motionOnly ? (draftUi?"android-source-motion.json":"android-motion.json") : pixelOnly ? (draftUi?"android-source-pixel-polish.json":"android-pixel-polish.json") : compactOnly ? "android-compact-search-tests.json" : draftUi ? "android-source-ui-tests.json" : "android-ui-tests.json";
const adapter = new HostAdapter(),
  assets = root + "/android/app/build/generated/assets",
  checks = [],
  shots = [],
  errors = [];
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "POST") {
      let body = "";
      for await (const c of req) body += c;
      const data = JSON.parse(body);
      if (url.pathname === "/invoke") {
        res.setHeader("Content-Type", "application/json");
        res.end(adapter.invoke(data.action, JSON.stringify(data.args)));
      } else {
        let result;
        try {
          result = { value: await adapter.asyncOp(data.action, data.args) };
        } catch (e) {
          result = { error: e.message };
        }
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
      }
      return;
    }
    let file = path.join(
      assets,
      url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname),
    );
    if (!file.startsWith(assets + "/")) throw Error("path");
    res.setHeader(
      "Content-Type",
      file.endsWith(".html")
        ? "text/html"
        : file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".ttf")
              ? "font/ttf"
              : file.endsWith(".webp")
                ? "image/webp"
                : "image/png",
    );
    res.end(fs.readFileSync(file));
  } catch (e) {
    res.statusCode = 404;
    res.end("not found");
  }
});
(async()=>{
 let browser,context,videoPath;
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,args:['--renderer-process-limit=2']});
  context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference',recordVideo:{dir:root+'/work/reports',size:{width:390,height:844}}});
  await context.addInitScript(()=>{window.Android={invoke:(action,json)=>{const x=new XMLHttpRequest();x.open('POST','/invoke',false);x.setRequestHeader('Content-Type','application/json');x.send(JSON.stringify({action,args:JSON.parse(json)}));return x.responseText;},async:(id,action,json)=>fetch('/async',{method:'POST',body:JSON.stringify({action,args:JSON.parse(json)})}).then(r=>r.json()).then(result=>nativeResult(id,result))};});
  const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__kaifan);
  await page.evaluate(()=>{lobbyHost.visible=false;cloud.session.userId='preview-owner';cloud.session.accessToken='preview-only';go('ai-assistant');assistantState.owner='preview-owner';api=()=>new Promise(resolve=>{window.resolvePreviewAI=resolve;});render();});
  await page.locator('.ai-mascot-hero img').waitFor();await page.waitForTimeout(900);
  await page.locator('.ai-hello').click();await page.waitForTimeout(1100);
  await page.locator('.ai-hello').click();await page.waitForTimeout(1100);
  await page.locator('#assistant-prompt').fill('今晚想吃清爽一点，有什么推荐？');await page.locator('[name="assistantConsent"]').check();await page.locator('#assistant-send').click();await page.waitForTimeout(1800);
  await page.evaluate(()=>resolvePreviewAI({source:'model',task:'ask',text:'# 今晚这样吃\n- '+allRecipes()[0].name+'：先备齐食材，再按菜谱分步操作。\n- '+allRecipes()[1].name+'：可以搭配少油清炒蔬菜。\n1. 先准备不易熟的食材。\n2. 上桌前再炒蔬菜，口感更鲜。',references:[{id:allRecipes()[0].id},{id:allRecipes()[1].id}],plans:[]}));
  await page.waitForFunction(()=>!assistantState.busy);await page.waitForTimeout(600);await page.locator('.ai-answer-blocks').first().evaluate(e=>e.scrollIntoView({block:'start'}));
  await page.screenshot({path:root+'/work/screenshots/assistant-experience-v095.png'});
  const frameTimes=await page.evaluate(()=>new Promise(resolve=>{const spans=[];let before=performance.now();const frame=now=>{spans.push(now-before);before=now;if(spans.length<120)requestAnimationFrame(frame);else resolve(spans.slice(2));};requestAnimationFrame(frame);}));
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');const heap=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));await cdp.send('HeapProfiler.collectGarbage');const beforeHeap=await heap();
  for(let i=0;i<12;i++)await page.evaluate(()=>{go('today');go('ai-assistant');});await cdp.send('HeapProfiler.collectGarbage');const afterHeap=await heap();await page.evaluate(()=>platformVisibility(false));const suspended=await page.evaluate(()=>assistantPoseTimer===null);await page.evaluate(()=>platformVisibility(true));
  const sorted=frameTimes.slice().sort((a,b)=>a-b),report={passed:suspended,scope:'headless Chromium on development host, no mobile GPU/native memory claim; frame samples include recording overhead',frameSamples:frameTimes.length,frameIntervalMs:{median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)},routeCycles:12,heapSampling:'explicit garbage collection before and after route cycles; no native/GPU memory measured',jsHeapBytes:{before:beforeHeap.JSHeapUsedSize,after:afterHeap.JSHeapUsedSize},domNodes:{before:beforeHeap.Nodes,after:afterHeap.Nodes},mascotTimerSuspended:suspended};fs.writeFileSync(root+'/work/reports/assistant-host-performance.json',JSON.stringify(report,null,2));
  const registryPath=root+'/work/artifacts.json',registry=JSON.parse(fs.readFileSync(registryPath));const entries=[{path:'work/screenshots/assistant-experience-v095.png',kind:'screenshot',capture_tool:'playwright',purpose:'0.9.5 菜谱图卡与助手对话；宿主模拟回复'},{path:'work/reports/assistant-mascot-preview.gif',kind:'preview',capture_tool:'playwright + ffmpeg',purpose:'蜡笔小怪动作和回复图卡预览'},{path:'work/reports/assistant-host-performance.json',kind:'report',purpose:'宿主动画帧间隔和路由循环指标，非真机性能验收'}];for(const item of entries){registry.files=registry.files.filter(x=>x.path!==item.path);registry.files.push(item);}fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
  videoPath=await page.video().path();await context.close();context=null;fs.renameSync(videoPath,root+'/work/reports/assistant-mascot-preview.webm');console.log('Captured wave, eating, thinking and reply animation with a simulated response');
 }finally{if(context)await context.close();if(browser)await browser.close();server.close();adapter.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
