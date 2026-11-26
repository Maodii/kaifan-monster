"""Measure centered UI frames and generated ornament coverage on the existing device; no record saves."""
from pathlib import Path
import importlib.util,time,re,json,hashlib
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('ui',root/'scripts/device-ui.py');ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
checks=[];measurements={};shots=[]
source=root/'client/entry/src/main/ets/pages/Index.ets';hap=root/'client/entry/build/default/outputs/default/entry-default-unsigned.hap'
source_hash=hashlib.sha256(source.read_bytes()).hexdigest();hap_hash=hashlib.sha256(hap.read_bytes()).hexdigest()
def b(n):return list(map(int,re.findall(r'-?\d+',n['bounds'])))
def center(n):
 x,y,r,z=b(n);return ((x+r)/2,(y+z)/2)
def tap(n):
 x,y,r,z=b(n);ui.hdc('shell','uitest','uiInput','click',(x+r)//2,(y+z)//2);time.sleep(1.2)
def nav(t):tap(max((n for n in ui.dump() if n.get('text')==t),key=lambda n:b(n)[1]))
def ident(key,nodes=None):return next(n for n in (nodes or ui.dump()) if n.get('id')==key)
def txt(text,nodes=None):return next(n for n in (nodes or ui.dump()) if n.get('text')==text)
def child_nodes(parent,nodes):return [n for n in nodes if n.get('hierarchy','').startswith(parent['hierarchy']+',')]
def check(name,ok):assert ok,name;checks.append(name)
def shot(name):
 filename='pixel-'+name+'.jpeg';ui.screenshot(filename);shots.append('work/screenshots/'+filename);return root/shots[-1]
def ornament(parent,children,resource):
 x,y,r,z=b(parent);alpha=Image.open(root/resource).convert('RGBA').getchannel('A').resize((r-x,z-y),Image.Resampling.BILINEAR);arr=np.asarray(alpha);parts=[]
 for n in children:
  if n.get('type') not in ['Text','Image']:continue
  a,c,d,e=b(n);local=arr[max(0,c-y):min(z-y,e-y),max(0,a-x):min(r-x,d-x)]
  if not local.size:continue
  parts.append({'kind':n['type'],'text':n.get('text'),'bounds':b(n),'pigment_coverage':float((local>8).mean()),'average_alpha':float(local.mean()/255)})
 return parts
try:
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');time.sleep(2)
 nodes=ui.dump();collage=ident('home-collage',nodes);x,y,r,z=b(collage)
 check('Home food collage keeps its intrinsic 1024:498 ratio',abs((r-x)/(z-y)-1024/498)<.02)
 dates=[n for n in nodes if n.get('id','').startswith('home-date-')];errors=[]
 for date in dates:
  for child in child_nodes(date,nodes):
   if child.get('type')=='Text':errors.append(abs(center(child)[0]-center(date)[0]))
 check('All week day, date and meal markers share each date cell center',max(errors)<2)
 measurements['calendar_max_center_error_px']=max(errors)
 headers=[txt(t,nodes) for t in ['早餐','午餐','晚餐']];check('All three meal headers share one text start',max(b(n)[0] for n in headers)-min(b(n)[0] for n in headers)<2)
 shot('home')
 nav('菜谱');nodes=ui.dump();search=ident('recipe-search',nodes);label=txt('搜菜谱、食材',nodes);action=txt('搜索',nodes)
 error=abs(center(label)[1]-center(action)[1]);check('Search placeholder and action frames share a vertical center',error<=1.5);check('Narrow search frame remains horizontally centered',abs(center(search)[0]-640)<2)
 measurements['search']={'frame':b(search),'placeholder':b(label),'action':b(action),'vertical_center_error_px':error,'height_vp':(b(search)[3]-b(search)[1])/3.5}
 draw=ident('menu-draw-entry',nodes);parts=ornament(draw,child_nodes(draw,nodes),'client/entry/src/main/resources/base/media/crayon_ribbon_honey.png')
 check('Draw label and illustration have pigment beneath their full content frames',min(p['pigment_coverage'] for p in parts)>.97)
 centers=[center(n)[1] for n in child_nodes(draw,nodes) if n.get('type') in ['Image','Text']];check('Draw icon and text center lines coincide',max(centers)-min(centers)<2)
 measurements['draw_entry']={'bounds':b(draw),'parts':parts,'center_error_px':max(centers)-min(centers),'coverage_method':'formal alpha projected using verified 100% background frame; screenshot visually inspected separately'}
 shot('recipes')
 tap(draw);nodes=ui.dump();presets=[n for n in nodes if n.get('id','').startswith('draw-preset-')];check('Six menu presets retain separate full touch regions',len(presets)==6 and all(b(n)[3]-b(n)[1]>=180 for n in presets))
 submit=ident('draw-menu-submit',nodes);parts=ornament(submit,child_nodes(submit,nodes),'client/entry/src/main/resources/base/media/crayon_ribbon_honey.png');check('Draw submission paint covers its label',bool(parts) and min(p['pigment_coverage'] for p in parts)>.97)
 measurements['draw_presets']=[{'id':n['id'],'bounds':b(n)} for n in presets];shot('draw')
 ui.hdc('shell','uitest','uiInput','keyEvent',2);time.sleep(1.2)
 tap(txt('上汤娃娃菜'));nodes=ui.dump();back=ident('recipe-back',nodes);title=ident('recipe-toolbar-title',nodes);heart=ident('recipe-favorite',nodes)
 check('Detail title has disjoint space between back and favorite',b(back)[2]<=b(title)[0] and b(title)[2]<=b(heart)[0]);check('Favorite retains a 48vp target',b(heart)[2]-b(heart)[0]>=167 and b(heart)[3]-b(heart)[1]>=167)
 guide=ident('guide-step-0',nodes);check('First method step is available in the initial detail viewport',b(guide)[1]<2500)
 measurements['detail']={'back':b(back),'title':b(title),'favorite':b(heart),'first_step':b(guide)};shot('detail')
 ui.hdc('shell','uitest','uiInput','keyEvent',2);time.sleep(1.2);nav('记餐');tap(txt('＋ 记一餐'));nodes=ui.dump();photo=ident('meal-photo-area',nodes)
 check('Empty photo controls use at most 60vp vertically',(b(photo)[3]-b(photo)[1])/3.5<=60.5)
 name=ident('meal-dish-name',nodes);cost=ident('meal-dish-cost',nodes);check('Dish name and amount fields have a shared center and separate bounds',abs(center(name)[1]-center(cost)[1])<2 and b(name)[2]<b(cost)[0])
 measurements['meal']={'photo_frame':b(photo),'photo_height_vp':(b(photo)[3]-b(photo)[1])/3.5,'name':b(name),'cost':b(cost)};shot('meal-editor')
 ui.hdc('shell','uitest','uiInput','keyEvent',2);time.sleep(1.2)
 discard=next((n for n in ui.dump() if n.get('text')=='放弃修改'),None)
 if discard:tap(discard)
 nav('我的');shot('settings');nav('今日')
 check('Source and installed build references stayed stable during geometry run',hashlib.sha256(source.read_bytes()).hexdigest()==source_hash and hashlib.sha256(hap.read_bytes()).hexdigest()==hap_hash)
 result={'passed':True,'checks':checks,'measurements':measurements}
except Exception as e:
 result={'passed':False,'checks':checks,'measurements':measurements,'error':repr(e)};raise
finally:
 result.update(source_sha256=source_hash,compiled_hap_sha256=hap_hash,screenshots=shots,scope='Real 1280px Harmony emulator geometry + formal alpha projection; no form saves or searches; other physical widths and camera not verified')
 (root/'work/reports/pixel-polish-native.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
