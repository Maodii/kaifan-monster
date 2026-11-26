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
    await page.evaluate(async()=>{cloud.session.userId='auto-test-owner';cloud.session.accessToken='host-test';assistantState.owner=cloud.session.userId;assistantState.consent=true;assistantState.task='ask';assistantState.prompt='鸡蛋怎么炒';api=async(path,method,body)=>{window.autoRequest=body;return {source:'model',text:'鸡蛋打散，小火炒至凝固。',references:[]};};await askAssistant();});
    assert.equal(await page.evaluate(()=>autoRequest.webSearch),true);assert.equal(await page.evaluate(()=>autoRequest.includeInventory),false);assert.equal(await page.locator('[name="assistantWebSearch"]').count(),0);
    await page.evaluate(async()=>{assistantState.task='ask';assistantState.prompt='不要联网，鸡蛋怎么炒';assistantState.followup=false;await askAssistant();});assert.equal(await page.evaluate(()=>autoRequest.webSearch),false);
    checks.push('Chat sends automatic search without a checkbox, private inventory remains opt-in, explicit no-web disables retrieval');
    const draft={name:'番茄鸡蛋浓汤',people:2,minutes:20,ingredients:[{name:'番茄',quantity:200,unit:'g'},{name:'鸡蛋',quantity:2,unit:'个'}],steps:['番茄切块，小火炒软。','加入400mL水，煮沸后淋入蛋液至凝固。'],kcalMin:120,kcalMax:220,proteinMin:8,proteinMax:16,costMin:6,costMax:10,assumptions:['两人各一碗，按少油和常见菜场价格估算。']};
    await page.evaluate(d=>{assistantState.result={source:'model',text:'新做法已整理，尚未保存。',generatedRecipe:d,retrieval:{status:'searched',sources:[{title:'菜谱参考',url:'https://example.com/recipe'}]}};render();},draft);
    assert.equal(await page.locator('.ai-web-sources a').count(),1);assert.match(await page.locator('.ai-web-sources summary').innerText(),/已联网/);
    assert.equal(await page.evaluate(()=>store.state.recipes.length),0);
    await page.locator('[data-action="assistantGeneratedRecipe"]').click();assert.equal(await page.evaluate(()=>page),'recipeEdit');
    assert.equal(await page.evaluate(()=>recipeDraft.referenceSources[0].url),'https://example.com/recipe');assert.equal(await page.evaluate(()=>store.state.recipes.length),0);
    await page.locator('form[data-submit="recipe"]').count().then(async n=>{if(n)await page.locator('form[data-submit="recipe"]').evaluate(el=>el.requestSubmit());});
    checks.push('Tool-returned sources shown, generated recipe opens real unsaved editor with source provenance');
    await page.evaluate(d=>{go('ai-assistant');assistantState.owner=cloud.session.userId;assistantState.result={source:'model',text:'按一人份估算，尚未保存。',estimate:{...d,portion:'一人一碗约300克'},retrieval:{status:'not_requested',sources:[]}};render();},draft);
    assert.ok((await page.locator('.ai-source').allTextContents()).some(t=>t.includes('未联网')));
    await page.locator('[data-action="assistantEstimateMeal"]').click();assert.equal(await page.evaluate(()=>page),'meal');assert.equal(await page.evaluate(()=>mealDraft.protein),12);assert.equal(await page.evaluate(()=>mealDraft.calorieSource),'AI估算');assert.equal(await page.evaluate(()=>store.state.meals.length),0);
    await page.locator('form[data-submit="meal"]').evaluate(el=>el.requestSubmit());await page.waitForFunction(()=>store.state.meals.length===1);
    assert.equal(await page.evaluate(()=>store.state.meals[0].protein),12);assert.equal(await page.evaluate(()=>store.state.meals[0].costType),'估算');assert.ok(await page.evaluate(()=>store.state.meals[0].aiEstimateRange.includes('kcalMin')));checks.push('Estimate opens real editor; only save persists protein, estimate range and non-paid cost provenance');
    await page.evaluate(d=>{go('ai-assistant');assistantState.owner=cloud.session.userId;assistantState.result={source:'model',text:'已整理做法与估算，请核对。',generatedRecipe:d,retrieval:{status:'searched',sources:[{title:'公开菜谱参考',url:'https://example.com/recipe'}]}};render();},draft);
    for(const width of [320,390,430]){await page.setViewportSize({width,height:844});await page.locator('.assistant-meal-draft details').first().click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>{document.querySelectorAll('.toast,.undo-notice').forEach(e=>e.remove());});
    const shot='work/screenshots/ai-intelligence-v0923.png';await page.screenshot({path:root+'/'+shot});shots.push({path:shot,kind:'screenshot',capture_tool:'playwright',purpose:'AI库外新菜和工具来源展示；宿主模拟返回数据，非真实联网截图'});
    await page.evaluate(()=>{cloud.session.userId='changed-owner';});await page.locator('[data-action="assistantGeneratedRecipe"]').click();assert.equal(await page.evaluate(()=>page),'ai-assistant');checks.push('Owner change blocks action; 320/390/430 layouts avoid overflow');assert.deepEqual(errors,[]);
    fs.writeFileSync(root+'/work/reports/ai-intelligence-ui.json',JSON.stringify({passed:true,scope:'Android host browser and real SQLite; mocked AI response, native dialog not covered',checks},null,2));
    const mp=root+'/work/artifacts.json',manifest=JSON.parse(fs.readFileSync(mp,'utf8'));for(const shot of shots){manifest.files=manifest.files.filter(f=>f.path!==shot.path);manifest.files.push(shot);}fs.writeFileSync(mp,JSON.stringify(manifest,null,2));console.log(JSON.stringify({passed:true,checks}));
  }catch(e){console.error(e);process.exitCode=1;}finally{if(browser)await browser.close();adapter.close();server.close();}
})();
