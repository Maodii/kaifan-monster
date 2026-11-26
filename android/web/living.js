"use strict";
// Presentation only: all mutations and planning use the canonical shared modules.
const Living = require("DailyLivingCore"), Backup = require("EncryptedBackup");
const living = {weekly:null, weekInputs:null, weeklySnapshot:"", replacements:new Map(), leftovers:new Map(),
  encrypted:true, importPreview:null, trial:null, trialRecipe:"", trialRequest:0,
  communityDraft:{recipeId:"",region:"",outcome:"",data:"all"}, communityApplied:"", feedRequest:0};
const livingOwner = () => ({epoch:parity.epoch, owner:cloud.session.userId, storeOwner:store.deviceId});
const livingCurrent = token => token.epoch===parity.epoch && token.owner===cloud.session.userId && token.storeOwner===store.deviceId;
function livingReset() {
  living.weekly=null;living.weekInputs=null;living.importPreview=null;living.replacements.clear();living.leftovers.clear();
  living.trial=null;living.trialRecipe="";living.trialRequest++;living.feedRequest++;
  living.communityDraft={recipeId:"",region:"",outcome:"",data:"all"};living.communityApplied="";
  clearBackupPasswords();
}
const livingLoadSettings=loadSettings;
loadSettings=async function(){livingReset();await livingLoadSettings();};
function clearBackupPasswords(){screen.querySelectorAll('[name="backupPassword"],[name="backupConfirm"]').forEach(el=>{el.value="";});}
function livingOptions(){
  const o=new R.RankingOptions(),pref=settings.cookPreference || {};
  o.excluded=(settings.excluded || "").split(/[,，、]/).concat(Daily.householdExclusions(daily.household)).filter(x=>x.trim());
  o.homeRegion=pref.homeRegion || "";o.goal=pref.goal || "均衡饮食";return o;
}
function livingRecipes(){return allRecipes().filter(r=>!(settings.drawDisliked || []).includes(r.id)&&!store.retiredRecipeIds.includes(r.id));}
function weeklyPanel(){
  const w=living.weekly,d=living.weekInputs || (living.weekInputs={start:date,occasion:"晚餐",people:String(people)});
  return `<section class="living-week"><h2>七天安排草案</h2>${input("weeklyStart","开始日期",d.start,"date")}${select("weeklyOccasion","餐次",["早餐","午餐","晚餐","加餐"],d.occasion)}${input("weeklyPeople","人数",d.people,"number",'min="1" max="20" step="1"')}${btn("帮我安排七天","livingWeekPreview")}`+
    (w?`<div class="card weekly-proposal">${w.plans.map(p=>`<div class="row between"><span>${esc(p.date.slice(5))} ${esc(p.occasion)}</span><strong>${esc(findRecipe(p.recipeId)?.name || "历史菜谱")}</strong><span>约${money(U.estimateRecipeCost(findRecipe(p.recipeId),p.people).total)}</span></div>`).join("")}${w.unfilled.length?`<p>${w.unfilled.length}天没有符合条件的新菜，保留空位</p>`:""}<p class="hint">保留已有安排；采购与预算在计划页重新预览</p><div class="row">${btn("取消","livingWeekCancel")}<button data-action="livingWeekApply" ${w.plans.length?"":"disabled"}>采用草案</button></div></div>`:"")+"</section>";
}
const livingPlansView=plansView;
plansView=()=>insertAfterPageHeading(livingPlansView(),weeklyPanel());
const livingPlanView=planView;
planView=function(){
  const p=planDraft;let html=livingPlanView();
  if(p?.id&&p.mode==="在家做"&&!p.completed){
    living.replacements.set(p.id,JSON.stringify(p));
    const choices=livingRecipes().filter(r=>r.id!==p.recipeId&&R.matchesRankingConstraints(r,livingOptions())).slice(0,8);
    html+=`<section class="card"><h2>换一道</h2><div class="chips">${choices.map(r=>btn(r.name+" · 约"+money(U.estimateRecipeCost(r,p.people).total),"livingPlanReplace",p.id+"|"+r.id)).join("")}</div><p class="hint">已买到的食材保留；替换后重新预览采购与预算。</p></section>`;
  }return html;
};
function leftoversView(){
  living.leftovers.clear();const today=M.dateString(new Date());
  return heading("剩菜盒")+`<p class="hint">标注日期由你填写，请结合保存与食用状况判断。</p>${input("leftoverAmount","本次处理（份）",1,"number",'min="0.001" step="0.001"')}`+
    (store.state.leftovers?.length?store.state.leftovers.slice().reverse().slice(0,50).map(b=>{
      living.leftovers.set(b.id,JSON.stringify(b));
      return `<article class="card leftover-box ${b.storage==="冷冻"?"frozen":""}"><h2>${esc(b.name)}</h2><p>${esc(b.container || "未标注容器")} · ${esc(b.storage)} · 余 ${b.remaining}/${b.total}份</p><p class="${b.expiryDate<today?"warning":"hint"}">标注截止 ${esc(b.expiryDate)}</p>${b.remaining>0?`<div class="row"><button data-action="livingLeftoverUse" data-value="${esc(b.id)}|eat" ${b.expiryDate<today||b.preparedDate>today?"disabled":""}>吃这份</button>${btn("丢弃","livingLeftoverUse",b.id+"|discard")}</div>`:""}${b.events.slice(-3).map(e=>`<p class="hint">${esc(e.date.slice(0,10))} · ${e.action==="eat"?"食用":"丢弃"} ${e.portions}份</p>`).join("")}</article>`;
    }).join(""):empty('保存记餐后，展开“安排剩菜”存入一盒'));
}
function trashView(){
  const rows=(store.state.trash || []).slice().reverse();
  return heading("回收站","本机保留30天，最多30条；恢复为新记录")+(rows.length?rows.map(e=>`<article class="card row between"><div><h3>${esc(e.name)}</h3><small>${esc(M.dateString(new Date(e.deletedAt)))}</small></div>${btn("恢复","livingTrashRestore",e.id)}</article>`).join("")+btn("清空回收站","livingTrashClear"):empty("回收站是空的"));
}
function diningPlacesView(){
  const rows=Living.diningPlaces(store.state.meals);
  return heading("常去店铺")+(rows.length?rows.map(p=>`<article class="card dining-place"><h2>${esc(p.name)}</h2><p>${p.visits}次 · 实付 ${money(p.paid)} · 估算 ${money(p.estimated)}</p><p>${esc(p.combos.join("、"))}</p>${btn("再记一餐","livingDiningRepeat",p.lastMealId)}</article>`).join(""):empty("外食或外卖记餐时选填店铺，即可在这里查看"));
}
Object.assign(window.parityViews,{leftovers:leftoversView,trash:trashView,"dining-places":diningPlacesView});

