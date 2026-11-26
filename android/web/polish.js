"use strict";
// Shared constraints and data stay in ArkTS; this module only adapts presentation.
const Polish = require("InteractionPolishCore");
const polishUI = { bookmarks:new Map(), lastRoute:"", restore:0, swipe:null };
function polishTokens(draft=false){
 const rows=Polish.filterTokens(draft?parity.filterDraft:filter);
 return rows.length?`<div class="filter-token-strip" aria-label="已选条件">${rows.map(t=>`<button data-action="polishFilterRemove" data-value="${esc(JSON.stringify([draft,t.field,t.value]))}" aria-label="取消条件：${esc(t.label)}">${esc(t.label)}<span aria-hidden="true">×</span></button>`).join("")}</div>`:"";
}
const polishRecipesView=recipesView;
recipesView=function(){
 const html=polishRecipesView();
 return html.replace('<div class="recipe-discovery-bar">',polishTokens()+'<div class="recipe-discovery-bar">').replace('<p class="hint">'+esc(F.recipeFilterSummary(filter))+'</p>','');
};
const polishFiltersView=filtersView;
filtersView=function(){
 captureFilterInputs();
 const html=polishFiltersView(),issues=Polish.filterConflicts(parity.filterDraft,dailyExclusions());
 return polishTokens(true)+issues.map(i=>`<p class="filter-issue" role="status">${esc(i)}</p>`).join("")+html;
};
const polishMealView=mealView;
mealView=function(){
 const html=polishMealView(),money=Polish.QUICK_AMOUNTS.map(n=>btn("¥"+n,"polishAmount",n)).join("");
 return html.replace('<label>这一餐费用（元）',`<div class="amount-presets" aria-label="快捷金额">${money}</div><label>这一餐费用（元）`)
  .replace('这餐感觉如何','这餐感觉如何 · '+(Polish.TASTE_FEELINGS[(mealDraft?.rating||0)-1]||'未评价'))
  .replace(/aria-label="([1-5])星"/g,(_,n)=>`aria-label="${Polish.TASTE_FEELINGS[n-1]}，${n}星"`);
};
const polishActions=actions;
actions=async function(action,value){
 if(action==='polishFilterRemove'){
  const[draft,field,tokenValue]=JSON.parse(value);
  if(draft){captureFilterInputs();parity.filterDraft=Polish.removeFilterToken(parity.filterDraft,{field,value:tokenValue});}
  else{filter=Polish.removeFilterToken(filter,{field,value:tokenValue});recipePage=1;}
  render();return;
 }
 if(action==='polishAmount'){
  const field=document.querySelector('[name="estimatedCost"]');if(!field)return;
  field.value=String(Number(value));field.dispatchEvent(new Event('input',{bubbles:true}));rememberMealForm();return;
 }
 if(action==='filterApply'&&Polish.filterConflicts(parity.filterDraft,dailyExclusions()).length){toast('先调整相互冲突的条件');return;}
 return polishActions(action,value);
};
// Preserve exact history depth and per-tab offsets. Route changes never replay a form draft.
const polishGo=go;
go=function(next,keep=false){
 const from=page,offset=scrollY,depth=history.length;
 polishUI.bookmarks.set(from,offset);polishGo(next,keep);
 if(page===from)return;
 if(['today','recipes','pantry','meals','mine'].includes(page))history=[];
 if(history.length>depth)history[history.length-1].offset=offset;
 if(history.length>80)history.splice(0,history.length-80);
 if(['today','recipes','pantry','meals','mine'].includes(page))polishRestoreOffset(polishUI.bookmarks.get(page)||0);
};
function polishRestoreOffset(offset){
 const id=++polishUI.restore,destination=page;
 requestAnimationFrame(()=>{if(id===polishUI.restore&&destination===page)scrollTo(0,Math.max(0,offset));});
}
const polishBack=window.handleBack;
window.handleBack=function(){
 const target=history[history.length-1],from=page,result=polishBack();
 if(page!==from&&target&&page===target.page)polishRestoreOffset(target.offset||0);
 return result;
};
// Horizontal gestures on stock rows only reveal safe destinations, never delete or consume.
screen.addEventListener('pointerdown',e=>{
 if(page!=='pantry'||gestureEdge(e.clientX)||e.target.closest('button,input,select,textarea,a'))return;
 const card=e.target.closest('article.card');if(!card)return;
 const consume=card.querySelector('[data-action="consume"]');
 if(consume)polishUI.swipe={x:e.clientX,y:e.clientY,id:consume.dataset.value,pointer:e.pointerId};
});
screen.addEventListener('pointercancel',()=>polishUI.swipe=null);
screen.addEventListener('pointerup',e=>{
 const s=polishUI.swipe;polishUI.swipe=null;if(!s||e.pointerId!==s.pointer)return;
 const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.abs(dx)<80||Math.abs(dx)<Math.abs(dy)*2)return;
 if(dx<0)actions('consume',s.id).catch(e=>toast(e.message));
 else{historyState.query=store.state.foods.find(f=>f.id===s.id)?.name||'';go('stockHistory');}
});
// A single bounded undo notice; subsequent edits or an account change invalidate it.
let polishUndo=null,polishUndoTimer=0,polishUndoing=false;
function polishOfferUndo(label,task,duration=6000){
 clearTimeout(polishUndoTimer);const owner=parity.epoch;polishUndo={owner,task};
 let node=document.getElementById('polish-undo');if(!node){node=document.createElement('div');node.id='polish-undo';node.setAttribute('role','status');document.body.append(node);}
 node.replaceChildren();const text=document.createElement('span');text.textContent=label;node.append(text);
 const undo=document.createElement('button');undo.textContent='撤销';undo.onclick=async()=>{if(!polishUndo)return;const job=polishUndo;polishUndo=null;node.hidden=true;clearTimeout(polishUndoTimer);try{if(job.owner!==parity.epoch)throw Error('账号已切换');polishUndoing=true;await job.task();render();}catch(e){toast(e.message);}finally{polishUndoing=false;}};node.append(undo);
 node.hidden=false;
 polishUndoTimer=setTimeout(()=>{polishUndo=null;node.hidden=true;},duration);
}
const polishUndoActions=actions;
actions=async function(action,value){
 if(action==='favorite'){
  const before=store.state.favorites.some(f=>f.recipeId===value);const result=await polishUndoActions(action,value);
  const after=store.state.favorites.some(f=>f.recipeId===value);
  if(before!==after&&parity.motion)for(const button of document.querySelectorAll('[data-action="favorite"]')){if(button.dataset.value!==value)continue;const heart=button.querySelector('img,svg,span');if(heart){heart.getAnimations().forEach(a=>a.cancel());heart.animate([{transform:'scale(1) rotate(0deg)',offset:0},{transform:'scale(.88) rotate(4deg)',offset:.16},{transform:'scale(1.38) rotate(-12deg)',offset:.42},{transform:'scale(.96) rotate(3deg)',offset:.75},{transform:'scale(1) rotate(0deg)',offset:1}],{duration:490,easing:'cubic-bezier(.22,.7,.25,1)'});}}
  if(before!==after&&!polishUndoing)polishOfferUndo(after?'已收藏':'已取消收藏',async()=>{if(store.state.favorites.some(f=>f.recipeId===value)!==after)throw Error('收藏状态已变化');await actions('favorite',value);},4000);
  return result;
 }
 return polishUndoActions(action,value);
};
const polishSubmit=submit;
submit=async function(action){
 if(action!=='meal')return polishSubmit(action);
 const owner=parity.epoch,prior=mealDraft?.id?clone(store.state.meals.find(m=>m.id===mealDraft.id)):null,ids=new Set(store.state.meals.map(m=>m.id));
 const editorPhotos=polishPhoto.paths.slice(),editorCover=polishPhoto.cover;
 const result=await polishSubmit(action);
 if(page==='meal'||owner!==parity.epoch)return result;
 const saved=prior?store.state.meals.find(m=>m.id===prior.id):store.state.meals.find(m=>!ids.has(m.id));
 if(saved){await store.setting('photoEditor:'+saved.id,JSON.stringify({photos:editorPhotos,cover:editorCover}));const after=JSON.stringify(saved);polishOfferUndo('这一餐已保存',async()=>{const current=store.state.meals.find(m=>m.id===saved.id);if(!current||JSON.stringify(current)!==after)throw Error('记录已有后续修改，不能撤销');if(prior)await store.saveMeal(prior);else await store.deleteMeal(current);});}
 return result;
};
const polishLoadSettings=loadSettings;
loadSettings=async function(){polishUndo=null;clearTimeout(polishUndoTimer);document.getElementById('polish-undo')?.remove();polishUI.bookmarks.clear();await polishLoadSettings();};
const polishPhoto={paths:[],cover:true,key:'',owner:0};
const polishPhotoMealView=mealView;
mealView=function(){
 const html=polishPhotoMealView(),photo=photoDraft?.compressed||mealDraft?.localPhoto;
 if(!photo)return html;
 const controls=`<section class="photo-collage-tools"><div class="row">${btn('＋ 拼图照片','polishPhotoAdd','',polishPhoto.paths.length>=4?'disabled':'')}${btn(polishPhoto.cover?'完整显示':'居中裁切','polishPhotoFit')}</div>${polishPhoto.paths.length>1?'<div class="photo-order-strip">'+polishPhoto.paths.map((path,i)=>`<div><img src="${esc(path)}" alt="第${i+1}张"><div class="row">${i?btn('←','polishPhotoMove',i):''}${btn('×','polishPhotoRemove',i)}</div></div>`).join('')+'</div>':''}</section>`;
 return html.replace('</section>', '</section>'+controls);
};
async function polishComposePhoto(){
 const owner=parity.epoch,cells=require('PhotoLayoutCore').photoLayout(polishPhoto.paths.length);
 const result=await P.nativeAsync('photoCompose',{paths:polishPhoto.paths,cells,cover:polishPhoto.cover,key:polishPhoto.key+'-'+Date.now()});
 if(owner!==parity.epoch||page!=='meal')return;
 photoDraft=result;draftDirty=true;rememberMealForm();await setting('androidDraft',{page,selected,mealDraft,photoDraft,values:Object.fromEntries([...document.querySelectorAll('main form [name]')].map(el=>[el.name,el.value])),polishPhotos:polishPhoto.paths.slice(),polishCover:polishPhoto.cover});render();
}
const polishPhotoActions=actions;
actions=async function(action,value){
 if(action==='restoreDraft'&&settings.androidDraft){polishPhoto.paths=(settings.androidDraft.polishPhotos||[]).slice(0,4);polishPhoto.cover=settings.androidDraft.polishCover!==false;polishPhoto.key=String(Date.now());polishPhoto.owner=parity.epoch;}
 if(action==='mealNew'||action==='mealEdit'||action==='mealRepeat'||action==='mealPhoto'){polishPhoto.paths=[];polishPhoto.cover=true;polishPhoto.key=String(Date.now());polishPhoto.owner=parity.epoch;}
 if(['polishPhotoAdd','polishPhotoFit','polishPhotoMove','polishPhotoRemove'].includes(action)){
  if(page!=='meal')return;rememberMealForm();
  if(!polishPhoto.paths.length){const path=photoDraft?.compressed||mealDraft?.localPhoto;if(!path)return;polishPhoto.paths=[path];polishPhoto.key=String(Date.now());polishPhoto.owner=parity.epoch;}
  if(action==='polishPhotoAdd'){
   if(polishPhoto.paths.length>=4){toast('最多4张');return;}
   const owner=parity.epoch,photo=await P.nativeAsync('photo');if(owner!==parity.epoch||page!=='meal')return;polishPhoto.paths.push(photo.compressed);
  }
  if(action==='polishPhotoFit')polishPhoto.cover=!polishPhoto.cover;
  if(action==='polishPhotoMove'){const i=Number(value);if(i<=0||i>=polishPhoto.paths.length)return;[polishPhoto.paths[i-1],polishPhoto.paths[i]]=[polishPhoto.paths[i],polishPhoto.paths[i-1]];}
  if(action==='polishPhotoRemove'){const i=Number(value);if(!Number.isInteger(i)||i<0||i>=polishPhoto.paths.length||polishPhoto.paths.length<=1)return;polishPhoto.paths.splice(i,1);}
  await polishComposePhoto();return;
 }
 const result=await polishPhotoActions(action,value);
 if(action==='mealEdit'&&mealDraft?.id){const id=mealDraft.id,owner=parity.epoch;try{const saved=JSON.parse(await store.getSetting('photoEditor:'+id,'null'));if(saved&&owner===parity.epoch&&page==='meal'&&mealDraft?.id===id&&!polishPhoto.paths.length){polishPhoto.paths=(saved.photos||[]).slice(0,4);polishPhoto.cover=saved.cover!==false;render();}}catch{}}
 return result;
};
const polishPortionMealView=mealView;
mealView=function(){const m=mealDraft||{},html=polishPortionMealView();return html.replace('<section class="meal-photo">',`<input type="hidden" name="portionSize" value="${esc(m.portionSize||'normal')}"><div class="row meal-portion" aria-label="这餐份量">${[['half','半份'],['normal','常规份'],['large','大份']].map(([id,label])=>btn(label,'polishPortion',id,(m.portionSize||'normal')===id?'active':'')).join('')}</div><section class="meal-photo">`);};
const polishRememberMeal=rememberMealForm;
rememberMealForm=function(){polishRememberMeal();const field=document.querySelector('[name=portionSize]');if(field)mealDraft.portionSize=field.value;};
const polishPortionActions=actions;
actions=async function(action,value){
 if(action==='polishPortion'&&['half','normal','large'].includes(value)){rememberMealForm();mealDraft.portionSize=value;draftDirty=true;render();const field=document.querySelector('[name=portionSize]');field.dispatchEvent(new Event('input',{bubbles:true}));return;}
 return polishPortionActions(action,value);
};
const polishConsumeView=consumeView;
consumeView=function(){const html=polishConsumeView();return html.replace('<form data-submit="consume">','<form data-submit="consume"><div class="row">'+[[.25,'四分之一'],[.5,'一半'],[1,'全部']].map(([n,label])=>btn(label,'polishConsumeAmount',n)).join('')+'</div>');};
const polishConsumeActions=actions;
actions=async function(action,value){if(action==='polishConsumeAmount'){const f=store.state.foods.find(f=>f.id===selected),field=document.querySelector('[name=quantity]');if(f&&field){field.value=String(Math.round(f.quantity*Number(value)*1000)/1000);field.dispatchEvent(new Event('input',{bubbles:true}));}return;}return polishConsumeActions(action,value);};

