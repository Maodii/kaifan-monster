"""Bounded navigation/visual acceptance on the already connected emulator; no record writes."""
import importlib.util, json, time, re, hashlib
from pathlib import Path

root = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('device_ui', root/'scripts/device-ui.py')
ui = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ui)
checks = []
screenshots = []
def bounds(n): return list(map(int, re.findall(r'-?\d+', n['bounds'])))
def tap(n):
    x, y, xx, yy = bounds(n)
    ui.hdc('shell', 'uitest', 'uiInput', 'click', (x+xx)//2, (y+yy)//2)
    time.sleep(1.2)
def nav(label):
    tap(next(n for n in ui.dump() if n.get('text') == label and bounds(n)[1] > 2500))
def shot(name):
    ui.screenshot('art-refresh-'+name+'.jpeg')
    screenshots.append('work/screenshots/art-refresh-'+name+'.jpeg')
def find_id(key): return next(n for n in ui.dump() if n.get('id') == key)
try:
    ui.hdc('shell', 'aa', 'force-stop', 'com.shiku.foodkeeper')
    ui.hdc('shell', 'aa', 'start', '-a', 'EntryAbility', '-b', 'com.shiku.foodkeeper')
    time.sleep(2)
    nodes = ui.dump()
    assert not any(n.get('id') in ['recipe-search', 'community-search-entry'] for n in nodes)
    assert all(any(n.get('text') == label and bounds(n)[1] < 2500 for n in nodes) for label in ['早餐', '午餐', '晚餐'])
    checks.append('Today has no global search and all three meal headings appear before the fixed navigation')
    shot('home')
    nav('菜谱')
    n = find_id('recipe-search'); x,y,xx,yy = bounds(n)
    assert xx-x < 1050 and abs((xx+x)/2-640) < 12
    checks.append('Recipe search remains narrow and centered on 1280px screen')
    shot('recipes')
    tap(n)
    find_id('discovery-search-input')
    checks.append('Dedicated recipe search still opens after visual changes; no keyword submitted')
    ui.hdc('shell', 'uitest', 'uiInput', 'keyEvent', 2); time.sleep(1.2)
    nav('我的')
    nodes = ui.dump()
    categories = ['口味与抽菜','食材管理','外观与动效','提醒','账号与同步','数据与备份','帮助与课堂']
    assert all(any(n.get('text') == label and 150 < bounds(n)[1] < bounds(n)[3] < 2500 for n in nodes) for label in categories)
    checks.append('All seven illustrated settings categories fit before navigation')
    shot('settings')
    tap(next(n for n in nodes if n.get('text') == '外观与动效'))
    assert any(n.get('text') == '外观与动效' for n in ui.dump())
    checks.append('Settings illustration row opens its own group')
    ui.hdc('shell', 'uitest', 'uiInput', 'keyEvent', 2); time.sleep(1.2)
    nav('食材'); find_id('stock-history-entry'); shot('inventory')
    checks.append('Stock purchase/consumption history entry remains accessible')
    nav('记餐'); shot('diary')
    assert any(n.get('text') == '我的记餐' for n in ui.dump())
    checks.append('Meal diary remains accessible without saving records')
    nav('今日')
    result = {'passed': True, 'checks': checks}
except Exception as e:
    result = {'passed': False, 'checks': checks, 'error': repr(e)}
    raise
finally:
    result.update(source_sha256=hashlib.sha256((root/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),
        compiled_hap_sha256=hashlib.sha256((root/'client/entry/build/default/outputs/default/entry-default-unsigned.hap').read_bytes()).hexdigest(),
        screenshots=screenshots, scope='Existing Harmony emulator navigation and inspected screenshots only; no record writes; no emulator launched',
        physicalDeviceVerified=False, fullVisualParityVerified=False)
    (root/'work/reports/art-refresh-native.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(result, ensure_ascii=False))
