"use strict";
// Android presentation of the canonical Index.ets flows; business decisions stay in shared cores.
const PARITY_SOURCE = "client/entry/src/main/ets/pages/Index.ets";
const parity = {
  monthOpen: false,
  month: "",
  recipeMore: false,
  library: true,
  filterDraft: null,
  filterSection: "餐次",
  filterOrder: "rank",
  filterFavorites: false,
  filterReturn: "recipes",
  settingsGroup: "口味与抽菜",
  pantryCategory: "全部",
  pantryLocation: "全部",
  pantrySort: "expiry",
  selectedFoods: [],
  diaryMode: "day",
  diaryDining: "",
  gallery: [],
  galleryCursor: "",
  galleryMore: false,
  galleryRecipe: "",
  galleryError: "",
  ownPage: 0,
  security: {},
  discovery: { hotSearches: [], favorites: [] },
  discoveryError: "",
  ingredient: "",
  itemIndex: -1,
  dishes: [],
  drawOptions: null,
  locked: [],
  drawTab: "菜品",
  authRegister: false,
  authError: "",
  compareIds: [],
  motion: true,
  autoSync: false,
  wifiOnly: true,
  profileLocal: null,
  dailyOffset: 0,
  procurementSeasoning: false,
  categoryDefaults: {},
};
const categoryArt = {
  快手菜: "quick",
  汤类: "soup",
  粥类: "porridge",
  大菜: "feast",
  主食: "staples",
  早餐: "breakfast",
  凉菜: "cold",
  甜点: "dessert",
  减脂餐: "light",
  高蛋白: "protein",
  家常: "home",
};
const checkField = (name, label, checked = false) =>
  `<label class="switch-row"><span>${esc(label)}</span><input type="checkbox" role="switch" name="${esc(name)}" ${checked ? "checked" : ""}></label>`;
const actionTile = (label, icon, action, value = "") =>
  `<button class="setting-tile" data-action="${esc(action)}" data-value="${esc(value)}">${art("ui_" + icon + ".png")}<span>${esc(label)}</span></button>`;
const oldActions = actions,
  oldSubmit = submit,
  oldGo = go,
  oldLoadSettings = loadSettings;
const oldToday = todayView,
  oldRecipe = recipeView,
  oldFood = foodView,
  oldMeal = mealView,
  oldCommunity = communityView;
const oldProcurement = procurementView,
  oldProfile = profileView,
  oldAccount = accountView;
