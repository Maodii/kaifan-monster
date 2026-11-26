#!/usr/bin/env python3
"""对本任务无窗口模拟器执行真实原生交互，不触碰桌面输入。"""
import importlib.util,time,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('device_ui',Path(__file__).with_name('device-ui.py'));ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
checks=[]
def texts():return [a.get('text','') for a in ui.dump()]
def expect(text):
 for _ in range(8):
  if any(text in t for t in texts()):checks.append(text);return
  time.sleep(.5)
 raise AssertionError('未出现: '+text)
def click(text):ui.click(text);time.sleep(.5)
def swipe():ui.hdc('shell','uitest','uiInput','swipe',1050,2250,1050,600,1300);time.sleep(.7)
try:
 expect('每一份食材');click('食库');expect('14个');expect('2盒')
 click('消耗');expect('当前 2盒');click('确认消耗');expect('确认消耗 1盒');ui.screenshot('shiku-confirm.jpeg');click('取消');expect('记录实际消耗');assert '食库 · 由你决定' not in texts(),'取消必须关闭面板';checks.append('取消未修改库存')
 click('‹ 返回');click('食库');expect('2盒');click('菜谱');expect('嫩滑蒸蛋');click('嫩滑蒸蛋');expect('准备食材');swipe();expect('确认制作 · 扣库存并记一餐');click('确认制作 · 扣库存并记一餐');expect('确认实际制作');click('取消');assert '食库 · 由你决定' not in texts()
 click('‹ 返回');click('记餐');expect('嫩滑蒸蛋');ui.screenshot('shiku-diary.jpeg');click('查看统计与导出报表');expect('¥ 4.00');ui.screenshot('shiku-stats.jpeg');click('‹ 返回');click('采购');expect('下一趟');click('补货建议');expect('下次，补一点刚好');click('‹ 返回');click('今日');ui.screenshot('shiku-home.jpeg');click('＋ 录入食材');expect('今天，添点什么');ui.screenshot('shiku-choose.jpeg');click('牛奶');expect('还有多少');expect('确认存入食库');ui.screenshot('shiku-form.jpeg');click('‹ 返回');checks.append('点选模板预填不自动保存')
 result={'passed':True,'checks':checks,'scope':'仅本任务ARM64无窗口模拟器，真实ArkUI/RDB交互；不代表真机硬件验收'}
except Exception as e:
 result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-smoke.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
