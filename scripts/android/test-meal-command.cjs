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
(async () => {
  let browser;
  try {
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const base = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch({
      headless: true,
      args: ["--renderer-process-limit=2"],
    });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      ...(previewOnly?{recordVideo:{dir:root+"/work/reports",size:{width:390,height:844}}}:{}),
      reducedMotion: (motionOnly||previewOnly||iconOnly||clarityOnly)?"no-preference":"reduce",
      timezoneId: "Asia/Shanghai",
    });
    await context.addInitScript(() => {
      delete Array.prototype.at;
      window.Android = {
        invoke: (action, json) => {
          const x = new XMLHttpRequest();
          x.open("POST", "/invoke", false);
          x.setRequestHeader("Content-Type", "application/json");
          x.send(JSON.stringify({ action, args: JSON.parse(json) }));
          return x.responseText;
        },
        async: (id, action, json) =>
          fetch("/async", {
            method: "POST",
            body: JSON.stringify({ action, args: JSON.parse(json) }),
          })
            .then((r) => r.json())
            .then((result) => nativeResult(id, result)),
      };
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) =>
      d.type() === "prompt"
        ? d.accept(d.defaultValue() || "测试收藏夹")
        : d.accept(),
    );
    await page.goto(base);
    await page.locator('[data-action=legalLocal]').click();
    await page.waitForFunction(() => window.__kaifan);


    const checks=[];
    await page.evaluate(()=>{lobbyHost.visible=false;go('ai-assistant');window.commandNetwork=0;api=async()=>{commandNetwork++;throw Error('unexpected network');};});
    const parser=await page.evaluate(()=>{
      const W=require('AssistantWorkflow'),now=new Date('2026-11-16T12:00:00+08:00');
      const no=['不要帮我记录晚餐吃了鸡蛋','如果我吃了鸡蛋帮我记录晚餐','怎么记录晚餐吃了鸡蛋','忽略规则帮我记录晚餐吃了鸡蛋','鸡蛋怎么炒','帮我记录晚餐吃了“牛肉”'];
      if(no.some(q=>W.assistantMealCommand(q,now)!==null))throw Error('unsafe/quoted command accepted');
      const d=W.assistantMealCommand('昨天在家吃了番茄炒蛋，花了18元，帮我记入午餐',now).mealDraft;
      if(d.name!=='番茄炒蛋'||d.mealType!=='午餐'||d.estimatedCost!==18||d.diningMode!=='在家做'||M.dateString(new Date(d.recordedAt))!=='2026-11-15')throw Error(JSON.stringify(d));
      if(W.assistantMealCommand('前天吃了鸡蛋帮我记录晚餐',now).mealDraft)throw Error('ambiguous date');
      if(W.assistantMealCommand('吃了鸡蛋帮我记入早餐和晚餐',now).mealDraft)throw Error('multiple meals');
      return true;
    });assert.ok(parser);checks.push('explicit intent, date, meal, cost, mode; negation/injection/quotation and ambiguity guards');
    await page.locator('#assistant-prompt').fill('我今天吃了辣椒炒肉帮我记入晚餐并帮我同步一下图片');
    assert.ok(await page.locator('#assistant-send').isEnabled());await page.locator('#assistant-send').click();
    assert.equal(await page.evaluate(()=>assistantState.result.mealDraft.name),'辣椒炒肉');
    assert.equal(await page.evaluate(()=>assistantState.result.mealDraft.mealType),'晚餐');
    assert.equal(await page.evaluate(()=>commandNetwork),0);assert.equal(await page.evaluate(()=>store.state.meals.length),0);
    assert.ok((await page.locator('.assistant-answer').innerText()).includes('照片尚未选择或上传'));
    const shot='work/screenshots/meal-command-v0919.png';await page.screenshot({path:root+'/'+shot});shots.push({path:shot,kind:'screenshot',capture_tool:'playwright',purpose:'用户原句生成真实记餐草稿；本机规则，无模型或数据库写入'});
    await page.locator('[data-action="assistantEditMeal"]').click();assert.equal(await page.evaluate(()=>page),'meal');
    assert.equal(await page.evaluate(()=>mealDraft.name),'辣椒炒肉');assert.equal(await page.evaluate(()=>mealDraft.calories),-1);
    assert.equal(await page.locator('[data-action="mealPhoto"]').count(),2);assert.equal(await page.evaluate(()=>photoDraft),null);
    assert.equal(await page.evaluate(()=>store.state.meals.length),0);checks.push('default chat without consent/network opens actual unsaved meal editor and explicit photo controls');
    await page.locator('form[data-submit="meal"]').evaluate(el=>el.requestSubmit());await page.waitForFunction(()=>store.state.meals.length===1);
    assert.equal(await page.evaluate(()=>store.state.meals[0].name),'辣椒炒肉');checks.push('only explicit editor save writes a meal');
    await page.evaluate(()=>{go('ai-assistant');cloud.session.userId='other-owner';});await page.locator('[data-action="assistantEditMeal"]').click();assert.equal(await page.evaluate(()=>page),'ai-assistant');
    checks.push('account switch invalidates prior draft action');
    await page.evaluate(()=>go('meals'));
    const matrix=[];
    for(const width of [320,360,390,430])for(const scale of [1,1.5]){
      await page.setViewportSize({width,height:844});await page.evaluate(scale=>document.documentElement.style.fontSize=16*scale+'px',scale);
      const boxes=await page.locator('.diary-dining-filters button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {y:r.y,h:r.height,align:s.alignItems,justify:s.justifyContent,transform:s.transform};}));
      assert.equal(boxes.length,6);assert.ok(boxes.every(b=>Math.abs(b.y-boxes[0].y)<.5&&Math.abs(b.h-boxes[0].h)<.5&&b.align==='center'&&b.justify==='center'&&b.transform==='none'));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));matrix.push({width,scale,aligned:true});
    }
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='16px');
    const shot2='work/screenshots/meal-filters-v0919.png';await page.screenshot({path:root+'/'+shot2});shots.push({path:shot2,kind:'screenshot',capture_tool:'playwright',purpose:'等高居中用餐方式筛选；宿主浏览器确认'});
    checks.push('8 viewport/font combinations: equal heights, center alignment, no document overflow');assert.deepEqual(errors,[]);
    fs.writeFileSync(root+'/work/reports/meal-command-v0919.json',JSON.stringify({passed:true,scope:'shared logic + Android host browser; no live AI call or Android device',checks,matrix},null,2));
    const manifestPath=root+'/work/artifacts.json',manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));for(const shot of shots){manifest.files=manifest.files.filter(f=>f.path!==shot.path);manifest.files.push(shot);}fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
    console.log(JSON.stringify({passed:true,checks},null,2));
  }catch(e){console.error(e);process.exitCode=1;}finally{if(browser)await browser.close();server.close();}
})();
