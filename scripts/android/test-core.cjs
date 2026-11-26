const vm = require("vm"),
  fs = require("fs"),
  assert = require("assert/strict"),
  crypto = require("crypto"),
  { HostAdapter, root } = require("./host-adapter.cjs");
const adapter = new HostAdapter(),
  checks = [];
const sandbox = {
  console,
  TextDecoder,
  TextEncoder,
  Uint8Array,
  ArrayBuffer,
  Date,
  Map,
  Set,
  Promise,
  setTimeout,
  clearTimeout,
};
sandbox.window = sandbox;
sandbox.Android = {
  invoke: adapter.invoke.bind(adapter),
  async: (id, action, json) =>
    adapter.asyncOp(action, JSON.parse(json)).then(
      (value) => sandbox.nativeResult(id, { value }),
      (e) => sandbox.nativeResult(id, { error: e.message }),
    ),
};
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(root + "/android/app/build/generated/assets/core.js", "utf8"),
  sandbox,
);
const req = (n) => sandbox.require(n);
let store = new (req("LocalStore").LocalStore)();
const P = req("Platform"),
  M = req("Models"),
  E = req("ExperienceCore"),
  R = req("RecommendationCore"),
  T = req("UtilityState");
async function check(name, fn) {
  await fn();
  checks.push(name);
  console.log("PASS", name);
}
(async () => {
  try {
    await check(
      "Canonical catalog loads in SQLite with stable IDs and 454 combined recipes",
      async () => {
        await store.init(P.context);
        assert.equal(
          store.builtinRecipes.length + M.offlineRecipes().length,
          454,
        );
        assert.equal(
          adapter
            .db("shiku.db")
            .prepare("select count(*) n from recipe_catalog")
            .get().n,
          450,
        );
      },
    );
    await check(
      "SQLite stock/outbox atomic write, failed transaction rolls back both",
      async () => {
        const f = Object.assign(new M.Food(), {
          name: "鸡蛋",
          quantity: 6,
          unit: "个",
          expiryDate: "2099-12-31",
          estimatedPrice: 12,
        });
        await store.saveFood(f);
        assert.equal(store.state.changes.length, 1);
        const before = store.exportData();
        adapter.forceSqlError = "INSERT OR REPLACE INTO documents";
        await assert.rejects(
          () =>
            store.saveFood(
              Object.assign(new M.Food(), {
                name: "失败食材",
                quantity: 2,
                expiryDate: "2099-12-31",
              }),
            ),
          /injected/,
        );
        adapter.forceSqlError = "";
        assert.equal(store.exportData(), before);
      },
    );
    await check(
      "Concurrent mutations serialized, each writes outbox once",
      async () => {
        await Promise.all(
          Array.from({ length: 8 }, (_, i) =>
            store.saveShopping(
              Object.assign(new M.Shopping(), {
                name: "采购" + i,
                quantity: 1,
              }),
            ),
          ),
        );
        assert.equal(store.state.shopping.length, 8);
        assert.equal(store.state.changes.length, 9);
      },
    );
    await check(
      "Cooking insufficiency rolls back stock, movement, meal and outbox",
      async () => {
        const before = store.exportData();
        await assert.rejects(
          () => store.cook(M.offlineRecipes()[0]),
          /库存不足/,
        );
        assert.equal(store.exportData(), before);
      },
    );
    await check(
      "Cooking success tracks cost/movement and creates meal in same transaction",
      async () => {
        await store.saveFood(
          Object.assign(new M.Food(), {
            name: "西红柿",
            quantity: 2,
            unit: "个",
            estimatedPrice: 6,
            expiryDate: "2099-12-31",
          }),
        );
        await store.cook(M.offlineRecipes()[0]);
        assert.equal(store.state.meals.length, 1);
        assert.equal(
          store.state.foods.find((f) => f.name === "西红柿").quantity,
          0,
        );
        assert.equal(
          store.state.foods.find((f) => f.name === "鸡蛋").quantity,
          3,
        );
        assert.equal(
          store.state.foods.find((f) => f.name === "鸡蛋").movements.length,
          1,
        );
      },
    );
    await check(
      "Procurement counts stock and pending once, repeated confirmation has no new gap",
      async () => {
        const plans = [
          {
            recipeId: "tomato-eggs",
            people: 2,
            completed: false,
            mode: "在家做",
          },
        ];
        let preview = E.previewProcurement(
          plans,
          M.offlineRecipes(),
          store.state.foods,
          store.state.shopping,
          "2099-01-01",
        );
        assert.equal(preview.lines.find((l) => l.name === "西红柿").missing, 2);
        const items = preview.lines
          .filter((l) => !l.unknown && !l.optional && l.missing > 0)
          .map((l) =>
            Object.assign(new M.Shopping(), {
              name: l.name,
              quantity: l.missing,
              unit: l.unit,
            }),
          );
        await store.addShoppingBatch(items);
        preview = E.previewProcurement(
          plans,
          M.offlineRecipes(),
          store.state.foods,
          store.state.shopping,
          "2099-01-01",
        );
        assert.equal(
          preview.lines.filter(
            (l) => !l.unknown && !l.optional && l.missing > 0,
          ).length,
          0,
        );
      },
    );
    await check(
      "Purchase food+shopping status+outbox rollback as a unit on invalid import",
      async () => {
        const s = store.state.shopping[0],
          f = Object.assign(new M.Food(), {
            id: crypto.randomUUID(),
            name: "测试采购入库",
            quantity: 1,
            expiryDate: "2099-12-31",
          }),
          before = store.exportData();
        await assert.rejects(
          () =>
            store.importData(
              JSON.stringify({
                foods: [f],
                shopping: [{ ...s, quantity: -1, purchased: true }],
                meals: [],
              }),
              true,
            ),
          /无效采购/,
        );
        assert.equal(store.exportData(), before);
        await store.importData(
          JSON.stringify({
            foods: [f],
            shopping: [{ ...s, purchased: true }],
            meals: [],
          }),
          true,
        );
        assert(store.state.shopping.find((v) => v.id === s.id).purchased);
        assert(store.state.foods.some((v) => v.id === f.id));
      },
    );
    await check(
      "Unknown ingredient quantity not silently filled for cooking/purchase",
      async () => {
        const r = Object.assign(new M.Recipe(), {
          id: "unknown",
          name: "未知菜",
          ingredients: [new M.Ingredient("土豆", 0, "g")],
          steps: ["切好"],
          minutes: 10,
        });
        await assert.rejects(() => store.cook(r), /用量/);
        assert.throws(() => T.missingShopping(r, [], [], "2099-01-01"), /用量/);
      },
    );
    await check(
      "Money aggregation in integer cents, separates paid and estimated",
      async () => {
        const s = E.spendingSummary([
          {
            date: "2026-11-05",
            estimatedCost: 0.1,
            costType: "实付",
            calories: -1,
          },
          {
            date: "2026-11-05",
            estimatedCost: 0.2,
            costType: "实付",
            calories: 100,
          },
          {
            date: "2026-11-05",
            estimatedCost: 3.2,
            costType: "估算",
            calories: -1,
          },
        ]);
        assert.equal(s.paid, 0.3);
        assert.equal(s.estimated, 3.2);
        assert.equal(s.calorieMeals, 1);
      },
    );
    await check(
      "Recommendation is canonical, strict exclusion and time constraints preserved in both domains",
      async () => {
        for (const intent of ["cook", "record"]) {
          const o = new R.RankingOptions();
          o.intent = intent;
          o.excluded = ["鸡蛋"];
          o.maxMinutes = 30;
          const results = R.rankPersonalized(
            M.offlineRecipes(),
            store.state.foods,
            store.state.meals,
            [],
            o,
          );
          assert(
            results.every(
              (r) => !["tomato-eggs", "steamed-eggs"].includes(r.recipeId),
            ),
          );
          if (intent === "cook")
            assert(!results.some((r) => r.recipeId === "soup"));
        }
        assert.equal(R.compatibleUnit("kg", "g"), 1000);
      },
    );
    await check(
      "Account A/B/guest databases and preferences isolated, visitor data remains",
      async () => {
        const guestCount = store.state.foods.length;
        const a = crypto.randomUUID(),
          b = crypto.randomUUID();
        P.invoke("prefPut", {
          name: "shiku_account_spaces",
          key: "activeScope",
          value: a,
        });
        await store.init(P.context);
        assert.equal(store.state.foods.length, 0);
        await store.setting("excluded", "鸡蛋");
        await store.saveFood(
          Object.assign(new M.Food(), {
            name: "仅A",
            quantity: 1,
            expiryDate: "2099-12-31",
          }),
        );
        P.invoke("prefPut", {
          name: "shiku_account_spaces",
          key: "activeScope",
          value: b,
        });
        await store.init(P.context);
        assert.equal(store.state.foods.length, 0);
        assert.equal(await store.getSetting("excluded", ""), "");
        P.invoke("prefPut", {
          name: "shiku_account_spaces",
          key: "activeScope",
          value: a,
        });
        await store.init(P.context);
        assert.equal(store.state.foods[0].name, "仅A");
        P.invoke("prefPut", {
          name: "shiku_account_spaces",
          key: "activeScope",
          value: "",
        });
        await store.init(P.context);
        assert.equal(store.state.foods.length, guestCount);
      },
    );
    await check(
      "Stale conflict decision rejected; remote merge retains current device photo paths",
      async () => {
        await assert.rejects(
          () => store.mergeConflict("food_items", "missing", {}, 1, "wrong"),
          /本机记录/,
        );
        const meal = Object.assign(new M.Meal(), {
          name: "本机照片",
          date: new Date().toISOString(),
          localPhoto: "photos/local.jpg",
          photoOriginal: "photos/original.jpg",
        });
        await store.saveMeal(meal);
        await store.acknowledge(
          "meal_records",
          meal.id,
          1,
          store.state.changes
            .filter((c) => c.entityId === meal.id)
            .map((c) => c.changeId),
        );
        await store.applyRemote([
          {
            entity_type: "meal_records",
            entity_id: meal.id,
            operation: "upsert",
            version: 999,
            payload: {
              ...meal,
              name: "另一台设备",
              localPhoto: "other-device-path",
              photoOriginal: "other-original",
              _recordVersion: 2,
            },
          },
        ]);
        const saved = store.state.meals.find((m) => m.id === meal.id);
        assert.equal(saved.localPhoto, "photos/local.jpg");
        assert.equal(saved.photoOriginal, "photos/original.jpg");
        assert.equal(saved.version, 2);
      },
    );
    await check(
      "Endpoint allowlist accepts emulator mapping and refuses arbitrary cleartext",
      async () => {
        assert(P.platformEndpoint("http://10.0.2.2:3001"));
        assert(P.platformEndpoint("http://localhost:3001"));
        assert(!P.platformEndpoint("http://192.168.1.2:3001"));
        assert(!P.platformEndpoint("https://user:password@example.com"));
      },
    );
    if(!process.argv.includes("--offline"))await check(
      "Actual HTTP register/sync DTO, strip photo paths, social gate, catalog hash validation and workspace JSONB/CAS",
      async () => {
        const cloud = new (req("Cloud").Cloud)();
        cloud.endpoint = process.env.ANDROID_TEST_API || "http://10.0.2.2:3001";
        const email = "android-adapter-" + Date.now() + "@example.test",
          password = crypto.randomBytes(18).toString("hex");
        const session = await cloud.login(
          email,
          password,
          true,
          Object.assign(new (req("AccountModels").UserProfile)(), {
            displayName: "Android适配测试",
          }),
        );
        try {
          P.invoke("prefPut", {
            name: "shiku_account_spaces",
            key: "activeScope",
            value: session.userId,
          });
          await store.init(P.context);
          const meal = Object.assign(new M.Meal(), {
            name: "适配验证餐",
            date: new Date().toISOString(),
            localPhoto: "photos/test.jpg",
            photoOriginal: "photos/original.jpg",
            items: [new M.MealItem("适配验证餐",10)],
            financeFood:10,deliveryFee:2,discount:1,splitPeople:3,personalShares:1,mealTotal:11,personalCost:3.66,
            trialOutcome:"需改进",actualMinutes:25,leftoverPortions:1,
          });
          await store.saveMeal(meal);
          const report = await cloud.sync(store);
          assert.equal(report.uploaded, 1);
          assert.equal(report.conflicts.length, 0);
          assert.equal(store.state.changes.length, 0);
          const records = JSON.parse(
            await cloud.request("/records/meal_records", "GET"),
          );
          const remote = records.find((r) => r.id === meal.id);
          assert.equal(remote.payload.localPhoto, "");
          assert.equal(remote.payload.photoOriginal, "");
          assert.equal(remote.payload.personalCost,3.66);
          assert.equal(remote.payload.mealTotal,11);
          assert.equal(remote.payload.trialOutcome,"需改进");
          await assert.rejects(()=>cloud.request('/community/posts/page?scope=public','GET'),/未开放/);
          const cat = req("CatalogUpdate"),
            update = await cat.downloadCatalogUpdate(cloud, null);
          assert.equal(update.manifest.count, 450);
          await store.installCatalog(update);
          assert.equal(
            (await store.catalogManifest()).version,
            update.manifest.version,
          );
          const previous = (await store.catalogManifest()).version;
          const bad = structuredClone(update);
          bad.records[0].payload += " ";
          await assert.rejects(() => store.installCatalog(bad));
          assert.equal((await store.catalogManifest()).version, previous);
          await store.setting("homeRegion", "上海");
          const workspace = await cloud.checkWorkspace(store);
          await cloud.uploadWorkspace(store, workspace);
          const roundtrip = await cloud.checkWorkspace(store);
          assert.equal(roundtrip.remote.payload.preferences.homeRegion, "上海");
          await store.applyWorkspace(roundtrip.remote, roundtrip.localRevision);
          await cloud.request("/account/workspace", "PUT", {baseVersion:roundtrip.remote.version,payload:roundtrip.remote.payload});
          await assert.rejects(() => cloud.uploadWorkspace(store, roundtrip), /409|变化|更新|冲突/);
        } finally {
          await cloud
            .request("/auth/account", "DELETE", {
              password,
              confirmation: "注销我的账号",
            })
            .catch(() => {});
          await cloud.logout().catch(() => {});
        }
      },
    );
    console.log("PASS", checks.length, "groups");
    fs.writeFileSync(
      root + "/work/reports/android-core-tests.json",
      JSON.stringify(
        {
          passed: true,
          generated_core_sha256: crypto.createHash("sha256").update(fs.readFileSync(root + "/android/app/build/generated/assets/core.js")).digest("hex"),
          checks,
          skipped:process.argv.includes("--offline")?["Live HTTP group: local API is not running"]:[],
          scope:
            process.argv.includes("--offline")?"Shared modules and real SQLite host adapter; HTTP explicitly skipped; not Android device evidence":"Canonical Android generated modules and Android JS platform adapter backed by Node real SQLite and live HTTP (endpoint selected by ANDROID_TEST_API). Does not prove Android SQLite/Keystore/device behavior.",
        },
        null,
        2,
      ),
    );
  } catch (e) {
    fs.writeFileSync(
      root + "/work/reports/android-core-tests.json",
      JSON.stringify({ passed: false, checks, error: e.stack }, null, 2),
    );
    throw e;
  } finally {
    adapter.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
