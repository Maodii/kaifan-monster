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
 let browser,context,video;
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,args:['--renderer-process-limit=2']});context=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:root+'/work/reports',size:{width:390,height:844}}});
  await context.addInitScript(()=>{window.Android={invoke:(action,json)=>{const x=new XMLHttpRequest();x.open('POST','/invoke',false);x.setRequestHeader('Content-Type','application/json');x.send(JSON.stringify({action,args:JSON.parse(json)}));return x.responseText;},async:(id,action,json)=>fetch('/async',{method:'POST',body:JSON.stringify({action,args:JSON.parse(json)})}).then(r=>r.json()).then(result=>nativeResult(id,result))};});const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__kaifan);await page.waitForTimeout(1900);
  await page.evaluate(()=>{lobbyHost.visible=false;cloud.session.userId='preview-companion';cloud.session.accessToken='preview-only';quickstartDone=true;clearAssistant();go('today');companionState.side='right';companionState.fraction=.37;render();companionStop();companionPose('peek');api=async()=>({source:'model',task:'ask',text:'# 今晚轻松做\n- **番茄炒蛋**：先炒蛋盛出，再炒番茄，最后合炒。\n- **清炒时蔬**：上桌前快炒，蔬菜更脆嫩。',references:[{id:allRecipes()[0].id},{id:allRecipes()[1].id}],plans:[]});});
  await page.waitForTimeout(400);await page.locator('#companion-pet').click({button:'right'});await page.waitForTimeout(300);await page.screenshot({path:root+'/work/screenshots/companion-action-menu.png'});await page.locator('[data-action="companionReact"][data-value="wave"]').click();
  const pet=await page.locator('#companion-pet').boundingBox();await page.mouse.move(pet.x+32,pet.y+30);await page.mouse.down();await page.mouse.move(24,290,{steps:18});await page.waitForTimeout(200);await page.mouse.up();await page.waitForTimeout(600);
  for(const pose of ['peek','wave','stretch','sleep','eat','surprise']){await page.evaluate(pose=>{companionStop();companionPose(pose);},pose);await page.waitForTimeout(900);}
  await page.locator('.home-brand [data-action="companionOpen"]').click();await page.waitForTimeout(800);await page.screenshot({path:root+'/work/screenshots/companion-home-dialog.png'});await page.locator('#assistant-prompt').fill('今晚想简单一点吃');await page.locator('[name="assistantConsent"]').check();await page.locator('#assistant-send').click();await page.waitForFunction(()=>!!assistantState.result&&!assistantState.busy);await page.waitForTimeout(650);await page.locator('.ai-answer-blocks').evaluate(e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:root+'/work/screenshots/companion-chat-answer.png'});await page.waitForTimeout(1200);const grip=await page.locator('.companion-grip').boundingBox();await page.mouse.move(grip.x+grip.width/2,grip.y+10);await page.mouse.down();await page.mouse.move(grip.x+grip.width/2,grip.y+110,{steps:16});await page.mouse.up();await page.waitForTimeout(600);
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');const heap=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));await cdp.send('HeapProfiler.collectGarbage');const before=await heap();for(let i=0;i<12;i++){await page.evaluate(()=>{openCompanion();closeCompanion();});await page.waitForFunction(()=>!document.getElementById('companion-dialog'));}await cdp.send('HeapProfiler.collectGarbage');const after=await heap();await page.evaluate(()=>platformVisibility(false));assert.equal(await page.evaluate(()=>companionState.timer),null);await page.evaluate(()=>platformVisibility(true));
  const report={passed:true,scope:'headless Chromium/SQLite host; no mobile GPU or native memory claim',routeCycles:12,heapSampling:'explicit GC before and after repeated open/close',jsHeapBytes:{before:before.JSHeapUsedSize,after:after.JSHeapUsedSize},domNodes:{before:before.Nodes,after:after.Nodes},backgroundTimerStopped:true};fs.writeFileSync(root+'/work/reports/companion-performance.json',JSON.stringify(report,null,2)+'\n');video=await page.video().path();await context.close();context=null;fs.renameSync(video,root+'/work/reports/companion-preview.webm');console.log(JSON.stringify(report));
 }finally{if(context)await context.close();if(browser)await browser.close();server.close();adapter.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
