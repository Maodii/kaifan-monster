"""Bounded native motion/layout checks on the existing device; no record saves."""
from pathlib import Path
import importlib.util,subprocess,time,re,json,hashlib
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('ui',ROOT/'scripts/device-ui.py');ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
checks=[];captures=[];started=time.monotonic()
def nodes():return ui.dump()
def b(n):return list(map(int,re.findall(r'-?\d+',n['bounds'])))
def tap(n):
 x,y,r,z=b(n);ui.hdc('shell','uitest','uiInput','click',(x+r)//2,(y+z)//2);time.sleep(.28)
def ident(key,ns=None):return next(n for n in (ns or nodes()) if n.get('id')==key and n.get('visible')!='false')
def nav(label):tap(max((n for n in nodes() if n.get('text')==label),key=lambda n:b(n)[1]))
def check(label,ok):assert ok,label;checks.append(label);print('PASS '+label,flush=True)
def shot(label):ui.screenshot('motion-'+label+'.jpeg');captures.append('work/screenshots/motion-'+label+'.jpeg')
def back():ui.hdc('shell','uitest','uiInput','keyEvent',2);time.sleep(.3)
def title(t):return any(n.get('text')==t and n.get('visible')!='false' for n in nodes())
try:
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper')
 proc=subprocess.Popen([ui.HDC,'-t',ui.TARGET,'shell','aa start -a EntryAbility -b com.shiku.foodkeeper'],stdout=subprocess.PIPE)
 # Capture actual startup states, not an artificial in-app delay.
 for i in range(3):shot('launch-'+str(i))
 proc.communicate(timeout=20);check('cold launch command succeeds',proc.returncode==0)
 ns=nodes();check('launch overlay removed; home ready',not any(n.get('id')=='launch-screen' for n in ns) and any(n.get('text')=='今日' for n in ns));shot('home')
 nav('菜谱');check('recipe destination visible after short transition',title('菜谱大全'));shot('recipes')
 # Measure search entry/text centres and ensure it is a compact strip.
 ns=nodes();entry=ident('recipe-search',ns);x,y,r,z=b(entry)
 label=next(n for n in ns if n.get('text')=='搜索' and y<=b(n)[1] and b(n)[3]<=z)
 check('search action vertically centered',abs((b(label)[1]+b(label)[3]-y-z)/2)<=2)
 check('search entry compact and inside viewport',z-y<190 and 0<=x<r<=1260)
 tap(entry);check('search destination visible',title('搜索菜谱'));back();check('search return preserves recipe destination',title('菜谱大全'))
 # Below fold list: detail and return must preserve the same card position.
 for _ in range(5):
  ns=nodes();cards=[n for n in ns if n.get('id','').startswith('recipe-card-') and 180<b(n)[1]<1900 and b(n)[3]<2400]
  if cards:break
  ui.hdc('shell','uitest','uiInput','swipe',1000,2200,1000,600,500);time.sleep(.2)
 card=cards[0];key=card['id'];before=b(card)[1]
 x,y,r,z=b(card);ui.hdc('shell','uitest','uiInput','click',x+80,y+80);time.sleep(.4)
 ns=nodes();check('recipe detail opens',any(n.get('id')=='recipe-toolbar-title' for n in ns));shot('detail')
 toolbar=ident('recipe-toolbar-title',ns);check('normal-width recipe toolbar title one line',b(toolbar)[3]-b(toolbar)[1]<135)
 tap(ident('recipe-back'));ns=nodes();returned=ident(key,ns)
 check('list scroll restored without delayed jump',abs(b(returned)[1]-before)<=12)
 # Four transitions only, not a stress loop.
 for label,t in [('记餐','我的记餐'),('食材','我的库存'),('我的','我的吃饭档案'),('今日','开饭小怪')]:
  nav(label);check('tab transition '+label,title(t))
 # Three fast queued tab clicks must settle at the last destination.
 ns=nodes();targets=[max((n for n in ns if n.get('text')==label),key=lambda n:b(n)[1]) for label in ['菜谱','食材','今日']]
 for n in targets:
  x,y,r,z=b(n);ui.hdc('shell','uitest','uiInput','click',(x+r)//2,(y+z)//2)
 time.sleep(.3);check('rapid tab changes settle at final destination',title('开饭小怪'))
 # Background/foreground must not replay startup or strand faded content.
 ui.hdc('shell','uitest','uiInput','keyEvent','Home');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');time.sleep(.35)
 ns=nodes();check('foreground resumes without launch overlay',not any(n.get('id')=='launch-screen' for n in ns) and any(n.get('text')=='今日' for n in ns));shot('resumed')
 pid=ui.hdc('shell','pidof','com.shiku.foodkeeper').strip();check('app process alive',bool(pid))
 result={'passed':True,'checks':checks,'captures':captures,'seconds':round(time.monotonic()-started,2),'app_pid':pid,'source_sha256':hashlib.sha256((ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'limits':['Real existing emulator; no physical-device/frame-rate acceptance','Startup snapshots are sampled, not a smoothness benchmark','No long stress or user meal/stock writes']}
except Exception as e:
 result={'passed':False,'checks':checks,'captures':captures,'error':repr(e)};raise
finally:
 (ROOT/'work/reports/motion-polish-native.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False),flush=True)
