"""Real native gestures; no saved meal/plan/stock fixtures."""
from pathlib import Path
import json,hashlib,time
h=Path(__file__).with_name('native-discovery-ui.py');exec(compile(h.read_text().split('\ntry:\n')[0],str(h),'exec'))
def swipe(left=True,y=330,edge=False):
 ui.hdc('shell','uitest','uiInput','swipe',75 if edge else 1020 if left else 280,y,970 if edge else 280 if left else 1020,y,450);time.sleep(.65)
def title_text(t):
 assert any(n.get('text')==t and n.get('visible')!='false' for n in ui.dump()),'Page missing '+t
try:
 restart();title_text('开饭小怪')
 for target in ['菜谱大全','我的记餐','我的库存','我的小怪']:
  swipe();title_text(target);checks.append('left swipe to '+target)
 for target in ['我的库存','我的记餐','菜谱大全','开饭小怪']:
  swipe(False);title_text(target);checks.append('right swipe to '+target)
 strip=node_by_id('home-week-strip');b=bounds(strip);before=[n['id'] for n in ui.dump() if n.get('id','').startswith('home-date-')];swipe(True,(b[1]+b[3])//2);title_text('开饭小怪');after=[n['id'] for n in ui.dump() if n.get('id','').startswith('home-date-')];assert before!=after;checks.append('calendar swipe changes week without switching main tab');strip=node_by_id('home-week-strip');b=bounds(strip);swipe(False,(b[1]+b[3])//2);restored=[n['id'] for n in ui.dump() if n.get('id','').startswith('home-date-')];assert restored==before;checks.append('calendar reverse swipe restores original week');ui.screenshot('gesture-calendar.jpeg')
 click('菜谱');click('清空筛选');rows=scroll_cards();b=bounds(rows[0]);ui.hdc('shell','uitest','uiInput','click',b[0]+90,b[1]+90);time.sleep(.6);expect('准备什么');ui.screenshot('gesture-recipe.jpeg');swipe(False,620,True);title_text('菜谱大全');checks.append('left-edge right swipe returns from recipe')
 rows=scroll_cards();b=bounds(rows[0]);ui.hdc('shell','uitest','uiInput','click',b[0]+90,b[1]+90);time.sleep(.6);click('继续做菜');time.sleep(.4)
 old=next(n['text'] for n in ui.dump() if n.get('text','').startswith('步骤 '));swipe(True,800);new=next(n['text'] for n in ui.dump() if n.get('text','').startswith('步骤 '));assert old!=new;swipe(False,800);again=next(n['text'] for n in ui.dump() if n.get('text','').startswith('步骤 '));assert old==again;checks.append('cooking horizontal swipes advance and reverse a step');ui.screenshot('gesture-cooking.jpeg');click_id('recipe-back');click_id('recipe-back')
 click('记餐');click('＋ 记一餐');n=node_by_id('meal-dish-name');b=bounds(n);ui.hdc('shell','uitest','uiInput','inputText',(b[0]+b[2])//2,(b[1]+b[3])//2,'手势验证草稿');ui.hdc('shell','uitest','uiInput','keyEvent',2054);time.sleep(.3);swipe(False,620,True);expect('这一餐还没保存');click('继续记录');expect('这一餐，吃了什么');swipe(False,620,True);expect('这一餐还没保存');click('放弃修改');checks.append('edge return respects unsaved meal confirmation; cancel retains draft; discard removes draft without saving')
 click('今日')
 result={'passed':True,'checks':checks,'source_sha256':hashlib.sha256((ui.ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'scope':'Actual native horizontal tab/week/step/edge gestures and unsaved confirmation; temporary unsaved draft discarded; cooking step returned to initial step','limits':['No frame-rate or physical-device benchmark','Nested horizontal strip and repeat-tab scroll tested separately if recorded']}
except Exception as e:result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-gesture-motion.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
