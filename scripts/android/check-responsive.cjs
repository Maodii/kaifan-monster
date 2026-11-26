const assert = require('assert/strict');

// Text-only scaling approximates WebSettings.textZoom without enlarging images
// or changing the CSS viewport. Native WebView behavior still needs a device.
module.exports = async function checkResponsive(page, shot) {
  const routes = ['today','recipes','community','pantry','meals','mine','filters',
    'settingsDetail','recipe','draw','plans','shopping','stats','leftovers',
    'dining-places','recipe-search','community-search','guide','workspace','batchFoods',
    'food','meal','plan','profile','account','ingredient','compare','knowledge',
    'household','migration','security','recovery','gallery','search','recent','syncStatus'];
  const scenarios = [320,360,390,430,768,1024].flatMap(width =>
    [1,1.3].map(scale => ({width,height:844,scale})));
  scenarios.push({width:844,height:390,scale:1},{width:844,height:390,scale:1.3});
  const measurements = [];
  await page.evaluate(() => {
    const first=allRecipes()[0];selected=first.id;
    window.__responsiveRecipes=store.state.recipes;
    store.state.recipes=[...store.state.recipes,Object.assign({},first,{
      name:'番茄鸡蛋搭配香煎鸡腿与时令蔬菜的家庭分享晚餐'.repeat(3),
      category:'家常分享与多配料制作分类',region:'适合一家人慢慢享用的家常风味'
    })];settings.recipeOrder='rank';
    store.state.meals[0].name='这是带有很长名称的早餐：南瓜小米粥搭配鸡蛋与蔬菜'.repeat(3);
    store.state.foods[0].name='新鲜番茄与一袋很长名字的家庭装有机蔬菜'.repeat(3);
    store.state.foods[0].tags='家庭装、已开封、冷藏、低盐、优先食用、长标签需要正确换行';
    store.state.meals[0].tags='早餐、家常、家庭分享、长标签需要正确换行';
    store.state.foods[0].notes='冷藏、已开封、家庭分享、多标签、需要优先食用';
    postList[0].payload.name='今天尝试做一份有很长标题、很多配料的家庭分享晚餐'.repeat(3);
  });
  try {
    for (const scenario of scenarios) {
      await page.setViewportSize({width:scenario.width,height:scenario.height});
      await page.evaluate(scale => document.documentElement.style.fontSize=(16*scale)+'px',scenario.scale);
      for (const route of routes) {
        await page.evaluate(route => {
          if(route==='settingsDetail')parity.settingsGroup='数据与备份';
          go(route);
        },route);
        if(route==='recipes')assert((await page.locator('.recipe-featured h3').textContent()).length>=60,'Long recipe fixture must be rendered in the measured first card');
        // Decode actual images before measuring their intrinsic dimensions.
        await page.locator('img').evaluateAll(async imgs => Promise.all(imgs.map(async img=>{
          img.loading='eager';await img.decode().catch(()=>{});
        })));
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const result=await page.evaluate(() => {
          const main=document.querySelector('main'),failures=[];
          const visible=el=>el.checkVisibility({checkVisibilityCSS:true}) && el.getClientRects().length && ![...document.querySelectorAll('details:not([open])')].some(d=>d.contains(el)&&!d.querySelector('summary')?.contains(el));
          const label=el=>el.tagName+'.'+el.className+' '+(el.textContent||el.alt||'').slice(0,55);
          for(const img of document.querySelectorAll('main img,header img,nav img')){
            if(!visible(img))continue;
            const parent=img.parentElement,pb=parent.getBoundingClientRect(),ib=img.getBoundingClientRect();
            if(getComputedStyle(img).position!=='absolute' && getComputedStyle(parent).display!=='inline' && ib.bottom>pb.bottom+2)failures.push('image exceeds container '+img.getAttribute('src'));
            if(!img.naturalWidth){failures.push('missing image '+img.src);continue;}
            const b=img.getBoundingClientRect(),s=getComputedStyle(img);
            const w=b.width-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth);
            const h=b.height-parseFloat(s.paddingTop)-parseFloat(s.paddingBottom)-parseFloat(s.borderTopWidth)-parseFloat(s.borderBottomWidth);
            if(w>0 && h>0 && Math.abs((w/h)/(img.naturalWidth/img.naturalHeight)-1)>.025)
              failures.push('image ratio '+img.getAttribute('src')+' '+w+'x'+h+' natural '+img.naturalWidth+'x'+img.naturalHeight);
          }
          // Text must fit its actual box. Intentional single-line search entries
          // and horizontal scrollers retain their documented interaction.
          for(const el of document.querySelectorAll('main h1,main h2,main h3,main p,main button,main label,main .field-label,main .recipe-meta>span,main .setting-tile span,header .recipe-toolbar-title')){
            if(!visible(el)||el.closest('.recent-meal-strip,.filter-tabs,.order-chips')||el.matches('input,select'))continue;
            const s=getComputedStyle(el),b=el.getBoundingClientRect();
            if(s.textOverflow==='ellipsis')continue;
            const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let textNode;
            while((textNode=walker.nextNode())){
              if(!textNode.textContent.trim())continue;
              const range=document.createRange();range.selectNodeContents(textNode);
              if([...range.getClientRects()].some(r=>r.width>0&&(r.left<b.left-1||r.right>b.right+1)))failures.push('text width '+label(el));
            }
            if(el.clientHeight>0 && el.scrollHeight>el.clientHeight+2)failures.push('text height '+label(el));
            if(!el.closest('.chips')&&(b.left < -1 || b.right>innerWidth+1))failures.push('outside viewport '+label(el));
          }
          // Scroll strips may extend beyond the viewport, but each label must
          // fit its own button. Page overflow checks alone cannot detect this.
          for(const button of document.querySelectorAll('.chips>button')){
            if(!visible(button))continue;
            if(button.scrollWidth>button.clientWidth+1)failures.push('squeezed chip '+button.textContent);
            if(parseFloat(getComputedStyle(button).minHeight)<44)failures.push('small chip target');
          }
          // Long recipe labels must stay above metadata, and meal labels must not
          // collide with the neighboring monetary amount even after wrapping.
          for(const card of document.querySelectorAll('.recipe-list-card')){
            const title=card.querySelector('h3'),meta=card.querySelector('.recipe-meta');
            if(title.getBoundingClientRect().bottom>meta.getBoundingClientRect().top+1)failures.push('recipe title overlaps metadata');
          }
          for(const line of document.querySelectorAll('.home-meal-line,.home-plan-line')){
            const boxes=[...line.children].map(x=>x.getBoundingClientRect());
            if(boxes.length===2){const [a,b]=boxes;if(a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1)failures.push('meal text overlaps amount');}
          }
          const header=document.querySelector('#page-header');
          if(header.getBoundingClientRect().height>innerHeight*.25 && getComputedStyle(header).position==='sticky')failures.push('large sticky header blocks reading viewport');
          const nav=document.querySelector('#nav'),actions=document.querySelector('.filter-actions');
          const footer=Math.max(nav.getBoundingClientRect().height,actions?.getBoundingClientRect().height||0);
          const clearance=parseFloat(getComputedStyle(main).paddingBottom);
          if(clearance<footer+16)failures.push('insufficient footer clearance '+clearance+'/'+footer);
          if(document.documentElement.scrollWidth>innerWidth)failures.push('page overflow '+document.documentElement.scrollWidth+'/'+innerWidth);
          if(main.getBoundingClientRect().width>781)failures.push('unbounded reading width');
          return {failures,footer,clearance,actualPage:document.body.dataset.page,navHidden:nav.hidden,navDisplay:getComputedStyle(nav).display,navHeightVariable:document.documentElement.style.getPropertyValue('--nav-height'),actionHeightVariable:document.documentElement.style.getPropertyValue('--action-height'),images:document.querySelectorAll('main img').length};
        });
        assert(!(await page.locator('main').textContent()).includes('这一页暂时没打开'),'Unrecognized route '+route);
        measurements.push({...scenario,route,...result});
        assert.deepEqual(result.failures,[],JSON.stringify({...scenario,route,...result}));
        // Four representative views only; the whole matrix has numeric evidence.
        if ((route==='today'&&scenario.width===390&&scenario.scale===1) ||
            (route==='recipes'&&scenario.width===320&&scenario.scale===1.3) ||
            (route==='mine'&&scenario.width===768&&scenario.scale===1.3) ||
            (route==='recipe'&&scenario.width===844&&scenario.scale===1.3))
        {
          if(route==='recipes')await page.locator('.recipe-featured h3').evaluate(el=>el.scrollIntoView({block:'start'}));
          await shot(`android-host-responsive-${route}-${scenario.width}-${scenario.scale}.png`,
            `响应式长文本确认 ${scenario.width}×${scenario.height} 字体${scenario.scale}倍；测试数据不持久化`,false);
        }
      }
    }
    const deviceAdaptation=await require("./check-device-adaptation.cjs")(page,shot);
    return {passed:true,deviceAdaptation,scenarios,routes,measurements,test_source_sha256:require('crypto').createHash('sha256').update(require('fs').readFileSync(__filename)).digest('hex'),
      scope:'Host Chromium text-only rem scaling, intrinsic image and text-boundary checks; not native WebView textZoom evidence.'};
  } finally {
    await page.evaluate(()=>{store.state.recipes=__responsiveRecipes;document.documentElement.style.removeProperty('font-size');});
    await page.setViewportSize({width:390,height:844});
  }
};
