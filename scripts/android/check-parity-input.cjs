const assert=require('assert/strict');
module.exports=async function(page,shot){
 const checks=[];
 const go=route=>page.evaluate(route=>{draftDirty=false;go(route,true);},route);
 const route=()=>page.evaluate(()=>__kaifan.page);
 async function swipe(dx,dy=0,options={}){
  await page.evaluate(({dx,dy,options})=>{
   const target=document.querySelector(options.selector||'#screen');
   if(!target)throw Error('Missing gesture target');
   const start={clientX:options.x??200,clientY:220};
   const dispatch=(type,touches,changedTouches)=>{const e=new Event(type,{bubbles:true});Object.assign(e,{touches,changedTouches});target.dispatchEvent(e);};
   dispatch('touchstart',options.multi?[start,start]:[start],[start]);
   if(options.cancel)dispatch('touchcancel',[],[]);
   dispatch('touchend',[],[{clientX:start.clientX+dx,clientY:start.clientY+dy}]);
  },{dx,dy,options});
  await page.waitForTimeout(60);
 }
 await go('today');await swipe(-100);assert.equal(await route(),'recipes');
 await swipe(-100);assert.equal(await route(),'meals');
 await swipe(100);assert.equal(await route(),'recipes');
 checks.push('Horizontal swipes follow the same main-tab order as Harmony');
 await go('today');await swipe(100);assert.equal(await route(),'today');
 await go('mine');await swipe(-100);assert.equal(await route(),'mine');
 checks.push('First and last tabs have no wraparound');
 await go('recipes');
 for(const [dx,dy,options] of [[-100,150,{}],[-20,0,{}],[-100,0,{multi:true}],[-100,0,{cancel:true}],[-100,0,{selector:'#main-search'}]]){
  await swipe(dx,dy,options);assert.equal(await route(),'recipes');
 }
 checks.push('Vertical scroll, short movement, pinch, cancelled gesture and controls cannot change tabs');
 await page.evaluate(()=>{draftDirty=true;});await swipe(-100);assert.equal(await route(),'recipes');
 await page.evaluate(()=>{draftDirty=false;});
 checks.push('Unsaved edits block global swipe navigation');
 await page.evaluate(()=>{selected=allRecipes()[0].id;go('recipe');});
 await swipe(100,0,{x:150,selector:'.recipe-toolbar-title'});assert.equal(await route(),'recipes');
 await page.evaluate(()=>{selected=allRecipes()[0].id;go('recipe');});
 await swipe(100,0,{x:10,selector:'.recipe-toolbar-title'});assert.equal(await route(),'recipes');
 checks.push('Subpages support content right swipe and left-edge back');
 await page.evaluate(()=>{selected=allRecipes()[0].id;go('recipe');go('mine');});
 assert.equal(await page.evaluate(()=>history.length),0);
 assert.equal(await page.evaluate(()=>handleBack()),false);assert.equal(await route(),'mine');
 checks.push('Main tabs discard stale subpage history; root back delegates to OS');
 await go('recipes');
 await page.evaluate(()=>{window.scrollTo(0,700);});
 await page.evaluate(()=>actions('go','recipes'));await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>scrollY),0);
 assert.equal(await page.locator('#nav [aria-current="page"]').getAttribute('data-value'),'recipes');
 checks.push('Active tab returns to top and exposes accessible current-page state');
 await page.evaluate(()=>actions('mealNew','午餐'));
 await page.locator('[name="name"]').fill('键盘保留测试');
 await page.evaluate(()=>platformKeyboard(true));
 assert(await page.locator('body').evaluate(el=>el.classList.contains('keyboard-open')));
 assert.equal(await page.locator('.sticky').first().evaluate(el=>getComputedStyle(el).position),'static');
 assert.equal(await page.locator('[name="name"]').inputValue(),'键盘保留测试');
 await page.evaluate(()=>platformKeyboard(false));
 assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('keyboard-open')),false);
 checks.push('IME mode frees fixed footer space without changing entered text');
 await go('recipes');
 await shot('android-host-parity-recipes.png','安卓双端对齐后的紧凑菜谱页',false);
 return {checks};
};
