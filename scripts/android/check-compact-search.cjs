const assert=require('assert/strict'),fs=require('fs'),crypto=require('crypto');
module.exports=async(page,shot)=>{
  const measurements=[];
  for(const width of [320,390,768])for(const scale of [1,1.3])for(const route of ['recipes','community']){
    await page.setViewportSize({width,height:844});
    await page.evaluate(({scale,route})=>{document.documentElement.style.fontSize=16*scale+'px';filter.search='';go(route);},{scale,route});
    const m=await page.locator('#main-search .search-entry').evaluate(button=>{
      const box=button.getBoundingClientRect(),style=getComputedStyle(button),spans=[...button.children];
      return {height:box.height,width:box.width,left:box.left,right:box.right,padding:[style.paddingTop,style.paddingRight,style.paddingBottom,style.paddingLeft],minHeight:style.minHeight,
        pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,
        children:spans.map(el=>{const b=el.getBoundingClientRect(),s=getComputedStyle(el);return {left:b.left,right:b.right,height:b.height,scrollHeight:el.scrollHeight,fontSize:parseFloat(s.fontSize)};})};
    });
    assert.equal(m.minHeight,'44px');assert.deepEqual(m.padding,['0px','12px','0px','12px']);
    assert(Math.abs(m.height-44)<1,'compact baseline at requested text scales');
    assert(Math.abs(m.width-Math.min(width*.88,480))<1,'preserved narrow entry width');
    assert(m.left>=0&&m.right<=width&&m.pageWidth<=width);
    assert(Math.abs(m.children[0].fontSize-20*scale)<.1);
    assert(Math.abs(m.children[1].fontSize-15*scale)<.1);
    for(let i=0;i<m.children.length;i++){
      const c=m.children[i];assert(c.scrollHeight<=c.height+1,'no vertical text clipping');
      assert(c.left>=m.left&&c.right<=m.right);
      if(i)assert(m.children[i-1].right<=c.left,'entry text overlaps');
    }
    measurements.push({width,scale,route,...m});
    if(width===390&&scale===1)await shot('android-host-compact-search-'+route+'.png','紧凑44px搜索入口，390px视口',false);
    await page.locator('#main-search .search-entry').click();
    assert.equal(await page.evaluate(()=>page),route==='recipes'?'recipe-search':'community-search');
    assert.equal(await page.locator(route==='recipes'?'.recipe-search-form input':'.community-search-form input').count(),1);
    await page.evaluate(()=>handleBack());assert.equal(await page.evaluate(()=>page),route);
  }
  // A stronger text-size probe demonstrates the control can actually grow.
  await page.evaluate(()=>{document.documentElement.style.fontSize='32px';go('recipes');});
  const grown=await page.locator('#main-search .search-entry').boundingBox();assert(grown.height>44);
  await page.evaluate(()=>{document.documentElement.style.removeProperty('font-size');go('mine');});
  assert.equal(await page.locator('.app-version').textContent(),'Android 0.4.4 · 10');
  await page.setViewportSize({width:390,height:844});
  return {passed:true,measurements,double_text_height:grown.height,
    test_source_sha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
    scope:'Headless host Chromium;12 scoped entry cases plus text2x growth and independent search/back navigation; not device evidence.'};
};
