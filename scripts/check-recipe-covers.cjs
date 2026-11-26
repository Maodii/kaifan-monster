// Headless verification of the delivered gallery, independent of the emulator.
const { chromium } = require('/Users/developer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
(async () => {
  const root = path.resolve(__dirname, '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'art-source/recipe-covers/manifest.json'), 'utf8'));
  const expected = manifest.total;
  assert.equal(manifest.files.length, expected);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 940 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(root, 'work/reports/recipe-cover-gallery.html')).href);
    const images = await page.evaluate(async () => {
      const all = [...document.images];
      all.forEach(i => { i.loading = 'eager'; });
      await Promise.all(all.map(i => i.decode()));
      return all.map(i => ({ src: i.src, width: i.naturalWidth, height: i.naturalHeight }));
    });
    assert.equal(images.length, expected);
    assert.equal(new Set(images.map(i => i.src)).size, expected);
    assert(images.every(i => i.width === 512 && i.height === 512));
    await page.locator('input').fill('老式锅包肉');
    assert.equal(await page.locator('article:visible').count(), 1);
    await page.locator('input').fill('不存在的测试菜名');
    assert.equal(await page.locator('article:visible').count(), 0);
    await page.locator('input').fill('海南椰香鸡丝蔬菜汤');
    assert.equal(await page.locator('article:visible').count(), 1);
    await page.locator('input').fill('');
    await page.screenshot({ path: path.join(root, 'work/screenshots/recipe-cover-gallery.png') });
    assert.deepEqual(errors, []);
    const report = { passed: true, loaded: images.length, unique_urls: expected, dimensions: '512x512', search: 'passed: existing, newly added and empty results', page_errors: errors, screenshot: 'work/screenshots/recipe-cover-gallery.png', capture_tool: 'playwright', scope: 'Gallery browser verification; not a native-app runtime test' };
    fs.writeFileSync(path.join(root, 'work/reports/recipe-cover-gallery-test.json'), JSON.stringify(report, null, 2));
    console.log(`PASS ${expected} gallery images decoded; existing/new exact-name and empty searches; no browser runtime errors`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
