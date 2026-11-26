"use strict";
const P = require("Platform"),
  M = require("Models"),
  R = require("RecommendationCore"),
  F = require("RecipeFilterCore"),
  U = require("UsabilityCore"),
  E = require("ExperienceCore"),
  D = require("DailyExperienceCore"),
  K = require("KitchenWorkflowCore"),
  G = require("CookingGuide"),
  T = require("UtilityState"),
  C = require("Cloud"),
  { Vault } = require("Vault");
const store = new (require("LocalStore").LocalStore)(),
  cloud = new C.Cloud(),
  screen = document.getElementById("screen");
cloud.endpoint = require("AuthInputCore").DEFAULT_SERVICE_ENDPOINT;
let draftDirty = false,
  draftSaveHandle = null;
let timerHandle = null;
let page = "today",
  history = [],
  selected = null,
  people = 2,
  intent = "cook",
  date = M.dateString(new Date()),
  week = date,
  mealDraft = null,
  foodDraft = null,
  shoppingDraft = null,
  filter = new F.RecipeFilterOptions(),
  recipePage = 1,
  searchText = "",
  experience = new E.ExperienceState(),
  utility = new T.UtilityState(),
  settings = {},
  drawResult = null,
  drawAttempt = 0,
  conflicts = [],
  familyList = [],
  postList = [],
  postCursor = "",
  postMore = false,
  communityScope = "public",
  currentPost = null,
  commentList = [],
  progress = null,
  photoDraft = null,
  busy = false,
  filterOnlyFav = false,
  collectionIndex = -1;
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const clone = (v) => JSON.parse(JSON.stringify(v));
const btn = (label, action, value = "", cls = "") =>
  `<button type="button" data-action="${esc(action)}" data-value="${esc(value)}" class="${cls}"${["draftFilter", "filterSection", "draftOrder", "draftFavorites"].includes(action) ? ` aria-pressed="${cls.split(" ").includes("active")}"` : ""}>${esc(label)}</button>`;
