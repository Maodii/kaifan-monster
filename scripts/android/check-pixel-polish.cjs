const assert=require('assert/strict'),fs=require('fs'),crypto=require('crypto');

module.exports=async function checkPixelPolish(page,shot){
  const controls=[],walkthrough=[];
  await page.evaluate(()=>{
    window.__pixelFixture={foods:store.state.foods,meals:store.state.meals,plans:store.state.plans,shopping:store.state.shopping,posts:postList,date,settings:{...settings},selected,profileLocal:parity.profileLocal};
    date=M.dateString(new Date());selected=allRecipes()[0].id;settings.statsSpan='week';parity.profileLocal={...parity.profileLocal,displayName:'今天也想好好吃饭的小怪朋友'.repeat(3)};
    store.state.meals=[['小米南瓜粥配鸡蛋','早餐',6.5],['番茄鸡蛋搭配香煎鸡腿与一份时令蔬菜','午餐',28.8],['一家人的周末分享餐','晚餐',1288.55]].map(([name,mealType,estimatedCost],i)=>Object.assign(new M.Meal(),{id:crypto.randomUUID(),name,mealType,date:date+'T'+String([8,12,19][i]).padStart(2,'0')+':00:00',estimatedCost,costType:i===2?'实付':'估算',diningMode:'在家做',recipeId:allRecipes()[0].id,tags:'家常、家庭分享、均衡饮食'}));
    store.state.foods=[['小番茄（晚餐和第二天早餐备用）',3,'个'],['新鲜鸡蛋',6,'个']].map(([name,quantity,unit],i)=>Object.assign(new M.Food(),{id:crypto.randomUUID(),name,category:i?'蛋奶':'蔬菜',quantity,unit,expiryDate:D.shiftDay(date,i+1),location:'冷藏',estimatedPrice:12.8}));
    store.state.shopping=[['周末早餐用的小番茄与一盒鸡蛋',6,'个',false],['家用大米',500,'g',true]].map(([name,quantity,unit,purchased])=>Object.assign(new M.Shopping(),{id:crypto.randomUUID(),name,quantity,unit,purchased,category:'蔬菜'}));
    store.state.plans=[Object.assign(new(require('MealPlan').MealPlan)(),{id:crypto.randomUUID(),date,occasion:'晚餐',recipeId:allRecipes()[0].id,people:2})];
    postList=[{id:'pixel-post',demo_data:true,status:'approved',author_name:'小怪厨房',photoUrl:'media/recipe_tomato_eggs.webp',payload:{name:'把一份普通番茄炒蛋，做成今天想吃的晚餐',notes:'先把鸡蛋盛出，慢慢炒软番茄。留一点汤汁拌饭。'}}];
  });
  for(const width of [320,390,768])for(const scale of [1,1.3]){
    await page.setViewportSize({width,height:844});
    await page.evaluate(scale=>{document.documentElement.style.fontSize=16*scale+'px';settings.quickstartDone=true;draftDirty=false;},scale);
    for(const route of ['recipes','community']){
      await page.evaluate(route=>go(route),route);
      await page.locator('#main-search img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
      const measured=await page.locator('#main-search .search-entry').evaluate(button=>{
        const b=button.getBoundingClientRect(),children=[...button.children].map(el=>{
          const r=el.getBoundingClientRect();return {centerY:r.top+r.height/2,height:r.height,left:r.left,right:r.right};
        });
        return {height:b.height,centerY:b.top+b.height/2,children,width:b.width,viewport:innerWidth,pageWidth:document.documentElement.scrollWidth};
      });
      assert.equal(measured.height,44);
      for(const c of measured.children)assert(Math.abs(c.centerY-measured.centerY)<.6,'Search children must share the button center line');
      assert(measured.pageWidth<=width);
      await page.locator('#main-search .search-entry').click();assert.equal(await page.evaluate(()=>page),route==='recipes'?'recipe-search':'community-search');
      await page.evaluate(()=>handleBack());assert.equal(await page.evaluate(()=>page),route);
      controls.push({width,scale,route,...measured});
    }
    await page.evaluate(()=>go('recipes'));
    const plate=await page.locator('.draw-entry').evaluate(async button=>{
      const b=button.getBoundingClientRect(),label=button.querySelector('.draw-entry-content>span').getBoundingClientRect();
      const image=new Image();image.src=getComputedStyle(button,'::before').backgroundImage.match(/url\(["']?(.*?)["']?\)/)[1];await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      const left=Math.floor((label.left-b.left)/b.width*canvas.width),right=Math.ceil((label.right-b.left)/b.width*canvas.width);
      const top=Math.floor((label.top-b.top)/b.height*canvas.height),bottom=Math.ceil((label.bottom-b.top)/b.height*canvas.height);
      let painted=0,total=0,alphaSum=0,opaque=0;for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){total++;const a=pixels[(y*canvas.width+x)*4+3];alphaSum+=a;if(a>9)painted++;if(a>96)opaque++;}
      return {width:b.width,height:b.height,paintedFraction:painted/total,meanAlpha:alphaSum/total/255,strongPaintFraction:opaque/total,labelInsets:{left:label.left-b.left,right:b.right-label.right,top:label.top-b.top,bottom:b.bottom-label.bottom},background:getComputedStyle(button,'::before').backgroundSize};
    });
    // The canonical white-matte extraction intentionally preserves translucent pigment.
    // Test actual pigment coverage and mean opacity separately instead of treating translucency as a hole.
    assert(plate.paintedFraction>.95&&plate.meanAlpha>.3,'Crayon plate must actually paint behind the text, including source transparency: '+JSON.stringify(plate));
    assert(plate.labelInsets.right>=16&&plate.labelInsets.left>=16);
    assert(plate.labelInsets.top>=8&&plate.labelInsets.bottom>=8);
    controls.push({width,scale,route:'draw-entry',...plate});
    await page.locator('.draw-entry').click();assert.equal(await page.evaluate(()=>page),'draw');
  }
  const balanceSwitch=page.locator('input[name="drawBalanced"]');
  assert.equal(await balanceSwitch.getAttribute('role'),'switch');
  const originalBalance=await balanceSwitch.isChecked();
  await balanceSwitch.focus();await balanceSwitch.press('Space');
  assert.equal(await balanceSwitch.isChecked(),!originalBalance);
  await balanceSwitch.press('Space');assert.equal(await balanceSwitch.isChecked(),originalBalance);
  const switchStyle=await balanceSwitch.evaluate(el=>({appearance:getComputedStyle(el).appearance,width:el.getBoundingClientRect().width,track:getComputedStyle(el).borderRadius,thumb:getComputedStyle(el,'::before').content}));
  assert.equal(switchStyle.appearance,'none');assert.equal(switchStyle.width,48);assert.notEqual(switchStyle.thumb,'none');
  controls.push({route:'draw',control:'balance-switch',keyboardToggle:true,...switchStyle});
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{document.documentElement.style.removeProperty('font-size');go('recipes');});
  await shot('android-host-pixel-polish-recipes.png','搜索图标/文本/按钮中心线与完整蜡笔plate承托确认',false);
  const routes=['today','recipes','draw','filters','recipe','guide','community','meal','pantry','shopping','mine','profile','account','plans','stats'];
  for(const scenario of [{width:390,height:844,scale:1},{width:320,height:844,scale:1.3},{width:768,height:844,scale:1.3},{width:844,height:390,scale:1.3},{width:320,height:844,scale:2}]){
    await page.setViewportSize({width:scenario.width,height:scenario.height});
    await page.evaluate(scale=>document.documentElement.style.fontSize=16*scale+'px',scenario.scale);
    for(const route of routes){
      await page.evaluate(route=>{draftDirty=false;go(route);},route);
      await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(async img=>{img.loading='eager';await img.decode().catch(()=>{});}))); 
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const result=await page.evaluate(()=>{
        const punctuationInk=[],failures=[],visible=el=>el.checkVisibility({checkVisibilityCSS:true})&&![...document.querySelectorAll('details:not([open])')].some(d=>d.contains(el)&&!d.querySelector('summary')?.contains(el));
        for(const el of document.querySelectorAll('main h1,main h2,main h3,main p,main label,main button,main .field-label')){
          if(!visible(el)||el.closest('.chips,.recent-meal-strip,.order-chips'))continue;
          const b=el.getBoundingClientRect();if(b.left<-1||b.right>innerWidth+1)failures.push('outside viewport '+el.textContent.slice(0,30));
          const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){
            if(!n.textContent.trim()||getComputedStyle(n.parentElement).textOverflow==='ellipsis')continue;
            const range=document.createRange();range.selectNodeContents(n);const rects=[...range.getClientRects()];
            if(rects.some(r=>r.width>0&&(r.left<b.left-1||r.right>b.right+1))){
              // CJK closing punctuation may hang by its blank side bearing. Check visible glyph ink,
              // never exempt other text or multi-line overflow from the geometry assertion.
              let blankPunctuationOverhang=false;
              if(rects.length===1&&/[）。，、！？：；]$/.test(n.textContent.trim())){
                const style=getComputedStyle(n.parentElement),ctx=document.createElement('canvas').getContext('2d');
                ctx.font=style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
                ctx.letterSpacing=style.letterSpacing;const ink=ctx.measureText(n.textContent);
                blankPunctuationOverhang=rects[0].left-ink.actualBoundingBoxLeft>=b.left-1&&rects[0].left+ink.actualBoundingBoxRight<=b.right+1;
                if(blankPunctuationOverhang)punctuationInk.push({text:n.textContent,boxRight:b.right,advanceRight:rects[0].right,inkRight:rects[0].left+ink.actualBoundingBoxRight});
              }
              if(!blankPunctuationOverhang)failures.push('text width '+n.textContent.slice(0,30)+' '+JSON.stringify({left:b.left,right:b.right,rects:rects.map(r=>({left:r.left,right:r.right}))}));
            }
          }
          if(el.clientHeight&&el.scrollHeight>el.clientHeight+2)failures.push('text height '+el.textContent.slice(0,30));
        }
        for(const img of document.querySelectorAll('main img,nav img,header img')){
          if(!visible(img))continue;if(!img.naturalWidth){failures.push('image missing '+img.src);continue;}
          const b=img.getBoundingClientRect(),s=getComputedStyle(img),w=b.width-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth),h=b.height-parseFloat(s.paddingTop)-parseFloat(s.paddingBottom)-parseFloat(s.borderTopWidth)-parseFloat(s.borderBottomWidth);
          if(w&&h&&Math.abs((w/h)/(img.naturalWidth/img.naturalHeight)-1)>.025)failures.push('image ratio '+img.src);
        }
        for(const card of document.querySelectorAll('.recipe-list-card'))if(card.querySelector('h3').getBoundingClientRect().bottom>card.querySelector('.recipe-meta').getBoundingClientRect().top+1)failures.push('title/metadata overlap');
        let recipeDensity=null;const firstRecipe=document.querySelector('.recipe-list-card');
        if(firstRecipe){const image=firstRecipe.querySelector('.recipe>img').getBoundingClientRect(),text=firstRecipe.querySelector('.recipe>div').getBoundingClientRect(),card=firstRecipe.getBoundingClientRect();recipeDensity={height:card.height,imageWidth:image.width,imageRight:image.right,textLeft:text.left};
          if(text.left<image.right-1)failures.push('recipe list lost horizontal image/text');
          if(image.width>104)failures.push('recipe list artwork too large');
          if(innerWidth===390&&parseFloat(getComputedStyle(document.documentElement).fontSize)===16&&card.height>210)failures.push('recipe list first card too tall');
        }

        for(const row of document.querySelectorAll('.home-meal-line,.home-plan-line,.stats-tag')){
          const boxes=[...row.children].map(x=>x.getBoundingClientRect());if(boxes.length===2){const[a,b]=boxes;if(a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1)failures.push('name/amount overlap');}
        }
        const photo=document.querySelector('.meal-photo-actions');
        if(photo){const b=photo.getBoundingClientRect();if(parseFloat(getComputedStyle(document.documentElement).fontSize)<=20.8&&b.height>54)failures.push('empty meal photo row too tall');if(photo.querySelectorAll('button').length!==2)failures.push('photo actions missing');}
        const money=document.querySelector('.meal-money-field');if(money){const p=money.querySelector('span').getBoundingClientRect(),i=money.querySelector('input').getBoundingClientRect();if(Math.abs((p.top+p.height/2)-(i.top+i.height/2))>1)failures.push('currency prefix not centered');}
        const stars=[...document.querySelectorAll('.meal-rating-stars button')].filter(visible);
        if(stars.length){const widths=stars.map(el=>el.getBoundingClientRect().width);if(Math.max(...widths)-Math.min(...widths)>1)failures.push('rating slots unequal');if(stars.some(el=>el.getBoundingClientRect().height<44))failures.push('rating target too short');}
        const h1=document.querySelector('main h1');for(const tool of document.querySelectorAll('.community-search,.meal-tools,.living-week,.nutrition-week'))if(visible(tool)&&h1&&h1.getBoundingClientRect().top>tool.getBoundingClientRect().top)failures.push('tools precede page title');
        const footer=Math.max(document.querySelector('#nav').getBoundingClientRect().height,document.querySelector('.filter-actions')?.getBoundingClientRect().height||0),padding=parseFloat(getComputedStyle(document.querySelector('main')).paddingBottom);
        if(padding<footer+16)failures.push('footer clearance');if(document.documentElement.scrollWidth>innerWidth)failures.push('page width');
        const activeButtons=[...document.querySelectorAll('.draw-presets button,.filter-actions button,.shopping-item button,.pantry-tools button,.settings-grid button')].filter(visible);
        if(activeButtons.some(b=>b.getBoundingClientRect().height<43))failures.push('small action target');
        return {failures,punctuationInk,recipeDensity,footer,padding,pageWidth:document.documentElement.scrollWidth,title:h1?.textContent,actions:activeButtons.length};
      });
      if(result.failures.length){await page.locator('main input[name=budget]').evaluateAll(es=>es.forEach(e=>e.scrollIntoView({block:'center'})));await shot('android-host-pixel-polish-diagnostic.png','布局失败定位，修复后清理',false);}
      walkthrough.push({...scenario,route,...result});assert.deepEqual(result.failures,[],JSON.stringify({...scenario,route}));
      if(scenario.width===390&&scenario.scale===1&&['draw','meal','profile'].includes(route))await shot('android-host-pixel-polish-'+route+'.png','逐页美术排版走查：'+route+'；内存展示夹具，无数据写入',false);
    }
  }
  await page.evaluate(()=>{const a=__pixelFixture;store.state.foods=a.foods;store.state.meals=a.meals;store.state.plans=a.plans;store.state.shopping=a.shopping;postList=a.posts;date=a.date;settings=a.settings;selected=a.selected;parity.profileLocal=a.profileLocal;document.documentElement.style.removeProperty('font-size');});
  await page.setViewportSize({width:390,height:844});
  return {passed:true,controls,walkthrough,test_source_sha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),scope:'Source presentation-only host Chromium checks;15 pages ×5 width/text scenarios plus actual crayon alpha and center-line measurements; not Android device evidence.'};
};
