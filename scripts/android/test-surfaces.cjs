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
    await page.evaluate(()=>{lobbyHost.visible=false;go('profile');});
    const source=page.locator('[name=regionCode]');const initial=await source.inputValue();
    await source.click();await page.locator('.choice-surface[open]').waitFor();
    assert.ok(await page.locator('.surface-option-search').count());
    await page.locator('.surface-close').click();assert.equal(await source.inputValue(),initial);assert.equal(await page.locator('.choice-surface').count(),0);
    await source.focus();await page.keyboard.press('Enter');await page.locator('.choice-surface[open]').waitFor();
    const candidate=await source.evaluate(select=>Array.from(select.options).find(o=>o.value&&o.value!==select.value&&!o.disabled).label);
    await page.locator('.surface-option-search').fill(candidate);assert.equal(await page.locator('.surface-option:visible').count(),1);
    await page.locator('.surface-option:visible').click();assert.equal(await source.locator('option:checked').innerText(),candidate);
    assert.equal(await page.locator('.choice-surface').count(),0);
    checks.push('Real profile region selector: searchable branded picker, cancel unchanged, keyboard opening, original select receives selection');
    await page.evaluate(()=>{const label=document.createElement('label');label.id='surface-date-fixture';label.textContent='日期测试';const input=document.createElement('input');input.type='date';input.value='2026-11-18';input.min='2026-11-17';input.max='2026-11-22';input.name='surfaceDate';label.append(input);screen.append(label);});
    await page.locator('[name=surfaceDate]').click();await page.locator('.temporal-surface[open]').waitFor();
    assert.equal(await page.locator('.surface-calendar [aria-label="2026-11-16"]').isDisabled(),true);
    await page.locator('.surface-calendar [aria-label="2026-11-20"]').click();assert.equal(await page.locator('[name=surfaceDate]').inputValue(),'2026-11-20');
    await page.locator('[name=surfaceDate]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('[name=surfaceDate]').inputValue(),'2026-11-20');assert.equal(await page.locator('.choice-surface').count(),0);
    checks.push('Date calendar commits selected day; min/max enforced, Escape cancels without mutation');
    await page.evaluate(()=>{const label=document.createElement('label');label.textContent='时间测试';const input=document.createElement('input');input.type='time';input.value='12:20';input.name='surfaceTime';label.append(input);screen.append(label);});
    await page.locator('[name=surfaceTime]').click();await page.getByRole('spinbutton',{name:'小时',exact:true}).fill('25');await page.locator('.surface-actions .primary').click();assert.equal(await page.locator('.surface-error').isVisible(),true);assert.equal(await page.locator('[name=surfaceTime]').inputValue(),'12:20');
    await page.getByRole('spinbutton',{name:'小时',exact:true}).fill('18');await page.locator('.surface-time-quick button').filter({hasText:'30分'}).click();await page.locator('.surface-actions .primary').click();assert.equal(await page.locator('[name=surfaceTime]').inputValue(),'18:30');
    checks.push('Time picker validates hours/minutes, quick-minute choices write original input only on confirm');
    await source.click();await page.evaluate(()=>window.handleBack());assert.equal(await page.locator('.choice-surface').count(),0);assert.equal(await page.evaluate(()=>page),'profile');
    await source.click();await page.evaluate(()=>go('mine'));assert.equal(await page.locator('.choice-surface').count(),0);assert.equal(await page.evaluate(()=>document.body.classList.contains('choice-surface-open')),false);
    await page.evaluate(()=>go('profile'));await page.locator('[name=regionCode]').click();await page.evaluate(()=>render());await page.waitForFunction(()=>!activeChoiceSurface);assert.equal(await page.locator('.choice-surface').count(),0);checks.push('App Back closes selection before page navigation; route changes and async form replacement clean modal and scroll lock');
    await page.evaluate(()=>go('profile'));
    const shots=[];
    for(const width of [320,390,430,768]){
      await page.setViewportSize({width,height:width===768?520:844});await page.locator('[name=regionCode]').click();await page.locator('.surface-option-search').fill('不存在的选项');assert.equal(await page.locator('.surface-empty').isVisible(),true);await page.locator('.surface-option-search').fill('');
      const bounds=await page.locator('.choice-surface').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('surface-option')),true);
      if(width===390){const path='work/screenshots/surfaces-region.png';await page.screenshot({path:root+'/'+path});shots.push(path);}
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const label=document.createElement('label');label.textContent='计划日期';const input=document.createElement('input');input.type='date';input.value='2026-11-18';label.append(input);screen.append(label);input.id='surface-calendar-preview';});await page.locator('#surface-calendar-preview').click();const path='work/screenshots/surfaces-calendar.png';await page.screenshot({path:root+'/'+path});shots.push(path);await page.keyboard.press('Escape');
    checks.push('320/390/430/768 widths, short viewport, empty search and keyboard option navigation without overflow');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(root+'/work/reports/surfaces-ui.json',JSON.stringify({passed:true,checks,scope:'Browser host with real SQLite; native Android dialog and Harmony picker appearance require device retest'},null,2));
    const mp=root+'/work/artifacts.json',manifest=JSON.parse(fs.readFileSync(mp,'utf8'));for(const path of shots){manifest.files=manifest.files.filter(f=>f.path!==path);manifest.files.push({path,kind:'screenshot',capture_tool:'playwright',purpose:'Unified interaction window host UI verification'});}fs.writeFileSync(mp,JSON.stringify(manifest,null,2));console.log(JSON.stringify({passed:true,checks}));
  }catch(e){console.error(e);process.exitCode=1;}finally{if(browser)await browser.close();adapter.close();server.close();}
})();