const input = (name, label, value = "", type = "text", extra = "") =>
  `<label>${esc(label)}<input name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const select = (name, label, values, value) =>
  `<label>${esc(label)}<select name="${esc(name)}">${values
    .map((v) => {
      const [id, text] = Array.isArray(v) ? v : [v, v];
      return `<option value="${esc(id)}" ${id === value ? "selected" : ""}>${esc(text)}</option>`;
    })
    .join("")}</select></label>`;
const area = (name, label, value = "", hint = "") =>
  `<label>${esc(label)}<textarea name="${esc(name)}" placeholder="${esc(hint)}">${esc(value)}</textarea></label>`;
const form = (action, html, label = "保存") =>
  `<form data-submit="${action}">${html}<div class="sticky"><button class="primary" type="submit">${label}</button></div></form>`;
const empty = (text = "暂时空空的，慢慢添一点吧", image = "brand_monster.png") =>
  `<div class="empty"><img src="media/${esc(image)}" alt=""><p>${esc(text)}</p></div>`;
const heading = (title, sub = "") =>
  `<h1>${esc(title)}</h1>${sub ? `<p class="hint">${esc(sub)}</p>` : ""}`;
const money = (v) => "¥" + (Number(v) || 0).toFixed(2);
const allRecipes = () =>
  [
    ...new Map(
      M.offlineRecipes()
        .concat(store.builtinRecipes, store.state.recipes)
        .map((r) => [r.id, r]),
    ).values(),
  ].filter(
    (r) =>
      !store.retiredRecipeIds.includes(r.id) ||
      store.state.recipes.some((s) => s.id === r.id),
  );
const findRecipe = (id) => allRecipes().find((r) => r.id === id);
const cover = (r) => window.recipeCovers[r.id] || "media/ui_recipes.png";
const art = (name, cls = "", alt = "") =>
  `<img class="${cls}" src="media/${name}" alt="${esc(alt)}">`;
const recipeCard = (r, reason = "") =>
  `<article class="card recipe"><img loading="lazy" src="${cover(r)}" alt="${esc(r.name)}"><div><h3>${esc(r.name)}</h3><small>${esc(r.region || r.cuisine || "家常")} · ${r.minutes || "待核"}分钟</small><p class="hint">${esc(
    reason ||
      r.ingredients
        .filter((i) => !i.optional)
        .slice(0, 3)
        .map((i) => i.name)
        .join(" · "),
  )}</p><div class="recipe-entry-actions">${btn("看做法 →", "recipe", r.id)}${btn("问小怪", "assistantRecipe", r.id)}</div></div></article>`;
function toast(t) {
  const e = document.getElementById("toast");
  e.textContent = t;
  e.style.display = "block";
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (e.style.display = "none"), 4000);
}
function val(name) {
  const e = document.querySelector(`[name="${name}"]`);
  return e ? e.value : "";
}
function num(name) {
  return Number(val(name));
}
function checked(name) {
  return !!document.querySelector(`[name="${name}"]`)?.checked;
}
async function setting(key, value) {
  settings[key] = value;
  await store.setting(
    key,
    typeof value === "string" ? value : JSON.stringify(value),
  );
}
async function saveExperience() {
  await setting("androidExperience", experience);
}
async function saveUtility() {
  await setting("androidUtility", utility);
}
function go(next, keep = false) {
  if (
    next !== page &&
    draftDirty &&
    !confirm("这页还没保存。草稿会留在本机，确认离开？")
  )
    return;
  if (next !== page) draftDirty = false;
  if (next !== page && !keep) history.push({ page, selected, date });
  if (page === "guide" && next !== "guide")
    P.invoke("keepAwake", { enabled: false });
  page = next;
  render();
  window.scrollTo(0, 0);
}
window.handleBack = () => {
  if (draftDirty && !confirm("这页还没保存。草稿会留在本机，确认返回？"))
    return true;
  draftDirty = false;
  if (["today","recipes","meals","pantry","mine"].includes(page)) { history=[];return false; }
  if (history.length) {
    const old = history.pop();
    page = old.page;
    selected = old.selected;
    date = old.date;
    P.invoke("keepAwake", {
      enabled: page === "guide" && settings.keepAwake !== "false",
    });
    render();
    return true;
  }
  if (page !== "today") {
    go("today", true);
    return true;
  }
  return false;
};
// Native back, edge swipe and toolbar back share one asynchronous transaction.
let appBackPending = false;
window.requestAppBack = async function () {
  if (appBackPending) return true;
  appBackPending = true;
  try { return (await window.handleBack()) !== false; }
  catch (error) { console.error(error); toast('暂时无法返回，请重试'); return true; }
  finally { appBackPending = false; }
};
window.openNativeRoute = (route) => go(route);
window.platformVisibility = (visible) => {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
  if (visible) {
    updateTimerText();
    timerHandle = setInterval(updateTimerText, 1000);
  }
};
function navigation() {
  document.getElementById("nav").innerHTML = [
    ["today", "今日", "today"],
    ["recipes", "菜谱", "recipes"],
    ["meals", "记餐", "diary"],
    ["pantry", "食材", "pantry"],
    ["mine", "我的", "profile"],
  ]
    .map(
      ([id, label, icon]) =>
        `<button data-action="go" data-value="${id}" class="${page === id ? "active" : ""}" aria-label="${label}"${page===id?' aria-current="page"':''}><span class="nav-icon"><img src="media/ui_${icon}.png" onerror="this.style.display='none'" alt=""></span><span class="nav-label">${label}</span></button>`,
    )
    .join("");
}
function searchIcon(route){
  return `<button id="main-search" class="search-entry content-search-icon" data-action="go" data-value="${route==='community'?'community-search':'recipe-search'}" aria-label="${route==='community'?'搜索社区分享':'搜索菜谱'}"><img src="media/utility_search.png" alt="" aria-hidden="true"><span>搜索</span></button>`;
}
function favoriteIcon(id,count){
  const saved=store.state.favorites.some(f=>f.recipeId===id),r=allRecipes().find(r=>r.id===id);
  return `<button class="favorite-heart" data-action="favorite" data-value="${esc(id)}" aria-label="${saved?'取消收藏':'收藏'}${esc(r?.name || '菜谱')}${count===undefined?'':'，'+count+'人收藏'}" aria-pressed="${saved}"><svg class="sketch-heart" viewBox="0 0 32 30" aria-hidden="true" focusable="false"><path class="heart-pigment" d="M16 26C11 22 3 17 3 10C3 2 13 1 16 8C20 1 29 3 29 10C29 17 21 23 16 26Z"/><path class="heart-outline" d="M16 26C10 22 3 17 3 10C2 3 12 1 16 8C20 1 29 3 29 10C30 16 22 23 16 26Z"/><path class="heart-sketch" d="M15 25C10 21 4 16 4 10C4 4 12 3 16 9C20 3 27 3 28 10C29 16 21 22 17 25"/></svg>${count===undefined?'':`<small aria-hidden="true">${count}</small>`}</button>`;
}
function favoritesEntry(){
 return `<button class="saved-recipes-entry" data-action="go" data-value="collections" aria-label="查看收藏，${store.state.favorites.length}份喜欢的做法和自建菜单"><img src="media/ui_recipes.png" alt="" aria-hidden="true"><span>收藏</span><small>${store.state.favorites.length}</small></button>`;
}
function render() {
  navigation();
  const mainRoute = ["today", "recipes", "meals", "pantry", "mine"].includes(
    page,
  );
  document.getElementById("nav").hidden = !mainRoute;
  const header = document.getElementById("page-header");
  header.hidden = mainRoute;
  const toolbarRecipe=["recipe","guide"].includes(page)?currentRecipe():null;
  header.classList.toggle("recipe-toolbar",!!toolbarRecipe);
  header.innerHTML = btn("‹ 返回", "back") + (toolbarRecipe ? `<strong class="recipe-toolbar-title">${esc(toolbarRecipe.name)}</strong>${favoriteIcon(toolbarRecipe.id)}` : "");
  document.body.dataset.page = page;
  const renderers = {
    ...(window.parityViews || {}),
    today: todayView,
    recipes: recipesView,
    filters: filtersView,
    recipe: recipeView,
    guide: guideView,
    draw: drawView,
    pantry: pantryView,
    food: foodView,
    consume: consumeView,
    stockHistory: stockHistoryView,
    shopping: shoppingView,
    shoppingEdit: shoppingEditView,
    purchase: purchaseView,
    meals: mealsView,
    meal: mealView,
    stats: statsView,
    plans: plansView,
    plan: planView,
    procurement: procurementView,
    collections: collectionsView,
    timers: timersView,
    mine: mineView,
    preferences: preferencesView,
    help: helpView,
    account: accountView,
    families: familiesView,
    devices: devicesView,
    profile: profileView,
    community: communityView,
    post: postView,
    publish: publishView,
    conflicts: conflictsView,
    recipeEdit: recipeEditView,
    barcode: barcodeView,
    publicRecipes: publicRecipesView,
  };
  try {
    screen.innerHTML = (renderers[page] || todayView)();
  } catch (e) {
    screen.innerHTML =
      heading("这一页暂时没打开") +
      `<p>${esc(e.message)}</p>` +
      btn("返回今日", "go", "today");
    console.error(e);
  }
  updateWidget();
}
function homeCalendar() {
  const current = new Date(date + "T12:00:00");
  const offset = (current.getDay() + 6) % 7;
  return `<div class="row between calendar-month">${btn("‹", "homeDay", D.shiftDay(date, -7))}<span>${esc(date.slice(0, 7))}</span>${btn("›", "homeDay", D.shiftDay(date, 7))}</div><div class="week-strip">${[
    "一",
    "二",
    "三",
    "四",
    "五",
    "六",
    "日",
  ]
    .map((label, i) => {
      const day = D.shiftDay(date, i - offset);
      const marked = store.state.meals.some((m) => m.date.slice(0, 10) === day);
      return `<button class="${day === date ? "selected" : ""}" data-action="homeDay" data-value="${day}"><small>${label}</small><span>${Number(day.slice(8))}</span><small>${marked ? "●" : "　"}</small></button>`;
    })
    .join("")}</div>`;
}
function todayView() {
  const meals = store.state.meals.filter((m) => M.dateString(new Date(m.date)) === date),
    summary = E.spendingSummary(meals),
    future = date > M.dateString(new Date());
  return (
    `<section class="home-brand">${art("brand_monster.png")}<div><h1>开饭小怪</h1><small>${date===M.dateString(new Date())?"今天也要好好吃饭":esc(date)}</small></div>${btn("回今天", "homeDay", M.dateString(new Date()))}</section><section class="table-cover"><p class="daily-slogan">${esc(D.dailySlogan(date)).replace("，", "，<br>")}</p>${art("table_collage.png","table-collage","食物与小怪的餐桌拼贴插画")}</section>` +
    `<div class="home-primary home-actions">${btn(future?'安排一餐':'今天吃什么',future?'planNew':'go',future?'晚餐':'draw', 'primary')}${future?'':btn("记一餐","mealNew","午餐")}</div>` +
    '<section class="calendar-notebook" aria-label="餐桌日历">'+homeCalendar()+'</section>' +
    (settings.androidDraft
      ? `<div class="card row"><span>有一份上次没写完的小记</span>${btn("继续填写", "restoreDraft")}${btn("放弃草稿", "discardDraft")}</div>`
      : "") +
    `<details class="date-picker"><summary>选择日期 · ${esc(date)}</summary>${input("day", "日期", date, "date")}</details>` +
    `<div class="row">${btn("做饭为主", "mode", "cook", intent === "cook" ? "active" : "")}${btn("记餐为主", "mode", "record", intent === "record" ? "active" : "")}</div>` +
    (future
      ? `<div class="card">未来的好味道，先放进计划里。${btn("安排这一天", "go", "plans")}</div>`
      : "") +
    `<div class="row between meal-section-heading"><h2>${date===M.dateString(new Date())?"今天的三餐":esc(date.slice(5))+" 的餐桌"}</h2><small>${meals.length}餐 · 实付${money(summary.paid)} · 估算${money(summary.estimated)}</small></div>` +
    ["早餐", "午餐", "晚餐", ...(meals.some(m=>m.mealType==="加餐") || store.state.plans.some(p=>p.date===date&&p.occasion==="加餐") ? ["加餐"] : [])]
      .map(type => {
        const records=meals.filter(m=>m.mealType===type),plans=store.state.plans.filter(p=>p.date===date&&p.occasion===type);
        return `<article class="card meal-card meal-${type}"><div class="row between"><h3>${art(({早餐:"ui_breakfast.png",午餐:"meal_lunch.png",晚餐:"meal_dinner.png",加餐:"meal_snack.png"})[type])}${type}</h3><div class="row">${future?"":btn("＋ 记餐","mealNew",type)}${btn("安排 ›","planNew",type)}</div></div>${records.map(m=>`<button class="home-meal-line" data-action="mealEdit" data-value="${esc(m.id)}"><span>${esc(m.name)}</span><span>${money(m.estimatedCost)} ›</span></button>`).join("")}${plans.map(p=>`<button class="home-plan-line" data-action="planEdit" data-value="${esc(p.id)}"><span>${p.completed?"✓":"○"} ${esc(p.mode&&p.mode!=="在家做"?p.note:findRecipe(p.recipeId)?.name || "历史菜谱")} · ${p.people}人</span><span>计划 ›</span></button>${p.note===cookedPlanNote?btn("撤销加入","undoCookedPlan",p.id):""}`).join("")}${!records.length&&!plans.length?`<p class="hint">${future?"想好吃什么，就安排下来":"还没记录"}</p>`:""}</article>`;
      }).join("") +
    `<section class="daily-dish card"><div class="row between"><div><h2>每日一菜</h2><small>转一转今天吃什么</small></div>${art("ui_shuffle.png")}</div>${recipeCard(allRecipes()[Math.abs(Math.floor(new Date(date + "T12:00:00").getTime() / 86400000)) % allRecipes().length])}${btn("抽一餐", "go", "draw")}</section><div class="grid shortcut-grid"><button data-action="go" data-value="plans">${art("ui_today.png")}七日计划</button><button data-action="go" data-value="shopping">${art("ui_pantry.png")}采购清单</button></div><button class="community-banner" data-action="community">${art("ui_community.png")}<span>餐桌广场</span><small>逛逛 ›</small></button>` +
    (!settings.quickstartDone
      ? `<div class="card"><h3>小怪陪你慢慢记</h3><p>选好模式，从一份食材或一顿饭开始。</p>${btn("知道啦", "quickstart")}</div>`
      : "") +
    ""
  );
}
function recipeOptions() {
  const options = new R.RankingOptions();
  Object.assign(options, settings[intent + "Preference"] || {});
  options.intent = intent;
  options.excluded = (settings.excluded || "").split(/[,，、]/).filter(Boolean);
  options.maxMinutes = filter.maxMinutes;
  return options;
}
function filteredRecipes() {
  const options = F.normalizeRecipeFilter(filter);
  options.excludedIngredients = (settings.excluded || "")
    .split(/[,，、]/)
    .filter(Boolean);
  options.costPeople = people;
  const query = options.search;
  options.search = "";
  let list = F.filterRecipes(
    allRecipes(),
    options,
    store.state.foods,
    M.dateString(new Date()),
  );
  if (query) {
    const result = require("RecipeSearchCore").searchRecipeCandidates(
      list,
      query,
    );
    list = result.recipes;
  }
  if (filterOnlyFav)
    list = list.filter((r) =>
      store.state.favorites.some((f) => f.recipeId === r.id),
    );
  if (collectionIndex >= 0)
    list = list.filter((r) =>
      experience.collections[collectionIndex]?.ids.includes(r.id),
    );
  if (settings.recipeOrder === "price")
    return list.sort((a, b) => {
      const ac = U.estimateRecipeCost(a, people),
        bc = U.estimateRecipeCost(b, people);
      return Number(bc.usable) - Number(ac.usable) || ac.total - bc.total;
    });
  if (settings.recipeOrder === "time")
    return list.sort((a, b) => (a.minutes || 9999) - (b.minutes || 9999));
  const ranks = R.rankPersonalized(
    list,
    store.state.foods,
    store.state.meals,
    store.feedback,
    recipeOptions(),
  );
  return ranks.map((row) => list.find((r) => r.id === row.recipeId));
}
function recipesView() {
  const list = filteredRecipes();
  return (
    `<div class="row between">${heading("菜谱")}${btn("抽一餐", "go", "draw")}</div><p class="hint">${allRecipes().length}道离线菜 · ${people}人份参考</p><div class="category-icons">${[
      ["快手菜", "quick"],
      ["汤类", "soup"],
      ["粥类", "porridge"],
      ["大菜", "feast"],
    ]
      .map(
        ([label, icon]) =>
          `<button class="${filter.categories.includes(label) ? "active" : ""}" data-action="recipeCategory" data-value="${label}">${art("ui_" + icon + ".png")}<span>${label}</span></button>`,
      )
      .join("")}</div>` +
    `<div class="row">${btn("做饭", "mode", "cook", intent === "cook" ? "active" : "")}${btn("外食灵感", "mode", "record", intent === "record" ? "active" : "")}${btn("抽一餐", "go", "draw")}</div>` +
    form(
      "search",
      input("search", "搜菜名、地区或食材", filter.search),
      "查找",
    ) +
    `<div class="row">${btn("筛选", "go", "filters")}${btn(filterOnlyFav ? "全部菜谱" : "我的收藏", "favOnly")}${btn("收藏夹", "go", "collections")}${btn("＋ 私人菜谱", "recipeNew")}${btn("公共菜谱", "publicRecipes")}</div><div class="row">${select(
      "people",
      "人数",
      [1, 2, 3, 4, 5, 6, 8, 10, 20].map((n) => [String(n), n + "人"]),
      String(people),
    )}${select(
      "recipeOrder",
      "排序",
      [
        ["rank", "综合推荐"],
        ["price", "价格由低到高"],
        ["time", "时间由短到长"],
      ],
      settings.recipeOrder || "rank",
    )}</div><p class="hint">${esc(F.recipeFilterSummary(filter))} · ${list.length}道</p>` +
    (list.length
      ? list
          .slice(0, recipePage * 20)
          .map((r) => recipeCard(r))
          .join("") +
        (list.length > recipePage * 20 ? btn("再看20道", "moreRecipes") : "")
      : empty("没有匹配的菜。试着放宽一项，忌口会保留。") +
        btn("逐项放宽", "relaxFilter"))
  );
}
function chips(field, values) {
  return `<div class="row">${values.map((v) => btn(v, "filterChip", field + "|" + v, filter[field].includes(v) ? "active" : "")).join("")}</div>`;
}
function filtersView() {
  const recipes = allRecipes();
  return (
    heading("想吃什么，慢慢选", "不同条件一起匹配；忌口始终生效") +
    form(
      "filters",
      input(
        "maxMinutes",
        "最多用时（分钟，0不限）",
        filter.maxMinutes,
        "number",
        'min="0" max="1440"',
      ) +
        input(
          "maxCost",
          "整道费用上限（元，0不限）",
          filter.maxCost,
          "number",
          'min="0" step="0.01"',
        ) +
        select(
          "availability",
          "食材够不够",
          [
            ["any", "不限"],
            ["ready", "主料够用"],
            ["partial", "用上现有食材"],
          ],
          filter.availability,
        ) +
        input(
          "ingredients",
          "想用的食材，用逗号分隔",
          filter.ingredients.join("，"),
        ) +
        `<h3>类别</h3>${chips("categories", [...new Set(recipes.map((r) => r.category).filter(Boolean))])}<details><summary>地区</summary>${chips("regions", [...new Set(recipes.map((r) => r.region).filter(Boolean))])}</details><details><summary>口味</summary>${chips("tastes", [...new Set(recipes.map((r) => r.taste).filter(Boolean))])}</details>`,
      "应用筛选",
    ) +
    btn("保存这组条件", "saveFilter") +
    btn("重置", "resetFilter") +
    experience.filters
      .map(
        (f, i) =>
          `<div class="card row">${btn(f.name, "loadFilter", i)}${btn("删除", "deleteFilter", i)}</div>`,
      )
      .join("")
  );
}
function scaledRecipe(recipe) {
  const r = clone(recipe),
    o = new (require("PortionCore").PortionOptions)();
  o.people = people;
  o.basePeople = r.people || 2;
  r.ingredients = require("PortionCore").recommendPortions(r.ingredients, o);
  r.estimatedCost = U.estimateRecipeCost(recipe, people).total;
  r.people = people;
  return r;
}
function recipeView() {
  const r = findRecipe(selected);
  if (!r) return empty("这道菜已不在当前目录，历史记餐仍保留");
  const scaled = scaledRecipe(r),
    guide = G.buildCookingGuide(r),
    check = G.buildCookingChecklist(r),
    cost = U.estimateRecipeCost(r, people);
  return (
    heading(r.name, `${r.region || r.cuisine} · 约${r.minutes || "待核"}分钟`) +
    `<img class="cover" src="${cover(r)}" alt="${esc(r.name)}"><div class="row">${favoriteIcon(r.id)}${btn("放入收藏夹", "addCollection", r.id)}${btn("加到计划", "planRecipe", r.id)}</div>` +
    select(
      "people",
      "用餐人数",
      [1, 2, 3, 4, 5, 6, 8, 10, 20].map((n) => [String(n), n + "人"]),
      String(people),
    ) +
    `<p>${cost.usable ? "约 " + money(cost.total) : "费用未知"} · ${people}人份 ${cost.inferred ? "（食材估算）" : "（菜谱参考）"}</p><div class="row">${btn("专注做菜", "startGuide", r.id, "primary")}${btn("只记吃过", "mealRecipe", r.id)}${btn("制作并扣库存", "cook", r.id)}</div><h2>完整做法</h2>` +
    guide.steps
      .map(
        (s, i) =>
          `<article class="card"><h3>${i + 1}. ${esc(s.title)}</h3><p>${esc(s.instruction)}</p><small>${esc([s.heat, s.time, s.checkpoint].filter(Boolean).join(" · "))}</small></article>`,
      )
      .join("") +
    `<details><summary>用料 · ${people}人份与采购</summary>${scaled.ingredients.map((i) => `<p>${esc(i.name)}：${i.quantity > 0 ? esc(i.quantity + " " + i.unit) : "用量待核"} ${i.optional ? "（可选）" : ""}</p>`).join("")}${btn("缺口加入采购预览", "recipeProcurement", r.id)}</details><details><summary>备菜与常见失误</summary>${[...check.preparation, ...check.pitfalls].map((t) => `<p>• ${esc(t)}</p>`).join("")}</details><details><summary>食材小知识与替代</summary>${
      r.ingredients
        .flatMap((i) => G.knowledgeFor(i.name))
        .map(
          (k) =>
            `<p>${esc(k.title) + "</p><p>" + [k.selection, k.texture, k.use, k.substitution, k.caution].filter(Boolean).map(esc).join("</p><p>")}</p>`,
        )
        .join("") || "<p>暂无补充知识</p>"
    }</details><div class="row">${["最近吃过", "太麻烦", "不合口味"].map((s) => btn(s, "feedback", s)).join("")}</div>` +
    (store.state.recipes.some((x) => x.id === r.id)
      ? btn("编辑私有菜谱", "recipeEdit", r.id)
      : "")
  );
}
function guideView() {
  const r = findRecipe(selected),
    guide = G.buildCookingGuide(r);
  progress = utility.progress.find(
    (p) => p.recipeId === selected && p.signature === T.cookingSignature(r),
  ) || {
    recipeId: selected,
    signature: T.cookingSignature(r),
    step: 0,
    completed: [],
    prepared: [],
  };
  const s = guide.steps[progress.step];
  return (
    heading(r.name, `第${progress.step + 1} / ${guide.steps.length}步`) +
    `<progress value="${progress.step + 1}" max="${guide.steps.length}"></progress><details><summary>备料清单</summary>${guide.preparation.map((t, i) => `<label class="check"><input type="checkbox" data-prepare="${i}" ${progress.prepared.includes(String(i)) ? "checked" : ""}>${esc(t)}</label>`).join("")}</details><h2>${esc(s.title)}</h2><p class="bigstep">${esc(s.instruction)}</p><p>${esc(s.heat)} · ${esc(s.time)}</p><p class="hint">${esc(s.checkpoint)}</p><div class="row">${btn("上一步", "guideStep", -1)}${btn("这步完成", "guideDone")}${btn("下一步", "guideStep", 1)}</div><div class="row">${btn("设个计时", "newTimer")}${btn("计时器", "go", "timers")}${btn(settings.keepAwake === "false" ? "保持亮屏：关" : "保持亮屏：开", "awake")}</div><p class="hint">阅读进度不改变库存。做完后由你确认是否记餐。</p>${btn("只记吃过", "mealRecipe", selected)}`
  );
}
function drawView() {
  return (
    heading("小怪帮你抽一餐", "先选条件，再揭晓。外食为点菜灵感。") +
    form(
      "draw",
      select(
        "people",
        "几人吃",
        [1, 2, 3, 4, 5, 6, 8].map((n) => [String(n), n + "人"]),
        String(people),
      ) +
        select(
          "preset",
          "想搭配",
          [...U.DRAW_PRESETS.map((p) => [p.id, p.label])],
          settings.drawPreset || "two-soup",
        ) +
        input(
          "minutes",
          "整餐用时上限（分钟，0不限）",
          settings.drawMinutes ?? 60,
          "number",
          'min="0"',
        ) +
        input(
          "budget",
          "整餐预算上限（元，0不限）",
          settings.drawBudget ?? 80,
          "number",
          'min="0" step="0.01"',
        ),
      "揭晓这一餐",
    ) +
    (drawResult
      ? `<h2>${esc(drawResult.message || "今天就吃这些吧")}</h2><p>保守参考 ${drawResult.minutes}分钟 · 约${money(drawResult.cost)}</p>${drawResult.ids.map((id) => recipeCard(findRecipe(id))).join("")}<div class="row">${btn("合并备料与采购", "drawProcurement")}${btn("多菜安排", "timeline")}${btn("全部加入计划", "drawPlan")}</div>`
      : "")
  );
}
function pantryView() {
  const foods = store.state.foods.filter(
    (f) => !f.archived && (f.name.includes(searchText) || !searchText),
  );
  return (
    heading("我的库存", "记下食材，也珍惜每一份") +
    `<div class="row">${btn("＋ 添食材", "foodNew", "", "primary")}${btn("采购清单", "go", "shopping")}${btn("条码查询", "go", "barcode")}${btn("消耗与浪费", "go", "stockHistory")}</div>` +
    form("pantrySearch", input("query", "找食材", searchText), "查找") +
    `<div class="chips">${M.TEMPLATES.map((t, i) => btn("＋ " + t.name, "foodTemplate", i)).join("")}</div>` +
    (foods.length
      ? foods
          .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
          .map(
            (f) =>
              `<article class="card food-card">${art("food_" + (/鸡蛋|鸭蛋|鹅蛋/.test(f.name) ? "eggs" : /番茄|西红柿/.test(f.name) ? "tomato" : /奶/.test(f.name) ? "milk" : /肉/.test(f.name) ? "pork" : /米|面/.test(f.name) ? "rice" : /果|苹果/.test(f.name) ? "apple" : /盐|油|酱|醋|糖/.test(f.name) ? "spice" : /干|菌|木耳/.test(f.name) ? "dried" : "greens") + ".webp", "food-art")}<div class="row between"><h3>${esc(f.name)}</h3><span class="badge ${M.daysLeft(f) < 0 ? "warning" : ""}">${M.daysLeft(f) < 0 ? "已过期" : M.daysLeft(f) + "天到期"}</span></div><p>${f.quantity}${esc(f.unit)} · ${esc(f.location)} · ${money(f.estimatedPrice)}</p><div class="row">${btn("编辑", "foodEdit", f.id)}${btn("实际消耗", "consume", f.id)}${btn("到期提醒", "expiryReminder", f.id)}</div></article>`,
          )
          .join("")
      : empty("先点一份模板，确认后放进食库")) +
    `<details><summary>批量调整</summary>${form(
      "batchFood",
      select(
        "operation",
        "调整",
        ["location", "expiry"].map((v, i) => [v, ["存放位置", "到期日期"][i]]),
        "location",
      ) +
        input("ids", "食材ID（逗号分隔，留空为当前列表）", "") +
        input("value", "新位置或YYYY-MM-DD", ""),
      "确认批量修改",
    )}</details>`
  );
}
function foodView() {
  const f = foodDraft || new M.Food();
  return (
    heading(f.id ? "编辑食材" : "添一份食材", "先选常用项，其余慢慢填") +
    form(
      "food",
      input("name", "食材名", f.name, "text", 'required maxlength="100"') +
        select("category", "分类", M.CATEGORIES, f.category) +
        `<div class="grid">${input("quantity", "数量", f.quantity, "number", 'min="0" step="0.001" required')}${select("unit", "单位", M.UNITS, f.unit)}</div>` +
        select("location", "放在哪里", store.state.locations, f.location) +
        input(
          "expiryDate",
          "到期日期",
          f.expiryDate || D.shiftDay(M.dateString(new Date()), 7),
          "date",
          "required",
        ) +
        `<details><summary>购入日期、价格与备注</summary>${input("purchasedAt", "购入日期", f.purchasedAt || M.dateString(new Date()), "date")}${input("estimatedPrice", "这批总价（元）", f.estimatedPrice, "number", 'min="0" step="0.01"')}${area("notes", "备注", f.notes)}</details>`,
    ) +
    (f.id ? btn("删除这份食材", "foodDelete", f.id, "danger") : "")
  );
}
function consumeView() {
  const f = store.state.foods.find((f) => f.id === selected);
  return (
    heading("实际用了多少", `${f.name} · 现有${f.quantity}${f.unit}`) +
    form(
      "consume",
      input(
        "quantity",
        "数量",
        f.quantity,
        "number",
        `min="0.001" max="${f.quantity}" step="0.001" required`,
      ) +
        select(
          "reason",
          "去向",
          [
            ["consumed", "吃掉了"],
            ["wasted", "丢弃了"],
          ],
          "consumed",
        ),
      "确认并记入流水",
    )
  );
}
function stockHistoryView() {
  const list = store.state.foods;
  return (
    heading("每份食材的去向") +
    list
      .map(
        (f) =>
          `<article class="card"><h3>${esc(f.name)}</h3><p>购入 ${f.purchasedQuantity >= 0 ? f.purchasedQuantity + esc(f.unit) : "未记录"} · ${money(U.purchaseCost(f))}</p><p>消耗 ${money(f.consumedCost)} / 浪费 ${money(f.wastedCost)}</p><details><summary>${(f.movements || []).length}条流水</summary>${(f.movements || []).map((m) => `<p>${esc(m.date.slice(0, 10))} ${m.reason === "wasted" ? "丢弃" : "消耗"} ${m.quantity}${esc(f.unit)} · ${money(m.cost)}</p>`).join("")}</details>${btn("再买一份", "replenish", f.id)}</article>`,
      )
      .join("")
  );
}
function shoppingView() {
  return (
    heading("采购清单", "买到以后，确认份量再入库") +
    `<div class="row">${btn("＋ 添一项", "shoppingNew", "", "primary")}${btn("清理已买", "clearPurchased")}${btn("导出清单", "exportShopping")}${btn("补货建议", "replenishments")}</div>` +
    M.CATEGORIES.map((category) => {
      const list = store.state.shopping.filter(
        (s) => (s.category || "其他") === category,
      );
      return list.length
        ? `<h2>${category}</h2>` +
            list
              .map(
                (s) =>
                  `<article class="card shopping-item"><h3>${s.purchased ? "✓ " : ""}${esc(s.name)}</h3><p>${s.quantity}${esc(s.unit)} ${s.familyId ? "· 家庭共享" : ""}</p><div class="row">${!s.purchased ? btn("买到了", "purchase", s.id, "primary") : ""}${btn("编辑", "shoppingEdit", s.id)}${s.familyId ? btn("认领 / 取消", "claim", s.id) : ""}${btn("删除", "shoppingDelete", s.id, "danger")}</div>${E.duplicatePurchase(s, store.state.shopping) ? '<p class="warning">今天可能已有同名购买，请核对</p>' : ""}</article>`,
              )
              .join("")
        : "";
    }).join("") +
    (store.state.shopping.length ? "" : empty("采购清单空空，缺什么再添"))
  );
}
function shoppingEditView() {
  const s = shoppingDraft || new M.Shopping();
  return (
    heading("采购这一份") +
    form(
      "shopping",
      input("name", "名称", s.name, "text", "required") +
        input(
          "quantity",
          "数量",
          s.quantity,
          "number",
          'min="0.001" step="0.001" required',
        ) +
        select("unit", "单位", M.UNITS, s.unit) +
        select("category", "分类", M.CATEGORIES, s.category) +
        area("notes", "备注", s.notes) +
        select(
          "familyId",
          "保存范围",
          [["", "仅自己"], ...familyList.map((f) => [f.id, f.name])],
          s.familyId || "",
        ),
    )
  );
}
function purchaseView() {
  const s = store.state.shopping.find((s) => s.id === selected);
  return (
    heading("买到了，放入食库", s.name) +
    form(
      "purchase",
      input(
        "quantity",
        "实际买到数量",
        s.quantity,
        "number",
        'min="0.001" step="0.001" required',
      ) +
        select(
          "location",
          "存放位置",
          store.state.locations,
          store.state.locations[0],
        ) +
        input(
          "expiryDate",
          "到期日期",
          D.shiftDay(M.dateString(new Date()), 7),
          "date",
          "required",
        ) +
        input("price", "这批总价（元）", 0, "number", 'min="0" step="0.01"'),
      "确认入库",
    )
  );
}
function mealsView() {
  const meals = store.state.meals
    .filter((m) => m.date.slice(0, 10) === date)
    .slice()
    .reverse();
  return (
    heading("我的记餐", "一顿饭，一点生活的记忆") +
    `<section class="diary-summary">${art("avatar_editorial_rice.png")}<div><h2>慢慢记，好好吃</h2><p class="hint">${meals.length}餐 · 实付${money(E.spendingSummary(meals).paid)} · 估算${money(E.spendingSummary(meals).estimated)}</p></div></section>` +
    input("day", "选择日期", date, "date") +
    `<div class="row">${btn("＋ 记一餐", "mealNew", "晚餐", "primary")}${btn("日周月统计", "go", "stats")}</div>` +
    (meals.length
      ? meals
          .map(
            (m) =>
              `<article class="card">${m.localPhoto ? `<img class="cover" loading="lazy" src="${esc(m.localPhoto)}" alt="用餐照片">` : ""}<h3>${esc(m.name)}</h3><p>${esc(m.mealType)} · ${esc(m.diningMode || "在家做")} · ${m.costType || "估算"} ${money(m.estimatedCost)}</p><small>${esc(m.place)} ${esc(m.notes)}</small><div class="row">${btn("查看 / 编辑", "mealEdit", m.id)}${btn("再记一次", "mealRepeat", m.id)}${btn("分享", "publishMeal", m.id)}</div></article>`,
          )
          .join("")
      : empty("这一天，还没有记餐")) +
    `<details><summary>本月有记录的日子</summary><div class="row">${[
      ...new Set(
        store.state.meals
          .filter((m) => m.date.startsWith(date.slice(0, 7)))
          .map((m) => m.date.slice(0, 10)),
      ),
    ]
      .sort()
      .map((d) => btn(d.slice(5), "selectDay", d))
      .join("")}</div></details>`
  );
}
function mealView() {
  const m = mealDraft || new M.Meal();
  return (
    heading(m.id ? "这一餐的小记" : "记下这一餐", "记餐不扣库存") +
    form(
      "meal",
      `<section class="meal-photo"><div class="meal-photo-actions"><span>照片</span><button type="button" data-action="mealPhoto" data-value="camera"><img src="media/ui_camera.png" alt="">拍照</button><button type="button" data-action="mealPhoto" data-value="photo"><img src="media/ui_album.png" alt="">相册</button></div>${photoDraft ? `<img class="cover" src="${esc(photoDraft.compressed)}" alt="已选照片">` : m.localPhoto ? `<img class="cover" src="${esc(m.localPhoto)}" alt="用餐照片">` : ""}</section>` +
      input("name", "吃了什么", m.name, "text", 'required maxlength="200" placeholder="菜名或餐食"') +
        select(
          "mealType",
          "餐次",
          ["早餐", "午餐", "晚餐", "加餐"],
          m.mealType,
        ) +
        input(
          "date",
          "日期 · 时间",
          m.date
            ? new Date(
                new Date(m.date).getTime() -
                  new Date().getTimezoneOffset() * 60000,
              )
                .toISOString()
                .slice(0, 16)
            : date + "T" + new Date().toTimeString().slice(0, 5),
          "datetime-local",
          "required",
        ) +
        select(
          "diningMode",
          "用餐方式",
          ["在家做", "外卖", "餐馆", "食堂", "外食", "其他"],
          m.diningMode || "在家做",
        ) +
        `<label>这一餐费用（元）<span class="meal-money-field"><input name="estimatedCost" value="${esc(m.estimatedCost)}" type="number" min="0" step="0.01" inputmode="decimal"><span aria-hidden="true">¥</span></span></label>` +
        select("costType", "金额类型", ["估算", "实付"], m.costType || "估算") +
        (["餐馆","食堂","外卖","外食"].includes(m.diningMode) ? `<details class="meal-place-details"><summary>高级详情 · 店铺（可选）</summary>${input("place", "店铺 / 地点（可不填）", m.place)}</details>` : "") +
        `<details><summary>热量、评分和备注</summary>${input("calories", "示例主体热量 kcal（-1为未知）", m.calories ?? -1, "number", 'min="-1" max="30000"')}<fieldset class="meal-rating"><legend>这餐感觉如何</legend><input type="hidden" name="rating" value="${Number(m.rating)||0}"><div class="meal-rating-stars">${[1,2,3,4,5].map(n=>`<button type="button" data-action="mealRating" data-value="${n}" aria-label="${n}星" aria-pressed="${Number(m.rating)===n}">${Number(m.rating)>=n?"★":"☆"}</button>`).join("")}</div></fieldset>${area("notes", "备注", m.notes)}</details>`,
    ) +
    (m.id ? btn("删除这一餐", "mealDelete", m.id, "danger") : "")
  );
}
function reportPeriod() {
  const span=settings.statsSpan || "week";
  return {start:span==="day"?date:span==="month"?date.slice(0,7)+"-01":D.weekDates(date)[0],end:span==="day"?date:span==="month"?date.slice(0,7)+"-31":D.weekDates(date)[6],label:({day:"本天",week:"本周",month:"本月"})[span]};
}
function reportMeals() {
  const {start,end}=reportPeriod();return store.state.meals.filter(m=>{const d=M.dateString(new Date(m.date));return d>=start&&d<=end;});
}
function statsView() {
  const span=settings.statsSpan || "week",{start,end,label}=reportPeriod(),list=reportMeals(),s=E.spendingSummary(list),rules=require("MealRules");
  const total=rows=>{const summary=E.spendingSummary(rows);return money(summary.paid+summary.estimated);};
  const tags=[...new Set(list.flatMap(m=>(m.tags || "").split("、").filter(Boolean)))];
  return heading("餐费与饮食",start+" ～ "+end)+`<div class="row">${[["day","本天"],["week","本周"],["month","本月"]].map(([id,t])=>btn(t,"statsSpan",id,span===id?"active":"")).join("")}</div><section class="stats-total"><p>${label}餐饮花费</p><strong>${total(list)}</strong><p>${list.length} 次用餐</p></section><p>实付 ${money(s.paid)} · 估算 ${money(s.estimated)}</p><p>记录了${s.days}天 · 热量已填${s.calorieMeals}/${s.meals}餐</p><p>已知热量 ${s.calories} kcal；缺失不计为0。</p>`+
    ["早餐","午餐","晚餐","加餐"].map(t=>`<div class="card row between stats-occasion" data-occasion="${t}"><span>${t}</span><span>${total(list.filter(m=>m.mealType===t))}</span></div>`).join("")+
    `<div class="grid stats-stock"><div class="card"><small>食材已消耗</small><p>${money(store.state.foods.reduce((sum,f)=>sum+(f.consumedCost||0),0))}</p></div><div class="card"><small>丢弃损失</small><p>${money(store.state.foods.reduce((sum,f)=>sum+(f.wastedCost||0),0))}</p></div></div><h2>餐桌上的小偏好</h2>`+
    tags.map(tag=>`<div class="row between stats-tag" data-tag="${esc(tag)}"><span>${esc(tag)}</span><span>${total(list.filter(m=>(m.tags || "").split("、").includes(tag)))}</span></div>`).join("")+`<p class="hint">标签可重复归类，各项金额不应相加</p>`+
    rules.summarizeDishes(list).slice(0,5).map((dish,i)=>`<div class="card row between"><span>${String(i+1).padStart(2,"0")} · ${esc(dish.name)}</span><small>${dish.count} 次 · ${money(dish.estimatedCost)}</small></div>`).join("")+`<p>菜品费用构成 · 整菜参考，不含分摊与配送</p>`+
    ["家常","素菜","荤菜","汤羹","主食","外卖"].map(category=>`<div class="row between"><span>${category}</span><span>${money(list.reduce((sum,m)=>sum+rules.mealItems(m).filter(item=>item.category===category).reduce((subtotal,item)=>subtotal+item.estimatedCost,0),0))}</span></div>`).join("")+`<p class="hint">食材消耗与浪费为全部时间累计估算</p>`+btn("导出当前报表 CSV","exportMeals")+btn("库存消耗 / 浪费","go","stockHistory");
}
function plansView() {
  const days = D.weekDates(week);
  return (
    heading("把一周安排得刚刚好") +
    `<div class="row">${btn("‹ 上周", "shiftWeek", -7)}<span>${days[0]} ～ ${days[6].slice(5)}</span>${btn("下周 ›", "shiftWeek", 7)}</div><div class="row">${btn("＋ 新安排", "planNew", "晚餐")}${btn("整周采购预览", "weekProcurement")}</div>` +
    days
      .map(
        (d) =>
          `<article class="card plan-day"><div class="row between"><h3>${d.slice(5)} ${["日", "一", "二", "三", "四", "五", "六"][new Date(d + "T12:00:00").getDay()]}</h3>${btn("采购预览", "dayProcurement", d)}${btn("复制整天", "copyDay", d)}</div>` +
          store.state.plans
            .filter((p) => p.date === d)
            .map(
              (p) =>
                `<div class="card plan-item"><p>${p.completed ? "✓ " : ""}${esc(p.occasion)} · ${esc(p.mode && p.mode !== "在家做" ? p.note : findRecipe(p.recipeId)?.name || "历史菜谱")} · ${p.people}人</p><div class="row">${btn("编辑 / 移动", "planEdit", p.id)}${btn("复制", "copyPlan", p.id)}${btn(p.completed ? "撤销完成" : "标记完成", "completePlan", p.id)}${btn("删除", "deletePlan", p.id)}</div></div>`,
            )
            .join("") +
          "</article>",
      )
      .join("")
  );
}
let planDraft = null,
  procurement = null;
function planView() {
  const p = planDraft || new (require("MealPlan").MealPlan)();
  return (
    heading("安排一餐") +
    form(
      "plan",
      input("date", "日期", p.date || date, "date", "required") +
        select(
          "occasion",
          "餐次",
          ["早餐", "午餐", "晚餐", "加餐"],
          p.occasion,
        ) +
        select(
          "mode",
          "安排",
          ["在家做", "外食", "外卖", "吃剩菜"],
          p.mode || "在家做",
        ) +
        select(
          "recipeId",
          "菜谱",
          allRecipes().map((r) => [r.id, r.name]),
          p.recipeId || allRecipes()[0].id,
        ) +
        input(
          "people",
          "人数",
          p.people || people,
          "number",
          'min="1" max="20"',
        ) +
        area("note", "外食 / 剩菜安排（在家做可不填）", p.note),
    )
  );
}
function procurementView() {
  if (!procurement) return empty("请先选择一天、一周或菜谱");
  return (
    heading(
      "先核对，再写入采购",
      "已扣除有效库存和已有待购；未知用量不会编造",
    ) +
    procurement.lines
      .map(
        (l) =>
          `<article class="card"><h3>${esc(l.name)}</h3><p>需要 ${l.unknown ? "待核" : l.required + esc(l.unit)} · 库存 ${l.stock || 0} · 待购 ${l.pending || 0}</p><strong>缺口 ${l.unknown ? "用量待确认" : l.missing + esc(l.unit)}</strong></article>`,
      )
      .join("") +
    (procurement.unknownRecipes || [])
      .map((r) => `<p class="warning">${esc(r)} 用量待核</p>`)
      .join("") +
    btn("确认整批加入", "confirmProcurement", "", "primary")
  );
}
function collectionsView() {
  return (
    heading("收藏夹") +
    btn("＋ 建个收藏夹", "newCollection") +
    experience.collections
      .map(
        (c, i) =>
          `<article class="card"><h3>${esc(c.name)}</h3><p>${c.ids.length}道菜</p><div class="row">${btn("看看", "openCollection", i)}${btn("批量计划", "planCollection", i)}${btn("删除夹子", "deleteCollection", i)}</div></article>`,
      )
      .join("")
  );
}
function timersView() {
  return (
    heading("锅边计时", "最多6个独立计时；关闭页面也保留截止时间") +
    form(
      "timer",
      input(
        "label",
        "提醒什么",
        "留意锅里的菜",
        "text",
        'required maxlength="80"',
      ) +
        input(
          "minutes",
          "几分钟后",
          5,
          "number",
          'min="0.1" max="1440" step="0.1" required',
        ),
      "开始计时",
    ) +
    utility.timers
      .map(
        (t) =>
          `<article class="card"><h3>${esc(t.label)}</h3><strong data-deadline="${t.deadline}">${T.countdownText(t.deadline, Date.now())}</strong> ${btn("取消", "cancelTimer", t.id)}</article>`,
      )
      .join("") +
    `<div class="row">${btn("允许通知", "notificationPermission")}${btn("精确提醒设置", "alarmSettings")}</div><p class="hint">未授予精确闹钟或通知权限时会明确提示；系统省电可能推迟普通提醒。</p>`
  );
}
function mineView() {
  return (
    `<button class="profile-banner" data-action="go" data-value="profile">${art("avatar_editorial_rice.png")}<div><strong>我的吃饭档案</strong><p class="hint">设置昵称与口味，或登录同步</p></div></button>` +
    heading("我的小怪") +
    `<div class="grid settings-grid">${[
      ["口味与抽菜", "taste", "preferences"],
      ["食材管理", "storage", "pantry"],
      ["外观与动效", "appearance", "preferences"],
      ["提醒", "reminder", "timers"],
      ["账号与同步", "cloud", "account"],
      ["数据与备份", "backup", "preferences"],
      ["帮助与课堂", "help", "help"],
    ]
      .map(
        ([label, icon, route]) =>
          `<button class="setting-tile" data-action="go" data-value="${route}">${art("ui_" + icon + ".png")}<span>${label}</span></button>`,
      )
      .join("")}</div>`
  );
}
function helpView() {
  return (
    heading("帮助与课堂") +
    `<article class="card">${art("scene_cooking_prep.png", "cover")}<h2>从今天的一顿饭开始</h2><p>在今日选择做饭或记餐，抽一餐寻找灵感；进入菜谱查看完整步骤与备菜提示。</p>${btn("看看菜谱", "go", "recipes")}</article><article class="card"><h2>食材与采购</h2><p>先登记食材和到期日期，买到后在采购清单确认入库。做菜时确认实际消耗，库存与记录一起保存。</p>${btn("我的库存", "go", "pantry")}</article><article class="card"><h2>数据与同步</h2><p>离线即可使用。账号数据独立保存，手动同步后上传记录。卸载前请导出重要记录；JSON备份不包含照片文件。</p>${btn("备份与偏好", "go", "preferences")}</article>`
  );
}
function preferencesView() {
  return (
    `<section class="profile-banner">${art("avatar_editorial_rice.png")}<div>${heading("我的小怪", "把日子过成喜欢的味道")}</div></section>` +
    `<div class="grid">${[
      ["account", "账号与同步"],
      ["profile", "示例主体资料"],
      ["families", "我的家庭"],
      ["devices", "设备管理"],
      ["plans", "一周计划"],
      ["collections", "收藏夹"],
      ["community", "生活广场"],
      ["stats", "饮食统计"],
      ["timers", "做菜计时"],
    ]
      .map(([id, t]) => {
        const icon = {
          account: "cloud",
          profile: "profile",
          families: "people",
          devices: "cloud",
          plans: "today",
          collections: "recipes",
          community: "community",
          stats: "budget",
          timers: "time",
        }[id];
        return `<button class="setting-tile" data-action="${id === "community" ? "community" : "go"}" data-value="${id}">${art("ui_" + icon + ".png")}<span>${esc(t)}</span></button>`;
      })
      .join("")}</div><h2>各有各的口味</h2>` +
    form(
      "preferences",
      input("excluded", "忌口食材（逗号分隔）", settings.excluded || "") +
        ["cook", "record"]
          .map(
            (domain) =>
              `<details><summary>${domain === "cook" ? "做饭" : "外食 / 外卖"}偏好</summary>${input(domain + "Region", "地区风味", settings[domain + "Preference"]?.homeRegion || "")}${select(domain + "Goal", "饮食目标", ["均衡饮食", "控制热量", "高蛋白", "清淡少油"], settings[domain + "Preference"]?.goal || "均衡饮食")}${select(
                domain + "Learning",
                "从记录学习",
                [
                  ["true", "开启"],
                  ["false", "关闭"],
                ],
                String(settings[domain + "Preference"]?.learning !== false),
              )}${btn("清除此场景学习", "clearLearning", domain)}</details>`,
          )
          .join("") +
        "",
      "保存偏好",
    ) +
    `<details><summary>存放位置管理</summary>${store.state.locations.map((l) => `<p>${esc(l)} ${btn("改名", "renameLocation", l)}</p>`).join("")}${btn("增加位置", "newLocation")}</details><details><summary>数据与离线目录</summary><p>内置与私有共 ${allRecipes().length} 道菜。待同步 ${store.state.changes.length} 条。</p><div class="row">${btn("导出私有 JSON", "exportData")}${btn("导入 JSON", "importData")}${btn("检查菜谱更新", "catalogUpdate")}</div><p class="hint">照片留在本机私有目录；JSON不含照片二进制。卸载应用会删除本机数据，请主动导出重要记录。</p></details>`
  );
}
function accountView() {
  return (
    heading(
      cloud.session.accessToken ? "账号与同步" : "云端账号",
      "离线功能无需登录",
    ) +
    (cloud.session.accessToken
      ? `<p>当前设备已登录。手动同步才上传待同步记录。</p><div class="row">${btn("同步记录", "sync", "", "primary")}${btn("上传待传照片", "uploadPhotos")}${btn("退出当前设备", "logout")}</div><p class="hint">每个账号独立数据库；退出后进入独立访客空间。</p>`
      : form(
          "login",
          input(
            "email",
            "账号",
            "",
            "text",
            'autocomplete="username" required',
          ) +
            input(
              "password",
              "密码（至少6位字母和数字）",
              "",
              "password",
              'autocomplete="current-password" required minlength="6" maxlength="128"',
            ) +
            select(
              "register",
              "已有账号 / 新朋友",
              [
                ["false", "登录"],
                ["true", "注册新账号"],
              ],
              "false",
            ) +
            input("displayName", "注册昵称（2–24字）") +
            input(
              "confirmation",
              "注册时再次填写密码",
              "",
              "password",
              'autocomplete="new-password"',
            ),
          "继续",
        )) +
    (cloud.session.accessToken
      ? form(
          "password",
          input("oldPassword", "原密码", "", "password") +
            input("newPassword", "新密码", "", "password", 'minlength="6"'),
          "修改密码并退出所有设备",
        )
      : "")
  );
}
let profileData = null,
  deviceList = [];
function profileView() {
  const p = profileData || new (require("AccountModels").UserProfile)();
  return (
    heading("我的资料", "默认私有；修改时核对服务端版本") +
    "" +
    form(
      "profile",
      input("displayName", "昵称", p.displayName) +
        select(
          "regionCode",
          "地区",
          [
            ["", "不设置"],
            ...require("AccountModels").PROFILE_REGIONS.map((r) => [
              r.code,
              r.name,
            ]),
          ],
          p.regionCode || "",
        ) +
        `<input type="hidden" name="avatarPreset" value="${esc(p.avatarPreset || "tomato")}">` +
        select(
          "dietGoal",
          "饮食目标",
          ["均衡饮食", "控制热量", "高蛋白", "清淡少油"],
          p.dietGoal || "均衡饮食",
        ) +
        area("bio", "简介", p.bio || ""),
      "保存资料",
    ) +
    btn("更换头像", "avatar")
  );
}
function familiesView() {
  return (
    heading("一起开饭的家人", "家庭数据只有当前有效成员可访问") +
    btn("刷新家庭", "loadFamilies") +
    form(
      "familyCreate",
      input("name", "家庭名字", "", "text", "required"),
      "创建家庭",
    ) +
    form(
      "familyJoin",
      input("inviteCode", "邀请码", "", "text", "required"),
      "加入家庭",
    ) +
    familyList
      .map(
        (f) =>
          `<article class="card"><h3>${esc(f.name)}</h3><p>${esc(f.role)}</p><div class="row">${btn("查看成员", "familyMembers", f.id)}${["owner", "admin"].includes(f.role) ? btn("查看 / 更换邀请码", "familyInvite", f.id) + btn("解散家庭", "familyDelete", f.id, "danger") : ""}</div></article>`,
      )
      .join("")
  );
}
function devicesView() {
  return (
    heading("我的登录设备") +
    btn("刷新设备", "loadDevices") +
    deviceList
      .map(
        (d) =>
          `<article class="card"><p>${esc(d.name)} ${d.revoked_at ? "（已解绑）" : ""}</p><div class="row">${btn("改名", "deviceRename", d.id)}${btn("解绑", "deviceRevoke", d.id)}</div></article>`,
      )
      .join("")
  );
}
function communityView() {
  return (
    heading("生活广场", "真实分享与演示标记分开显示") +
    `<div class="chips">${[
      ["public", "广场"],
      ["family", "家庭"],
      ["following", "关注"],
      ["favorites", "收藏"],
      ["mine", "我的发布"],
    ]
      .map(([id, t]) =>
        btn(t, "communityScope", id, communityScope === id ? "active" : ""),
      )
      .join(
        "",
      )}</div>${btn("刷新", "refreshCommunity")}${btn("互动消息", "socialInbox")}` +
    (postList.length
      ? postList
          .slice(-100)
          .map(
            (post) =>
              `<article class="card community-post"><span class="badge">${post.demo_data ? "演示内容" : "真实分享"} · ${esc(post.status)}</span><h3>${esc(post.payload.name)}</h3><p>${esc(post.author_name || "小怪朋友")}</p><p>${esc(post.payload.notes)}</p>${post.show_price ? `<p>${money(post.payload.estimatedCost)}</p>` : ""}<div class="row">${btn("看看", "post", post.id)}${btn((post.liked ? "♥ " : "♡ ") + post.like_count, "like", post.id)}</div></article>`,
          )
          .join("")
      : empty("暂无内容，或请登录后刷新")) +
    (postMore ? btn("再看20条", "moreCommunity") : "")
  );
}
function postView() {
  const post = currentPost;
  if (!post) return empty("请重新打开这条动态");
  return (
    heading(post.payload.name, post.author_name) +
    `<p>${esc(post.payload.notes)}</p>` +
    (post.photoUrl
      ? `<img class="cover" src="${esc(post.photoUrl)}" alt="成品照片">`
      : "") +
    `<div class="row">${btn(post.liked ? "取消点赞" : "点赞", "like", post.id)}${btn(post.favorited ? "取消收藏" : "收藏动态", "favoritePost", post.id)}${btn("作者主页", "author", post.user_id)}${btn("举报", "reportPost", post.id)}${post.user_id === cloud.session.userId ? btn("撤回", "deletePost", post.id, "danger") : ""}</div><h2>评论</h2>` +
    commentList
      .map(
        (c) =>
          `<div class="card"><p>${esc(c.body)}</p>${btn("回复", "reply", c.id)}</div>`,
      )
      .join("") +
    form("comment", area("body", "说点什么"), "发布评论")
  );
}
let publishKind = "meal";
function publishView() {
  return (
    heading("把这一餐分享出去", "公开分享需要审核；默认不展示价格") +
    form(
      "publish",
      select(
        "visibility",
        "分享给谁",
        [
          ["private", "仅自己"],
          ["family", "家人"],
          ["public", "生活广场（待审核）"],
        ],
        "private",
      ) +
        select(
          "familyId",
          "家庭",
          [["", "请选择"], ...familyList.map((f) => [f.id, f.name])],
          "",
        ) +
        `<label><input name="showPrice" type="checkbox">展示价格</label><label><input name="confirmed" type="checkbox" required>我确认分享这份内容，备注中若有价格会按原文展示</label>`,
      "确认发布",
    )
  );
}
function conflictsView() {
  return (
    heading("两份记录不一样", "你的决定之前，不覆盖本机，也不推进同步游标") +
    conflicts
      .map(
        (c, i) =>
          `<article class="card"><h3>${esc(c.local.entityType)}</h3><details><summary>本机记录</summary><pre>${esc(JSON.stringify(c.local.payload, null, 2))}</pre></details><details><summary>云端记录</summary><pre>${esc(JSON.stringify(c.server?.payload, null, 2))}</pre></details><div class="row">${btn("保留本机", "conflictLocal", i)}${btn("采用云端", "conflictRemote", i)}${btn("逐字段合并", "conflictMerge", i)}</div></article>`,
      )
      .join("")
  );
}
let recipeDraft = null,
  publicRecipeList = [];
function recipeEditView() {
  const r = recipeDraft || new M.Recipe();
  return (
    heading("我的私人菜谱", "每行一份用料：名称,数量,单位") +
    form(
      "recipeSave",
      input("name", "菜名", r.name, "text", "required") +
        input(
          "minutes",
          "用时（分钟）",
          r.minutes,
          "number",
          'min="1" max="1440"',
        ) +
        input("people", "原方人数", r.people, "number", 'min="1" max="20"') +
        input(
          "estimatedCost",
          "原方估算费用（元）",
          r.estimatedCost,
          "number",
          'min="0" step="0.01"',
        ) +
        area(
          "ingredients",
          "用料",
          r.ingredients
            .map((i) => [i.name, i.quantity, i.unit].join(","))
            .join("\n"),
          "鸡蛋,2,个",
        ) +
        area("steps", "做法（每行一步）", r.steps.join("\n")) +
        area("tips", "小贴士", r.tips),
    ) +
    (r.id ? btn("删除私有菜谱", "deleteRecipe", r.id, "danger") : "")
  );
}
function barcodeView() {
  return (
    heading("条码小帮手", "先查自己的模板，再查服务目录；未命中仍可编辑录入") +
    form(
      "barcode",
      input(
        "code",
        "EAN / UPC 条码",
        "",
        "text",
        'inputmode="numeric" pattern="([0-9]{8}|[0-9]{12}|[0-9]{13})" required',
      ),
      "查询",
    ) +
    `${btn("拍照识别条码", "scanBarcode")}<p class="hint">用系统相机拍清晰的商品条码，在本机识别，不上传照片；也可手动输入。</p>`
  );
}
function publicRecipesView() {
  return (
    heading("公共菜谱", "保存后成为自己的离线副本") +
    publicRecipeList
      .map(
        (r, i) =>
          `<article class="card"><h3>${esc(r.name)}</h3>${btn("确认保存私有副本", "savePublicRecipe", i)}</article>`,
      )
      .join("")
  );
}
async function api(path, method = "GET", body = null) {
  return JSON.parse(await cloud.request(path, method, body));
}
async function communityLoad(more = false) {
  const result = await api(
    "/community/posts/page?scope=" +
      encodeURIComponent(communityScope) +
      (more && postCursor ? "&cursor=" + encodeURIComponent(postCursor) : ""),
  );
  postList = more ? postList.concat(result.items).slice(-100) : result.items;
  postCursor = result.nextCursor;
  postMore = result.hasMore;
  go("community", true);
}
async function loadPost(id) {
  currentPost = await api("/community/posts/" + id);
  commentList = await api("/community/posts/" + id + "/comments");
  selected = id;
  if (currentPost.payload.photoId) {
    try {
      const result = await api(
        "/photos/" + currentPost.payload.photoId + "/download",
      );
      currentPost.photoUrl =
        "remote/" +
        btoa(unescape(encodeURIComponent(result.url)))
          .replaceAll("+", "-")
          .replaceAll("/", "_")
          .replaceAll("=", "");
    } catch (e) {
      toast(e.message);
    }
  }
  go("post");
}
function previewPlans(plans) {
  procurement = E.previewProcurement(
    plans,
    allRecipes(),
    store.state.foods,
    store.state.shopping,
    M.dateString(new Date()),
  );
  procurement.planIds = plans.map((p) => p.id);
  procurement.planSelection = clone(plans);
  go("procurement");
}
function rememberMealForm() {
  if (!mealDraft) mealDraft = new M.Meal();
  for (const key of [
    "name",
    "mealType",
    "diningMode",
    "place",
    "costType",
    "notes",
  ])
    if (key !== "place" || document.querySelector('[name="place"]')) mealDraft[key] = val(key);
  mealDraft.estimatedCost = num("estimatedCost");
  mealDraft.calories = num("calories");
  mealDraft.rating = num("rating");
  if (val("date")) mealDraft.date = new Date(val("date")).toISOString();
}
async function storeProgress() {
  progress.updatedAt = Date.now();
  utility.progress = utility.progress
    .filter((p) => p.recipeId !== progress.recipeId)
    .concat([progress])
    .slice(-100);
  await saveUtility();
}
async function exportFile(text, name, mime = "application/json") {
  await P.nativeAsync("export", { text, name, mime });
  toast("已保存到你选择的位置");
}
async function cancelAllTimers() {
  P.invoke("cancelAllTimers");
}
async function loadSettings() {
  settings = {};
  for (const [key, fallback] of Object.entries({
    excluded: "",
    cookPreference: "{}",
    recordPreference: "{}",
    androidExperience: "{}",
    androidUtility: "{}",
    androidDraw: "null",
    androidDraft: "null",
    theme: "light",
    mode: "cook",
    quickstartDone: "",
    keepAwake: "true",
    recipeOrder: "rank",
    drawPreset: "two-soup",
    drawMinutes: "60",
    drawBudget: "80",
  })) {
    const text = await store.getSetting(key, fallback);
    if (
      [
        "cookPreference",
        "recordPreference",
        "androidExperience",
        "androidUtility",
        "androidDraw",
        "androidDraft",
      ].includes(key)
    ) {
      try {
        settings[key] = JSON.parse(text);
      } catch {
        settings[key] = {};
      }
    } else settings[key] = text;
  }
  drawResult = settings.androidDraw;
  experience = E.normalizeExperience(settings.androidExperience);
  utility = Object.assign(new T.UtilityState(), settings.androidUtility);
  utility.timers = (utility.timers || []).slice(0, 6);
  for (const t of utility.timers.filter((t) => t.deadline > Date.now()))
    P.invoke("timer", t);
  intent = settings.mode === "record" ? "record" : "cook";
  document.body.classList.remove("dark", "sky", "berry");
  filter = new F.RecipeFilterOptions();
  familyList = [];
  postList = [];
  postCursor = "";
  conflicts = [];
  profileData = null;
  deviceList = [];
  history = [];
  mealDraft = null;
  foodDraft = null;
  photoDraft = null;
  selected = null;
}
async function switchSpace(userId = "", email = "") {
  clearTimeout(draftSaveHandle);
  draftDirty = false;
  await cancelAllTimers();
  if(userId){await store.selectAccountSpace(P.context,userId,email);}else{
   P.invoke('prefPut',{name:'shiku_account_spaces',key:'activeScope',value:''});await store.init(P.context);
  }
  await loadSettings();
  if(userId){await setting("loginSyncOwner",userId);await flushLoginSync();}
  go("today", true);
}
async function actions(action, value) {
  switch (action) {
    case "back":
      await window.requestAppBack();
      break;
    case "recipeCategory":
      filter.categories = filter.categories.includes(value) ? [] : [value];
      recipePage = 1;
      render();
      break;
    case "homeDay":
      date = value;
      render();
      break;
    case "go":
      go(value);
      break;
    case "restoreDraft": {
      const d = settings.androidDraft;
      if (!d) return;
      foodDraft = d.foodDraft;
      mealDraft = d.mealDraft;
      shoppingDraft = d.shoppingDraft;
      planDraft = d.planDraft;
      recipeDraft = d.recipeDraft;
      photoDraft = d.photoDraft;
      selected = d.selected;
      draftDirty = false;
      go(d.page);
      for (const [name, value] of Object.entries(d.values)) {
        const el = document.querySelector('[name="' + name + '"]');
        if (el) el.value = value;
      }
      draftDirty = true;
      break;
    }
    case "discardDraft":
      if (confirm("确认放弃这份未完成草稿？")) {
        await setting("androidDraft", null);
        draftDirty = false;
        render();
      }
      break;
    case "mode":
      intent = value;
      await setting("mode", value);
      render();
      break;
    case "quickstart":
      await setting("quickstartDone", "true");
      render();
      break;
    case "recipe":
      selected = value;
      await store.recordFeedback(value, "open", intent);
      go("recipe");
      break;
    case "moreRecipes":
      recipePage++;
      render();
      break;
    case "favOnly":
      filterOnlyFav = !filterOnlyFav;
      collectionIndex = -1;
      recipePage = 1;
      render();
      break;
    case "filterChip": {
      const [key, v] = value.split("|");
      filter[key] = filter[key].includes(v)
        ? filter[key].filter((x) => x !== v)
        : filter[key].concat(v);
      go("filters", true);
      break;
    }
    case "saveFilter": {
      const name = prompt("给这组条件起个名");
      if (!name) return;
      const f = new E.SavedRecipeFilter();
      f.name = name.slice(0, 24);
      f.options = clone(filter);
      f.favorites = filterOnlyFav;
      experience.filters = experience.filters.slice(-11).concat(f);
      await saveExperience();
      render();
      break;
    }
    case "loadFilter":
      filter = F.normalizeRecipeFilter(experience.filters[+value].options);
      filterOnlyFav = experience.filters[+value].favorites;
      recipePage = 1;
      go("recipes");
      break;
    case "deleteFilter":
      experience.filters.splice(+value, 1);
      await saveExperience();
      render();
      break;
    case "resetFilter":
      filter = new F.RecipeFilterOptions();
      filterOnlyFav = false;
      collectionIndex = -1;
      render();
      break;
    case "relaxFilter": {
      const fields = [
        "availability",
        "maxMinutes",
        "maxCost",
        "ingredients",
        "goals",
        "tastes",
        "regions",
        "categories",
        "search",
      ];
      for (const key of fields) {
        if (key === "availability" && filter[key] !== "any") {
          filter[key] = "any";
          break;
        }
        if (Array.isArray(filter[key]) && filter[key].length) {
          filter[key] = [];
          break;
        }
        if (typeof filter[key] === "number" && filter[key]) {
          filter[key] = 0;
          break;
        }
        if (key === "search" && filter.search) {
          filter.search = "";
          break;
        }
      }
      render();
      break;
    }
    case "favorite":
      await store.favorite(value);
      if(page==='recipes'&&!filterOnlyFav){
        // Keep the visible non-favorites list and scroll position stable.
        for(const button of screen.querySelectorAll('[data-action="favorite"]')){
          if(button.dataset.value!==value)continue;
          const saved=store.state.favorites.some(f=>f.recipeId===value),r=allRecipes().find(r=>r.id===value),count=button.querySelector('small')?.textContent;
          button.setAttribute('aria-pressed',String(saved));
          button.setAttribute('aria-label',(saved?'取消收藏':'收藏')+(r?.name || '菜谱')+(count===undefined?'':'，'+count+'人收藏'));

        }
        const entry=screen.querySelector('.saved-recipes-entry');
        if(entry){entry.querySelector('small').textContent=store.state.favorites.length;entry.setAttribute('aria-label','查看收藏，'+store.state.favorites.length+'份喜欢的做法和自建菜单');}
      }else render();
      break;
    case "feedback":
      await store.recordFeedback(selected, R.feedbackAction(value), intent);
      toast("记住这次原因了");
      break;
    case "startGuide":
      selected = value;
      P.invoke("keepAwake", { enabled: settings.keepAwake !== "false" });
      go("guide");
      break;
    case "guideStep":
      progress.step = Math.max(
        0,
        Math.min(
          G.buildCookingGuide(findRecipe(selected)).steps.length - 1,
          progress.step + Number(value),
        ),
      );
      await storeProgress();
      render();
      break;
    case "guideDone":
      if (!progress.completed.includes(progress.step))
        progress.completed.push(progress.step);
      await storeProgress();
      toast("这一步完成啦");
      break;
    case "awake":
      await setting(
        "keepAwake",
        settings.keepAwake === "false" ? "true" : "false",
      );
      P.invoke("keepAwake", { enabled: settings.keepAwake !== "false" });
      render();
      break;
    case "newTimer":
      go("timers");
      break;
    case "foodNew":
      foodDraft = new M.Food();
      go("food");
      break;
    case "foodTemplate": {
      const t = M.TEMPLATES[+value];
      foodDraft = Object.assign(new M.Food(), clone(t), {
        id: "",
        quantity: t.unit === "g" ? 300 : 1,
        expiryDate: D.shiftDay(M.dateString(new Date()), t.days),
      });
      go("food");
      break;
    }
    case "foodEdit":
      foodDraft = clone(store.state.foods.find((f) => f.id === value));
      selected = value;
      go("food");
      break;
    case "foodDelete":
      if (confirm("删除这份食材？同步后其他设备也会删除。")) {
        await store.deleteFood(store.state.foods.find((f) => f.id === value));
        go("pantry");
      }
      break;
    case "consume":
      selected = value;
      go("consume");
      break;
    case "replenish": {
      const f = store.state.foods.find((f) => f.id === value);
      if (
        store.state.shopping.some(
          (s) =>
            !s.purchased && R.canonicalName(s.name) === R.canonicalName(f.name),
        )
      ) {
        toast("采购清单里已经有啦");
        return;
      }
      shoppingDraft = Object.assign(new M.Shopping(), {
        name: f.name,
        quantity: f.purchasedQuantity > 0 ? f.purchasedQuantity : 1,
        unit: f.unit,
        category: f.category,
      });
      go("shoppingEdit");
      break;
    }
    case "replenishments": {
      const foods = store.state.foods.filter(
        (f) => f.archiveReason !== "wasted" && (f.archived || f.quantity <= 1),
      );
      screen.innerHTML =
        heading("补货建议", "逐项确认，不把丢弃当作需要回购") +
        foods
          .map(
            (f) =>
              `<div class="card">${esc(f.name)}${btn("确认采购", "replenish", f.id)}</div>`,
          )
          .join("");
      break;
    }
    case "shoppingNew":
      shoppingDraft = new M.Shopping();
      try {
        if (cloud.session.accessToken) familyList = await api("/families");
      } catch {}
      go("shoppingEdit");
      break;
    case "shoppingEdit":
      shoppingDraft = clone(store.state.shopping.find((s) => s.id === value));
      go("shoppingEdit");
      break;
    case "shoppingDelete":
      if (confirm("删除这条采购？"))
        await store.deleteShopping(
          store.state.shopping.find((s) => s.id === value),
        );
      render();
      break;
    case "clearPurchased":
      if (confirm("清理已购买项目？食库中的食材会保留。"))
        await store.clearPurchased();
      render();
      break;
    case "purchase":
      selected = value;
      if (store.state.shopping.find((s) => s.id === value).purchased) {
        toast("这条已经买过啦");
        return;
      }
      go("purchase");
      break;
    case "claim": {
      await cloud.sync(store);
      const s = await api("/shopping/" + value + "/claim");
      const claim = await api(
        "/shopping/" + value + "/claim",
        s.mine ? "DELETE" : "POST",
        s.mine ? null : {},
      );
      toast(claim.claimed ? "家庭认领成功" : "已取消认领");
      break;
    }
    case "mealNew":
      mealDraft = new M.Meal();
      mealDraft.mealType = value || "晚餐";
      photoDraft = null;
      go("meal");
      break;
    case "mealEdit":
      mealDraft = clone(store.state.meals.find((m) => m.id === value));
      photoDraft = null;
      go("meal");
      break;
    case "mealRepeat":
      mealDraft = T.repeatMealDraft(
        store.state.meals.find((m) => m.id === value),
      );
      mealDraft.date = new Date().toISOString();
      photoDraft = null;
      go("meal");
      break;
    case "mealRecipe": {
      const r = scaledRecipe(findRecipe(value));
      mealDraft = new M.Meal();
      Object.assign(mealDraft, {
        name: r.name,
        recipeId: r.id,
        estimatedCost: r.estimatedCost,
        calories: r.calories ?? -1,
        diningMode: intent === "record" ? "餐馆" : "在家做",
      });
      photoDraft = null;
      go("meal");
      break;
    }
    case "mealDelete":
      if (confirm("删除这条用餐？")) {
        await store.deleteMeal(store.state.meals.find((m) => m.id === value));
        go("meals");
      }
      break;
    case "mealPhoto":
      rememberMealForm();
      photoDraft = await P.nativeAsync(value);
      render();
      break;
    case "selectDay":
      date = value;
      go("meals");
      break;
    case "statsSpan":
      await setting("statsSpan", value);
      render();
      break;
    case "planNew":
      planDraft = new (require("MealPlan").MealPlan)();
      planDraft.date = date;
      planDraft.occasion = value || "晚餐";
      go("plan");
      break;
    case "planRecipe":
      planDraft = Object.assign(new (require("MealPlan").MealPlan)(), {
        date,
        recipeId: value,
        people,
      });
      go("plan");
      break;
    case "planEdit":
      planDraft = clone(store.state.plans.find((p) => p.id === value));
      go("plan");
      break;
    case "shiftWeek":
      week = D.shiftDay(week, Number(value));
      render();
      break;
    case "copyPlan": {
      const old = store.state.plans.find((p) => p.id === value),
        target = prompt("复制到哪一天？YYYY-MM-DD", D.shiftDay(old.date, 1));
      if (target) {
        await store.saveMealPlans([
          Object.assign(clone(old), { id: "", date: target, completed: false }),
        ]);
        render();
      }
      break;
    }
    case "copyDay": {
      const target = prompt("整天复制到？YYYY-MM-DD", D.shiftDay(value, 1));
      if (target) {
        await store.saveMealPlans(
          store.state.plans
            .filter(
              (p) =>
                p.date === value &&
                !store.state.plans.some(
                  (t) =>
                    t.date === target &&
                    t.occasion === p.occasion &&
                    t.recipeId === p.recipeId &&
                    (t.note || "") === (p.note || ""),
                ),
            )
            .map((p) =>
              Object.assign(clone(p), { date: target, completed: false }),
            ),
        );
        render();
      }
      break;
    }
    case "completePlan": {
      const p = store.state.plans.find((p) => p.id === value);
      await store.completeMealPlan(value, !p.completed);
      render();
      break;
    }
    case "deletePlan":
      if (confirm("删除这项安排？")) await store.removeMealPlan(value);
      render();
      break;
    case "recipeProcurement":
      previewPlans([
        { id: "", recipeId: value, people, completed: false, mode: "在家做" },
      ]);
      break;
    case "weekProcurement":
      previewPlans(
        store.state.plans.filter((p) => D.weekDates(week).includes(p.date)),
      );
      break;
    case "dayProcurement":
      previewPlans(store.state.plans.filter((p) => p.date === value));
      break;
    case "drawProcurement":
      previewPlans(
        drawResult.ids.map((id) => ({
          id: "",
          recipeId: id,
          people,
          completed: false,
          mode: "在家做",
        })),
      );
      break;
    case "confirmProcurement": {
      if (!procurement) return;
      // Recompute the displayed batch against current stock/pending immediately before commit.
      if (procurement.planSelection) {
        const plans = procurement.planSelection
          .map((p) =>
            p.id ? store.state.plans.find((current) => current.id === p.id) : p,
          )
          .filter(Boolean);
        procurement = E.previewProcurement(
          plans,
          allRecipes(),
          store.state.foods,
          store.state.shopping,
          M.dateString(new Date()),
        );
      }
      const items = procurement.lines
        .filter(
          (l) =>
            !l.unknown &&
            (!l.optional ||
              (typeof parity !== "undefined" && parity.procurementSeasoning)) &&
            l.missing > 0,
        )
        .map((l) =>
          Object.assign(new M.Shopping(), {
            name: l.name,
            unit: l.unit,
            quantity: l.missing,
            category: l.category || E.shoppingCategory(l.name),
          }),
        );
      if (!items.length) {
        toast("没有确定的缺口需要采购");
        return;
      }
      if (!confirm("确认添加 " + items.length + "项？")) return;
      await store.addShoppingBatch(items);
      procurement = null;
      toast("整批写入成功");
      go("shopping");
      break;
    }
    case "timeline": {
      const timeline = K.cookTimeline(drawResult.ids.map(findRecipe));
      screen.innerHTML =
        heading(
          "多菜备料顺序",
          `保守逐道 ${timeline.conservativeMinutes}分钟 · 双锅参考 ${timeline.parallelMinutes}分钟`,
        ) +
        `<p class="hint">${esc(timeline.assumption)}</p>` +
        timeline.tasks
          .map(
            (t) =>
              `<div class="card"><h3>${t.order}. ${esc(t.name)}</h3><p>${esc(t.instruction)}</p></div>`,
          )
          .join("") +
        timeline.warnings
          .map((w) => `<p class="warning">${esc(w)}</p>`)
          .join("");
      break;
    }
    case "drawPlan":
      await store.saveMealPlans(
        drawResult.ids.map((id) =>
          Object.assign(new (require("MealPlan").MealPlan)(), {
            date,
            recipeId: id,
            people,
          }),
        ),
      );
      toast("已加入今日计划");
      go("plans");
      break;
    case "cook":
      if (
        confirm(
          "确认已经做好？将按当前人数扣除食材并创建用餐，任何库存不足会整体取消。",
        )
      ) {
        await store.cook(scaledRecipe(findRecipe(value)));
        toast("已记餐，库存已扣减");
        go("meals");
      }
      break;
    case "newCollection": {
      const name = prompt("收藏夹叫什么？");
      if (name) {
        if (experience.collections.some((c) => c.name === name.trim()))
          throw Error("这个名字已经用过啦");
        if (experience.collections.length >= 30) throw Error("最多30个收藏夹");
        experience.collections.push({ name: name.slice(0, 24), ids: [] });
        experience = E.normalizeExperience(experience);
        await saveExperience();
        render();
      }
      break;
    }
    case "addCollection": {
      if (!experience.collections.length) {
        const name = prompt("先给收藏夹起个名");
        if (!name) return;
        experience.collections.push({ name: name.slice(0, 24), ids: [] });
      }
      const text = prompt(
          experience.collections
            .map((c, i) => i + 1 + ". " + c.name)
            .join("\n") + "\n选择编号",
          "1",
        ),
        i = Number(text) - 1;
      if (experience.collections[i]) {
        if (!experience.collections[i].ids.includes(value))
          experience.collections[i].ids.push(value);
        await saveExperience();
        toast("放进收藏夹啦");
      }
      break;
    }
    case "openCollection":
      collectionIndex = Number(value);
      filter = new F.RecipeFilterOptions();
      filterOnlyFav = false;
      go("recipes");
      break;
    case "deleteCollection":
      if (confirm("只删除收藏夹，保留菜谱？")) {
        experience.collections.splice(+value, 1);
        collectionIndex = -1;
        await saveExperience();
        render();
      }
      break;
    case "planCollection":
      await store.saveMealPlans(
        experience.collections[+value].ids.map((id) =>
          Object.assign(new (require("MealPlan").MealPlan)(), {
            date,
            recipeId: id,
            people,
          }),
        ),
      );
      toast("收藏夹已加入计划");
      go("plans");
      break;
    case "cancelTimer":
      P.invoke("cancelTimer", { id: value });
      utility.timers = utility.timers.filter((t) => t.id !== value);
      await saveUtility();
      render();
      break;
    case "notificationPermission":
      toast(
        (await P.nativeAsync("permission"))
          ? "通知已允许"
          : "未允许通知，页面计时仍可使用",
      );
      break;
    case "alarmSettings":
      await P.nativeAsync("alarmSettings");
      break;
    case "expiryReminder": {
      const f = store.state.foods.find((f) => f.id === value);
      await P.nativeAsync("permission");
      let deadline = new Date(f.expiryDate + "T09:00:00").getTime();
      if (deadline <= Date.now()) deadline = Date.now() + 60000;
      const result = P.invoke("timer", {
        id: "expiry-" + f.id,
        label: f.name + " 到期了，请检查是否食用",
        deadline,
      });
      toast(
        result.exact ? "已设置食材到期提醒" : "已设置普通提醒，系统可能延迟",
      );
      break;
    }
    case "clearLearning":
      if (confirm("只清除这套场景的本机学习？")) {
        await store.clearLearning(value);
        toast("已清除");
      }
      break;
    case "newLocation": {
      const name = prompt("新位置的名字");
      if (name && !store.state.locations.includes(name)) {
        await store.saveLocations(
          store.state.locations.concat(name.trim().slice(0, 40)),
        );
        render();
      }
      break;
    }
    case "renameLocation": {
      const name = prompt("改成什么名字？", value);
      if (name) {
        await store.renameLocation(value, name);
        render();
      }
      break;
    }
    case "exportData":
      await exportFile(store.exportData(), "kaifan-private.json");
      break;
    case "exportShopping":
      await exportFile(
        store.state.shopping
          .filter((s) => !s.purchased)
          .map((s) => `${s.name}\t${s.quantity}${s.unit}`)
          .join("\n"),
        "kaifan-shopping.txt",
        "text/plain",
      );
      break;
    case "exportMeals": {
      const q = (v) =>
        '"' +
        String(v ?? "")
          .replaceAll('"', '""')
          .replace(/^[=+@-]/, "'$&") +
        '"';
      await exportFile(
        "\ufeff日期,餐次,菜品,方式,类型,整餐参考金额,示例主体花费,实际热量kcal,热量来源,整份参考热量,食用比例\r\n" +
          reportMeals()
            .map((m) =>
              [
                m.date,
                m.mealType,
                m.name,
                m.diningMode,
                m.costType,
                m.mealTotal>=0?m.mealTotal:m.estimatedCost,
                m.personalCost>=0?m.personalCost:m.estimatedCost,
                m.calories>=0?m.calories:"",
                m.calorieSource || "未记录",
                m.energyReference>=0?m.energyReference:"",
                m.consumedFraction ?? 1,
              ]
                .map(q)
                .join(","),
            )
            .join("\r\n"),
        "kaifan-meals.csv",
        "text/csv",
      );
      break;
    }
    case "importData": {
      const text = await P.nativeAsync("import");
      const count = store.backupConflicts(text);
      if (
        confirm(
          "导入记录？" +
            (count ? "有" + count + "个重复ID，默认保留当前本机记录。" : ""),
        )
      ) {
        await store.importData(text, false);
        toast("导入完成");
        render();
      }
      break;
    }
    case "catalogUpdate": {
      toast("校验目录版本与下载内容…");
      const module = require("CatalogUpdate"),
        update = await module.downloadCatalogUpdate(
          cloud,
          await store.catalogManifest(),
        );
      if (update.unchanged) {
        toast("已是最新菜谱");
        return;
      }
      if (confirm("目录已校验，确认原子更新？")) {
        await store.installCatalog(update);
        toast("目录更新完成");
        render();
      }
      break;
    }
    case "sync": {
      toast("正在同步…");
      const result = await cloud.sync(store);
      conflicts = result.conflicts;
      if (conflicts.length) {
        go("conflicts");
      } else {
        toast(`上传${result.uploaded}条，下载${result.downloaded}条`);
        render();
      }
      break;
    }
    case "uploadPhotos":
      toast("已上传 " + (await cloud.uploadPhotos(store)) + " 张照片");
      break;
    case "logout":
      if (confirm("确定退出登录？本机记录会保留。")) {
        try { await cloud.logout(); } finally { await switchSpace(""); }
      }
      break;
    case "loadProfile":
      profileData = await api("/account/profile");
      render();
      break;
    case "avatar": {
      const photo = await P.nativeAsync("photo");
      profileData = await cloud.uploadAvatar(photo.compressed);
      toast("头像已保存");
      render();
      break;
    }
    case "loadFamilies":
      familyList = await api("/families");
      render();
      break;
    case "familyMembers": {
      const members = await api("/families/" + value + "/members");
      screen.innerHTML =
        heading("家庭成员") +
        members
          .map(
            (m) =>
              `<div class="card"><p>${esc(m.display_name || m.name || m.email || m.user_id)} · ${esc(m.role)}</p>${m.role !== "admin" ? btn("移除成员", "removeMember", value + "|" + (m.user_id || m.id)) : ""}</div>`,
          )
          .join("");
      break;
    }
    case "removeMember": {
      const [family, user] = value.split("|");
      if (confirm("确认移除这位成员？")) {
        await api("/families/" + family + "/members/" + user, "DELETE");
        toast("已移除");
      }
      break;
    }
    case "familyInvite": {
      const invite = await api("/families/" + value + "/invite");
      screen.innerHTML =
        heading("家庭邀请码") +
        `<p>${esc(invite.inviteCode)}</p><p class="hint">只分享给准备加入的家人。</p>` +
        btn("更换邀请码", "rotateInvite", value);
      break;
    }
    case "rotateInvite":
      if (confirm("更换后旧码立即失效？")) {
        const i = await api("/families/" + value + "/invite", "POST", {});
        screen.innerHTML = heading("新邀请码") + `<p>${esc(i.inviteCode)}</p>`;
      }
      break;
    case "familyDelete":
      if (confirm("确认解散家庭？所有成员的共享访问将撤销。")) {
        await api("/families/" + value, "DELETE");
        familyList = await api("/families");
        await store.reconcileFamilies(familyList.map((f) => f.id));
        render();
      }
      break;
    case "loadDevices":
      deviceList = await api("/devices");
      render();
      break;
    case "deviceRename": {
      const name = prompt("给设备起个名字");
      if (name) {
        await api("/devices/" + value, "PATCH", { name });
        deviceList = await api("/devices");
        render();
      }
      break;
    }
    case "deviceRevoke":
      if (confirm("解绑后这台设备需要重新登录。确认？")) {
        await api("/devices/" + value, "DELETE");
        if (value === cloud.session.deviceId) {
          await Vault.clear();
          cloud.session = new C.Session();
          await switchSpace("");
        } else {
          deviceList = await api("/devices");
          render();
        }
      }
      break;
    case "community":
      go("community");
      try {
        await communityLoad();
      } catch (e) {
        toast(e.message);
      }
      break;
    case "socialInbox": {
      const inbox = await api("/community/notifications");
      screen.innerHTML =
        heading("互动消息", inbox.unreadCount + "条未读") +
        btn("全部已读", "readInbox") +
        inbox.items
          .map(
            (n) =>
              `<article class="card"><p>${esc(n.actor_name)} · ${esc({ follow: "关注了你", like: "喜欢你的分享", comment: "评论了你的分享", reply: "回复了你", "new-post": "发布了新作品" }[n.kind] || "有新的互动")}</p>${n.post_id ? btn("查看", "readNotification", n.id + "|" + n.post_id) : ""}</article>`,
          )
          .join("");
      break;
    }
    case "readInbox":
      await api("/community/notifications/read", "PATCH", {});
      await actions("socialInbox", "");
      break;
    case "readNotification": {
      const [id, post] = value.split("|");
      await api("/community/notifications/" + id + "/read", "PATCH", {});
      await loadPost(post);
      break;
    }
    case "communityScope":
      communityScope = value;
      await communityLoad();
      break;
    case "refreshCommunity":
      await communityLoad();
      break;
    case "moreCommunity":
      await communityLoad(true);
      break;
    case "post":
      await loadPost(value);
      break;
    case "like": {
      const post = postList.find((p) => p.id === value) || currentPost;
      await api(
        "/community/posts/" + value + "/like",
        post.liked ? "DELETE" : "POST",
        post.liked ? null : {},
      );
      post.like_count += post.liked ? -1 : 1;
      post.liked = !post.liked;
      if (currentPost?.id === value) currentPost = post;
      render();
      break;
    }
    case "favoritePost":
      await api(
        "/community/posts/" + value + "/favorite",
        currentPost.favorited ? "DELETE" : "POST",
        currentPost.favorited ? null : {},
      );
      currentPost.favorited = !currentPost.favorited;
      render();
      break;
    case "reply": {
      const body = prompt("回复这条评论");
      if (body) {
        await api("/community/posts/" + currentPost.id + "/comments", "POST", {
          body,
          parentId: value,
        });
        commentList = await api(
          "/community/posts/" + currentPost.id + "/comments",
        );
        render();
      }
      break;
    }
    case "reportPost": {
      const reason = prompt("举报原因");
      if (reason) {
        await api("/community/posts/" + value + "/reports", "POST", { reason });
        toast("举报已提交");
      }
      break;
    }
    case "deletePost":
      if (confirm("撤回这条分享？")) {
        await api("/community/posts/" + value, "DELETE");
        await communityLoad();
      }
      break;
    case "author": {
      const result = await api("/community/users/" + value),
        rel = await api("/community/users/" + value + "/relationship");
      screen.innerHTML =
        heading("小怪朋友的公开作品", rel.followers + "位关注者") +
        btn(
          rel.following ? "取消关注" : "关注这位朋友",
          rel.following ? "unfollow" : "follow",
          value,
        ) +
        (result.length
          ? result
              .map(
                (post) =>
                  `<article class="card"><h3>${esc(post.payload.name)}</h3><p>${esc(post.payload.notes)}</p>${btn("看看", "post", post.id)}</article>`,
              )
              .join("")
          : empty("还没有公开作品"));
      break;
    }
    case "follow":
    case "unfollow":
      await api(
        "/community/users/" + value + "/follow",
        action === "follow" ? "POST" : "DELETE",
        action === "follow" ? {} : null,
      );
      toast(action === "follow" ? "已关注" : "已取消关注");
      await actions("author", value);
      break;
    case "publishMeal":
      selected = value;
      publishKind = "meal";
      if (cloud.session.accessToken) familyList = await api("/families");
      go("publish");
      break;
    case "conflictLocal":
    case "conflictRemote": {
      const c = conflicts[+value];
      if (confirm("确认采用这份记录？")) {
        await cloud.resolve(store, c, action === "conflictLocal");
        conflicts.splice(+value, 1);
        render();
      }
      break;
    }
    case "conflictMerge": {
      const c = conflicts[+value],
        merge = require("ConflictMerge"),
        fields = merge.mergeFields(c),
        server = [];
      for (const f of fields) {
        if (
          confirm(
            f.label +
              "\n本机：" +
              f.local +
              "\n云端：" +
              f.server +
              "\n确定=云端，取消=本机",
          )
        )
          server.push(f.key);
      }
      if (confirm("保存本次逐字段选择？")) {
        await store.mergeConflict(
          c.local.entityType,
          c.entityId,
          merge.mergedPayload(c, server),
          c.server.version,
          c.changeId,
        );
        conflicts.splice(+value, 1);
        render();
      }
      break;
    }
    case "scanBarcode": {
      const code = await P.nativeAsync("scan");
      document.querySelector("[name=code]").value = code;
      toast("已识别条码，请确认后查询");
      break;
    }
    case "recipeNew":
      recipeDraft = new M.Recipe();
      go("recipeEdit");
      break;
    case "recipeEdit":
      recipeDraft = clone(findRecipe(value));
      go("recipeEdit");
      break;
    case "deleteRecipe":
      if (confirm("删除这道私人菜谱？历史记餐不删除。")) {
        await store.deleteRecipe(findRecipe(value));
        go("recipes");
      }
      break;
    case "publicRecipes": {
      const result = await api("/catalog/recipes");
      publicRecipeList = (
        Array.isArray(result) ? result : result.items || []
      ).map((r) => r.payload || r);
      go("publicRecipes");
      break;
    }
    case "savePublicRecipe":
      if (confirm("保存为自己的离线菜谱副本？")) {
        const r = Object.assign(
          new M.Recipe(),
          clone(publicRecipeList[+value]),
          { id: "", familyId: "", version: 0, status: "private" },
        );
        await store.saveRecipe(r);
        if (
          ["food", "meal", "shoppingEdit", "plan", "recipeEdit"].includes(page)
        ) {
          clearTimeout(draftSaveHandle);
          draftDirty = false;
          await setting("androidDraft", null);
        }
        toast("已保存私有菜谱");
      }
      break;
    default:
      throw Error("操作暂未接通：" + action);
  }
}
async function submit(action) {
  switch (action) {
    case "search":
      filter.search = val("search");
      recipePage = 1;
      render();
      break;
    case "pantrySearch":
      searchText = val("query");
      render();
      break;
    case "filters":
      filter.maxMinutes = num("maxMinutes");
      filter.maxCost = num("maxCost");
      filter.availability = val("availability");
      filter.ingredients = val("ingredients")
        .split(/[,，、]/)
        .map((v) => v.trim())
        .filter(Boolean);
      filter = F.normalizeRecipeFilter(filter);
      recipePage = 1;
      go("recipes");
      break;
    case "food": {
      const f = Object.assign(new M.Food(), foodDraft);
      for (const k of [
        "name",
        "category",
        "unit",
        "location",
        "expiryDate",
        "purchasedAt",
        "notes",
      ])
        f[k] = val(k);
      f.quantity = num("quantity");
      f.estimatedPrice = num("estimatedPrice");
      f.muted = checked("foodMuted");
      f.tags = val("foodTags");
      await store.saveFood(f);
      if (
        ["food", "meal", "shoppingEdit", "plan", "recipeEdit"].includes(page)
      ) {
        clearTimeout(draftSaveHandle);
        draftDirty = false;
        await setting("androidDraft", null);
      }
      toast("已放进食库");
      go("pantry");
      break;
    }
    case "consume": {
      const quantity = num("quantity"),
        wasted = val("reason") === "wasted";
      if (!confirm("确认" + (wasted ? "丢弃" : "消耗") + " " + quantity + "？"))
        return;
      await store.consume(
        store.state.foods.find((f) => f.id === selected),
        quantity,
        wasted,
      );
      go("pantry");
      break;
    }
    case "batchFood": {
      const ids = val("ids")
        ? val("ids").split(",")
        : store.state.foods.filter((f) => !f.archived).map((f) => f.id);
      if (confirm("批量修改" + ids.length + "份食材？")) {
        await store.batchFood(ids, val("operation"), val("value"));
        render();
      }
      break;
    }
    case "shopping": {
      const s = Object.assign(new M.Shopping(), shoppingDraft);
      for (const k of ["name", "unit", "category", "notes", "familyId"])
        s[k] = val(k);
      s.quantity = num("quantity");
      await store.saveShopping(s);
      if (
        ["food", "meal", "shoppingEdit", "plan", "recipeEdit"].includes(page)
      ) {
        clearTimeout(draftSaveHandle);
        draftDirty = false;
        await setting("androidDraft", null);
      }
      go("shopping");
      break;
    }
    case "purchase": {
      const s = clone(store.state.shopping.find((s) => s.id === selected));
      if (!s || s.purchased) throw Error("已经入库，请勿重复购买");
      if (!confirm("确认按实际数量入库并标记已买？")) return;
      const quantity = num("quantity"),
        price = num("price"),
        expiryDate = val("expiryDate");
      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(price) ||
        price < 0 ||
        !M.validDate(expiryDate)
      )
        throw Error("请检查数量、价格和日期");
      const f = Object.assign(new M.Food(), {
        id: P.invoke("uuid"),
        name: s.name,
        quantity,
        unit: s.unit,
        category: s.category,
        location: val("location"),
        expiryDate,
        purchasedAt: M.dateString(new Date()),
        estimatedPrice: price,
        purchasedQuantity: quantity,
        purchasePrice: price,
        familyId: s.familyId,
        modifiedAt: new Date().toISOString(),
      });
      if (val("packageCount")) {
        const count = num("packageCount");
        if (!Number.isInteger(count) || count < 1) throw Error("包装数请填正整数");
        f.notes = "包装数：" + count + "；实际总量：" + quantity + s.unit;
      }
      await store.purchaseIntoInventory(s.id, f);
      toast("采购与入库已同时保存");
      go("shopping");
      break;
    }
    case "meal": {
      rememberMealForm();
      const m = Object.assign(new M.Meal(), mealDraft);
      if (m.items?.length && m.name !== m.items.map((i) => i.name).join("、"))
        m.items = [];
      if (m.items?.length) {
        m.items = [];
      }
      if (photoDraft) {
        m.localPhoto = photoDraft.compressed;
        m.photoOriginal = photoDraft.original;
        m.photoId = "";
        m.cloudPhoto = "";
        m.photoStatus = "pending";
      }
      await store.saveMeal(m);
      if (
        ["food", "meal", "shoppingEdit", "plan", "recipeEdit"].includes(page)
      ) {
        clearTimeout(draftSaveHandle);
        draftDirty = false;
        await setting("androidDraft", null);
      }
      photoDraft = null;
      date = M.dateString(new Date(m.date));
      toast("这一餐记下啦");
      go("meals");
      break;
    }
    case "plan": {
      const p = Object.assign(new (require("MealPlan").MealPlan)(), planDraft);
      for (const k of ["date", "occasion", "mode", "recipeId", "note"])
        p[k] = val(k);
      p.people = num("people");
      await store.saveMealPlan(p);
      if (
        ["food", "meal", "shoppingEdit", "plan", "recipeEdit"].includes(page)
      ) {
        clearTimeout(draftSaveHandle);
        draftDirty = false;
        await setting("androidDraft", null);
      }
      week = p.date;
      go("plans");
      break;
    }
    case "draw": {
      people = num("people");
      const preset = U.DRAW_PRESETS.find((p) => p.id === val("preset")),
        o = Object.assign(new U.DrawOptions(), {
          people,
          dishes: preset.dishes,
          soups: preset.soups,
          minutes: num("minutes"),
          budget: num("budget"),
          excluded: (settings.excluded || "").split(/[,，、]/).filter(Boolean),
          seed: date,
          attempt: drawAttempt++,
          mode: intent === "record" ? "外食" : "做饭",
        });
      drawResult = U.drawMenu(
        allRecipes(),
        o,
        store.state.foods,
        M.dateString(new Date()),
      );
      await setting("drawPreset", preset.id);
      await setting("drawMinutes", String(o.minutes));
      await setting("drawBudget", String(o.budget));
      await setting("androidDraw", drawResult);
      render();
      break;
    }
    case "timer": {
      if (utility.timers.length >= 6)
        throw Error("最多6个计时器，请先取消一个");
      const minutes = num("minutes");
      if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440)
        throw Error("计时分钟无效");
      const timer = {
        id: P.invoke("uuid"),
        recipeId: selected || "",
        label: val("label"),
        deadline: Date.now() + Math.round(minutes * 60000),
      };
      const permission = await P.nativeAsync("permission");
      const state = P.invoke("timer", timer);
      utility.timers.push(timer);
      await saveUtility();
      toast(
        !permission
          ? "计时已开始，未允许系统通知"
          : state.exact
            ? "计时与系统提醒已设置"
            : "计时已开始，普通系统提醒可能延迟",
      );
      render();
      break;
    }
    case "preferences":
      await setting("excluded", val("excluded"));
      for (const domain of ["cook", "record"])
        await setting(domain + "Preference", {
          homeRegion: val(domain + "Region"),
          goal: val(domain + "Goal"),
          learning: val(domain + "Learning") === "true",
        });
      await setting("theme", "light");
      document.body.classList.remove("dark", "sky", "berry");
      toast("口味偏好记住啦");
      render();
      break;
    case "login": {
      const email = val("email"),
        password = val("password"),
        register = val("register") === "true",
        displayName = val("displayName");
      const error = require("AuthInputCore").credentialError(
        email,
        password,
        register,
        displayName,
        val("confirmation"),
      );
      if (error) throw Error(error);
      const profile = Object.assign(
        new (require("AccountModels").UserProfile)(),
        { displayName, regionCode: val("registerRegion") },
      );
      cloud.endpoint = require("AuthInputCore").automaticServiceEndpoint(
        cloud.endpoint || P.invoke("prefGet", {name:"shiku_android_global",key:"endpoint",fallback:""}),
      );
      await cloud.login(email, password, register, profile);
      await switchSpace(cloud.session.userId, require("AuthInputCore").normalizeEmail(email));
      await store.setting(
        "boundEmail",
        require("AuthInputCore").normalizeEmail(email),
      );
      toast("登录成功");
      break;
    }
    case "password":
      {const invalid=require("AuthInputCore").newPasswordError(val("newPassword"));if(invalid)throw Error(invalid);}
      if (confirm("确认修改密码并退出所有设备？")) {
        await api("/auth/password", "POST", {
          currentPassword: val("oldPassword"),
          newPassword: val("newPassword"),
        });
        await Vault.clear();
        cloud.session = new C.Session();
        await switchSpace("");
        toast("密码已改，请重新登录");
      }
      break;
    case "profile": {
      if (!profileData) throw Error("请先读取最新资料");
      const body = {
        version: profileData.version,
        displayName: val("displayName"),
        avatarPreset: val("avatarPreset"),
        avatarMode:
          (typeof parity !== "undefined" && parity.avatarMode === "preset") || val("avatarPreset") !== profileData.avatarPreset ? "preset" : "keep",
        bio: val("bio"),
        dietGoal: val("dietGoal"),
      };
      if (val("regionCode")) body.regionCode = val("regionCode");
      const epoch = parity.epoch;
      const updated = await api("/account/profile/update", "POST", body);
      if (epoch !== parity.epoch) return;
      await loadAndroidProfile(updated);
      toast("资料已保存");
      render();
      break;
    }
    case "familyCreate":
      await api("/families", "POST", { name: val("name") });
      familyList = await api("/families");
      render();
      break;
    case "familyJoin":
      await api("/families/join", "POST", { inviteCode: val("inviteCode") });
      familyList = await api("/families");
      render();
      break;
    case "comment":
      await api("/community/posts/" + currentPost.id + "/comments", "POST", {
        body: val("body"),
      });
      commentList = await api(
        "/community/posts/" + currentPost.id + "/comments",
      );
      render();
      break;
    case "publish": {
      const body = {
        sourceId: selected,
        kind: publishKind,
        visibility: val("visibility"),
        showPrice: checked("showPrice"),
        confirmed: checked("confirmed"),
      };
      if (body.visibility === "family") {
        if (!val("familyId")) throw Error("请选择家庭");
        body.familyId = val("familyId");
      }
      if (!body.confirmed) throw Error("请先确认分享范围");
      await cloud.sync(store);
      await api("/community/posts", "POST", body);
      toast(body.visibility === "public" ? "已提交，审核后公开" : "分享已保存");
      await communityLoad();
      break;
    }
    case "recipeSave": {
      const r = Object.assign(new M.Recipe(), recipeDraft);
      r.name = val("name");
      r.minutes = num("minutes");
      r.people = num("people");
      r.estimatedCost = num("estimatedCost");
      r.ingredients = val("ingredients")
        .split("\n")
        .filter((v) => v.trim())
        .map((v) => {
          const [name, q, unit] = v.split(/[,，]/);
          if (!name || !unit || !Number.isFinite(Number(q)) || Number(q) <= 0)
            throw Error("每行用料请填写：名称,正数数量,单位");
          return new M.Ingredient(name.trim(), Number(q), unit.trim());
        });
      r.steps = val("steps")
        .split("\n")
        .filter((v) => v.trim());
      r.tips = val("tips");
      await store.saveRecipe(r);
      if (
        ["food", "meal", "shoppingEdit", "plan", "recipeEdit"].includes(page)
      ) {
        clearTimeout(draftSaveHandle);
        draftDirty = false;
        await setting("androidDraft", null);
      }
      go("recipes");
      break;
    }
    case "barcode": {
      const code = val("code");
      let template = store.state.templates.find((t) => t.barcode === code);
      if (!template) {
        try {
          const result = await api("/catalog/barcodes/" + code);
          template = result.payload || result;
        } catch (e) {
          toast("未查到，可手动填写后保存");
        }
      }
      foodDraft = Object.assign(
        new M.Food(),
        template
          ? {
              name: template.name,
              unit: template.unit || "个",
              category: template.category || "其他",
              location: template.location || store.state.locations[0],
            }
          : {},
      );
      go("food");
      break;
    }
    default:
      throw Error("尚未接通的保存入口：" + action);
  }
}
async function guarded(work, source) {
  if (busy) return;
  busy = true;
  screen.setAttribute("aria-busy", "true");
  // Delay visual progress so quick local actions do not flash; autosaves stay quiet.
  let progress;
  const previousBusy = source && source.getAttribute("aria-busy");
  const timer = source ? setTimeout(() => {
    if (source.isConnected) source.setAttribute("aria-busy", "true");
    progress = document.createElement("div");
    progress.id = "interaction-pending";
    progress.setAttribute("role", "status");
    progress.setAttribute("aria-live", "polite");
    progress.textContent = "正在处理，请稍候…";
    document.body.append(progress);
  }, 300) : null;
  try {
    await work();
  } catch (e) {
    toast(e.message || "没有完成，请重试");
    console.error(e);
  } finally {
    clearTimeout(timer);
    if (progress) progress.remove();
    if (source) {
      if (previousBusy === null) source.removeAttribute("aria-busy");
      else source.setAttribute("aria-busy", previousBusy);
    }
    busy = false;
    screen.setAttribute("aria-busy", "false");
  }
}
document.addEventListener("click", (event) => {
  const b = event.target.closest("[data-action]");
  if (b && !b.disabled && b.getAttribute("aria-disabled") !== "true")
    guarded(() => actions(b.dataset.action, b.dataset.value), b);
});
document.addEventListener("submit", (event) => {
  const f = event.target.closest("form[data-submit]");
  if (f) {
    event.preventDefault();
    guarded(() => submit(f.dataset.submit), event.submitter || f);
  }
});
document.addEventListener("input", (event) => {
  if(event.target.closest("#companion-dialog"))return;
  if (page === "filters" && typeof captureFilterInputs === "function")
    captureFilterInputs();
  if (["food", "meal", "shoppingEdit", "plan", "recipeEdit"].includes(page)) {
    draftDirty = true;
    clearTimeout(draftSaveHandle);
    draftSaveHandle = setTimeout(
      () =>
        guarded(async () => {
          const values = {};
          document
            .querySelectorAll("main form [name]")
            .forEach((el) => (values[el.name] = el.value));
          await setting("androidDraft", {
            page,
            selected,
            values,
            foodDraft,
            mealDraft,
            shoppingDraft,
            planDraft,
            recipeDraft,
            photoDraft,
            polishPhotos:typeof polishPhoto!=="undefined"?polishPhoto.paths.slice():[],
            polishCover:typeof polishPhoto!=="undefined"?polishPhoto.cover:true,
            parityFoodStage:
              typeof parity !== "undefined" ? parity.foodStage : 1,
          });
        }),
      250,
    );
  }
});
document.addEventListener("change", (event) =>
  guarded(async () => {
    const el = event.target;
    if (
      page === "filters" &&
      el.name === "availability" &&
      typeof parity !== "undefined"
    )
      parity.filterDraft.availability = el.value;
    if (el.name === "day") {
      date = el.value;
      if (page === "today" && date > M.dateString(new Date())) {
        week = date;
        go("plans");
      } else render();
    }
    if (el.name === "people" && ["recipes", "recipe"].includes(page)) {
      people = Number(el.value);
      render();
    }
    if (el.name === "recipeOrder") {
      await setting("recipeOrder", el.value);
      render();
    }
    if (el.dataset.prepare !== undefined && progress) {
      const id = el.dataset.prepare;
      progress.prepared = el.checked
        ? progress.prepared.concat(id)
        : progress.prepared.filter((v) => v !== id);
      await storeProgress();
    }
  }),
);
function updateTimerText() {
  document
    .querySelectorAll("[data-deadline]")
    .forEach(
      (el) =>
        (el.textContent = T.countdownText(
          Number(el.dataset.deadline),
          Date.now(),
        )),
    );
}
function updateWidget() {
  try {
    const d = require("CardData").cardData(
      store.state.foods,
      store.state.shopping,
    );
    P.invoke("widget", {
      text: d.urgentText + "\n\n采购 " + d.count + "项\n" + d.shoppingText,
    });
  } catch {}
}
async function init() {
  try {
    await store.init(P.context);
    const authCore = require("AuthInputCore");
    const savedEndpoint = P.invoke("prefGet", {name:"shiku_android_global",key:"endpoint",fallback:""});
    cloud.endpoint = authCore.automaticServiceEndpoint(savedEndpoint);
    if (authCore.serviceOriginChanged(savedEndpoint, cloud.endpoint)) {
      await Vault.clear();
      P.invoke("prefPut", {name:"shiku_android_global",key:"endpoint",value:cloud.endpoint});
    }
    const saved = require("ReleaseLegal").PrivacyAccess.allowed ? await Vault.load() : "";
    if (saved) {
      cloud.session = Object.assign(new C.Session(), JSON.parse(saved));
      if (!/^[a-f0-9-]{36}$/.test(cloud.session.userId))
        throw Error("会话账号无效");
      P.invoke("prefPut", {
        name: "shiku_account_spaces",
        key: "activeScope",
        value: cloud.session.userId,
      });
      await store.init(P.context);
    } else if (
      P.invoke("prefGet", {
        name: "shiku_account_spaces",
        key: "activeScope",
        fallback: "",
      })
    ) {
      P.invoke("prefPut", {
        name: "shiku_account_spaces",
        key: "activeScope",
        value: "",
      });
      await store.init(P.context);
    }
    await loadSettings();
    render();
    window.platformVisibility(true);
    window.__kaifan = {
      store,
      cloud,
      allRecipes,
      cover,
      actions: (action, value) => actions(action, value),
      submit: (action) => submit(action),
      go: (next, keep) => go(next, keep),
      get page() {
        return page;
      },
    };
  } catch (e) {
    screen.innerHTML =
      heading("食库没能打开") +
      `<p>${esc(e.message)}</p><p>数据没有清空，请关闭重试。</p>`;
    console.error(e);
  }
}
window.addEventListener("DOMContentLoaded",()=>{window.installAndroidMotion?.();init();});
