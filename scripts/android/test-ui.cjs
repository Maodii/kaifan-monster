const {
  chromium,
} = require("/Users/developer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const http = require("http"),
  fs = require("fs"),
  crypto = require("crypto"),
  path = require("path"),
  assert = require("assert/strict"),
  { HostAdapter, root } = require("./host-adapter.cjs");
const packageManifest=fs.readFileSync(path.join(root,'android/app/src/main/AndroidManifest.xml'),'utf8');
const expectedVersionLabel='Android '+packageManifest.match(/android:versionName="([^"]+)"/)[1]+' · '+packageManifest.match(/android:versionCode="(\d+)"/)[1];
const uxOnly=process.argv.includes("--ux-v0917-only");
const authOnly=process.argv.includes("--auth-rules-only");
const parityInput=process.argv.includes("--parity-input-only");
const iteration90=process.argv.includes("--interaction90-only");
let iteration90Report;
const draftUi = process.argv.includes("--source-ui");
const compactOnly = process.argv.includes("--compact-search-only");
let compactReport;
const iconOnly=process.argv.includes("--icon-hearts-only");
let iconReport;
const clarityOnly=process.argv.includes("--search-clarity-only");
let clarityReport;
const pixelOnly=process.argv.includes("--pixel-polish-only");
let pixelReport;
const previewOnly=process.argv.includes("--motion-preview");
const motionOnly=process.argv.includes("--motion-only");
let motionReport;
const cookOnly=process.argv.includes("--cook-finish-only");
const backOnly=process.argv.includes("--back-navigation-only");
const responsiveOnly = process.argv.includes("--responsive-only");
let responsiveReport;
const uiReport = cookOnly ? "android-cook-finish.json" : backOnly ? "android-back-navigation.json" : responsiveOnly ? "android-responsive-tests.json" : uxOnly ? "ux-v0917-ui.json" : authOnly ? "account-v0914-ui.json" : parityInput ? "android-parity-input.json" : iteration90 ? "interaction90-ui.json" : clarityOnly ? "android-search-clarity.json" : iconOnly ? (draftUi?"android-source-icon-hearts.json":"android-icon-hearts.json") : previewOnly ? "android-motion-preview.json" : motionOnly ? (draftUi?"android-source-motion.json":"android-motion.json") : pixelOnly ? (draftUi?"android-source-pixel-polish.json":"android-pixel-polish.json") : compactOnly ? "android-compact-search-tests.json" : draftUi ? "android-source-ui-tests.json" : "android-ui-tests.json";
const adapter = new HostAdapter(),
  assets = root + "/android/app/build/generated/assets",
  checks = [],
  shots = [],
  errors = [];
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "POST") {
      let body = "";
      for await (const c of req) body += c;
      const data = JSON.parse(body);
      if (url.pathname === "/invoke") {
        res.setHeader("Content-Type", "application/json");
        res.end(adapter.invoke(data.action, JSON.stringify(data.args)));
      } else {
        let result;
        try {
          result = { value: await adapter.asyncOp(data.action, data.args) };
        } catch (e) {
          result = { error: e.message };
        }
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
      }
      return;
    }
    let file = path.join(
      assets,
      url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname),
    );
    if (!file.startsWith(assets + "/")) throw Error("path");
    res.setHeader(
      "Content-Type",
      file.endsWith(".html")
        ? "text/html"
        : file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".ttf")
              ? "font/ttf"
              : file.endsWith(".webp")
                ? "image/webp"
                : "image/png",
    );
    res.end(fs.readFileSync(file));
  } catch (e) {
    res.statusCode = 404;
    res.end("not found");
  }
});
(async () => {
  let browser;
  try {
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const base = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch({
      headless: true,
      args: ["--renderer-process-limit=2"],
    });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      ...(previewOnly?{recordVideo:{dir:root+"/work/reports",size:{width:390,height:844}}}:{}),
      reducedMotion: (motionOnly||previewOnly||iconOnly||clarityOnly)?"no-preference":"reduce",
      timezoneId: "Asia/Shanghai",
    });
    await context.addInitScript(() => {
      window.Android = {
        invoke: (action, json) => {
          const x = new XMLHttpRequest();
          x.open("POST", "/invoke", false);
          x.setRequestHeader("Content-Type", "application/json");
          x.send(JSON.stringify({ action, args: JSON.parse(json) }));
          return x.responseText;
        },
        async: (id, action, json) =>
          fetch("/async", {
            method: "POST",
            body: JSON.stringify({ action, args: JSON.parse(json) }),
          })
            .then((r) => r.json())
            .then((result) => nativeResult(id, result)),
      };
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) =>
      d.type() === "prompt"
        ? d.accept(d.defaultValue() || "测试收藏夹")
        : d.accept(),
    );
    await page.goto(base);
    if(cookOnly||responsiveOnly||backOnly||parityInput){
      await page.waitForFunction(()=>window.__kaifan||document.querySelector('[data-action="legalLocal"]'));
      if(!await page.evaluate(()=>!!window.__kaifan))await page.locator('[data-action="legalLocal"]').click();
    }
    await page.waitForFunction(() => window.__kaifan);
    async function click(action, value) {
      const selector = `[data-action="${action}"]${value !== undefined ? `[data-value="${value}"]` : ""}`;
      await page.locator(selector).first().click();
      await page.waitForTimeout(80);
    }
    async function go(p) {
      await page.evaluate((p) => __kaifan.go(p), p);
    }
    async function submit() {
      await page.locator("form button[type=submit]").first().click();
      await page.waitForTimeout(180);
    }
    async function shot(name, purpose, fullPage = true, target) {
      if(process.argv.includes("--minimal-shots")&&!name.includes("pixel-polish"))return;
      const relative = "work/screenshots/" + (draftUi ? name.replace("android-host-","android-source-") : name);
      await page.locator("#toast").evaluate(el => { el.textContent = ""; el.style.display="none"; });
      await page.locator("img").evaluateAll(async imgs=>{await Promise.all(imgs.map(async img=>{img.loading="eager";await img.decode().catch(()=>{});}));});
      await page.evaluate(() => document.activeElement?.blur());
      if(target)await page.locator(target).screenshot({path:root+"/"+relative});
      else await page.screenshot({ path: root + "/" + relative, fullPage });
      shots.push({
        path: relative,
        kind: "screenshot",
        capture_tool: "playwright",
        purpose: "Android专用UI宿主浏览器走查（不是设备截图）：" + purpose,
      });
    }
    if(cookOnly){checks.push(...await require("./check-cook-finish.cjs")(page,shot));
    }else if(backOnly){const result=await require("./check-back-navigation.cjs")(page,shot);checks.push(...result.checks);
    }else if(uxOnly){const result=await require("./check-ux-v0917.cjs")(page,shot);checks.push(...result.checks);
    }else if(authOnly){const result=await require("./check-auth-rules.cjs")(page,shot);checks.push(...result.checks);
    }else if(parityInput){
      const result=await require("./check-parity-input.cjs")(page,shot);checks.push(...result.checks);
    }else if(iteration90){
      iteration90Report=await require("./check-interaction90.cjs")(page,shot);checks.push(...iteration90Report.checks);
    }else if(clarityOnly){
      clarityReport=await require("./check-search-clarity.cjs")(page,shot);checks.push("Named search, one collection hub and paper/sketch hearts");
    }else if(iconOnly){
      iconReport=await require("./check-icon-hearts.cjs")(page,shot);checks.push("Content-owned search icons and accessible red-heart favorite controls");
    }else if(previewOnly){
      await page.waitForTimeout(1000);
      for(const route of ["recipes","filters","recipes","mine"]){await go(route);await page.waitForTimeout(1000);}
      await go("recipes");await page.waitForTimeout(800);await page.locator(".recipe-sort-pocket summary").click();await page.waitForTimeout(800);await page.locator(".recipe-sort-pocket summary").click();await page.waitForTimeout(500);
      const video=page.video();await context.close();await video.saveAs(root+"/work/reports/android-motion-preview.webm");const temp=await video.path();if(temp!==root+"/work/reports/android-motion-preview.webm")fs.rmSync(temp);
      checks.push("Real headless Chromium startup and navigation recorded; no device/frame-rate claim");
    }else if(motionOnly){
      motionReport=await require("./check-motion.cjs")(page,context,base,shot);checks.push("Bounded launch, route-only effects, interruptions, visibility and reduced-motion checks");
    }else if(pixelOnly){
      pixelReport=await require("./check-pixel-polish.cjs")(page,shot);checks.push("Pixel polish source controls and walkthrough checks");
    }else if(compactOnly){
      compactReport=await require("./check-compact-search.cjs")(page,shot);checks.push("Compact scoped search:12 width/scale/route cases, independent navigation and version label pass");
    }else{
    if(!responsiveOnly){
    assert.equal(await page.evaluate(() => __kaifan.allRecipes().length), 454);
    assert((await page.locator("h1").textContent()) === "开饭小怪");
    const decodeResults = await page.evaluate(async () => {
      const recipes = __kaifan.allRecipes();
      const failures = [];
      // Limit decoding concurrency to avoid unnecessary browser memory pressure.
      for (let i = 0; i < recipes.length; i += 6) {
        await Promise.all(
          recipes.slice(i, i + 6).map(async (recipe) => {
            const src = __kaifan.cover(recipe);
            const img = new Image();
            img.src = src;
            try {
              await img.decode();
              if (!img.naturalWidth) throw Error("empty");
            } catch {
              failures.push({ id: recipe.id, src });
            } finally {
              img.src = "";
            }
          }),
        );
      }
      return { count: recipes.length, failures };
    });
    assert.equal(decodeResults.count, 454);
    assert.deepEqual(decodeResults.failures, []);
    assert.equal(
      await page.evaluate(() => __kaifan.cover({ id: "private-unmapped" })),
      "media/ui_recipes.png",
    );
    await page.evaluate(() => document.fonts.load("28px ShikuHand"));
    assert(await page.evaluate(() => document.fonts.check("28px ShikuHand")));
    checks.push(
      "All 454 UI-resolved recipe images decode, unknown private cover uses canonical fallback, shared licensed font loads",
    );
    for (const route of ["today", "recipes", "meals", "pantry", "mine"]) {
      await go(route);
      await page.locator("img").evaluateAll(async (imgs) => {
        await Promise.all(
          imgs.map((img) => {
            img.loading = "eager";
            return img.decode().catch(() => {});
          }),
        );
      });
      const broken = await page
        .locator("img")
        .evaluateAll((imgs) =>
          imgs
            .filter((img) => !img.naturalWidth)
            .map((img) => img.getAttribute("src")),
        );
      assert.deepEqual(broken, [], "Broken illustrations on " + route);
      assert(await page.locator("nav").isVisible());
    }
    await shot("android-host-mine.png", "原版插画与设置图标");
    await go("recipe");
    assert(await page.locator("nav").isHidden());
    assert(await page.locator("#page-header").isVisible());
    checks.push(
      "Five main routes display original illustrations and bottom tabs; subpages show back header",
    );
    await go("today");
    await shot("android-host-today.png", "今日与模式入口");
    checks.push(
      "454 actual catalog and today UI initialized from real SQLite adapter",
    );
    await go("pantry");
    await page.locator("details summary").last().click();
    await click("foodTemplate", "0");
    await page.locator("[name=quantity]").fill("8");
    await submit();
    assert.equal(
      await page.evaluate(() => __kaifan.store.state.foods[0].name),
      "鸡蛋",
    );
    assert.equal(
      await page.evaluate(() => __kaifan.store.state.changes.length),
      1,
    );
    checks.push("Template opens confirmation form, saves stock with outbox");
    await go("shopping");
    await click("shoppingNew");
    await page.locator("[name=name]").fill("西红柿");
    await page.locator("[name=quantity]").fill("2");
    await page.locator("[name=category]").selectOption("蔬菜");
    await submit();
    await click("purchase");
    await page.locator("[name=price]").fill("6.5");
    await submit();
    assert.equal(
      await page.evaluate(() => __kaifan.store.state.foods.length),
      2,
    );
    assert(
      await page.evaluate(() => __kaifan.store.state.shopping[0].purchased),
    );
    checks.push(
      "UI purchase confirmation saves stock, purchase price and purchased marker atomically",
    );
    await go("search");
    await page.locator("[name=search]").fill("番茄炒蛋");
    await submit();
    await click("recipe", "tomato-eggs");
    assert((await page.locator("main").textContent()).includes("完整做法"));
    await click("favorite");
    await click("addCollection", "tomato-eggs");
    await shot("android-host-recipe.png", "做法、份量与收藏");
    await click("startGuide", "tomato-eggs");
    await click("guideStep", "1");
    assert(
      await page
        .evaluate(() => __kaifan.store.getSetting("androidUtility", ""))
        .then((s) => JSON.parse(s).progress[0].step === 1),
    );
    await go("recipe");
    await page.locator(".portion-panel > summary").click();
    await click("mealRecipe", "tomato-eggs");
    await page.locator("[name=estimatedCost]").fill("12.34");
    await page.locator("[name=costType]").selectOption("实付");
    await submit();
    assert.equal(
      await page.evaluate(() => __kaifan.store.state.meals.length),
      1,
    );
    checks.push(
      "Recipe search/detail, favorite/collection, persisted cook progress and meal save",
    );
    await go("stats");
    assert((await page.locator("main").textContent()).includes("¥12.34"));
    await shot("android-host-stats.png", "真实记餐费用统计");
    checks.push("Paid amount rendered without cent/unit error");
    await go("recipes");
    await click("recipe", "tomato-eggs");
    await click("planRecipe", "tomato-eggs");
    await submit();
    await go("plans");
    await click("weekProcurement");
    assert((await page.locator("main").textContent()).includes("先核对"));
    checks.push("UI meal plan and week procurement use current real stock");
    await go("timers");
    await submit();
    assert.equal(adapter.alarms.size, 1);
    assert.equal(await page.locator("[data-deadline]").count(), 1);
    await page.reload();
    if(responsiveOnly||backOnly||parityInput){
      await page.waitForFunction(()=>window.__kaifan||document.querySelector('[data-action="legalLocal"]'));
      if(!await page.evaluate(()=>!!window.__kaifan))await page.locator('[data-action="legalLocal"]').click();
    }
    await page.waitForFunction(() => window.__kaifan);
    await go("timers");
    assert.equal(await page.locator("[data-deadline]").count(), 1);
    checks.push(
      "Timer deadlines persist across UI reload (system alarm represented by explicit host adapter)",
    );
    for (const p of [
      "today",
      "pantry",
      "shopping",
      "recipes",
      "meals",
      "stats",
      "plans",
      "timers",
      "mine",
      "account",
      "families",
      "devices",
      "profile",
      "community",
      "collections",
    ]) {
      await go(p);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        "overflow " + p,
      );
      assert(
        !(await page.locator("main").textContent()).includes(
          "这一页暂时没打开",
        ),
        "render " + p,
      );
    }
    await go("pantry");
    await shot("android-host-pantry.png", "食材状态与采购入口");
    checks.push(
      "15 routes at 390px no document overflow or rendering exceptions",
    );
    await go("preferences");
    await page.locator("[name=theme]").selectOption("dark");
    await submit();
    assert(
      await page.locator("body").evaluate((b) => b.classList.contains("dark")),
    );
    await go("today");
    await page.setViewportSize({ width: 844, height: 390 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    checks.push("Theme preference and landscape viewport");
    await page.setViewportSize({ width: 390, height: 844 });
    await go("pantry");
    await click("foodNew");
    await page.locator("[name=name]").fill("待保存草稿");
    await page.waitForTimeout(350);
    await go("today");
    await page.reload();
    if(responsiveOnly||backOnly||parityInput){
      await page.waitForFunction(()=>window.__kaifan||document.querySelector('[data-action="legalLocal"]'));
      if(!await page.evaluate(()=>!!window.__kaifan))await page.locator('[data-action="legalLocal"]').click();
    }
    await page.waitForFunction(() => window.__kaifan);
    await click("restoreDraft");
    assert.equal(await page.locator("[name=name]").inputValue(), "待保存草稿");
    await submit();
    await page.locator("[name=expiryDate]").fill("2099-12-31");
    await submit();
    assert.equal(
      await page.evaluate(() => __kaifan.store.getSetting("androidDraft", "")),
      "null",
    );
    checks.push(
      "Unsaved form draft survives reload in active account and is cleared only after successful save",
    );
    await go("filters");
    await click("filterSection", "时间");
    await page.locator("[name=maxMinutes]").fill("30");
    await click("draftFilter", "maxMinutes|30");
    assert.equal(await page.locator("[name=maxMinutes]").inputValue(), "30");
    checks.push("Filter numeric input retained across chip rerender");
    // Interaction parity: a cancelled draft must never alter the applied list.
    await go("recipes");
    await page.evaluate(() => {
      filter = new F.RecipeFilterOptions();
      render();
    });
    await go("filters");
    await click("filterSection", "时间");
    await page.locator("[name=maxMinutes]").fill("15");
    await click("filterSection", "餐次");
    await click("draftFilter", "occasions|breakfast");
    await click("back");
    assert.equal(await page.evaluate(() => filter.maxMinutes), 0);
    assert.deepEqual(await page.evaluate(() => filter.occasions), []);
    await go("filters");
    await click("filterSection", "时间");
    await page.locator("[name=maxMinutes]").fill("30");
    await click("filterSection", "餐次");
    await click("draftFilter", "occasions|breakfast");
    await click("filterApply");
    assert.equal(await page.evaluate(() => filter.maxMinutes), 30);
    assert.deepEqual(await page.evaluate(() => filter.occasions), [
      "breakfast",
    ]);
    checks.push(
      "Independent filter draft: cancelling preserves applied list; apply combines time and meal occasion",
    );
    await go("filters");
    for (const section of ["食材", "类别", "餐次", "菜系", "地区", "口味", "目标", "时间", "预算", "难度", "排序"]) {
      await click("filterSection", section);
      const state = await page.evaluate(() => {
        const panel = document.querySelector(".filter-panel");
        const buttons = [...document.querySelectorAll('.filter-panel button[aria-pressed], .filter-tabs button[aria-pressed]')];
        return {
          checkboxes: panel.querySelectorAll('input[type="checkbox"]').length,
          invalid: buttons.filter(b => {
            const s = getComputedStyle(b);
            const pseudo = ["::before", "::after"].map(p => getComputedStyle(b, p).content).join("");
            return /[✓✔☑]/u.test(b.textContent + pseudo) || s.textAlign !== "center" || b.getAttribute("aria-pressed") !== String(b.classList.contains("active"));
          }).length,
        };
      });
      assert.deepEqual(state, {checkboxes: 0, invalid: 0}, section);
    }
    const beforeFavorite = await page.evaluate(() => filterOnlyFav);
    await click("draftFavorites");
    assert.equal(await page.locator('[data-action="draftFavorites"]').getAttribute("aria-pressed"), String(!beforeFavorite));
    await click("back");
    assert.equal(await page.evaluate(() => filterOnlyFav), beforeFavorite);
    checks.push("All 11 filter sections: no checkmarks or checkbox prefixes, centered text, accessible selection and cancelled favorites draft preserved");
    await go("today");
    await click("monthToggle");
    assert.equal(await page.locator(".month-grid button").count(), 30);
    await click("monthMove", "1");
    assert.equal(await page.locator(".month-grid button").count(), 31);
    await click("monthMove", "-1");
    const selectedDay = await page
      .locator(".month-grid button")
      .first()
      .getAttribute("data-value");
    await click("homeDay", selectedDay);
    assert.equal(await page.evaluate(() => date), selectedDay);
    checks.push(
      "Month calendar handles month length, month navigation and selected date",
    );
    await go("mine");
    assert.equal(await page.locator(".settings-grid .setting-tile").count(), 7);
    await click("settingsGroup", "食材管理");
    await page.locator("[name=shelfDays]").fill("12");
    await page.locator("[name=warningDays]").fill("2");
    await submit();
    await go("pantry");
    await click("foodNew");
    await page.locator("[name=name]").fill("默认值验证食材");
    await submit();
    assert.equal(
      await page.locator("[name=expiryDate]").inputValue(),
      await page.evaluate(() => D.shiftDay(M.dateString(new Date()), 12)),
    );
    await go("mine");
    await click("settingsGroup", "外观与动效");
    await page.locator("[name=theme]").selectOption("light");
    await page.locator("[name=reducedMotion]").check();
    await submit();
    assert(
      await page
        .locator("body")
        .evaluate((b) => b.classList.contains("reduced-motion")),
    );
    checks.push(
      "Seven canonical settings groups; saved food defaults apply to new food; reduced motion preference works",
    );
    await go("today");
    await click("mealNew", "早餐");
    await click("dishEdit", "-1");
    await page.locator("[name=dishName]").fill("测试早餐甲");
    await page.locator("[name=dishCost]").fill("7.25");
    await submit();
    await click("dishEdit", "-1");
    await page.locator("[name=dishName]").fill("测试早餐乙");
    await page.locator("[name=dishCost]").fill("2.75");
    await submit();
    await page.locator("[name=costType]").selectOption("实付");
    await page.locator('details').filter({has:page.locator('[data-action="mealRating"]')}).evaluate(el=>el.open=true);
    await click("mealRating","4");
    await submit();
    const multi = await page.evaluate(() =>
      __kaifan.store.state.meals.find(
        (m) => m.name === "测试早餐甲、测试早餐乙",
      ),
    );
    assert.equal(multi.rating,4);
    assert.equal(multi.items.length, 2);
    assert.equal(multi.estimatedCost, 10);
    await click("mealEdit", multi.id);
    assert.equal(await page.locator(".meal-dishes .card").count(), 2);
    checks.push(
      "Multi-dish meal editing saves both items and four-star rating, sums integer-cents cost and reloads without losing dishes",
    );
    await go("draw");
    await click("drawPreset", "soup-only");
    await page.locator("[name=minutes]").fill("0");
    await page.locator("[name=budget]").fill("0");
    await page.locator("form button[type=submit]").click();
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => __kaifan.page), "drawResult");
    const soup = await page.evaluate(() =>
      drawResult.ids.map((id) =>
        __kaifan.allRecipes().find((r) => r.id === id),
      ),
    );
    assert.equal(soup.length, 1);
    assert.equal(soup[0].category, "汤类");
    await click("drawTab", "备料");
    assert(await page.locator("main").textContent());
    checks.push(
      "Six canonical draw presets; soup-only yields one actual soup in independent result and preparation view",
    );
    await go("recovery");assert.equal(await page.locator('[data-submit="requestReset"],[data-submit="confirmReset"]').count(),0);checks.push('Retired recovery route shows account help without email/reset challenge forms');
    // Actual existing SQLite data powers the new status and shopping modes.
    await go("syncStatus");
    const counts = await page.evaluate(() => ({s: androidSyncSummary(), expected: new Set(store.state.changes.map(c => c.entityType + ":" + c.entityId)).size}));
    assert.equal(counts.s.pending, counts.expected);
    assert.equal(await page.locator(".sync-counts dd").first().textContent(), String(counts.expected));
    assert((await page.locator("main").textContent()).includes("尚无成功记录"));
    await go("shopping");
    const shoppingBefore = await page.evaluate(() => JSON.stringify(store.state.shopping));
    await click("supermarket", "true");
    assert.equal(await page.locator("h1").textContent(), "超市采购");
    assert.equal(await page.locator(".market-item").count(), await page.evaluate(() => store.state.shopping.length));
    assert.equal(await page.locator("main > details").getAttribute("open"), null);
    await click("supermarket", "false");
    assert.equal(await page.evaluate(() => JSON.stringify(store.state.shopping)), shoppingBefore);
    checks.push("Sync status uses unique real outbox counts; supermarket toggling never mutates stock or purchase state and completed rows start collapsed");
    const preparedId = await page.evaluate(() => allRecipes().find(r => r.ingredients.some(i => !i.optional)).id);
    await page.evaluate(async id => { await actions("recipe", id); }, preparedId);
    const ingredientName = await page.evaluate(() => currentRecipe().ingredients.find(i => !i.optional).name);
    await page.evaluate(async name => { await actions("prepareName", name); }, ingredientName);
    await page.reload();
    if(responsiveOnly||backOnly||parityInput){
      await page.waitForFunction(()=>window.__kaifan||document.querySelector('[data-action="legalLocal"]'));
      if(!await page.evaluate(()=>!!window.__kaifan))await page.locator('[data-action="legalLocal"]').click();
    }
    await page.waitForFunction(() => window.__kaifan);
    await page.evaluate(async id => { await actions("recipe", id); }, preparedId);
    assert(await page.evaluate(name => parity.preparedNames.includes(name), ingredientName));
    assert.equal(await page.locator(".quality-details").count(), 1);
    checks.push("Preparation checklist persists through page reload and recipe quality uses actual ingredient/source fields");
    const profileContract = await page.evaluate(async () => {
      const originalApi = api, session = cloud.session, originalProfile = profileData;
      const cache = await store.getSetting("profileCache", "null");
      const calls = [];
      const profile = {displayName:"头像检查", avatarPreset:"rice", avatarId:"test-avatar", regionCode:"310000", version:7};
      api = async (path, method, body) => {
        calls.push({path, method, body});
        if (path.startsWith("/account/avatar/")) return {url:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nKgAAAAASUVORK5CYII="};
        return {...profile, ...(body || {}), avatarId: body?.avatarMode === "preset" ? "" : profile.avatarId};
      };
      try {
        cloud.session = {...session, accessToken:"isolated-test-only", userId:"isolated-profile"};
        await loadAndroidProfile();
        const customDisplayed = profileAvatarView(profileData).includes("data:image/png");
        await actions("profilePreset", "cat");
        __kaifan.go("profile");
        await submit("profile");
        return {customDisplayed, patch: calls.find(c => c.path === "/account/profile/update")};
      } finally {
        api = originalApi; cloud.session = session; profileData = originalProfile;
        parity.profileAvatar = ""; parity.avatarMode = "keep";
        await store.setting("profileCache", cache);
      }
    });
    assert(profileContract.customDisplayed);
    assert.equal(profileContract.patch.body.avatarMode, "preset");
    assert.equal(profileContract.patch.body.avatarPreset, "cat");
    assert.equal(profileContract.patch.body.version, 7);
    checks.push("Custom avatar signed URL hydrates and selecting a built-in avatar sends explicit preset mode and profile version (isolated API contract)");
    await go("mine");
    assert.equal(await page.locator('nav [aria-current="page"]').getAttribute("data-value"), "mine");
    await go("profile");
    assert.equal(await page.locator('.avatar-choices button[aria-label][aria-pressed]').count(), 4);
    await go("pantry");
    assert.equal(await page.locator('[data-action="foodNew"]').getAttribute("aria-label"), "添加食材");
    await page.evaluate(() => document.documentElement.style.fontSize = "200%");
    for (const route of ["pantry", "shopping", "syncStatus", "mine"]) {
      await go(route);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + " large-font overflow");
    }
    await page.evaluate(() => document.documentElement.style.fontSize = "");
    checks.push("Navigation current-page semantics, named avatar choices and add-food control; large-font key routes have no horizontal overflow (TalkBack device audit pending)");
    const financeMeal = await page.evaluate(async () => {
      await actions("mealNew","晚餐");
      for (const [name,value] of Object.entries({name:"分摊与试做检查",financeFood:"10",deliveryFee:"2",discount:"1",splitPeople:"3",personalShares:"1",trialOutcome:"成功",actualMinutes:"25",trialSubstitution:"西兰花改菜花",trialFailure:"切块小些更易熟",leftoverPortions:"1"})) document.querySelector(`[name="${name}"]`).value=value;
      await submit("meal");
      return store.state.meals.find(m => m.name === "分摊与试做检查");
    });
    assert.equal(financeMeal.personalCost,3.66);assert.equal(financeMeal.mealTotal,11);assert.equal(financeMeal.actualMinutes,25);
    await page.evaluate(async id => { await actions("leftoverPlan",id); },financeMeal.id);
    assert.equal(await page.locator('[name="mode"]').inputValue(),"吃剩菜");
    const beforeLeftovers = await page.evaluate(() => ({shopping:JSON.stringify(store.state.shopping),meals:store.state.meals.length}));
    await page.evaluate(async () => { await submit("plan"); });
    const leftoverState=await page.evaluate(id=>({p:store.state.plans.find(p=>p.sourceMealId===id),shopping:JSON.stringify(store.state.shopping),meals:store.state.meals.length}),financeMeal.id);
    assert.equal(leftoverState.p.remainingPortions,1);assert.equal(leftoverState.shopping,beforeLeftovers.shopping);assert.equal(leftoverState.meals,beforeLeftovers.meals);
    await page.locator("summary").filter({hasText:"剩菜食用记录"}).click();
    await click("leftoverEaten",leftoverState.p.id);
    const eaten=await page.evaluate(id=>store.state.meals.find(m=>m.id===id),leftoverState.p.id);
    assert.equal(eaten.estimatedCost,0);assert.equal(eaten.diningMode,"在家做");assert(eaten.tags.includes("剩菜"));
    checks.push("Finance/trial fields persist, integer-cent personal split is correct, and linked leftovers planning creates no purchase or duplicate meal");
    await go("batchFoods");
    await click("batchChoose","0");
    await page.locator('[name="batchQty0"]').fill("3");
    const hasSecond = await page.locator('[data-action="batchChoose"][data-value="1"]').count();
    if (hasSecond) { await click("batchChoose","1"); assert.equal(await page.locator('[name="batchQty0"]').inputValue(),"3"); }
    const batchBefore=await page.evaluate(()=>store.state.foods.length);
    const rows=await page.evaluate(()=>daily.rows.length);
    await page.evaluate(async()=>{await submit("batchFoods");});
    assert.equal(await page.evaluate(()=>store.state.foods.length),batchBefore+rows);
    const opened = await page.evaluate(async()=>{
      const f=store.state.foods.at(-1); await actions("foodEdit",f.id);
      document.querySelector('[name="openedAt"]').value="2026-11-05";
      document.querySelector('[name="openedExpiry"]').value="2026-11-06";
      const original=foodDraft.expiryDate;
      await submit("food");
      return {saved:store.state.foods.find(v=>v.id===f.id),original};
    });
    assert.equal(opened.saved.openedAt,"2026-11-05");assert.equal(opened.saved.openedExpiry,"2026-11-06");assert.equal(opened.saved.expiryDate,opened.original);
    checks.push("Frequent-food batch form retains edited rows when adding candidates; opened dates persist while original expiry is retained");
    const householdFilter=await page.evaluate(()=>{
      const previous=daily.household;
      try {
        daily.household={members:[{enabled:true,name:"测试成员",appetite:1,excluded:["鸡蛋"]}]};
        const recipe=allRecipes().find(r=>r.ingredients.some(i=>R.canonicalName(i.name)===R.canonicalName("鸡蛋")));
        return {recipe:recipe.id,count:F.filterRecipes([recipe],new F.RecipeFilterOptions(),store.state.foods,M.dateString(new Date())).length,excluded:recipeOptions().excluded};
      } finally { daily.household=previous; }
    });
    assert.equal(householdFilter.count,0);assert(householdFilter.excluded.includes("鸡蛋"));
    checks.push("Enabled household exclusions remain hard restrictions in filter adapter and personalized recipe options");
    const migrated = await page.evaluate(async()=>{
      const originalNative=P.nativeAsync, originalSession=cloud.session;
      const id=P.invoke("uuid");
      P.nativeAsync=async action=>{if(action!=="import")throw Error("unexpected platform request");return JSON.stringify({foods:[],shopping:[],meals:[{id,name:"访客迁入检查",date:new Date().toISOString(),estimatedCost:0,localPhoto:"private-old-photo",photoId:"old-cloud-id",cloudPhoto:"https://example.invalid/private"}]});};
      try {
        cloud.session={...originalSession,userId:"isolated-migration",accessToken:"isolated-test-only"};
        __kaifan.go("migration");await actions("migrationRead","");const count=daily.migration.total;
        await actions("migrationCommit","");return {count,saved:store.state.meals.find(m=>m.id===id)};
      } finally {P.nativeAsync=originalNative;cloud.session=originalSession;}
    });
    assert.equal(migrated.count,1);assert.equal(migrated.saved.localPhoto,"");assert.equal(migrated.saved.photoId,"");assert.equal(migrated.saved.cloudPhoto,"");
    checks.push("Explicit backup migration previews and imports into current local space with photo identifiers removed; native import and session isolated for test");
    const workspaceReset=await page.evaluate(async()=>{
      const signature=require("WorkspaceCore").workspaceSignature;
      const original=await store.workspacePayload();
      await setting("cookPreference",{homeRegion:"旧Android地区",goal:"高蛋白",learning:false});
      experience.collections=[{name:"旧Android收藏夹",ids:[]}];await saveExperience();
      await store.applyWorkspace({version:50,payload:{format:1,plans:[],preferences:{}}},signature(await store.workspacePayload()));
      await loadSettings();
      const cleared={collections:experience.collections.length,region:settings.cookPreference.homeRegion,learning:settings.cookPreference.learning};
      await store.applyWorkspace({version:51,payload:original},signature(await store.workspacePayload()));await loadSettings();
      return cleared;
    });
    assert.deepEqual(workspaceReset,{collections:0,region:"",learning:true});
    checks.push("Downloading an empty workspace clears prior Android aliases rather than resurrecting stale collections or preferences");
    await go("today");
    assert.equal(await page.locator('[data-action="quickMeal"]').count(),4);
    const quickBefore=await page.evaluate(()=>({meals:store.state.meals.length,foods:JSON.stringify(store.state.foods)}));
    await page.evaluate(()=>{date=D.shiftDay(M.dateString(new Date()),-1);render();});
    const quickDate=await page.evaluate(()=>date);
    await click("quickMeal","加餐");
    assert.equal(await page.locator('[name="mealType"]').inputValue(),"加餐");
    assert.equal(await page.evaluate(()=>M.dateString(new Date(mealDraft.date))),quickDate);
    assert.equal(await page.evaluate(()=>store.state.meals.length),quickBefore.meals);
    assert.equal(await page.evaluate(()=>JSON.stringify(store.state.foods)),quickBefore.foods);
    await page.evaluate(()=>{date=D.shiftDay(M.dateString(new Date()),1);});
    await go("today");assert.equal(await page.locator('[data-action="quickMeal"]').count(),0);
    await page.evaluate(()=>{date=M.dateString(new Date());});
    checks.push("Four home meal shortcuts create editable drafts for selected historical date without data writes; future dates retain planning only");
    await go("stockHistory");
    await click("historyKind","consumed");
    assert.equal(await page.locator('[data-action="historyKind"][data-value="consumed"]').getAttribute("aria-pressed"),"true");
    const historyCount=await page.evaluate(()=>store.state.foods.filter(f=>(f.movements||[]).some(m=>m.reason==="consumed")).length);
    assert.equal(await page.locator('main article').count(),Math.min(20,historyCount));
    await click("historyKind","all");
    const historyFirst=await page.evaluate(()=>store.state.foods[0]?.name);
    if(historyFirst){await page.locator('[name="historyQuery"]').fill(historyFirst);await page.evaluate(async()=>submit("historySearch"));assert((await page.locator('main').textContent()).includes(historyFirst));}
    checks.push("Stock history filters actual consumed batches, supports search and limits first render to 20 rows");
    await go("profile");
    await page.locator('[data-action="profilePreset"][data-value="rice"]').focus();
    await page.evaluate(()=>render());
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),"rice");
    await go("meal");
    const detail=page.locator('details').filter({has:page.locator('summary').filter({hasText:"费用分项与示例主体分摊"})}).first();
    await detail.locator('summary').click();await page.evaluate(()=>render());assert(await detail.evaluate(el=>el.open));
    checks.push("Same-page rerender preserves focused avatar button and expanded finance panel for keyboard and assistive navigation");
    await page.evaluate(()=>{parity.library=true;filter=new F.RecipeFilterOptions();filterOnlyFav=false;recipePage=1;settings.recipeOrder="rank";});
    await go("recipes");
    assert.equal(await page.locator('.recipe-list-card').count(),24);
    const firstPage=await page.locator('.recipe-list-card .recipe').first().getAttribute('data-value');
    await click("recipePageMove","1");assert.equal(await page.locator('.recipe-list-card').count(),24);
    assert.notEqual(await page.locator('.recipe-list-card .recipe').first().getAttribute('data-value'),firstPage);
    await click("recipePageMove","-1");assert.equal(await page.locator('.recipe-list-card .recipe').first().getAttribute('data-value'),firstPage);
    assert(await page.locator('main #main-search.content-search-icon').isVisible());
    assert.equal(await page.locator('main #main-search').getAttribute('data-value'),'recipe-search');
    await go("filters");await click("filterSection","餐次");
    assert.equal(await page.locator('.occasion-choices img').count(),4);
    assert(await page.locator('.occasion-choices img').evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>img.decode()));return imgs.every(img=>img.naturalWidth>0);}));
    const footer=await page.locator('.filter-actions').boundingBox();assert(footer.y+footer.height>=840);
    assert.equal(await page.locator('main input[type="checkbox"]').count(),0);
    checks.push("Canonical recipe pagination shows 24 distinct rows per page with scrolling content search icon; four occasion illustrations render and checkless filter footer stays at screen bottom");
    const partial=await page.evaluate(async()=>{
      await store.saveShopping(Object.assign(new M.Shopping(),{name:"土豆",quantity:1,unit:"kg"}));return store.state.shopping.find(s=>s.name==="土豆"&&!s.purchased).id;
    });
    await go("shopping");await click("purchase",partial);
    await page.locator('[name="quantity"]').fill("300");await page.locator('[name="purchaseUnit"]').selectOption("g");await page.locator('[name="price"]').fill("2");
    await page.evaluate(async()=>submit("purchase"));
    assert.equal(await page.evaluate(id=>store.state.shopping.find(s=>s.id===id).quantity,partial),.7);
    assert.equal(await page.evaluate(id=>store.state.shopping.find(s=>s.id===id).purchased,partial),false);
    await click("purchase",partial);
    const stale=await page.evaluate(async id=>{
      const item=store.state.shopping.find(s=>s.id===id);await store.atomic(async()=>{await store.persist("shopping_list",id,JSON.stringify({...item,quantity:.6}));});
      const before=store.exportData();try{await submit("purchase");return {rejected:false};}catch(e){return {rejected:/变化/.test(e.message),unchanged:before===store.exportData()};}
    },partial);assert.deepEqual(stale,{rejected:true,unchanged:true});
    checks.push("Actual partial purchase UI converts 300g from 1kg and retains 0.7kg; same-timestamp shopping change invalidates open form without writes");
    await page.evaluate(()=>actions("mealNew","午餐"));
    await page.locator('[name="name"]').fill("份量回归餐");
    await page.evaluate(()=>document.querySelector('[name="calories"]').closest("details").open=true);
    await page.locator('[name="calories"]').fill("600");await page.locator('[name="consumedFraction"]').fill("0.5");await page.locator('[name="energySource"]').selectOption("包装标签");
    assert((await page.locator('[data-energy-preview]').textContent()).includes("300"));
    await page.evaluate(async()=>submit("meal"));
    const energy=await page.evaluate(()=>store.state.meals.find(m=>m.name==="份量回归餐"));
    assert.equal(energy.calories,300);assert.equal(energy.energyReference,600);assert.equal(energy.consumedFraction,.5);assert.equal(energy.calorieSource,"包装标签");
    await page.evaluate(id=>actions("mealEdit",id),energy.id);
    assert.equal(await page.locator('[name="calories"]').inputValue(),"600");
    await page.evaluate(async()=>submit("meal"));assert.equal(await page.evaluate(id=>store.state.meals.find(m=>m.id===id).calories,energy.id),300);
    checks.push("Meal portion UI previews and persists 600kcal × 0.5 = 300kcal with label source; reopening and saving does not multiply twice");
    const skip=await page.evaluate(async()=>{
      const r=allRecipes()[0],before=store.feedback.length,permanent=JSON.stringify(settings.drawDisliked||[]);intent="cook";parity.library=false;filter=new F.RecipeFilterOptions();filterOnlyFav=false;collectionIndex=-1;await actions("skipToday",r.id);
      const cook=filteredRecipes().some(v=>v.id===r.id);intent="record";const record=filteredRecipes().some(v=>v.id===r.id);
      intent="cook";parity.library=true;const library=filteredRecipes().some(v=>v.id===r.id);
      parity.library=false;filter.search=r.name;const searched=filteredRecipes().some(v=>v.id===r.id);filter.search="";
      const result={cook,record,library,searched,noLearning:store.feedback.length===before,noPermanent:JSON.stringify(settings.drawDisliked||[])===permanent};
      convenience.skips=[];await setting("temporarySkips:v1",[]);intent="cook";parity.library=true;return result;
    });assert.deepEqual(skip,{cook:false,record:true,library:true,searched:true,noLearning:true,noPermanent:true});
    checks.push("Today skip affects recommendations in its scene while keeping full library and explicit search visible; no long-term exclusions or learning writes");
    await page.evaluate(()=>{
      const local={format:1,plans:[],preferences:{homeRegion:"本机地区"}},remote={format:1,plans:[],preferences:{homeRegion:"云端地区"}};
      daily.workspace={local,remote:{version:1,payload:remote},localRevision:require("WorkspaceCore").workspaceSignature(local),conflict:true};go("workspace");
    });
    await click("workspaceMergePreview");
    assert.equal(await page.locator('[data-action="workspaceMergeChoice"][aria-pressed="true"]').count(),0);
    await click("workspaceMergeChoice","0|remote");
    assert.equal(await page.locator('[data-action="workspaceMergeChoice"][data-value="0|remote"]').getAttribute("aria-pressed"),"true");
    assert.equal(await page.locator('[data-action="workspaceMergeChoice"][data-value="0|local"]').getAttribute("aria-pressed"),"false");
    assert.equal(await page.evaluate(()=>WorkspaceMerge.mergedWorkspace(convenience.mergeRows).preferences.homeRegion),"云端地区");
    checks.push("Per-item workspace UI starts unresolved conflicts unselected and exposes explicit accessible local/remote choices");
    await page.evaluate(()=>{parity.drawOptions=null;intent="cook";go("draw");});
    await page.locator('.draw-options>summary').click();await page.locator('[name="drawParallel"]').check();await page.locator('[name="drawBalanced"]').check();
    await page.evaluate(async()=>submit("drawFull"));
    assert.deepEqual(await page.evaluate(()=>({mode:drawState().timeMode,balance:drawState().balance})),{mode:"parallel",balance:true});
    checks.push("Whole-meal draw UI passes parallel mode and balance choice to shared draw logic");
    const correction=await page.evaluate(async()=>{
      selected=store.builtinRecipes[0].id;const original=JSON.stringify(findRecipe(selected)),old=cloud.request,token=cloud.session.accessToken,requests=[];
      cloud.request=async(path,method,body)=>{requests.push({path,method,body});return JSON.stringify({accepted:true});};cloud.session.accessToken="isolated-ui-test";
      try{go("recipeCorrection");document.querySelector('[name="correctionCategory"]').value="时间";document.querySelector('[name="correctionDetail"]').value="备菜时间需核对";await submit("recipeCorrection");return {request:requests[0],unchanged:JSON.stringify(findRecipe(selected))===original};}
      finally{cloud.request=old;cloud.session.accessToken=token;}
    });assert.equal(correction.request.path,"/catalog/corrections");assert.equal(correction.request.body.category,"时间");assert(correction.unchanged);
    checks.push("Recipe correction submits authenticated queue DTO through isolated HTTP stub and leaves original recipe intact");
    await go("mine");assert.equal(await page.locator('.app-version').textContent(),expectedVersionLabel);
    checks.push("Installed-version label comes from packaged manifest metadata rather than a separately hardcoded UI version");
    const homePlan=await page.evaluate(async()=>{
      date=M.dateString(new Date());await store.saveMealPlan(Object.assign(new(require("MealPlan").MealPlan)(),{date,occasion:"早餐",mode:"外食",note:"首页计划可见回归",people:2}));go("today");return store.state.plans.find(p=>p.note==="首页计划可见回归").id;
    });
    assert((await page.locator('.meal-card.meal-早餐').textContent()).includes("首页计划可见回归"));
    assert.equal(await page.locator('.meal-card.meal-早餐 [data-action="planNew"]').count(),1);
    await page.evaluate(()=>{date=D.shiftDay(M.dateString(new Date()),-1);render();});
    if(await page.locator('.recent-meal-strip [data-action="mealRepeat"]').count()){
      const repeatDate=await page.evaluate(()=>date);await page.locator('.recent-meal-strip [data-action="mealRepeat"]').first().click();
      assert.equal(await page.evaluate(()=>M.dateString(new Date(mealDraft.date))),repeatDate);
    }
    await page.evaluate(()=>{date=M.dateString(new Date());go("today");});await shot("android-host-today.png","正式顶部搜索/三餐计划/快捷复用布局");
    checks.push("Home meal cards display saved plans with planning entry; recent-meal reuse respects selected historical date and remains editable");


    await page.evaluate(async()=>{
      await store.saveMeal(Object.assign(new M.Meal(),{name:"=分摊统计回归",date:"2020-01-02T12:00:00",mealType:"午餐",diningMode:"在家做",costType:"实付",estimatedCost:20,financeFood:20,splitPeople:4,personalShares:1,mealTotal:20,personalCost:5,calories:300,energyReference:600,consumedFraction:.5,calorieSource:"包装标签",tags:"统计核对"}));
      date="2020-01-02";settings.statsSpan="day";go("stats");
    });
    assert((await page.locator('.stats-occasion[data-occasion="午餐"]').textContent()).includes("¥5.00"));
    assert((await page.locator('.stats-tag[data-tag="统计核对"]').textContent()).includes("¥5.00"));
    await click("exportMeals");
    const exported=adapter.exports.at(-1).text;
    assert(exported.includes("示例主体花费,实际热量kcal,热量来源,整份参考热量,食用比例"));
    assert(exported.includes('"20","5","300","包装标签","600","0.5"'));
    assert(exported.includes('"\'=分摊统计回归"'));assert.equal(exported.split("\r\n").length,2);
    await page.evaluate(()=>{date=M.dateString(new Date());settings.statsSpan="week";});
    checks.push("Stats by occasion and tag use personal share; current-period CSV includes actual kcal/source/fraction, excludes other dates and escapes formula cells");
    {
      await page.evaluate(async()=>{selected="tomato-eggs";await actions("startGuide",selected);});
      assert.equal(await page.locator('#page-header .recipe-toolbar-title').textContent(),await page.evaluate(()=>currentRecipe().name));
      assert.equal(await page.locator('#page-header [data-action="favorite"]').count(),1);
      await page.evaluate(async()=>{progress.step=0;await storeProgress();render();});
      assert(await page.locator('[data-action="guideStep"][data-value="-1"]').isDisabled());
      assert.equal(await page.locator('.current-step-ingredients').count(),1);
      const cookingStock=await page.evaluate(()=>JSON.stringify(store.state.foods));
      const stepDone=await page.locator('[data-action="stepComplete"]').getAttribute('aria-pressed');
      await click("stepComplete","0");assert.notEqual(await page.locator('[data-action="stepComplete"]').getAttribute('aria-pressed'),stepDone);
      await page.locator('.guide-preparation summary').click();
      const prepared=page.locator('.guide-preparation [data-action="prepareName"]').first();
      const preparedName=await prepared.getAttribute('data-value');await prepared.click();
      const preparedState=await prepared.getAttribute('aria-pressed');
      await click("guideStep","1");
      await page.reload();await page.waitForFunction(()=>window.__kaifan);
      await page.evaluate(async()=>{await actions("recipe","tomato-eggs");await actions("startGuide","tomato-eggs");});
      assert((await page.locator('[data-guide-position]').textContent()).includes("2 /"));
      await page.locator('.guide-preparation summary').click();
      assert.equal(await page.locator('.guide-preparation [data-action="prepareName"]').filter({hasText:preparedState==="true"?"已备好":"备好了"}).count()>0,true);
      assert.equal(await page.locator(`.guide-preparation [data-value="${preparedName}"]`).getAttribute('aria-pressed'),preparedState);
      await click("quickTimer","5");await click("quickTimer","10");
      const timerRows=await page.locator('.guide-active-timers article').count();assert(timerRows>=2);
      const timerId=await page.locator('.guide-active-timers [data-action="cancelTimer"]').last().getAttribute('data-value');
      await click("cancelTimer",timerId);assert.equal(await page.locator('.guide-active-timers article').count(),timerRows-1);assert(!adapter.alarms.has(timerId));
      assert.equal(await page.evaluate(()=>JSON.stringify(store.state.foods)),cookingStock);
      await page.evaluate(async()=>{progress.step=G.buildCookingGuide(currentRecipe()).steps.length-1;await storeProgress();render();});
      assert(await page.locator('[data-action="guideStep"][data-value="1"]').isDisabled());
      await shot("android-host-guide.png","烹饪步骤、材料、可就地停止的多计时与恢复");
      await go("stockHistory");assert.equal(await page.locator('#page-header [data-value="timers"]').count(),0);
      await go("recipes");
      await click("recipeMore");assert.equal(await page.locator('[data-action="recipeMore"]').getAttribute('aria-expanded'),"true");
      await click("recipeMore");assert.equal(await page.locator('[data-action="recipeMore"]').getAttribute('aria-expanded'),"false");
      await click("libraryMode","false");assert.equal(await page.locator('[data-action="libraryMode"][data-value="true"]').getAttribute('aria-pressed'),"false");
      checks.push("Cooking UI: canonical recipe toolbar, bounded steps, visible step ingredients, persisted preparation/step restoration, multiple stoppable timers, no inventory writes and explicit collapsed/inactive semantics");
      await page.evaluate(async()=>{
        await store.saveFood(Object.assign(new M.Food(),{name:"跨字段搜索验证",quantity:2,unit:"个",expiryDate:"2099-10-11",purchasedAt:"2026-11-06",location:"冷藏室",notes:"原始备注查找",tags:"搜索标签验证"}));
        parity.pantryCategory="全部";parity.pantryLocation="全部";searchText="";go("pantry");
      });
      for(const query of ["原始备注查找","搜索标签验证","2099-10-11"]){
        await page.locator('[name="query"]').fill(query);await page.evaluate(async()=>submit("pantrySearch"));
        assert((await page.locator('.food-card').textContent()).includes("跨字段搜索验证"));
      }
      assert.equal(await page.locator('[name="pantrySort"] option[value="purchased"]').count(),1);
      await page.evaluate(async()=>{
        await store.saveMeal(Object.assign(new M.Meal(),{name:"本地午夜记餐验证",date:"2020-01-02T00:15:00+08:00",mealType:"加餐",estimatedCost:0}));date="2020-01-02";parity.diaryMode="day";parity.diaryDining="";go("meals");
      });
      assert((await page.locator('main').textContent()).includes("本地午夜记餐验证"));
      await page.evaluate(()=>{date=M.dateString(new Date());searchText="";parity.library=true;recipePage=1;filter=new F.RecipeFilterOptions();go("recipes");});
      assert(await page.getByRole('button',{name:"上一页",exact:true}).isDisabled());
      await page.evaluate(()=>{recipePage=Math.ceil(filteredRecipes().length/24);render();});
      assert(await page.getByRole('button',{name:"下一页",exact:true}).isDisabled());
      checks.push("Cooking UI: pantry searches notes/tags/expiry and offers newest-purchase sorting; local-midnight meal remains on selected date and unavailable pagination buttons are disabled");

    }
    // Exercise the new pages through rendered controls and canonical SQLite mutations.
    await page.evaluate(()=>{settings.drawDisliked=[];settings.excluded="";daily.household={members:[]};go("plans");});
    await page.locator('[name="weeklyStart"]').fill("2098-01-03");
    const beforeWeek=await page.evaluate(()=>({plans:JSON.stringify(store.state.plans),foods:JSON.stringify(store.state.foods),shopping:JSON.stringify(store.state.shopping)}));
    await click("livingWeekPreview");
    const proposal=await page.evaluate(()=>living.weekly.plans.length);assert(proposal>0&&proposal<=7);
    assert.equal(await page.locator('[name="weeklyStart"]').inputValue(),"2098-01-03");
    assert(await page.evaluate(()=>living.weekly.plans.every(p=>p.date>=living.weekInputs.start&&p.date<=D.shiftDay(living.weekInputs.start,6)&&p.occasion===living.weekInputs.occasion&&p.people===Number(living.weekInputs.people))));
    await page.evaluate(()=>render());assert.equal(await page.locator('[name="weeklyStart"]').inputValue(),"2098-01-03");
    assert.equal(await page.evaluate(()=>JSON.stringify(store.state.plans)),beforeWeek.plans);
    await shot("android-host-weekly-draft.png","七天安排草案/采用/取消与费用参考");
    await click("livingWeekCancel");assert.equal(await page.locator('.weekly-proposal').count(),0);
    await page.locator('[name="weeklyStart"]').fill("2098-01-03");await click("livingWeekPreview");await click("livingWeekApply");
    assert.equal(await page.evaluate(()=>store.state.plans.filter(p=>p.date>="2098-01-03"&&p.date<="2098-01-09").length),proposal);
    assert.equal(await page.evaluate(()=>JSON.stringify(store.state.foods)),beforeWeek.foods);
    assert.equal(await page.evaluate(()=>JSON.stringify(store.state.shopping)),beforeWeek.shopping);
    const replacementId=await page.evaluate(()=>store.state.plans.find(p=>p.date==="2098-01-03").id);
    await page.evaluate(id=>actions("planEdit",id),replacementId);
    const oldRecipe=await page.evaluate(()=>planDraft.recipeId);
    await click("livingPlanReplace");assert.notEqual(await page.evaluate(()=>planDraft.recipeId),oldRecipe);
    assert.equal(await page.evaluate(()=>JSON.stringify(store.state.foods)),beforeWeek.foods);
    checks.push("Weekly draft preview/cancel never writes; adoption fills up to seven slots; explicit replacement changes recipe without touching stock or shopping");
    await go("plans");await page.locator('[name="weeklyStart"]').fill("2098-02-01");await click("livingWeekPreview");
    const staleWeek=await page.evaluate(async()=>{
      const p=Object.assign(new(require("MealPlan").MealPlan)(),{date:"2098-02-01",recipeId:allRecipes()[0].id,occasion:"晚餐",people:2});await store.saveMealPlan(p);
      const before=store.exportData();try{await actions("livingWeekApply");return {rejected:false};}catch(e){return {rejected:e.message.includes("变化"),unchanged:store.exportData()===before};}
    });assert.deepEqual(staleWeek,{rejected:true,unchanged:true});await click("livingWeekCancel");
    checks.push("Stale weekly proposal rejects atomically after concurrent plan change");

    const fixtureMeal=await page.evaluate(async()=>{
      const m=Object.assign(new M.Meal(),{name:"新页面验收原餐",date:new Date().toISOString(),mealType:"午餐",diningMode:"餐馆",place:"常去小馆",estimatedCost:40,costType:"实付",financeFood:40,deliveryFee:4,discount:4,splitPeople:2,personalShares:1,mealTotal:40,personalCost:20,calories:360,calorieSource:"包装标签"});await store.saveMeal(m);return m.id;
    });
    await page.evaluate(id=>actions("mealEdit",id),fixtureMeal);await page.locator('.leftover-form summary').click();
    await page.locator('[name="leftoverCount"]').fill("2.5");await page.locator('[name="leftoverContainer"]').fill("蓝色饭盒");await page.locator('[name="leftoverStorage"]').selectOption("冷冻");
    const foodBeforeLeftover=await page.evaluate(()=>JSON.stringify(store.state.foods));
    await click("livingLeftoverSave",fixtureMeal);assert.equal(await page.evaluate(()=>page),"leftovers");
    const batchId=await page.evaluate(()=>store.state.leftovers.find(b=>b.name==="新页面验收原餐").id);
    await page.locator('[name="leftoverAmount"]').fill("0.5");await click("livingLeftoverUse",batchId+"|eat");
    assert.equal(await page.evaluate(id=>store.state.leftovers.find(b=>b.id===id).remaining,batchId),2);
    const leftoverEaten=await page.evaluate(()=>store.state.meals.find(m=>m.sourceMealId&&m.name==="新页面验收原餐"));assert.equal(leftoverEaten.personalCost,0);assert.equal(leftoverEaten.sourceMealId,fixtureMeal);
    await page.locator('[name="leftoverAmount"]').fill("0.5");await click("livingLeftoverUse",batchId+"|discard");
    assert.equal(await page.evaluate(id=>store.state.leftovers.find(b=>b.id===id).remaining,batchId),1.5);
    assert.equal(await page.evaluate(()=>JSON.stringify(store.state.foods)),foodBeforeLeftover);
    await shot("android-host-leftovers.png","剩菜存盒、冷冻、分次食用和丢弃记录");
    await page.reload();await page.waitForFunction(()=>window.__kaifan);await go("leftovers");
    assert((await page.locator('.leftover-box').textContent()).includes("1.5/2.5"));
    checks.push("Saved-meal leftover form creates frozen batch; fractional eat/discard persist across reload, link zero-cost meal and leave inventory unchanged");
    await go("meals");await click("go","dining-places");
    assert((await page.locator('.dining-place').textContent()).includes("实付 ¥20.00"));
    await shot("android-host-dining-places.png","常去餐馆、示例主体实付、套餐复用入口");
    const mealCount=await page.evaluate(()=>store.state.meals.length);await click("livingDiningRepeat",fixtureMeal);
    assert.equal(await page.evaluate(()=>store.state.meals.length),mealCount);
    assert.deepEqual(await page.evaluate(()=>({id:mealDraft.id,financeFood:mealDraft.financeFood,splitPeople:mealDraft.splitPeople,deliveryFee:mealDraft.deliveryFee,discount:mealDraft.discount,personalCost:mealDraft.personalCost})),{id:"",financeFood:40,splitPeople:2,deliveryFee:4,discount:4,personalCost:20});
    await go("stats");assert((await page.locator('.nutrition-week').textContent()).includes("空白不计为零"));
    await shot("android-host-nutrition-week.png","近七天已填热量、未知餐数和来源");
    checks.push("Dining places includes restaurant personal spend; repeat is an editable unsaved draft preserving split/delivery/discount; nutrition exposes unknowns and sources");

    const trashFixture=await page.evaluate(async()=>{const f=Object.assign(new M.Food(),{name:"恢复验收食材",quantity:1,unit:"个",expiryDate:"2099-01-01"});await store.saveFood(f);await store.deleteFood(f);return {id:f.id,trash:store.state.trash.find(e=>e.name===f.name).id};});
    await page.evaluate(()=>actions("settingsGroup","数据与备份"));await click("go","trash");await shot("android-host-trash.png","回收站恢复和清空入口");
    await click("livingTrashRestore",trashFixture.trash);
    assert(await page.evaluate(original=>store.state.foods.some(f=>f.name==="恢复验收食材"&&f.id!==original&&f.familyId===""),trashFixture.id));
    await click("back");assert.equal(await page.evaluate(()=>page),"settingsDetail");
    checks.push("Backup settings enters recycle bin; restore creates a new private ID and back returns to backup settings");
    assert(await page.locator('[name="backupEncrypted"]').isChecked());
    assert.equal(await page.locator('[name="backupConfirm"]').count(),1);
    const exportsBeforePassword=adapter.exports.length;
    assert(await page.evaluate(async()=>{try{await actions("exportData");return false;}catch{return true;}}));
    assert.equal(adapter.exports.length,exportsBeforePassword);
    await page.locator('[name="backupEncrypted"]').uncheck();await click("exportData");
    const plainExport=adapter.exports.at(-1).text;assert(Array.isArray(JSON.parse(plainExport).meals));
    await page.locator('[name="backupEncrypted"]').check();adapter.importText=plainExport;
    const beforePlainPreview=await page.evaluate(()=>store.exportData());await click("importData");
    assert.equal(await page.locator('.backup-preview').count(),1);await click("livingImportCancel");
    assert.equal(await page.evaluate(()=>store.exportData()),beforePlainPreview);
    checks.push("Backup defaults to password encryption, rejects passwordless export, requires explicit switch-off for plaintext export and auto-detects plaintext import");
    await page.locator('[name="backupPassword"]').fill("测试密码🙂1234");await page.locator('[name="backupConfirm"]').fill("测试密码🙂1234");await click("exportData");
    const encryptedExport=adapter.exports.at(-1).text;assert.equal(JSON.parse(encryptedExport).format,"kaifan-backup");assert(!encryptedExport.includes("新页面验收原餐"));
    assert.equal(await page.locator('[name="backupPassword"]').inputValue(),"");assert.equal(await page.locator('[name="backupConfirm"]').inputValue(),"");
    adapter.importText=encryptedExport;
    const beforeWrong=await page.evaluate(()=>store.exportData());
    await page.locator('[name="backupPassword"]').fill("错误密码1234");
    const wrongPassword=await page.evaluate(async()=>{try{await actions("importData");return false;}catch{return true;}});assert(wrongPassword);assert.equal(await page.evaluate(()=>store.exportData()),beforeWrong);assert.equal(await page.locator('[name="backupPassword"]').inputValue(),"");
    await page.locator('[name="backupPassword"]').fill("测试密码🙂1234");await click("importData");assert.equal(await page.locator('.backup-preview').count(),1);
    assert.equal(await page.evaluate(()=>store.exportData()),beforeWrong);await shot("android-host-backup-preview.png","加密备份解密后预览与同ID冲突选择");await click("livingImportCancel");assert.equal(await page.evaluate(()=>store.exportData()),beforeWrong);
    await page.locator('[name="backupPassword"]').fill("测试密码🙂1234");await click("importData");await page.locator('[name="backupConflict"]').selectOption("backup");await click("livingImportCommit");assert.equal(await page.locator('.backup-preview').count(),0);
    checks.push("Encrypted backup uses password/confirmation and clears inputs; wrong password writes nothing; decrypted preview/cancel do not write; explicit conflict choice imports");
    await page.locator('[name="backupPassword"]').fill("测试密码🙂1234");await click("importData");
    const staleImport=await page.evaluate(async()=>{await store.saveMeal(Object.assign(new M.Meal(),{name:"预览后新增",date:new Date().toISOString()}));const before=store.exportData();try{await actions("livingImportCommit");return false;}catch{return before===store.exportData();}});assert(staleImport);await click("livingImportCancel");
    await page.locator('[name="backupPassword"]').fill("测试密码🙂1234");
    const crossAccountImport=await page.evaluate(async()=>{const native=P.nativeAsync,old=cloud.session.userId;P.nativeAsync=async function(action,args){const text=await native(action,args);if(action==="import")cloud.session.userId="changed-while-selecting";return text;};const before=store.exportData();try{await actions("importData");return false;}catch{return before===store.exportData()&&!living.importPreview;}finally{P.nativeAsync=native;cloud.session.userId=old;}});assert(crossAccountImport);
    assert.equal(await page.locator('[name="backupPassword"]').inputValue(),"");
    checks.push("Import preview rejects concurrent local edits; account change during file selection discards pending import and clears password without writes");

    // Capture request paths with an account-scoped API stand-in; server contract is tested separately.
    await page.evaluate(()=>{
      window.__livingApi=api;window.__livingRequests=[];cloud.session.userId="00000000-0000-4000-8000-000000000001";cloud.session.accessToken="host-test";
      api=async function(path,method,body){__livingRequests.push(path);if(path.includes('/trials'))return {participants:3,success:2,needs_improvement:1,average_minutes:25,evidence:'用户自报',verified:false};if(path.includes('/community/posts/page'))return {items:[],nextCursor:'filtered-cursor',hasMore:true};return __livingApi(path,method,body);};go("community");
    });
    await page.locator('.community-search summary').click();await page.locator('[name="communityRegion"]').fill("四川");await page.locator('[name="communityOutcome"]').selectOption("需改进");await page.locator('[name="communityData"]').selectOption("real");
    assert.equal(await page.evaluate(()=>__livingRequests.length),0);await click("livingCommunityApply");
    let requests=await page.evaluate(()=>__livingRequests);assert(requests.at(-1).includes('data=real'));assert(!requests.at(-1).includes('cursor='));assert(requests.at(-1).includes(encodeURIComponent('需改进')));
    await page.evaluate(()=>communityLoad(true));requests=await page.evaluate(()=>__livingRequests);assert(requests.at(-1).includes('cursor=filtered-cursor'));assert(requests.at(-1).includes('data=real'));
    if(!await page.locator('.community-search').evaluate(el=>el.open))await page.locator('.community-search summary').click();await click("livingCommunityReset");requests=await page.evaluate(()=>__livingRequests);assert(!requests.at(-1).includes('cursor='));assert(requests.at(-1).includes('data=all'));
    await shot("android-host-community-filters.png","社区条件应用、真实/演示筛选和分页");
    await page.evaluate(()=>actions("recipe","tomato-eggs"));await page.waitForFunction(()=>document.querySelector('.trial-evidence'));
    assert((await page.locator('.trial-evidence').textContent()).includes('非认证验证'));await shot("android-host-trial-evidence.png","用户自报试做汇总与非认证说明");
    await page.evaluate(()=>{api=window.__livingApi;cloud.session.userId="";cloud.session.accessToken="";living.trial=null;});
    checks.push("Community draft makes no request until apply; filtered cursor carries all applied conditions, reset clears cursor; trial summary explicitly remains user-reported");
    const lateResponse=await page.evaluate(async()=>{
      const originalApi=api,owner=cloud.session.userId;let resolve;api=()=>new Promise(r=>resolve=r);
      const pending=communityLoad(false);cloud.session.userId="another-owner";const before=JSON.stringify(postList);resolve({items:[{id:"late-private",payload:{name:"不应串账号"}}],nextCursor:"late",hasMore:false});await pending;
      const unchanged=before===JSON.stringify(postList);api=originalApi;cloud.session.userId=owner;return unchanged;
    });assert(lateResponse);
    await go("trash");await page.evaluate(()=>window.handleBack());assert.equal(await page.evaluate(()=>page),"settingsDetail");
    await go("leftovers");await page.evaluate(()=>window.handleBack());assert.equal(await page.evaluate(()=>page),"meals");
    checks.push("Late community response cannot cross account; native back from recycle bin and leftovers returns to the corresponding parent page");

    // New scoped search UI can be verified before shared/backend freeze with a request stand-in.
    await page.evaluate(()=>{draftDirty=false;date=M.dateString(new Date());go("today");});
    for(const route of ["today","pantry","meals","mine","stats","plans"]){await go(route);assert(await page.locator('#main-search').isHidden(),route+" must not have a global search");}
    await go("recipes");assert(await page.locator('#main-search').isVisible());
    await page.waitForFunction(()=>androidMotion.snapshot().active.length===0);
    const narrowEntry=await page.locator('#main-search').boundingBox();assert(narrowEntry.width>=84&&narrowEntry.width<=120&&narrowEntry.height>=44&&narrowEntry.x>=0&&narrowEntry.x+narrowEntry.width<=390,JSON.stringify(narrowEntry));
    await shot("android-host-recipe-search-entry.png","菜谱页随内容滚动的紧凑图文搜索按钮");
    await page.locator('main #main-search.content-search-icon').click();assert.equal(await page.evaluate(()=>page),"recipe-search");
    assert.equal(await page.locator('[name="communityKeyword"]').count(),0);assert(!(await page.locator("main").textContent()).includes("社区热搜榜"));await page.locator('[name="search"]').fill("番茄炒蛋");await submit();
    assert.equal(await page.evaluate(()=>page),"recipes");assert((await page.locator('.recipe-search-results').textContent()).includes('菜谱结果 · 番茄炒蛋'));
    await page.locator('main #main-search.content-search-icon').click();await click("back");assert.equal(await page.evaluate(()=>page),"recipes");
    await page.setViewportSize({width:1024,height:900});await go("recipes");await page.waitForFunction(()=>androidMotion.snapshot().active.length===0);const wideEntry=await page.locator('#main-search').boundingBox();assert(wideEntry.width>=84&&wideEntry.width<=120&&wideEntry.height>=44&&wideEntry.x>=0&&wideEntry.x+wideEntry.width<=1024);await page.setViewportSize({width:390,height:844});
    checks.push("Compact named content search button appears only on recipes/community at both widths, and recipe search has its own input/results/back destination");
    await page.evaluate(()=>{
      window.__searchApi=api;window.__searchPaths=[];window.__searchFeed=JSON.stringify(postList);window.__searchRecipeState=JSON.stringify({term:filter.search,history:utility.searches});
      window.__searchSession={userId:cloud.session.userId,accessToken:cloud.session.accessToken};cloud.session.userId="00000000-0000-4000-8000-000000000002";cloud.session.accessToken="search-host";
      api=async function(path){__searchPaths.push(path);if(path.includes('/community/posts/page'))return {items:[{id:"keyword-post",author_name:"试做朋友",payload:{name:"帖子：番茄失败经验",notes:"火候心得"}}],nextCursor:"q-bound",hasMore:true};if(path.endsWith('/comments'))return [];if(path.endsWith('/keyword-post'))return {id:"keyword-post",user_id:"other",payload:{name:"帖子：番茄失败经验",notes:"火候心得"}};throw Error("Unexpected search endpoint "+path);};
      living.communityApplied="&data=real&outcome="+encodeURIComponent("需改进");go("community");
    });
    assert(await page.locator('#main-search').isVisible());await page.locator('main #main-search.content-search-icon').click();assert.equal(await page.evaluate(()=>page),"community-search");
    assert.equal(await page.locator('[name="search"]').count(),0);assert.equal(await page.locator('.hot-search').count(),0);
    const inputWidth=await page.locator('.community-search-form').boundingBox();assert(inputWidth.width<=480&&inputWidth.x>=22&&Math.abs(inputWidth.x+inputWidth.width/2-195)<2);
    await page.locator('[name="communityKeyword"]').fill("番茄%_失败");assert.equal(await page.evaluate(()=>__searchPaths.length),0);await submit();
    assert.equal(await page.locator('[data-community-post]').count(),1);assert.equal(await page.locator('.recipe-list-card').count(),0);
    await shot("android-host-community-search-results.png","社区独立帖子搜索结果，保留真实/需改进条件");
    let searchPaths=await page.evaluate(()=>__searchPaths);assert(searchPaths[0].includes('q='+encodeURIComponent('番茄%_失败')));assert(searchPaths[0].includes('data=real'));assert(!searchPaths[0].includes('cursor='));
    await click("communitySearchMore");searchPaths=await page.evaluate(()=>__searchPaths);assert(searchPaths.at(-1).includes('cursor=q-bound'));assert(searchPaths.at(-1).includes('q='+encodeURIComponent('番茄%_失败')));
    await click("communitySearchPost","keyword-post");assert.equal(await page.evaluate(()=>page),"post");await click("back");assert.equal(await page.evaluate(()=>page),"community-search");assert.equal(await page.locator('[name="communityKeyword"]').inputValue(),"番茄%_失败");
    await page.locator('[name="communityKeyword"]').fill("新词");await submit();searchPaths=await page.evaluate(()=>__searchPaths);assert(!searchPaths.at(-1).includes('cursor='));
    assert.equal(await page.evaluate(()=>JSON.stringify({term:filter.search,history:utility.searches})),await page.evaluate(()=>__searchRecipeState));assert.equal(await page.evaluate(()=>JSON.stringify(postList)),await page.evaluate(()=>__searchFeed));assert(!searchPaths.some(p=>p.startsWith('/discovery')));
    await page.evaluate(()=>window.handleBack());assert.equal(await page.evaluate(()=>page),"community");assert.equal(await page.evaluate(()=>JSON.stringify(postList)),await page.evaluate(()=>__searchFeed));
    await page.evaluate(()=>{communityScope="family";go("community-search");});assert.equal(await page.locator('[data-community-post]').count(),0);assert.equal(await page.evaluate(()=>communitySearch.cursor),"");
    const lateSearch=await page.evaluate(async()=>{const original=api;let resolve;api=()=>new Promise(r=>resolve=r);communitySearch.term="迟到测试";communitySearch.started=true;const pending=loadCommunitySearch();go("community");resolve({items:[{id:"stale-query",payload:{name:"迟到结果"}}],nextCursor:"late",hasMore:true});await pending;const clean=!communitySearch.rows.some(p=>p.id==="stale-query");api=original;return clean;});assert(lateSearch);
    await page.evaluate(()=>{api=__searchApi;Object.assign(cloud.session,__searchSession);living.communityApplied="";communityScope="public";filter.search="";});
    const searchReset=await page.evaluate(async()=>{communitySearch.draft="旧账号词";communitySearch.term="旧账号词";communitySearch.rows=[{id:"old-account-post"}];communitySearch.cursor="old";searchPostReturn="community-search";await loadSettings();return {draft:communitySearch.draft,term:communitySearch.term,count:communitySearch.rows.length,cursor:communitySearch.cursor,postReturn:searchPostReturn};});
    assert.deepEqual(searchReset,{draft:"",term:"",count:0,cursor:"",postReturn:""});
    checks.push("Community keyword search uses independent posts/input/cursor, combines filters and literal q, preserves recipe history/heat/feed, and post/native-back return to the correct search or community page");
    const legacyMealIds=await page.evaluate(async()=>{
      const ids=[];for(const [i,fields] of [{},{place:null,diningMode:null},{place:"undefined",diningMode:"null"},{place:"以前的店铺",diningMode:"餐馆"}].entries()){
        const m=Object.assign(new M.Meal(),{name:"旧记录"+i,date:new Date(Date.now()+i*1000).toISOString()},fields);if(i===0){delete m.place;delete m.diningMode;}await store.saveMeal(m);ids.push(m.id);
      }date=M.dateString(new Date());go("today");return ids;
    });
    assert.deepEqual(await page.locator('.recent-meal-strip small').allTextContents(),["再吃一次","再吃一次","再吃一次","再吃一次"]);
    assert(!/undefined|null/i.test(await page.locator('.recent-meal-strip').textContent()));assert(!(await page.locator('.recent-meal-strip').textContent()).includes('以前的店铺'));
    await shot("android-host-home-recent-meals.png","首页无搜索入口，缺字段旧记录统一再吃一次");
    await page.evaluate(id=>actions("mealEdit",id),legacyMealIds[3]);await page.locator('.meal-place-details summary').click();assert.equal(await page.locator('[name="place"]').inputValue(),"以前的店铺");
    await page.locator('[name="place"]').fill("修改后小馆");await page.locator('[name="diningMode"]').selectOption("在家做");assert.equal(await page.locator('[name="place"]').count(),0);assert.equal(await page.evaluate(()=>mealDraft.place),"修改后小馆");
    await page.evaluate(()=>rememberMealForm());assert.equal(await page.evaluate(()=>mealDraft.place),"修改后小馆");
    await shot("android-host-home-meal-no-place.png","在家做记餐不展示地点输入，旧地点保留");
    for(const mode of ["餐馆","食堂","外卖","外食"]){await page.locator('[name="diningMode"]').selectOption(mode);assert.equal(await page.locator('.meal-place-details [name="place"]').count(),1);assert.equal(await page.locator('[name="place"]').inputValue(),"修改后小馆");}
    await page.locator('.meal-place-details summary').click();await shot("android-host-dining-place-advanced.png","外食地点置于高级详情中可选填写");
    await submit();assert.equal(await page.evaluate(id=>store.state.meals.find(m=>m.id===id).place,legacyMealIds[3]),"修改后小馆");
    checks.push("Recent meals show only repeat label for missing/null/literal-undefined legacy fields; location is optional advanced detail only for dining-out modes and hidden home fields preserve existing data");

    // Capture current main layout, filters, and canonical settings groups after the new interactions.
    await go("recipes");
    await shot("android-host-recipes.png", "完整菜谱入口与筛选排序");
    await go("mine");
    await shot("android-host-mine.png", "七个原版设置分组");
    await go("filters");
    await shot("android-host-filters.png", "独立筛选草稿与分组");
    for (const route of [
      "search",
      "recent",
      "compare",
      "ingredient",
      "knowledge",
      "settingsDetail",
      "gallery",
      "recovery",
      "security",
      "draw",
      "drawResult",
      "workspace",
      "migration",
      "household",
      "deduction",
      "batchFoods",
      "syncStatus",
    ]) {
      await go(route);
      assert(
        !(await page.locator("main").textContent()).includes(
          "这一页暂时没打开",
        ),
        route,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route + " overflow",
      );
      const failures=await page.locator('img').evaluateAll(async imgs=>{
        await Promise.all(imgs.map(async img=>{img.loading="eager";await img.decode().catch(()=>{});}));
        return imgs.filter(img=>!img.naturalWidth).map(img=>img.getAttribute("src"));
      });assert.deepEqual(failures,[],route+" missing illustrations");
    }
    checks.push(
      "Seventeen additional canonical flows render without exceptions or narrow-screen overflow",
    );
    }
    // Art fixtures are presentation-only; no synthetic records are persisted to SQLite.
    await page.evaluate(()=>{
      window.__artFixture={foods:store.state.foods,meals:store.state.meals,plans:store.state.plans,posts:postList,date,settings:{...settings},filter,scope:communityScope};
      date=M.dateString(new Date());draftDirty=false;filter=new F.RecipeFilterOptions();parity.library=true;recipePage=1;parity.recipeMore=false;parity.monthOpen=false;settings.quickstartDone=true;settings.androidDraft=null;intent="cook";
      store.state.meals=[['南瓜小米粥','早餐',8],['番茄炒蛋','午餐',12],['香煎鸡腿饭','晚餐',19]].map(([name,mealType,h],i)=>Object.assign(new M.Meal(),{id:crypto.randomUUID(),name,mealType,date:date+'T'+String(h).padStart(2,'0')+':00:00',diningMode:'在家做',recipeId:i===1?'tomato-eggs':'',estimatedCost:[3.5,8,15][i],costType:i===2?'实付':'估算'}));
      store.state.foods=[['番茄','蔬菜','个',3],['鸡蛋','蛋奶','个',6],['小青菜','蔬菜','g',300],['鸡腿','肉类','个',2]].map(([name,category,unit,quantity],i)=>Object.assign(new M.Food(),{id:crypto.randomUUID(),name,category,unit,quantity,expiryDate:D.shiftDay(date,i+1),purchasedAt:date,location:i<2?'冷藏':'冷冻',estimatedPrice:5}));
      store.state.plans=[Object.assign(new(require('MealPlan').MealPlan)(),{id:crypto.randomUUID(),date,occasion:'晚餐',recipeId:'tomato-eggs',people:2})];
      postList=[{id:'art-post-1',demo_data:true,status:'approved',author_name:'小怪厨房',photoUrl:'media/recipe_tomato_eggs.webp',payload:{name:'把番茄炒出一点夏天',notes:'鸡蛋先盛出，番茄慢慢炒软。今天的一餐，留给自己喜欢的味道。'}},{id:'art-post-2',demo_data:true,status:'approved',author_name:'周末餐桌',photoUrl:'media/recipe_soup.webp',payload:{name:'一碗暖汤的时间',notes:'热乎的汤，和刚刚好的闲暇。'}}];
    });
    responsiveReport=await require('./check-responsive.cjs')(page,shot);
    for(const width of [320,390,768]){
      await page.setViewportSize({width,height:844});
      await go('recipes');await page.locator('.recipe-sort-pocket summary').click();await click('recipeSort','timeDesc');assert.equal(await page.evaluate(()=>settings.recipeOrder),'timeDesc');
      const target=await page.locator('.recipe-list-card [data-action="recipe"]').first().getAttribute('data-value');await page.locator('.recipe-list-card .recipe-card-actions [data-action="recipe"]').first().click();assert.equal(await page.evaluate(()=>page),'recipe');assert.equal(await page.evaluate(()=>selected),target);
      await go('today');await page.locator('.meal-card [data-action="mealNew"]').first().click();assert.equal(await page.evaluate(()=>page),'meal');
      await go('mine');await page.locator('.settings-grid [data-action="settingsGroup"]').first().click();assert.equal(await page.evaluate(()=>page),'settingsDetail');
    }
    await page.evaluate(()=>{const a=__artFixture;store.state.foods=a.foods;store.state.meals=a.meals;store.state.plans=a.plans;postList=a.posts;date=a.date;settings=a.settings;filter=a.filter;communityScope=a.scope;draftDirty=false;});
    await page.setViewportSize({width:390,height:844});
    checks.push('Responsive36 routes ×14 viewport/text-scale scenarios: intrinsic images, long text boundaries, footer clearance, recipe/amount separation; four representative screenshots; sort/recipe/meal/settings clicks pass');
    }
    assert.deepEqual(errors, []);
    console.log("PASS", checks.length, "UI groups");
    fs.writeFileSync(
      root + "/work/reports/" + uiReport,
      JSON.stringify(
        {
          passed: true,
          draft_ui_not_packaged: draftUi,
          generated_core_sha256: crypto.createHash("sha256").update(fs.readFileSync(assets+"/core.js")).digest("hex"),
          web_source_sha256: Object.fromEntries(["index.html","app.js","parity.js","experience.js","daily.js","convenience.js","living.js","search.js","polish.js","lobby.js","assistant.js","style.css"].map(name=>[name,crypto.createHash("sha256").update(fs.readFileSync(assets+"/"+name)).digest("hex")])),
          checks,
          responsive: responsiveReport,
          compact_search: compactReport,
          pixel_polish: pixelReport,
          motion: motionReport,
          icon_hearts: iconReport,
          search_clarity: clarityReport,
          errors,
          screenshots: shots.map((s) => s.path),
          scope:
            "Headless Chromium for Android-specific UI with actual host SQLite bridge; not an Android device/WebView/camera/notification/Keystore test.",
        },
        null,
        2,
      ),
    );
  } catch (e) {
    fs.writeFileSync(
      root + "/work/reports/" + uiReport,
      JSON.stringify(
        { passed: false, checks, error: e.stack, errors },
        null,
        2,
      ),
    );
    throw e;
  } finally {
    if (browser) await browser.close();
    server.close();
    adapter.close();
    const file = root + "/work/artifacts.json",
      registry = JSON.parse(fs.readFileSync(file));
    for (const shot of shots) {
      registry.files = registry.files.filter((x) => x.path !== shot.path);
      registry.files.push(shot);
    }
    fs.writeFileSync(file, JSON.stringify(registry, null, 2) + "\n");
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
