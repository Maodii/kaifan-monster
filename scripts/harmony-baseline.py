#!/usr/bin/env python3
"""Explicit-device, bounded HarmonyOS cold-start/memory baseline. Never starts an emulator."""
import argparse,subprocess,json,time,statistics,datetime
from pathlib import Path
root=Path(__file__).resolve().parent.parent
hdc='/Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains/hdc'
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--target');p.add_argument('--launch',action='store_true');p.add_argument('--samples',type=int,default=3);args=p.parse_args()
if not 1<=args.samples<=5:p.error('samples must be 1..5')
report={'checkedAt':datetime.datetime.now().astimezone().isoformat(),'status':'not_executed','nativeDeviceVerified':False,'scope':'Only explicitly selected test device; command latency is not first-interactive or frame rate','samples':[]}
try:
 targets=subprocess.check_output([hdc,'list','targets'],text=True,timeout=10).strip();report['targets']=targets
 if not args.target or args.target not in targets.splitlines():report['reason']='An explicitly selected connected target is required; emulator not started'
 elif not args.launch:report['status']='target_available_not_launched';report['reason']='Use --launch for bounded app-only cold-start measurements'
 else:
  for _ in range(args.samples):
   subprocess.run([hdc,'-t',args.target,'shell','aa','force-stop','com.shiku.foodkeeper'],capture_output=True,timeout=15)
   start=time.monotonic();result=subprocess.run([hdc,'-t',args.target,'shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper'],capture_output=True,text=True,timeout=30)
   sample={'launch_command_ms':round((time.monotonic()-start)*1000),'exitCode':result.returncode,'output':result.stdout[-1200:]}
   time.sleep(2)
   memory=subprocess.run([hdc,'-t',args.target,'shell','hidumper','--mem','com.shiku.foodkeeper'],capture_output=True,text=True,timeout=15)
   sample['memory_output']=memory.stdout[-6000:];report['samples'].append(sample)
  values=sorted(s['launch_command_ms'] for s in report['samples']);report['command_latency_p50_ms']=statistics.median(values);report['command_latency_p95_ms']=values[-1];report['status']='measured';report['nativeDeviceVerified']=all(s['exitCode']==0 and 'success' in s['output'].lower() for s in report['samples']);report['notMeasured']=['Frame rate','First interactive','Physical camera','Background notification delivery']
except Exception as e:report['error']=str(e);report['status']='failed'
(root/'work/reports/harmony-performance-baseline.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
