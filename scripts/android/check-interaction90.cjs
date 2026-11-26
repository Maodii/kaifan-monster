const assert=require('assert/strict');
module.exports=async function(page,shot){
 const checks=[];async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
 await check('Filter chips remove one constraint without mutating the input or protected preferences',async()=>{
  assert(await page.evaluate(()=>{const f=Object.assign(new F.RecipeFilterOptions(),{ingredients:['番茄'],excludedIngredients:['花生'],maxMinutes:30,maxCost:20});const tokens=Polish.filterTokens(f),next=Polish.removeFilterToken(f,tokens.find(t=>t.field==='maxMinutes'));return f.maxMinutes===30&&next.maxMinutes===0&&next.maxCost===20&&next.excludedIngredients[0]==='花生'&&next.ingredients[0]==='番茄';}));
 });
 await check('All filter dimensions have independently removable tokens',async()=>{
  assert(await page.evaluate(()=>{const f=Object.assign(new F.RecipeFilterOptions(),{occasions:['lunch'],categories:['家常菜'],regions:['四川'],cuisines:['sichuan'],tastes:['麻辣'],goals:['高蛋白'],ingredients:['番茄'],excludedIngredients:['花生'],difficulties:['简单'],minCost:1,maxCost:50,maxMinutes:60,availability:'partial',search:'鸡肉'});const rows=Polish.filterTokens(f);return rows.length===14&&rows.every(t=>Polish.filterTokens(Polish.removeFilterToken(f,t)).length===13);}));
 });
 await check('Budget contradiction and hard dietary conflicts are explicit; any-ingredient mode remains valid',async()=>{
  assert(await page.evaluate(()=>{const f=Object.assign(new F.RecipeFilterOptions(),{minCost:40,maxCost:20,ingredients:['花生'],excludedIngredients:['花生']});return Polish.filterConflicts(f).length===2&&Polish.filterConflicts({...f,minCost:0,ingredients:['花生','番茄'],ingredientMode:'any'}).length===0&&Polish.filterConflicts({...f,minCost:0,excludedIngredients:[]},['花生']).length===1;}));
 });
 await check('Photo grids remain within1200pixels with deterministic reading order and a real gutter',async()=>{
  assert(await page.evaluate(()=>{const L=require('PhotoLayoutCore');for(let n=1;n<=4;n++){const cells=L.photoLayout(n);if(cells.length!==n||!cells.every(c=>c.x>=0&&c.y>=0&&c.x+c.width<=1200&&c.y+c.height<=1200))return false;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const a=cells[i],b=cells[j];if(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y)return false;}}for(const n of [0,5,1.5]){try{L.photoLayout(n);return false;}catch{}}return true;}));
 });
 await check('Rendered applied filter tokens can be removed without resetting another dimension',async()=>{
  await page.evaluate(()=>{draftDirty=false;filter=Object.assign(new F.RecipeFilterOptions(),{maxMinutes:30,maxCost:20});go('recipes');});
  await page.locator('.filter-token-strip button').filter({hasText:'30分钟内'}).click();
  assert.deepEqual(await page.evaluate(()=>[filter.maxMinutes,filter.maxCost]),[0,20]);
 });
 await check('Draft conflicts stop apply and retain all previous live filters',async()=>{
  await page.evaluate(()=>{go('filters');parity.filterDraft=Object.assign(new F.RecipeFilterOptions(),{minCost:50,maxCost:10});render();});
  assert((await page.locator('.filter-issue').textContent()).includes('最低预算'));
  await page.evaluate(()=>actions('filterApply',''));assert.equal(await page.evaluate(()=>page),'filters');assert.equal(await page.evaluate(()=>filter.maxCost),20);
  await shot('android-host-interaction90-filters.png','可逐项取消的条件与预算冲突提示');
 });
 await check('Cancelling a draft never applies its conditions',async()=>{
  await page.evaluate(()=>window.handleBack());assert.equal(await page.evaluate(()=>filter.maxCost),20);
 });
 await check('Main-tab browsing position is restored after switching tabs',async()=>{
  await page.evaluate(()=>{filter=new F.RecipeFilterOptions();go('recipes');scrollTo(0,500);});
  await page.evaluate(()=>go('today'));await page.evaluate(()=>go('recipes'));await page.waitForTimeout(100);
  assert(Math.abs(await page.evaluate(()=>scrollY)-500)<4);
 });
 await check('Recipe details return to the exact prior recipe-list offset',async()=>{
  await page.evaluate(()=>{scrollTo(0,620);selected=allRecipes()[0].id;go('recipe');});
  await page.evaluate(()=>window.handleBack());await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>page),'recipes');assert(Math.abs(await page.evaluate(()=>scrollY)-620)<4);
 });
 await check('Favorite undo restores the original state through the real store',async()=>{
  const id=await page.evaluate(()=>allRecipes()[0].id);await page.evaluate(id=>actions('favorite',id),id);
  assert(await page.locator('#polish-undo').isVisible());await page.locator('#polish-undo button').filter({hasText:'撤销'}).click();
  await page.waitForFunction(id=>!store.state.favorites.some(f=>f.recipeId===id),id);
 });
 await check('Undo refuses stale favorite state rather than toggling a later change',async()=>{
  const id=await page.evaluate(()=>allRecipes()[0].id);await page.evaluate(id=>actions('favorite',id),id);await page.evaluate(id=>store.favorite(id),id);
  await page.locator('#polish-undo button').filter({hasText:'撤销'}).click();assert(!(await page.evaluate(id=>store.state.favorites.some(f=>f.recipeId===id),id)));assert((await page.locator('#toast').textContent()).includes('状态已变化'));
 });
 await check('Quick amount changes the actual meal form value and accessible rating labels are specific',async()=>{
  await page.evaluate(()=>{draftDirty=false;actions('mealNew','晚餐');});await page.waitForSelector('[data-action=polishAmount]');
  await page.locator('[data-action=polishAmount][data-value="20"]').click();assert.equal(await page.locator('[name=estimatedCost]').inputValue(),'20');
  assert.equal(await page.locator('[data-action=mealRating][data-value="5"]').getAttribute('aria-label'),'想再吃，5星');
  await page.evaluate(()=>scrollTo(0,0));
  await shot('android-host-interaction90-meal.png','精简记餐、快捷金额与具体评分语义');
 });
 await check('Portion selection survives saving and repeating without scaling explicit calories',async()=>{
  await page.locator('[name=name]').fill('份量独立验证');
  await page.evaluate(()=>{const f=document.querySelector('[name=calories]');f.value='600';document.querySelector('[name=consumedFraction]').value='0.5';rememberMealForm();});
  await page.locator('[data-action=polishPortion][data-value=half]').click();
  await page.evaluate(()=>submit('meal'));
  const saved=await page.evaluate(()=>store.state.meals.find(m=>m.name==='份量独立验证'));
  assert.equal(saved.portionSize,'half');assert.equal(saved.calories,300);
  await page.evaluate(id=>actions('mealRepeat',id),saved.id);
  assert.equal(await page.locator('[name=portionSize]').inputValue(),'half');
  assert.equal(await page.locator('[name=calories]').inputValue(),'600');
  await page.evaluate(()=>{draftDirty=false;actions('mealNew','晚餐');});
 });
 await check('Photo order, fit and draft use the native composition contract (host bridge mocked)',async()=>{
  await page.evaluate(async()=>{
   window.__originalPhotoBridge=P.nativeAsync;window.__photoCalls=[];
   P.nativeAsync=async(op,args)=>{if(op==='photoCompose'){window.__photoCalls.push(args);return {compressed:'photos/compose-test.jpg',original:'photos/compose-test.jpg'};}return window.__originalPhotoBridge(op,args);};
   photoDraft={compressed:'photos/a.jpg'};polishPhoto.paths=['photos/a.jpg','photos/b.jpg','photos/c.jpg'];polishPhoto.key='host-check';render();
   await actions('polishPhotoMove','2');await actions('polishPhotoFit','');
  });
  assert.deepEqual(await page.evaluate(()=>window.__photoCalls.at(-1).paths),['photos/a.jpg','photos/c.jpg','photos/b.jpg']);
  assert.equal(await page.evaluate(()=>window.__photoCalls.at(-1).cover),false);
  assert.equal(await page.evaluate(()=>settings.androidDraft.polishCover),false);
  assert.deepEqual(await page.evaluate(()=>settings.androidDraft.polishPhotos),['photos/a.jpg','photos/c.jpg','photos/b.jpg']);
  await page.evaluate(()=>{P.nativeAsync=window.__originalPhotoBridge;photoDraft=null;polishPhoto.paths=[];draftDirty=false;actions('mealNew','晚餐');});
 });
 await check('Save undo deletes exactly the newly saved meal and preserves stock',async()=>{
  const before=await page.evaluate(()=>JSON.stringify(store.state.foods));
  await page.locator('[name=name]').fill('撤销验证餐');await page.evaluate(()=>submit('meal'));
  assert(await page.evaluate(()=>store.state.meals.some(m=>m.name==='撤销验证餐')));
  await page.locator('#polish-undo button').filter({hasText:'撤销'}).click();await page.waitForFunction(()=>!store.state.meals.some(m=>m.name==='撤销验证餐'));
  assert.equal(await page.evaluate(()=>JSON.stringify(store.state.foods)),before);
 });
 await check('Stale meal undo never overwrites a later saved edit',async()=>{
  await page.evaluate(()=>actions('mealNew','午餐'));await page.locator('[name=name]').fill('后续修改');await page.evaluate(()=>submit('meal'));
  await page.evaluate(async()=>{const m=store.state.meals.find(m=>m.name==='后续修改');await store.saveMeal({...m,notes:'后来写的备注'});});
  await page.locator('#polish-undo button').filter({hasText:'撤销'}).click();assert(await page.evaluate(()=>store.state.meals.some(m=>m.name==='后续修改'&&m.notes==='后来写的备注')));
 });
 await check('Account reset clears undo and scroll bookmarks',async()=>{
  await page.evaluate(()=>loadSettings());assert.equal(await page.evaluate(()=>polishUI.bookmarks.size),0);assert.equal(await page.locator('#polish-undo').count(),0);
 });
 return {checks,scope:'Packaged Android UI and canonical ArkTS modules with isolated real SQLite; native photo compositor and device gestures require device verification'};
};
