from pathlib import Path
import importlib.util,json,re,time,hashlib
root=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('ui',root/'scripts/device-ui.py');ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
checks=[]
def ns():return ui.dump()
def b(n):return list(map(int,re.findall(r'-?\d+',n['bounds'])))
def tap(n):
 x,y,r,z=b(n);ui.hdc('shell','uitest','uiInput','click',(x+r)//2,(y+z)//2);time.sleep(.3)
def ident(k):
 for _ in range(5):
  n=next((n for n in ns() if n.get('id')==k),None)
  if n:return n
  time.sleep(.2)
 raise AssertionError('Missing '+k)
def text(t):return any(n.get('text')==t for n in ns())
def check(k,v):assert v,k;checks.append(k);print('PASS',k,flush=True)
def back():ui.hdc('shell','uitest','uiInput','keyEvent',2);time.sleep(.3)
try:
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');time.sleep(1)
 tap(max((n for n in ns() if n.get('text')=='菜谱'),key=lambda n:b(n)[1]));button=ident('recipe-search');check('Search label visible beside icon',text('搜索'));check('Compact search button has44vp height',70<=b(button)[3]-b(button)[1]<=180);ui.screenshot('search-hub-recipes.jpeg')
 tap(button);check('Dedicated recipe search opens',text('搜索菜谱'));back()
 check('Duplicate favorites filter removed',not any(n.get('id')=='recipe-favorites-only' for n in ns()))
 tap(ident('recipe-collection-entry'));check('Single collection hub opens',text('我的收藏'));check('Liked recipes and custom menus are separate sections',text('喜欢的菜') and text('自建菜单'));ui.screenshot('search-hub-collections.jpeg');back()
 ui.hdc('shell','uitest','uiInput','swipe',1000,2200,1000,650,500);time.sleep(.3)
 check('Search button scrolls away',not any(n.get('id')=='recipe-search' and n.get('visible')!='false' and b(n)[1]>110 and b(n)[3]>b(n)[1] for n in ns()))
 hearts=[n for n in ns() if n.get('id','').startswith('recipe-card-heart-') and b(n)[1]>180];check('Card hearts retain independent44vp tap areas',bool(hearts) and all(70<=b(n)[3]-b(n)[1]<=180 for n in hearts));ui.screenshot('search-hub-card.jpeg')
 result={'passed':True,'checks':checks,'source_sha256':hashlib.sha256((root/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'limits':['Native read-only UI check; no favorite/menu records mutated','Community logged-in view and physical device not tested','No performance benchmark']}
except Exception as e:result={'passed':False,'checks':checks,'error':repr(e)};raise
finally:
 (root/'work/reports/search-hub-native.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
