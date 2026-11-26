"""Native calendar/sorting/disclosure checks; does not save new meals or plans."""
from pathlib import Path
import json,time,re,hashlib,datetime
helper=Path(__file__).with_name('native-utility-smoke.py');exec(compile(helper.read_text().split('\ntry:\n')[0],str(helper),'exec'))
def tap_id(key):
 for _ in range(12):
  n=next((n for n in ui.dump() if n.get('id')==key and n.get('visible')!='false'),None)
  if n:
   x,y,xx,yy=map(int,re.findall(r'-?\d+',n['bounds']))
   if yy>y and 120<(y+yy)//2<2450:ui.hdc('shell','uitest','uiInput','click',(x+xx)//2,(y+yy)//2);time.sleep(.7);return
  ui.hdc('shell','uitest','uiInput','swipe',1000,2150,1000,800,300)
 raise AssertionError('Missing id '+key)
try:
 restart();expect('开饭小怪');expect('今天的三餐');expect('早餐');expect('午餐');expect('晚餐');ui.screenshot('monster-home.jpeg')
 tomorrow=datetime.date.today()+datetime.timedelta(days=1);tap_id('home-date-'+str(tomorrow));expect(str(tomorrow)[5:]+' 的餐桌');assert not any(n.get('text')=='＋ 记餐' for n in ui.dump()),'future logging must not look like an eaten meal';click('安排 ›');expect(tomorrow.strftime('%m-%d')+' 已安排');checks.append('home-selected future date carried into planner');click('‹ 返回');click('回今天')
 tap_id('home-month-toggle');expect('下月 ›');click('下月 ›');today=datetime.date.today();nextmonth=(today.replace(day=28)+datetime.timedelta(days=4)).replace(day=1);tap_id('home-month-date-'+str(nextmonth));expect(nextmonth.strftime('%m-%d')+' 的餐桌');click('回今天');expect('今天的三餐');checks.append('month navigation and return today')
 click('菜谱');click('价格升序');ui.hdc('shell','uitest','uiInput','swipe',1000,2150,1000,1400,350);assert any('预估 ¥' in n.get('text','') for n in ui.dump());ui.screenshot('monster-price-sort.jpeg');click('耗时升序');ui.screenshot('monster-time-sort.jpeg');click('综合排序');checks.append('all three sort controls reachable with native price labels')
 click('今日');click('最近浏览');click('番茄炒蛋');expect('准备什么');assert not any(n.get('text')=='品类与替换 ›' for n in ui.dump()),'ingredients should initially fold';click('食材');click('西红柿');expect('参考总量 2个');expect('品类与替换 ›');ui.screenshot('monster-preparation.jpeg');click('食材');expect('统一做法 · 3 步');click('‹ 返回');click('‹ 返回')
 click('我的');click('口味与抽菜');expect('做饭偏好');expect('外食 / 外卖偏好');expect('不喜欢的菜');ui.screenshot('monster-preferences.jpeg');click('做饭偏好');expect('把口味，慢慢记住');click('‹ 返回');click('今日')
 result={'passed':True,'checks':checks,'source_sha256':hashlib.sha256((ui.ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'scope':'Actual native UI; no new meal, plan or stock written'}
except Exception as e:result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-monster-ux.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
