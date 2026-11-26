"""Passive bounded observation after navigation guard; no UI or emulator lifecycle operations."""
from pathlib import Path
import argparse,datetime,hashlib,importlib.util,json,re,subprocess,time
root=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('ui',root/'scripts/device-ui.py');ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
p=argparse.ArgumentParser();p.add_argument('--duration',type=int,default=2700);args=p.parse_args();assert 60<=args.duration<=3600
source=root/'client/entry/src/main/ets/pages/Index.ets';hap=root/'client/entry/build/default/outputs/default/entry-default-unsigned.hap';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source_hash=sha(source);hap_hash=sha(hap);pid=ui.hdc('shell','pidof','com.shiku.foodkeeper').strip();assert pid
started=time.monotonic();began=datetime.datetime.now().astimezone().isoformat();samples=[];error=None
report=root/'work/reports/pixel-polish-memory-watch.json'
def save(complete):
 data={'completed':complete,'started_at':began,'elapsed_seconds':round(time.monotonic()-started,2),'requested_duration_seconds':args.duration,'source_sha256':source_hash,'compiled_hap_sha256':hap_hash,'app_pid':pid,'app_restart_detected':bool(error and 'PID' in error),'samples':samples,'emulator_budget_exceeded_samples':sum(any(e['rss_kb']>=1800000 for e in s['emulator']) for s in samples),'app_budget_exceeded_samples':sum(s.get('VmRSS',0)>=750000 for s in samples),'navigation_guard_report':'work/reports/pixel-polish-soak.json','scope':'Passive existing-process memory reads only; no continued navigation, no emulator launch or restart. Completeness is not an interaction stress-pass or proof of historical crash cause.','error':error}
 report.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
try:
 while time.monotonic()-started<args.duration:
  assert sha(source)==source_hash and sha(hap)==hap_hash,'Source/build changed'
  current=ui.hdc('shell','pidof','com.shiku.foodkeeper').strip();assert current==pid,'App PID changed'
  status=ui.hdc('shell','cat','/proc/'+pid+'/status');sample={k:int(v) for k,v in re.findall(r'^(VmRSS|VmHWM|VmSwap|Threads):\s+(\d+)',status,re.M)}
  rows=subprocess.check_output(['ps','-axo','pid,rss,comm'],text=True).splitlines();sample['emulator']=[]
  for row in rows:
   parts=row.strip().split(None,2)
   if len(parts)==3 and parts[2].endswith('/tools/emulator/Emulator'):sample['emulator'].append({'pid':int(parts[0]),'rss_kb':int(parts[1])})
  sample['elapsed_seconds']=round(time.monotonic()-started,2);samples.append(sample);save(False)
  if len(samples)%4==1:print(json.dumps(sample),flush=True)
  remaining=args.duration-(time.monotonic()-started)
  if remaining>0:time.sleep(min(15,remaining))
 save(True)
except Exception as exc:
 error=repr(exc);save(False);raise
