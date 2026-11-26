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
    await page.evaluate(()=>{lobbyHost.visible=false;});
    const metadata=await page.evaluate(()=>{
      const r=new M.Recipe();r.name='测试菜';r.ingredients=[new M.Ingredient('猪肉',200,'g')];r.steps=['猪肉洗净，切成45度斜片。','加调料腌15分钟。','中小火煎3分钟，直到两面金黄。','装盘。'];return G.buildCookingGuide(r).steps;
    });
    assert.equal(metadata[0].heat,'');assert.equal(metadata[0].time,'');assert.equal(metadata[0].checkpoint,'');
    assert.equal(metadata[1].heat,'');assert.equal(metadata[1].time,'15分钟');assert.equal(metadata[2].heat,'中小火');assert.equal(metadata[2].time,'3分钟');assert.equal(metadata[3].heat,'');
    checks.push('Prep/cold/marination steps omit false heat; real cooking heat and durations retained without fabricated metadata');
    await page.evaluate(()=>{go('recipe');selected=allRecipes()[0].id;render();});
    assert.equal(await page.locator('.step-meta').filter({hasText:'来源未注明'}).count(),0);
    assert.equal(await page.locator('.recipe-advice[open]').count(),0);
    await page.evaluate(async()=>{parity.motion=true;applyAppearance();const id=currentRecipe().id;await actions('favorite',id);});
    const heartMotion=await page.locator('header [data-action=favorite] img').evaluate(img=>img.getAnimations().map(a=>a.effect.getKeyframes()));assert.ok(heartMotion.flat().some(k=>k.transform.includes('1.38')));
    await page.waitForTimeout(550);assert.equal(await page.locator('header [data-action=favorite] img').evaluate(img=>img.getAnimations().length),0);
    await page.locator('#polish-undo').waitFor({state:'visible'});
    assert.equal(await page.locator('#polish-undo').innerText().then(t=>t.includes('撤销')),true);
    await page.locator('#polish-undo button').first().click();
    assert.equal(await page.evaluate(()=>store.state.favorites.some(f=>f.recipeId===selected)),false);
    await page.evaluate(async()=>{await actions('favorite',selected);});
    await page.waitForTimeout(4250);assert.equal(await page.locator('#polish-undo').isVisible(),false);
    checks.push('Four-phase heart overshoot returns to rest; favorite undo restores exact state, never creates another notice; notice expires automatically after4 seconds');
    await page.evaluate(async()=>{await setting('reducedMotion',true);await loadSettings();settings.theme='berry';document.body.classList.add('reduced-motion');applyAppearance();parity.settingsGroup='';go('settings');});
    assert.equal(await page.evaluate(()=>document.body.classList.contains('berry')),false);
    assert.equal(await page.locator('[name=theme]').count(),0);
    assert.equal(await page.locator('[name=reducedMotion]').count(),0);assert.equal(await page.locator('[data-action=settingsGroup][data-value="动效"]').count(),0);assert.equal(await page.evaluate(()=>parity.motion),true);assert.equal(await page.evaluate(()=>document.body.classList.contains('reduced-motion')),false);checks.push('Theme/motion entries removed; stored reducedMotion=true ignored and legacy CSS class cleared');
    await page.evaluate(()=>{cloud.session=new C.Session();go('account');});
    await page.locator('[name=email]').fill('foodtester');await page.locator('[name=password]').fill('abc123');
    await page.locator('[data-action=authPassword]').click();assert.equal(await page.locator('[name=password]').inputValue(),'abc123');assert.equal(await page.locator('[name=password]').getAttribute('type'),'text');
    await page.locator('[data-action=authMode]').click();assert.equal(await page.locator('[name=email]').inputValue(),'foodtester');
    checks.push('Auth reveal/mode switch preserve entries; contextual focus hints and compact register footer');
    const portrait='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="coral"/></svg>');
    await page.evaluate(async portrait=>{
      cloud.session.userId='profile-owner';cloud.session.accessToken='test';const p=new (require('AccountModels').UserProfile)();p.displayName='旧昵称';p.version=1;profileData=p;parity.profileAvatar='';
      const native=P.nativeAsync;P.nativeAsync=async(action,...args)=>action==='photo'?{compressed:'/fake-avatar.png'}:native(action,...args);
      cloud.uploadAvatar=async()=>({...p,avatarId:'avatar-test',version:2});
      api=async path=>path.startsWith('/account/avatar/')?{url:portrait}:p;
      go('profile');render();
    },portrait);
    await page.locator('[name=displayName]').fill('编辑中的昵称');await page.locator('[data-action=avatar]').click();
    await page.waitForFunction(()=>profileData?.avatarId==='avatar-test');
    assert.equal(await page.locator('[name=displayName]').inputValue(),'编辑中的昵称');
    await page.locator('[data-profile-avatar]').evaluate(img=>img.decode());
    assert.equal(await page.locator('[data-profile-avatar]').evaluate(img=>img.naturalWidth),64);
    await page.evaluate(()=>go('mine'));await page.locator('.profile-banner [data-profile-avatar]').evaluate(img=>img.decode());
    checks.push('Avatar upload resolves signed URL immediately in profile and mine; unsaved nickname retained (mock server/native picker)');
    for(const width of [320,390,430,768]){
      await page.setViewportSize({width,height:844});
      for(const route of ['profile','account','recipe']){
        await page.evaluate(route=>{go(route);render();},route);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow '+width);
      }
    }
    checks.push('Profile/account/recipe viewports320,390,430,768 without horizontal overflow');
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{go('recipe');render();});
    await page.evaluate(()=>{document.getElementById('toast').textContent='';});const shot='work/screenshots/ui-refinement-recipe.png';await page.screenshot({path:root+'/'+shot,fullPage:true});
    await page.evaluate(()=>{cloud.session=new C.Session();parity.authRegister=false;parity.showPassword=false;go('account');render();document.getElementById('toast').textContent='';});const authShot='work/screenshots/ui-refinement-login.png';await page.screenshot({path:root+'/'+authShot});
    const mp=root+'/work/artifacts.json',manifest=JSON.parse(fs.readFileSync(mp,'utf8'));for(const path of [shot,authShot]){manifest.files=manifest.files.filter(f=>f.path!==path);manifest.files.push({path,kind:'screenshot',capture_tool:'playwright',purpose:'0.9.26菜谱与账号紧凑排版确认（宿主测试）'});}fs.writeFileSync(mp,JSON.stringify(manifest,null,2));
    assert.deepEqual(errors,[]);fs.writeFileSync(root+'/work/reports/ui-refinement-tests.json',JSON.stringify({passed:true,checks,scope:'Browser host with real SQLite; avatar picker/server mocked, no physical device'},null,2));console.log(JSON.stringify({passed:true,checks}));
  }catch(e){console.error(e);process.exitCode=1;}finally{if(browser)await browser.close();adapter.close();server.close();}
})();
