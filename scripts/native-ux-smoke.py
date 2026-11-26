#!/usr/bin/env python3
"""Headless emulator UX verification; only a uniquely named temporary meal is written/deleted."""
import importlib.util,json,time,re,sys
from pathlib import Path
s=importlib.util.spec_from_file_location('ui',Path(__file__).with_name('device-ui.py'));ui=importlib.util.module_from_spec(s);s.loader.exec_module(ui)
checks=[];record='体验验证便当';created=False

def texts():return [a.get('text','') for a in ui.dump()]
def note(value):checks.append(value);print(value,flush=True)
def seek(value,by_id=False,scroll=True):
 for _ in range(14):
  for n in ui.dump():
   if n.get('id' if by_id else 'text')==value and n.get('visible')!='false' and (by_id or n.get('type')!='TextInput'):
    x,y,xx,yy=map(int,re.findall(r'-?\d+',n['bounds']))
    if yy>y and 140<(y+yy)//2<2720:return n
  if scroll:ui.hdc('shell','uitest','uiInput','swipe',1100,2200,1100,650,1000)
  else:time.sleep(.4)
 raise AssertionError('未找到 '+value)
def click(value,by_id=False,scroll=True):
 n=seek(value,by_id,scroll);x,y,xx,yy=map(int,re.findall(r'-?\d+',n['bounds']));ui.hdc('shell','uitest','uiInput','click',(x+xx)//2,(y+yy)//2);time.sleep(.7)
def field(key,value):
 n=seek(key,True);x,y,xx,yy=map(int,re.findall(r'-?\d+',n['bounds']));x=(x+xx)//2;y=(y+yy)//2
 if n.get('text'):
  ui.hdc('shell','uitest','uiInput','click',x,y);time.sleep(.8);ui.hdc('shell','uitest','uiInput','keyEvent',2072,2017);ui.hdc('shell','uitest','uiInput','keyEvent',2055);ui.hdc('shell','uitest','uiInput','text',value)
 else:ui.hdc('shell','uitest','uiInput','inputText',x,y,value)
 time.sleep(1)
 if any(a.get('bundleName')=='com.huawei.hmos.inputmethod' for a in ui.dump()):ui.hdc('shell','uitest','uiInput','keyEvent','Back');time.sleep(.7)
def restart():
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper')
 try:seek('今日',scroll=False)
 except AssertionError:
  ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');seek('今日',scroll=False)
def top():
 for _ in range(4):ui.hdc('shell','uitest','uiInput','swipe',1100,650,1100,2200,1600)
def delete_record():
 top();seek(record)
 for _ in range(9):
  nodes=ui.dump();title=next((a for a in nodes if a.get('text')==record),None)
  if title:
   y=int(re.findall(r'-?\d+',title['bounds'])[1]);choices=[]
   for a in nodes:
    if a.get('text')=='删除记录':
     x1,y1,x2,y2=map(int,re.findall(r'-?\d+',a['bounds']))
     if y1>y and y2>y1:choices.append((y1,(x1+x2)//2,(y1+y2)//2))
   if choices:
    _,x,yy=min(choices);ui.hdc('shell','uitest','uiInput','click',x,yy);time.sleep(.6);click('确认',scroll=False);return
  ui.hdc('shell','uitest','uiInput','swipe',1100,2200,1100,650,1000)
 raise AssertionError('临时记录删除入口未找到')
try:
 if '--resume-recipes' in sys.argv or '--resume-tail' in sys.argv:
  checks.extend(json.loads((ui.ROOT/'work/reports/native-ux-smoke.json').read_text()).get('checks',[]));restart()
 else:
  restart();assert all(v in texts() for v in ['今日','菜谱','记餐','食库','我的']);note('五个一级入口，采购不占底栏')
  assert '我的小食库' not in texts();seek('今日餐桌',scroll=False);ui.screenshot('shiku-today-record.jpeg');note('统一今日首页与每日餐费/热量摘要')
  click('外卖速记 ↗');seek('今天吃了什么',scroll=False);assert '300 kcal' not in texts();seek('保存私有记录',scroll=False);note('外卖直达、选填收起、固定保存栏')
  field('meal-dish-name',record);field('meal-dish-cost','18');click('实付');ui.screenshot('shiku-quick-meal.jpeg');click('保存私有记录',scroll=False);created=True;seek(record);note('无需菜谱或库存即可保存一餐')
  restart();assert '我的小食库' not in texts();click('记餐',scroll=False);seek(record);note('统一首页及手动记餐经RDB重启保留')
  top();click('餐馆');assert record not in texts();click('外卖');seek(record);top();click('全部方式');note('记餐方式筛选与实付/估算区分')
  click('＋ 记一餐');click(record+' ＋');seek(record);click('‹ 返回',scroll=False);seek('这一餐还没保存',scroll=False);click('继续记录',scroll=False);seek('保存私有记录',scroll=False);click('‹ 返回',scroll=False);click('放弃修改',scroll=False);note('最近菜品点选与未保存返回保护')
  delete_record();created=False;note('仅删除本次临时记录')
 if '--resume-tail' not in sys.argv:
  click('菜谱',scroll=False);top();click('做饭',scroll=False);field('recipe-search','微波炉鸡蛋羹');click('15分钟内');seek('微波炉鸡蛋羹');ui.screenshot('shiku-recipe-time.jpeg');click('微波炉鸡蛋羹');seek('做法 · 11 步',scroll=False);assert '一起吃多少？' not in texts();ui.screenshot('shiku-recipe-method.jpeg');note('15分钟筛选、醒目耗时、做法先于用量')
  click('专注做菜 ↗',scroll=False);seek('步骤 1 / 11',scroll=False);click('下一步');seek('步骤 2 / 11',scroll=False);ui.screenshot('shiku-cook-guide.jpeg');click('上一步');seek('步骤 1 / 11',scroll=False);click('‹ 返回',scroll=False);note('专注模式步骤前进/后退，阅读不改库存')
 else:
  click('菜谱',scroll=False);top()
 if '--resume-tail' not in sys.argv:click('‹ 返回',scroll=False)
 top();click('清空筛选');click('耗时优先');ui.screenshot('shiku-library.jpeg');click('食库',scroll=False);seek('采购清单 →',scroll=False);click('采购清单 →',scroll=False);seek('下一趟，带这些回家',scroll=False);click('‹ 返回',scroll=False);seek('库存里的新鲜',scroll=False);seek('14个');seek('2盒');note('采购收进食库，原有鸡蛋/牛奶库存不变')
 click('今日',scroll=False);ui.screenshot('shiku-home.jpeg');note('统一今日与原记录保留')
 result={'passed':True,'checks':checks,'scope':'headless ARM64 emulator; one temporary meal removed; no pantry writes'}
except Exception as e:
 result={'passed':False,'checks':checks,'error':str(e),'temporaryMealMayRemain':created,'temporaryMealName':record};raise
finally:
 (ui.ROOT/'work/reports/native-ux-smoke.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False),flush=True)
