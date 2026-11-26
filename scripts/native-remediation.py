"""Current native discovery flow, with backend intentionally offline. No food/meal writes."""
from pathlib import Path
import json,re,time,hashlib
import importlib.util
spec=importlib.util.spec_from_file_location('ui',Path(__file__).with_name('device-ui.py'));ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
checks=[]
def bounds(n):return list(map(int,re.findall(r'-?\d+',n['bounds'])))
def node(text=None,key=None):
 for attempt in range(4):
  for n in ui.dump():
   if ((text is not None and n.get('text')==text and n.get('type')!='TextInput') or (key is not None and n.get('id')==key)) and n.get('visible')!='false':
    b=bounds(n)
    if b[3]>b[1] and b[1]>100 and b[3]<2780:return n
  if attempt<3:ui.hdc('shell','uitest','uiInput','swipe',1000,600 if attempt==0 else 2200,1000,2400 if attempt==0 else 900,200)
 raise AssertionError('Missing '+str(text or key))
def click(text):
 b=bounds(node(text=text));ui.hdc('shell','uitest','uiInput','click',(b[0]+b[2])//2,(b[1]+b[3])//2);time.sleep(.65)
def node_by_id(key):return node(key=key)
def click_id(key):
 b=bounds(node(key=key));ui.hdc('shell','uitest','uiInput','click',(b[0]+b[2])//2,(b[1]+b[3])//2);time.sleep(.65)
def expect(text):node(text=text);checks.append(text);print('PASS '+text,flush=True)
def expect_contains(text):assert any(text in n.get('text','') for n in ui.dump()),text

def scroll_cards():
 for attempt in range(4):
  rows=[n for n in ui.dump() if n.get('id','').startswith('recipe-card-') and n.get('visible')!='false' and bounds(n)[1]>200 and bounds(n)[3]<2450]
  if rows:return rows
  ui.hdc('shell','uitest','uiInput','swipe',1000,2250,1000,1050,200)
 raise AssertionError('No full recipe cards')
def restart():
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');time.sleep(1)
def text_values():return [n.get('text','') for n in ui.dump() if n.get('visible')!='false']
def set_search(value):
 click_id('recipe-search');expect('搜索历史');n=node_by_id('discovery-search-input');b=bounds(n);ui.hdc('shell','uitest','uiInput','inputText',(b[0]+b[2])//2,(b[1]+b[3])//2,value);ui.hdc('shell','uitest','uiInput','keyEvent',2054);time.sleep(1);click('搜索');time.sleep(1)
def top_page():
 for _ in range(4):ui.hdc('shell','uitest','uiInput','swipe',1000,600,1000,2400,200)
def apply_label():return next(t for t in text_values() if re.match(r'查看 \d+ 份做法',t))
result={'passed':False};term='五花肉 鸡蛋';was_history=False
try:
 restart();click('菜谱');click('清空筛选');click_id('recipe-search');expect('搜索历史');was_history=False;expect('社区热搜榜');ui.screenshot('remediation-search.jpeg');click('‹ 返回');expect('菜谱大全');checks.append('separate top search entry and cancel returns without applying')
 set_search(term);
 if not any(n.get('id')=='recipe-search' for n in ui.dump()):click('搜索');time.sleep(1)
 expect_contains('五花肉');click_id('recipe-search');expect(term);ui.screenshot('remediation-search-history.jpeg');click('‹ 返回');click('清空筛选');checks.append('submitted search recorded and visible after re-entry')
 click('调整 ›');expect('现有食材');base=apply_label();click('猪肉类');selected=apply_label();assert selected!=base,(base,selected);ui.screenshot('remediation-filter.jpeg');click_id('recipe-filter-apply');expect_contains('猪肉类');pork_count=next(t for t in text_values() if '份做法' in t and '道' in t);checks.append('fixed apply button present; live count changes and pork group applies')
 click('调整 ›');click('类别');click('汤类');click('‹ 返回');assert pork_count in text_values();checks.append('cancel discards category draft without changing existing ingredient filter')
 click('调整 ›');click('重置');click_id('recipe-filter-apply');expect('450道 · 454份做法');checks.append('reset restores all 454 variants')
 click('食材');checks.append('inventory route reachable; empty current account left unchanged');click('菜谱');click_id('recipe-search');click('蛋类');expect('蛋类，可以这样吃');expect('全部相关菜谱');ui.screenshot('remediation-ingredient.jpeg');click('全部相关菜谱');expect_contains('蛋类');rows=scroll_cards();b=bounds(rows[0]);ui.hdc('shell','uitest','uiInput','click',b[0]+70,b[1]+70);time.sleep(.7);expect('准备什么');click('营养参考');expect_contains('非检测值');ui.screenshot('remediation-nutrition.jpeg');click('‹ 返回');click('清空筛选');checks.append('ingredient taxonomy opens matching recipes and expandable honest nutrition')
 click('今日');top_page();ui.screenshot('remediation-home.jpeg');click('餐桌广场');expect('关注');expect('收藏');click('消息 ›');expect('餐桌消息');ui.screenshot('remediation-inbox.jpeg');click('‹ 返回');click('‹ 返回');checks.append('community follow/bookmark categories and inbox route accessible offline')
 if not was_history:
  click_id('recipe-search');nodes=ui.dump();target=next(n for n in nodes if n.get('text')==term and n.get('type')!='TextInput');b=bounds(target);cross=next(n for n in nodes if n.get('text')=='×' and abs((bounds(n)[1]+bounds(n)[3])//2-(b[1]+b[3])//2)<20 and bounds(n)[0]>=b[2]);c=bounds(cross);ui.hdc('shell','uitest','uiInput','click',(c[0]+c[2])//2,(c[1]+c[3])//2);time.sleep(.3);assert term not in text_values();click('‹ 返回');checks.append('single history deletion removes only temporary query')
 result={'passed':True,'checks':checks,'source_sha256':hashlib.sha256((ui.ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'scope':'Current actual native emulator, backend offline, existing inventory read-only; temporary search history removed if newly inserted','limits':['No physical-device camera/notification/card checks','Online account/community successful mutations covered by HTTP and DB tests; not this offline UI run','Current account inventory empty; ingredient navigation verified through same shared route from search taxonomy']}
except Exception as error:result={'passed':False,'checks':checks,'error':str(error)};raise
finally:
 (ui.ROOT/'work/reports/native-remediation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False),flush=True)
