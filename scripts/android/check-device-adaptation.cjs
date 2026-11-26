const assert=require('assert/strict');
module.exports=async function(page,shot){
 const measurements=[];
 for(const [width,height] of [[320,740],[360,800],[393,852],[412,915],[480,800],[768,1024],[844,390],[600,420]]){
  for(const scale of [1,1.3,1.6,2]){
   await page.setViewportSize({width,height});
   await page.evaluate(scale=>{
    document.documentElement.style.removeProperty('font-size');go('pantry');
    // Text-only stress: measure first, then resize all text without changing
    // rem-based layout lengths. This approximates native WebView textZoom.
    const nodes=[...document.querySelectorAll('main *,#nav *,#page-header *')];
    const sizes=nodes.map(el=>parseFloat(getComputedStyle(el).fontSize));
    nodes.forEach((el,i)=>el.style.fontSize=sizes[i]*scale+'px');
   },scale);
   await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
   const result=await page.evaluate(()=>{
    const failures=[];
    for(const el of document.querySelectorAll('.chips>button,.pantry-tools button,.pantry-controls button,form[data-submit="pantrySearch"] button')){
     if(el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1)failures.push('clipped '+el.textContent);
     const box=el.getBoundingClientRect();
     if(box.height<44)failures.push('touch target '+el.textContent);
     const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;
     while(node=walker.nextNode()){
      if(!node.textContent.trim())continue;
      const range=document.createRange();range.selectNodeContents(node);
      if([...range.getClientRects()].some(r=>r.left<box.left-1||r.right>box.right+1))failures.push('label outside button '+el.textContent);
     }
    }
    for(const strip of document.querySelectorAll('main>.chips')){
     const buttons=[...strip.children],last=buttons.at(-1);
     strip.scrollLeft=strip.scrollWidth;
     if(last.getBoundingClientRect().right>strip.getBoundingClientRect().right+1)failures.push('last filter unreachable');
     strip.scrollLeft=0;
    }
    const controls=[...document.querySelector('.pantry-controls').children].map(x=>x.getBoundingClientRect());
    for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){
     const a=controls[i],b=controls[j];if(a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1)failures.push('overlapping controls');
    }
    if(document.documentElement.scrollWidth>innerWidth)failures.push('page overflow');
    const nav=document.querySelector('#nav').getBoundingClientRect();
    if(parseFloat(getComputedStyle(document.querySelector('main')).paddingBottom)<nav.height+16)failures.push('footer clearance');
    return {failures,navHeight:nav.height,historyHeight:document.querySelector('.pantry-tools button').getBoundingClientRect().height};
   });
   measurements.push({width,height,scale,...result});
   assert.deepEqual(result.failures,[],JSON.stringify(measurements.at(-1)));
   if((width===360&&scale===1)||(width===320&&scale===2))await shot(`android-host-pantry-adaptation-${width}-${scale}.png`,`库存适配 ${width}×${height}，全元素文字${scale}倍（宿主模拟）`,false);
  }
 }
 await page.evaluate(()=>{go('pantry');});
 await page.locator('[data-action="pantryCategory"]').last().click();
 await page.locator('[data-action="pantryLocation"]').last().click();
 await page.locator('[name="pantrySort"]').selectOption('name');
 assert.equal(await page.evaluate(()=>parity.pantrySort),'name');
 await page.locator('[data-action="batchToggle"]').click();
 assert.equal(await page.evaluate(()=>parity.batch),true);
 await page.locator('[data-action="batchToggle"]').click();
 await page.evaluate(()=>{parity.pantryCategory='全部';parity.pantryLocation='全部';parity.pantrySort='expiry';go('pantry');});
 await page.setViewportSize({width:390,height:844});
 return {passed:true,measurements,scope:'Host Chromium text-only font scaling; not native WebView/device evidence.'};
};
