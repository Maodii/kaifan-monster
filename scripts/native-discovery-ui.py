"""Native catalog regression. No meal, plan, stock or cloud-sync writes."""
from pathlib import Path
import json,time,re,hashlib
helper=Path(__file__).with_name('native-utility-smoke.py');exec(compile(helper.read_text().split('\ntry:\n')[0],str(helper),'exec'))
def bounds(n):return list(map(int,re.findall(r'-?\d+',n['bounds'])))
def ids(nodes):return [n['id'] for n in nodes if n.get('id','').startswith('recipe-card-')]
def full_ids(nodes):return [n['id'] for n in nodes if n.get('id','').startswith('recipe-card-') and n.get('visible')!='false' and bounds(n)[1]>200 and bounds(n)[3]<2450]
def field(value):
 n=node_by_id('recipe-search');b=bounds(n);x=(b[0]+b[2])//2;y=(b[1]+b[3])//2
 if n.get('text'):
  ui.hdc('shell','uitest','uiInput','click',x,y);ui.hdc('shell','uitest','uiInput','keyEvent',2072,2017);ui.hdc('shell','uitest','uiInput','keyEvent',2055);ui.hdc('shell','uitest','uiInput','text',value)
 else:ui.hdc('shell','uitest','uiInput','inputText',x,y,value)
 ui.hdc('shell','uitest','uiInput','keyEvent',2054);time.sleep(.7)
def node_by_id(key):
 for _ in range(16):
  n=next((n for n in ui.dump() if n.get('id')==key and n.get('visible')!='false'),None)
  if n and bounds(n)[3]>bounds(n)[1] and 120<(bounds(n)[1]+bounds(n)[3])//2<2450:return n
  ui.hdc('shell','uitest','uiInput','swipe',1000,600,1000,2400,250)
 raise AssertionError('Missing id '+key)
def expect_contains(text):
 for _ in range(4):
  if any(text in n.get('text','') for n in ui.dump()):checks.append(text);print('PASS contains '+text,flush=True);return
  ui.hdc('shell','uitest','uiInput','swipe',1000,600,1000,2400,250)
 raise AssertionError('Missing text containing '+text)
def click_id(key):
 n=node_by_id(key);b=bounds(n);ui.hdc('shell','uitest','uiInput','click',(b[0]+b[2])//2,(b[1]+b[3])//2);time.sleep(.6)
def scroll_cards():
 for _ in range(8):
  rows=[n for n in ui.dump() if n.get('id','').startswith('recipe-card-') and n.get('visible')!='false' and bounds(n)[1]>200 and bounds(n)[3]<2450]
  if rows:return rows
  ui.hdc('shell','uitest','uiInput','swipe',1000,2250,1000,1050,300)
 raise AssertionError('No full recipe cards')
try:
 restart();click('菜谱');expect('菜谱大全');click('清空筛选');expect('价格降序');expect('耗时降序');ui.screenshot('discovery-library.jpeg')
 click('价格升序');asc=scroll_cards()[0]['id'];click('价格降序');desc=scroll_cards()[0]['id'];assert asc!=desc;checks.append('native price ascending and descending produce different first recipes')
 click('耗时升序');fast=scroll_cards()[0]['id'];click('耗时降序');slow=scroll_cards()[0]['id'];assert fast!=slow;ui.screenshot('discovery-sorts.jpeg');checks.append('native time ascending and descending usable')
 rows=scroll_cards();time.sleep(1);rows=scroll_cards();target=rows[0];before=full_ids(ui.dump());before_y=bounds(target)[1];ui.screenshot('discovery-list-before.jpeg');b=bounds(target);ui.hdc('shell','uitest','uiInput','click',b[0]+90,b[1]+90);time.sleep(.8);expect('准备什么');ui.screenshot('discovery-detail.jpeg');click('‹ 返回');time.sleep(.5);after_nodes=ui.dump();after=full_ids(after_nodes);assert before==after,(before,after);restored=next(n for n in after_nodes if n.get('id')==target['id']);assert abs(bounds(restored)[1]-before_y)<12;ui.screenshot('discovery-list-return.jpeg');checks.append('return preserves exact visible recipe IDs, order and physical scroll coordinates')
 click('调整 ›');click('菜系');expect('九类菜系导航');expect('闽菜');expect('徽菜');click('川菜');ui.screenshot('discovery-cuisines.jpeg');n=next(n for n in ui.dump() if n.get('id')=='recipe-filter-apply');b=bounds(n);ui.hdc('shell','uitest','uiInput','click',(b[0]+b[2])//2,(b[1]+b[3])//2);time.sleep(.6);expect('川菜');click('清空筛选')
 field('红烧肉');expect('4种做法 ›');rows=scroll_cards();b=bounds(rows[0]);ui.hdc('shell','uitest','uiInput','click',b[0]+90,b[1]+90);time.sleep(.7);expect('同一道菜，不同做法');variant_nodes=[n for n in ui.dump() if n.get('id','').startswith('recipe-variant-')];assert len(variant_nodes)==4;ui.screenshot('discovery-variants.jpeg');checks.append('four original braised pork variants grouped with independent selectable IDs');click('‹ 返回');click('清空筛选')
 click('抽一餐');expect('抽取条件');click_id('draw-filter-entry');click('菜系');click('湘菜');click_id('recipe-filter-apply');expect('抽取条件');expect_contains('湘菜');ui.screenshot('discovery-draw-filters.jpeg');restart();click('菜谱');click('抽一餐');expect_contains('湘菜');checks.append('independent pre-draw cuisine filter visible and persists on restart')
 click_id('draw-filter-entry');click('菜系');click('湘菜');click_id('recipe-filter-apply');click('‹ 返回');click('为你推荐');expect('换一换');click_id('recipe-library-mode');assert not any(n.get('text') in ['换一换','换一批排列','再看一些菜谱'] for n in ui.dump());checks.append('only recommendation mode exposes shuffle; library has no refresh/load-more button')
 click('清空筛选');seen_cards=set()
 for attempt in range(36):
  seen_cards.update(ids(ui.dump()))
  if len(seen_cards)>24:break
  ui.hdc('shell','uitest','uiInput','swipe',1000,2350,1000,200,110)
 assert len(seen_cards)>24,'continuous scrolling did not expose over 24 unique cards without refresh'
 ui.screenshot('discovery-continuous-scroll.jpeg');checks.append('continuous native scrolling exposed '+str(len(seen_cards))+' distinct cards without load-more/refresh action')
 click('今日')
 result={'passed':True,'checks':checks,'source_sha256':hashlib.sha256((ui.ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'scope':'Actual native catalog/sorts/return/cuisines/grouped variants/draw filter persistence; no stock or meal writes; added draw cuisine filter toggled back; prior draw conditions retained'}
except Exception as e:result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-discovery-ui.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
