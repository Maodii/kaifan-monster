"""Native draw result and route smoke; no inventory, meal or plan writes."""
from pathlib import Path
import json,time,re,hashlib
helper=Path(__file__).with_name('native-utility-smoke.py');exec(compile(helper.read_text().split('\ntry:\n')[0],str(helper),'exec'))
try:
 restart();click('菜谱');click('抽一餐');expect('几示例主体一起吃');click('转出这一餐');time.sleep(2);expect('再抽一餐');expect('这一餐的菜');ui.screenshot('monster-draw-result.jpeg');checks.append('native spin completes and result controls become reachable')
 click('再抽一餐');time.sleep(2);expect('再抽一餐');click('‹ 返回');expect('几示例主体一起吃');click('‹ 返回');click('今日');checks.append('reroll and return route usable without stock consumption')
 result={'passed':True,'checks':checks,'source_sha256':hashlib.sha256((ui.ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'scope':'Native result/reroll/return controls; saved menu result updated, no meal/stock writes. Static screenshot does not verify frame rate.'}
except Exception as e:result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-monster-draw.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
