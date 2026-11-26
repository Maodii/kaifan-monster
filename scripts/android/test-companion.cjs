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
 let browser;
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,args:['--renderer-process-limit=2']});const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>{delete Array.prototype.at;window.Android={invoke:(action,json)=>{const x=new XMLHttpRequest();x.open('POST','/invoke',false);x.setRequestHeader('Content-Type','application/json');x.send(JSON.stringify({action,args:JSON.parse(json)}));return x.responseText;},async:(id,action,json)=>fetch('/async',{method:'POST',body:JSON.stringify({action,args:JSON.parse(json)})}).then(r=>r.json()).then(result=>nativeResult(id,result))};});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__kaifan);await page.waitForTimeout(1900);await page.evaluate(()=>{lobbyHost.visible=false;cloud.session.userId='companion-test';cloud.session.accessToken='test-only';clearAssistant();go('today');window.companionCalls=0;api=async()=>{companionCalls++;return {source:'model',task:'ask',text:'# 操作顺序\n1. 先备好番茄和鸡蛋。\n2. 按菜谱火候分步炒。',references:[{id:allRecipes()[0].id},{id:allRecipes()[1].id}],plans:[]};};});
  await page.evaluate(async()=>{await store.setting('displayMode','3d');await loadSettings();render();});
  assert.equal(await page.evaluate(()=>lobbyHost.mode),'simple');assert.equal(await page.evaluate(()=>lobbyHost.visible),false);
  assert.equal(await page.locator('#native-lobby,#lobby-return').count(),0);
  assert.equal(await page.evaluate(()=>store.getSetting('displayMode','simple')),'3d');
  checks.push('saved 3D preference opens simple mode without destroying the stored preference');
  await page.evaluate(async()=>{await openInstalledLobby();await setLobbyMode('3d');await actions('lobbyMode','3d');await actions('lobbyQuality','high');});
  assert.equal(await page.evaluate(()=>lobbyHost.visible),false);assert.equal(await page.locator('iframe,#lobby-return').count(),0);
  checks.push('direct entry and stale mode actions cannot create a 3D frame');
  const appearance=await page.evaluate(()=>{parity.settingsGroup='外观与动效';return settingsDetailView();});
  assert.ok(!appearance.includes('3D大厅')&&!appearance.includes('3D画质'));
  await page.evaluate(()=>go('today'));await page.evaluate(()=>window.handleBack());
  assert.equal(await page.evaluate(()=>lobbyHost.visible),false);
  checks.push('appearance settings and back navigation do not expose suspended 3D');
  assert.equal(await page.locator('.assistant-entry').count(),0);await page.locator('.home-brand [data-action="companionOpen"]').click();assert.equal(await page.evaluate(()=>page),'today');assert.ok(await page.locator('.companion-window').isVisible());assert.equal(await page.evaluate(()=>companionCalls),0);assert.ok(await page.locator('#screen').evaluate(e=>e.inert));assert.ok((await page.locator('.companion-scrim').evaluate(e=>getComputedStyle(e).backdropFilter)).includes('blur'));checks.push('home logo opens chat directly over the unchanged page, blurs background, traps underlying input and sends no request; old card removed');
  const modalShot='work/screenshots/companion-home-dialog.png';await page.waitForTimeout(360);await page.screenshot({path:root+'/'+modalShot});shots.push({path:modalShot,kind:'screenshot',capture_tool:'playwright',purpose:'首页logo直接展开虚化对话层；未发送'});
  await page.locator('#assistant-prompt').fill('番茄炒蛋怎么做？');await page.locator('[name="assistantConsent"]').check();await page.locator('#assistant-send').click();await page.waitForFunction(()=>!!assistantState.result&&!assistantState.busy);assert.equal(await page.evaluate(()=>companionCalls),1);assert.ok(await page.locator('.ai-recipe-open').first().isVisible());assert.equal(await page.evaluate(()=>page),'today');await page.locator('.ai-reply-more>summary').click();await page.keyboard.press('Escape');assert.ok(await page.locator('.companion-window').isVisible());assert.equal(await page.locator('.ai-reply-more').getAttribute('open'),null);checks.push('existing consent-gated AI, structured answer, real recipe cards and controls work inside the modal');
  await page.locator('.ai-recipe-open').first().click();assert.equal(await page.evaluate(()=>page),'recipe');assert.equal(await page.locator('#companion-dialog').count(),0);await page.evaluate(()=>handleBack());await page.waitForFunction(()=>companionState.open);assert.equal(await page.evaluate(()=>page),'today');assert.ok((await page.locator('.ai-answer-blocks').innerText()).includes('先备好'));await page.locator('[data-action="companionClose"]').last().click();await page.waitForFunction(()=>!document.getElementById('companion-dialog'));assert.equal(await page.evaluate(()=>page),'today');assert.equal(await page.locator('#screen').evaluate(e=>e.inert),false);checks.push('recipe navigation suspends the overlay; Back restores the original page and conversation without duplicate history or requests');
  for(const route of ['recipes','pantry','meals','mine']){await page.evaluate(route=>go(route),route);assert.ok(await page.locator('#companion-pet').isVisible());}await page.evaluate(()=>go('recipes'));const pet=await page.locator('#companion-pet').boundingBox();await page.mouse.move(pet.x+32,pet.y+25);await page.mouse.down();await page.mouse.move(20,250,{steps:12});await page.mouse.up();await page.waitForTimeout(320);assert.equal(await page.evaluate(()=>companionState.side),'left');assert.equal(await page.locator('#companion-dialog').count(),0);const left=await page.locator('#companion-pet').boundingBox();assert.ok(left.x>=0&&left.x<10);await page.setViewportSize({width:320,height:568});const narrow=await page.locator('#companion-pet').boundingBox();assert.ok(narrow.y>=80&&narrow.y+narrow.height<568-85);checks.push('side companion is available across recipes/pantry/diary/settings; drag snaps left without opening chat and resize clamps above navigation');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);const held=await page.locator('#companion-pet').boundingBox();await page.mouse.move(held.x+30,held.y+30);await page.mouse.down();await page.waitForTimeout(680);await page.mouse.up();assert.equal(await page.locator('#companion-dialog').count(),0);assert.ok(await page.locator('#companion-menu').isVisible());const menuBox=await page.locator('#companion-menu').boundingBox();assert.ok(menuBox.x>=0&&menuBox.x+menuBox.width<=390&&menuBox.y>=0);await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'companionHide');await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),'wave');checks.push('action palette stays in viewport and supports Home/End keyboard navigation');await page.locator('[data-action="companionReact"][data-value="stretch"]').click();assert.equal(await page.evaluate(()=>companionState.pose),'stretch');assert.equal(await page.locator('#companion-menu').count(),0);checks.push('long press opens a bounded action palette; chosen reaction does not open chat; ordinary tap opens directly');await page.waitForTimeout(50);await page.locator('#companion-pet').click();await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('companion-dialog'));assert.equal(await page.locator('#companion-dialog').count(),0);await page.locator('#companion-pet').click();await page.evaluate(()=>handleBack());await page.waitForFunction(()=>!document.getElementById('companion-dialog'));assert.equal(await page.locator('#companion-dialog').count(),0);assert.equal(await page.evaluate(()=>page),'recipes');checks.push('tap opens the companion; Escape and Android Back dismiss only the dialogue, not the current route');
  await page.evaluate(async()=>{await actions('mealNew','午餐');clearAssistant();});await page.locator('main [name="name"]').fill('没有保存的便当');assert.equal(await page.locator('#companion-pet').isVisible(),false);await page.locator('main [name="name"]').blur();await page.waitForFunction(()=>!document.getElementById('companion-pet').hidden);checks.push('focused business input hides the pet without moving its stored position; blur restores it');const count=await page.evaluate(()=>store.state.meals.length);await page.locator('#companion-pet').click();await page.locator('#assistant-prompt').fill('不要改我的记餐');await page.locator('[data-action="companionClose"]').last().click();await page.waitForFunction(()=>!document.getElementById('companion-dialog'));assert.equal(await page.locator('main [name="name"]').inputValue(),'没有保存的便当');assert.equal(await page.evaluate(()=>store.state.meals.length),count);assert.equal(await page.evaluate(()=>assistantState.prompt),'不要改我的记餐');checks.push('opening/typing/closing on an unsaved meal form preserves its exact inputs and does not save a meal or discard chat draft');
  await page.evaluate(()=>{draftDirty=false;go('recipes');clearAssistant();window.partialCancels=0;api=async(path,method)=>{if(method==='DELETE'){partialCancels++;return {state:'cancelled'};}if(method==='POST')return {state:'running',position:5,delta:'先准备食材'};return new Promise(r=>window.finishCompanion=r);};});await page.locator('#companion-pet').click();await page.locator('#assistant-prompt').fill('先问问火候');await page.locator('[name="assistantConsent"]').check();await page.locator('#assistant-send').click();await page.waitForFunction(()=>!!window.finishCompanion);await page.locator('[data-action="companionClose"]').last().click();await page.waitForFunction(()=>!document.getElementById('companion-dialog'));assert.equal(await page.evaluate(()=>partialCancels),1);await page.evaluate(()=>finishCompanion({state:'done',position:5,delta:'',result:{source:'model',text:'不应显示'}}));await page.locator('#companion-pet').click();assert.ok((await page.locator('.ai-stopped').innerText()).includes('先准备食材'));assert.equal(await page.evaluate(()=>assistantState.result),null);await page.locator('[data-action="companionClose"]').last().click();await page.waitForFunction(()=>!document.getElementById('companion-dialog'));checks.push('closing mid-inference cancels upstream, retains partial content and editable question and rejects late completion');
  for(const pose of ['idle','blink','wave','think','joy','eat','peek','sleep','stretch','surprise']){await page.evaluate(pose=>companionPose(pose),pose);const loaded=await page.locator('#companion-pet>img:not(.companion-ghost)').evaluate(img=>new Promise(r=>{if(img.complete)r(img.naturalWidth>=256&&img.naturalWidth<=384);else{img.onload=()=>r(img.naturalWidth>=256&&img.naturalWidth<=384);img.onerror=()=>r(false);}}));assert.equal(loaded,true,pose);}await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>companionState.timer===null);assert.equal(await page.evaluate(()=>companionState.timer),null);await page.evaluate(()=>platformVisibility(false));assert.equal(await page.evaluate(()=>companionState.timer),null);await page.evaluate(()=>platformVisibility(true));await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.evaluate(()=>companionState.timer),null);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});checks.push('ten identity-matched pose assets decode at bounded 256/384px; reduced motion and background stop the companion timer');
  await page.evaluate(()=>{clearAssistant();go('today');companionState.side='right';companionState.fraction=.44;render();companionPose('peek');});const petShot='work/screenshots/companion-home-side.png';await page.waitForTimeout(380);await page.screenshot({path:root+'/'+petShot});shots.push({path:petShot,kind:'screenshot',capture_tool:'playwright',purpose:'原小怪侧边伙伴与主页纸纹，真实宿主页面'});
  const matrix=[];for(const [width,height] of [[320,568],[390,844],[768,600],[844,390]]){await page.setViewportSize({width,height});await page.locator('#companion-pet').click();const send=await page.locator('#assistant-send').boundingBox();assert.ok(send.y>=0&&send.y+send.height<=height+1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);matrix.push({width,height,sendVisible:true});await page.locator('[data-action="companionClose"]').last().click();await page.waitForFunction(()=>!document.getElementById('companion-dialog'));}checks.push('modal and send button fit small screen, phone, tablet and landscape; no horizontal page overflow');
  await page.setViewportSize({width:390,height:844});await page.locator('#companion-pet').click();const grip=await page.locator('.companion-grip').boundingBox();await page.mouse.move(grip.x+grip.width/2,grip.y+8);await page.mouse.down();await page.mouse.move(grip.x+grip.width/2+80,grip.y+30,{steps:5});await page.mouse.up();assert.ok(await page.locator('#companion-dialog').isVisible());checks.push('horizontal or short grip gestures settle without dismissing chat');
  const pull=await page.locator('.companion-grip').boundingBox();await page.mouse.move(pull.x+pull.width/2,pull.y+8);await page.mouse.down();await page.mouse.move(pull.x+pull.width/2,pull.y+105,{steps:8});const pulledY=(await page.locator('.companion-window').boundingBox()).y;await page.mouse.up();assert.ok((await page.locator('.companion-window').boundingBox()).y>=pulledY-8,'closing must start at the pulled position');assert.equal(await page.evaluate(()=>companionState.closing),true);await page.waitForFunction(()=>!document.getElementById('companion-dialog'));assert.equal(await page.evaluate(()=>companionState.closeTimer),null);checks.push('deliberate downward grip pull animates dismissal and releases closing timer');
  const stash=await page.locator('#companion-pet').boundingBox();await page.mouse.move(stash.x+30,stash.y+30);await page.mouse.down();await page.waitForTimeout(680);await page.mouse.up();await page.locator('[data-action="companionHide"]').click();assert.equal(await page.locator('#companion-pet').isVisible(),false);await page.evaluate(()=>go('today'));assert.equal(await page.locator('#companion-pet').isVisible(),false);await page.locator('.home-brand [data-action="companionOpen"]').click();await page.locator('[data-action="companionClose"]').last().click();await page.waitForFunction(()=>!document.getElementById('companion-dialog'));assert.ok(await page.locator('#companion-pet').isVisible());checks.push('temporarily hidden pet stays hidden across routes and is restored by the home mascot');
  await page.locator('#companion-pet').click();await page.evaluate(()=>closeCompanion());await page.waitForFunction(()=>companionState.closing);await page.evaluate(()=>openCompanion());assert.ok(await page.locator('.companion-window').isVisible());await page.waitForTimeout(250);assert.equal(await page.locator('#companion-dialog').count(),1);assert.equal(await page.evaluate(()=>companionState.closing),false);await page.evaluate(()=>closeCompanion());await page.waitForFunction(()=>!document.getElementById('companion-dialog'));checks.push('reopening during exit cancels old close work and leaves exactly one live dialog');
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#companion-pet').click();await page.evaluate(()=>closeCompanion());assert.equal(await page.locator('#companion-dialog').count(),0);assert.equal(await page.evaluate(()=>companionState.closeTimer),null);await page.emulateMedia({reducedMotion:'no-preference'});checks.push('reduced-motion preference dismisses immediately without a pending animation timer');
  await page.locator('#companion-pet').focus();await page.keyboard.press('ArrowDown');assert.ok(await page.locator('#companion-menu').isVisible());await page.locator('[data-action="companionReact"][data-value="sleep"]').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'companion-pet');await page.keyboard.press('ArrowUp');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'companion-pet');checks.push('keyboard-only pet action selection restores focus without opening the conversation');
  await page.evaluate(()=>{companionStop();companionPose('idle');});await page.waitForTimeout(260);await page.evaluate(()=>companionPose('stretch'));assert.equal(await page.locator('.companion-ghost').isHidden(),false);assert.ok((await page.locator('.companion-ghost').getAttribute('src')).includes('idle'));assert.ok((await page.locator('#companion-pet>img:not(.companion-ghost)').getAttribute('src')).includes('stretch'));await page.evaluate(()=>platformVisibility(false));assert.equal(await page.locator('.companion-ghost').isHidden(),true);assert.equal(await page.evaluate(()=>companionState.fade===null&&companionState.blend===null),true);await page.evaluate(()=>platformVisibility(true));checks.push('pose transition retains the old image under the new one and background cancels both blend animations');
  await page.setViewportSize({width:390,height:844});await page.locator('#companion-pet').click();await page.locator('#assistant-prompt').fill('私有问题');await page.evaluate(()=>{cloud.session.userId='other-owner';render();});assert.equal(await page.locator('#companion-dialog').count(),0);assert.equal(await page.evaluate(()=>assistantState.prompt),'');assert.equal(await page.locator('#screen').evaluate(e=>e.inert),false);checks.push('account switch closes the private overlay, clears its conversation and re-renders the current page');
assert.deepEqual(errors,[]);fs.writeFileSync(root+'/work/reports/companion-ui.json',JSON.stringify({passed:true,checks,matrix,screenshots:shots,evidence:'headless Chromium + real SQLite adapter; AI responses mocked; no native runtime claim',generated_core_sha256:crypto.createHash('sha256').update(fs.readFileSync(assets+'/core.js')).digest('hex')},null,2)+'\n');console.log(JSON.stringify({passed:true,checks}));
 }finally{if(browser)await browser.close();server.close();adapter.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
