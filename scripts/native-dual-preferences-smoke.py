#!/usr/bin/env python3
"""Only this task's emulator. Restore the original local preference values after checking."""
from pathlib import Path
import json
exec(Path(__file__).with_name('native-ux-smoke.py').read_text().split('\ntry:\n')[0])
checks=json.loads((ui.ROOT/'work/reports/native-dual-preferences.json').read_text()).get('checks',[]) if '--resume-scene' in sys.argv else []
# Newly opened pages begin at top; avoid unnecessary swipes on the settings pages.
def top():
 ui.hdc('shell','uitest','uiInput','swipe',1100,650,1100,2200,40000)
def summary():return seek('preference-summary',True,False)['text']
def select_goal(goal):
 click(goal);top();assert goal in summary(),summary()
def visit(scene):
 click('我的',scroll=False);top();click(scene+'偏好 ›');top()
def back():click('‹ 返回',scroll=False)
original={};changed=[]
try:
 restart();click('今日',scroll=False);top();before=[t for t in texts() if ' 餐  ·  ¥' in t];assert len(before)==1
 assert '做饭' not in texts() and '外食 / 外卖' not in texts()
 if '--resume-scene' in sys.argv:
  originalPath=ui.ROOT/'work/reports/native-dual-original.json'
  original=json.loads(originalPath.read_text()) if originalPath.exists() else {};changed=list(original)
 else:
  for scene in ['做饭','外食 / 外卖']:
   visit(scene);original[scene]=summary().split(' · ')[1];back()
  (ui.ROOT/'work/reports/native-dual-original.json').write_text(json.dumps(original,ensure_ascii=False))
  visit('做饭');select_goal('高蛋白');changed.append('做饭');back()
  visit('外食 / 外卖');select_goal('控制热量');changed.append('外食 / 外卖');ui.screenshot('shiku-outside-preferences.jpeg');back()
  visit('做饭');assert '高蛋白' in summary();ui.screenshot('shiku-cook-preferences.jpeg');back();note('设置中两套饮食目标独立，不互相覆盖')
  restart();visit('做饭');assert '高蛋白' in summary();back();visit('外食 / 外卖');assert '控制热量' in summary();back();note('两套设置重启后持久保留')
 click('菜谱',scroll=False);top();click('外食 / 外卖',scroll=False);seek('点菜灵感 · 参考外食偏好，不代表附近店铺或实时外卖；做菜耗时与家常成本不作送餐/售价参考。',scroll=False);ui.screenshot('shiku-outside-recommendations.jpeg')
 click('今日',scroll=False);top();after=[t for t in texts() if ' 餐  ·  ¥' in t];assert before==after,(before,after);ui.screenshot('shiku-home.jpeg');note('切换外食推荐后今日餐数/支出一致，首页没有模式分叉')
 click('菜谱',scroll=False);top();seek('外食 / 外卖',scroll=False);click('做饭',scroll=False);seek('不限时');note('做饭保留烹饪时间筛选，外食明确是点菜灵感')
 result={'passed':True,'checks':checks,'originalGoals':original}
except Exception as e:
 result={'passed':False,'checks':checks,'error':str(e),'originalGoals':original};raise
finally:
 # On an error preserve device evidence rather than guessing navigation or values.
 if 'result' in globals() and result['passed']:
  for scene in changed:
   visit(scene);select_goal(original[scene]);back()
  click('今日',scroll=False)
 (ui.ROOT/'work/reports/native-dual-preferences.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False),flush=True)
