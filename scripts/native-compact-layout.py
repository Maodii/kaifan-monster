"""Native toolbar/favorite/meal layout checks; no meal, plan or inventory writes."""
from pathlib import Path
import json,hashlib,time
h=Path(__file__).with_name('native-discovery-ui.py');exec(compile(h.read_text().split('\ntry:\n')[0],str(h),'exec'))
def heart():
 return next(n['text'] for n in ui.dump() if n.get('text') in ['♥','♡'])
def titlebar():
 nodes=ui.dump();title=next(n for n in nodes if n.get('id')=='recipe-toolbar-title');fav=next(n for n in nodes if n.get('id')=='recipe-favorite');assert abs((bounds(title)[1]+bounds(title)[3])//2-(bounds(fav)[1]+bounds(fav)[3])//2)<12;assert bounds(title)[3]<350;return title
try:
 restart();click('菜谱');click('清空筛选');rows=scroll_cards();target=rows[0];b=bounds(target);ui.hdc('shell','uitest','uiInput','click',b[0]+90,b[1]+90);time.sleep(.6)
 heading=titlebar();expect('准备什么');assert not any(n.get('text') in ['收藏 ♡','已收藏 ♥','不喜欢这道？以后不抽到它','只记我吃了这道菜'] for n in ui.dump());checks.append('Recipe title and icon-only favorite aligned in fixed top bar; duplicate actions removed');ui.screenshot('compact-recipe.jpeg')
 baseline=heart();click_id('recipe-favorite');time.sleep(.4);assert heart()!=baseline;checks.append('Favorite toggle responds');ui.screenshot('compact-favorite.jpeg');click_id('recipe-favorite');time.sleep(.4);assert heart()==baseline;checks.append('Unfavorite toggle responds and restores initial favorite state')
 ui.hdc('shell','uitest','uiInput','swipe',1000,2250,1000,850,350);assert titlebar()['text']==heading['text'];checks.append('Recipe toolbar remains visible while scrolling');click_id('recipe-back')
 click('记餐');click('＋ 记一餐');expect('这一餐，吃了什么');n=next(n for n in ui.dump() if n.get('id')=='meal-dishes-heading');assert bounds(n)[3]-bounds(n)[1]<110;assert not any(n.get('text')=='自己填菜名，或点选熟悉的菜' for n in ui.dump());ui.screenshot('compact-meal-top.jpeg');checks.append('Meal title fits one native line and redundant hint removed')
 expect('家常');expect('早餐');ui.screenshot('compact-meal-choices.jpeg');checks.append('Meal category and occasion chips rendered with centered wax swatches')
 click('‹ 返回');
 result={'passed':True,'checks':checks,'source_sha256':hashlib.sha256((ui.ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'scope':'Actual native layout, fixed toolbar and reversible favorite actions; no meal, plan or inventory writes','limits':['No frame-rate benchmark','Wax/text alignment visually reviewed at emulator viewport; physical device not exercised']}
except Exception as e:result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-compact-layout.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
