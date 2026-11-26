"use strict";
// Android presentation of the shared convenience and per-item workspace contracts.
const Convenience = require("ConvenienceCore"), WorkspaceMerge = require("WorkspaceMergeCore");
const convenience = {skips:[],mergeRows:null,purchase:null};
const convenienceLoadSettings = loadSettings;
loadSettings = async function () {
  await convenienceLoadSettings();
  Object.assign(convenience,{skips:[],mergeRows:null,purchase:null});
  try { convenience.skips=JSON.parse(await store.getSetting("temporarySkips:v1","[]")).filter(row=>row.until>Date.now()); } catch {}
};
window.activeRecipeSkips = scene => Convenience.activeSkips(convenience.skips,scene,Date.now());
const convenienceFilteredRecipes = filteredRecipes;
filteredRecipes = function () {
  const rows=convenienceFilteredRecipes();
  if(parity.library || filter.search.trim() || filterOnlyFav || collectionIndex>=0)return rows;
  const skips=window.activeRecipeSkips(intent);
  return rows.filter(r=>!skips.includes(r.id));
};
const convenienceDraw = U.drawMenu;
U.drawMenu = function (recipes,options,foods,today) {
  const skips=Convenience.activeSkips(convenience.skips,options.mode==="外食"?"record":"cook",Date.now());
  return convenienceDraw(recipes.filter(r=>!skips.includes(r.id)),options,foods,today);
};
const conveniencePurchaseView = purchaseView;
purchaseView = function () {
  const item=store.state.shopping.find(s=>s.id===selected);
  if(!item) return empty("这项采购已变化，请返回清单核对");
  const insight=Convenience.purchaseInsight(item,store.state.foods);
  return conveniencePurchaseView().replace('<form data-submit="purchase">','<form data-submit="purchase">'+
    `<div class="card"><p>待购 ${item.quantity}${esc(item.unit)} · 现有库存 ${insight.stock}${esc(item.unit)}</p><p class="hint">${insight.lastDate ? "上次购于 "+esc(insight.lastDate)+(insight.lastUnitPrice>=0?" · 单价约 "+money(insight.lastUnitPrice)+"/"+esc(item.unit):"") : "还没有对应购买记录"}</p></div>`+
    select("purchaseCompletion","这次购入后",[["partial","保留未买到的数量"],["full","这项已全部买齐"]],"partial")+select("purchaseUnit","实际买到的单位",M.UNITS,item.unit));
};
const convenienceMealView = mealView;
mealView = function () {
  const m=mealDraft || {}, reference=m.energyReference>=0?m.energyReference:m.calories??-1;
  return convenienceMealView().replace(/name="calories"([^>]*?)value="[^"]*"/,`name="calories"$1value="${reference}"`)
    .replace('示例主体热量 kcal（-1为未知）','整份参考热量 kcal（-1为未知）')
    .replace('<details><summary>热量、评分和备注</summary>','<details><summary>热量、评分和备注</summary>'+select("energySource","热量来源",Convenience.ENERGY_SOURCES,Convenience.ENERGY_SOURCES.includes(m.calorieSource)?m.calorieSource:"手动估算")+input("consumedFraction","实际食用比例（0到1，1为整份）",m.consumedFraction??1,"number",'min="0.01" max="1" step="0.01"')+'<p role="status" data-energy-preview></p>');
};
const convenienceRememberMeal = rememberMealForm;
rememberMealForm = function () {
  convenienceRememberMeal();
  if(!mealDraft || !document.querySelector('[name="energySource"]')) return;
  const reference=num("calories"), fraction=num("consumedFraction"), source=val("energySource");
  if(reference!==-1 || !Number.isFinite(fraction) || fraction<=0 || fraction>1) Convenience.consumedEnergy({referenceKcal:reference===-1?0:reference,fraction,source});
  mealDraft.energyReference=reference;mealDraft.consumedFraction=fraction;
  mealDraft.calories=reference<0?-1:Convenience.consumedEnergy({referenceKcal:reference,fraction,source});
  mealDraft.calorieSource=reference<0?"未记录":source;
};
function updateEnergyPreview() {
  const node=screen.querySelector('[data-energy-preview]');
  if(!node)return;
  try { node.textContent=num("calories")<0?"热量未知，不按0计算":"本次摄入约 "+Convenience.consumedEnergy({referenceKcal:num("calories"),fraction:num("consumedFraction"),source:val("energySource")})+" kcal"; }
  catch(error){node.textContent=error.message;}
}
document.addEventListener("input",event=>{if(["calories","consumedFraction"].includes(event.target.name))updateEnergyPreview();});
document.addEventListener("change",event=>{if(event.target.name==="energySource")updateEnergyPreview();});
function mergeValue(row,side) {
  return esc(WorkspaceMerge.workspaceMergeSummary(row,side,allRecipes()));
}
const convenienceWorkspaceView = workspaceView;
workspaceView = function () {
  const rows=convenience.mergeRows;
  const labels={homeRegion:"做饭地区",outsideRegion:"外食地区",dietGoal:"做饭目标",outsideGoal:"外食目标",learningEnabled:"做饭学习",outsideLearning:"外食学习",excluded:"忌口食材",taste:"口味",recentDays:"近期重复天数",recommendScene:"使用场景"};
  return convenienceWorkspaceView()+(daily.workspace?.remote.payload?btn("逐项合并计划与偏好","workspaceMergePreview"):"")+
    (rows?`<section><h2>逐项保留哪一端</h2><p>不同项可合并；同一项有冲突时须明确选择。删除也属于可选择的状态。</p>${rows.map((row,index)=>`<article class="card"><h3>${esc(row.kind==="pref"?labels[row.key.slice(5)] || row.label:row.label)}</h3><p>本机：${mergeValue(row,"local")}</p><p>云端：${mergeValue(row,"remote")}</p><div class="row">${btn("保留本机","workspaceMergeChoice",index+"|local",row.choice==="local"?"active":"")}${btn("保留云端","workspaceMergeChoice",index+"|remote",row.choice==="remote"?"active":"")}</div>${row.conflict&&!row.choice?'<p class="warning">此项需要选择</p>':""}</article>`).join("")}${btn("确认合并所选项","workspaceMergeCommit","","primary")}</section>`:"");
};
window.parityViews.workspace=workspaceView;
const convenienceDrawView = drawView;
drawView = function () {
  const o=drawState();
  return convenienceDrawView().replace('<!-- draw-cook-options -->',o.mode==="做饭"?'<section class="draw-cook-options">'+checkField("drawParallel","双灶并行估时",o.timeMode==="parallel")+checkField("drawBalanced","荤素搭配（至少两道菜）",!!o.balance)+'</section><details class="draw-time-help"><summary>估时说明</summary><p class="hint">未开启并行时按一人逐道制作保守估时。并行参考需要独立锅具和能安全照看；未知拆分不当成0分钟。时间或预算填0表示不限。</p></details>':"");
};
const convenienceDrawResult = drawResultView;
drawResultView = function () {
  return convenienceDrawResult().replace('保守参考',drawState().timeMode==="parallel"?"双灶参考":"逐道参考");
};
window.parityViews.drawResult=drawResultView;
function correctionView() {
  const r=currentRecipe();
  return heading("反馈菜谱问题")+`<p>${esc(r?.name || "菜谱")}</p>`+form("recipeCorrection",select("correctionCategory","问题类型",["做法","用量","时间","来源","其他"],"做法")+area("correctionDetail","具体问题与更正依据（2至1000字）"),"提交核对")+'<p class="hint">提交后供管理员核对，原菜谱不会被直接改写。</p>';
}
window.parityViews.recipeCorrection=correctionView;
const convenienceRecipeView=recipeView;
recipeView=function(){
  const r=currentRecipe(),html=convenienceRecipeView();if(!r)return html;
  const audit=Convenience.auditRecipe(r);
  return html.replace("<!-- recipe-secondary-end -->",`<details><summary>不喜欢这道菜？</summary><div class="row">${btn("今天先跳过","skipToday",r.id)}${btn("长期不抽这道菜","permanentDislike",r.id)}${store.builtinRecipes.some(recipe=>recipe.id===r.id)?btn("反馈用量或做法问题","go","recipeCorrection"):""}</div><p class="hint">今天跳过仅对当前场景生效，明天恢复；长期不抽可在口味设置中取消。</p>${audit.issues.map(issue=>`<p>${esc(issue)}</p>`).join("")}</details><!-- recipe-secondary-end -->`);
};
const convenienceActions=actions;
actions=async function(action,value){
  if(action==="purchase"){
    const item=store.state.shopping.find(s=>s.id===value);
    convenience.purchase=item?{id:item.id,snapshot:JSON.stringify(item),epoch:parity.epoch}:null;
  }
  if(action==="workspaceRead")convenience.mergeRows=null;
  if(action==="workspaceMergePreview"){
    if(!daily.workspace?.remote.payload)throw Error("请先读取云端安排");
    let base=null;try{base=JSON.parse(await store.getSetting("workspaceBase","null"));}catch{}
    convenience.mergeRows=WorkspaceMerge.workspaceMergeRows(daily.workspace.local,daily.workspace.remote.payload,base);render();return;
  }
  if(action==="workspaceMergeChoice"){
    const [index,choice]=value.split("|");if(!["local","remote"].includes(choice)||!convenience.mergeRows?.[Number(index)])throw Error("合并内容已变化，请重新对照");
    convenience.mergeRows[Number(index)].choice=choice;render();return;
  }
  if(action==="workspaceMergeCommit"){
    if(!daily.workspace||!convenience.mergeRows)throw Error("请先重新对照");
    const payload=WorkspaceMerge.mergedWorkspace(convenience.mergeRows);
    if(!confirm("确认按逐项选择合并到云端和本机？"))return;
    await cloud.mergeWorkspace(store,daily.workspace,payload);await loadSettings();go("workspace");toast("已合并所选内容");return;
  }
  if(action==="skipToday"){
    const tomorrow=new Date();tomorrow.setHours(24,0,0,0);
    convenience.skips=convenience.skips.filter(row=>row.until>Date.now()&&!(row.recipeId===value&&row.intent===intent)).concat([{recipeId:value,intent,until:tomorrow.getTime()}]);
    await setting("temporarySkips:v1",convenience.skips);go("recipes");toast("今天先跳过，长期偏好不变");return;
  }
  if(action==="permanentDislike"){
    if(!confirm("长期不抽这道菜？可在口味与抽菜设置中取消。"))return;
    const ids=[...new Set([...(settings.drawDisliked || []),value])];await setting("drawDisliked",ids);go("recipes");return;
  }
  await convenienceActions(action,value);
};
const convenienceSubmit=submit;
submit=async function(action){
  if(action==="purchase"){
    const draft=convenience.purchase,item=store.state.shopping.find(s=>s.id===selected);
    if(!draft||!item||draft.id!==item.id||draft.epoch!==parity.epoch||draft.snapshot!==JSON.stringify(item))throw Error("采购项已变化，请返回清单重新打开");
    const f=Object.assign(new M.Food(),{name:item.name,quantity:num("quantity"),unit:val("purchaseUnit"),category:item.category,location:val("location"),expiryDate:val("expiryDate"),purchasedAt:M.dateString(new Date()),estimatedPrice:num("price"),familyId:item.familyId});
    if(val("packageCount")){const count=num("packageCount");if(!Number.isInteger(count)||count<1)throw Error("包装数请填正整数");f.notes="包装数："+count+"；实际总量："+f.quantity+f.unit;}
    const partial=val("purchaseCompletion")==="partial";
    if(!confirm(partial?"确认这次实际买到的数量入库，未买到的继续保留？":"确认这项全部买齐并入库？"))return;
    if(!partial && Math.abs(f.quantity*M.unitFactor(f.unit,item.unit)-item.quantity)>0.00001)throw Error("全部买齐须与待购数量一致；仅买到一部分请选择保留未买到的数量");
    await store.purchasePartial(item.id,f,draft.snapshot);
    convenience.purchase=null;go("shopping");toast("实际购入已保存");return;
  }
  if(action==="drawFull"){drawState().timeMode=checked("drawParallel")?"parallel":"sequential";drawState().balance=checked("drawBalanced");}
  if(action==="recipeCorrection"){
    if(!cloud.session.accessToken)throw Error("请先登录后提交，草稿内容仍在此页");
    const detail=val("correctionDetail").trim();if(detail.length<2||detail.length>1000)throw Error("具体问题或依据请填写2至1000字");
    await api("/catalog/corrections","POST",{recipeId:selected,category:val("correctionCategory"),detail});go("recipe");toast("已提交核对，原菜谱未改动");return;
  }
  await convenienceSubmit(action);
};
const convenienceRender=render;
render=function(){convenienceRender();updateEnergyPreview();screen.querySelectorAll('[data-action="workspaceMergeChoice"]').forEach(button=>button.setAttribute("aria-pressed",String(button.classList.contains("active"))));};

const convenienceMineView=mineView;
mineView=function(){return convenienceMineView()+`<p class="hint app-version">Android ${esc(window.kaifanBuild.versionName)} · ${window.kaifanBuild.versionCode}</p>`;};
