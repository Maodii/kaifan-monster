"""Capture actual cold startup without modifying data or adding production delays."""
from pathlib import Path
import importlib.util,json,time,subprocess,hashlib
p=Path(__file__).with_name('device-ui.py');spec=importlib.util.spec_from_file_location('ui',p);ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
checks=[]
try:
 ui.hdc('shell','power-shell','wakeup')
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper')
 started=time.monotonic()
 proc=subprocess.Popen([ui.HDC,'-t',ui.TARGET,'shell','aa start -a EntryAbility -b com.shiku.foodkeeper'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 ui.screenshot('launch-cold-start.jpeg')
 out=proc.communicate(timeout=30)[0].decode();assert proc.returncode==0,out
 nodes=ui.dump()
 if any(n.get('id')=='launch-screen' for n in nodes):ui.screenshot('launch-loading.jpeg')
 for _ in range(12):
  nodes=ui.dump()
  if all(any(n.get('text')==t for n in nodes) for t in ['今日','菜谱','我的']):break
  time.sleep(.25)
 else:raise AssertionError('Home not available after cold start')
 checks.append('Actual cold start reaches home without any manual input')
 assert not any(n.get('text')=='小怪正在摆餐桌' for n in nodes)
 ui.screenshot('launch-home.jpeg');checks.append('Loading view removed and enlarged home mascot rendered')
 # A second process restart exercises an already-initialized local database.
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper')
 for _ in range(12):
  nodes=ui.dump()
  if any(n.get('text')=='菜谱' for n in nodes):break
  time.sleep(.25)
 else:raise AssertionError('Restart did not reach home')
 checks.append('Repeated process restart succeeds; no stock, meals or settings written')
 result={'passed':True,'checks':checks,'total_check_seconds':round(time.monotonic()-started,2),'timing_note':'Includes two launches, screenshots and dump commands; not a startup performance benchmark','source_sha256':hashlib.sha256((ui.ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'limits':['No frame-rate benchmark','Loading may finish before snapshot capture; no artificial delay added']}
except Exception as e:result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-launch.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
