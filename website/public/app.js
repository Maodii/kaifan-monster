const tabs = [...document.querySelectorAll('[data-tab]')];
// A transient failure must not leave a broken preview for the rest of the visit.
document.addEventListener('error', event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) return;
  const url = new URL(image.src);
  if (!/\/assets\/screen-(home|recipes|pantry|meals|ai)\.(webp|jpg)$/.test(url.pathname)) return;
  if (url.pathname.endsWith('.webp')) {
    url.pathname = url.pathname.replace(/\.webp$/, '.jpg');
    url.search = '';
    image.src = url.href;
  } else if (!url.searchParams.has('retry')) {
    url.searchParams.set('retry', '1');
    image.src = url.href;
  }
}, true);
const screens = {
  home: ['今日页，展示日历和三餐安排', '今天，也要好好吃饭呀。'],
  recipes: ['菜谱页，展示搜索、分类与菜谱列表', '从一道喜欢的菜开始。'],
  pantry: ['食库页，展示库存、采购和食材管理入口', '冰箱里的小事，也记得。'],
  meals: ['记餐页，展示用餐记录和新建入口', '一餐一记，都是生活。'],
  ai: ['AI 小怪对话页，展示菜谱上下文与问答入口', '小怪在呢，一起想办法。']
};
function selectTab(key, focus = false) {
  if (!screens[key]) return;
  tabs.forEach(tab => { const selected = tab.dataset.tab === key; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; if (focus && selected) tab.focus(); });
  const screen = document.querySelector('#app-screen');
  screen.src = `assets/screen-${key}.webp`;
  screen.alt = `HarmonyOS ${screens[key][0]}真实截图`;
  document.querySelector('#screen-caption').textContent = screens[key][1];
  document.querySelector('#screen-panel').setAttribute('aria-labelledby', `tab-${key}`);
  document.dispatchEvent(new CustomEvent('monster:preview'));
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab.dataset.tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (['ArrowDown', 'ArrowRight'].includes(event.key)) next = (index + 1) % tabs.length;
    if (['ArrowUp', 'ArrowLeft'].includes(event.key)) next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectTab(tabs[next].dataset.tab, true); }
  });
});
const mobileQuery = matchMedia('(max-width:760px)');
const setOrientation = () => document.querySelector('[role=tablist]').setAttribute('aria-orientation', mobileQuery.matches ? 'horizontal' : 'vertical');
mobileQuery.addEventListener('change', setOrientation); setOrientation();
document.querySelectorAll('[data-go-tab]').forEach(link => link.addEventListener('click', () => selectTab(link.dataset.goTab)));
const dialog = document.querySelector('#image-dialog');
document.querySelector('#enlarge').addEventListener('click', () => {
  const image = document.querySelector('#app-screen'); const large = dialog.querySelector('img'); large.src = image.src; large.alt = image.alt; dialog.showModal();
});
dialog.querySelector('button').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const b = dialog.getBoundingClientRect(); if(event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) dialog.close(); } });
let deck = [], current = 0, preference = 'all';
const saved = new Set();
const saveButton = document.querySelector('#save-inspiration');
function updateSaved(){const selected=saved.has(deck[current]?.name);saveButton.setAttribute('aria-pressed',String(selected));saveButton.innerHTML=selected?'<span aria-hidden="true">♥</span> 这一餐，记在心上':'<span aria-hidden="true">♡</span> 记住这道灵感';}
saveButton.addEventListener('click',()=>{const name=deck[current]?.name;if(!name)return;if(saved.has(name))saved.delete(name);else saved.add(name);updateSaved();document.dispatchEvent(new CustomEvent('monster:save'));});
document.querySelectorAll('[data-preference]').forEach(chip=>chip.addEventListener('click',()=>{preference=chip.dataset.preference;document.querySelectorAll('[data-preference]').forEach(c=>c.setAttribute('aria-pressed',String(c===chip)));document.dispatchEvent(new CustomEvent('monster:preference'));}));
const drawButton = document.querySelector('#draw-button');
drawButton.disabled = true;
fetch('assets/demo-recipes.json').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(recipes => { deck = recipes; drawButton.disabled = false; recipes.forEach(r=>{const im=new Image();im.src=r.image;}); }).catch(() => { drawButton.textContent = '灵感暂不可用，稍后再来看看'; });
drawButton.addEventListener('click', () => {
  if (deck.length < 2) return;
  const candidates=deck.map((recipe,index)=>({recipe,index})).filter(({recipe,index})=>index!==current&&(preference==='all'||(preference==='quick'?recipe.minutes<=30:recipe.minutes>30)));
  if(!candidates.length)return;
  current=candidates[Math.floor(Math.random()*candidates.length)].index;
  const recipe = deck[current]; document.querySelector('#draw-name').textContent = recipe.name;
  document.querySelector('#draw-meta').textContent = `约 ${recipe.minutes} 分钟 · 来自应用菜谱`;
  const image = document.querySelector('#draw-image'); image.src = recipe.image; image.alt = `${recipe.name}手绘图`;
  drawButton.innerHTML = '再来一道灵感 <span aria-hidden="true">⤨</span>';
  updateSaved();
  document.dispatchEvent(new CustomEvent('monster:draw'));
});

