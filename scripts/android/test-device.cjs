// Actual installed Android/WebView test. Requires an already-running, empty test device.
// Never starts an emulator or clears user application data.
const { execFileSync } = require("child_process"),
  fs = require("fs"),
  assert = require("assert/strict"),
  path = require("path");
const {
  chromium,
} = require("/Users/developer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = path.resolve(__dirname, "../.."),
  adb =
    process.env.ADB ||
    process.env.HOME + "/Library/Android/sdk/platform-tools/adb",
  serial = process.env.ANDROID_SERIAL || "emulator-5580";
const apiEndpoint=process.env.ANDROID_TEST_API || "http://localhost:3001";
const photoPort=process.env.ANDROID_TEST_PHOTO_PORT || "9000";
const apiPort=new URL(apiEndpoint).port || "80";
const checks = [],
  shots = [];
let browser;
function run(...args) {
  return execFileSync(adb, ["-s", serial, ...args], {
    encoding: "utf8",
    timeout: 60000,
  }).trim();
}
async function poll(fn, timeout = 30000) {
  const until = Date.now() + timeout;
  let last;
  do {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  } while (Date.now() < until);
  throw last;
}
(async () => {
  let report = {
    passed: false,
    serial,
    checks,
    scope:
      "Actual adb installation, native Android WebView and Android platform bridge. Not a physical-camera or OEM battery-policy test.",
  };
  try {
    assert.equal(run("get-state"), "device");
    assert.equal(run("shell", "getprop", "sys.boot_completed"), "1");
    report.device = {
      sdk: run("shell", "getprop", "ro.build.version.sdk"),
      model: run("shell", "getprop", "ro.product.model"),
      fingerprint: run("shell", "getprop", "ro.build.fingerprint"),
    };
    const install = run(
      "install",
      "-r",
      root + "/outputs/kaifan-monster-android-debug.apk",
    );
    assert(install.includes("Success"));
    checks.push("adb installed current signed APK successfully");
    run("reverse", "tcp:"+apiPort, "tcp:"+apiPort);
    run("reverse", "tcp:"+photoPort, "tcp:"+photoPort);
    const start = run(
      "shell",
      "am",
      "start",
      "-W",
      "-n",
      "com.kaifan.monster/.MainActivity",
    );
    assert(start.includes("Status: ok"));
    checks.push("Android ActivityManager launch returned Status ok");
    const pid = await poll(() => {
      const p = run("shell", "pidof", "com.kaifan.monster");
      assert(p);
      return p;
    });
    run("forward", "tcp:9224", "localabstract:webview_devtools_remote_" + pid);
    await poll(async () => {
      const r = await fetch("http://127.0.0.1:9224/json");
      const list = await r.json();
      assert(list.some((t) => t.type === "page"));
      return list;
    });
    browser = await chromium.connectOverCDP("http://127.0.0.1:9224");
    const page = browser.contexts()[0].pages()[0];
    page.on("dialog", (d) => d.accept());
    await page.waitForFunction(() => window.__kaifan, { timeout: 30000 });
    assert.equal(await page.evaluate(() => __kaifan.allRecipes().length), 454);
    assert.equal(
      await page.evaluate(
        () =>
          __kaifan.store.state.foods.length + __kaifan.store.state.meals.length,
      ),
      0,
      "Use an empty test installation; this script never clears existing records",
    );
    assert.equal(
      await page.evaluate(() => !!__kaifan.cloud.session.accessToken),
      false,
      "Use a signed-out test installation",
    );
    checks.push(
      "Actual Android WebView initialized and native SQLite loaded 454 canonical recipes",
    );
    const native = await page.evaluate(async () => {
      const P = require("Platform"),
        M = require("Models"),
        s = __kaifan.store,
        old = await require("Vault").Vault.load();
      await require("Vault").Vault.save("native-keystore-test-marker");
      const vault =
        (await require("Vault").Vault.load()) === "native-keystore-test-marker";
      await require("Vault").Vault.save(old);
      await s.saveFood(
        Object.assign(new M.Food(), {
          name: "Android设备验证鸡蛋",
          quantity: 6,
          unit: "个",
          expiryDate: "2099-12-31",
          estimatedPrice: 12,
        }),
      );
      const before = s.exportData();
      let rolled = false;
      try {
        await s.cook(M.offlineRecipes()[0]);
      } catch {
        rolled = s.exportData() === before;
      }
      return {
        vault,
        rolled,
        foods: s.state.foods.length,
        outbox: s.state.changes.length,
        info: P.invoke("deviceInfo"),
      };
    });
    assert(native.vault && native.rolled);
    assert.equal(native.foods, 1);
    assert.equal(native.outbox, 1);
    const xml = run(
      "shell",
      "run-as",
      "com.kaifan.monster",
      "cat",
      "shared_prefs/secure.xml",
    );
    assert(!xml.includes("native-keystore-test-marker"));
    checks.push(
      "Actual Android SQLite/outbox and failed cook rollback; Android Keystore encrypt/decrypt round trip",
    );
    await page.evaluate(() => __kaifan.go("pantry"));
    const relative = "work/screenshots/android-device-pantry.png";
    await page.screenshot({ path: root + "/" + relative });
    shots.push({
      path: relative,
      kind: "screenshot",
      capture_tool: "playwright",
      purpose:
        "Actual Android WebView captured via adb forwarded CDP: native SQLite pantry",
    });
    await page.evaluate(async () => {
      await __kaifan.store.setting("androidDeviceRoundtrip", "persisted");
    });
    run("shell", "am", "force-stop", "com.kaifan.monster");
    await browser.close();
    browser = null;
    run("shell", "am", "start", "-W", "-n", "com.kaifan.monster/.MainActivity");
    const nextPid = await poll(() => {
      const p = run("shell", "pidof", "com.kaifan.monster");
      assert(p);
      return p;
    });
    run(
      "forward",
      "tcp:9224",
      "localabstract:webview_devtools_remote_" + nextPid,
    );
    await poll(async () => {
      const r = await fetch("http://127.0.0.1:9224/json");
      assert((await r.json()).length);
      return true;
    });
    browser = await chromium.connectOverCDP("http://127.0.0.1:9224");
    const nextPage = browser.contexts()[0].pages()[0];
    await nextPage.waitForFunction(() => window.__kaifan);
    assert.equal(
      await nextPage.evaluate(() => __kaifan.store.state.foods[0].name),
      "Android设备验证鸡蛋",
    );
    assert.equal(
      await nextPage.evaluate(() =>
        __kaifan.store.getSetting("androidDeviceRoundtrip", ""),
      ),
      "persisted",
    );
    checks.push(
      "Actual force-stop/relaunch retains Android SQLite, outbox and preferences",
    );
    await nextPage.evaluate(async (endpoint) => {
      const P = require("Platform");
      __kaifan.cloud.endpoint = endpoint;
      const h = JSON.parse(await __kaifan.cloud.request("/health", "GET"));
      if (h.status !== "ok") throw Error("health");
      P.invoke("keepAwake", { enabled: true });
      P.invoke("keepAwake", { enabled: false });
    },apiEndpoint);
    checks.push(
      "Native HttpURLConnection reaches actual host API through adb reverse; screen-on bridge executes",
    );
    report.passed = true;
    report.not_verified = [
      "Physical camera/photo picker/SAF provider success paths",
      "Notification actual delivery while locked/rebooted",
      "Launcher widget add/click/refresh",
      "Physical OEM battery policies and performance",
    ];
    console.log("PASS", checks.length, "actual Android groups");
  } catch (e) {
    report.error = e.message;
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    try {
      run("forward", "--remove", "tcp:9224");
    } catch {}
    fs.writeFileSync(
      root + "/work/reports/android-device-tests.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    if (shots.length) {
      const registryPath = root + "/work/artifacts.json",
        registry = JSON.parse(fs.readFileSync(registryPath));
      for (const shot of shots) {
        registry.files = registry.files.filter((x) => x.path !== shot.path);
        registry.files.push(shot);
      }
      fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
    }
  }
})();