const livingMealView=mealView;
mealView=function(){
  const html=livingMealView(),m=mealDraft;if(!m?.id)return html;
  return html+`<details class="card leftover-form"><summary>安排剩菜</summary>${input("leftoverDate","食用日期",D.shiftDay(M.dateString(new Date()),1),"date")}${input("leftoverCount","剩余份数",1,"number",'min="0.001" max="100" step="0.001"')}${input("leftoverContainer","容器标签，如蓝色饭盒","","text",'maxlength="80"')}${select("leftoverStorage","保存方式",["冷藏","冷冻"],"冷藏")}${input("leftoverExpiry","手动标注食用截止",M.dateString(new Date()),"date")}${btn("存入剩菜盒","livingLeftoverSave",m.id)}${btn("关联原餐安排","livingLeftoverPlan",m.id)}</details>`;
};
function nutritionWeekView(){
  const n=Living.nutritionWeek(store.state.meals,M.dateString(new Date()));
  return `<section class="card nutrition-week"><h2>近七天 · 热量记录</h2><p>已记 ${n.known} 餐 · 未记热量 ${n.unknown} 餐</p>${n.days.map(d=>`<div class="row between"><span>${esc(d.date.slice(5))}</span><strong>${d.known?d.kcal+" kcal":"未记录热量"}</strong><span>${d.known}/${d.known+d.unknown}餐</span></div>${d.known?`<p class="hint">包装标签 ${d.label} · 估算或其他 ${d.estimated}</p>`:""}`).join("")}<p class="hint">仅汇总已填写部分，不代表全天摄入；空白不计为零</p></section>`;
}
const livingStatsView=statsView;
statsView=()=>livingStatsView().replace("<h2>餐桌上的小偏好</h2>",nutritionWeekView()+"<h2>餐桌上的小偏好</h2>");
const livingSettingsView=settingsDetailView;
settingsDetailView=function(){
  if(parity.settingsGroup!=="数据与备份")return livingSettingsView();
  const preview=living.importPreview;
  return heading("数据与备份")+btn("检查离线菜谱更新","catalogUpdate")+`<section class="card"><h2>数据与备份</h2><p>待同步变更 ${store.state.changes.length} 条</p>${checkField("backupEncrypted","密码加密备份",living.encrypted)}${input("backupPassword","备份密码（导入加密文件也在此填写）","","password",'maxlength="128" autocomplete="off"')}${living.encrypted?input("backupConfirm","再次输入导出密码","","password",'maxlength="128" autocomplete="off"')+'<p class="hint">密码不会保存；忘记后无法解密。备份不含照片原文件。</p>':""}<div class="row">${btn(living.encrypted?"导出加密备份":"导出 JSON 备份","exportData")}${btn("导入备份","importData")}${btn("查看回收站","go","trash")}</div></section>`+
    (preview?`<section class="card backup-preview"><h2>导入预览</h2><p>${esc(preview.summary)}</p><p>重复 ${preview.conflicts} 项。合并到当前本机账号，不自动上传。</p>${preview.conflicts?select("backupConflict","同ID记录",[["local","保留本机"],["backup","采用备份"]],"local"):""}${btn("取消","livingImportCancel")}${btn("确认导入","livingImportCommit","","primary")}</section>`:"");
};
window.parityViews.settingsDetail=settingsDetailView;
async function loadLivingTrials(id){
  living.trial=null;living.trialRecipe=id;const request=++living.trialRequest,token=livingOwner();
  if(!cloud.session.accessToken)return;
  try{const result=await api("/community/recipes/"+encodeURIComponent(id)+"/trials");
    if(request!==living.trialRequest||!livingCurrent(token)||selected!==id)return;
    living.trial=result;if(page==="recipe")render();
  }catch{/* Evidence unavailable never becomes a claim of verification. */}
}
const livingRecipeView=recipeView;
recipeView=function(){
  const html=livingRecipeView(),e=living.trial;if(!e||living.trialRecipe!==selected)return html;
  return html+`<section class="card trial-evidence"><h2>大家的试做记录</h2><p>${Number(e.participants)||0}人 · 成功 ${Number(e.success)||0} · 需改进 ${Number(e.needs_improvement)||0}</p><p>平均耗时 ${Number(e.average_minutes)||0}分钟</p><p class="hint">真实用户最新自报，非认证验证；不含演示或未公开记录。</p></section>`;
};
const livingCommunityView=communityView;
communityView=function(){
  const d=living.communityDraft;
  return insertAfterPageHeading(livingCommunityView(),`<details class="card community-search"><summary>按菜谱、地区和试做经验找分享</summary>${select("communityRecipe","菜谱",[["","全部菜谱"],...allRecipes().slice().sort((a,b)=>a.name.localeCompare(b.name)).map(r=>[r.id,r.name])],d.recipeId)}${input("communityRegion","地区",d.region,"text",'maxlength="40"')}${select("communityOutcome","试做结果",[["","全部结果"],["成功","成功"],["需改进","需改进"]],d.outcome)}${select("communityData","数据来源",[["all","全部"],["real","真实分享"],["demo","演示内容"]],d.data)}<div class="row community-filter-actions">${btn("应用条件","livingCommunityApply","","primary")}${btn("重置","livingCommunityReset")}</div></details>`);
};
communityLoad=async function(more=false){
  const token=livingOwner(),request=++living.feedRequest,query=living.communityApplied;
  const result=await api("/community/posts/page?scope="+encodeURIComponent(communityScope)+query+(more&&postCursor?"&cursor="+encodeURIComponent(postCursor):""));
  if(!livingCurrent(token)||request!==living.feedRequest||query!==living.communityApplied)return;
  postList=(more?postList:[]).concat(result.items).filter((p,i,rows)=>rows.findIndex(x=>x.id===p.id)===i).slice(-100);
  postCursor=result.nextCursor || "";postMore=!!result.hasMore;go("community",true);
  const rows=postList.filter(p=>p.payload.photoId&&!p.photoUrl);
  for(let i=0;i<rows.length;i+=4){await Promise.all(rows.slice(i,i+4).map(async p=>{
    try{const image=await api("/photos/"+p.payload.photoId+"/download");if(livingCurrent(token)&&request===living.feedRequest&&postList.some(x=>x.id===p.id))p.photoUrl=remotePhoto(image.url);}catch{}
  }));}if(livingCurrent(token)&&request===living.feedRequest&&page==="community")render();
};
document.addEventListener("change",event=>{
  const el=event.target;
  if(el.name==="backupEncrypted"){living.encrypted=el.checked;clearBackupPasswords();render();}
  const keys={communityRecipe:"recipeId",communityRegion:"region",communityOutcome:"outcome",communityData:"data"};
  if(keys[el.name])living.communityDraft[keys[el.name]]=el.value;
  if(["weeklyStart","weeklyOccasion","weeklyPeople"].includes(el.name)&&living.weekly){living.weekly=null;render();}
});
document.addEventListener("input",event=>{
  const el=event.target;if(el.name==="communityRegion")living.communityDraft.region=el.value;
  const key={weeklyStart:"start",weeklyOccasion:"occasion",weeklyPeople:"people"}[el.name];
  if(key&&living.weekInputs)living.weekInputs[key]=el.value;
});
const livingActions=actions;
actions=async function(action,value){
  if(action==="livingWeekPreview"){
    const start=val("weeklyStart"),today=M.dateString(new Date());
    if(!M.validDate(start))throw Error("请填写有效开始日期");
    living.weekInputs={start:start<today?today:start,occasion:val("weeklyOccasion"),people:val("weeklyPeople")};
    week=living.weekInputs.start;
    living.weeklySnapshot=JSON.stringify(store.state.plans);living.weeklyOwner=livingOwner();
    living.weekly=Living.suggestWeek(livingRecipes(),store.state.foods,store.state.meals,store.state.plans,living.weekInputs.start,living.weekInputs.occasion,Number(living.weekInputs.people),livingOptions());render();return;
  }
  if(action==="livingWeekCancel"){living.weekly=null;render();return;}
  if(action==="livingWeekApply"){
    if(!living.weekly||!livingCurrent(living.weeklyOwner))throw Error("草案已变化，请重新预览");
    await store.applySuggestedWeek(living.weekly.plans,living.weeklySnapshot);living.weekly=null;render();return;
  }
  if(action==="livingPlanReplace"){
    const [id,recipeId]=value.split("|"),snapshot=living.replacements.get(id);
    if(!snapshot)throw Error("请重新打开计划");
    if(!confirm("换成"+(findRecipe(recipeId)?.name || "这道菜")+"？已买食材保留，采购和预算重新预览。"))return;
    await store.replacePlannedRecipe(id,recipeId,snapshot);planDraft=clone(store.state.plans.find(p=>p.id===id));render();return;
  }
  if(action==="livingLeftoverSave"||action==="livingLeftoverPlan"){
    const m=store.state.meals.find(m=>m.id===value);if(!m)throw Error("原餐已变化，请重新打开");
    const quantity=num("leftoverCount");if(!Number.isFinite(quantity)||quantity<=0||quantity>100)throw Error("剩余份数需大于0且不超过100");
    if(action==="livingLeftoverSave"){
      const b=Object.assign(new Living.LeftoverBatch(),{sourceMealId:m.id,name:m.name,total:quantity,remaining:quantity,preparedDate:M.dateString(new Date(m.date)),expiryDate:val("leftoverExpiry"),container:val("leftoverContainer"),storage:val("leftoverStorage")});
      await store.saveLeftover(b);go("leftovers");
    }else{
      const p=Object.assign(new (require("MealPlan").MealPlan)(),{date:val("leftoverDate"),mode:"吃剩菜",note:m.name.slice(0,200),sourceMealId:m.id,remainingPortions:quantity,people:1});
      await store.saveMealPlan(p);toast("已关联原餐安排；未重复采购或计费");
    }return;
  }
  if(action==="livingLeftoverUse"){
    const [id,kind]=value.split("|"),quantity=num("leftoverAmount"),snapshot=living.leftovers.get(id);
    if(!snapshot)throw Error("请重新打开剩菜盒");
    if(!confirm((kind==="eat"?"记录本次食用？关联原餐，不重复计费或扣库存。":"丢弃这份？")+" 本次 "+quantity+"份"))return;
    await store.useLeftover(id,quantity,kind,snapshot);render();return;
  }
  if(action==="livingTrashRestore"){
    if(confirm("恢复这条记录？作为新记录保存，不恢复原来的云端ID和家庭共享。")){await store.restoreTrash(value);render();}return;
  }
  if(action==="livingTrashClear"){
    if(confirm("清空回收站？这些记录将无法从本机恢复。")){await store.clearTrash();render();}return;
  }
  if(action==="livingDiningRepeat"){await livingActions("mealRepeat",value);return;}
  if(action==="exportData"){
    const password=val("backupPassword"),confirmation=val("backupConfirm"),token=livingOwner();
    try{
      if(living.encrypted&&password!==confirmation)throw Error("两次备份密码不一致");
      const content=store.exportData(),text=living.encrypted?await Backup.encryptBackup(content,password):content;
      if(!livingCurrent(token))throw Error("账号已变化，请重新导出");
      await exportFile(text,"开饭小怪备份-"+M.dateString(new Date())+".json");
    }finally{clearBackupPasswords();}return;
  }
  if(action==="importData"){
    const password=val("backupPassword"),token=livingOwner();living.importPreview=null;
    try{
      let text=await P.nativeAsync("import");if(!text)return;
      if(text.length>16*1024*1024)throw Error("备份超过16MB，请拆分后导入");
      if(JSON.parse(text).format==="kaifan-backup")text=await Backup.decryptBackup(text,password);
      if(!livingCurrent(token))throw Error("账号已变化，请重新导入");
      const conflicts=store.backupConflicts(text),d=JSON.parse(text);
      living.importPreview={text,conflicts,token,revision:store.revision,snapshot:store.exportData(),summary:[['foods','库存'],['shopping','采购'],['meals','记餐'],['leftovers','剩菜'],['plans','计划']].map(([k,label])=>label+" "+(d[k] || []).length).join("、")};
      render();
    }finally{clearBackupPasswords();}return;
  }
  if(action==="livingImportCancel"){living.importPreview=null;render();return;}
  if(action==="livingImportCommit"){
    const p=living.importPreview;if(!p||!livingCurrent(p.token)||p.revision!==store.revision)throw Error("本机记录或账号已变化，请重新选择备份预览");
    const replace=val("backupConflict")==="backup";
    if(!confirm(replace?"确认采用备份中的同ID记录并导入？":"确认导入？同ID记录保留本机。"))return;
    await store.importData(p.text,replace,p.snapshot);living.importPreview=null;await loadSettings();render();toast("导入完成");return;
  }
  if(action==="livingCommunityApply"||action==="livingCommunityReset"){
    const d=action==="livingCommunityReset"?{recipeId:"",region:"",outcome:"",data:"all"}:{recipeId:val("communityRecipe"),region:val("communityRegion").trim(),outcome:val("communityOutcome"),data:val("communityData")};
    living.communityDraft=d;living.communityApplied="&recipeId="+encodeURIComponent(d.recipeId)+"&region="+encodeURIComponent(d.region)+"&outcome="+encodeURIComponent(d.outcome)+"&data="+d.data;
    postCursor="";postMore=false;postList=[];living.feedRequest++;render();await communityLoad();return;
  }
  if(action==="back"&&["leftovers","dining-places","trash"].includes(page)){
    if(!history.length&&page==="trash"){parity.settingsGroup="数据与备份";go("settingsDetail",true);}else go("meals",true);return;
  }
  await livingActions(action,value);
  if(action==="recipe"&&page==="recipe")loadLivingTrials(selected);
};
const livingGo=go;
go=function(next,keep=false){
  if(next!==page){clearBackupPasswords();if(page==="settingsDetail")living.importPreview=null;}
  livingGo(next,keep);
};
const livingHandleBack=window.handleBack;
window.handleBack=function(){
  if(!history.length&&["leftovers","dining-places"].includes(page)){go("meals",true);return true;}
  if(!history.length&&page==="trash"){parity.settingsGroup="数据与备份";go("settingsDetail",true);return true;}
  clearBackupPasswords();if(page==="settingsDetail")living.importPreview=null;
  return livingHandleBack();
};

function insertAfterPageHeading(html,content){
  if(html.includes("<!--community-heading-end-->"))return html.replace("<!--community-heading-end-->","<!--community-heading-end-->"+content);
  return html.replace(/^(.*?<\/h1>(?:<p class="hint">.*?<\/p>)?)/s,"$1"+content);
}
