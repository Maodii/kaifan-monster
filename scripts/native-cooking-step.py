"""Verify actual instruction changes, not just a step heading, on the native emulator."""
from pathlib import Path
import json,time,re,hashlib
helper=Path(__file__).with_name('native-utility-smoke.py')
exec(compile(helper.read_text().split('\ntry:\n')[0],str(helper),'exec'))
try:
 restart();click('最近浏览');click('番茄炒蛋');click('继续做菜')
 click('重置本菜进度');click('确认')
 expect('步骤 1 / 3');expect('西红柿洗净切块，鸡蛋打散。')
 click('下一步');expect('步骤 2 / 3');expect('热锅少油，将蛋液炒至凝固，盛出备用。')
 expect('处理后备用');assert not any('按本步文字取料' in n.get('text','') for n in ui.dump()),'generic ingredient filler visible'
 ui.screenshot('shiku-utility-cooking.jpeg')
 click('下一步');expect('步骤 3 / 3');expect('炒软西红柿，加入鸡蛋翻炒，按口味调味后出锅。')
 click('上一步');expect('步骤 2 / 3');expect('热锅少油，将蛋液炒至凝固，盛出备用。')
 click('重置本菜进度');click('确认');expect('步骤 1 / 3')
 click('‹ 返回');click('‹ 返回');click('‹ 返回');click('菜谱')
 search=next(n for n in ui.dump() if n.get('id')=='recipe-search')
 x,y,xx,yy=map(int,re.findall(r'-?\d+',search['bounds']))
 ui.hdc('shell','uitest','uiInput','inputText',(x+xx)//2,(y+yy)//2,'海南椰香鸡丝蔬菜汤');time.sleep(1)
 ui.hdc('shell','uitest','uiInput','keyEvent','Back');time.sleep(1)
 expect('海南椰香鸡丝蔬菜汤');click('海南椰香鸡丝蔬菜汤');ui.screenshot('shiku-utility-new-recipe.jpeg');expect('继续做菜')
 click('‹ 返回');click('清空搜索 ×');click('今日')
 result={'passed':True,'checks':checks,'step_content_verified_forward_and_back':True,'cooking_reset':True,'new_recipe_opened':'海南椰香鸡丝蔬菜汤','source_sha256':hashlib.sha256((ui.ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest()}
except Exception as e:
 result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-cooking-step.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
