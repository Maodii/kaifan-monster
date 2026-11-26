#!/usr/bin/env python3
"""Connect an already running device to the existing loopback cloud tunnel; never starts emulators."""
import argparse,json,subprocess,time,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--platform',choices=['harmony','android'],default='harmony');p.add_argument('--target');p.add_argument('--wait',type=int,default=0);a=p.parse_args()
if not 0<=a.wait<=60:p.error('--wait must be between 0 and 60 seconds')
tool=Path('/Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains/hdc') if a.platform=='harmony' else Path.home()/'Library/Android/sdk/platform-tools/adb'
def run(args):return subprocess.run([str(tool),*args],text=True,capture_output=True,timeout=12)
def devices():
 r=run(['list','targets'] if a.platform=='harmony' else ['devices'])
 if r.returncode:raise RuntimeError('调试工具失败：'+r.stderr.strip())
 return [x.strip() for x in r.stdout.splitlines() if x.strip() and not x.startswith('[')] if a.platform=='harmony' else [x.split()[0] for x in r.stdout.splitlines()[1:] if len(x.split())>1 and x.split()[1]=='device']
report={'platform':a.platform,'api':'http://127.0.0.1:13000','passed':False,'deviceConnected':False}
try:
 with urllib.request.urlopen(report['api']+'/api/v1/health',timeout=8) as res:
  health=json.load(res);assert res.status==200 and health.get('service')=='shiku','服务健康检查未通过'
 report['serverHealthy']=True
 if not tool.exists():raise RuntimeError('未找到设备调试工具')
 deadline=time.monotonic()+a.wait
 while True:
  targets=devices()
  if targets or time.monotonic()>=deadline:break
  time.sleep(min(2,max(0,deadline-time.monotonic())))
 if not targets:raise RuntimeError('未检测到设备：请手动启动鸿蒙模拟器或连接调试设备，再执行本命令')
 if a.target:
  if a.target not in targets:raise RuntimeError('指定设备未连接')
  target=a.target
 elif len(targets)==1:target=targets[0]
 else:raise RuntimeError('存在多个设备，请使用 --target 指定一个，避免改动其他项目的设备')
 report['deviceConnected']=True;report['target']=target
 mappings=[(13000,13000),(19000,19000)]+([(3000,13000)] if a.platform=='harmony' else [])
 listing=run(['fport','ls'] if a.platform=='harmony' else ['-s',target,'reverse','--list'])
 existing=listing.stdout.splitlines()
 for device_port,host_port in mappings:
  remote,local=f'tcp:{device_port}',f'tcp:{host_port}'
  same=False
  for line in existing:
   parts=line.split()
   if a.platform=='harmony' and (not parts or parts[0]!=target or '[Reverse]' not in line):continue
   if remote in parts:
    index=parts.index(remote)
    if index+1<len(parts) and parts[index+1]==local:same=True;break
    raise RuntimeError(f'设备端口 {device_port} 已被其他映射占用；未覆盖原有映射')
  if same:continue
  args=['-t',target,'rport',remote,local] if a.platform=='harmony' else ['-s',target,'reverse',remote,local]
  r=run(args)
  if r.returncode or '[Fail]' in r.stdout:raise RuntimeError(f'{device_port} 转发失败：'+(r.stdout+r.stderr).strip())
 report.update(passed=True,forwardedPorts=[x[0] for x in mappings],mappings=[{'devicePort':x[0],'hostPort':x[1]} for x in mappings],next='在应用服务连接中填写 http://127.0.0.1:13000，点击检测连接，然后注册或登录')
except Exception as e:report['error']=str(e)
(ROOT/'work/reports/ai-device-connection.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2));raise SystemExit(0 if report['passed'] else 1)