const recipeOrders = [
  ["rank", "综合排序"],
  ["price", "价格升序"],
  ["priceDesc", "价格降序"],
  ["time", "耗时升序"],
  ["timeDesc", "耗时降序"],
  ["favorites", "收藏最多"],
];
function parityReset() {
  parity.epoch = (parity.epoch || 0) + 1;
  parity.profileAvatar = "";
  parity.avatarMode = "keep";
  parity.profileLoading = false;
  parity.actualRecipe = null;
  parity.detailContents = {};
  parity.authDraft = null;
  parity.preparedNames = [];
  parity.catalogPreview = null;
  parity.filterDraft = null;
  parity.gallery = [];
  parity.galleryRecipe = "";
  parity.galleryCursor = "";
  parity.security = {};
  parity.dishes = [];
  parity.locked = [];
  parity.compareIds = [];
  parity.selectedFoods = [];
  parity.discovery = { hotSearches: [], favorites: [] };
  parity.discoveryError = "";
  parity.authError = "";
}
loadSettings = async function () {
  await oldLoadSettings();
  parityReset();
  for (const [key, fallback] of Object.entries({
    loginSyncOwner: "",
    autoSync: "false",
    wifiOnly: "true",
    shareSearchHeat: "false",
    drawDisliked: "[]",
    categoryDefaults: "{}",
    androidDrawOptions: "null",
    drawSimpleV2: "false",
    localProfile: "{}",
    profileCache: "null",
    avatarPreview: "null",
    dailyOffset: "0",
    notifications: "false",
    threshold: "3",
    reminderHour: "20",
    boundEmail: "",
  })) {
    const text = await store.getSetting(key, fallback);
    try {
      settings[key] = JSON.parse(text);
    } catch {
      settings[key] = text;
    }
  }
  parity.autoSync = settings.autoSync === true;
  parity.wifiOnly = settings.wifiOnly !== false;
  parity.motion = true;
  parity.categoryDefaults = settings.categoryDefaults || {};
  parity.profileLocal = settings.localProfile;
  profileData = cloud.session.accessToken ? settings.profileCache : null;
  parity.drawOptions = settings.drawSimpleV2 ? settings.androidDrawOptions : null;
  parity.dailyOffset = Number(settings.dailyOffset) || 0;
  applyAppearance();
  document.body.classList.remove("reduced-motion");
};
go = function (next, keep = false) {
  if (next === "filters" && page !== "filters") {
    parity.filterDraft = F.normalizeRecipeFilter(
      page === "draw"
        ? parity.drawFilter || new F.RecipeFilterOptions()
        : filter,
    );
    parity.filterFavorites = filterOnlyFav;
    parity.filterOrder = settings.recipeOrder || "rank";
    parity.filterReturn = page === "draw" ? "draw" : "recipes";
  }
  if (page === "meal" && next === "mealRecipePicker") rememberMealForm();
  if (next === "meal" && page !== "meal")
    parity.dishes = clone(mealDraft?.items || []);
  if (next === "today" && date !== parity.month.slice(0, 7))
    parity.month = date.slice(0, 7);
  oldGo(next, keep);
  if (["mine", "profile"].includes(next) && cloud.session.accessToken && !parity.profileLoading && (!profileData || (profileData.avatarId && (!parity.profileAvatar || Date.now()>(parity.avatarExpiresAt||0)))))
    loadAndroidProfile().catch(() => {});
};
let profileReadSequence=0;
async function loadAndroidProfile(provided = null, localPreview = "") {
  const sequence=++profileReadSequence;
  const epoch = parity.epoch, owner = cloud.session.userId;
  if (!cloud.session.accessToken) return;
  parity.profileLoading = true;
  try {
    const p = provided || await api("/account/profile");
    if (sequence!==profileReadSequence || epoch !== parity.epoch || owner !== cloud.session.userId) return;
    profileData = p;
    parity.avatarMode = "keep";
    const cached=settings.avatarPreview;
    parity.profileAvatar = localPreview || (cached?.id===p.avatarId ? cached.path : "");
    if(localPreview)await setting("avatarPreview",{id:p.avatarId,path:localPreview});
    await setting("profileCache", p);
    if (p.avatarId && !parity.profileAvatar) {
      try {
        const image = await api("/account/avatar/" + encodeURIComponent(p.avatarId));
        if (epoch !== parity.epoch || owner !== cloud.session.userId) return;
        if(sequence!==profileReadSequence || profileData?.avatarId!==p.avatarId)return;
        parity.profileAvatar = /^https:\/\//i.test(image.url)?remotePhoto(image.url):(image.url||"");parity.avatarExpiresAt=Date.now()+240000;
      } catch { /* Preset remains visible when a signed avatar URL is unavailable. */ }
    }
    if (["mine", "profile"].includes(page)) render();
  } finally {
    if (epoch === parity.epoch) parity.profileLoading = false;
  }
}
function profileAvatarView(profile) {
  const portrait = parity.profileAvatar && profile.avatarId
    ? `<img src="${esc(parity.profileAvatar)}" alt="我的头像" data-profile-avatar>`
    : art("avatar_editorial_" + (["tomato", "rice", "mushroom", "cat"].includes(profile.avatarPreset) ? profile.avatarPreset : "rice") + ".png");
  return `<span class="portrait-rim">${portrait}</span>`;
}
function monthGrid(day, action) {
  const month = parity.month || day.slice(0, 7);
  const first = new Date(month + "-01T12:00:00");
  const pad = (first.getDay() + 6) % 7;
  const total = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();
  return `<div class="calendar-month row between">${btn("‹ 上月", "monthMove", -1)}<span>${esc(month)}</span>${btn("下月 ›", "monthMove", 1)}</div><div class="month-grid">${["一", "二", "三", "四", "五", "六", "日"].map((x) => `<small>${x}</small>`).join("")}${Array.from({ length: pad }, () => "<span></span>").join("")}${Array.from(
    { length: total },
    (_, i) => {
      const d = month + "-" + String(i + 1).padStart(2, "0");
      const recorded = store.state.meals.some((m) => m.date.slice(0, 10) === d),
        planned = store.state.plans.some((p) => p.date === d);
      return `<button class="${day === d ? "selected" : ""}" data-action="${action}" data-value="${d}"><span>${i + 1}</span><small>${recorded ? "●" : planned ? "○" : "　"}</small></button>`;
    },
  ).join("")}</div>`;
}
homeCalendar = function () {
  const offset = (new Date(date + "T12:00:00").getDay() + 6) % 7;
  return (
    `<div class="calendar-month row between">${btn("‹", "homeDay", D.shiftDay(date, -7))}${btn(date.slice(0, 7) + (parity.monthOpen ? " 收起月历 ↑" : " 月历 ↓"), "monthToggle")}${btn("›", "homeDay", D.shiftDay(date, 7))}</div>` +
    (parity.monthOpen
      ? monthGrid(date, "homeDay")
      : `<div class="week-strip">${["一", "二", "三", "四", "五", "六", "日"]
          .map((label, i) => {
            const day = D.shiftDay(date, i - offset);
            const recorded = store.state.meals.some(
                (m) => m.date.slice(0, 10) === day,
              ),
              planned = store.state.plans.some((p) => p.date === day);
            return `<button class="${day === date ? "selected" : ""}" data-action="homeDay" data-value="${day}"><small>${label}</small><span>${Number(day.slice(8))}</span><small>${recorded ? "●" : planned ? "○" : "　"}</small></button>`;
          })
          .join("")}</div>`)
  );
};
todayView = function () {
  let html = oldToday();
  html = html.replace(/<details class="date-picker">[\s\S]*?<\/details>/, "");
  html = html.replace(
    /<div class="row"><button[^>]*data-action="mode"[\s\S]*?<\/div>/,
    settings.quickstartDone
      ? ""
      : `<div class="row between"><span>先选一种用法</span>${btn("做饭", "mode", "cook")}${btn("记餐", "mode", "record")}</div>`,
  );
  html = html.replace(
    /<div class="card"><h3>小怪陪你慢慢记<\/h3>[\s\S]*?<\/div>/,
    "",
  );
  html = html.replace(
    /<h2>最近吃过，再记一次<\/h2>/,
    store.state.meals.length ? "<h2>最近吃过</h2>" : "",
  );
  html = html.replace(
    /<h2>快到期了<\/h2>/,
    store.state.foods.some((f) => !f.archived && M.daysLeft(f) <= 3)
      ? "<h2>快到期了</h2>"
      : "",
  );
  const dayIndex =
    Math.abs(Math.floor(new Date(date + "T12:00:00").getTime() / 86400000)) +
    parity.dailyOffset;
  const candidates = allRecipes().filter(
    (r) => !(settings.drawDisliked || []).includes(r.id) && !(window.activeRecipeSkips?.(intent) || []).includes(r.id),
  );
  const daily = candidates[dayIndex % candidates.length];
  html = html.replace(
    /<section class="daily-dish card">[\s\S]*?<\/section>/,
    `<section class="daily-dish card"><div class="row between"><div><h2>每日一菜</h2><small>转一转今天吃什么</small></div>${art("ui_shuffle.png")}</div>${daily ? recipeCard(daily) : empty("暂时没有合适的菜")}<div class="row">${daily ? favoriteIcon(daily.id) : ""}${btn("换一道", "dailyChange")}${btn("抽一整餐", "go", "draw")}</div></section>`,
  );
  html = html.replace(
    /<button data-action="go" data-value="shopping">[\s\S]*?采购清单<\/button>/,
    `<button data-action="go" data-value="recent">${art("ui_recipes.png")}最近浏览</button>`,
  );
  return html;
};
const oldFiltered = filteredRecipes;
filteredRecipes = function () {
  const result = oldFiltered();
  const order = settings.recipeOrder;
  if (order === "priceDesc")
    result.sort((a, b) => {
      const ac = U.estimateRecipeCost(a, people),
        bc = U.estimateRecipeCost(b, people);
      return Number(bc.usable) - Number(ac.usable) || bc.total - ac.total;
    });
  if (order === "timeDesc")
    result.sort((a, b) => (b.minutes || 0) - (a.minutes || 0));
  if (order === "favorites")
    result.sort((a, b) => favoriteHeat(b.id) - favoriteHeat(a.id));
  if (parity.library && (!order || order === "rank") && !filter.search.trim()) {
    const orderMap = new Map(allRecipes().map((r, i) => [r.id, i]));
    result.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));
  }
  return result;
};
function favoriteHeat(id) {
  const row = (parity.discovery.favorites || []).find((x) => x.recipeId === id);
  return row ? (row.realCount ?? row.count ?? 0) : 0;
}
function recipeRow(r, index = 0) {
  const cost = U.estimateRecipeCost(r, filter.costPeople || 2), count = favoriteHeat(r.id);
  return `<article class="card recipe-list-card ${index===0?"recipe-featured":""}"><div class="recipe" data-action="recipe" data-value="${esc(r.id)}"><img loading="lazy" src="${cover(r)}" alt="${esc(r.name)}"><div><small class="recipe-kicker">${esc(r.region || "通用家常")} / ${esc(r.category || "家常菜")}</small><h3>${esc(r.name)}</h3><div class="recipe-meta"><span class="recipe-time">${intent === "record" ? "制作参考 " : ""}${r.minutes || "待核"}分钟</span><span class="recipe-price">${cost.usable ? "约"+money(cost.total) : "费用待核"} / ${filter.costPeople || 2}人</span><span class="recipe-difficulty">${esc(r.difficulty || "难度待核")}</span></div></div></div><div class="row recipe-card-actions">${favoriteIcon(r.id,count)}${btn("看做法 →", "recipe", r.id)}${btn(utility.compare.includes(r.id) ? "已对比" : "＋ 对比", "compareAdd", r.id)}</div></article>`;
}
recipesView = function () {
  const list = filteredRecipes();
  const cats = [
    ...new Set(
      allRecipes()
        .map((r) => r.category)
        .filter(Boolean),
    ),
  ];
  return (
    `<div class="row between recipe-page-heading"><div class="content-title">${searchIcon("recipes")}<h1>菜谱</h1></div><button class="draw-entry" data-action="go" data-value="draw"><span class="draw-entry-content">${art("ui_shuffle.png")}<span>抽一餐</span></span></button></div><div class="row between recipe-library-tabs"><div>${btn("菜谱大全", "libraryMode", "true", parity.library ? "active" : "")}${btn("为你推荐", "libraryMode", "false", !parity.library ? "active" : "")}</div>${btn(parity.recipeMore ? "收起 ↑" : "更多 ↓", "recipeMore")}</div>` +
    (parity.recipeMore
      ? `<div class="row">${btn("做饭", "mode", "cook", intent === "cook" ? "active" : "")}${btn("外食 / 外卖", "mode", "record", intent === "record" ? "active" : "")}</div><div class="category-icons">${cats.map((c) => `<button class="${filter.categories.includes(c) ? "active" : ""}" data-action="recipeCategory" data-value="${esc(c)}">${art("ui_" + (categoryArt[c] || "home") + ".png")}<span>${esc(c)}</span></button>`).join("")}</div><div class="row">${btn("最近浏览", "go", "recent")}${btn("菜谱对比", "go", "compare")}${btn("写一道菜 ›", "recipeNew")}${btn("公共菜谱 ›", "publicRecipes")}${btn("偏好 ›", "settingsGroup", "口味与抽菜")}</div>`
      : "") +
    `<div class="row between recipe-filter-toolbar"><div class="row">${art("ui_taste.png", "small-icon")}${btn("筛选条件", "go", "filters")}</div>${favoritesEntry()}${btn("小怪","companionOpen")}</div>` +
    (F.recipeFilterSummary(filter) !== "全部餐次 · 不限条件"
      ? `<p class="hint">${esc(F.recipeFilterSummary(filter))}</p>`
      : "") +
    `<div class="recipe-discovery-bar"><div class="row between recipe-result-meta"><small>${list.length}道 · ${allRecipes().length}份做法</small>${F.recipeFilterSummary(filter)!=="全部餐次 · 不限条件"?btn("清空筛选", "resetFilter"):""}</div></div>` +
    (settings.recipeOrder === "favorites"
      ? `<p class="hint">${esc(parity.discoveryError || "按社区收藏人数排序")}${btn("刷新", "discovery")}</p>`
      : "") +
    (list.length
      ? '<section class="recipe-journal" aria-label="菜谱列表">'+list
          .slice(parity.library ? (recipePage - 1) * 24 : 0, parity.library ? recipePage * 24 : 12)
          .map(recipeRow)
          .join("")+'</section>' 
      : `${empty("暂时没有合适的菜，试试放宽一项条件", "recipe_no_results.png")}${btn("放宽一个条件", "relaxFilter")}`) +
(parity.library && list.length>24 ? `<div class="row recipe-pagination">${recipePage>1?btn("上一页", "recipePageMove", -1):''}<span>第 ${recipePage} 页</span>${recipePage*24<list.length?btn("下一页", "recipePageMove", 1):'<button disabled>下一页</button>'}</div>` : "") 
  );
};
function filterChoices(field, rows) {
  const draft = parity.filterDraft;
  return `<div class="row choice-wrap">${rows
    .map((row) => {
      const [id, label] = Array.isArray(row) ? row : [row, row];
      const active = Array.isArray(draft[field])
        ? draft[field].includes(id)
        : draft[field] === id;
      return btn(
        label,
        "draftFilter",
        field + "|" + id,
        active ? "active" : "",
      );
    })
    .join("")}</div>`;
}
function captureFilterInputs() {
  if (page !== "filters" || !parity.filterDraft) return;
  for (const name of ["maxMinutes", "maxCost", "minCost", "costPeople"]) {
    if (document.querySelector(`[name="${name}"]`))
      parity.filterDraft[name] = num(name);
  }
  for (const name of ["ingredients", "excludedIngredients"]) {
    if (document.querySelector(`[name="${name}"]`))
      parity.filterDraft[name] = val(name)
        .split(/[,，、]/)
        .map((x) => x.trim())
        .filter(Boolean);
  }
}
filtersView = function () {
  const d =
    parity.filterDraft ||
    (parity.filterDraft = F.normalizeRecipeFilter(filter));
  const section = parity.filterSection;
  const recipes = allRecipes(),
    groups = require("IngredientDiscoveryCore").INGREDIENT_GROUPS;
  const uniq = (key) => [
    ...new Set(recipes.map((r) => r[key]).filter(Boolean)),
  ];
  let content = "";
  if (section === "餐次")
    content = '<p class="filter-prompt">哪一餐吃 · 可多选</p><div class="occasion-choices">'+F.MEAL_OCCASIONS.map(o=>`<button data-action="draftFilter" data-value="occasions|${esc(o.id)}" aria-pressed="${d.occasions.includes(o.id)}" class="${d.occasions.includes(o.id)?"active":""}">${art(({lunch:"meal_lunch.png",dinner:"meal_dinner.png",snack:"meal_snack.png"})[o.id] || "ui_breakfast.png")}<span>${esc(o.label)}</span></button>`).join("")+'</div>';
  if (section === "类别")
    content = filterChoices("categories", uniq("category"));
  if (section === "地区") content = filterChoices("regions", uniq("region"));
  if (section === "口味") content = filterChoices("tastes", uniq("taste"));
  if (section === "目标")
    content = filterChoices("goals", ["减脂餐", "高蛋白", "清淡少油", "素食"]);
  if (section === "菜系")
    content =
      filterChoices(
        "cuisines",
        require("RecipeDiscoveryCore").CUISINE_GROUPS.map((x) => [
          x.id,
          x.label,
        ]),
      ) +
      `<p class="hint">八大菜系＋其他地方菜；家常与异国料理可在不限时浏览。</p>`;
  if (section === "难度")
    content = filterChoices("difficulties", uniq("difficulty"));
  if (section === "时间")
    content =
      filterChoices(
        "maxMinutes",
        [0, 15, 30, 45, 60].map((x) => [x, x ? x + "分钟内" : "不限"]),
      ) +
      input(
        "maxMinutes",
        "自定义分钟，0为不限",
        d.maxMinutes,
        "number",
        'min="0" max="1440"',
      );
  if (section === "预算")
    content =
      filterChoices(
        "costPeople",
        [1, 2, 3, 4, 6].map((x) => [x, x + "人"]),
      ) +
      filterChoices(
        "maxCost",
        [0, 10, 20, 30, 50, 100].map((x) => [
          x,
          x ? "约" + x + "元内" : "不限",
        ]),
      ) +
      input("minCost", "最低预算", d.minCost, "number", 'min="0"') +
      input("maxCost", "最高预算，0为不限", d.maxCost, "number", 'min="0"') +
      `<p class="hint">预算筛选仅纳入用量可核对的费用估算。</p>`;
  if (section === "食材")
    content =
      `<h3>现有食材</h3>` +
      filterChoices("availability", [
        ["any", "不限"],
        ["partial", "用上现有食材"],
        ["ready", "主料够用"],
      ]) +
      filterChoices("ingredientMode", [
        ["all", "全部包含"],
        ["any", "包含任一种"],
      ]) +
      filterChoices(
        "ingredients",
        groups.map((x) => [x.id, x.label]),
      ) +
      input(
        "ingredients",
        "想用的具体食材（逗号分隔）",
        d.ingredients.join("，"),
      ) +
      `<h3>排除食材</h3>` +
      filterChoices(
        "excludedIngredients",
        groups.map((x) => [x.id, x.label]),
      ) +
      input(
        "excludedIngredients",
        "不想用的具体食材（逗号分隔）",
        d.excludedIngredients.join("，"),
      );
  if (section === "排序")
    content = `<div class="row">${recipeOrders.map(([id, label]) => btn(label, "draftOrder", id, parity.filterOrder === id ? "active" : "")).join("")}</div>${btn("只看我的收藏", "draftFavorites", "", parity.filterFavorites ? "active" : "")}`;
  const preview = F.filterRecipes(
    recipes,
    {
      ...d,
      excludedIngredients: [
        ...d.excludedIngredients,
        ...(settings.excluded || "").split(/[,，、]/).filter(Boolean),
      ],
    },
    store.state.foods,
    M.dateString(new Date()),
  ).filter(
    (r) =>
      !parity.filterFavorites ||
      store.state.favorites.some((f) => f.recipeId === r.id),
  );
  return (
    heading("筛选") +
    `<div class="filter-tabs chips">${["食材", "类别", "餐次", "菜系", "地区", "口味", "目标", "时间", "预算", "难度", "排序"].map((x) => btn(x, "filterSection", x, section === x ? "active" : "")).join("")}</div><div class="row">${btn("保存这组条件", "saveFilter")}${experience.filters.map((f, i) => btn(f.name, "loadFilter", i)).join("")}</div><section class="filter-panel"><h2>${section}</h2>${content}<p class="hint">${esc(F.recipeFilterSummary(d))}</p>${preview.length ? "" : "<p class=warning>没有同时满足条件的做法，试试取消一项或重置。</p>"}</section><div class="filter-actions">${btn("重置", "draftReset")}${btn("查看 " + preview.length + " 份做法", "filterApply", "", "primary")}</div>`
  );
};
function settingsDetailView() {
  const group = parity.settingsGroup;
  let content = "";
  if (group === "口味与抽菜")
    content =
      form(
        "tastePreferences",
        input("excluded", "不吃的食材", settings.excluded || "") +
          ["cook", "record"]
            .map(
              (domain) =>
                `<h2>${domain === "cook" ? "做饭偏好" : "外食 / 外卖偏好"}</h2>${input(domain + "Region", "地区风味", settings[domain + "Preference"]?.homeRegion || "")}${select(domain + "Goal", "饮食目标", ["均衡饮食", "控制热量", "高蛋白", "清淡少油"], settings[domain + "Preference"]?.goal || "均衡饮食")}${checkField(domain + "Learning", "从记录学习", settings[domain + "Preference"]?.learning !== false)}${btn("清除此场景学习", "clearLearning", domain)}`,
            )
            .join(""),
      ) + btn("不喜欢的菜 ›", "go", "dislikes");
  if (group === "食材管理")
    content =
      form(
        "categoryDefaults",
        select(
          "category",
          "按分类设置默认值",
          M.CATEGORIES,
          parity.defaultCategory || "蔬菜",
        ) +
          input(
            "shelfDays",
            "默认保质期（天）",
            parity.categoryDefaults[parity.defaultCategory || "蔬菜"]?.days ??
              7,
            "number",
            'min="0" max="3650"',
          ) +
          input(
            "warningDays",
            "提前提醒（天）",
            parity.categoryDefaults[parity.defaultCategory || "蔬菜"]
              ?.warningDays ?? 3,
            "number",
            'min="0" max="3650"',
          ) +
          select(
            "defaultUnit",
            "默认单位",
            M.UNITS,
            parity.categoryDefaults[parity.defaultCategory || "蔬菜"]?.unit ||
              "个",
          ) +
          checkField(
            "categoryMuted",
            "关闭此类临期提醒",
            parity.categoryDefaults[parity.defaultCategory || "蔬菜"]?.muted,
          ),
      ) +
      `<h2>存放位置管理</h2>${store.state.locations.map((l) => `<div class="row between"><span>${esc(l)}</span>${btn("改名", "renameLocation", l)}</div>`).join("")}${btn("增加位置", "newLocation")}`;
  if (group === "提醒")
    content =
      form(
        "reminderSettings",
        checkField(
          "notifications",
          "临期提醒",
          settings.notifications === true,
        ) +
          input(
            "threshold",
            "提前天数",
            settings.threshold ?? 3,
            "number",
            'min="0" max="365"',
          ) +
          input(
            "reminderHour",
            "每日提醒时间",
            String(settings.reminderHour ?? 20).padStart(2, "0") + ":00",
            "time",
          ),
      ) +
      `<div class="row">${btn("通知权限", "notificationPermission")}${btn("精确提醒设置", "alarmSettings")}${btn("做菜计时器", "go", "timers")}</div>`;
  if (group === "账号与同步")
    content = cloud.session.accessToken
      ? `<p>待同步 ${store.state.changes.length} 条</p>${btn("手动同步", "sync", "", "primary")}${form("syncSettings", checkField("autoSync", "应用使用期间自动同步", parity.autoSync) + checkField("wifiOnly", "自动同步仅用 Wi-Fi", parity.wifiOnly))}${btn("账号与家庭", "go", "account")}`
      : `${art("community_welcome.png", "empty-banner")}${btn("登录与同步", "go", "account")}`;
  if (group === "数据与备份")
    content = `<p>${allRecipes().length}道菜 · 待同步 ${store.state.changes.length}条</p><div class="row">${btn("导出备份 JSON", "exportData")}${btn("导入备份 JSON", "importData")}${btn("检查菜谱更新", "catalogUpdate")}</div><p class="hint">JSON保存库存、采购、菜谱和记餐；照片另存归档。卸载前请导出重要记录。</p>`;
  if (group === "帮助与课堂") content = helpView();
  return (group === "帮助与课堂" ? "" : heading(group)) + content;
}
mineView = function () {
  const profile = profileData || parity.profileLocal || {};
  return `<button class="profile-banner" data-action="go" data-value="profile">${profileAvatarView(profile)}<div><strong>${esc(profile.displayName || "我的吃饭档案")}</strong><p class="hint">${cloud.session.accessToken ? "示例主体资料 · 头像 · 地区" : "设置昵称与口味，或登录同步"}</p></div></button><h2 class="settings-section-title">设置</h2><div class="grid settings-grid">${[
    ["口味与抽菜", "taste"],
    ["食材管理", "storage"],
    ["提醒", "reminder"],
    ["账号与同步", "cloud"],
    ["数据与备份", "backup"],
    ["帮助与课堂", "help"],
  ]
    .map(([label, icon]) => actionTile(label, icon, "settingsGroup", label))
    .join("")}</div>`;
};
function foodArtName(name) {
  return /蛋/.test(name)
    ? "eggs"
    : /番茄|西红柿/.test(name)
      ? "tomato"
      : /奶/.test(name)
        ? "milk"
        : /肉/.test(name)
          ? "pork"
          : /米|面/.test(name)
            ? "rice"
            : /果/.test(name)
              ? "apple"
              : /盐|油|酱|醋|糖/.test(name)
                ? "spice"
                : /干|菌|木耳/.test(name)
                  ? "dried"
                  : "greens";
}
pantryView = function () {
  if (!store.state.foods.some(food=>!food.archived)) {
    return `<h1>我的库存</h1><section class="pantry-first">${empty("库存还是空的")}${btn("添加第一份食材","foodNew","","primary")}</section><div class="row">${btn("采购清单","go","shopping")}${btn("消耗历史","go","stockHistory")}${btn("扫码录入","go","barcode")}</div>`;
  }
  let foods = store.state.foods.filter(
    (f) =>
      !f.archived &&
      (!searchText || [f.name,f.category,f.location,f.expiryDate,f.tags,f.notes].some(value=>(value || "").includes(searchText))) &&
      (parity.pantryCategory === "全部" ||
        f.category === parity.pantryCategory) &&
      (parity.pantryLocation === "全部" ||
        f.location === parity.pantryLocation),
  );
  foods.sort((a, b) =>
    parity.pantrySort === "name"
      ? a.name.localeCompare(b.name, "zh")
      : parity.pantrySort === "quantity"
        ? a.quantity - b.quantity
        : parity.pantrySort === "purchased"
          ? (b.purchasedAt || "").localeCompare(a.purchasedAt || "")
          : a.expiryDate.localeCompare(b.expiryDate),
  );
  return (
    `<div class="row between pantry-page-heading"><h1>我的库存</h1>${btn("＋", "foodNew")}</div><div class="row utility-row pantry-tools"><button data-action="go" data-value="stockHistory">${art("ui_storage.png")}<span>购买与消耗历史</span><span aria-hidden="true">›</span></button><button data-action="go" data-value="shopping">${art("utility_shopping.png")}<span>采购清单</span><span aria-hidden="true">›</span></button></div>` +
    form("pantrySearch", input("query", "名称、位置、标签或到期日期", searchText,"search"), "查找") +
    `<div class="chips">${["全部", ...M.CATEGORIES].map((c) => btn(c, "pantryCategory", c, parity.pantryCategory === c ? "active" : "")).join("")}</div><div class="chips">${["全部", ...store.state.locations].map((l) => btn(l, "pantryLocation", l, parity.pantryLocation === l ? "active" : "")).join("")}</div><div class="pantry-controls">${select(
      "pantrySort",
      "排序",
      [
        ["expiry", "到期时间"],
        ["purchased", "新增时间"],
        ["name", "名称"],
        ["quantity", "数量"],
      ],
      parity.pantrySort,
    )}${btn(parity.batch ? "完成多选" : "批量管理", "batchToggle")}${btn("扫码录入", "go", "barcode")}</div>` +
    (parity.batch
      ? `<div class="card"><p>已选 ${parity.selectedFoods.length}项</p>${select("batchLocation", "迁移到", store.state.locations, store.state.locations[0])}${input("batchExpiry", "调整到期日", date, "date")}<div class="row">${btn("迁移", "batchCommit", "location")}${btn("改到期日", "batchCommit", "expiry")}${btn("删除", "batchCommit", "delete", "danger")}</div></div>`
      : "") +
    (foods.length
      ? foods
          .map(
            (f) =>
              `<article class="card food-card">${parity.batch ? `<input type="checkbox" aria-label="选择${esc(f.name)}" data-food-select="${esc(f.id)}" ${parity.selectedFoods.includes(f.id) ? "checked" : ""}>` : ""}${art("food_" + foodArtName(f.name) + ".webp", "food-art")}<div class="row between food-card-heading"><h3>${esc(f.name)}</h3><span class="badge ${M.daysLeft(f) < 0 ? "warning" : ""}">${M.daysLeft(f) < 0 ? "已过期" : M.daysLeft(f) + "天到期"}</span></div><p class="hint">${f.quantity}${esc(f.unit)} · ${esc(f.location)} · ${money(f.estimatedPrice)}</p><div class="row">${btn("编辑", "foodEdit", f.id)}${btn("实际消耗", "consume", f.id)}${btn("到期提醒", "expiryReminder", f.id)}${btn("找相关菜", "ingredient", f.name)}</div></article>`,
          )
          .join("")
      : empty("没有符合条件的食材") + btn("清除筛选","clearPantryFilters")) +
    `<details><summary>常用食材模板</summary><div class="chips">${M.TEMPLATES.map((t, i) => btn("＋ " + t.name, "foodTemplate", i)).join("")}</div></details>`
  );
};
foodView = function () {
  const html = oldFood();
  return html.replace(
    "</form>",
    `<details><summary>更多详情</summary>${area("foodTags", "标签（逗号分隔）", foodDraft?.tags?.join?.("，") || "")}${checkField("foodMuted", "关闭这一项临期提醒", foodDraft?.muted)}</details></form>`,
  );
};
mealsView = function () {
  const start =
    parity.diaryMode === "week"
      ? D.weekDates(date)[0]
      : parity.diaryMode === "month"
        ? date.slice(0, 7) + "-01"
        : date;
  const end =
    parity.diaryMode === "week"
      ? D.weekDates(date)[6]
      : parity.diaryMode === "month"
        ? date.slice(0, 7) + "-31"
        : date;
  const meals = store.state.meals
    .filter(
      (m) =>
        M.dateString(new Date(m.date)) >= start &&
        M.dateString(new Date(m.date)) <= end &&
        (!parity.diaryDining || m.diningMode === parity.diaryDining),
    )
    .slice()
    .reverse();
  const spend = E.spendingSummary(meals);
  const calories = meals.filter(
    (m) => Number.isFinite(m.calories) && m.calories >= 0,
  );
  return (
    `<div class="row between"><h1>我的记餐</h1>${btn("＋ 记一餐", "mealNew", "晚餐", "primary")}</div><details class="diary-tools"><summary>记餐工具</summary><div class="row">${btn("饮食统计", "go", "stats")}${btn("导出记录", "exportMeals")}${btn("剩菜盒","go","leftovers")}${btn("常去店铺","go","dining-places")}</div></details><section class="diary-summary">${art("avatar_editorial_rice.png")}<div><h2>吃饭的小日子</h2><p class="hint">${meals.length}餐 · 实付 ${money(spend.paid)}<br>估算 ${money(spend.estimated)} · 热量已记 ${calories.length}餐</p></div></section><div class="row">${[
      ["day", "日"],
      ["week", "周"],
      ["month", "月"],
    ]
      .map(([id, label]) =>
        btn(label, "diaryMode", id, parity.diaryMode === id ? "active" : ""),
      )
      .join(
        "",
      )}${btn("月历 ↓", "monthToggle")}</div>${parity.monthOpen ? monthGrid(date, "homeDay") : input("day", "选择日期", date, "date")}<div class="chips diary-dining-filters" role="group" aria-label="用餐方式">${["", "在家做", "外卖", "餐馆", "食堂", "其他"].map((d) => btn(d || "全部方式", "diaryDining", d, parity.diaryDining === d ? "active" : "")).join("")}</div>` +
    (meals.length
      ? meals
          .map((m) => {
            const recipe = m.recipeId ? findRecipe(m.recipeId) : null;
            return `<article class="card meal-record">${m.localPhoto ? `<img class="cover" src="${esc(m.localPhoto)}" alt="用餐照片">` : recipe ? `<img class="food-art" src="${cover(recipe)}" alt="${esc(recipe.name)}">` : art(m.mealType === "早餐" ? "ui_breakfast.png" : m.mealType === "午餐" ? "meal_lunch.png" : m.mealType === "加餐" ? "meal_snack.png" : "meal_dinner.png", "food-art")}<h3>${esc(m.name)}</h3><small>${esc(M.dateString(new Date(m.date)))} · ${esc(m.mealType)} · ${esc(m.diningMode)}</small><p>${esc(m.costType || "估算")} ${money(m.estimatedCost)}${m.personalCost >= 0 ? " · 我的分摊 " + money(m.personalCost) + " · 整餐 " + money(m.mealTotal) : ""}${m.calories >= 0 ? " · " + m.calories + " kcal" : ""}</p><div class="row">${btn("查看 / 编辑", "mealEdit", m.id)}${btn("再记一次", "mealRepeat", m.id)}${btn("分享", "publishMeal", m.id)}</div></article>`;
          })
          .join("")
      : empty("这一天，还没有记餐"))
  );
};
mealView = function () {
  let html = oldMeal();
  const dishes = parity.dishes || [];
  const section = `<section class="meal-dishes"><div class="row between"><h2>这一餐的菜</h2>${btn("＋ 添一道", "dishEdit", -1)}${btn("从菜谱选一道", "go", "mealRecipePicker")}</div>${dishes.map((dish, i) => `<div class="card row between"><div><strong>${esc(dish.name)}</strong><p class="hint">${money(dish.estimatedCost)} · ${esc(dish.category || "家常")}</p></div>${btn("编辑", "dishEdit", i)}${btn("移除", "dishRemove", i)}</div>`).join("")}</section>`;
  return html.replace(
    '<form data-submit="meal">',
    '<form data-submit="meal">' + section,
  );
};
function dishView() {
  const dish = parity.dishes[parity.itemIndex] || {};
  return (
    heading("这一餐的一道菜") +
    form(
      "dish",
      input("dishName", "菜名", dish.name || "", "text", "required") +
        input(
          "dishCost",
          "费用（元）",
          dish.estimatedCost || 0,
          "number",
          'min="0" step="0.01"',
        ) +
        select(
          "dishCategory",
          "类别",
          [...new Set(["家常", ...allRecipes().map((r) => r.category)])],
          dish.category || "家常",
        ),
    )
  );
}
function mealRecipePickerView() {
  return (
    heading("选入这一餐") +
    allRecipes()
      .slice(0, recipePage * 24)
      .map(
        (r) =>
          `<article class="card recipe">${art(cover(r).replace("media/", ""))}<div><h3>${esc(r.name)}</h3>${btn("添入这一餐", "dishRecipe", r.id)}</div></article>`,
      )
      .join("") +
    btn("再看24道", "moreRecipes")
  );
}
function recipeNutritionView(r) {
  const portion = require("PortionCore"),
    o = new portion.PortionOptions();
  o.people = people;
  o.basePeople = r.people || 2;
  o.appetite = parity.appetite || 1;
  o.seasoning = parity.seasoning || "标准";
  o.spice = parity.spice || "原方";
  const ingredients = portion.recommendPortions(r.ingredients, o);
  const oil = Number(parity.oil);
  if (parity.oil !== undefined && Number.isFinite(oil) && oil >= 0) {
    const old = ingredients.find((i) => /^(食用油|植物油|油)$/.test(i.name));
    if (old) {
      old.quantity = oil;
      old.unit = "g";
    } else
      ingredients.push({
        name: "食用油",
        quantity: oil,
        unit: "g",
        optional: true,
      });
  }
  const n = require("NutritionCore").estimateNutrition(ingredients, people);
  return `<details><summary>份量调整与营养参考</summary>${form(
    "portion",
    select(
      "portionPeople",
      "人数",
      [1, 2, 3, 4, 5, 6, 8, 10, 20].map((x) => [String(x), x + "人"]),
      String(people),
    ) +
      select(
        "appetite",
        "食量",
        [
          ["0.75", "小食量"],
          ["1", "标准"],
          ["1.25", "大食量"],
        ],
        String(parity.appetite || 1),
      ) +
      select(
        "seasoning",
        "调味",
        ["清淡", "标准", "浓郁"],
        parity.seasoning || "标准",
      ) +
      select(
        "spice",
        "辣度",
        ["不辣", "微辣", "原方", "重辣"],
        parity.spice || "原方",
      ) +
      input(
        "oilGrams",
        "实际用油克数（留空沿用菜谱）",
        parity.oil ?? "",
        "number",
        'min="0" max="1000"',
      ),
    "更新参考",
  )}<p>每人约 ${Math.round(n.perServingKcal)} kcal · 蛋白质 ${Number(n.perServingProtein).toFixed(1)}g</p><p class="hint">${esc(n.reference)}${n.missing.length ? "；未覆盖：" + n.missing.map(esc).join("、") : ""}</p></details>`;
}
recipeView = function () {
  const r = findRecipe(selected);
  if (!r) return oldRecipe();
  return (
    oldRecipe() +
    recipeNutritionView(r) +
    `<div class="row">${btn("成品与打卡 ›", "gallery", r.id)}${btn("食材小课堂", "knowledge", r.ingredients[0]?.name || "")}${btn("比一比", "compareAdd", r.id)}</div>`
  );
};
function recentView() {
  return (
    heading("最近浏览") +
    ((utility.recent || [])
      .map(findRecipe)
      .filter(Boolean)
      .map(recipeRow)
      .join("") || empty("看过的菜，会收在这里"))
  );
}
function compareView() {
  const recipes = parity.compareIds.map(findRecipe).filter(Boolean);
  return (
    heading("菜谱对比") +
    (recipes.length
      ? recipes
          .map(
            (r) =>
              `<article class="card">${recipeRow(r)}<p>用料：${r.ingredients.map((i) => esc(i.name)).join("、")}</p>${btn("移出对比", "compareRemove", r.id)}</article>`,
          )
          .join("")
      : empty("在菜谱卡片点“比一比”，最多放入4道"))
  );
}
function knowledgeView() {
  const rows = G.knowledgeFor(parity.ingredient);
  return (
    heading(parity.ingredient + " · 食材课堂") +
    (rows.length
      ? rows
          .map(
            (k) =>
              `<article class="card"><h2>${esc(k.title)}</h2>${[
                ["怎么挑", k.selection],
                ["口感", k.texture],
                ["怎么用", k.use],
                ["可替代", k.substitution],
                ["注意", k.caution],
              ]
                .filter((x) => x[1])
                .map(
                  ([label, value]) => `<h3>${label}</h3><p>${esc(value)}</p>`,
                )
                .join("")}</article>`,
          )
          .join("")
      : empty("这份食材还没有补充知识")) +
    btn("看看相关菜谱", "ingredient", parity.ingredient)
  );
}
function ingredientView() {
  const rows = allRecipes().filter((r) =>
    require("IngredientDiscoveryCore").recipeHasIngredient(
      r,
      parity.ingredient,
    ),
  );
  return (
    heading(parity.ingredient + "，可以这样吃") +
    rows
      .slice(0, recipePage * 24)
      .map(recipeRow)
      .join("") +
    btn("再看24道", "moreRecipes")
  );
}
function searchView() {
  return (
    heading("今天想吃什么") +
    form(
      "search",
      input("search", "搜菜名、食材、拼音", filter.search),
      "查找",
    ) +
    `<div class="row between"><h2>最近搜索</h2>${btn("清空", "clearSearches")}</div><div class="row">${(utility.searches || []).map((term) => `<span class="search-history-item">${btn(term, "searchTerm", term)}<button data-action="removeSearch" data-value="${esc(term)}" aria-label="删除搜索记录：${esc(term)}">×</button></span>`).join("")}</div><div class="row between"><h2>${parity.discovery.demoData ? "热搜榜 · 含演示数据" : "菜谱热搜榜"}</h2>${btn("刷新", "discovery")}</div>` +
    (parity.discoveryError
      ? `<p class="hint">${esc(parity.discoveryError)}</p>`
      : "") +
    (parity.discovery.hotSearches || [])
      .map(
        (hot, i) =>
          `<button class="hot-search" data-action="searchTerm" data-value="${esc(hot.term)}"><span>${String(i + 1).padStart(2, "0")}</span><strong>${esc(hot.term)}</strong><small>${hot.count}人搜过</small></button>`,
      )
      .join("") +
    checkField(
      "shareSearchHeat",
      "贡献公开词条搜索热度",
      settings.shareSearchHeat === true,
    ) +
    `<h2>按食材找菜</h2><div class="row">${require("IngredientDiscoveryCore")
      .INGREDIENT_GROUPS.map((g) => btn(g.label, "ingredient", g.id))
      .join("")}</div>` +
    btn("看看收藏榜", "favoriteRanking")
  );
}
function dislikesView() {
  return (
    heading("不喜欢的菜") +
    allRecipes()
      .slice(0, recipePage * 24)
      .map(
        (r) =>
          `<div class="card row between"><span>${esc(r.name)}</span>${btn((settings.drawDisliked || []).includes(r.id) ? "已避开 · 恢复" : "抽菜时避开", "dislike", r.id)}</div>`,
      )
      .join("") +
    btn("再看24道", "moreRecipes")
  );
}
function remotePhoto(url) {
  return (
    "remote/" +
    btoa(unescape(encodeURIComponent(url)))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "")
  );
}
async function galleryLoad(more = false) {
  const id = parity.galleryRecipe,
    owner = cloud.session.userId;
  if (!owner) {
    parity.gallery = [];
    parity.galleryError = "登录后可查看社区成品，本机打卡仍可查看";
    render();
    return;
  }
  try {
    const result = await api(
      "/community/recipes/" +
        encodeURIComponent(id) +
        "/works/page" +
        (more && parity.galleryCursor
          ? "?cursor=" + encodeURIComponent(parity.galleryCursor)
          : ""),
    );
    if (id !== parity.galleryRecipe || owner !== cloud.session.userId) return;
    parity.gallery = (more ? parity.gallery : [])
      .concat(result.items)
      .filter((p, i, a) => a.findIndex((v) => v.id === p.id) === i)
      .slice(-60);
    parity.galleryCursor = result.nextCursor || "";
    parity.galleryMore = result.hasMore;
    parity.galleryError = "";
    for (let i = 0; i < result.items.length; i += 4) {
      await Promise.all(
        result.items.slice(i, i + 4).map(async (p) => {
          if (!p.payload.photoId) return;
          try {
            const image = await api(
              "/photos/" + p.payload.photoId + "/download",
            );
            if (id !== parity.galleryRecipe || owner !== cloud.session.userId)
              return;
            const current = parity.gallery.find((x) => x.id === p.id);
            if (current) current.photoUrl = remotePhoto(image.url);
          } catch {}
        }),
      );
    }
  } catch (e) {
    parity.galleryError = e.message;
  }
  if (page === "gallery") render();
}
function galleryView() {
  const id = parity.galleryRecipe,
    r = findRecipe(id);
  const own = store.state.meals.filter(
    (m) => m.recipeId === id || (m.items || []).some((i) => i.recipeId === id),
  );
  const ownVisible = own.slice(parity.ownPage * 12, (parity.ownPage + 1) * 12);
  return (
    heading((r?.name || "菜谱") + " · 成品与打卡") +
    `<div class="row">${btn("＋ 记我的成品", "mealRecipe", id)}${btn("刷新", "galleryRefresh")}</div><h2>我的成品 · ${own.length}</h2>` +
    (ownVisible
      .map(
        (m) =>
          `<article class="card">${m.localPhoto ? `<img class="cover" src="${esc(m.localPhoto)}" alt="我的成品">` : r ? `<img class="cover" src="${cover(r)}" alt="菜谱参考插画">` : ""}<h3>${esc(m.name)}</h3><p class="hint">${esc(m.date.slice(0, 10))}</p>${btn("查看记录", "mealEdit", m.id)}</article>`,
      )
      .join("") || empty("做完拍一张，留住自己的味道")) +
    `<div class="row">${parity.ownPage ? btn("上一页", "ownWorksPage", -1) : ""}${(parity.ownPage + 1) * 12 < own.length ? btn("下一页", "ownWorksPage", 1) : ""}</div><h2>大家的成品</h2>${parity.galleryError ? `<p class="hint">${esc(parity.galleryError)}</p>` : ""}` +
    (parity.gallery
      .map(
        (p) =>
          `<article class="card">${p.photoUrl ? `<img class="cover" src="${esc(p.photoUrl)}" alt="成品照片">` : ""}<h3>${esc(p.payload.name)}</h3><p>${esc(p.author_name)}</p>${btn("看看", "post", p.id)}</article>`,
      )
      .join("") || empty("还没有公开成品")) +
    (parity.galleryMore ? btn("更多成品", "galleryMore") : "")
  );
}
function recoveryView() {
 return heading(page==='recovery'?'账号帮助':'账号安全')+(page==='recovery'?'<p>账号无需邮箱验证。请妥善保管账号密码，已登录时可在账号页面修改密码。</p>':`<h2>注销账号</h2><p>注销会删除示例主体云端数据；本机记录保留。存在家庭共享关系时需先处理。</p>${form("deleteAccount",input("password","当前密码","","password","required")+input("confirmation","输入：注销我的账号","","text","required"),"注销云端账号")}`)+(parity.authError?`<p role="status">${esc(parity.authError)}</p>`:'');
}

