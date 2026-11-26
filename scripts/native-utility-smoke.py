"""Actual native utility flows. Creates then removes one plan fixture, never cooks/deducts."""
import importlib.util,time,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('ui',Path(__file__).with_name('device-ui.py'));ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
checks=[]
def node(text):
 def match():
  nodes=ui.dump();has_nav=all(any(n.get('text')==label and n.get('visible')!='false' for n in nodes) for label in ['今日','菜谱','记餐','食材','我的'])
  for x in nodes:
   bounds=list(map(int,re.findall(r'-?\d+',x.get('bounds',''))))
   if x.get('type')!='TextInput' and x.get('text')==text and x.get('visible')!='false' and len(bounds)==4 and 100<bounds[1] and bounds[3]<(2780 if not has_nav or text in ['今日','菜谱','记餐','食材','我的','保存私有记录','确认','取消','放弃修改','继续记录'] else 2450) and bounds[3]>120:return x
 n=match()
 if n:return n
 # A desired fixed header may be above the current scroll position.
 for _ in range(3):ui.hdc('shell','uitest','uiInput','swipe',1000,600,1000,2450,250)
 for _ in range(10):
  n=match()
  if n:return n
  ui.hdc('shell','uitest','uiInput','swipe',1000,2240,1000,850,300)
 raise AssertionError('Missing '+text)
def click(text):
 n=node(text);x,y,xx,yy=map(int,re.findall(r'-?\d+',n['bounds']));ui.hdc('shell','uitest','uiInput','click',(x+xx)//2,(y+yy)//2);time.sleep(.6)
def expect(text):node(text);checks.append(text);print('PASS '+text,flush=True)
def top():ui.hdc('shell','uitest','uiInput','swipe',1000,700,1000,2400,400);time.sleep(.3)
def restart():
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');time.sleep(2)
try:
 restart();expect('七日计划');ui.screenshot('shiku-utility-home.jpeg');click('七日计划');expect('七日餐桌计划');ui.screenshot('shiku-utility-plan.jpeg');click('＋ 选菜');expect('番茄炒蛋');click('番茄炒蛋');expect('移除');ui.screenshot('shiku-utility-plan-filled.jpeg');checks.append('new plan inserted from picker')
 restart();click('七日计划');expect('番茄炒蛋');checks.append('native plan persisted after process restart');click('番茄炒蛋');expect('继续做菜');ui.screenshot('shiku-utility-recipe.jpeg');click('继续做菜');expect('上一步');click('下一步');expect('步骤 2 / 3');expect('热锅少油，将蛋液炒至凝固，盛出备用。');ui.screenshot('shiku-utility-cooking.jpeg');click('‹ 返回');click('‹ 返回');click('番茄炒蛋');click('继续做菜');expect('步骤 2 / 3');checks.append('cooking step restored on recipe reopen')
 click('开始倒计时');expect('停止计时');ui.screenshot('shiku-utility-timer.jpeg');click('停止计时');checks.append('visible timer start and stop');click('重置本菜进度');click('确认');expect('步骤 1 / 3');click('‹ 返回');click('‹ 返回');click('移除');click('确认');checks.append('native plan fixture removed without cooking');click('‹ 返回');click('最近浏览');expect('番茄炒蛋');ui.screenshot('shiku-utility-recent.jpeg');click('‹ 返回');click('菜谱');expect('对比 0/3');click('＋ 对比');expect('对比 1/3');click('对比 1/3');expect('哪道更适合这顿？');ui.screenshot('shiku-utility-compare.jpeg');click('移除');expect('先选两三道菜');click('‹ 返回');checks.append('native compare select/open/remove')
 result={'passed':True,'checks':checks,'scope':'Actual ArkUI emulator; plan fixture cleaned; no inventory consumption or private meal creation','camera':'not exercised','system_reminder_delivery':'not exercised'}
except Exception as e:
 result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-utility-smoke.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
