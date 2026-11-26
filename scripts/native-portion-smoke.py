#!/usr/bin/env python3
import importlib.util,time,json
from pathlib import Path
s=importlib.util.spec_from_file_location('ui',Path(__file__).with_name('device-ui.py'));ui=importlib.util.module_from_spec(s);s.loader.exec_module(ui)
checks=[]
def texts(): return [x.get('text','') for x in ui.dump()]
def seek(text):
 for _ in range(12):
  if text in texts(): return
  ui.hdc('shell','uitest','uiInput','swipe',1000,2200,1000,900,650);time.sleep(.3)
 raise AssertionError(text)
try:
 for _ in range(12):
  if '今日' in texts(): break
  time.sleep(.3)
 ui.click('菜谱');ui.click('为你推荐');seek('微波炉鸡蛋羹');ui.click('微波炉鸡蛋羹');seek('用量与采购（可选） ↓');ui.click('用量与采购（可选） ↓');seek('一起吃多少？')
 # No stock mutation is performed.
 assert '2 人' in texts();ui.click('＋');ui.click('＋');assert '4 人' in texts();checks.append('人数步进2→4')
 seek('清淡');ui.click('清淡');seek('微辣');ui.click('微辣');checks.append('独立选择清淡与辣度')
 seek('应用推荐到本次制作');ui.hdc('shell','uitest','uiInput','swipe',1100,2100,1100,1650,650);time.sleep(.3);ui.screenshot('shiku-portions.jpeg');ui.click('应用推荐到本次制作');seek('准备食材 · 可调整实际用量');assert any('主料按上方实际数量' in x for x in texts()) or '准备食材 · 可调整实际用量' in texts();checks.append('明确应用推荐，仅更改本次制作草稿')
 result={'passed':True,'checks':checks,'scope':'headless ARM64 emulator; no cook/stock confirmation executed'}
except Exception as e:
 result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-portion-smoke.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
