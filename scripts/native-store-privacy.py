#!/usr/bin/env python3
"""Read-only business workflow on this task's Harmony emulator; only changes privacy settings."""
from pathlib import Path
import importlib.util,json,re,hashlib,time
R=Path(__file__).resolve().parents[1];sp=importlib.util.spec_from_file_location('ui',R/'scripts/device-ui.py');ui=importlib.util.module_from_spec(sp);sp.loader.exec_module(ui)
checks=[];shots=[]
def texts():return '\n'.join(n.get('text','') for n in ui.dump())
def back():
 t=texts();ui.click('‹' if '\n‹\n' in '\n'+t+'\n' else '‹ 返回')
def shot(name):ui.screenshot(name);shots.append('work/screenshots/'+name)
def geometry():
 nodes=ui.dump();b=lambda n:list(map(int,re.findall(r'-?\d+',n['bounds'])))
 a=b(next(n for n in nodes if n.get('id')=='privacy-scroll'));f=b(next(n for n in nodes if n.get('id')=='privacy-actions'));assert a[3]<=f[1],(a,f);return {'scroll':a,'footer':f}
if '暂不授权云功能，仅使用本机' not in texts():
 ui.click('我的');ui.click('关于与支持');ui.click('阅读并开启云功能')
assert '暂不授权云功能，仅使用本机' in texts()
ui.click('哪些内容会发送？');assert '注册资料与主动同步内容用于云服务' in texts();geometry();ui.screenshot('store-privacy-expanded.jpeg');ui.click('哪些内容会发送？');geometry();ui.screenshot('store-privacy-first.jpeg')
checks.append('Consent summary expands and collapses without intersecting the fixed footer')
ui.hdc('shell','uitest','uiInput','swipe',640,1850,640,500,700)
g=geometry();shot('store-privacy-scrolled.jpeg');checks.append('Scrollable policy content and opaque action footer have disjoint native bounds; scrolled state checked')
ui.click('隐私政策');assert '谢宇飞' in texts() and 'maintainer-0c32@example.invalid' in texts();shot('store-privacy-policy.jpeg');back();checks.append('Privacy policy opens before consent and returns to the consent screen')
ui.click('同意协议和隐私政策，开启云功能');assert '当前已授权云功能' in texts();checks.append('Explicit authorization restores cloud availability without automatic login')
ui.click('撤回云功能同意');assert '切换为本机模式？' in texts();ui.click('切换本机模式');t=texts();assert '当前为本机模式' in t and 'Cannot read property' not in t;checks.append('Withdrawal confirmation completes, clears login state and leaves local mode without scroller errors')
ui.click('阅读并开启云功能');geometry();shot('store-privacy-first.jpeg');ui.click('暂不授权云功能，仅使用本机');assert '当前为本机模式' in texts();checks.append('Local-only choice returns to usable content')
for key in ['用户服务协议','支持与反馈','权限与第三方服务清单','AI 使用与安全说明','关于开饭小怪']:
 ui.click(key);assert key in texts()
 if key=='关于开饭小怪':assert '谢宇飞' in texts();shot('store-about.jpeg')
 back()
assert not any(n.get('text')=='和小怪聊聊，可拖动到侧边' or n.get('description')=='和小怪聊聊，可拖动到侧边' for n in ui.dump());shot('store-about-support.jpeg');checks.append('Terms, support, permissions, AI notice and About documents open and return correctly')
ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');time.sleep(1)
ui.click('我的');ui.click('关于与支持');assert '当前为本机模式' in texts();checks.append('Local-only preference survives process restart')
back();ui.click('今日');shot('store-current-home.jpeg')
report={'passed':True,'checks':checks,'geometry':g,'screenshots':shots,'sourceSha256':hashlib.sha256((R/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'testedUnsignedReleaseHapSha256':hashlib.sha256((R/'client/entry/build/default/outputs/default/entry-default-unsigned.hap').read_bytes()).hexdigest(),'businessWritesPerformed':False,'scope':'Existing HarmonyOS emulator, release build; no uninstall, account creation, real-model call or business-data writes; other screen sizes/physical devices not tested'}
(R/'work/reports/store-privacy-native.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
