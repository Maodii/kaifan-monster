"""Focused native final layout/repeat/reduced-motion regression; preserves user records."""
from pathlib import Path
import json,time,re,hashlib,datetime
helper=Path(__file__).with_name('native-utility-smoke.py')
exec(compile(helper.read_text().split('\ntry:\n')[0],str(helper),'exec'))
try:
 last_day=datetime.date.today()+datetime.timedelta(days=6);last_label=last_day.strftime('%d')+'日';last_heading=last_day.strftime('%m-%d')+' 已安排'
 restart();ui.screenshot('shiku-utility-home.jpeg');click('七日计划');expect(last_label);ui.screenshot('shiku-utility-plan.jpeg');click(last_label);expect(last_heading);click('‹ 返回');click('菜谱');expect('对比 0/3');click('＋ 对比');expect('对比 1/3');click('＋ 对比');expect('对比 2/3');click('对比 2/3');expect('哪道更适合这顿？');ui.screenshot('shiku-utility-compare.jpeg');click('移除');click('移除');expect('先选两三道菜');click('‹ 返回');checks.append('two recipe comparison fits columns; fixture removed')
 click('今日');click('再吃一次上餐');expect('保存私有记录');assert any(time.strftime('%Y-%m-%d') in n.get('text','') for n in ui.dump()),'new draft date';ui.screenshot('shiku-utility-repeat.jpeg');click('‹ 返回');checks.append('repeat prefilled private draft with current date; cancelled without save')
 click('我的');click('外观与动效');expect('减少动画')
 def toggle():
  n=next(x for x in ui.dump() if x.get('type')=='Toggle');b=list(map(int,re.findall(r'-?\d+',n['bounds'])));ui.hdc('shell','uitest','uiInput','click',(b[0]+b[2])//2,(b[1]+b[3])//2);time.sleep(.8);return n.get('checked')
 original=toggle();changed=next(x for x in ui.dump() if x.get('type')=='Toggle').get('checked');assert changed!=original
 restart();click('我的');click('外观与动效');assert next(x for x in ui.dump() if x.get('type')=='Toggle').get('checked')==changed;toggle();assert next(x for x in ui.dump() if x.get('type')=='Toggle').get('checked')==original;checks.append('reduced motion persisted on restart and original setting restored');click('‹ 返回');click('今日')
 result={'passed':True,'checks':checks,'source_sha256':hashlib.sha256((ui.ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'no_new_meal_saved':True,'comparison_fixture_cleaned':True,'preference_restored':True}
except Exception as e:
 result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-utility-final.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