accountView = function () {
  let html = oldAccount();
  if (!cloud.session.accessToken) {
    html = html.replace("<details open>", "<details>");
    return html;
  }
  return (
    html +
    `<div class="row">${btn("我的家庭", "go", "families")}${btn("设备管理", "go", "devices")}${btn("账号安全", "securityLoad")}</div>` +
    form(
      "syncSettings",
      checkField("autoSync", "应用使用期间自动同步", parity.autoSync) +
        checkField("wifiOnly", "自动同步仅用 Wi-Fi", parity.wifiOnly),
    )
  );
};
profileView = function () {
  if (!cloud.session.accessToken)
    profileData = Object.assign(
      new (require("AccountModels").UserProfile)(),
      parity.profileLocal,
    );
  const p = profileData || parity.profileLocal || {};
  return (
    `<section class="profile-editor-heading"><button class="profile-avatar-edit" data-action="avatar" aria-label="更换头像">${profileAvatarView(p)}<small>更换</small></button><div><h1>${esc(p.displayName || "我的资料")}</h1><p>${esc(require("AccountModels").PROFILE_REGIONS.find(r=>r.code===p.regionCode)?.name || "尚未设置地区")}</p></div></section><div class="avatar-choices">${["tomato", "rice", "mushroom", "cat"].map((key) => `<button type="button" class="${p.avatarPreset === key && !p.avatarId ? "active" : ""}" data-action="profilePreset" data-value="${key}" aria-label="选择${({tomato:'番茄',rice:'米饭',mushroom:'蘑菇',cat:'小猫'})[key]}伙伴头像" aria-pressed="${p.avatarPreset===key}">${art("avatar_editorial_" + key + ".png")}</button>`).join("")}</div>` +
    oldProfile().replace(btn("更换头像", "avatar"), "").replace("btn-placeholder", "").replace(heading("我的资料", "默认私有；修改时核对服务端版本"), "") +
    (cloud.session.accessToken
      ? ""
      : `<div class="auth-mode-footer">${btn("登录 / 注册", "account")}</div>`)
  );
};
collectionsView = function () {
  return (
    heading("收藏", "喜欢的做法与自建菜单") +
    `<section class="liked-recipes"><div class="row between"><h2>喜欢的菜</h2><small>${store.state.favorites.length}份</small></div>${store.state.favorites.map(f=>findRecipe(f.recipeId)).filter(Boolean).map(recipeRow).join("") || '<p class="hint">在菜谱旁点一下爱心，喜欢的做法就会收在这里。</p>'}</section><div class="row between"><h2>自建菜单</h2>${btn("＋ 建个菜单", "newCollection")}</div>` +
    experience.collections
      .map(
        (c, i) =>
          `<article class="card"><div class="row between"><h2>${esc(c.name)}</h2><span>${c.ids.length}道</span></div><div class="row">${btn("看看", "collectionExpand", i)}${btn("重命名", "collectionRename", i)}${btn("批量计划", "planCollection", i)}${btn("删除", "deleteCollection", i)}</div>${
            parity.openCollection === i
              ? c.ids
                  .map((id) => findRecipe(id))
                  .filter(Boolean)
                  .map(
                    (r) =>
                      recipeRow(r) +
                      btn("移出收藏夹", "collectionRemove", i + "|" + r.id),
                  )
                  .join("")
              : ""
          }</article>`,
      )
      .join("")
  );
};
procurementView = function () {
  const html = oldProcurement();
  return (
    html.replace(
      "<h1>",
      `${art("scene_week_to_table.png", "empty-banner")}<h1>`,
    ) +
    checkField(
      "procurementSeasoning",
      "包括调味品",
      parity.procurementSeasoning,
    )
  );
};
function drawState() {
  const preset =
    U.DRAW_PRESETS.find((p) => p.id === settings.drawPreset) ||
    U.DRAW_PRESETS.find(p=>p.dishes===1&&p.soups===0);
  return (
    parity.drawOptions ||
    (parity.drawOptions = Object.assign(new U.DrawOptions(), {
      people,
      dishes: 1,
      soups: 0,
      minutes: 0,
      budget: 0,
      mode: intent === "cook" ? "做饭" : "外食",
    }))
  );
}
drawView = function () {
  const o = drawState();
  const field=(name,label,...args)=>input(name,label,...args).replace('<label>','<label><span class="field-label">'+art('ui_'+({people:'people',minutes:'time',budget:'budget'}[name])+'.png','small-icon')).replace('<input','</span><input');
  return (
    `<div class="row between draw-page-heading"><div class="row draw-page-title">${art("ui_shuffle.png", "shuffle-art")}<h1>今天吃什么</h1></div></div><section class="draw-hero ${parity.drawConditionsOpen?"is-compact":""}"><span class="draw-hero-orbit" aria-hidden="true">✦</span><button type="button" class="draw-hero-ai" data-action="companionOpen" aria-label="和小怪聊聊">${art('brand_monster.png','draw-hero-mascot')}</button><h2>把选择交给小怪</h2><p>${U.menuTitle?U.menuTitle(o.dishes,o.soups):(o.dishes+'菜'+(o.soups?'一汤':''))}</p></section>` +
    form(
      "drawFull",
      `<details class="draw-options" ${parity.drawConditionsOpen?"open":""}><summary>按我的条件抽 <span>人数 · 时间 · 预算</span></summary><div class="row">${btn("在家做", "drawMode", "做饭", o.mode === "做饭" ? "active" : "")}${btn("出去吃 / 外卖", "drawMode", "外食", o.mode === "外食" ? "active" : "")}</div><div class="grid draw-presets">${U.DRAW_PRESETS.map(p=>btn(p.label,"drawPreset",p.id,o.dishes===p.dishes&&o.soups===p.soups?"active":"")).join("")}</div>${btn('菜谱筛选 ›','go','filters')}<details><summary>自己搭配菜数与汤 ↓</summary>${input("dishes", "菜的数量", o.dishes, "number", 'min="0" max="4"')}${checkField("soup", "加一份汤", o.soups === 1)}</details><div class="draw-people">${field("people", "用餐人数", o.people, "number", 'min="1" max="20" required')}</div><!-- draw-cook-options --><div class="draw-fields">${field("minutes", "空余时间（分钟）", o.minutes, "number", 'min="0" max="1440" required aria-description="0表示不限时间"')}${field("budget", "整餐预算（元）", o.budget, "number", 'min="0" required aria-description="0表示不限预算"')}</div>` +
        (o.mode === "外食"
          ? input(
              "outsideOverhead",
              "往返、候餐和吃饭合计（分钟）",
              o.outsideOverhead,
              "number",
              'min="0"',
            ) +
            input(
              "outsidePerPerson",
              "预计人均费用（元）",
              o.outsidePerPerson,
              "number",
              'min="0.01" step="0.01"',
            )
          : "") +
        btn("不喜欢的菜 ›", "go", "dislikes")+"</details>",
      o.dishes + o.soups === 1 ? "帮我抽一道" : "帮我抽一餐",
    ) +
    (drawResult?.ids?.length ? btn("查看上次抽取", "go", "drawResult") : "")
  );
};
function drawResultView() {
  if (!drawResult?.ids?.length) return empty("先选条件，抽一餐");
  const o = drawState();
  const recipes = drawResult.ids.map(findRecipe).filter(Boolean);
  const amounts = U.mergeMenuIngredients(
    recipes,
    o.people,
    store.state.foods,
    M.dateString(new Date()),
  );
  return (
    heading(
      U.menuTitle(o.dishes, o.soups),
      `${o.people}人 · 保守参考 ${drawResult.minutes}分钟 · 约${money(drawResult.cost)}`,
    ) +
    `<div class="row">${["菜品", "备料"].map((x) => btn(x, "drawTab", x, parity.drawTab === x ? "active" : "")).join("")}</div>` +
    (parity.drawTab === "备料"
      ? amounts
          .map(
            (a) =>
              `<article class="card"><h3>${esc(a.name)}${a.optional ? " · 调味" : ""}</h3><p>${a.quantity > 0 ? a.quantity + esc(a.unit) : "用量待核"} · 缺 ${a.missing > 0 ? a.missing + esc(a.unit) : "已备齐 / 待核"}</p></article>`,
          )
          .join("")
      : recipes
          .map(
            (r) =>
              recipeRow(r) +
              `<div class="row">${btn(parity.locked.includes(r.id) ? "已锁定" : "锁定", "drawLock", r.id)}${btn("换这道", "drawReplace", r.id)}</div>`,
          )
          .join("")) +
    `<div class="filter-actions">${btn("合并采购", "drawProcurement")}${btn("多菜安排", "timeline")}${btn("加入计划", "drawPlan")}${btn("再抽一餐", "drawAgain")}</div>`
  );
}
communityView = function () {
  let html = oldCommunity().replace(
    heading("生活广场", "真实分享与演示标记分开显示"),
    `<div class="row between community-page-heading"><div class="content-title">${searchIcon("community")}<h1>餐桌广场</h1></div>${btn("分享这一餐", "go", "publish")}</div><!--community-heading-end-->${art("community_banner.webp", "community-cover")}`,
  );
  if (!postList.length)
    html = html.replace(
      /<div class="empty">[\s\S]*?<\/div>/,
      `${art(cloud.session.accessToken ? "community_empty.png" : "community_welcome.png", "empty-banner")}${empty(cloud.session.accessToken ? "还没有分享，先留住自己的好味道" : "登录后看看大家的餐桌")}${!cloud.session.accessToken ? btn("登录后继续", "communityLogin") : ""}`,
    );
  for (const post of postList) {
    if (post.photoUrl)
      html = html.replace(
        `<h3>${esc(post.payload.name)}</h3>`,
        `<img class="cover" src="${esc(post.photoUrl)}" alt="分享照片"><h3>${esc(post.payload.name)}</h3>`,
      );
  }
  return html;
};
const oldCommunityLoad = communityLoad;
communityLoad = async function (more = false) {
  const owner = cloud.session.userId;
  await oldCommunityLoad(more);
  const rows = postList.filter((p) => p.payload.photoId && !p.photoUrl);
  for (let i = 0; i < rows.length; i += 4) {
    await Promise.all(
      rows.slice(i, i + 4).map(async (p) => {
        try {
          const image = await api("/photos/" + p.payload.photoId + "/download");
          if (
            owner === cloud.session.userId &&
            postList.some((x) => x.id === p.id)
          )
            p.photoUrl = remotePhoto(image.url);
        } catch {}
      }),
    );
  }
  if (page === "community") render();
};
async function refreshDiscovery() {
  if (!cloud.session.accessToken) {
    parity.discoveryError = "登录后可查看社区热搜与收藏榜";
    render();
    return;
  }
  const owner = cloud.session.userId;
  try {
    const summary = await api("/discovery/summary");
    if (owner === cloud.session.userId) {
      parity.discovery = summary;
      parity.discoveryError = "";
    }
  } catch (e) {
    parity.discoveryError = e.message;
  }
  render();
}
window.parityViews = {
  settingsDetail: settingsDetailView,
  recent: recentView,
  compare: compareView,
  knowledge: knowledgeView,
  ingredient: ingredientView,
  search: searchView,
  dislikes: dislikesView,
  dish: dishView,
  mealRecipePicker: mealRecipePickerView,
  gallery: galleryView,
  recovery: recoveryView,
  security: recoveryView,
  drawResult: drawResultView,
};
actions = async function (action, value) {
  captureFilterInputs();
  switch (action) {
    case "mealRating": {
      const input=document.querySelector('[name="rating"]');if(!input)return;
      input.value=String(Number(input.value)===Number(value)?0:Number(value));
      for(const button of document.querySelectorAll('[data-action="mealRating"]')){
        const n=Number(button.dataset.value);button.textContent=Number(input.value)>=n?"★":"☆";button.setAttribute("aria-pressed",String(Number(input.value)===n));
      }
      input.dispatchEvent(new Event('input',{bubbles:true}));return;
    }
    case "monthToggle":
      parity.monthOpen = !parity.monthOpen;
      parity.month = date.slice(0, 7);
      render();
      return;
    case "monthMove": {
      const m = new Date((parity.month || date.slice(0, 7)) + "-01T12:00:00");
      m.setMonth(m.getMonth() + Number(value));
      parity.month = M.dateString(m).slice(0, 7);
      render();
      return;
    }
    case "homeDay":
      parity.month = value.slice(0, 7);
      date = value;
      render();
      return;
    case "mode":
      await setting("quickstartDone", "true");
      break;
    case "dailyChange":
      parity.dailyOffset++;
      await setting("dailyOffset", parity.dailyOffset);
      render();
      return;
    case "recipeMore":
      parity.recipeMore = !parity.recipeMore;
      render();
      return;
    case "libraryMode":
      parity.library = value === "true";
      recipePage = 1;
      render();
      return;
    case "recipeSort":
      await setting("recipeOrder", value);
      if (value === "favorites") await refreshDiscovery();
      else render();
      return;
    case "recipePageMove":
      recipePage = Math.max(1, Math.min(Math.max(1, Math.ceil(filteredRecipes().length / 24)), recipePage + Number(value)));
      render(); window.scrollTo(0, 0); return;
    case "filterSection":
      parity.filterSection = value;
      render();
      return;
    case "draftFilter":
    case "filterChip": {
      const [field, v] = value.split("|");
      const d = parity.filterDraft;
      const numeric = ["maxMinutes", "maxCost", "costPeople"].includes(field);
      if (Array.isArray(d[field]))
        d[field] = d[field].includes(v)
          ? d[field].filter((x) => x !== v)
          : d[field].concat(v);
      else d[field] = numeric ? Number(v) : v;
      render();
      return;
    }
    case "draftOrder":
      parity.filterOrder = value;
      render();
      return;
    case "draftFavorites":
      parity.filterFavorites = !parity.filterFavorites;
      render();
      return;
    case "draftReset":
      parity.filterDraft = new F.RecipeFilterOptions();
      parity.filterOrder = "rank";
      parity.filterFavorites = false;
      render();
      return;
    case "filterApply":
      recipePage = 1;
      if (parity.filterReturn === "draw") {
        parity.drawFilter = F.normalizeRecipeFilter(parity.filterDraft);
        go("draw");
      } else {
        filter = F.normalizeRecipeFilter(parity.filterDraft);
        filterOnlyFav = parity.filterFavorites;
        await setting("recipeOrder", parity.filterOrder);
        go("recipes");
      }
      return;
    case "saveFilter": {
      const name = prompt("给这组条件起个名");
      if (!name) return;
      const f = Object.assign(new E.SavedRecipeFilter(), {
        name: name.slice(0, 24),
        options: clone(page === "filters" ? parity.filterDraft : filter),
        favorites: page === "filters" ? parity.filterFavorites : filterOnlyFav,
        order: page === "filters" ? parity.filterOrder : settings.recipeOrder,
      });
      experience.filters = [
        f,
        ...experience.filters.filter((x) => x.name !== f.name),
      ].slice(0, 12);
      await saveExperience();
      render();
      return;
    }
    case "loadFilter": {
      const f = experience.filters[Number(value)];
      filter = F.normalizeRecipeFilter(f.options);
      filterOnlyFav = f.favorites;
      await setting("recipeOrder", f.order || "rank");
      go("recipes");
      return;
    }
    case "resetFilter":
      parity.filterDraft = new F.RecipeFilterOptions();
      break;
    case "settingsGroup":
      parity.settingsGroup = value;
      go("settingsDetail");
      return;
    case "clearPantryFilters":
      searchText="";parity.pantryCategory="全部";parity.pantryLocation="全部";render();return;
    case "pantryCategory":
      parity.pantryCategory = value;
      render();
      return;
    case "pantryLocation":
      parity.pantryLocation = value;
      render();
      return;
    case "batchToggle":
      parity.batch = !parity.batch;
      parity.selectedFoods = [];
      render();
      return;
    case "batchCommit": {
      if (!parity.selectedFoods.length) throw Error("请先选择食材");
      if (
        !confirm(
          "确认批量调整选中的 " + parity.selectedFoods.length + " 项食材？",
        )
      )
        return;
      await store.batchFood(
        parity.selectedFoods,
        value,
        value === "location"
          ? val("batchLocation")
          : value === "expiry"
            ? val("batchExpiry")
            : "",
      );
      parity.selectedFoods = [];
      render();
      return;
    }
    case "diaryMode":
      parity.diaryMode = value;
      render();
      return;
    case "diaryDining":
      parity.diaryDining = value;
      render();
      return;
    case "dishEdit":
      rememberMealForm();
      mealDraft.items = clone(parity.dishes);
      parity.itemIndex = Number(value);
      go("dish");
      return;
    case "dishRemove":
      rememberMealForm();
      parity.dishes.splice(Number(value), 1);
      mealDraft.items = clone(parity.dishes);
      render();
      return;
    case "dishRecipe": {
      const r = findRecipe(value);
      const cost = U.estimateRecipeCost(r, people);
      parity.dishes.push(
        new M.MealItem(r.name, cost.usable ? cost.total : 0, r.id, r.category),
      );
      mealDraft.items = clone(parity.dishes);
      mealDraft.name = parity.dishes.map((i) => i.name).join("、");
      go("meal", true);
      return;
    }
    case "compareAdd":
      if (!parity.compareIds.includes(value)) {
        if (parity.compareIds.length >= 4) throw Error("最多对比4道菜");
        parity.compareIds.push(value);
      }
      go("compare");
      return;
    case "compareRemove":
      parity.compareIds = parity.compareIds.filter((x) => x !== value);
      render();
      return;
    case "ingredient":
      parity.ingredient = value;
      recipePage = 1;
      go("ingredient");
      return;
    case "knowledge":
      parity.ingredient = value;
      go("knowledge");
      return;
    case "searchTerm":
      filter.search = value;
      utility.searches = T.rememberValue
        ? T.rememberValue(utility.searches || [], value, 12)
        : [value, ...(utility.searches || []).filter((x) => x !== value)].slice(
            0,
            12,
          );
      await saveUtility();
      go("recipes");
      return;
    case "removeSearch":
      utility.searches = (utility.searches || []).filter((x) => x !== value);
      await saveUtility();
      render();
      return;
    case "clearSearches":
      utility.searches = [];
      await saveUtility();
      render();
      return;
    case "discovery":
      await refreshDiscovery();
      return;
    case "favoriteRanking":
      await setting("recipeOrder", "favorites");
      await refreshDiscovery();
      go("recipes");
      return;
    case "dislike": {
      const ids = settings.drawDisliked || [];
      await setting(
        "drawDisliked",
        ids.includes(value)
          ? ids.filter((x) => x !== value)
          : ids.concat(value),
      );
      if (drawResult?.ids?.includes(value)) {
        drawResult = null;
        await setting("androidDraw", null);
      }
      render();
      return;
    }
    case "gallery":
      parity.galleryRecipe = value;
      parity.ownPage = 0;
      parity.gallery = [];
      go("gallery");
      await galleryLoad();
      return;
    case "galleryRefresh":
      await galleryLoad();
      return;
    case "galleryMore":
      await galleryLoad(true);
      return;
    case "ownWorksPage":
      parity.ownPage = Math.max(0, parity.ownPage + Number(value));
      render();
      return;
    case "securityLoad":
      go("security");
      parity.security = await api("/auth/account");
      render();
      return;
    case "profilePreset": {
      captureProfileDraft();
      const p = profileData || parity.profileLocal || {};
      p.avatarPreset = value;
      p.avatarId = "";
      parity.avatarMode = "preset";
      parity.profileAvatar = "";
      if (cloud.session.accessToken) profileData = p;
      else parity.profileLocal = p;
      render();
      return;
    }
    case "avatar": {
      if(!cloud.session.accessToken)throw Error("请先登录后上传头像");
      captureProfileDraft();
      const epoch=parity.epoch,owner=cloud.session.userId,draft=clone(profileData || {});
      const photo=await P.nativeAsync("photo");
      if(epoch!==parity.epoch||owner!==cloud.session.userId)return;
      const saved=await cloud.uploadAvatar(photo.compressed);
      if(epoch!==parity.epoch||owner!==cloud.session.userId)return;
      await loadAndroidProfile({...draft,avatarId:saved.avatarId,version:saved.version}, /^photos\/[a-zA-Z0-9._-]+$/.test(photo.compressed)?"/"+photo.compressed:"");
      toast("头像已更新");return;
    }
    case "loadProfile":
      if (!cloud.session.accessToken) {
        profileData = Object.assign(
          new (require("AccountModels").UserProfile)(),
          parity.profileLocal,
        );
        render();
        return;
      }
      await loadAndroidProfile();
      return;
    case "collectionExpand":
      parity.openCollection =
        parity.openCollection === Number(value) ? null : Number(value);
      render();
      return;
    case "collectionRename": {
      const c = experience.collections[Number(value)],
        name = prompt("收藏夹新名字", c.name);
      if (name?.trim()) {
        c.name = name.trim().slice(0, 24);
        await saveExperience();
        render();
      }
      return;
    }
    case "collectionRemove": {
      const [index, id] = value.split("|");
      experience.collections[Number(index)].ids = experience.collections[
        Number(index)
      ].ids.filter((x) => x !== id);
      await saveExperience();
      render();
      return;
    }
    case "drawMode":
      drawState().mode = value;
      render();
      return;
    case "drawPreset": {
      const p = U.DRAW_PRESETS.find((x) => x.id === value);
      Object.assign(drawState(), { dishes: p.dishes, soups: p.soups });
      await setting("drawPreset", p.id);
      render();
      return;
    }
    case "drawTab":
      parity.drawTab = value;
      render();
      return;
    case "drawLock":
      parity.locked = parity.locked.includes(value)
        ? parity.locked.filter((x) => x !== value)
        : parity.locked.concat(value);
      render();
      return;
    case "drawReplace": {
      if (parity.locked.includes(value)) throw Error("请先解除这道菜的锁定");
      const o = clone(drawState());
      o.lockedIds = drawResult.ids.filter((id) => id !== value);
      o.disliked = [...(settings.drawDisliked || []), value];
      o.excluded = (settings.excluded || "").split(/[,，、]/).filter(Boolean);
      o.attempt = ++drawAttempt;
      const r = U.drawMenu(
        parity.drawFilter ? F.filterRecipes(allRecipes(), parity.drawFilter, store.state.foods, M.dateString(new Date())) : allRecipes(),
        o,
        store.state.foods,
        M.dateString(new Date()),
      );
      if (!r.ids.length) throw Error(r.message);
      drawResult = r;
      await setting("androidDraw", drawResult);
      render();
      return;
    }
    case "drawAgain":
      await rollFullMenu(drawState());
      return;
    case "communityLogin":
      parity.authReturn = "community";
      go("account");
      return;
  }
  await oldActions(action, value);
  if (action === "recipe") {
    utility.recent = [
      value,
      ...(utility.recent || []).filter((x) => x !== value),
    ].slice(0, 12);
    await saveUtility();
  }
  if (false && action === "favorite" && cloud.session.accessToken) {
    try {
      await api("/discovery/favorites/" + encodeURIComponent(value), "PUT", {
        saved: store.state.favorites.some((f) => f.recipeId === value),
      });
    } catch {
      toast("本机收藏已保存，社区计数暂未更新");
    }
  }
  if (["foodNew", "foodTemplate"].includes(action) && foodDraft) {
    const defaults = parity.categoryDefaults[foodDraft.category];
    if (defaults) {
      foodDraft.unit = defaults.unit || foodDraft.unit;
      foodDraft.expiryDate = D.shiftDay(
        M.dateString(new Date()),
        defaults.days ?? 7,
      );
      foodDraft.muted = !!defaults.muted;
      render();
    }
  }
};
async function rollFullMenu(options) {
  const o = Object.assign(new U.DrawOptions(), clone(options));
  o.seed = date + "|" + store.deviceId;
  o.attempt = drawAttempt++;
  o.excluded = (settings.excluded || "").split(/[,，、]/).filter(Boolean);
  o.disliked = settings.drawDisliked || [];
  o.lockedIds = parity.locked;
  const candidates = parity.drawFilter
    ? F.filterRecipes(
        allRecipes(),
        parity.drawFilter,
        store.state.foods,
        M.dateString(new Date()),
      )
    : allRecipes();
  const result = U.drawMenu(
    candidates,
    o,
    store.state.foods,
    M.dateString(new Date()),
  );
  if (!result.ids.length) throw Error(result.message);
  if(!await showDrawCeremony(result.ids))return;
  parity.drawOptions = o;
  drawResult = result;
  people = o.people;
  parity.drawTab = "菜品";
  await setting("androidDraw", result);
  await setting("androidDrawOptions", o);
  await setting("drawSimpleV2", true);
  go("drawResult");
}
function applyAppearance() {
  document.body.classList.remove("dark", "sky", "berry");


  document.body.classList.remove("reduced-motion");
}
submit = async function (action) {
  captureFilterInputs();
  switch (action) {
    case "filters":
      await actions("filterApply", "");
      return;
    case "search": {
      const term = val("search").normalize("NFKC").trim().replace(/\s+/g," ").slice(0, 80);
      filter.search = term;
      recipePage = 1;
      if (term) {
        utility.searches = [
          term,
          ...(utility.searches || []).filter((x) => x.normalize("NFKC").toLowerCase() !== term.toLowerCase()),
        ].slice(0, 30);
        await saveUtility();
        if (false && settings.shareSearchHeat && cloud.session.accessToken) {
          try {
            await api("/discovery/searches", "POST", { term });
          } catch {}
        }
      }
      go("recipes");
      return;
    }
    case "tastePreferences":
      await setting("excluded", val("excluded"));
      for (const domain of ["cook", "record"])
        await setting(domain + "Preference", {
          homeRegion: val(domain + "Region"),
          goal: val(domain + "Goal"),
          learning: checked(domain + "Learning"),
        });
      toast("偏好已保存");
      return;
    case "syncSettings":
      parity.autoSync = checked("autoSync");
      parity.wifiOnly = checked("wifiOnly");
      await setting("autoSync", parity.autoSync);
      await setting("wifiOnly", parity.wifiOnly);
      toast("同步设置已保存");
      return;
    case "categoryDefaults": {
      const days = num("shelfDays"),
        warningDays = num("warningDays");
      if (
        !Number.isInteger(days) ||
        days < 0 ||
        days > 3650 ||
        !Number.isInteger(warningDays) ||
        warningDays < 0 ||
        warningDays > 3650
      )
        throw Error("请检查保质期和提醒天数");
      parity.categoryDefaults[val("category")] = {
        days,
        warningDays,
        unit: val("defaultUnit"),
        muted: checked("categoryMuted"),
      };
      await setting("categoryDefaults", parity.categoryDefaults);
      toast("分类默认值已保存");
      return;
    }
    case "reminderSettings": {
      const enabled = checked("notifications"),
        threshold = num("threshold"),
        hour = Number(val("reminderHour").split(":")[0]);
      if (
        !Number.isInteger(threshold) ||
        threshold < 0 ||
        threshold > 365 ||
        !Number.isInteger(hour) ||
        hour < 0 ||
        hour > 23
      )
        throw Error("请检查提醒日期和时间");
      if (enabled) await P.nativeAsync("permission");
      await setting("notifications", enabled);
      await setting("threshold", threshold);
      await setting("reminderHour", hour);
      for (const food of store.state.foods.filter((f) => !f.archived)) {
        const id = "expiry-" + food.id;
        if (!enabled || food.muted) {
          P.invoke("cancelTimer", { id });
          continue;
        }
        const config = parity.categoryDefaults[food.category] || {};
        if (config.muted) continue;
        const day = D.shiftDay(
          food.expiryDate,
          -(config.warningDays ?? threshold),
        );
        const deadline = new Date(
          day + "T" + String(hour).padStart(2, "0") + ":00:00",
        ).getTime();
        if (deadline > Date.now())
          P.invoke("timer", { id, label: food.name + "快到期了", deadline });
      }
      toast("提醒设置已保存");
      return;
    }
    case "dish": {
      const name = val("dishName").trim(),
        cost = num("dishCost");
      if (!name || !Number.isFinite(cost) || cost < 0)
        throw Error("请检查菜名与费用");
      const previous = parity.dishes[parity.itemIndex];
      const dish = new M.MealItem(
        name,
        cost,
        previous?.name === name ? previous.recipeId : "",
        val("dishCategory"),
      );
      if (parity.itemIndex < 0) parity.dishes.push(dish);
      else parity.dishes[parity.itemIndex] = dish;
      mealDraft.items = clone(parity.dishes);
      mealDraft.name = parity.dishes.map((d) => d.name).join("、");
      mealDraft.estimatedCost =
        parity.dishes.reduce(
          (sum, d) => sum + Math.round(d.estimatedCost * 100),
          0,
        ) / 100;
      go("meal", true);
      return;
    }
    case "meal": {
      rememberMealForm();
      const m = Object.assign(new M.Meal(), mealDraft);
      m.items = clone(parity.dishes);
      if (m.items.length) {
        m.name = m.items.map((d) => d.name).join("、");
        m.recipeId = m.items.length === 1 ? m.items[0].recipeId : "";
      }
      if (photoDraft) {
        m.localPhoto = photoDraft.compressed;
        m.photoOriginal = photoDraft.original;
        m.photoId = "";
        m.cloudPhoto = "";
        m.photoStatus = "pending";
      }
      await store.saveMeal(m);
      clearTimeout(draftSaveHandle);
      draftDirty = false;
      await setting("androidDraft", null);
      photoDraft = null;
      parity.dishes = [];
      date = M.dateString(new Date(m.date));
      toast("这一餐记下啦");
      go("meals");
      return;
    }
    case "portion":
      people = Number(val("portionPeople"));
      parity.appetite = num("appetite");
      parity.seasoning = val("seasoning");
      parity.spice = val("spice");
      parity.oil =
        val("oilGrams") === ""
          ? undefined
          : Math.min(1000, Math.max(0, num("oilGrams")));
      render();
      return;
    case "drawFull": {
      const o = drawState();
      Object.assign(o, {
        people: num("people"),
        dishes: num("dishes"),
        soups: checked("soup") ? 1 : 0,
        minutes: num("minutes"),
        budget: num("budget"),
      });
      if (o.mode === "外食") {
        o.outsideOverhead = num("outsideOverhead");
        o.outsidePerPerson = num("outsidePerPerson");
      }
      await rollFullMenu(o);
      return;
    }
    case "requestReset":
    case "requestEmail": {
      const email = val("email").trim();
      await setting("boundEmail", email);
      const result = await api(
        action === "requestReset"
          ? "/auth/password/request-reset"
          : "/auth/email/request",
        "POST",
        { email },
      );
      parity.authError = result.message || "请求已受理，请查看邮箱";
      render();
      return;
    }
    case "confirmReset":
    case "confirmEmail": {
      const reset = action === "confirmReset",
        email = val("email").trim(),
        token = val("token").trim(),
        password = val("newPassword");
      if (reset && (!!require("AuthInputCore").newPasswordError(password) || password !== val("confirmation")))
        throw Error("两次新密码须一致，至少6位且含字母和数字");
      await api(
        reset ? "/auth/password/reset" : "/auth/email/confirm",
        "POST",
        { email, token, newPassword: password },
      );
      if (reset) {
        await Vault.clear();
        cloud.session = new C.Session();
        await switchSpace("");
        go("account");
        toast("密码已重置，请重新登录");
      } else {
        parity.security = await api("/auth/account");
        parity.authError = "邮箱已验证";
        render();
      }
      return;
    }
    case "deleteAccount": {
      const confirmation = val("confirmation"),
        password = val("password");
      if (confirmation !== "注销我的账号" || !password)
        throw Error("请输入当前密码及：注销我的账号");
      if (
        !confirm(
          "确定注销账号？此操作会清除云端示例主体数据，撤回公开分享并退出所有设备。",
        )
      )
        return;
      await api("/auth/account", "DELETE", { password, confirmation });
      await Vault.clear();
      cloud.session = new C.Session();
      await switchSpace("");
      go("mine");
      toast("云端账号已注销，本机账号记录保留");
      return;
    }
    case "profile":
      if (!cloud.session.accessToken) {
        const p = Object.assign(new (require("AccountModels").UserProfile)(), {
          displayName: val("displayName").trim(),
          regionCode: val("regionCode"),
          avatarPreset: val("avatarPreset"),
          dietGoal: val("dietGoal"),
          bio: val("bio"),
        });
        if (p.displayName && p.displayName.length < 2)
          throw Error("昵称请填写2–24个字");
        await setting("localProfile", p);
        parity.profileLocal = p;
        profileData = p;
        toast("本机资料已保存");
        render();
        return;
      }
      break;
  }
  await oldSubmit(action);
  if (action === "login" && parity.authReturn) {
    const route = parity.authReturn;
    parity.authReturn = "";
    if (route === "community") await communityLoad();
    else go(route);
  }
};
document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.dataset.foodSelect !== undefined) {
    parity.selectedFoods = el.checked
      ? [...new Set([...parity.selectedFoods, el.dataset.foodSelect])]
      : parity.selectedFoods.filter((x) => x !== el.dataset.foodSelect);
  }
  if (el.name === "pantrySort") {
    parity.pantrySort = el.value;
    render();
  }
  if (el.name === "draftFavorites") parity.filterFavorites = el.checked;
  if (el.name === "procurementSeasoning") {
    parity.procurementSeasoning = el.checked;
  }
  if (el.name === "shareSearchHeat")
    guarded(() => setting("shareSearchHeat", el.checked));
  if (
    page === "settingsDetail" &&
    parity.settingsGroup === "食材管理" &&
    el.name === "category"
  ) {
    parity.defaultCategory = el.value;
    render();
  }
});
setInterval(() => {
  if (
    document.hidden ||
    busy ||
    (!parity.autoSync && settings.loginSyncOwner !== cloud.session.userId) ||
    !cloud.session.accessToken ||
    !["today", "recipes", "meals", "pantry", "mine"].includes(page)
  )
    return;
  guarded(async () => {
    if(settings.loginSyncOwner===cloud.session.userId){await flushLoginSync();return;}
    const network = await P.nativeAsync("networkState");
    if (!network.connected || (parity.wifiOnly && !network.wifi)) return;
    const result = await cloud.sync(store);
    conflicts = result.conflicts;
    if (conflicts.length) go("conflicts");
    else render();
  });
}, 60000);
async function flushLoginSync() {
  const owner=cloud.session.userId;
  if(!owner||settings.loginSyncOwner!==owner||!cloud.session.accessToken)return;
  try {
    const network=await P.nativeAsync('networkState');
    if(!network.connected||(parity.wifiOnly&&!network.wifi)||cloud.session.userId!==owner)return;
    const report=await cloud.sync(store);
    if(cloud.session.userId!==owner)return;
    conflicts=report.conflicts;await setting('loginSyncOwner','');
  } catch { /* A failed upload stays queued in this account for a foreground retry. */ }
}
function currentRecipe(id = selected) {
  return parity.actualRecipe?.id === id ? parity.actualRecipe : findRecipe(id);
}
function guideStepCard(step, index) {
  const recipe=currentRecipe(),saved=recipe?utility.progress.find(p=>p.recipeId===recipe.id&&p.signature===T.cookingSignature(recipe)):null;
  const completed=!!saved?.completed?.includes(index);
  return `<article class="card guide-step"><div class="row between"><h3>${index + 1}. ${esc(step.title)}</h3><button data-action="stepComplete" data-value="${index}" aria-pressed="${completed}" class="${completed?"active":""}">${completed?"已完成 · 可取消":"标记完成"}</button></div><p>${esc(step.instruction)}</p>${step.ingredients ? `<p class="hint current-step-ingredients">用料 · ${esc(step.ingredients)}</p>` : ""}${step.heat||step.time?`<div class="step-meta">${step.heat?`<span>火候 · ${esc(step.heat)}</span>`:""}${step.time?`<span>用时 · ${esc(step.time)}</span>`:""}</div>`:""}${step.checkpoint && !step.instruction.includes(step.checkpoint) ? `<p class="checkpoint">看这里 · ${esc(step.checkpoint)}</p>` : ""}</article>`;
}
recipeView = function () {
  const r = currentRecipe();
  if (!r) return empty("这道菜已不在当前目录，历史记餐仍保留");
  const guide = G.buildCookingGuide(r),
    check = G.buildCookingChecklist(r),
    cost = U.estimateRecipeCost(r, r.people || 2);
  const variants = allRecipes().filter(
    (v) =>
      v.name === r.name || (v.dishGroupId && v.dishGroupId === r.dishGroupId),
  );
  const prep = (optional) =>
    r.ingredients
      .filter((i) => !!i.optional === optional)
      .map(
        (i) =>
          `<details class="ingredient-detail"><summary>${esc(i.name)}</summary><p>${i.quantity > 0 ? "参考总量 " + i.quantity + esc(i.unit) : "推荐量待确认，按口味少量添加"}</p>${btn((parity.preparedNames || []).includes(i.name) ? "已备好 ✓" : "备好了", "prepareName", i.name)}${G.knowledgeFor(i.name).length ? btn("品类与替换 ›", "knowledge", i.name) : ""}</details>`,
      )
      .join("");
  return (
    "" +
    (variants.length > 1
      ? `<h2>同一道菜，不同做法</h2><div class="row">${variants.map((v) => btn(v.variantLabel || v.name + " · " + (v.region || "家常"), "recipe", v.id, v.id === r.id ? "active" : "")).join("")}</div>`
      : "") +
    `<section class="recipe-detail-summary"><img src="${cover(r)}" alt="${esc(r.name)}"><div><strong>约${r.minutes || "待核"}分钟</strong><p class="hint">${esc(r.region || "家常")} · ${esc(r.category || "家常菜")}</p><p class="recipe-price">${cost.usable ? "预估 " + money(cost.total) : "费用待核"} / ${r.people || 2}人份</p></div></section><div class="row utility-row">${btn("安排一餐", "planRecipe", r.id)}${btn(utility.progress.some(p=>p.recipeId===r.id&&p.signature===T.cookingSignature(r)&&(p.step>0||p.completed.length||p.prepared.length))?"继续做菜":"开始做菜", "startGuide", r.id, "primary")}</div><div class="row recipe-secondary-actions">${btn("归入菜单", "addCollection", r.id)}${btn("成品 ↗", "gallery", r.id)}${btn(parity.recipeActions ? "收起 ↑" : "更多 ⋯", "recipeActions")}</div>` +
    (parity.recipeActions
      ? `<div class="row">${btn("为什么推荐", "whyRecipe", r.id)}${btn((settings.drawDisliked || []).includes(r.id) ? "恢复抽取" : "不再抽到", "dislike", r.id)}${btn("比一比", "compareAdd", r.id)}${store.state.recipes.some((v) => v.id === r.id) ? btn("编辑菜谱", "recipeEdit", r.id) : ""}</div>`
      : "") +
    `<div class="row between"><h2>准备什么</h2><small>${r.people || 2}人份</small></div><details><summary>工具 ↓</summary><p>${guide.equipment.map(esc).join(" / ")}</p></details><details class="prep-group"><summary>${art("ui_storage.png", "small-icon")}食材 · ${r.ingredients.filter((i) => !i.optional).length}项</summary>${prep(false)}</details>${r.ingredients.some(i=>i.optional)?`<details class="prep-group seasoning"><summary>${art("ui_taste.png", "small-icon")}调味料 · ${r.ingredients.filter((i) => i.optional).length}项</summary>${prep(true)}</details>`:""}<section class="recipe-method"><h2>完整做法 · ${guide.steps.length}步</h2>${guide.steps.map(guideStepCard).join("")}</section><details class="recipe-more-advice"><summary>更多建议</summary><details class="recipe-supplement"><summary>备料与易错点 ↓</summary>${[...check.preparation, ...check.pitfalls].map((t) => `<p>${esc(t)}</p>`).join("")}</details><details class="recipe-advice"><summary>营养与做菜小贴士</summary>${recipeNutritionView(r)}${r.tips ? `<aside class="card recipe-tips">做好这道菜的小提示<p>${esc(r.tips)}</p></aside>` : ""}</details><details class="portion-panel"><summary>用量与采购（可选） ↓</summary><h2 class="portion-heading">${art("ui_people.png", "small-icon")}人数与口味</h2>${btn("应用推荐到本次制作", "applyPortions", "", "primary")}<p class="hint">推荐量可随实际食材与同餐菜数调整。未应用前保留菜谱原用量。</p>${r.ingredients
      .filter((i) => !i.optional)
      .map(
        (i, index) =>
          `<label>${esc(i.name)} · ${esc(i.unit)}<input type="number" min="0" step="0.1" data-actual-ingredient="${index}" value="${i.quantity}"></label>`,
      )
      .join(
        "",
      )}<p class="hint">主料按实际数量扣库存；用量为0的来源项需先补齐。调味料不自动扣减。</p><div class="row">${btn("确认添加缺少食材到采购", "recipeProcurement", r.id)}${btn("确认制作 · 扣库存并记一餐", "cook", r.id, "primary")}${btn("只记吃过", "mealRecipe", r.id)}</div></details><details class="recipe-tools"><summary>偏好与反馈</summary><!-- recipe-secondary-end --></details><!-- recipe-advice-end --></details>`
  );
};
const cookedPlanNote = '从做菜步骤加入';
const mealAtHour = hour => hour < 11 ? '早餐' : hour < 17 ? '午餐' : '晚餐';
function guideTimerPanel() {
  const timers = utility.timers.map(t => `<article class="cook-countdown"><img src="media/experience_timer.png" alt=""><div><small>${esc(t.label)}</small><strong role="timer" aria-live="off" data-deadline="${t.deadline}">${T.countdownText(t.deadline,Date.now())}</strong></div>${btn(t.deadline>Date.now()?'停止':'收起','cancelTimer',t.id)}</article>`).join('');
  return `<details id="cook-clock"><summary><img src="media/experience_timer.png" alt=""><strong>锅边计时</strong><small>${utility.timers.length ? utility.timers.length+' 个提醒' : '设置时长'}</small></summary><div class="clock-controls"><div class="clock-presets">${[5,10,15].map(m=>btn(m+' 分钟','quickTimer',m)).join('')}</div><form data-submit="guideTimer"><label>自定义分钟<input required name="minutes" type="number" min="1" max="180" value="10"></label><button class="primary" type="submit">开始计时</button></form></div></details>${timers}`;
}
function cookedEntry(recipe, now) {
  return store.state.plans.find(p=>p.recipeId===recipe.id && p.date===M.dateString(now) && p.occasion===mealAtHour(now.getHours()) && p.note===cookedPlanNote);
}
let cookingWrite = false;
async function finishCooking(recipe) {
  if(cookingWrite)return;
  cookingWrite=true;
  try {
    const now=new Date();
    if(!cookedEntry(recipe,now)) {
      const plan=Object.assign(new (require('MealPlan').MealPlan)(),{recipeId:recipe.id,date:M.dateString(now),occasion:mealAtHour(now.getHours()),people:Math.min(20,Math.max(1,Math.round(Number(recipe.people)||2))),completed:true,note:cookedPlanNote});
      await store.saveMealPlan(plan);
    }
    render();toast('出锅啦！已加入今日'+mealAtHour(now.getHours()));
  }finally{cookingWrite=false;}
}
const originalGuide = guideView;
guideView = function () {
  const r=currentRecipe();if(!r)return empty("请先打开一道菜");
  const guide=G.buildCookingGuide(r),signature=T.cookingSignature(r);
  progress=utility.progress.find(p=>p.recipeId===r.id&&p.signature===signature) || {recipeId:r.id,signature,step:0,completed:[],prepared:[]};
  progress.step=Math.max(0,Math.min(guide.steps.length-1,Number.isInteger(progress.step)?progress.step:0));
  const step=guide.steps[progress.step],first=progress.step===0,last=progress.step>=guide.steps.length-1;
  return heading(r.name)+`<div class="row between guide-awake"><span>做饭时保持亮屏</span><button data-action="awake" aria-pressed="${settings.keepAwake!=="false"}">${settings.keepAwake==="false"?"开启":"已开启"}</button></div><section class="cooking-scene">${art("scene_cooking_prep.png")}${art("layer_steam.png","steam")}</section><div class="row between"><p role="status" data-guide-position>步骤 ${guide.steps.length?progress.step+1:0} / ${guide.steps.length}</p><small>${r.minutes || "待核"}分钟参考</small></div><progress aria-label="烹饪步骤进度" value="${guide.steps.length?progress.step+1:0}" max="${Math.max(1,guide.steps.length)}"></progress>`+
    (step?guideStepCard(step,progress.step):empty("暂缺完整步骤，请先核对菜谱"))+
    `<details class="guide-preparation"><summary>本菜材料与备料状态</summary>${r.ingredients.filter(i=>!i.optional).map(i=>`<div class="row between"><span>${esc(i.name)} · ${i.quantity>0?i.quantity+esc(i.unit):"用量待核对"}</span><button data-action="prepareName" data-value="${esc(i.name)}" aria-pressed="${progress.prepared.includes(i.name)}">${progress.prepared.includes(i.name)?"已备好":"备好了"}</button></div>`).join("")}</details>` + guideTimerPanel() +
    btn('重置本菜进度','resetProgress') +
    (cookedEntry(r,new Date()) ? `<div class="cook-receipt" role="status">已加入今日${cookedEntry(r,new Date()).occasion}${btn('撤销','undoCookedPlan',cookedEntry(r,new Date()).id)}</div>` : '') +
    `<div class="cook-controls" role="group" aria-label="做菜操作"><button data-action="guideStep" data-value="-1" ${first?'disabled':''}>上一步</button><button class="clock-shortcut" data-action="openCookClock"><img src="media/experience_timer.png" alt="">计时器</button>${last ? `<button class="primary" data-action="finishCooking" ${!step || cookedEntry(r,new Date())?'disabled':''}>${cookedEntry(r,new Date())?'已出锅':'完成这道菜'}</button>` : btn('下一步','guideStep',1,'primary')}</div>`;
};
const completeActions = actions,
  completeSubmit = submit;
