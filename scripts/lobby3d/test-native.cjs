const {chromium}=require('/Users/developer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {HostAdapter}=require('../android/host-adapter.cjs');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..'),assets=root+'/android/app/build/generated/assets';
const boundPaths=['prototypes/3d-lobby/native/scene-transition.js','prototypes/3d-lobby/native/object-interactions.js','android/web/polish.js','client/entry/src/main/ets/model/InteractionPolishCore.ets','client/entry/src/main/ets/model/PhotoLayoutCore.ets','prototypes/3d-lobby/native/art-direction.js','android/web/lobby.js','prototypes/3d-lobby/native/runtime.js','prototypes/3d-lobby/native/preview.js','client/entry/src/main/ets/model/LobbyCore.ets','client/entry/src/main/ets/components/LobbyView.ets','client/entry/src/main/ets/pages/Index.ets','client/entry/src/main/ets/entryability/EntryAbility.ets','client/entry/src/main/resources/rawfile/lobby/lobby.js'];
// Bind visual evidence to every actual model/texture/preview, not just renderer code.
function bindFiles(dir){for(const name of fs.readdirSync(root+'/'+dir)){const relative=dir+'/'+name;if(fs.statSync(root+'/'+relative).isDirectory())bindFiles(relative);else if(!boundPaths.includes(relative))boundPaths.push(relative)}}
bindFiles('client/entry/src/main/resources/rawfile/lobby');
for(const scene of ['meals','kitchen','pantry','community','profile'])boundPaths.push('prototypes/3d-lobby/assets/'+scene+'.glb');
boundPaths.push('art-source/lobby3d/detailed-spaces.blend');
const hashSources=()=>Object.fromEntries(boundPaths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(root+'/'+p)).digest('hex')]));const startedHashes=hashSources();
const adapter=new HostAdapter(),checks=[],errors=[],shots=[];let browser,expectedFailure=false;
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='POST'){let body='';for await(const c of req)body+=c;const a=JSON.parse(body);let result;if(url.pathname==='/invoke')result=adapter.invoke(a.action,JSON.stringify(a.args));else try{result=JSON.stringify({value:await adapter.asyncOp(a.action,a.args)})}catch(e){result=JSON.stringify({error:e.message})}res.setHeader('Content-Type','application/json');res.end(result);return}
 const file=path.join(assets,url.pathname==='/'?'index.html':decodeURIComponent(url.pathname));if(!file.startsWith(assets+'/'))throw Error('path');
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.glb':'model/gltf-binary'};
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
 res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' blob:; base-uri 'none'; frame-src 'self'; form-action 'none'");
 res.end(fs.readFileSync(file));
 }catch(e){res.statusCode=404;res.end('not found')}});
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name)};
(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',timezoneId:'Asia/Shanghai'});
 await context.addInitScript(()=>{if(window!==window.top)return;window.Android={invoke(action,json){const x=new XMLHttpRequest();x.open('POST','/invoke',false);x.setRequestHeader('Content-Type','application/json');x.send(JSON.stringify({action,args:JSON.parse(json)}));return x.responseText},async(id,action,json){fetch('/async',{method:'POST',body:JSON.stringify({action,args:JSON.parse(json)})}).then(r=>r.json()).then(result=>nativeResult(id,result))}}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!expectedFailure)errors.push(m.text())});page.on('dialog',d=>d.accept());
 const shot=async(name,purpose)=>{const file='work/screenshots/lobby3d-installed-'+name+'.png';await page.screenshot({path:root+'/'+file,fullPage:true});shots.push({path:file,kind:'screenshot',capture_tool:'playwright',purpose})};
 await page.goto(base);await page.waitForFunction(()=>window.__kaifan,{timeout:30000});
 check('Simple mode preserves existing default',await page.evaluate(()=>!__lobbyHost.state.visible&&page==='today'));
 check('Unknown bridge route and malformed payload rejected',await page.evaluate(()=>{const c=require('LobbyCore');return ['{}','null','[]','{"v":1,"type":"route","value":"../../db"}','{"v":1,"type":"scene","value":"outside"}','{"v":2,"type":"ready","value":""}',JSON.stringify({v:1,type:'route',value:'x'.repeat(600)})].every(s=>c.parseLobbyRequest(s)===null)}));
 const baseline=await page.evaluate(()=>JSON.stringify([store.state.foods,store.state.meals,store.state.favorites,store.state.plans]));
 await page.evaluate(()=>__lobbyHost.open());await page.waitForSelector('#native-lobby iframe');const frame=page.frames().find(f=>f.url().includes('/lobby/index.html'));assert(frame);await frame.waitForFunction(()=>window.lobbyState?.ready,{timeout:60000});
 check('Packaged compressed GLB loads under native CSP',await frame.evaluate(()=>lobbyState.ready&&lobbyState.stats.triangles>10000));
 check('Snapshot uses actual current store counts',await frame.evaluate(()=>lobbyState.snapshot.foodCount===0&&lobbyState.snapshot.mealCount===0));
 await frame.locator('#more').click();check('Feature drawer follows native back before leaving lobby',await frame.evaluate(()=>document.querySelector('#feature-drawer').open&&LobbyNative.back()&&!document.querySelector('#feature-drawer').open));
 check('Installed lobby does not use demo localStorage',await frame.evaluate(()=>!localStorage.getItem('kaifan-lobby-art-demo:v1')));
 await page.evaluate(()=>dispatchEvent(new MessageEvent('message',{origin:location.origin,source:window,data:{channel:'kaifan-lobby-v1',request:JSON.stringify({v:1,type:'route',value:'new-meal'})}})));
 check('Forged message from parent window ignored',await page.evaluate(()=>__lobbyHost.state.visible));
 for(const scene of ['meals','recipes','pantry','community','profile']){
  await frame.evaluate(s=>lobbyState.switchRoom(s),scene);await frame.waitForFunction(s=>lobbyState.ready&&lobbyState.scene===s,scene,{timeout:60000});
  check(scene+' scene retains real model geometry',await frame.evaluate(()=>lobbyState.stats.triangles>10000&&lobbyState.stats.calls<240));
  check(scene+' material images loaded',await frame.evaluate(()=>{let valid=true;lobbyState.model.traverse(o=>{if(o.isMesh&&['wood','linen'].includes(o.material.name)&&!o.material.map)valid=false});return valid}));
  check(scene+' labels fit390 viewport',await frame.evaluate(()=>[...document.querySelectorAll('.spatial-label')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})));
  if(scene==='profile'){
   check('Profile mirror has one bounded real reflection target',await frame.evaluate(()=>{const m=lobbyState.model.getObjectByName('LivePlanarMirror');return m?.isReflector&&m.getRenderTarget().width===512&&m.camera.matrixWorld.elements.every(Number.isFinite)&&m.material.uniforms.textureMatrix.value.elements.some(n=>Math.abs(n)>.1)}));
   const old=await frame.evaluate(()=>lobbyState.model.getObjectByName('LivePlanarMirror').material.uniforms.textureMatrix.value.toArray());
   await frame.locator('#zoom-in').click();await frame.waitForFunction(before=>lobbyState.model.getObjectByName('LivePlanarMirror').material.uniforms.textureMatrix.value.elements.some((n,i)=>Math.abs(n-before[i])>.001),old,{timeout:10000});
   check('Mirror projection follows actual camera movement',await frame.evaluate(before=>lobbyState.model.getObjectByName('LivePlanarMirror').material.uniforms.textureMatrix.value.elements.some((n,i)=>Math.abs(n-before[i])>.001),old));
   await frame.locator('#reset').click();
  }
  await shot(scene,'软件内3D大厅真实打包资源与业务桥接：'+scene);
 }
 check('Room-specific surface finishes preserve authored texture detail',await frame.evaluate(()=>{let coats=0,sheen=0;const finish=lobbyState.model.userData.surfaceFinish;lobbyState.model.traverse(o=>{if(o.material?.clearcoat>0)coats++;if(o.material?.sheen>0)sheen++});return finish?.materials>10&&coats>0&&sheen>0}));
 // Actual pointer hold inspects a model instead of opening its business route.
 await frame.evaluate(()=>lobbyState.switchRoom('recipes'));
 const target=await frame.evaluate(()=>{const part=lobbyState.model.getObjectByName('part_kitchen_pot');let mesh;part.traverse(o=>{if(o.isMesh&&!mesh)mesh=o});mesh.geometry.computeBoundingBox();const point=mesh.geometry.boundingBox.getCenter(mesh.position.clone()).applyMatrix4(mesh.matrixWorld).project(lobbyState.camera),r=document.querySelector('#scene').getBoundingClientRect();return {x:r.x+(point.x*.5+.5)*r.width,y:r.y+(-point.y*.5+.5)*r.height,camera:lobbyState.camera.position.toArray()}});
 const outer=await page.locator('#native-lobby iframe').boundingBox();await page.mouse.move(outer.x+target.x,outer.y+target.y);await page.mouse.down();await page.waitForTimeout(680);await page.mouse.up();
 check('Long hold keeps the original business state and opens model inspection',await page.evaluate(()=>__lobbyHost.state.visible)&&await frame.evaluate(v=>lobbyState.camera.position.toArray().some((n,i)=>Math.abs(n-v[i])>.1),target.camera));
 const inspectionPose=await frame.evaluate(()=>lobbyState.inspecting);
 check('Inspection exposes an explicit return to the previous view',inspectionPose&&await frame.locator('#inspect-back').isVisible());
 await frame.locator('#inspect-back').click();
 await frame.waitForFunction(before=>lobbyState.camera.position.toArray().every((n,i)=>Math.abs(n-before[i])<.001),target.camera,{timeout:10000});
 check('Leaving inspection restores the exact original camera without scene reset',await frame.evaluate(()=>!lobbyState.inspecting));
 await frame.locator('#reset').click();
 const lidY=await frame.evaluate(()=>lobbyState.model.getObjectByName('rig_pot_lid').position.y);
 await page.mouse.click(outer.x+target.x,outer.y+target.y);
 check('Actual pot tap lifts and tilts lid to inspect broth without leaving kitchen',await frame.evaluate(y=>lobbyState.model.getObjectByName('rig_pot_lid').position.y-y>.35&&lobbyState.model.getObjectByName('rig_pot_lid').rotation.x<-.6,lidY)&&await page.evaluate(()=>__lobbyHost.state.visible));
 await page.mouse.move(outer.x+target.x,outer.y+target.y);await page.mouse.down();await page.waitForTimeout(680);await page.mouse.up();
 await shot('pot-interior','实际打包的实时渲染器：点击抬起锅盖后长按查看汤面，Chromium确认截图，非离线Cycles图');await frame.locator('#reset').click();
 await page.mouse.click(outer.x+target.x,outer.y+target.y);
 check('Second pot tap restores the same lid assembly',await frame.evaluate(y=>Math.abs(lobbyState.model.getObjectByName('rig_pot_lid').position.y-y)<.001,lidY));
 // Exercise a real tween, then suspend it through the host lifecycle during motion.
 await page.emulateMedia({reducedMotion:'no-preference'});
 await frame.waitForFunction(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches&&!lobbyState.snapshot.reducedMotion);
 await frame.evaluate(()=>{window.__lidPoseSamples=[];const until=performance.now()+3000;const sample=()=>{const lid=lobbyState.model?.getObjectByName('rig_pot_lid');if(!lid)return;__lidPoseSamples.push(lid.position.y);if(performance.now()<until)requestAnimationFrame(sample)};requestAnimationFrame(sample)});
 await page.mouse.click(outer.x+target.x,outer.y+target.y);
 await frame.waitForFunction(y=>__lidPoseSamples.some(v=>v-y>.001&&v-y<.419),lidY,{timeout:20000}).catch(async e=>{console.log('ANIMATION_DIAGNOSTIC',await frame.evaluate(y=>({base:y,current:lobbyState.model.getObjectByName('rig_pot_lid').position.y,frames:lobbyState.frames,active:lobbyState.active,media:matchMedia('(prefers-reduced-motion: reduce)').matches,preference:lobbyState.snapshot.reducedMotion,samples:__lidPoseSamples}),lidY));await shot('animation-failure','Actual animation intermediate-pose diagnosis');throw e});
 check('Normal-motion lid renders an intermediate pose before reaching the open endpoint',await frame.evaluate(y=>__lidPoseSamples.some(v=>v-y>.001&&v-y<.419),lidY));
 await page.evaluate(()=>platformVisibility(false));
 check('Background suspension settles the lid at a complete valid pose',await frame.evaluate(y=>Math.abs(lobbyState.model.getObjectByName('rig_pot_lid').position.y-y-.42)<.001,lidY));
 await page.evaluate(()=>platformVisibility(true));await page.waitForTimeout(100);
 check('Resume retains the same open lid and original business screen',await frame.evaluate(y=>Math.abs(lobbyState.model.getObjectByName('rig_pot_lid').position.y-y-.42)<.001,lidY)&&await page.evaluate(()=>__lobbyHost.state.visible));
 await page.mouse.click(outer.x+target.x,outer.y+target.y);
 await frame.waitForFunction(y=>Math.abs(lobbyState.model.getObjectByName('rig_pot_lid').position.y-y)<.001,lidY,{timeout:20000}).catch(async e=>{await shot('animation-failure','实际动画关闭失败诊断');console.log('LID_DEBUG',await frame.evaluate(y=>({original:y,current:lobbyState.model.getObjectByName('rig_pot_lid').position.y,frames:lobbyState.frames,active:lobbyState.active}),lidY));throw e});
 check('Animated close returns exactly to original pose',await frame.evaluate(y=>Math.abs(lobbyState.model.getObjectByName('rig_pot_lid').position.y-y)<.001,lidY));
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const [room,part,name,purpose] of [
  ['pantry','part_fridge_shell','fridge-interior','实际打包实时模型：长按冰箱壳体查看层板、抽屉、食材、温控与门封，非离线渲染'],
  ['profile','part_monster_character','mascot-detail','实际打包实时模型：长按小怪查看毛束、面部和饭碗，非生图参考']
 ]){
  await frame.evaluate(s=>lobbyState.switchRoom(s),room);
  const point=await frame.evaluate(name=>{const root=lobbyState.model.getObjectByName(name),mesh=root.getObjectByProperty('isMesh',true);mesh.geometry.computeBoundingBox();const box=new mesh.geometry.boundingBox.constructor().setFromObject(root),v=box.getCenter(lobbyState.camera.position.clone()).project(lobbyState.camera),r=document.querySelector('#scene').getBoundingClientRect();return {x:r.x+(v.x*.5+.5)*r.width,y:r.y+(-v.y*.5+.5)*r.height,camera:lobbyState.camera.position.toArray()}},part);
  await page.mouse.move(outer.x+point.x,outer.y+point.y);await page.mouse.down();await page.waitForTimeout(680);await page.mouse.up();
  check(name+' long hold zooms actual model while preserving native lobby',await frame.evaluate(v=>lobbyState.camera.position.toArray().some((n,i)=>Math.abs(n-v[i])>.1),point.camera)&&await page.evaluate(()=>__lobbyHost.state.visible));
  await page.waitForTimeout(2300);await shot(name,purpose);await frame.locator('#reset').click();
 }
 // Rapid selection must serialize decoding and retain only the last selected room.
 await frame.evaluate(()=>Promise.all(['meals','pantry','recipes','community','profile'].map(s=>lobbyState.switchRoom(s))));
 await frame.waitForFunction(()=>lobbyState.ready&&lobbyState.scene==='profile',{},{timeout:60000});
 check('Rapid scene switches finish at last selection',await frame.evaluate(()=>lobbyState.scene==='profile'));
 const allocation=await frame.evaluate(()=>lobbyState.stats);
 await frame.evaluate(()=>lobbyState.switchRoom('meals'));await frame.evaluate(()=>lobbyState.switchRoom('profile'));
 check('Scene roundtrip does not retain old GPU geometry',await frame.evaluate(n=>lobbyState.stats.geometries<=n+2,allocation.geometries));
 check('Scene roundtrip does not retain old GPU textures',await frame.evaluate(n=>lobbyState.stats.textures<=n+1,allocation.textures));
 for(const [width,height] of [[320,568],[390,844],[768,1024],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  check(`Installed lobby ${width}x${height} controls stay inside screen`,await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('#rooms button,.room-actions button,.toolbar button')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})));
  for(const room of ['meals','recipes','pantry','community','profile']){
   await frame.evaluate(s=>lobbyState.switchRoom(s),room);
   check(`${room} model fits actual ${width}x${height} camera after repeated asset disposal`,await frame.evaluate(()=>{
    const mesh=lobbyState.model.getObjectByProperty('isMesh',true);mesh.geometry.computeBoundingBox();const bounds=new mesh.geometry.boundingBox.constructor().setFromObject(lobbyState.model),point=lobbyState.camera.position.clone();let max=0;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){point.set(x,y,z).project(lobbyState.camera);max=Math.max(max,Math.abs(point.x),Math.abs(point.y))}return max<=.97;
   }));
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>platformVisibility(false));const before=await frame.evaluate(()=>lobbyState.frames);await page.waitForTimeout(250);
 check('Native background pauses child rendering',await frame.evaluate(n=>lobbyState.frames===n,before));await page.evaluate(()=>platformVisibility(true));
 check('Scene selection does not write any business rows',await page.evaluate(()=>JSON.stringify([store.state.foods,store.state.meals,store.state.favorites,store.state.plans]))===baseline);
 await frame.locator('#more').click();check('All19 canonical feature destinations exposed',await frame.locator('[data-route]').count()===19);await frame.locator('#close-drawer').click();
 await frame.evaluate(()=>lobbyState.switchRoom('recipes'));
 check('Exported recipebook retains the real draw route',await frame.evaluate(()=>lobbyState.model.getObjectByName('part_kitchen_recipebook').userData.route==='draw'));
 const book=await frame.evaluate(()=>{const part=lobbyState.model.getObjectByName('part_kitchen_recipebook');let mesh;part.traverse(o=>{if(o.isMesh&&!mesh)mesh=o});mesh.geometry.computeBoundingBox();const v=mesh.geometry.boundingBox.getCenter(mesh.position.clone()).applyMatrix4(mesh.matrixWorld).project(lobbyState.camera),r=document.querySelector('#scene').getBoundingClientRect();return {x:r.x+(v.x*.5+.5)*r.width,y:r.y+(-v.y*.5+.5)*r.height}});
 const bookOuter=await page.locator('#native-lobby iframe').boundingBox();await page.mouse.click(bookOuter.x+book.x,bookOuter.y+book.y);await frame.locator('#object-panel .object-actions button').filter({hasText:'抽一餐'}).click();await page.waitForFunction(()=>page==='draw'&&!__lobbyHost.state.visible);
 check('Actual recipebook tap and contextual draw action reach original draw screen',await page.evaluate(()=>page==='draw'));
 await page.evaluate(()=>__lobbyHost.open());await page.waitForSelector('#native-lobby iframe');const reopened=page.frames().find(f=>f.url().includes('/lobby/index.html'));await reopened.waitForFunction(()=>window.lobbyState?.ready,{timeout:60000});await reopened.locator('#simple').click();await page.waitForFunction(()=>!__lobbyHost.state.visible);
 check('Simple switch destroys frame and releases renderer',await page.locator('#native-lobby').count()===0);
 const destinations={today:'today',diary:'meals',recipes:'recipes',pantry:'pantry',shopping:'shopping',draw:'draw','meal-plan':'plans',favorites:'collections',stats:'stats','stock-history':'stockHistory',tools:'lobby-tools',settings:'mine',auth:'account','recipe-search':'recipe-search','community-search':'community-search',profile:'profile','new-meal':'meal','new-food':'food',community:'community'};
 for(const [route,target]of Object.entries(destinations)){
  await page.evaluate(()=>{draftDirty=false;busy=false});await page.evaluate(r=>__lobbyHost.destination(r),route);
  check(route+' opens existing '+target+' business page',await page.evaluate(()=>page)===target);
  check(route+' content renders without fallback',!(await page.locator('#screen').innerText()).includes('这一页暂时没打开'));
 }
 // Write through the original meal workflow, then inspect its state in the re-opened scene.
 await page.evaluate(()=>{draftDirty=false;return __lobbyHost.destination('new-meal')});
 await page.locator('[name="name"]').fill('3D入口实测午餐');await page.locator('[name="estimatedCost"]').fill('18');
 const save=page.locator('form[data-submit="meal"] button[type="submit"]');await save.click();
 await page.waitForFunction(()=>store.state.meals.some(m=>m.name==='3D入口实测午餐'),{},{timeout:30000});
 check('Meal entered from3D is stored by original LocalStore',await page.evaluate(()=>store.state.meals.some(m=>m.name==='3D入口实测午餐')));
 await page.evaluate(()=>__lobbyHost.destination('new-food'));
 await page.locator('form[data-submit="foodStart"] [name="name"]').fill('3D入库番茄');await page.locator('form[data-submit="foodStart"] button[type="submit"]').click();await page.waitForSelector('form[data-submit="food"]');
 await page.locator('form[data-submit="food"] [name="name"]').fill('3D入库番茄');await page.locator('form[data-submit="food"] [name="quantity"]').fill('2');
 await page.locator('form[data-submit="food"] button[type="submit"]').click();await page.waitForFunction(()=>store.state.foods.some(f=>f.name==='3D入库番茄'),{},{timeout:30000});
 check('Food entered from3D persists through original inventory form',await page.evaluate(()=>store.state.foods.some(f=>f.name==='3D入库番茄'&&f.quantity===2)));
 await page.evaluate(()=>{draftDirty=false;return __lobbyHost.destination('recipes')});await page.locator('[data-action="favorite"]').first().click();
 await page.waitForFunction(()=>store.state.favorites.length===1,{},{timeout:30000});check('Existing recipe heart updates same favorites store',await page.evaluate(()=>store.state.favorites.length===1));
 await page.evaluate(()=>{draftDirty=false;busy=false;return __lobbyHost.open()});await page.waitForFunction(()=>document.querySelector('#native-lobby iframe')?.contentWindow?.location.pathname==='/lobby/index.html');let next=page.frames().find(f=>f.url().includes('/lobby/index.html'));await next.waitForFunction(()=>window.lobbyState?.ready,{timeout:60000});
 await next.waitForFunction(()=>lobbyState.snapshot.mealCount===1,{},{timeout:30000});check('Reopened lobby sees the same real meal',await next.evaluate(()=>lobbyState.snapshot.mealCount===1));
 check('Reopened lobby reads actual food and favorite counts',await next.evaluate(()=>lobbyState.snapshot.foodCount===1&&lobbyState.snapshot.favoriteCount===1));
 await next.evaluate(()=>lobbyState.switchRoom('meals'));
 check('Live paper journal receives the real meal summary from the original store',await next.evaluate(()=>lobbyState.snapshot.mealSummaries.some(s=>s.includes('3D入口实测午餐'))&&lobbyState.model.getObjectByName('LiveMealJournal').material.map.image.width===768));
 const journal=await next.evaluate(()=>{const root=lobbyState.model.getObjectByName('LiveMealJournal'),mesh=root;mesh.geometry.computeBoundingBox();const v=mesh.geometry.boundingBox.getCenter(lobbyState.camera.position.clone()).applyMatrix4(root.matrixWorld).project(lobbyState.camera),r=document.querySelector('#scene').getBoundingClientRect();return {x:r.x+(v.x*.5+.5)*r.width,y:r.y+(-v.y*.5+.5)*r.height}});
 const journalOuter=await page.locator('#native-lobby iframe').boundingBox();await page.mouse.move(journalOuter.x+journal.x,journalOuter.y+journal.y);await page.mouse.down();await page.waitForTimeout(680);await page.mouse.up();await page.waitForTimeout(2300);await shot('live-journal','实际软件实时手账近景：由原有数据库新增的午餐快照绘制，非静态演示数据');

 await page.reload();await page.waitForFunction(()=>window.__kaifan&&__lobbyHost.state.visible);await page.waitForFunction(()=>document.querySelector('#native-lobby iframe')?.contentWindow?.location.pathname==='/lobby/index.html');next=page.frames().find(f=>f.url().includes('/lobby/index.html'));await next.waitForFunction(()=>window.lobbyState?.ready,{timeout:60000});
 check('3D preference survives whole application reload',await page.evaluate(()=>__lobbyHost.state.mode==='3d'&&__lobbyHost.state.visible));
 expectedFailure=true;await page.route('**/models/pantry.glb',r=>r.fulfill({status:503,body:'injected model failure'}));
 await next.evaluate(()=>lobbyState.switchRoom('pantry'));await next.locator('#failure').waitFor({state:'visible'});
 check('Failed model provides an actionable simple-mode fallback',await next.locator('#fallback').isVisible());
 check('Model failure does not alter saved meals',await page.evaluate(()=>store.state.meals.length===1&&store.state.meals[0].name==='3D入口实测午餐'));
 await next.locator('#fallback').click();await page.waitForFunction(()=>!document.querySelector('#native-lobby iframe')&&__lobbyHost.state.mode==='simple');await page.unroute('**/models/pantry.glb');expectedFailure=false;await page.reload();await page.waitForFunction(()=>window.__kaifan);
 check('Mode persisted in existing settings',await page.evaluate(()=>__lobbyHost.state.mode==='simple'&&!__lobbyHost.state.visible));
 const blocked=await context.newPage(),blockedErrors=[];
 blocked.on('pageerror',e=>blockedErrors.push(e.message));
 await blocked.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(/webgl/i.test(type))return null;return get.call(this,type,...args)};window.__requests=[];window.LobbyHost={dispatch(message){__requests.push(JSON.parse(message));return true}}});
 await blocked.goto(base+'/lobby/index.html');await blocked.waitForFunction(()=>window.lobbyState?.renderMode==='preview'&&document.querySelector('#scene-preview img').naturalWidth>=2000);
 await blocked.evaluate(()=>{LobbyNative.setActive(false);LobbyNative.setActive(true)});
 await blocked.locator('#zoom-in').click();await blocked.waitForTimeout(400);
 check('Unavailable WebGL shows labelled same-source zoomable preview without an invalid frame loop',blockedErrors.length===0&&await blocked.evaluate(()=>!lobbyState.ready&&lobbyState.frames===0&&lobbyState.preview.zoom>1&&document.querySelector('.preview-label').textContent==='场景预览'));
 await blocked.locator('#rooms [data-scene=pantry]').click();await blocked.waitForFunction(()=>lobbyState.scene==='pantry'&&document.querySelector('#scene-preview img').complete&&document.querySelector('#scene-preview img').naturalWidth>=2000);
 check('Preview room switch updates title and calls original native route',await blocked.evaluate(()=>{document.querySelector('#room-open').click();return __requests.some(r=>r.type==='route'&&r.value==='pantry')&&document.querySelector('#room-title').textContent==='给食材安个家'}));
 await blocked.locator('#reset').click();check('Preview reset restores fit',await blocked.evaluate(()=>lobbyState.preview.zoom===1));
 await blocked.screenshot({path:root+'/work/screenshots/lobby3d-installed-preview.png'});shots.push({path:'work/screenshots/lobby3d-installed-preview.png',kind:'screenshot',capture_tool:'playwright',purpose:'WebGL不可用环境显示明确标记的同源离线预览，非实时3D截图'});
 await blocked.locator('#simple').click();check('Unavailable WebGL offers native simple-mode action',await blocked.evaluate(()=>__requests.some(r=>r.type==='mode'&&r.value==='simple')));await blocked.close();
 check('No browser runtime errors',errors.length===0);
 check('Source and bundled renderer unchanged throughout evidence collection',JSON.stringify(startedHashes)===JSON.stringify(hashSources()));
 const report={passed:true,checks,errors,shots,scope:'Actual packaged assets in headless Chromium with SQLite host adapter and native CSP. No Harmony/Android physical-device GPU acceptance.',sourceHashes:startedHashes};
 fs.writeFileSync(root+'/work/reports/lobby3d-native-integration.json',JSON.stringify(report,null,2)+'\n');const manifest=JSON.parse(fs.readFileSync(root+'/work/artifacts.json'));const paths=new Set(shots.map(s=>s.path));manifest.files=manifest.files.filter(f=>!paths.has(f.path));manifest.files.push(...shots);fs.writeFileSync(root+'/work/artifacts.json',JSON.stringify(manifest,null,2)+'\n');console.log('ALL',checks.length);
 }catch(e){fs.writeFileSync(root+'/work/reports/lobby3d-native-integration.json',JSON.stringify({passed:false,checks,errors,error:String(e)},null,2)+'\n');throw e}finally{await browser?.close();server.close()}})();
