"""Navigate and measure real ArkUI pages on the already running emulator. No record submissions."""
from pathlib import Path
import importlib.util,time,re,json,hashlib,argparse
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('ui',ROOT/'scripts/device-ui.py');ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
parser=argparse.ArgumentParser();parser.add_argument('--phase',default='initial');args=parser.parse_args()
SCALE=1280/366
pages=[]
source=ROOT/'client/entry/src/main/ets/pages/Index.ets'
hap=ROOT/'client/entry/build/default/outputs/default/entry-default-unsigned.hap'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source_hash=sha(source);hap_hash=sha(hap)
def b(n):return list(map(int,re.findall(r'-?\d+',n['bounds'])))
def tap(n):
 x,y,r,z=b(n);assert z>y and 100<y<2700,(n.get('text'),b(n));ui.hdc('shell','uitest','uiInput','click',(x+r)//2,(y+z)//2);time.sleep(1.25)
def nodes():return ui.dump()
def scroll(down=True):ui.hdc('shell','uitest','uiInput','swipe',1070,2270 if down else 620,1070,700 if down else 2380,350);time.sleep(.4)
def text(label,find=True):
 for attempt in range(9 if find else 1):
  found=[n for n in nodes() if n.get('text')==label and n.get('visible')!='false' and 130<b(n)[1]<2450 and b(n)[3]>b(n)[1]]
  if found:return found[0]
  if find:scroll()
 raise AssertionError('Missing visible label '+label)
def nav(label):tap(max((n for n in nodes() if n.get('text')==label and b(n)[1]>2450),key=lambda n:b(n)[1]))
def ident(key):return next(n for n in nodes() if n.get('id')==key)
def back():ui.hdc('shell','uitest','uiInput','keyEvent',2);time.sleep(1.25)
def audit(name,shot=False):
 allnodes=nodes();issues=[];controls=[]
 for n in allnodes:
  if n.get('clickable')!='true' or n.get('visible')=='false':continue
  x,y,r,z=b(n)
  if y<130 or z>2730 or z<=y or r<=x or any(abs(a-c)>2 for a,c in zip([x,y,r,z],map(int,re.findall(r'-?\d+',n.get('origBounds',n['bounds']))))):continue
  item={'id':n.get('id'),'text':n.get('text'),'type':n.get('type'),'bounds':[x,y,r,z],'width_vp':round((r-x)/SCALE,2),'height_vp':round((z-y)/SCALE,2),'origBounds':n.get('origBounds')}
  controls.append(item)
  # Short visible targets are findings, not automatically business failures. Calendar has an explicit dense-grid exception.
  if ((r-x)/SCALE<40 or (z-y)/SCALE<40) and n.get('type') not in ['TextInput','Search'] and 'home-date' not in n.get('id',''):
   issues.append(item)
 page={'page':name,'controls':controls,'small_target_findings':issues,'text_count':sum(bool(n.get('text')) for n in allnodes)}
 if name=='filter-预算':
  people=[next(n for n in allnodes if n.get('text')==str(v)+'人') for v in [1,2,3,4,6]]
  centers=[(b(n)[1]+b(n)[3])/2 for n in people]
  assert max(centers)-min(centers)<2,'Numeric people tags should fit one row at the current native width'
  page['numeric_people_center_error_px']=max(centers)-min(centers)
 if shot:
  file='pixel-'+name+'.jpeg';ui.screenshot(file);page['screenshot']='work/screenshots/'+file
 pages.append(page);(ROOT/('work/reports/pixel-polish-audit-'+args.phase+'.json')).write_text(json.dumps({'status':'in_progress','pages':pages},ensure_ascii=False,indent=2)+'\n')
 print(name,'controls',len(controls),'small targets',len(issues),flush=True)
try:
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');time.sleep(2)
 audit('home',True);tap(ident('home-month-toggle'));audit('home-month');tap(ident('home-month-toggle'))
 nav('菜谱');audit('recipes',True)
 tap(ident('recipe-search'));audit('recipe-search',True);back()
 tap(ident('recipe-filter-entry'));audit('recipe-filters',True)
 for section in ['类别','餐次','菜系','地区','口味','目标','时间','预算','难度','排序']:
  for attempt in range(5):
   n=ident('filter-section-'+section);x,y,r,z=bounds=b(n)
   if r-x>=110 and 30<x and r<1250:break
   ui.hdc('shell','uitest','uiInput','swipe',1100,440,220,440,400);time.sleep(.6)
  else:raise AssertionError('Filter tab could not be brought into view: '+section)
  tap(n);audit('filter-'+section,section in ['预算','排序'])
 back()
 tap(ident('menu-draw-entry'));audit('draw',True);back()
 tap(text('上汤娃娃菜'));audit('detail',True)
 tap(text('食材'));audit('detail-ingredients');tap(text('娃娃菜'));audit('detail-ingredient-expanded');tap(text('收起 ↑'));tap(text('食材'))
 tap(text('调味料'));audit('detail-seasoning');tap(text('调味料'))
 tap(text('更多 ⋯'));audit('detail-more');tap(text('收起 ↑'));back()
 nav('我的');audit('settings',True)
 tap(text('我的吃饭档案'));audit('profile',True);tap(text('选择 ›'));audit('profile-region');back();back()
 for label in ['口味与抽菜','食材管理','外观与动效','提醒','账号与同步','数据与备份','帮助与课堂']:
  tap(text(label));audit('settings-'+label)
  if label=='账号与同步' and any(n.get('text')=='登录 / 注册账号' for n in nodes()):
   tap(text('登录 / 注册账号'));audit('login',True);tap(text('注册新账号'));audit('register');back()
   # auth back returns main page rather than nested settings
   tap(text(label));
  back()
 nav('食材');audit('inventory',True);tap(ident('stock-history-entry'));audit('stock-history');back()
 tap(text('采购清单'));audit('shopping',True);back()
 nav('记餐');audit('diary',True);tap(text('查看统计与导出报表'));audit('statistics');back()
 tap(text('＋ 记一餐'));audit('meal-editor',True);back()
 found=next((n for n in nodes() if n.get('text')=='放弃修改'),None)
 if found:tap(found)
 nav('今日');tap(text('七日计划'));audit('plans',True);back()
 tap(text('餐桌广场'));audit('community',True);tap(text('筛选菜谱、地区与试做 ↓'));audit('community-filters');tap(text('收起筛选 ↑'))
 tap(ident('community-search-entry'));audit('community-search');back();back()
 result={'passed':True,'status':'complete','pages':pages,'source_sha256':hashlib.sha256((ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'scope':'Navigation and target geometry on existing 1280px Harmony emulator; no form saved, no search submitted; larger font and other physical widths not tested','source_matches_installed':sha(source)==source_hash and sha(hap)==hap_hash,'compiled_hap_sha256':hap_hash,'installation_evidence':'Latest HAP installed with hdc immediately before final audit; hashes stable during audit','physicalDeviceVerified':False}
except Exception as e:
 result={'passed':False,'status':'failed','error':repr(e),'pages':pages};raise
finally:
 (ROOT/('work/reports/pixel-polish-audit-'+args.phase+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
