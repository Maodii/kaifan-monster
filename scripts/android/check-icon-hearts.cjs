const assert=require('assert/strict'),fs=require('fs'),crypto=require('crypto');
module.exports=async(page,shot)=>{
 const measurements=[],checks=[];
 const manifest=fs.readFileSync(require('path').join(__dirname,'../../android/app/src/main/AndroidManifest.xml'),'utf8');
 await page.waitForFunction(()=>!document.getElementById('launch-reveal'));
 for(const width of [320,390,768])for(const scale of [1,1.3,2])for(const route of ['recipes','community']){
  await page.setViewportSize({width,height:844});
  await page.evaluate(({scale,route})=>{document.documentElement.style.fontSize=16*scale+'px';draftDirty=false;go(route);},{scale,route});
  await page.waitForTimeout(260);
  if(route==='community')assert.equal(await page.locator('.community-page-heading .community-search').count(),0,'Community filters must stay outside title row');
  const m=await page.locator('#main-search').evaluate(el=>{
   const b=el.getBoundingClientRect(),h=el.closest('.content-title').querySelector('h1').getBoundingClientRect();
   const ancestor=[];for(let p=el;p&&p!==document.body;p=p.parentElement)ancestor.push(getComputedStyle(p).position);
   return {width:b.width,height:b.height,left:b.left,top:b.top,center:b.y+b.height/2,titleCenter:h.y+h.height/2,titleLeft:h.left,insideMain:!!el.closest('main'),position:getComputedStyle(el).position,ancestor,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,text:el.innerText,label:el.getAttribute('aria-label'),img:el.querySelector('img').getAttribute('src')};
  });
  assert.equal(m.width,44);assert.equal(m.height,44);assert.equal(m.text,'');assert(m.label.includes(route==='recipes'?'菜谱':'社区'));
  assert(m.insideMain&&!m.ancestor.some(p=>['fixed','sticky'].includes(p)));assert(m.pageWidth<=width);assert(m.left>=0&&m.titleLeft>=m.left+44);
  assert(Math.abs(m.center-m.titleCenter)<1,JSON.stringify({width,scale,route,...m}));assert.equal(await page.locator('body>#main-search').count(),0);
  await page.evaluate(()=>window.scrollBy(0,150));
  const scroll=await page.evaluate(()=>scrollY);const moved=await page.locator('#main-search').boundingBox();
  assert(Math.abs(m.top-moved.y-scroll)<1,'Search icon moves with document scroll');
  await page.evaluate(()=>scrollTo(0,0));
  await page.locator('#main-search').click();assert.equal(await page.evaluate(()=>page),route==='recipes'?'recipe-search':'community-search');
  const name=route==='recipes'?'.recipe-search-form input':'.community-search-form input';await page.locator(name).fill(route==='recipes'?'番茄':'早餐');
  await page.evaluate(()=>handleBack());assert.equal(await page.evaluate(()=>page),route);
  measurements.push({width,scale,route,...m,scroll});
  if(width===390&&scale===1)await shot('android-host-icon-hearts-'+route+'.png','内容内44px搜索图标与红心',false);
 }
 checks.push('18 width/text-scale/route cases:44px content icon, aligned title, scrolls away, no bar, correct independent search/back');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.documentElement.style.removeProperty('font-size');filter=new F.RecipeFilterOptions();filterOnlyFav=false;parity.library=true;go('recipes');});
 const first=page.locator('.recipe-list-card .favorite-heart').first();const id=await first.getAttribute('data-value');
 const initial=await page.evaluate(id=>store.state.favorites.some(f=>f.recipeId===id),id);
 const initialCount=await first.locator('small').innerText();assert(/^\d+$/.test(initialCount));
 async function heart(){
  const b=await first.boundingBox();assert(b.width>=44&&b.height>=44);
  const data=await first.evaluate(el=>({text:el.innerText,label:el.getAttribute('aria-label'),pressed:el.getAttribute('aria-pressed'),color:getComputedStyle(el.querySelector('span')).color}));
  assert(!data.text.includes('收藏'));assert(data.label.includes('收藏'));assert.equal(data.color,'rgb(183, 68, 78)');return data;
 }
 assert.equal((await heart()).pressed,String(initial));await first.click();
 await page.waitForFunction(({id,initial})=>store.state.favorites.some(f=>f.recipeId===id)!==initial,{id,initial});
 assert.equal((await heart()).pressed,String(!initial));assert.equal(await first.locator('small').innerText(),initialCount);
 const scrolling=page.locator('.recipe-list-card .favorite-heart').nth(5);const scrollId=await scrolling.getAttribute('data-value');
 const savedScroll=await page.evaluate(id=>store.state.favorites.some(f=>f.recipeId===id),scrollId);
 await scrolling.scrollIntoViewIfNeeded();
 const beforeScroll=await page.evaluate(()=>{window.__heartKeepNode=document.querySelectorAll('.recipe-list-card .favorite-heart')[5];return {y:scrollY,ids:[...document.querySelectorAll('.recipe-list-card .favorite-heart')].map(el=>el.dataset.value),starts:androidMotion.snapshot().routeStarts};});
 await scrolling.click();await page.waitForFunction(({id,saved})=>store.state.favorites.some(f=>f.recipeId===id)!==saved,{id:scrollId,saved:savedScroll});
 assert.equal(await page.evaluate(()=>page),'recipes');assert.equal(await scrolling.evaluate(el=>el===window.__heartKeepNode),true);
 assert(Math.abs(await page.evaluate(()=>scrollY)-beforeScroll.y)<1);assert.deepEqual(await page.locator('.recipe-list-card .favorite-heart').evaluateAll(els=>els.map(el=>el.dataset.value)),beforeScroll.ids);
 assert.equal(await page.evaluate(()=>androidMotion.snapshot().routeStarts),beforeScroll.starts);
 await scrolling.click();await page.waitForFunction(({id,saved})=>store.state.favorites.some(f=>f.recipeId===id)===saved,{id:scrollId,saved:savedScroll});
 await page.reload();await page.waitForFunction(()=>window.__kaifan);await page.evaluate(()=>go('recipes'));
 assert.equal((await heart()).pressed,String(!initial));await first.focus();await page.keyboard.press('Enter');
 await page.waitForFunction(({id,initial})=>store.state.favorites.some(f=>f.recipeId===id)===initial,{id,initial});assert.equal((await heart()).pressed,String(initial));
 checks.push('List heart44px,red outline/filled state, stable list DOM/order/scroll with no detail navigation, real favorite and undo, SQLite reload persistence, keyboard operation, accessible label and count retained');
 // Make one known favorite temporarily so filtered results are observable, then restore it.
 if(!initial)await page.evaluate(id=>actions('favorite',id),id);
 const entry=page.locator('[data-action=favOnly]');assert(!/收藏/.test(await entry.innerText()));assert((await entry.getAttribute('aria-label')).includes('收藏'));
 await entry.click();assert.equal(await entry.getAttribute('aria-pressed'),'true');assert(await page.evaluate(()=>filteredRecipes().every(r=>store.state.favorites.some(f=>f.recipeId===r.id))));
 await page.locator('.recipe-list-card .favorite-heart[data-value="'+id+'"]').click();
 await page.waitForFunction(id=>!store.state.favorites.some(f=>f.recipeId===id),id);
 assert.equal(await page.locator('.recipe-list-card .favorite-heart[data-value="'+id+'"]').count(),0);assert.equal(await page.evaluate(()=>filterOnlyFav),true);
 await entry.click();assert.equal(await entry.getAttribute('aria-pressed'),'false');if(initial)await page.evaluate(id=>actions('favorite',id),id);
 checks.push('Heart-only favorite filter preserves selected semantics, count, immediate removal after unfavorite within filter, and cancel-filter behavior');
 await page.evaluate(id=>actions('recipe',id),id);assert.equal(await page.evaluate(()=>page),'recipe');
 assert.equal(await page.locator('header [data-action=favorite]').evaluate(el=>getComputedStyle(el).color),'rgb(183, 68, 78)');
 assert(!/收藏/.test(await page.locator('.recipe-secondary-actions [data-action=favorite]').innerText()));
 await page.evaluate(()=>go('recipes'));await page.waitForTimeout(400);assert.deepEqual(await page.evaluate(()=>androidMotion.snapshot().active),[]);
 assert.equal(await page.evaluate(id=>store.state.favorites.some(f=>f.recipeId===id),id),initial);
 await page.evaluate(()=>go('mine'));assert.equal(await page.locator('.app-version').innerText(),'Android '+manifest.match(/android:versionName="([^"]+)"/)[1]+' · '+manifest.match(/android:versionCode="(\d+)"/)[1]);
 checks.push('Detail red hearts, unchanged recipe route, finite motion cleanup and manifest-derived version');
 return {passed:true,measurements,checks,test_source_sha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),scope:'Targeted Chromium + real host SQLite checks; not full business rerun or physical Android verification'};
};
