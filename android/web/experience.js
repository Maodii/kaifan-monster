"use strict";
// Platform presentation for the next iteration. Shared entities and transactions remain canonical.
const androidExperience = { epoch: 0, syncBusy: false, lastSync: "", syncError: "", familyIds: [], familyKnown: false, supermarket: false };
const experienceLoadSettings = loadSettings;
loadSettings = async function () {
  await experienceLoadSettings();
  Object.assign(androidExperience, {epoch: androidExperience.epoch + 1, syncBusy: false, lastSync: "", syncError: "", familyIds: [], familyKnown: false, supermarket: false});
  androidExperience.lastSync = await store.getSetting("lastSync", "");
  androidExperience.familyKnown = await store.getSetting("familyIds", "") !== "";
  try { androidExperience.familyIds = JSON.parse(await store.getSetting("familyIds", "[]")); } catch {}
};
const canonicalSync = cloud.sync.bind(cloud);
cloud.sync = async function (target) {
  if (androidExperience.syncBusy) throw Error("已有同步正在进行，请稍后再试");
  const epoch = androidExperience.epoch;
  androidExperience.syncBusy = true;
  androidExperience.syncError = "";
  if (page === "syncStatus") render();
  try {
    const result = await canonicalSync(target);
    if (epoch === androidExperience.epoch) {
      androidExperience.lastSync = await target.getSetting("lastSync", "");
      androidExperience.familyIds = JSON.parse(await target.getSetting("familyIds", "[]"));
      androidExperience.familyKnown = true;
    }
    return result;
  } catch (error) {
    if (epoch === androidExperience.epoch) androidExperience.syncError = "本次同步未完成，待传记录仍保留。检查网络或重新登录后重试。";
    throw error;
  } finally {
    if (epoch === androidExperience.epoch) {
      androidExperience.syncBusy = false;
      if (page === "syncStatus") render();
    }
  }
};
function androidSyncSummary() {
  const records = new Map();
  let blocked = 0;
  for (const change of store.state.changes) {
    const key = change.entityType + ":" + change.entityId;
    let family = "";
    try { family = JSON.parse(change.payload).familyId || ""; } catch {}
    records.set(key, { change, family });
  }
  for (const {family} of records.values()) {
    if (family && androidExperience.familyKnown && !androidExperience.familyIds.includes(family)) blocked++;
  }
  const photos = store.state.meals.filter(m => m.localPhoto && m.photoStatus !== "uploaded");
  return { pending: records.size, operations: store.state.changes.length, blocked, photos, conflicts: conflicts.length };
}
function syncStatusView() {
  const s = androidSyncSummary();
  const loggedIn = !!cloud.session.accessToken;
  return heading("同步状态") +
    `<div class="card"><h2>${loggedIn ? "当前账号" : "本机访客空间"}</h2><p>${loggedIn ? "本机记录与云端账号保持独立，按需同步。" : "记录保存在本机，登录后仍保留访客空间。"}</p><dl class="sync-counts"><div><dt>待传记录</dt><dd>${s.pending}</dd></div><div><dt>待传照片</dt><dd>${s.photos.length}</dd></div><div><dt>待处理冲突</dt><dd>${s.conflicts}</dd></div><div><dt>家庭范围阻断</dt><dd>${androidExperience.familyKnown ? s.blocked : "待核对"}</dd></div></dl><p class="hint">最后完整同步：${androidExperience.lastSync ? esc(new Date(androidExperience.lastSync).toLocaleString()) : "尚无成功记录"}</p>${s.operations !== s.pending ? `<p class="hint">${s.operations}次本机修改合并为${s.pending}条待传记录。</p>` : ""}</div>` +
    (androidExperience.syncError ? `<p role="alert">${esc(androidExperience.syncError)}</p>` : "") +
    (androidExperience.syncBusy ? `<p role="status">正在同步，完成后更新状态…</p>` : `<div class="row">${loggedIn ? btn("同步记录", "sync", "", "primary") : btn("登录账号", "go", "account")}${loggedIn && s.photos.length ? btn("上传待传照片", "uploadPhotos") : ""}${s.conflicts ? btn("处理冲突", "go", "conflicts") : ""}</div>`) +
    (s.blocked ? `<p class="warning">${s.blocked}条修改涉及当前不在的家庭，保留在本机，不会上传到其他家庭。请核对家庭成员关系。</p>` : "") +
    `<details><summary>待传记录类别</summary>${[...new Set(store.state.changes.map(c => c.entityType))].map(type => {
      const names = {food_items:"食材", meal_records:"记餐", shopping_list:"采购", recipes:"示例主体菜谱", recipe_favorites:"收藏", barcode_lib:"条码模板"};
      const ids = new Set(store.state.changes.filter(c => c.entityType === type).map(c => c.entityId));
      return `<p>${esc(names[type] || "其他记录")} · ${ids.size}条</p>`;
    }).join("") || "<p>没有待传修改</p>"}</details><details><summary>照片上传范围</summary><p>只上传当前账号记餐中关联的照片。选择“同步记录”不会自动上传照片。</p>${s.photos.map(m => `<p>${esc(m.name || "未命名餐食")} · ${m.photoId ? "待确认/重试" : "待上传"}${loggedIn ? btn("上传这张", "uploadPhoto", m.id) : ""}</p>`).join("")}</details>`;
}
window.parityViews.syncStatus = () => syncStatusView() + (cloud.session.accessToken ? accountSettingsRow('计划与偏好同步','go','workspace') + accountSettingsRow('迁入访客备份','go','migration') : '');
const experienceAccountView = accountView;
function accountSettingsRow(label, action, value='') {
 return `<button class="account-setting-row" data-action="${action}" data-value="${esc(value)}"><span>${esc(label)}</span><span aria-hidden="true">›</span></button>`;
}
accountView = function () {
 if(!cloud.session.accessToken)return experienceAccountView();
 const summary=androidSyncSummary(),name=profileData?.displayName||settings.boundEmail||'已登录账号';
 return `<section class="account-hub"><header class="account-heading"><h1>账号</h1><p>${esc(name)}</p></header>
 <section class="account-sync-panel" aria-label="数据同步"><div class="account-sync-status"><div><h2>${summary.pending?'待同步 '+summary.pending+' 条':'记录已保存'}</h2><p>${androidExperience.syncBusy?'正在同步…':androidExperience.lastSync?'上次同步 '+esc(new Date(androidExperience.lastSync).toLocaleString()):'尚未同步到云端'}</p></div><button class="account-sync-button" data-action="sync" ${androidExperience.syncBusy?'disabled':''}>${androidExperience.syncBusy?'同步中…':'立即同步'}</button></div>
 ${androidExperience.syncError?`<p class="account-sync-error" role="alert">${esc(androidExperience.syncError)}</p>`:''}
 <label class="account-toggle-row"><span>自动同步</span><input type="checkbox" name="autoSync" data-account-toggle="autoSync" role="switch" ${parity.autoSync?'checked':''}></label>
 <label class="account-toggle-row"><span>仅在 Wi-Fi 下同步</span><input type="checkbox" name="wifiOnly" data-account-toggle="wifiOnly" role="switch" ${parity.wifiOnly?'checked':''}></label>
 ${accountSettingsRow('同步详情'+(summary.conflicts?' · '+summary.conflicts+' 项待处理':''),'go','syncStatus')}</section>
 <section class="account-setting-list" aria-label="账号设置">${accountSettingsRow('示例主体资料','go','profile')}${accountSettingsRow('登录设备','go','devices')}${accountSettingsRow('家庭共享','go','families')}</section>
 <details class="account-password"><summary>账号安全</summary>${accountSettingsRow('手机号管理','smsSecurity')}<!--account-phone-->${form('password',input('oldPassword','当前密码','','password','required')+input('newPassword','新密码','','password','required minlength="6"'),'确认修改')}${accountSettingsRow('注销账号','securityLoad')}</details>
 <button class="account-logout" data-action="logout">退出登录</button></section>`;
};
const experienceSettingsView = settingsDetailView;
settingsDetailView = function () {
 return parity.settingsGroup==='账号与同步'?accountView():experienceSettingsView();
};
window.parityViews.settingsDetail = settingsDetailView;
// Changes persist immediately; restore the prior state if storage fails.
document.addEventListener('change',async event=>{
 const input=event.target.closest('[data-account-toggle]');if(!input)return;
 const key=input.dataset.accountToggle,before=parity[key],next=input.checked;input.disabled=true;
 try{await setting(key,next);parity[key]=next;}catch(error){input.checked=before;toast(error.message||'设置未保存，请重试');}finally{input.disabled=false;}
});
const experienceShoppingView = shoppingView;
shoppingView = function () {
  if (!androidExperience.supermarket) return experienceShoppingView() + btn("进入超市模式", "supermarket", "true");
  const todo = store.state.shopping.filter(s => !s.purchased), done = store.state.shopping.filter(s => s.purchased);
  const item = s => `<article class="card market-item"><div><h3>${esc(s.name)}</h3><p>${s.quantity}${esc(s.unit)}${s.familyId ? " · 家庭共享" : ""}</p>${s.notes ? `<p class="hint">${esc(s.notes)}</p>` : ""}</div><div class="row">${!s.purchased ? btn("买到了", "purchase", s.id, "primary") : ""}${btn("编辑", "shoppingEdit", s.id)}${s.familyId ? btn("认领 / 取消", "claim", s.id) : ""}</div></article>`;
  return heading("超市采购") + `<div class="row between"><span>待买 ${todo.length}项</span>${btn("普通清单", "supermarket", "false")}</div>` +
    M.CATEGORIES.map(category => {
      const rows = todo.filter(s => (s.category || "其他") === category);
      return rows.length ? `<section><h2>${esc(category)}</h2>${rows.map(item).join("")}</section>` : "";
    }).join("") + (todo.length ? "" : empty("这次要买的都买齐了")) +
    `<details><summary>已买 ${done.length}项</summary>${done.map(item).join("")}</details>`;
};
const experienceActions = actions;
actions = async function (action, value) {
  if(action === "mealRepeat" && page === "today") {
    const targetDay=date;
    await experienceActions(action,value);
    mealDraft.date=new Date(targetDay+"T12:00:00").toISOString();render();return;
  }

  if (action === "uploadPhoto") {
    if (!cloud.session.accessToken) throw Error("请先登录");
    const count = await cloud.uploadPhotos(store, value);
    render(); toast("已上传 " + count + " 张照片"); return;
  }
  if (action === "supermarket") {
    androidExperience.supermarket = value === "true";
    render();
    return;
  }
  if (action === "logout" && androidExperience.syncBusy) throw Error("请等本次同步结束后再退出账号");
  await experienceActions(action, value);
  if (action === "uploadPhotos" && page === "syncStatus") render();
};
const experienceRecipeView = recipeView;
recipeView = function () {
  const html = experienceRecipeView(), r = currentRecipe();
  if (!r) return html;
  const unknown = r.ingredients.filter(i => !i.optional && !(Number.isFinite(i.quantity) && i.quantity > 0));
  const hasSources = !!(r.sourceUrl || (r.referenceSources || []).some(s => s.url));
  return html;
};
const experienceRender = render;
let lastAccessibleRoute = "";
render = function () {
  const sameRoute = document.body.dataset.page === page;
  const expanded = sameRoute ? [...screen.querySelectorAll("details")].map((el,index)=>({index,summary:el.querySelector("summary")?.textContent,open:el.open})) : [];
  const focused = sameRoute && screen.contains(document.activeElement) ? document.activeElement : null;
  const focusKey = focused ? {action:focused.dataset.action,value:focused.dataset.value,name:focused.name} : null;
  experienceRender();
  if (sameRoute) {
    const details = [...screen.querySelectorAll("details")];
    expanded.forEach(item=>{if(details[item.index]?.querySelector("summary")?.textContent === item.summary) details[item.index].open=item.open;});
    if (focusKey) {
      const candidates = focusKey.name ? [...screen.querySelectorAll("[name]")] : [...screen.querySelectorAll("[data-action]")];
      const replacement = candidates.find(el=>focusKey.name ? el.name===focusKey.name : el.dataset.action===focusKey.action && el.dataset.value===focusKey.value);
      replacement?.focus({preventScroll:true});
    }
  }
  document.getElementById("nav").setAttribute("aria-label", "主导航");
  document.querySelectorAll("nav [data-action=go]").forEach(button => {
    if (button.dataset.value === page) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.querySelectorAll('[data-action="profilePreset"]').forEach(button => {
    button.setAttribute("aria-label", ({tomato:"番茄头像", rice:"米饭头像", mushroom:"蘑菇头像", cat:"小猫头像"})[button.dataset.value] || "内置头像");
    button.setAttribute("aria-pressed", String(button.classList.contains("active")));
  });
  document.querySelector('[data-action="foodNew"]')?.setAttribute("aria-label", "添加食材");
  const choiceActions=new Set(["draftFilter","filterSection","draftOrder","draftFavorites","profilePreset","libraryMode","recipeSort","recipeCategory","drawMode","drawPreset","diaryMode","diaryDining","pantryCategory","pantryLocation","historyKind","statsSpan"]);
  document.querySelectorAll('button[data-action]').forEach(button=>{
    if(choiceActions.has(button.dataset.action))button.setAttribute("aria-pressed",String(button.classList.contains("active")));
    else if (button.classList.contains("active") && !button.hasAttribute("aria-current")) button.setAttribute("aria-pressed","true");
    const expanded=({recipeMore:parity.recipeMore,monthToggle:parity.monthOpen,recipeActions:parity.recipeActions})[button.dataset.action];
    if(expanded!==undefined)button.setAttribute("aria-expanded",String(!!expanded));
  });
  if (page !== lastAccessibleRoute) {
    lastAccessibleRoute = page;
    const title = screen.querySelector("h1");
    if (title) { title.tabIndex = -1; title.focus({preventScroll:true}); }
  }
};

const quickTodayView = todayView;
function safeMealText(value) {
  if (typeof value !== "string") return "";
  const text=value.trim();return /^(undefined|null)$/i.test(text)?"":text;
}
todayView = function () {
  const html = quickTodayView();
  if (date > M.dateString(new Date())) return html;
  const recent = store.state.meals.filter(m=>!m.sourceMealId).slice().sort((a,b)=>String(b.date || "").localeCompare(String(a.date || ""))).slice(0,4);
  const shortcuts = `<section class="quick-meal-entry" aria-label="快捷记餐"><div class="row">${["早餐","午餐","晚餐","加餐"].map(occasion=>btn("＋ "+occasion,"quickMeal",occasion)).join("")}</div>${recent.length ? `<div class="row between"><h2>最近吃过</h2>${btn("全部记录 ›","go","meals")}</div><div class="recent-meal-strip">${recent.map(m=>`<button data-action="mealRepeat" data-value="${esc(m.id)}"><strong>${esc(safeMealText(m.name) || "用餐记录")}</strong><small>再吃一次</small></button>`).join("")}</div>` : ""}</section>`;
  return html+shortcuts;
};
const historyState = {query:"",kind:"all",limit:20};
const historyLoadSettings = loadSettings;
loadSettings = async function () {
  await historyLoadSettings(); Object.assign(historyState,{query:"",kind:"all",limit:20});
};
stockHistoryView = function () {
  const list = store.state.foods.filter(f=>(!historyState.query || [f.name,f.batch,f.notes,f.location].some(value=>(value || "").includes(historyState.query))) &&
    (historyState.kind==="all" || historyState.kind==="active" && !f.archived || historyState.kind==="consumed" && (f.movements || []).some(m=>m.reason==="consumed") || historyState.kind==="wasted" && (f.movements || []).some(m=>m.reason==="wasted")))
    .slice().sort((a,b)=>(b.purchasedAt || b.modifiedAt || "").localeCompare(a.purchasedAt || a.modifiedAt || ""));
  return heading("购买与消耗历史") + form("historySearch",input("historyQuery","食材、批次或位置",historyState.query,"search"),"查找") +
    `<div class="row">${[["all","全部"],["active","仍有库存"],["consumed","有消耗"],["wasted","有丢弃"]].map(([id,label])=>btn(label,"historyKind",id,historyState.kind===id?"active":"")).join("")}</div><p class="hint">${list.length}个批次</p>` +
    (list.length ? list.slice(0,historyState.limit).map(f=>`<article class="card"><h2>${esc(f.name)}</h2><p>${esc(f.batch || "未命名批次")} · ${esc(f.location)}</p><p>购于 ${esc(f.purchasedAt || "未记录日期")} · ${f.purchasedQuantity>=0 ? f.purchasedQuantity+esc(f.unit) : "数量未记录"} · ${money(U.purchaseCost(f))}</p><p>现余 ${f.quantity}${esc(f.unit)} · 消耗费用 ${money(f.consumedCost)} · 丢弃费用 ${money(f.wastedCost)}</p><details><summary>${(f.movements || []).length}条变动</summary>${(f.movements || []).slice().reverse().map(m=>`<p>${esc(m.date.slice(0,16).replace("T"," "))} · ${esc(({consumed:"消耗",wasted:"丢弃",restored:"撤销恢复"})[m.reason] || "调整")} ${m.quantity}${esc(f.unit)} · ${money(m.cost)}</p>`).join("")}</details>${btn("再买一份","replenish",f.id)}</article>`).join("") : empty("没有符合条件的历史批次")) +
    (list.length>historyState.limit ? btn("再看20个批次","historyMore") : "");
};
const quickActions = actions;

actions = async function (action,value) {
  if (action==="quickMeal") {
    if (!M.validDate(date) || date>M.dateString(new Date())) throw Error("未来餐食请先安排计划");
    const targetDate=date;
    await quickActions("mealNew",value);
    const now=new Date();
    mealDraft.date=new Date(targetDate+"T"+String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0")+":00").toISOString();
    render(); return;
  }
  if (action==="historyKind") {historyState.kind=value;historyState.limit=20;render();return;}
  if (action==="historyMore") {historyState.limit+=20;render();return;}
  await quickActions(action,value);
};
const historySubmit = submit;
submit = async function (action) {
  if (action==="historySearch") {historyState.query=val("historyQuery").trim();historyState.limit=20;render();return;}
  await historySubmit(action);
};

// Measure fixed chrome rather than reserving an assumed pixel height. Text zoom,
// wrapped labels and safe-area padding can all change its occupied space.
(function trackResponsiveChrome(){
  const root=document.documentElement;
  const update=()=>{
    for(const [name,selector] of [['nav-height','#nav'],['header-height','#page-header'],['action-height','.filter-actions']]){
      const node=document.querySelector(selector);
      const height=node && getComputedStyle(node).display!=='none'?Math.ceil(node.getBoundingClientRect().height):0;
      const value=height+'px';if(root.style.getPropertyValue('--'+name)!==value)root.style.setProperty('--'+name,value);
      if(name==='header-height')root.toggleAttribute('data-flow-header',height>innerHeight*.25);
    }
  };
  const observer=new ResizeObserver(update);
  const watch=()=>{observer.disconnect();for(const node of document.querySelectorAll('#nav,#page-header,.filter-actions'))observer.observe(node);update();};
  new MutationObserver(watch).observe(document.getElementById('screen'),{childList:true});
  new MutationObserver(update).observe(document.getElementById('nav'),{childList:true,attributes:true});
  window.addEventListener('resize',update);watch();
})();

// One finite presentation controller. It observes rendered route identity rather
// than raw clicks, so cancelled navigation and form redraws never replay a page.
window.installAndroidMotion=function(){
  if(window.androidMotion)return;
  const media=matchMedia('(prefers-reduced-motion: reduce)'),mainTabs=['today','recipes','meals','pantry','mine'];
  const active=new Map();
  let nativeVisible=true,foreground=!document.hidden,lastKey='',lastPage='',lastDepth=0,backDepth=0,launchDone=false;
  let routeStarts=0,localStarts=0,cancelled=0,lastDirection='none',lastStop='';
  const reduced=()=>media.matches||document.body.classList.contains('reduced-motion');
  const routeKey=()=>page+(['recipe','guide','post'].includes(page)?':'+selected:'');
  function stop(slot,reason){
    const job=active.get(slot);if(!job)return;
    active.delete(slot);clearTimeout(job.guard);job.animation.onfinish=null;job.animation.oncancel=null;
    job.animation.cancel();job.cleanup?.();cancelled++;lastStop=reason;
  }
  function clear(reason){for(const slot of [...active.keys()])stop(slot,reason);}
  function play(slot,node,frames,duration,cleanup){
    stop(slot,'replaced');
    if(!node||!foreground||reduced()||!node.animate){cleanup?.();return false;}
    let animation;try{animation=node.animate(frames,{duration,easing:'cubic-bezier(.2,.7,.2,1)',fill:'none'});}catch{cleanup?.();return false;}
    const job={animation,cleanup,guard:null};active.set(slot,job);
    const finish=()=>{if(active.get(slot)!==job)return;active.delete(slot);clearTimeout(job.guard);animation.onfinish=null;animation.oncancel=null;animation.cancel();cleanup?.();};
    animation.onfinish=finish;animation.oncancel=finish;
    job.guard=setTimeout(finish,duration+120);return true;
  }
  function dismissLaunch(animate){
    if(launchDone)return;launchDone=true;
    clearTimeout(window.__launchGuard);window.__launchGuard=null;
    const layer=document.getElementById('launch-reveal');
    if(!animate||!layer){layer?.remove();return;}
    play('launch',layer,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-8px)'}],240,()=>layer.remove());
  }
  const previousRender=render;
  render=function(){
    const beforeKey=lastKey,beforePage=lastPage,beforeDepth=lastDepth;
    // A redraw replaces descendants; never leave an effect on a detached node.
    stop('route','render');stop('surface','render');stop('local','render');
    const result=previousRender();
    lastKey=routeKey();lastPage=page;lastDepth=history.length;
    if(!beforeKey){dismissLaunch(true);return result;}
    if(beforeKey===lastKey)return result;
    const fromTab=mainTabs.indexOf(beforePage),toTab=mainTabs.indexOf(page);
    const backward=backDepth>0||lastDepth<beforeDepth||(fromTab>=0&&toTab>=0&&toTab<fromTab);
    lastDirection=backward?'back':'forward';
    if(play('route',screen,[{opacity:.86},{opacity:1}],220)){
      routeStarts++;
      // Transform only a heading; transforming main would move its fixed action bars.
      play('surface',screen.querySelector('h1'),[{opacity:.7,transform:'translateX('+(backward?-10:10)+'px)'},{opacity:1,transform:'translateX(0)'}],200);
    }
    return result;
  };
  const previousBack=window.handleBack;
  window.handleBack=function(){backDepth++;try{return previousBack();}finally{backDepth--;}};
  const previousActions=actions;
  actions=async function(action,value){
    if(action==='back')backDepth++;
    const previousKey=routeKey();
    try{
      const result=await previousActions(action,value);
      if(previousKey===routeKey()&&['favorite','draftFilter','draftFavorites','drawPreset','drawMode','mealRating','profilePreset'].includes(action)){
        const node=[...screen.querySelectorAll('[data-action]')].find(el=>el.dataset.action===action&&el.dataset.value===String(value));
        if(play('local',node,[{opacity:.64},{opacity:1}],140))localStarts++;
      }
      return result;
    }finally{if(action==='back')backDepth--;}
  };
  function visibility(visible){
    foreground=!!visible&&nativeVisible&&!document.hidden;document.body.classList.toggle('motion-suspended',!foreground);
    if(!foreground){clear('background');dismissLaunch(false);}
  }
  const previousVisibility=window.platformVisibility;
  window.platformVisibility=function(visible){nativeVisible=!!visible;visibility(visible);return previousVisibility(visible);};
  document.addEventListener('visibilitychange',()=>visibility(!document.hidden));
  window.addEventListener('pagehide',()=>visibility(false));
  window.addEventListener('pageshow',()=>visibility(true));
  window.addEventListener('resize',()=>clear('resize'));
  function preferenceChanged(){if(reduced()){clear('reduced-motion');dismissLaunch(false);}}
  if(media.addEventListener)media.addEventListener('change',preferenceChanged);else media.addListener(preferenceChanged);
  new MutationObserver(preferenceChanged).observe(document.body,{attributes:true,attributeFilter:['class']});
  // One small reveal for newly opened content; no measured-height interpolation.
  const requestedDetails=new WeakSet();
  screen.addEventListener('click',event=>{const summary=event.target.closest('summary');if(summary?.parentElement?.tagName==='DETAILS')requestedDetails.add(summary.parentElement);},true);
  screen.addEventListener('toggle',event=>{
    if(event.target.tagName!=='DETAILS'||!requestedDetails.has(event.target))return;
    requestedDetails.delete(event.target);
    stop('local','details-toggle');
    if(event.target.open){const node=[...event.target.children].find(el=>el.tagName!=='SUMMARY');if(play('local',node,[{opacity:.65},{opacity:1}],160))localStarts++;}
  },true);
  window.androidMotion=Object.freeze({snapshot:()=>({routeStarts,localStarts,cancelled,lastDirection,lastStop,foreground,reduced:reduced(),launchDone,active:[...active.keys()],route:lastKey})});
};
