"use strict";
// Uses the shared next-iteration modules; loaded only in builds that include those modules.
const Daily = require("DailyFlowCore");
const daily = { rows: [], workspace: null, migration: null, household: {members: []}, deduction: null, deductionRecipe: null, feedback: null };
const canonicalFilterRecipes = F.filterRecipes;
F.filterRecipes = function (recipes, options, foods, today) {
  return canonicalFilterRecipes(recipes, {...options, excludedIngredients:[...(options.excludedIngredients || []), ...Daily.householdExclusions(daily.household)]}, foods, today);
};
const canonicalDrawMenu = U.drawMenu;
U.drawMenu = function (recipes, options, foods, today) {
  return canonicalDrawMenu(recipes, {...options, excluded:[...(options.excluded || []), ...Daily.householdExclusions(daily.household)]}, foods, today);
};
function frequentFoods() {
  return [...new Map([...store.state.foods].sort((a,b) => (a.purchasedAt || a.modifiedAt || "").localeCompare(b.purchasedAt || b.modifiedAt || "")).map(f => [R.canonicalName(f.name),f])).values()].slice(-30);
}
function captureBatchRows() {
  daily.rows.forEach((f,i) => {
    if (!document.querySelector(`[name="batchQty${i}"]`)) return;
    Object.assign(f,{quantity:num("batchQty"+i),unit:val("batchUnit"+i),location:val("batchLoc"+i),expiryDate:val("batchExp"+i),estimatedPrice:num("batchPrice"+i)});
  });
}
const dailyLoadSettings = loadSettings;
loadSettings = async function () {
  await dailyLoadSettings();
  Object.assign(daily, { rows: [], workspace: null, migration: null, household: {members: []}, deduction: null, deductionRecipe: null, feedback: null });
  const migrated = await store.getSetting("androidWorkspaceKeysMigrated", "false") === "true";
  for (const [domain, region, goal, learning] of [["cook","homeRegion","dietGoal","learningEnabled"],["record","outsideRegion","outsideGoal","outsideLearning"]]) {
    const old = migrated ? {} : settings[domain + "Preference"] || {};
    if (!migrated && Object.keys(old).length && await store.getSetting(goal, "") === "") {
      await store.setting(region, old.homeRegion || ""); await store.setting(goal, old.goal || "均衡饮食"); await store.setting(learning, String(old.learning !== false));
    }
    settings[domain + "Preference"] = {homeRegion: await store.getSetting(region, old.homeRegion || ""), goal: await store.getSetting(goal, old.goal || "均衡饮食") || "均衡饮食", learning: await store.getSetting(learning, String(old.learning !== false)) !== "false"};
  }
  const legacyExperience = !migrated ? experience : new E.ExperienceState();
  const rawExperience = await store.getSetting("experience:v1", "");
  try { experience = E.normalizeExperience(JSON.parse(rawExperience || JSON.stringify(legacyExperience))); } catch { experience = new E.ExperienceState(); }
  experience.filters.forEach(f => { f.order = recipeOrders.find(([id,label]) => id === f.order || label === f.order)?.[0] || "rank"; });
  if (!migrated && !rawExperience && (experience.collections.length || experience.filters.length)) await saveExperience();
  await store.setting("androidWorkspaceKeysMigrated", "true");
  settings.taste = await store.getSetting("taste", "");
  settings.recentDays = Number(await store.getSetting("recentDays", "7"));
  try { daily.household = JSON.parse(await store.getSetting("household:v1", '{"members":[]}')); } catch {}
};
const dailySetting = setting;
setting = async function (key, value) {
  await dailySetting(key, value);
  if (["cookPreference", "recordPreference"].includes(key)) {
    const keys = key === "cookPreference" ? ["homeRegion","dietGoal","learningEnabled"] : ["outsideRegion","outsideGoal","outsideLearning"];
    for (const [index, v] of [value.homeRegion || "", value.goal || "均衡饮食", String(value.learning !== false)].entries()) await store.setting(keys[index], v);
  }
};
saveExperience = async function () {
  const payload = clone(experience);
  payload.filters.forEach(f => { f.order = recipeOrders.find(([id,label]) => id === f.order || label === f.order)?.[1] || "综合排序"; });
  await setting("experience:v1", payload);
};
const dailyRecipeOptions = recipeOptions;
recipeOptions = function () {
  const options = dailyRecipeOptions();
  options.taste = settings.taste || "";
  options.recentDays = Number.isFinite(settings.recentDays) ? settings.recentDays : 7;
  options.excluded = [...new Set([...options.excluded, ...Daily.householdExclusions(daily.household)])];
  return options;
};
function dailyExclusions() { return [...new Set([...(settings.excluded || "").split(/[,，、]/).filter(Boolean), ...Daily.householdExclusions(daily.household)])]; }
function workspaceDetails(payload) {
  if (!payload) return "";
  const p = payload.preferences || {};
  let collections = [], filters = [], members = [];
  try { const e=JSON.parse(p["experience:v1"] || "{}"); collections=e.collections || []; filters=e.filters || []; } catch {}
  try { members=JSON.parse(p["household:v1"] || "{}").members || []; } catch {}
  const labels={homeRegion:"做饭地区",outsideRegion:"外食地区",dietGoal:"做饭目标",outsideGoal:"外食目标",excluded:"不吃的食材",taste:"口味",recentDays:"近期重复天数",learningEnabled:"做饭学习",outsideLearning:"外食学习"};
  return `<details><summary>查看这份安排明细</summary>${(payload.plans || []).map(plan=>`<p>${esc(plan.date)} · ${esc(plan.occasion)} · ${esc(plan.mode === "在家做" ? findRecipe(plan.recipeId)?.name || "历史菜谱" : plan.note || plan.mode)}${plan.completed ? " · 已完成" : ""}</p>`).join("")}${Object.entries(labels).filter(([key])=>p[key]!==undefined).map(([key,label])=>`<p>${label}：${esc(p[key]==="true"?"开启":p[key]==="false"?"关闭":p[key] || "未设置")}</p>`).join("")}<p>收藏夹：${collections.map(c=>esc(c.name)+"（"+(c.ids || []).length+"道）").join("、") || "无"}</p><p>筛选组合：${filters.map(f=>esc(f.name)).join("、") || "无"}</p><p>家人档案：${members.map(m=>esc(m.name)+" · "+m.appetite+"人份 · "+(m.excluded || []).map(esc).join("、")).join("；") || "无"}</p></details>`;
}
function workspaceView() {
  const check = daily.workspace;
  const describe = payload => !payload ? "尚无云端安排" : `${(payload.plans || []).length}条计划 · ${Object.keys(payload.preferences || {}).length}项偏好/收藏夹配置`;
  return heading("计划与偏好同步") + `<p>单独同步计划、收藏夹与双场景偏好。先对照，再选择保留哪一份；照片与记餐不在这份安排里。</p>${btn("读取并对照", "workspaceRead")}` +
    (check ? `<div class="card"><h2>本机</h2><p>${esc(describe(check.local))}</p>${workspaceDetails(check.local)}</div><div class="card"><h2>云端 · 版本${check.remote.version}</h2><p>${esc(describe(check.remote.payload))}</p>${workspaceDetails(check.remote.payload)}</div>${check.conflict ? '<p class="warning">云端版本已有变化，请核对后选择整份安排。</p>' : ""}<div class="row">${btn("使用本机这份", "workspaceUpload")}${check.remote.payload ? btn("使用云端这份", "workspaceDownload") : ""}</div>` : "");
}
function batchFoodsView() {
  const candidates = frequentFoods();
  return heading("常买食材一起记") + `<p>选择后逐项确认数量、位置和日期，分成独立批次保存。</p><div class="chips">${candidates.map((f,i) => btn(f.name, "batchChoose", i)).join("")}</div>` +
    (daily.rows.length ? form("batchFoods", daily.rows.map((f,i) => `<fieldset><legend>${esc(f.name)}</legend>${input("batchQty"+i,"数量",f.quantity,"number",'min="0.001" step="any" required')}${select("batchUnit"+i,"单位",M.UNITS,f.unit)}${select("batchLoc"+i,"位置",store.state.locations,f.location)}${input("batchExp"+i,"到期日",f.expiryDate,"date","required")}${input("batchPrice"+i,"这批花费，未记填0",f.estimatedPrice,"number",'min="0" step="0.01"')}${btn("移除", "batchRemove", i)}</fieldset>`).join(""), "确认整批入库") : empty(candidates.length ? "点上方常买食材开始" : "先记录一次购买，这里会记住实际单位和位置"));
}
function householdView() {
  return heading("一起吃饭的偏好") + `<p>本机用餐档案可包含家人，也可用于分餐参考。启用成员的忌口取并集，参考食量 ${Daily.householdPeople(daily.household)}人份。</p>` +
    daily.household.members.map((m,i) => `<article class="card"><h2>${esc(m.name)}</h2><p>${m.appetite}人份 · ${m.enabled ? "参与本餐" : "本餐不参与"}</p><p>${m.excluded.map(esc).join("、") || "未设置忌口"}</p>${btn(m.enabled ? "本餐不参与" : "参与本餐", "householdToggle", i)}${btn("移除", "householdRemove", i)}</article>`).join("") +
    form("householdAdd", input("memberName","称呼","","text",'required maxlength="24"') + input("memberAppetite","参考食量（人份）",1,"number",'min="0.25" max="3" step="0.25" required') + input("memberExcluded","忌口/过敏食材（逗号分隔）"), "加入档案") + `<p class="hint">有相互冲突的偏好时分餐安排；不会为了凑菜放宽任何忌口。</p>`;
}
function deductionView() {
  const p = daily.deduction;
  return heading("做菜前核对库存") + (p ? `<p>${esc(daily.deductionRecipe.name)}</p>${p.lines.map(line => `<article class="card"><h3>${esc(line.name)}</h3><p>${esc(line.batch || "未命名批次")} · ${esc(line.expiryDate)}到期</p><p>用 ${line.quantity}${esc(line.unit)} → 剩 ${line.remaining}${esc(line.unit)}</p><p class="hint">这次分摊 ${money(line.cost)}</p></article>`).join("")}<p>食材分摊参考 ${money(p.cost)}</p>${p.errors.map(e => `<p class="warning">${esc(e)}</p>`).join("")}${p.errors.length ? "" : btn("实际做完，扣库存并记餐", "deductionCommit", "", "primary")}<p class="hint">预览不改库存，确认时重新核对；不足或未知用量会停止。</p>` : empty("请先从菜谱选择实际制作"));
}
function migrationView() {
  const preview = daily.migration;
  return heading("迁入访客备份") + `<p>在访客空间导出JSON备份后，登录目标账号，再选择该文件预览。同ID记录保留账号现有版本；照片不迁入、不自动上传。</p>${btn("选择备份文件", "migrationRead")}` +
    (preview ? `<div class="card"><p>${preview.total}条记录 · ${preview.collisions}条ID重合将跳过</p><p>食材${preview.data.foods.length} · 采购${preview.data.shopping.length} · 记餐${preview.data.meals.length} · 计划${(preview.data.plans || []).length}</p></div>${btn("确认迁入本机账号空间", "migrationCommit")}` : "");
}
Object.assign(window.parityViews, {workspace:workspaceView, batchFoods:batchFoodsView, household:householdView, deduction:deductionView, migration:migrationView});
const dailySettingsView = settingsDetailView;
settingsDetailView = () => dailySettingsView() + (parity.settingsGroup === "口味与抽菜" ? btn("家人食量与忌口", "go", "household") : "");
window.parityViews.settingsDetail = settingsDetailView;
const dailyPantryView = pantryView;
pantryView = () => dailyPantryView() + `<div class="row">${btn("常买这几样", "go", "batchFoods")}${btn("撤销最近一次消耗", "undoLast")}</div>`;
const dailyFoodView = foodView;
foodView = function () {
  const html = dailyFoodView();
  if (!html.includes('data-submit="food"')) return html;
  const f = foodDraft || {};
  return html.replace('<form data-submit="food">', '<form data-submit="food">' + `<details><summary>开封日期与原始到期日</summary>${input("openedAt","开封日",f.openedAt || "","date")}${input("openedExpiry","人工确认的开封后到期日",f.openedExpiry || "","date")}<p class="hint">原到期日保留。未填开封后到期日时不推算；提醒采用较早的有效日期。</p></details>`);
};
const dailyMealView = mealView;
function captureDailyMeal() {
  if (!mealDraft || !document.querySelector('[name="trialOutcome"]')) return;
  for (const key of ["trialOutcome","trialSubstitution","trialFailure"]) mealDraft[key]=val(key);
  for (const key of ["actualMinutes","leftoverPortions","deliveryFee","discount","splitPeople","personalShares"]) mealDraft[key]=num(key);
  mealDraft.financeFood=val("financeFood")===""?-1:num("financeFood");
}
const dailyRememberMeal = rememberMealForm;
rememberMealForm = function () { captureDailyMeal(); dailyRememberMeal(); };
mealView = function () {
  const m = mealDraft || {}, places = [...new Set(store.state.meals.map(m => m.place).filter(Boolean))].slice(-20);
  const extra = `<details><summary>费用分项与示例主体分摊（可选）</summary>${input("financeFood","整餐餐费，留空不启用",m.financeFood >= 0 ? m.financeFood : "","number",'min="0" step="0.01"')}${input("deliveryFee","配送费",m.deliveryFee || 0,"number",'min="0" step="0.01"')}${input("discount","优惠",m.discount || 0,"number",'min="0" step="0.01"')}${input("splitPeople","总份数",m.splitPeople || 1,"number",'min="1" max="100"')}${input("personalShares","我的份数",m.personalShares || 1,"number",'min="1" max="100"')}<p class="hint">整餐总额与示例主体分摊分别保留；示例主体统计只计自己的份额。</p></details><details><summary>试做经验与剩菜</summary>${select("trialOutcome","试做结果",[["未评价","未评价"],["成功","成功"],["需改进","未达预期 / 需改进"]],m.trialOutcome === "失败" ? "需改进" : m.trialOutcome || "未评价")}${input("actualMinutes","实际耗时（分钟）",m.actualMinutes || 0,"number",'min="0" max="2880"')}${input("trialSubstitution","这次的替代材料",m.trialSubstitution || "")}${area("trialFailure","心得/失败原因",m.trialFailure || "")}${input("leftoverPortions","剩余份数",m.leftoverPortions || 0,"number",'min="0" max="100" step="0.5"')}</details><datalist id="meal-places">${places.map(place => `<option value="${esc(place)}">`).join("")}</datalist>`;
  return dailyMealView().replace('name="place"', 'name="place" list="meal-places"').replace('<div class="sticky">', extra + '<div class="sticky">');
};
const dailyMealsView = mealsView;
mealsView = function () {
  return dailyMealsView() + `<details><summary>安排剩菜/备餐</summary>${store.state.meals.filter(m => m.leftoverPortions > 0).map(m => `<p>${esc(m.name)} · 剩${m.leftoverPortions}份 ${btn("安排食用", "leftoverPlan", m.id)}</p>`).join("") || '<p>在用餐编辑中记录剩余份数后，可关联安排。</p>'}</details>`;
};
const dailyPlansView = plansView;
plansView = function () {
  const today = M.dateString(new Date());
  return dailyPlansView() + `<details><summary>剩菜食用记录</summary>${store.state.plans.filter(p=>p.sourceMealId && p.mode === "吃剩菜").map(p=>`<article class="card"><p>${esc(p.date)} · ${esc(p.note)} · ${p.remainingPortions}份</p>${!p.completed && p.date<=today ? btn("已吃这份剩菜，记一餐", "leftoverEaten", p.id) : `<p class="hint">${p.completed ? "已完成" : "到安排日期后可记餐"}</p>`}</article>`).join("") || "<p>尚无关联原餐的剩菜计划</p>"}</details>`;
};
const dailyPurchaseView = purchaseView;
purchaseView = function () {
  return dailyPurchaseView().replace('<form data-submit="purchase">','<form data-submit="purchase">'+input("packageCount","包装数（可选，与总量分别记录）","","number",'min="1" step="1"')) + `<details><summary>这项不需要入库</summary><p>仅改变采购清单标记，不新增或扣减食材。</p>${btn("只标记已买", "purchaseMark", selected)}${btn("撤销最近标记", "undoLast")}</details>`;
};
const dailyPublishView = publishView;
publishView = function () {
  const meal = publishKind === "meal" ? store.state.meals.find(m => m.id === selected) : null;
  return dailyPublishView() + (meal ? `<details><summary>本餐试做信息预览</summary><p>${esc(Daily.trialText({outcome:meal.trialOutcome || "未评价",actualMinutes:meal.actualMinutes || 0,substitution:meal.trialSubstitution || "",failure:meal.trialFailure || ""})) || "未填写试做信息"}</p></details>` : "");
};
const dailyRecipeView = recipeView;
recipeView = function () {
  const html = dailyRecipeView(), r = currentRecipe();
  if (!r) return html;
  const choices = r.ingredients.flatMap(i => Daily.substituteOptions(i.name, dailyExclusions()));
  const ranked = R.rankPersonalized([r], store.state.foods, store.state.meals, store.feedback, recipeOptions())[0];
  const quality = Daily.recipeQuality(r);
  return html.replace('<summary>用量与来源质量</summary>', `<summary>用量与来源质量 · ${esc(quality.label)}</summary>${quality.issues.map(issue => `<p>${esc(issue)}</p>`).join("")}`).replace("<!-- recipe-secondary-end -->", `<details><summary>推荐与替代材料</summary><p>${esc((ranked?.reasons || []).slice(0,2).join(" · ") || "按当前筛选展示")}</p>${daily.household.members.some(m=>m.enabled) ? btn("按家人食量预览", "householdPortions") : ""}${choices.map((s,i) => `<article class="card"><p>${esc(s.original)} → ${esc(s.replacement)}</p><p class="hint">${esc(s.note)}</p>${btn("确认并保存示例主体做法", "substitute", i)}</article>`).join("") || "<p>暂未收录适合这道菜的替代建议。</p>"}</details>${daily.feedback?.recipeId === r.id ? btn("撤销刚才的推荐反馈", "undoFeedback") : ""}<!-- recipe-secondary-end -->`);
};
const dailyActions = actions;
actions = async function (action, value) {
  switch (action) {
    case "workspaceRead": {
      if (!cloud.session.accessToken) throw Error("请先登录");
      const epoch = parity.epoch;
      const check = await cloud.checkWorkspace(store);
      if (epoch !== parity.epoch) return;
      daily.workspace = check; render(); return;
    }
    case "workspaceUpload":
    case "workspaceDownload": {
      if (!daily.workspace) throw Error("请先重新对照");
      if (!confirm(action === "workspaceUpload" ? "确认用本机这份计划与偏好替换云端？" : "确认用云端这份替换本机计划与偏好？")) return;
      if (action === "workspaceUpload") await cloud.uploadWorkspace(store, daily.workspace);
      else { await store.applyWorkspace(daily.workspace.remote, daily.workspace.localRevision); await loadSettings(); }
      daily.workspace = null; render(); toast("计划与偏好已更新"); return;
    }
    case "batchChoose": {
      captureBatchRows();
      const candidates = frequentFoods();
      const source = candidates[Number(value)];
      if (!source || daily.rows.length >= 30) throw Error("最多30项");
      if (daily.rows.some(f => f.name === source.name)) return;
      daily.rows.push(Object.assign(new M.Food(), {name:source.name, category:source.category, unit:source.unit, location:source.location, quantity:source.purchasedQuantity > 0 ? source.purchasedQuantity : 1, expiryDate:D.shiftDay(M.dateString(new Date()),7), purchasedAt:M.dateString(new Date()), estimatedPrice:0}));
      render(); return;
    }
    case "batchRemove": captureBatchRows(); daily.rows.splice(Number(value),1); render(); return;
    case "householdToggle": daily.household.members[Number(value)].enabled = !daily.household.members[Number(value)].enabled; await setting("household:v1",daily.household); render(); return;
    case "householdRemove": daily.household.members.splice(Number(value),1); await setting("household:v1",daily.household); render(); return;
    case "householdPortions": {
      const members = daily.household.members.filter(m=>m.enabled);
      if (!members.length) throw Error("请先选择参与本餐的家人");
      people = Math.min(20,members.length);
      parity.appetite = Math.max(.5,Math.min(1.5,Daily.householdPeople(daily.household)/people));
      render(); toast("已更新人数和食量预览，确认后再应用推荐用量"); return;
    }
    case "undoLast": await store.undoLast(); render(); toast("已撤销，历史保留反向记录"); return;
    case "purchaseMark": {
      const item = store.state.shopping.find(s => s.id === value);
      if (!item || item.purchased) throw Error("这项已变化，请返回核对");
      await store.purchaseStatus(item); go("shopping"); toast("仅标记已买，可在5分钟内撤销"); return;
    }
    case "cook": {
      daily.deductionRecipe = clone(currentRecipe(value));
      daily.deduction = Daily.previewDeduction(daily.deductionRecipe, store.state.foods, M.dateString(new Date()));
      go("deduction"); return;
    }
    case "deductionCommit": {
      if (!daily.deductionRecipe) throw Error("请重新预览");
      const fresh = Daily.previewDeduction(daily.deductionRecipe, store.state.foods, M.dateString(new Date()));
      if (fresh.errors.length) { daily.deduction = fresh; render(); throw Error("库存已有变化，请核对"); }
      if (JSON.stringify(fresh) !== JSON.stringify(daily.deduction)) { daily.deduction = fresh; render(); throw Error("库存已有变化，请核对新的预览后再确认"); }
      if (!confirm("确认已经做好，按预览扣库存并记餐？")) return;
      await store.cook(daily.deductionRecipe); daily.deduction = null; daily.deductionRecipe = null; go("meals"); return;
    }
    case "substitute": {
      const r = currentRecipe(), choices = r.ingredients.flatMap(i => Daily.substituteOptions(i.name,dailyExclusions()));
      const option = choices[Number(value)]; if (!option) throw Error("替代选项已变化");
      if (!confirm(option.original + "改为" + option.replacement + "？保存为示例主体副本，制作前核对用量与火候。")) return;
      const copy = Daily.substitutedRecipe(r,option,dailyExclusions()); await store.saveRecipe(copy); toast("示例主体替代做法已保存"); go("recipes"); return;
    }
    case "undoFeedback":
      if (daily.feedback) {
        const f = daily.feedback;
        if (f.uploaded) await api("/catalog/recommendations/events/latest?recipeId="+encodeURIComponent(f.recipeId)+"&intent="+f.intent+"&action="+encodeURIComponent(f.action),"DELETE");
        await store.removeLatestFeedback(f.recipeId,f.intent,f.action); daily.feedback = null; render();
      }
      return;
    case "leftoverPlan": {
      const meal = store.state.meals.find(m => m.id === value); if (!meal) throw Error("原餐已变化");
      planDraft = Object.assign(new (require("MealPlan").MealPlan)(), {date,mode:"吃剩菜",note:meal.name.slice(0,200),sourceMealId:meal.id,remainingPortions:meal.leftoverPortions,people:1});
      go("plan"); return;
    }
    case "leftoverEaten":
      if (!confirm("确认已食用这份剩菜？关联原餐记0费用一餐，不再扣食材。")) return;
      await store.recordLeftoverPlan(value); go("meals"); toast("剩菜已记餐，没有重复扣库存或计费"); return;
    case "migrationRead": {
      if (!cloud.session.accessToken) throw Error("请先登录目标账号");
      const epoch = parity.epoch, text = await P.nativeAsync("import");
      if (epoch !== parity.epoch) return;
      const data = JSON.parse(text); store.backupConflicts(text);
      for (const key of ["foods","shopping","meals","recipes","templates","favorites"]) for (const row of data[key] || []) {
        if (row.familyId) throw Error("这份备份含家庭记录，请先使用仅含示例主体访客记录的备份");
        for (const field of ["localPhoto","photoOriginal","cloudPhoto","photoId","photoStatus"]) if (field in row) row[field] = "";
      }
      const cleaned = JSON.stringify(data);
      daily.migration = {data, text:cleaned, collisions:store.backupConflicts(cleaned), total:["foods","shopping","meals","recipes","templates","favorites","plans"].reduce((n,k) => n+(data[k] || []).length,0), revision:store.revision};
      render(); return;
    }
    case "migrationCommit":
      if (!daily.migration || daily.migration.revision !== store.revision) throw Error("本机记录已有变化，请重新预览备份");
      if (!cloud.session.accessToken || !confirm("确认只迁入本机账号空间？重合ID跳过，照片不迁入。")) return;
      await store.importData(daily.migration.text,false); daily.migration = null; render(); toast("记录已迁入，同步需另行操作"); return;
  }
  await dailyActions(action,value);
  if (action === "feedback") {
    const feedback = {recipeId:selected,intent,action:R.feedbackAction(value),uploaded:false};
    daily.feedback = feedback;
    if (cloud.session.accessToken) {
      try { await api("/catalog/recommendations/events","POST",{recipeId:feedback.recipeId,intent:feedback.intent,action:feedback.action}); feedback.uploaded=true; }
      catch { toast("反馈已保存在本机，云端暂未记录"); }
    }
    render();
  }
};
const dailySubmit = submit;
submit = async function (action) {
  if (action === "householdAdd") {
    const name=val("memberName").trim(), appetite=num("memberAppetite");
    if (!name || !Number.isFinite(appetite) || appetite < .25 || appetite > 3 || daily.household.members.length >= 20) throw Error("请核对称呼与食量，最多20位成员");
    daily.household.members.push({id:P.invoke("uuid"),name:name.slice(0,24),appetite,excluded:val("memberExcluded").split(/[,，、]/).map(x=>x.trim()).filter(Boolean),enabled:true});
    await setting("household:v1",daily.household); render(); return;
  }
  if (action === "batchFoods") {
    const rows = daily.rows.map((f,i) => Object.assign(new M.Food(), f, {quantity:num("batchQty"+i),unit:val("batchUnit"+i),location:val("batchLoc"+i),expiryDate:val("batchExp"+i),estimatedPrice:num("batchPrice"+i)}));
    await store.addFoodsBatch(rows); daily.rows=[]; go("pantry"); toast("已分批次入库"); return;
  }
  if (action === "food") { foodDraft.openedAt=val("openedAt"); foodDraft.openedExpiry=val("openedExpiry"); }
  if (action === "meal") {
    captureDailyMeal();
    if (!Number.isFinite(mealDraft.actualMinutes) || mealDraft.actualMinutes < 0 || mealDraft.actualMinutes > 2880 || !Number.isFinite(mealDraft.leftoverPortions) || mealDraft.leftoverPortions < 0 || mealDraft.leftoverPortions > 100 || !["未评价","成功","需改进"].includes(mealDraft.trialOutcome)) throw Error("请核对试做结果、实际分钟与剩余份数");
    if (mealDraft.financeFood>=0) {
      const finance = Daily.mealFinance({food:mealDraft.financeFood,delivery:mealDraft.deliveryFee,discount:mealDraft.discount,people:mealDraft.splitPeople,share:mealDraft.personalShares});
      mealDraft.mealTotal = finance.total; mealDraft.personalCost = finance.personal;
    } else { mealDraft.mealTotal = -1; mealDraft.personalCost = -1; }
  }
  await dailySubmit(action);
};
