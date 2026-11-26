"""Short read-only layout/navigation audit; favorite fixture is added then removed."""
from pathlib import Path
import importlib.util,json,time,re,hashlib
root=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('ui',root/'scripts/device-ui.py');ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
checks=[];temporary=None
def ns():return ui.dump()
def b(n):return list(map(int,re.findall(r'-?\d+',n['bounds'])))
def ident(i):return next(n for n in ns() if n.get('id')==i)
def tap(n):
 x,y,r,z=b(n);ui.hdc('shell','uitest','uiInput','click',(x+r)//2,(y+z)//2);time.sleep(.35)
def nav(t):tap(max((n for n in ns() if n.get('text')==t),key=lambda n:b(n)[1]))
def check(label,ok):assert ok,label;checks.append(label);print('PASS '+label,flush=True)
def back():ui.hdc('shell','uitest','uiInput','keyEvent',2);time.sleep(.3)
try:
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');time.sleep(1)
 nav('菜谱');n=ident('recipe-search');x,y,r,z=b(n);check('44vp icon-only search entry',70<=r-x<=160 and 70<=z-y<=160)
 title=next(n for n in ns() if n.get('text')=='菜谱' and b(n)[1]<800);check('search shares title row at top-left',abs((b(title)[1]+b(title)[3]-y-z)/2)<18 and x<b(title)[0]);ui.screenshot('search-heart-recipes.jpeg')
 tap(n);check('icon opens dedicated recipe search',any(n.get('text')=='搜索菜谱' for n in ns()));back()
 f=ident('recipe-favorites-only');check('favorite filter uses heart only',f.get('text') in ['♥','♡']);tap(f);check('favorite filter state changes',ident('recipe-favorites-only').get('text')!=f.get('text'));tap(ident('recipe-favorites-only'))
 ui.hdc('shell','uitest','uiInput','swipe',1000,2200,1000,650,500);time.sleep(.3)
 candidates=[n for n in ns() if n.get('id')=='recipe-search' and n.get('visible')!='false' and b(n)[1]>110 and b(n)[3]>b(n)[1]]
 check('search scrolls away instead of occupying fixed strip',not candidates)
 # Scroll until a non-favorite fully visible heart is found.
 for _ in range(4):
  hearts=[n for n in ns() if n.get('id','').startswith('recipe-card-heart-') and n.get('text')=='♡' and 180<b(n)[1]<2250]
  if hearts:break
  ui.hdc('shell','uitest','uiInput','swipe',1000,2100,1000,900,550);time.sleep(.2)
 heart=hearts[0];key=heart['id'];tap(heart);temporary=key;check('card heart favorites without opening detail',ident(key).get('text')=='♥' and not any(n.get('id')=='recipe-toolbar-title' for n in ns()));tap(ident(key));temporary=None;check('card heart cancellation restores original unselected state',ident(key).get('text')=='♡');ui.screenshot('search-heart-card.jpeg')
 nav('我的');node=next(n for n in ns() if n.get('text')=='我的吃饭档案');check('other tabs have no search entry',not any(n.get('id') in ['recipe-search','community-search-entry'] for n in ns()))
 result={'passed':True,'checks':checks,'source_sha256':hashlib.sha256((root/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'limits':['Existing emulator only','Community entry source/build verified; logged-out native community not exercised','No frame-rate benchmark']}
except Exception as e:
 result={'passed':False,'checks':checks,'error':repr(e)};raise
finally:
 if temporary:
  try:
   n=ident(temporary)
   if n.get('text')=='♥':tap(n)
  except Exception:result['restore_pending']=temporary
 (root/'work/reports/search-heart-native.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