actions = async function (action, value) {
  switch (action) {
    case "recipe":
      parity.actualRecipe = null;
      parity.recipeActions = false;
      parity.preparedNames = [];
      parity.appetite = 1;
      parity.seasoning = "标准";
      parity.spice = "原方";
      parity.oil = undefined;
      break;
    case "recipeActions":
      parity.recipeActions = !parity.recipeActions;
      render();
      return;
    case "prepareName":
      {
        const r = currentRecipe();
        progress = utility.progress.find(p => p.recipeId === r.id && p.signature === T.cookingSignature(r)) || {recipeId: r.id, signature: T.cookingSignature(r), step: 0, prepared: [], completed: []};
        parity.preparedNames = progress.prepared.includes(value)?progress.prepared.filter(x=>x!==value):[...progress.prepared,value];
        progress.prepared = clone(parity.preparedNames);
        await storeProgress();
      }
      render();
      toast("备料状态已保存");
      return;
    case 'openCookClock': {
      const panel=document.getElementById('cook-clock');
      if(panel){panel.open=true;panel.querySelector('summary').focus({preventScroll:true});panel.scrollIntoView({block:'center'});}
      return;
    }
    case 'finishCooking':
      if(page==='guide' && currentRecipe())await finishCooking(currentRecipe());
      return;
    case 'undoCookedPlan': {
      const plan=store.state.plans.find(p=>p.id===value && p.note===cookedPlanNote);
      if(plan){await store.removeMealPlan(plan.id);render();toast('已撤销这道菜');}
      return;
    }
    case "stepComplete": {
      const r = currentRecipe();
      progress = utility.progress.find(
        (p) => p.recipeId === r.id && p.signature === T.cookingSignature(r),
      ) || {
        recipeId: r.id,
        signature: T.cookingSignature(r),
        step: 0,
        prepared: [],
        completed: [],
      };
      const step = Number(value);
      progress.completed = progress.completed.includes(step)
        ? progress.completed.filter((x) => x !== step)
        : progress.completed.concat(step);
      await storeProgress();
      render();
      const done=progress.completed.includes(step);
      if(done)screen.querySelector(`[data-action="stepComplete"][data-value="${step}"]`)?.classList.add('step-stamp');
      toast(done ? ['这一步很漂亮！','又做好一步啦！','手艺不错！'][step%3] : '已取消完成标记');
      return;
    }
    case "applyPortions": {
      const r = clone(currentRecipe());
      const o = Object.assign(new (require("PortionCore").PortionOptions)(), {
        people,
        basePeople: r.people || 2,
        appetite: parity.appetite || 1,
        seasoning: parity.seasoning || "标准",
        spice: parity.spice || "原方",
      });
      r.ingredients = require("PortionCore").recommendPortions(
        r.ingredients,
        o,
      );
      r.people = people;
      parity.actualRecipe = r;
      render();
      return;
    }
    case "cook":
      if (
        confirm(
          "确认实际制作？将按显示的实际用量扣库存并新增私有记餐，库存不足会停止。",
        )
      ) {
        await store.cook(currentRecipe(value));
        await store.recordFeedback(value, "select", intent);
        go("meals");
        toast("已扣减库存并记下这一餐");
      }
      return;
    case "whyRecipe": {
      const ranked = R.rankPersonalized(
        [findRecipe(value)],
        store.state.foods,
        store.state.meals,
        store.feedback,
        recipeOptions(),
      );
      toast(
        (ranked[0]?.reasons || []).join(" · ") ||
          "按当前搜索与筛选展示；未进行个性化排序",
      );
      return;
    }
    case "resetProgress":
      if (confirm("重新开始这道菜？只清除步骤与备料勾选，库存不变。")) {
        const r = currentRecipe();
        utility.progress = utility.progress.filter((p) => p.recipeId !== r.id);
        await saveUtility();
        render();
      }
      return;
    case "quickTimer":
      await addGuideTimer(Number(value));
      return;
  }
  await completeActions(action, value);
};
async function addGuideTimer(minutes) {
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180)
    throw Error("计时请填1至180分钟");
  if (utility.timers.length >= 6) throw Error("最多6个计时器，请先取消一个");
  await P.nativeAsync("permission");
  const timer = {
    id: P.invoke("uuid"),
    recipeId: selected || "",
    label: currentRecipe()?.name || "做菜计时",
    deadline: Date.now() + Math.round(minutes * 60000),
  };
  P.invoke("timer", timer);
  utility.timers.push(timer);
  await saveUtility();
  render();
  toast("计时已开始");
}
submit = async function (action) {
  if (action === "guideTimer") {
    await addGuideTimer(num("minutes"));
    return;
  }
  await completeSubmit(action);
};
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.dataset.actualIngredient !== undefined) {
    const value = Number(el.value);
    if (!Number.isFinite(value) || value < 0) return;
    const r = clone(currentRecipe());
    const main = r.ingredients.filter((i) => !i.optional);
    main[Number(el.dataset.actualIngredient)].quantity = value;
    main[Number(el.dataset.actualIngredient)].quantitySource = "用户实际调整";
    parity.actualRecipe = r;
  }
});
const signedAccountView = accountView,
  fullFoodView = foodView;
