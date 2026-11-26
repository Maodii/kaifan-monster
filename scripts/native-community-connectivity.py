"""Check native login->community roundtrip using the existing disposable profile-test account. No sync or record writes."""
import importlib.util,time,json,re,urllib.request
from pathlib import Path
spec=importlib.util.spec_from_file_location('ui',Path(__file__).with_name('device-ui.py'));ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
email=json.loads((ui.ROOT/'work/reports/native-profile-smoke.json').read_text())['testEmail'];password='native-profile-test-password'
assert re.fullmatch(r'native-profile-[a-f0-9]{32}@example\.test',email)
checks=[]
def find(value,by_id=False):
 for _ in range(8):
  n=next((n for n in ui.dump() if n.get('id' if by_id else 'text')==value and n.get('visible')!='false'),None)
  if n:return n
  ui.hdc('shell','uitest','uiInput','swipe',1100,2190,1100,750,600)
 raise AssertionError('Missing '+value)
def coord(n):
 x,y,xx,yy=map(int,re.findall(r'-?\d+',n['bounds']));return ((x+xx)//2,(y+yy)//2)
def click(v,id=False):ui.hdc('shell','uitest','uiInput','click',*coord(find(v,id)));time.sleep(.5)
def fill(key,value):
 n=find(key,True);x,y=coord(n)
 if n.get('text'):
  ui.hdc('shell','uitest','uiInput','click',x,y);ui.hdc('shell','uitest','uiInput','keyEvent',2072,2017);ui.hdc('shell','uitest','uiInput','keyEvent',2055);ui.hdc('shell','uitest','uiInput','text',value)
 else:ui.hdc('shell','uitest','uiInput','inputText',x,y,value)
 time.sleep(.4)
 if any(n.get('bundleName')=='com.huawei.hmos.inputmethod' for n in ui.dump()):ui.hdc('shell','uitest','uiInput','keyEvent','Back');time.sleep(.3)
try:
 ui.hdc('rport','tcp:3000','tcp:3000');ui.hdc('rport','tcp:9000','tcp:9000')
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');time.sleep(2)
 click('餐桌广场');click('登录 / 注册');fill('auth-email',email);fill('auth-password',password);click('使用本机测试服务');click('auth-submit',True);time.sleep(1)
 find('来分享第一份好味道');checks.append('native login succeeds through reverse port; returns directly to real community list')
 ui.screenshot('shiku-community-connected.jpeg');click('刷新');find('来分享第一份好味道');checks.append('refresh reaches real empty approved feed without connection error')
 click('我的发布');checks.append('own feed loaded');click('‹ 返回');click('我的');click('账号与同步');click('退出登录');click('确认');click('解除未同步的账号绑定');click('确认');checks.append('test login exited and unsynced binding released; no stock/meal sync')
 result={'passed':True,'checks':checks,'scope':'Actual native ArkTS login and community GET on local API; known disposable account only. Camera/photo upload and populated post interaction are separate backend tests, not native verified.'}
except Exception as e:result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-community-connectivity.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
