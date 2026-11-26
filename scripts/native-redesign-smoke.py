"""Native UI regression on attached emulator; no record writes or desktop input."""
import importlib.util,time,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('ui',Path(__file__).with_name('device-ui.py'));ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
checks=[]
def seek(text):
 for _ in range(8):
  found=next((x for x in ui.dump() if x.get('text')==text and x.get('visible')!='false'),None)
  if found:return found
  ui.hdc('shell','uitest','uiInput','swipe',1100,2180,1100,850,700)
 raise AssertionError('Missing '+text)
def click(text):
 a=seek(text);x,y,xx,yy=map(int,re.findall(r'-?\d+',a['bounds']));ui.hdc('shell','uitest','uiInput','click',(x+xx)//2,(y+yy)//2);time.sleep(.5)
def expect(text):seek(text);checks.append(text)
def shot(name):ui.screenshot(name)
try:
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');time.sleep(2)
 expect('餐桌广场');shot('shiku-redesign-home.jpeg')
 click('餐桌广场');expect('登录 / 注册');shot('shiku-redesign-community.jpeg');click('登录 / 注册');expect('登录账号');click('‹ 返回');expect('餐桌广场');checks.append('community login cancel returns to community')
 click('‹ 返回');click('菜谱');expect('抽一餐');shot('shiku-redesign-recipes.jpeg')
 click('餐次与筛选');expect('哪一餐吃 · 可多选');shot('shiku-redesign-filter.jpeg');click('早餐');
 n=next(x for x in ui.dump() if x.get('id')=='recipe-filter-apply');x,y,xx,yy=map(int,re.findall(r'-?\d+',n['bounds']));ui.hdc('shell','uitest','uiInput','click',(x+xx)//2,(y+yy)//2);time.sleep(.5);expect('早餐');checks.append('native breakfast filter applied from draft')
 shot('shiku-redesign-breakfast.jpeg')
 click('清空筛选');click('抽一餐');expect('一菜一汤');expect('两菜一汤');click('只选一份汤');shot('shiku-redesign-draw.jpeg')
 # Sticky action uses id; draw may include long label.
 n=next(x for x in ui.dump() if x.get('id')=='draw-menu-submit');x,y,xx,yy=map(int,re.findall(r'-?\d+',n['bounds']));ui.hdc('shell','uitest','uiInput','click',(x+xx)//2,(y+yy)//2);time.sleep(2)
 expect('一起备料');shot('shiku-redesign-draw-result.jpeg');click('一起备料');checks.append('soup-only draw opens separate menu and ingredient result')
 click('‹ 返回');click('‹ 返回');click('我的');expect('口味与抽菜');shot('shiku-redesign-settings.jpeg')
 result={'passed':True,'checks':checks,'scope':'Actual attached HarmonyOS emulator ArkUI; read-only UI flows; no hardware camera/photo upload or real-device certification'}
except Exception as e:
 result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-redesign-smoke.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
