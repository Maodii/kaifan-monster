"""Bounded, read-only UI navigation soak on the existing emulator, with memory safety guards.
Dwell time is intentional: repeated navigation plus stable-page intervals exercise image/cache/animation lifetimes.
No emulator is launched, no data form is submitted, and no host window is foregrounded.
"""
from pathlib import Path
import argparse,datetime,hashlib,importlib.util,json,re,subprocess,time
root=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('ui',root/'scripts/device-ui.py');ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
p=argparse.ArgumentParser();p.add_argument('--duration',type=int,default=3600);p.add_argument('--cycle-seconds',type=int,default=45);args=p.parse_args()
assert 60<=args.duration<=5400 and 25<=args.cycle_seconds<=60
report=root/'work/reports/pixel-polish-soak.json';events=root/'work/reports/pixel-polish-soak-events.jsonl'
source=root/'client/entry/src/main/ets/pages/Index.ets';hap=root/'client/entry/build/default/outputs/default/entry-default-unsigned.hap'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source_hash=sha(source);hap_hash=sha(hap);started=time.monotonic();began=datetime.datetime.now().astimezone().isoformat();samples=[];checks=0;cycles=0;pid='';baseline_diary='';last_diary=''
def b(n):return list(map(int,re.findall(r'-?\d+',n['bounds'])))
def tap(n):
 x,y,r,z=b(n);assert z>y and r>x
 ui.hdc('shell','uitest','uiInput','click',(x+r)//2,(y+z)//2);time.sleep(1.2)
def nav(label):
 nodes=ui.dump();tap(max((n for n in nodes if n.get('text')==label and b(n)[1]>2450),key=lambda n:b(n)[1]));return ui.dump()
def mem():
 current=ui.hdc('shell','pidof','com.shiku.foodkeeper').strip();assert current==pid,'App PID changed unexpectedly'
 status=ui.hdc('shell','cat','/proc/'+pid+'/status')
 fields={k:int(v) for k,v in re.findall(r'^(VmRSS|VmHWM|VmSwap|Threads):\s+(\d+)',status,re.M)}
 rows=subprocess.check_output(['ps','-axo','pid,rss,comm'],text=True).splitlines();emulator=[]
 for row in rows:
  parts=row.strip().split(None,2)
  if len(parts)==3 and parts[2].endswith('/tools/emulator/Emulator'):emulator.append({'pid':int(parts[0]),'rss_kb':int(parts[1])})
 fields['emulator']=emulator;fields['elapsed_seconds']=round(time.monotonic()-started,2)
 return fields
def save(status,error=None):
 data={'status':status,'passed':status=='complete','started_at':began,'elapsed_seconds':round(time.monotonic()-started,2),'requested_duration_seconds':args.duration,'completed_cycles':cycles,'navigation_checks':checks,'samples':samples,'source_sha256':source_hash,'compiled_hap_sha256':hap_hash,'diary_count_before':baseline_diary,'diary_count_after':last_diary,'scope':'Existing emulator only; read-only page navigation and memory samples. No hardware camera, physical-device frame rate or historical crash-cause proof. Stable-page dwell intervals intentionally observe cache/animation lifetime.','safety_guards':{'app_rss_kb':750000,'emulator_rss_kb':1800000},'error':error}
 report.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
try:
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');time.sleep(2)
 pid=ui.hdc('shell','pidof','com.shiku.foodkeeper').strip();assert pid
 events.write_text('')
 while time.monotonic()-started<args.duration:
  cycle_start=time.monotonic()
  assert sha(source)==source_hash and sha(hap)==hap_hash,'Source/build changed during soak; evidence must restart'
  for label in ['菜谱','我的','记餐','食材','今日']:
   nodes=nav(label);checks+=1
   if label=='菜谱':
    search=next(n for n in nodes if n.get('id')=='recipe-search');x,y,r,z=b(search)
    assert abs((x+r)/2-640)<2 and 145<=z-y<=161
    if cycles%4==0:
     tap(next(n for n in nodes if n.get('id')=='menu-draw-entry'));assert any(n.get('id')=='draw-menu-submit' for n in ui.dump());ui.hdc('shell','uitest','uiInput','keyEvent',2);time.sleep(1.2);checks+=1
   else:assert not any(n.get('id')=='recipe-search' for n in nodes),'Global recipe search leaked onto '+label
   if label=='记餐':
    count=next((n['text'] for n in nodes if re.match(r'^\d+ 次用餐$',n.get('text',''))),'')
    assert count,'Meal count label missing; preservation cannot be verified'
    if not baseline_diary:baseline_diary=count
    last_diary=count;assert count==baseline_diary,'Meal count changed during navigation-only soak'
   if label=='今日':assert all(any(n.get('text')==t and b(n)[1]<2450 for n in nodes) for t in ['早餐','午餐','晚餐'])
  cycles+=1;sample=mem();sample['cycle']=cycles;samples.append(sample)
  with events.open('a') as f:f.write(json.dumps(sample)+'\n')
  save('running')
  assert sample['VmRSS']<750000,'App RSS exceeded 750MB safety guard'
  assert all(e['rss_kb']<1800000 for e in sample['emulator']),'Existing emulator RSS exceeded 1.8GB safety guard'
  print(json.dumps({'cycle':cycles,'elapsed_seconds':sample['elapsed_seconds'],'app_rss_kb':sample['VmRSS'],'emulator':sample['emulator']}),flush=True)
  remaining=args.cycle_seconds-(time.monotonic()-cycle_start)
  while remaining>0 and time.monotonic()-started<args.duration:
   time.sleep(min(10,remaining,args.duration-(time.monotonic()-started)));remaining=args.cycle_seconds-(time.monotonic()-cycle_start)
 save('complete')
except Exception as e:
 save('failed',repr(e));print('SOAK STOPPED:',repr(e),flush=True);raise
