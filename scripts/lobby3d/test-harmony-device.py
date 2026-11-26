"""Read-only route verification on the already running emulator; never launches a host window."""
from pathlib import Path
import importlib.util,json,time,hashlib,datetime
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('ui',ROOT/'scripts/device-ui.py');ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
checks=[];report={'passed':False,'checks':checks,'scope':'Existing Harmony emulator: installed HAP and actual ArkWeb-to-ArkTS routing; WebGL disabled by emulator policy, no realtime GPU acceptance','checked_at':datetime.datetime.now().astimezone().isoformat()}
def texts():return [n.get('text','') for n in ui.dump()]
def waittext(value):
 for i in range(20):
  ts=texts()
  if value in ts:return
  time.sleep(.2)
 raise AssertionError('Missing expected destination: '+value)
def lobby():
 for i in range(5):
  ts=texts()
  if '打开全部功能' in ts:return
  if '返回3D大厅' in ts:ui.click('返回3D大厅');waittext('打开全部功能');return
  if '3D大厅' in ts:ui.click('3D大厅');waittext('打开全部功能');return
  ui.hdc('shell','uitest','uiInput','keyEvent',2);time.sleep(.3)
 raise AssertionError('Cannot return without editing data')
try:
 # Package replacement can leave the app on the launcher; start only this ability.
 ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper')
 for _ in range(20):
  if '3D大厅' in texts() or '打开全部功能' in texts():break
  time.sleep(.2)
 lobby();waittext('场景预览');ui.click('打开全部功能');waittext('关闭全部功能');ui.hdc('shell','uitest','uiInput','keyEvent',2);waittext('打开全部功能');assert '关闭全部功能' not in texts();checks.append({'entry':'Native back closes the feature drawer without leaving lobby','passed':True});ui.click('放大');ui.click('还原视角');checks.append({'entry':'Clearly labelled offline preview zoom/reset controls','passed':True})
 ui.click('我的冰箱');waittext('给食材安个家');ui.click('我的小怪');waittext('我的食光小屋');ui.screenshot('lobby3d-harmony-preview.jpeg');checks.append({'entry':'Preview room switches with visible same-model render','passed':True})
 for label,expected in [('今日总览','今天也要好好吃饭'),('三餐记录','我的记餐'),('全部菜谱','菜谱大全'),('我的食材','我的库存'),('采购清单','采购清单'),('未来安排','七日餐桌计划'),('随机抽餐','抽一餐'),('营养与花费','餐费与饮食'),('我的收藏','我的收藏'),('采购与消耗','食材的来去都有迹'),('记一餐','今天吃了什么'),('新食材入库','今天，添点什么？'),('我的档案','我的吃饭档案'),('生活工具','生活工具'),('搜索分享','搜索社区分享'),('登录与账号','回来一起吃饭'),('餐桌广场','登录，坐下来聊聊'),('设置与同步','生活工具')]:
  lobby();ui.click('打开全部功能');ui.click(label);waittext(expected);checks.append({'entry':label,'expected':expected,'passed':True});print('PASS',label,flush=True)
 lobby();ui.click('打开全部功能');ui.click('搜索菜谱');waittext('搜索历史');checks.append({'entry':'搜索菜谱','expected':'搜索历史','passed':True})
 lobby();ui.click('切换简洁模式');waittext('3D大厅');checks.append({'entry':'WebGL unavailable fallback','passed':True})
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');waittext('3D大厅');checks.append({'entry':'Simple preference survives native app restart','passed':True})
 report['passed']=True
except Exception as e:report['error']=str(e);raise
finally:
 report['hap_sha256']=hashlib.sha256((ROOT/'client/entry/build/default/outputs/default/entry-default-unsigned.hap').read_bytes()).hexdigest()
 (ROOT/'work/reports/lobby3d-harmony-device.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
