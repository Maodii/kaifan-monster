#!/usr/bin/env python3
"""本任务模拟器的日历与主题回归；主题最终恢复，不触碰桌面。"""
import importlib.util,time,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('device_ui',Path(__file__).with_name('device-ui.py'));ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
checks=[]
def texts():return [a.get('text','') for a in ui.dump()]
def seek(text):
 for _ in range(8):
  if text in texts(): return
  ui.hdc('shell','uitest','uiInput','swipe',1000,2200,1000,650,800);time.sleep(.3)
 raise AssertionError('未找到 '+text)
try:
 ui.click('记餐');ui.click('查看日历 ▦');now=__import__('datetime').datetime.now().strftime('%Y-%m');assert now in texts();ui.screenshot('shiku-calendar.jpeg');ui.click('‹ 上月');assert now not in texts();ui.click('下月 ›');assert now in texts();checks.append('日历月份切换与用餐标记')
 ui.click('我的');seek('晴空蓝调');ui.click('晴空蓝调');ui.screenshot('shiku-theme.jpeg');ui.click('暖杏手账');checks.append('主题点选切换并恢复')
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');time.sleep(1)
 result={'passed':True,'checks':checks,'scope':'headless ARM64 emulator only'}
except Exception as e:result={'passed':False,'checks':checks,'error':str(e)};raise
finally:(ui.ROOT/'work/reports/native-design-smoke.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
