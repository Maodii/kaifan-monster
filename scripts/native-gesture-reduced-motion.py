"""Keep gestures usable with reduced motion, restoring the original preference."""
from pathlib import Path
import json,hashlib,time
h=Path(__file__).with_name('native-discovery-ui.py');exec(compile(h.read_text().split('\ntry:\n')[0],str(h),'exec'))
def control():return next(n for n in ui.dump() if n.get('type')=='Toggle')
def change():
 b=bounds(control());ui.hdc('shell','uitest','uiInput','click',(b[0]+b[2])//2,(b[1]+b[3])//2);time.sleep(.7)
initial=None
try:
 restart();click('我的');click('外观与动效');expect('减少动画');initial=control().get('checked');assert initial in ['true','false']
 if initial=='false':change()
 assert control().get('checked')=='true';restart();click('我的');click('外观与动效');assert control().get('checked')=='true';checks.append('Reduced-motion preference persists across process restart')
 click('‹ 返回');click('今日');ui.hdc('shell','uitest','uiInput','swipe',1020,330,280,330,450);time.sleep(.4);expect('菜谱大全');ui.hdc('shell','uitest','uiInput','swipe',280,330,1020,330,450);time.sleep(.4);expect('开饭小怪');checks.append('Main-tab gestures remain usable with reduced motion enabled')
 click('我的');click('外观与动效')
 if initial=='false':change()
 assert control().get('checked')==initial;checks.append('Original reduced-motion preference restored');click('‹ 返回');click('今日')
 result={'passed':True,'checks':checks,'source_sha256':hashlib.sha256((ui.ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'scope':'Actual native persisted reduce-motion preference and gesture behavior; original preference restored'}
except Exception as e:result={'passed':False,'checks':checks,'initial_preference':initial,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-gesture-reduced-motion.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