accountView = function () {
  if (cloud.session.accessToken) return signedAccountView();
  const draft = parity.authDraft || {},
    register = parity.authRegister;
  return (
    `<section class="home-brand auth-brand">${art("brand_monster.png")}<div><h1>开饭小怪</h1><p>${register ? "认识你，很高兴" : "回来一起吃饭"}</p></div></section>` +
    form(
      "login",
      `<p id="auth-context-hint" class="auth-field-help" role="status">${register?"至少6位密码，包含字母和数字。":"使用你的账号和密码登录。"}</p><input type="hidden" name="register" value="${register}">${input("email", "账号", draft.email || settings.boundEmail || "", "text", 'autocomplete="username" required')}${input("password", (register?"密码":"密码"), draft.password || "", parity.showPassword ? "text" : "password", `autocomplete="${register?'new-password':'current-password'}" required minlength="${register?6:1}" maxlength="128"`)}${`<div class="auth-password-tools">${btn(parity.showPassword ? "隐藏密码" : "显示密码", "authPassword")}</div>`}` +
        (register
          ? input(
              "confirmation",
              "确认密码",
              draft.confirmation || "",
              parity.showPassword ? "text" : "password",
              'required minlength="6" maxlength="128"',
            ) +
            input(
              "displayName",
              "昵称（2–24个字）",
              draft.displayName || "",
              "text",
              'required minlength="2" maxlength="24"',
            ) +
            select(
              "registerRegion",
              "地区（选填）",
              [
                ["", "不设置"],
                ...require("AccountModels").PROFILE_REGIONS.map((r) => [
                  r.code,
                  r.name,
                ]),
              ],
              draft.registerRegion || "",
            )
          : ""),
      register ? "创建小怪账号" : "登录账号",
    ) + `<div class="auth-mode-footer">${btn(register?"已有账号？去登录":"没有账号？注册", "authMode", register?"false":"true")}</div>`
  );
};
function captureAuth() {
  if (page !== "account" || cloud.session.accessToken) return;
  parity.authDraft = {
    email: val("email"),
    password: val("password"),
    confirmation: val("confirmation"),
    displayName: val("displayName"),
    registerRegion: val("registerRegion"),
  };
}
foodView = function () {
  if (parity.foodStage !== 0 || foodDraft?.id)
    return (
      `<section class="row food-form-heading">${art("food_" + foodArtName(foodDraft?.name || "") + ".webp", "food-art")}<div><h2>${esc(foodDraft?.name || "未命名食材")}</h2><small>已经帮你填好，按实际情况调整</small></div></section>` +
      fullFoodView()
    );
  return (
    heading("添一份食材", "散装、自制食材也能记录，所有预填信息都可以修改。") +
    form(
      "foodStart",
      input(
        "name",
        "食材名",
        foodDraft?.name || "",
        "text",
        'required maxlength="100"',
      ),
      "用这个名字继续 →",
    ) +
    `<h2>常用食材</h2><div class="food-template-grid">${M.TEMPLATES.map((t, i) => `<button data-action="foodTemplate" data-value="${i}">${art("food_" + foodArtName(t.name) + ".webp")}<span>${esc(t.name)}</span></button>`).join("")}</div>`
  );
};
const finalActions = actions,
  finalSubmit = submit;
