"""Native gesture conflict and scroll-memory checks; no saved business fixtures."""
from pathlib import Path
import json,hashlib,time
h=Path(__file__).with_name('native-discovery-ui.py');exec(compile(h.read_text().split('\ntry:\n')[0],str(h),'exec'))
try:
 restart();click('菜谱');click('清空筛选')
 for _ in range(2):ui.hdc('shell','uitest','uiInput','swipe',1000,2200,1000,700,500)
 time.sleep(.4);rows=scroll_cards();target=rows[0];key=target['id'];before=bounds(target)[1];click('记餐');click('菜谱');time.sleep(.5);n=next((n for n in ui.dump() if n.get('id')==key),None);assert n and abs(bounds(n)[1]-before)<14;checks.append('Switching tabs preserves actual visible recipe ID and scroll coordinate')
 click('菜谱');expect('菜谱大全');checks.append('Retapping current tab scrolls to top')
 # Short horizontal drag must not change main page.
 ui.hdc('shell','uitest','uiInput','swipe',650,330,560,330,450);time.sleep(.3);expect('菜谱大全');checks.append('Short swipe does not accidentally switch main page')
 rows=scroll_cards();b=bounds(rows[0]);ui.hdc('shell','uitest','uiInput','click',b[0]+90,b[1]+90);time.sleep(.5)
 ui.hdc('shell','uitest','uiInput','swipe',1000,2250,1000,700,500);title=node_by_id('recipe-toolbar-title');b=bounds(title);ui.hdc('shell','uitest','uiInput','doubleClick',(b[0]+b[2])//2,(b[1]+b[3])//2);time.sleep(.5);expect('准备什么');ui.screenshot('gesture-title-return-top.jpeg');checks.append('Double-tapping fixed recipe title scrolls content to top');click_id('recipe-back')
 click('食材');expect('我的库存');n=node('全部');b=bounds(n);ui.hdc('shell','uitest','uiInput','swipe',1050,(b[1]+b[3])//2,250,(b[1]+b[3])//2,450);time.sleep(.4);expect('我的库存');ui.screenshot('gesture-nested-strip.jpeg');checks.append('Horizontal category scroller keeps input; parent main-tab swipe does not steal it')
 click('今日');click('月历 ↓') if False else click_id('home-month-toggle');before=node_by_id('home-month-toggle')['text'];n=next(n for n in ui.dump() if n.get('id','').startswith('home-month-date-') and bounds(n)[1]>300);b=bounds(n);ui.hdc('shell','uitest','uiInput','swipe',1000,(b[1]+b[3])//2,300,(b[1]+b[3])//2,450);time.sleep(.4);after=node_by_id('home-month-toggle')['text'];assert before!=after;checks.append('Expanded calendar consumes horizontal month swipe');ui.hdc('shell','uitest','uiInput','swipe',300,(b[1]+b[3])//2,1000,(b[1]+b[3])//2,450);time.sleep(.4);assert node_by_id('home-month-toggle')['text']==before;click_id('home-month-toggle')
 result={'passed':True,'checks':checks,'source_sha256':hashlib.sha256((ui.ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'scope':'Actual native scroll memory, short-swipe protection, nested scrolling, month gestures and title/tab return-to-top; no saved meal/plan/stock writes'}
except Exception as e:result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-gesture-navigation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
