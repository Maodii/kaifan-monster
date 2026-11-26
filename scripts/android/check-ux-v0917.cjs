const assert=require('assert/strict');
module.exports=async(page,shot)=>{
 const checks=[];await page.emulateMedia({reducedMotion:"no-preference"});
 await page.evaluate(async()=>{cloud.session=new C.Session();parity.authRegister=false;go('account');});
 assert.equal(await page.locator('[name="confirmation"]').count(),0);assert.equal(await page.locator('.auth-mode-footer [data-action="authMode"]').innerText(),'没有账号？注册');assert.ok(!/本地|空间/.test(await page.locator('main').innerText()));checks.push('Login is minimal with separate lower-right registration and no storage terminology');
 await page.evaluate(()=>{parity.drawOptions=null;intent='cook';go('draw');});
 assert.deepEqual(await page.evaluate(()=>({d:drawState().dishes,s:drawState().soups})),{d:1,s:0});assert.equal(await page.locator('.draw-options').getAttribute('open'),null);assert.equal(await page.locator('form[data-submit="drawFull"] button[type="submit"]').innerText(),'帮我抽一道');
 for(const width of [320,360,390,430,768]){await page.setViewportSize({width,height:760});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}await page.setViewportSize({width:390,height:844});await shot('ux-v0917-draw.png','默认一道菜，条件收纳与小怪抽餐入口',false);checks.push('Default one-dish draw with collapsed conditions fits five viewport widths');
 await page.evaluate(()=>{parity.motion=true;window.beforeDraw=JSON.stringify(drawResult);window.cancelDraw=rollFullMenu(drawState());});await page.locator('.draw-ceremony button').click();await page.evaluate(()=>cancelDraw);assert.equal(await page.evaluate(()=>JSON.stringify(drawResult)===beforeDraw),true);checks.push('Cancel draw animation leaves saved result unchanged');
 await page.evaluate(()=>{window.cancelDraw=rollFullMenu(drawState());});assert.equal(await page.evaluate(()=>handleBack()),true);await page.evaluate(()=>cancelDraw);assert.equal(await page.locator('.draw-ceremony').count(),0);checks.push('System back cancels draw without navigation or writes');
 await page.evaluate(async()=>{parity.motion=false;const o=drawState();o.dishes=2;o.soups=1;o.people=3;o.minutes=0;o.budget=0;await rollFullMenu(o);await loadSettings();go('draw');});assert.deepEqual(await page.evaluate(()=>({d:drawState().dishes,s:drawState().soups,p:drawState().people})),{d:2,s:1,p:3});assert.equal(await page.locator('form[data-submit="drawFull"] button[type="submit"]').innerText(),'帮我抽一餐');checks.push('Intentional multi-course choices persist after settings reload and get correct action label');
 for(const route of ['today','recipes','meals','pantry','mine']){await page.evaluate(r=>go(r),route);assert.equal(await page.evaluate(()=>handleBack()),false,route);}checks.push('All five root tabs delegate system Back to native exit/background');
 return {checks};
};