actions = async function (action, value) {
  if (action === "authMode" || action === "authPassword") captureAuth();
  if (action === "authMode") {
    parity.authRegister = value === "true";parity.showPassword=false;
    render();
    return;
  }
  if (action === "authPassword") {
    parity.showPassword = !parity.showPassword;
    render();
    return;
  }
  if (action === "foodNew") parity.foodStage = 0;
  if (["foodTemplate", "foodEdit"].includes(action)) parity.foodStage = 1;
  if (action === "restoreDraft")
    parity.foodStage = settings.androidDraft?.parityFoodStage ?? 1;
  if (action === "favoriteSnapshot") {
    if (!cloud.session.accessToken) throw Error("登录后可更新社区收藏统计");
    await refreshDiscovery();
    if (parity.discoveryError) throw Error(parity.discoveryError);
    if (
      !confirm(
        "将本机公开菜谱收藏计入社区人数统计？其他设备之前的贡献以当前本机列表为准。",
      )
    )
      return;
    await api("/discovery/favorites/snapshot", "POST", {
      recipeIds: store.state.favorites.map((f) => f.recipeId),
      confirmed: true,
      expectedRevision: parity.discovery.favoriteRevision,
    });
    await refreshDiscovery();
    toast("收藏统计已更新");
    return;
  }
  await finalActions(action, value);
  if (action === "recipe") {
    const saved = utility.progress.find((p) => p.recipeId === value && p.signature === T.cookingSignature(currentRecipe(value)));
    parity.preparedNames = clone(saved?.prepared || []);
  }
};
submit = async function (action) {
  if (action === "foodStart") {
    const name = val("name").trim();
    if (!name) throw Error("请填写食材名");
    foodDraft.name = name;
    parity.foodStage = 1;
    render();
    return;
  }
  if (action === "login") captureAuth();
  await finalSubmit(action);
  if (action === "login") {
    parity.authDraft = null;
    parity.showPassword = false;
  }
};
// Match Harmony navigation while leaving controls, carousels and stock-row gestures alone.
let pointerStart = null, gestureClickUntil = 0;
const gestureTabs = ['today','recipes','meals','pantry','mine'];
function gestureBlocked(target) {
  return !target || !!target.closest('button,a,input,textarea,select,form,[contenteditable],.chips,.filter-tabs,.filter-token-strip,.lobby-shell,iframe');
}
function gestureEdge(x){return x<=Math.min(48,Math.max(32,innerWidth*.1));}
function gestureBackSurface(target){
  return !!target?.closest('#screen,#page-header,#release-legal-panel,#companion-dialog') &&
    !target.closest('#companion-pet,#companion-menu,.companion-grip,.chips,.filter-tabs,.filter-token-strip,.recent-meal-strip,.order-chips,input[type="range"],iframe,.lobby-shell');
}
document.addEventListener('touchstart', event => {
  pointerStart=null;
  if(event.touches.length!==1||busy||window.__lobbyHost?.state.visible)return;
  const t=event.touches[0],edge=gestureEdge(t.clientX),detail=!gestureTabs.includes(page);
  const backSurface=gestureBackSurface(event.target);
  if(!(edge&&backSurface) && (draftDirty||gestureBlocked(event.target)))return;
  pointerStart={x:t.clientX,y:t.clientY,target:event.target,time:performance.now(),route:page,selected,edge,detail,backSurface,axis:''};
},{passive:true});
document.addEventListener('touchmove',event=>{
  const start=pointerStart;if(!start)return;
  if(event.touches.length!==1){pointerStart=null;return;}
  const t=event.touches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;
  if(!start.axis && Math.max(Math.abs(dx),Math.abs(dy))>10){
    start.axis=Math.abs(dx)>Math.abs(dy)*1.5?'x':'y';
  }
  if(start.axis==='y'){pointerStart=null;return;}
  // Claim only rightward back drags; vertical reading and horizontal controls
  // keep their native scrolling. No page transformation/animation is needed.
  if(start.axis==='x'&&dx>0&&start.backSurface&&(start.edge||start.detail)&&event.cancelable)event.preventDefault();
},{passive:false});
document.addEventListener('touchcancel',()=>{pointerStart=null;},{passive:true});
document.addEventListener('touchend',event=>{
  const start=pointerStart;pointerStart=null;
  if(!start||busy||event.touches.length||start.route!==page||start.selected!==selected||performance.now()-start.time>1200)return;
  const t=event.changedTouches[0];if(!t)return;
  const dx=t.clientX-start.x,dy=t.clientY-start.y;
  if(Math.abs(dx)<Math.min(80,Math.max(56,innerWidth*.16))||Math.abs(dx)<Math.abs(dy)*2||window.getSelection()?.toString())return;
  const calendar=start.target.closest('.month-grid,.week-strip,.calendar-month');
  const stock=page==='pantry'&&start.target.closest('article.card')?.querySelector('[data-action="consume"]');
  const back=dx>0&&start.backSurface&&(start.edge||(start.detail&&!calendar&&page!=='guide'));
  if(stock&&!back)return;
  const index=gestureTabs.indexOf(page),next=index+(dx<0?1:-1);
  if(!calendar&&!back&&page!=='guide'&&!(index>=0&&next>=0&&next<gestureTabs.length))return;
  gestureClickUntil=performance.now()+350;
  guarded(async()=>{
    if(back){
      // Web content cannot background the Activity. Root-tab edge swipes stay
      // on the tab; Android's system gesture owns leaving the application.
      if(document.activeElement?.matches('input,textarea,[contenteditable]')&&document.body.classList.contains('keyboard-open')){
        document.activeElement.blur();window.platformKeyboard?.(false);return;
      }
      await window.requestAppBack();return;
    }
    if(calendar){if(parity.monthOpen)await actions('monthMove',dx<0?1:-1);else await actions('homeDay',D.shiftDay(date,dx<0?7:-7));return;}
    if(page==='guide'){await actions('guideStep',dx<0?1:-1);return;}
    go(gestureTabs[next],true);
  });
},{passive:true});
document.addEventListener('click',event=>{if(performance.now()<gestureClickUntil){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
function captureRecipeEditor() {
  if (!recipeDraft) recipeDraft = new M.Recipe();
  for (const key of ["name", "cuisine", "category", "tips"])
    if (document.querySelector(`[name="${key}"]`)) recipeDraft[key] = val(key);
  for (const key of ["minutes", "people", "estimatedCost"])
    if (document.querySelector(`[name="${key}"]`)) recipeDraft[key] = num(key);
  if (document.querySelector('[name="steps"]'))
    recipeDraft.steps = val("steps")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
}
recipeEditView = function () {
  const r = recipeDraft || new M.Recipe();
  return (
    heading("我的私人菜谱") +
    form(
      "recipeSaveFull",
      input("name", "菜名", r.name, "text", "required") +
        input("cuisine", "地区风味", r.cuisine) +
        select(
          "category",
          "类别",
          [...new Set(["家常", ...allRecipes().map((r) => r.category)])],
          r.category || "家常",
        ) +
        `<div class="grid">${input("minutes", "总用时（分钟）", r.minutes, "number", 'min="1" max="1440"')}${input("people", "原方人数", r.people || 2, "number", 'min="1" max="20"')}</div>${input("estimatedCost", "原方估算费用（元）", r.estimatedCost, "number", 'min="0" step="0.01"')}<h2>用料</h2>${r.ingredients.map((i, index) => `<div class="row card between"><span>${esc(i.name)} ${i.quantity}${esc(i.unit)}${i.optional ? " · 调味" : ""}</span>${btn("移除", "editorIngredientRemove", index)}</div>`).join("")}<div class="chips">${M.TEMPLATES.map((t, i) => btn(t.name, "editorTemplate", i)).join("")}</div>${input("ingredientName", "食材", parity.editorIngredientName || "")}${input("ingredientQuantity", "数量", 1, "number", 'min="0.1" step="0.1"')}${select("ingredientUnit", "单位", M.UNITS, parity.editorIngredientUnit || "g")}${checkField("ingredientOptional", "调味料（不自动扣库存）")}${btn("加入用料", "editorIngredientAdd")}<h2>做法</h2>${area("steps", "每行一步", r.steps.join("\n"))}${area("tips", "小提示", r.tips)}`,
      "保存私有菜谱",
    ) +
    (r.id
      ? `<div class="row">${btn("提交公共审核", "submitCatalog", "recipe|" + r.id)}${btn("删除私有菜谱", "deleteRecipe", r.id, "danger")}</div>`
      : "")
  );
};
const baseBarcodeView = barcodeView;
barcodeView = function () {
  return (
    baseBarcodeView() +
    `<h2>我的条码模板</h2>` +
    (store.state.templates.length
      ? store.state.templates
          .map(
            (t) =>
              `<article class="card recipe">${art("food_" + foodArtName(t.name) + ".webp")}<div><h3>${esc(t.name)}</h3><p class="hint">${esc(t.barcode)} · ${t.days}天 · ${esc(t.location)}</p><div class="row">${btn("使用 / 编辑", "useBarcode", t.id)}${btn("提交公共审核", "submitCatalog", "barcode|" + t.id)}${btn("删除", "deleteBarcode", t.id)}</div></div></article>`,
          )
          .join("")
      : empty("确认过的商品模板可以保存在这里"))
  );
};
const stagedFoodView = foodView;
foodView = function () {
  const html = stagedFoodView();
  return parity.foodStage === 0
    ? html
    : html.replace(
        "</form>",
        `<details><summary>条码与私有模板</summary>${input("foodBarcode", "EAN / UPC条码", parity.foodBarcode || "", "text", 'inputmode="numeric"')}${checkField("saveBarcodeTemplate", "同时保存为我的条码模板", !!parity.foodBarcode)}</details></form>`,
      );
};
function catalogView() {
  const update = parity.catalogPackage;
  return (
    heading("离线菜谱更新") +
    (update
      ? `<h2>${update.unchanged ? "已经是最新目录" : "发现菜谱更新"}</h2><p>目录共 ${update.manifest.count}道 · 本次 ${update.records.length}道变更</p><p class="hint">检查时间 ${esc(parity.catalogCheckedAt)}</p>${update.records
          .slice(0, 20)
          .map((r) => {
            let name = r.id;
            try {
              name = JSON.parse(r.payload).name || r.id;
            } catch {}
            return `<p>${esc(name)}</p>`;
          })
          .join(
            "",
          )}${update.records.length > 20 ? `<p>以及其余 ${update.records.length - 20}道</p>` : ""}${!update.unchanged ? btn("应用到离线菜谱", "installCatalog", "", "primary") : ""}`
      : empty("先检查目录版本")) +
    btn("重新检查", "catalogUpdate")
  );
}
window.parityViews.catalog = catalogView;
parity.detailContents = {};
for (const route of [
  "notifications",
  "author",
  "familyMembers",
  "familyInvite",
  "timeline",
  "replenishment",
]) {
  window.parityViews[route] = () => parity.detailContents[route] || empty();
}
const routedActions = actions,
  routedSubmit = submit;
actions = async function (action, value) {
  switch (action) {
    case "editorIngredientAdd": {
      captureRecipeEditor();
      const name = val("ingredientName").trim(),
        q = num("ingredientQuantity"),
        unit = val("ingredientUnit");
      if (!name || !Number.isFinite(q) || q <= 0) throw Error("请填写有效用料");
      const i = new M.Ingredient(name, q, unit);
      i.optional = checked("ingredientOptional");
      recipeDraft.ingredients.push(i);
      parity.editorIngredientName = "";
      render();
      return;
    }
    case "editorIngredientRemove":
      captureRecipeEditor();
      recipeDraft.ingredients.splice(Number(value), 1);
      render();
      return;
    case "editorTemplate": {
      captureRecipeEditor();
      const t = M.TEMPLATES[Number(value)];
      parity.editorIngredientName = t.name;
      parity.editorIngredientUnit = t.unit;
      render();
      return;
    }
    case "submitCatalog": {
      if (!cloud.session.accessToken) throw Error("请先登录，私有记录继续保留");
      if (
        !confirm(
          "提交公共审核？管理员通过后向其他用户提供，不自动公开原有私有记录。",
        )
      )
        return;
      const sync = await cloud.sync(store);
      conflicts = sync.conflicts;
      if (conflicts.length) {
        go("conflicts");
        throw Error("请先处理同步冲突");
      }
      const [kind, sourceId] = value.split("|");
      await api("/catalog/submissions", "POST", { kind, sourceId, confirmed: true });
      toast("已进入审核队列");
      return;
    }
    case "useBarcode": {
      const t = store.state.templates.find((t) => t.id === value);
      foodDraft = Object.assign(new M.Food(), {
        name: t.name,
        category: t.category,
        unit: t.unit,
        location: t.location,
        expiryDate: D.shiftDay(M.dateString(new Date()), t.days),
      });
      parity.foodBarcode = t.barcode;
      parity.foodStage = 1;
      go("food");
      return;
    }
    case "deleteBarcode":
      if (confirm("删除私有模板？已有库存记录不会删除。")) {
        await store.deleteTemplate(
          store.state.templates.find((t) => t.id === value),
        );
        render();
      }
      return;
    case "catalogUpdate":
      if (!cloud.session.accessToken) {
        go("account");
        return;
      }
      parity.catalogPackage =
        await require("CatalogUpdate").downloadCatalogUpdate(
          cloud,
          await store.catalogManifest(),
        );
      parity.catalogCheckedAt = new Date().toLocaleString("zh-CN");
      go("catalog");
      return;
    case "installCatalog":
      if (!parity.catalogPackage || parity.catalogPackage.unchanged) return;
      if (confirm("更新离线菜谱？收藏与记餐保留，本次内容已完成完整性校验。")) {
        await store.installCatalog(parity.catalogPackage);
        parity.catalogPackage = null;
        render();
        toast("离线菜谱已更新");
      }
      return;
    case "foodNew":
      parity.foodBarcode = "";
      break;
    case "leaveFamily":
      if (confirm("离开家庭后将无法访问其共享内容，示例主体记录保留。")) {
        await api(
          "/families/" + value + "/members/" + cloud.session.userId,
          "DELETE",
        );
        familyList = await api("/families");
        await store.reconcileFamilies(familyList.map((f) => f.id));
        go("families");
      }
      return;
  }
  const direct = {
    socialInbox: "notifications",
    readInbox: "notifications",
    author: "author",
    familyMembers: "familyMembers",
    familyInvite: "familyInvite",
    rotateInvite: "familyInvite",
    timeline: "timeline",
    replenishments: "replenishment",
  }[action];
  await routedActions(action, value);
  if (direct) {
    parity.detailContents[direct] = screen.innerHTML;
    go(direct);
  }
};
submit = async function (action) {
  if (action === "recipeSaveFull") {
    captureRecipeEditor();
    if (!recipeDraft.ingredients.length || !recipeDraft.steps.length)
      throw Error("请补充用料和做法");
    await store.saveRecipe(recipeDraft);
    clearTimeout(draftSaveHandle);
    draftDirty = false;
    await setting("androidDraft", null);
    go("recipes");
    toast("私有菜谱已保存");
    return;
  }
  const barcodeSave =
    action === "food" && checked("saveBarcodeTemplate")
      ? {
          code: val("foodBarcode"),
          name: val("name"),
          unit: val("unit"),
          category: val("category"),
          location: val("location"),
          expiryDate: val("expiryDate"),
        }
      : null;
  if (barcodeSave && !/^([0-9]{8}|[0-9]{12}|[0-9]{13})$/.test(barcodeSave.code))
    throw Error("条码请填写8、12或13位数字");
  if (action === "barcode") parity.foodBarcode = val("code");
  await routedSubmit(action);
  if (action === "barcode") {
    parity.foodStage = 1;
    render();
  }
  if (barcodeSave) {
    const old = store.state.templates.find(
      (t) => t.barcode === barcodeSave.code,
    );
    const days = Math.max(
      0,
      Math.round(
        (new Date(barcodeSave.expiryDate + "T12:00:00").getTime() -
          new Date(M.dateString(new Date()) + "T12:00:00").getTime()) /
          86400000,
      ),
    );
    const template = Object.assign(
      new M.Template(
        barcodeSave.name,
        barcodeSave.category,
        days,
        barcodeSave.location,
        barcodeSave.unit,
      ),
      old || {},
      {
        name: barcodeSave.name,
        category: barcodeSave.category,
        days,
        location: barcodeSave.location,
        unit: barcodeSave.unit,
        barcode: barcodeSave.code,
      },
    );
    await store.saveTemplate(template);
    toast("食材与私有条码模板已保存");
  }
};

function captureProfileDraft(){if(page!=="profile"||!profileData)return;for(const key of ["displayName","regionCode","dietGoal","bio"]){const field=document.querySelector(`[name="${key}"]`);if(field)profileData[key]=field.value;}}
