#!/usr/bin/env python3
# coding: utf-8
"""Exercise a temporary multi-dish diary record on this task's emulator, then remove only that record."""
import importlib.util,time,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('ui',Path(__file__).with_name('device-ui.py'));ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
checks=[];record='番茄炒蛋、清炒时蔬'
def texts():return [a.get('text','') for a in ui.dump()]
def expect(text):
 assert any(text in x for x in texts()),'未出现: '+text
 checks.append(text)
def swipe(up=True):ui.hdc('shell','uitest','uiInput','swipe',1000,2200 if up else 650,1000,650 if up else 2200,700);time.sleep(.4)
def seek(text):
 for _ in range(8):
  try: return ui.find(text)
  except RuntimeError:swipe()
 raise AssertionError('未找到 '+text)
def click(text):seek(text);ui.click(text)
try:
 ui.click('记餐');ui.click('＋ 记一餐');click('外卖');click('也可以从菜谱点选 ↓');click('番茄炒蛋');click('清炒时蔬');seek('本餐合计 ¥13.00（估算）');expect('本餐合计 ¥13.00（估算）');ui.screenshot('shiku-meal-dishes.jpeg');click('实付');click('添加地点、评分、营养与照片 ↓');click('300 kcal');ui.screenshot('shiku-meal-context.jpeg');click('保存私有记录')
 for _ in range(4):swipe(False)
 expect(record);expect('外卖');expect('示例主体热量约 300 kcal')
 # A fresh native process must read the same persisted dish list from RDB.
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');time.sleep(1.5);ui.click('记餐');click(record);expect('这一餐，有几道菜');expect('番茄炒蛋');expect('清炒时蔬');seek('本餐合计 ¥13.00（实付）');checks.append('用餐方式、热量、实付金额经RDB保存及重启回读一致');checks.append('多菜估算经RDB保存及重启回读一致')
 ui.click('‹ 返回')
 # Find the delete action belonging to the unique temporary card, not another diary row.
 for _ in range(4):swipe(False)
 for _ in range(7):
  nodes=ui.dump(); title=next((a for a in nodes if a.get('text')==record),None)
  if title:
   y=int(re.findall(r'-?\d+',title['bounds'])[1]); candidates=[]
   for a in nodes:
    if a.get('text')=='删除记录':
     x1,y1,x2,y2=map(int,re.findall(r'-?\d+',a['bounds']))
     if y1>y and y2>y1:candidates.append((y1,(x1+x2)//2,(y1+y2)//2))
   if candidates:
    _,x,yy=min(candidates);ui.hdc('shell','uitest','uiInput','click',x,yy);break
  swipe()
 else:raise AssertionError('未找到临时记录的删除入口')
 time.sleep(.5);expect('删除这次用餐');ui.click('确认');time.sleep(.5)
 for _ in range(3):swipe(False)
 assert record not in texts(),'临时记录未清除';checks.append('仅清除本次临时日记')
 ui.click('食库');expect('14个');expect('2盒');ui.click('今日')
 result={'passed':True,'checks':checks,'scope':'native headless ARM64 emulator; temporary diary removed, pantry unchanged'}
except Exception as e:result={'passed':False,'checks':checks,'error':str(e)};raise
finally:(ui.ROOT/'work/reports/native-meal-smoke.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
