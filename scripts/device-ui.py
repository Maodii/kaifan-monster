#!/usr/bin/env python3
"""只操作本任务的无窗口模拟器，不控制Mac桌面。"""
import json,re,subprocess,time,sys,shlex
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
HDC='/Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains/hdc'
TARGET='127.0.0.1:5555'
def hdc(*args):
 if args and args[0]=='shell': args=('shell',' '.join(shlex.quote(str(v)) for v in args[1:]))
 return subprocess.check_output([HDC,'-t',TARGET,*map(str,args)],text=True,timeout=45)
def dump():
 for attempt in range(3):
  out=hdc('shell','uitest','dumpLayout'); match=re.search(r'(/data/local/tmp/\S+\.json)',out)
  if match: break
  if attempt==2: raise RuntimeError('设备布局导出失败: '+out[:400])
  time.sleep(.5)
 remote=match.group(1)
 path=ROOT/'work/reports/device-layout.json';hdc('file','recv',remote,path);hdc('shell','rm',remote)
 data=json.loads(path.read_text());nodes=[]
 def visit(n):
  a=n.get('attributes',{});nodes.append(a)
  for c in n.get('children',[]):visit(c)
 visit(data);return nodes
def find(text):
 for a in dump():
  if a.get('text')==text:
   nums=list(map(int,re.findall(r'-?\d+',a['bounds'])))
   if len(nums)==4 and nums[3]>nums[1]:return ((nums[0]+nums[2])//2,(nums[1]+nums[3])//2)
 raise RuntimeError('未找到: '+text)
def click(text):
 x,y=find(text);hdc('shell','uitest','uiInput','click',x,y);time.sleep(.6)
def screenshot(name):
 remote='/data/local/tmp/shiku-capture.jpeg';path=ROOT/'work/screenshots'/name
 hdc('shell','snapshot_display','-f',remote,'-w','720','-h','1593');hdc('file','recv',remote,path);hdc('shell','rm',remote)
 if not path.exists(): raise RuntimeError('截图失败')
 manifest=ROOT/'work/artifacts.json';d=json.loads(manifest.read_text());rel=str(path.relative_to(ROOT));d['files']=[x for x in d['files'] if x['path']!=rel];d['files'].append({'path':rel,'kind':'screenshot','capture_tool':'screencapture','capture_command':'hdc shell snapshot_display','purpose':name});manifest.write_text(json.dumps(d,ensure_ascii=False,indent=2));print(path)
if __name__=='__main__':
 cmd=sys.argv[1]
 if cmd=='texts':print('\n'.join(a.get('text','') for a in dump() if a.get('text')))
 elif cmd=='click':click(sys.argv[2])
 elif cmd=='shot':screenshot(sys.argv[2])
 elif cmd=='input':x,y=find(sys.argv[2]);print(hdc('shell','uitest','uiInput','inputText',x,y,sys.argv[3]))