// Native details semantics, with measured-height expansion and no stale close callbacks.
const faqAnimations=new Map();
function toggleFaq(detail,open){
  detail.dataset.expanded=String(open);
  const answer=detail.querySelector('.faq-answer');faqAnimations.get(detail)?.cancel();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){detail.open=open;return;}
  const start=detail.open?answer.getBoundingClientRect().height:0;
  if(open)detail.open=true;
  const end=open?answer.scrollHeight:0;
  const animation=answer.animate([{height:`${start}px`,opacity:open?.45:1},{height:`${end}px`,opacity:open?1:0}],{duration:open?320:220,easing:open?'cubic-bezier(.16,.78,.24,1)':'cubic-bezier(.33,0,.20,1)',fill:'both'});
  faqAnimations.set(detail,animation);
  animation.finished.then(()=>{if(faqAnimations.get(detail)!==animation)return;if(!open)detail.open=false;animation.cancel();faqAnimations.delete(detail);}).catch(()=>{});
}
document.querySelectorAll('.faq-list details').forEach(detail=>detail.querySelector('summary').addEventListener('click',event=>{
  event.preventDefault();const open=detail.dataset.expanded!=='true';
  if(open)document.querySelectorAll('.faq-list details[open]').forEach(other=>{if(other!==detail)toggleFaq(other,false);});
  toggleFaq(detail,open);
}));

const progress=document.createElement('div');progress.className='nav-progress';progress.setAttribute('aria-hidden','true');document.querySelector('.header').append(progress);
const sectionIndex=document.createElement('nav');sectionIndex.className='section-index';sectionIndex.setAttribute('aria-label','页面章节');
const chapters=[['main','你好，小怪'],['features','三餐小事'],['preview','逛逛应用'],['guide','从这里开始'],['download','下载小怪'],['faq','想问小怪']];
sectionIndex.innerHTML=chapters.map(([id,title])=>`<a href="#${id}" aria-label="${title}"><span>${title}</span></a>`).join('');document.body.append(sectionIndex);
const backToTop=document.createElement('a');backToTop.className='back-to-top';backToTop.href='#';backToTop.setAttribute('aria-label','回到页面顶部');backToTop.textContent='↑';backToTop.tabIndex=-1;document.body.append(backToTop);
let scrollFrame=0;
function updateScroll(){
  scrollFrame=0;const progressValue=scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight);document.documentElement.style.setProperty('--reading-progress',String(Math.min(1,progressValue)));
  const visible=scrollY>innerHeight;backToTop.classList.toggle('is-visible',visible);backToTop.tabIndex=visible?0:-1;
  let current=0;chapters.forEach(([id],index)=>{if(document.getElementById(id).getBoundingClientRect().top<innerHeight*.45)current=index;});
  [...sectionIndex.children].forEach((link,index)=>{if(index===current)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');});
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const panel=document.querySelector('.screen-panel').getBoundingClientRect();const tilt=Math.max(-1.2,Math.min(1.2,(panel.top/innerHeight-.25)*1.4));document.querySelector('.phone').style.setProperty('--scroll-tilt',`${tilt}deg`);}
}
addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll);},{passive:true});addEventListener('resize',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll);});updateScroll();
document.querySelectorAll('.button').forEach(button=>{
  button.addEventListener('pointermove',event=>{if(!matchMedia('(pointer:fine)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches)return;const r=button.getBoundingClientRect();button.style.setProperty('--magnet-x',`${((event.clientX-r.left)/r.width-.5)*5}px`);button.style.setProperty('--magnet-y',`${((event.clientY-r.top)/r.height-.5)*4}px`);});
  button.addEventListener('pointerleave',()=>{button.style.setProperty('--magnet-x','0px');button.style.setProperty('--magnet-y','0px');});
});

// Explicit HTTPS store navigation supports AppGallery's own device routing and a web fallback.
// No automatic protocol launch or forced APK download on an unknown device.
const agent=navigator.userAgent;
const harmonyDevice=/HarmonyOS|OpenHarmony|ArkWeb/i.test(agent);
const androidDevice=/Android/i.test(agent)&&!harmonyDevice;
const iosDevice=/iPhone|iPad|iPod/i.test(agent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const embeddedBrowser=/MicroMessenger|QQ\//i.test(agent);
const storeLink=document.querySelector('#appgallery-link');
if(storeLink){
  const primary=harmonyDevice?storeLink:androidDevice?document.querySelector('#android-download'):null;
  if(primary){primary.closest('.release-card').classList.add('is-recommended');document.querySelector('#platform-hint').textContent=harmonyDevice?'鸿蒙设备，推荐从华为应用市场安装。':'安卓设备，可从官网下载 APK。';}
  if(!harmonyDevice&&!androidDevice&&!iosDevice){storeLink.target='_blank';}
  if(iosDevice)document.querySelector('#platform-hint').textContent='当前设备为 iPhone 或 iPad，可浏览介绍；安装请使用鸿蒙或安卓设备。';
  if(embeddedBrowser)document.querySelector('#download-guidance').textContent='当前为应用内浏览器。如无法跳转或下载，请点击右上角菜单，选择在系统浏览器打开。';
}
