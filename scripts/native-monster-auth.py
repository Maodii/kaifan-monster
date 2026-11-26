"""Register/login against the real local API from ArkUI. Never sync user records."""
from pathlib import Path
import json,time,re,uuid,urllib.request,hashlib
helper=Path(__file__).with_name('native-utility-smoke.py');exec(compile(helper.read_text().split('\ntry:\n')[0],str(helper),'exec'))
email='monster-native-'+uuid.uuid4().hex+'@example.test';password='monster-native-test-password';user_id='';token=''
def field(key,value):
 for _ in range(12):
  n=next((n for n in ui.dump() if n.get('id')==key and n.get('visible')!='false'),None)
  if n:
   x,y,xx,yy=map(int,re.findall(r'-?\d+',n['bounds']))
   if yy>y and 200<(y+yy)//2<2500:break
  ui.hdc('shell','uitest','uiInput','swipe',1100,2100,1100,800,350)
 else:raise AssertionError('Missing field '+key)
 x=(x+xx)//2;y=(y+yy)//2
 if n.get('text'):
  ui.hdc('shell','uitest','uiInput','click',x,y);ui.hdc('shell','uitest','uiInput','keyEvent',2072,2017);ui.hdc('shell','uitest','uiInput','keyEvent',2055);ui.hdc('shell','uitest','uiInput','text',value)
 else:ui.hdc('shell','uitest','uiInput','inputText',x,y,value)
 time.sleep(.5);ui.hdc('shell','uitest','uiInput','keyEvent','Back');time.sleep(.5)
def api(path,body=None,token=''):
 req=urllib.request.Request('http://127.0.0.1:3000/api/v1'+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {})})
 with urllib.request.urlopen(req,timeout=15) as res:return json.load(res)
try:
 restart();click('我的');click('账号与同步');click('登录 / 注册账号');click('注册新账号')
 field('auth-email','invalid');field('auth-password',password);field('auth-confirm',password);click('创建小怪账号');expect('请填写完整邮箱，例如 name@example.com');checks.append('inline invalid email stays visible')
 field('auth-email',email);field('auth-name','小怪验证');ui.screenshot('monster-register.jpeg');click('创建小怪账号');expect('保存示例主体资料');checks.append('real native registration succeeded')
 auth=api('/auth/login',{'email':email,'password':password,'deviceName':'native-auth-verifier'});user_id=auth['userId'];token=auth['accessToken'];profile=api('/account/profile',token=token);assert profile['displayName']=='小怪验证';assert api('/records/food_items',token=token)==[];checks.append('registered nickname persisted; no stock synced')
 click('‹ 返回');click('我的');click('账号与同步');click('退出登录');click('确认');click('登录 / 注册账号');field('auth-email',email);field('auth-password','wrong-but-long-password');click('登录账号');expect('邮箱或密码不正确，请检查后重试');ui.screenshot('monster-login-error.jpeg');checks.append('real wrong password receives actionable inline 401')
 field('auth-password',password);click('登录账号');expect('保存示例主体资料');restart();click('我的');expect('小怪验证');checks.append('real re-login and persisted session after restart')
 click('账号与同步');click('退出登录');click('确认');click('解除未同步的账号绑定');click('确认');checks.append('test logout/binding released; native pantry untouched')
 api('/auth/logout',{},token);click('‹ 返回');click('今日')
 result={'passed':True,'checks':checks,'testEmail':email,'testUserId':user_id,'source_sha256':hashlib.sha256((ui.ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'scope':'Actual ArkUI registration/401/relogin/session restart against real API; no sync; temporary account logged out and binding released'}
except Exception as e:result={'passed':False,'checks':checks,'testEmail':email,'testUserId':user_id,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-monster-auth.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