// Tapping the active tab returns to its top without rebuilding the list or losing filters.
const compactTabActions=actions;
actions=async function(action,value){
 if(action==='go'&&value===page&&['today','recipes','meals','pantry','mine'].includes(page)){
  scrollTo({top:0,behavior:parity.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;
 }
 return compactTabActions(action,value);
};
window.platformKeyboard=function(visible){
 document.body.classList.toggle('keyboard-open',!!visible);
 if(visible)requestAnimationFrame(()=>document.activeElement?.scrollIntoView({block:'nearest',inline:'nearest'}));
};
// visualViewport also covers Android 8–10, where IME insets have no typed API.
if(window.visualViewport){
 let tallest=visualViewport.height,lastWidth=visualViewport.width;
 let orientation=screen.orientation?.angle||0;
 visualViewport.addEventListener('resize',()=>{
  const nextOrientation=screen.orientation?.angle||0;
  if(Math.abs(lastWidth-visualViewport.width)>1||nextOrientation!==orientation){
   tallest=visualViewport.height;lastWidth=visualViewport.width;orientation=nextOrientation;
  }
  tallest=Math.max(tallest,visualViewport.height);
  const editing=document.activeElement?.matches('input,textarea,select,[contenteditable]');
  platformKeyboard(!!editing&&tallest-visualViewport.height>120);
 });
 // A focus lost while rotating/resizing must not leave the bottom tabs hidden.
 document.addEventListener('focusout',()=>requestAnimationFrame(()=>{
  if(!document.activeElement?.matches('input,textarea,select,[contenteditable]'))platformKeyboard(false);
 }));
}

let drawCeremonyCancel=null;
function showDrawCeremony(ids){
 if(drawCeremonyCancel)drawCeremonyCancel();
 if(parity.motion===false||matchMedia('(prefers-reduced-motion: reduce)').matches)return Promise.resolve(true);
 return new Promise(resolve=>{
  const layer=document.createElement('section');layer.className='draw-ceremony';layer.setAttribute('role','status');layer.setAttribute('aria-label','小怪正在抽餐');
  layer.innerHTML='<div class="draw-card-stack"><i></i><i></i><article><img src="'+esc(cover(findRecipe(ids[0])))+'" alt=""><strong>摇匀好味道…</strong><span>✦ 好菜即将上桌 ✦</span></article></div><button type="button">取消</button>';
  let timer;const finish=ok=>{clearTimeout(timer);layer.remove();if(drawCeremonyCancel===cancel)drawCeremonyCancel=null;resolve(ok);},cancel=()=>finish(false);
  drawCeremonyCancel=cancel;layer.querySelector('button').onclick=cancel;document.body.append(layer);timer=setTimeout(()=>finish(true),1150);
 });
}
const drawBack=window.handleBack;window.handleBack=function(){if(drawCeremonyCancel){drawCeremonyCancel();return true;}return drawBack();};
const drawVisibility=window.platformVisibility;window.platformVisibility=function(visible){if(!visible)drawCeremonyCancel?.();return drawVisibility(visible);};
window.addEventListener('pagehide',()=>drawCeremonyCancel?.());

document.addEventListener('toggle',event=>{if(event.target.matches?.('.draw-options')){parity.drawConditionsOpen=event.target.open;document.querySelector('.draw-hero')?.classList.toggle('is-compact',event.target.open);}},true);

document.addEventListener('error',event=>{const image=event.target;if(image instanceof HTMLImageElement&&image.matches('[data-profile-avatar]')){image.removeAttribute('data-profile-avatar');image.src='media/avatar_editorial_'+(['tomato','rice','mushroom','cat'].includes(profileData?.avatarPreset)?profileData.avatarPreset:'rice')+'.png';}},true);

document.addEventListener('focusin',event=>{const field=event.target;if(!field.matches('form[data-submit="login"] input:not([type=hidden])'))return;let hint=document.getElementById('auth-context-hint');if(!hint){hint=document.createElement('p');hint.id='auth-context-hint';hint.className='auth-field-help';hint.setAttribute('role','status');field.closest('label')?.after(hint);}hint.textContent=field.name==='email'?'自定义账号，无需邮箱验证。':field.name==='confirmation'?'请与上面的密码保持一致。':field.name==='displayName'?'这个昵称会显示在你的示例主体资料中。':parity.authRegister?'至少6位，包含字母和数字。':'点“显示密码”可以检查输入。';});
document.addEventListener('focusout',event=>{if(event.target.matches('form[data-submit="login"] input')){const hint=document.getElementById('auth-context-hint');if(hint)hint.textContent=parity.authRegister?'至少6位密码，包含字母和数字。':'使用你的账号和密码登录。';}});
