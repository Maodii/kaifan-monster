#!/usr/bin/env python3
"""Create only an ephemeral test account, exercise native registration/profile/login, then log out. Pantry is untouched."""
import importlib.util,time,json,re,uuid,urllib.request
from pathlib import Path
s=importlib.util.spec_from_file_location('ui',Path(__file__).with_name('device-ui.py'));ui=importlib.util.module_from_spec(s);s.loader.exec_module(ui)
previous=ui.ROOT/'work/reports/native-profile-smoke.json';old=json.loads(previous.read_text()).get('testEmail','') if previous.exists() else '';checks=[];email=old if re.fullmatch(r'native-profile-[a-f0-9]{32}@example\.test',old) else 'native-profile-'+uuid.uuid4().hex+'@example.test';password='native-profile-test-password';user_id=''
class Progress(list):
 def append(self,item):
  super().append(item);print(item,flush=True)
checks=Progress()
def nodes(): return ui.dump()
def texts(): return [n.get('text','') for n in nodes()]
def coord(n):
 x,y,xx,yy=map(int,re.findall(r'-?\d+',n['bounds']));return ((x+xx)//2,(y+yy)//2)
def seek(value,by_id=False,scroll=True):
 for _ in range(10):
  found=next((n for n in nodes() if n.get('id' if by_id else 'text')==value and n.get('visible')!='false'),None)
  if found:return found
  if scroll:ui.hdc('shell','uitest','uiInput','swipe',1100,2150,1100,650,1100)
  else:time.sleep(.5)
 raise AssertionError('未找到 '+value)
def click(value,by_id=False,scroll=True):
 x,y=coord(seek(value,by_id,scroll));ui.hdc('shell','uitest','uiInput','click',x,y);time.sleep(.6)
def input_id(key,value):
 n=seek(key,True)
 if n.get('text')==value:return
 x,y=coord(n)
 if n.get('text'):
  ui.hdc('shell','uitest','uiInput','click',x,y);time.sleep(1)
  ui.hdc('shell','uitest','uiInput','keyEvent',2072,2017);ui.hdc('shell','uitest','uiInput','keyEvent',2055);ui.hdc('shell','uitest','uiInput','text',value)
 else:ui.hdc('shell','uitest','uiInput','inputText',x,y,value)
 time.sleep(1)
 if any(n.get('bundleName')=='com.huawei.hmos.inputmethod' for n in nodes()):
  ui.hdc('shell','uitest','uiInput','keyEvent','Back');time.sleep(1)
def top():
 for _ in range(4):ui.hdc('shell','uitest','uiInput','swipe',1100,650,1100,2200,1500)
def api(path,method='GET',body=None,token=''):
 data=json.dumps(body).encode() if body else None
 req=urllib.request.Request('http://127.0.0.1:3000/api/v1'+path,data=data,method=method,headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {})})
 with urllib.request.urlopen(req,timeout=15) as r:return json.load(r)
try:
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');seek('今日',scroll=False)
 click('设置',scroll=False);click('我的食库档案',scroll=False);click('小厨喵');click('选择 ›');click('四川');checks.append('透明头像与34地区点选')
 click('登录 / 注册账号 →');click('注册新账号',scroll=False);input_id('auth-email',email);input_id('auth-password',password);input_id('auth-name','食库验证');click('使用本机测试服务');ui.screenshot('shiku-register.jpeg');click('auth-submit',True)
 seek('账号资料 · 在你的设备间保留',scroll=False);checks.append('原生注册成功并进入账号资料')
 tokens=api('/auth/login','POST',{'email':email,'password':password,'deviceName':'native-verification'});user_id=tokens['userId'];profile=api('/account/profile',token=tokens['accessToken']);assert profile['displayName']=='食库验证',profile;assert profile['regionName']=='四川';assert profile['avatarPreset']=='cat';checks.append('注册昵称、地区、头像与后端一致')
 input_id('profile-name','食库验证更新');click('保存示例主体资料');time.sleep(.6);profile=api('/account/profile',token=tokens['accessToken']);assert profile['displayName']=='食库验证更新';checks.append('原生资料编辑与数据库版本更新')
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');seek('今日',scroll=False);click('设置',scroll=False);click('示例主体资料 · 头像 · 地区',scroll=False);seek('食库验证更新',scroll=False);ui.screenshot('shiku-profile-account.jpeg');checks.append('会话保留与资料重启回读')
 click('账号安全与家庭空间 →');ui.screenshot('shiku-account-security.jpeg');click('‹ 返回',scroll=False);click('设置',scroll=False);click('退出登录');click('确认',scroll=False);checks.append('原生安全退出，回到本机模式')
 click('登录 / 注册账号');input_id('auth-email',email);input_id('auth-password',password);click('auth-submit',True);seek('账号资料 · 在你的设备间保留',scroll=False);checks.append('原生重新登录同一账号成功')
 click('‹ 返回',scroll=False);click('设置',scroll=False);click('退出登录');click('确认',scroll=False);click('解除未同步的账号绑定');click('确认',scroll=False);checks.append('未同步绑定可解除，原有本机记录保留')
 # The test account has no pantry records and is never synchronized.
 tokens2=api('/auth/login','POST',{'email':email,'password':password,'deviceName':'native-cleanup'});assert api('/records/food_items',token=tokens2['accessToken'])==[];api('/auth/logout','POST',{},tokens2['accessToken']);api('/auth/logout','POST',{},tokens['accessToken'])
 top();click('首页',scroll=False)
 result={'passed':True,'checks':checks,'scope':'headless ARM64 emulator; temporary account only; no pantry sync or stock writes','testEmail':email,'testUserId':user_id}
except Exception as e:
 result={'passed':False,'checks':checks,'error':str(e),'testEmail':email,'testUserId':user_id};raise
finally:
 (ui.ROOT/'work/reports/native-profile-smoke.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
