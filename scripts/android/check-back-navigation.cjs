const assert=require('assert/strict'),fs=require('fs'),path=require('path');
module.exports=async function(page,shot){
 const checks=[],cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 async function swipe(x=10,y=170,dx=200,dy=0){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(400);
 }
 async function route(){return page.evaluate(()=>page);}
 await page.evaluate(()=>{draftDirty=false;go('recipes');selected=allRecipes()[0].id;go('recipe');});
 await swipe();assert.equal(await route(),'recipes');checks.push('Real Chromium touch: detail edge swipe returns to recipe list');
 await page.evaluate(()=>{scrollTo(0,620);selected=allRecipes()[0].id;go('recipe');});
 await swipe();assert.equal(await route(),'recipes');
 assert(Math.abs(await page.evaluate(()=>scrollY)-620)<4);
 checks.push('Swipe back restores the recipe-list reading offset');
 await page.evaluate(()=>{go('pantry');go('shopping');go('stockHistory');});
 await swipe();assert.equal(await route(),'shopping');await swipe();assert.equal(await route(),'pantry');
 await swipe();assert.equal(await route(),'pantry');checks.push('Nested swipe pops one level; root edge swipe does not switch to a different tab');
 for(const destination of ['leftovers','dining-places']){
  await page.evaluate(destination=>{go('mine');go(destination);},destination);
  await swipe();assert.equal(await route(),'mine');
 }
 await page.evaluate(()=>{go('recipes');go('recipe-search');selected=allRecipes()[0].id;go('recipe');});
 await swipe();assert.equal(await route(),'recipe-search');
 await page.evaluate(()=>actions('back'));assert.equal(await route(),'recipes');
 assert.equal(await page.evaluate(()=>history.length),0);
 checks.push('Tools return to their actual source; detail → search → list pops history without looping; toolbar uses the same back path');
 await page.evaluate(()=>{go('recipes');selected=allRecipes()[0].id;go('recipe');});
 // An ordinary non-control title area also supports a content right swipe.
 const heading=await page.locator('main h1,main h2').first().boundingBox();
 await swipe(80,heading.y+Math.min(heading.height/2,20),180);assert.equal(await route(),'recipes');
 checks.push('Detail content right swipe supports starts away from the edge');
 await page.evaluate(async()=>{go('pantry');await actions('foodNew');draftDirty=true;});
 await page.locator('[name="name"]').first().focus();
 await page.evaluate(()=>platformKeyboard(true));
 await swipe();assert.equal(await route(),'food');
 assert.equal(await page.evaluate(()=>document.body.classList.contains('keyboard-open')),false);
 checks.push('When keyboard is open, edge swipe closes editing before leaving the form');
 // Dialog behavior is explicitly controlled for the unsaved-draft tests.
 page.removeAllListeners('dialog');page.once('dialog',d=>d.dismiss());
 await swipe();assert.equal(await route(),'food');assert.equal(await page.evaluate(()=>draftDirty),true);
 page.once('dialog',d=>d.accept());await swipe();assert.equal(await route(),'pantry');
 page.on('dialog',d=>d.accept());checks.push('Dirty form edge swipe asks before leaving; cancel preserves draft, confirm returns once');
 await page.evaluate(()=>{go('recipes');selected=allRecipes()[0].id;go('recipe');});
 await swipe(10,190,180,200);assert.equal(await route(),'recipe');
 await swipe(10,190,25,0);assert.equal(await route(),'recipe');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:10,y:170}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:160,y:170}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 assert.equal(await route(),'recipe');checks.push('Vertical, short and cancelled touches do not navigate');
 await page.evaluate(()=>{go('pantry');});
 const chip=await page.locator('main>.chips').first().boundingBox();
 await swipe(80,chip.y+20,180);assert.equal(await route(),'pantry');checks.push('Scrollable filters retain their horizontal gesture');
 await page.evaluate(()=>{go('mine');});await page.locator('[data-action="legalHub"]').click();
 await swipe();assert.equal(await page.locator('#release-legal-panel').count(),0);assert.equal(await route(),'mine');checks.push('Edge swipe closes the legal overlay before navigating the underlying page');
 // Execute the actual JS expression embedded in Java, including Promise
 // resolution, through a mocked acknowledgement bridge (not an Android test).
 const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/java/com/kaifan/monster/MainActivity.java'),'utf8');
 const nativeScript=source.match(/web\.evaluateJavascript\("(Promise\.resolve\(\).*?)",null\);/)[1].replaceAll('"+request+"','7');
 await page.evaluate(async script=>{
  window.__realBack=window.handleBack;window.__acks=[];window.__calls=0;
  Android.finishBack=(id,handled)=>__acks.push({id,handled});
  window.handleBack=async()=>{__calls++;await new Promise(r=>setTimeout(r,60));return true;};
  (0,eval)(script);window.__immediateAcks=__acks.length;
 },nativeScript);
 assert.equal(await page.evaluate(()=>__immediateAcks),0);
 await page.waitForFunction(()=>__acks.length===1);
 assert.deepEqual(await page.evaluate(()=>__acks),[{id:7,handled:true}]);
 const duplicate=await page.evaluate(async()=>{__calls=0;const results=await Promise.all([requestAppBack(),requestAppBack()]);return {results,calls:__calls};});
 assert.equal(duplicate.calls,1);assert.deepEqual(duplicate.results,[true,true]);
 await page.evaluate(script=>{__acks=[];window.handleBack=async()=>false;(0,eval)(script);},nativeScript);
 await page.waitForFunction(()=>__acks.length===1);assert.equal(await page.evaluate(()=>__acks[0].handled),false);
 await page.evaluate(script=>{__acks=[];window.handleBack=async()=>{throw Error('injected back failure');};(0,eval)(script);},nativeScript);
 await page.waitForFunction(()=>__acks.length===1);assert.equal(await page.evaluate(()=>__acks[0].handled),true);
 await page.evaluate(()=>{window.handleBack=__realBack;go('pantry');});
 checks.push('Java-embedded JS waits for async resolution; duplicate requests pop once; only false signals app exit; failures keep the app open');
 await cdp.detach();return {checks};
};
