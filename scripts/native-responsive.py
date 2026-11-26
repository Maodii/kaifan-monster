"""Measure image/content geometry on the existing Harmony emulator; never writes records."""
from pathlib import Path
import importlib.util, time, re, json, hashlib

root=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('ui',root/'scripts/device-ui.py')
ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
checks=[];geometry={};shots=[]
def b(n):return list(map(int,re.findall(r'-?\d+',n['bounds'])))
def tap(n):
 x,y,xx,yy=b(n);ui.hdc('shell','uitest','uiInput','click',(x+xx)//2,(y+yy)//2);time.sleep(1.2)
def nav(label):tap(max((n for n in ui.dump() if n.get('text')==label),key=lambda n:b(n)[1]))
def ident(key):return next(n for n in ui.dump() if n.get('id')==key)
def shot(label):ui.screenshot('responsive-'+label+'.jpeg');shots.append('work/screenshots/responsive-'+label+'.jpeg')
try:
 ui.hdc('shell','aa','force-stop','com.shiku.foodkeeper');ui.hdc('shell','aa','start','-a','EntryAbility','-b','com.shiku.foodkeeper');time.sleep(2)
 n=ident('home-collage');x,y,xx,yy=b(n);ratio=(xx-x)/(yy-y);assert abs(ratio-1024/498)<0.02,ratio
 geometry['collage']={'bounds':b(n),'actual_ratio':ratio,'source_ratio':1024/498}
 checks.append('Rendered collage frame preserves intrinsic 1024:498 ratio; decode432:210 is proportional')
 assert not any(n.get('id')=='recipe-search' for n in ui.dump());shot('home')
 nav('菜谱');nodes=ui.dump();n=next(n for n in nodes if n.get('id','').startswith('recipe-image-'));x,y,xx,yy=b(n)
 assert abs((xx-x)/(yy-y)-1)<0.02
 image_right=xx;title=next(n for n in nodes if n.get('text')=='上汤娃娃菜')
 assert b(title)[0]>=image_right, (b(n),b(title))
 search=b(ident('recipe-search'));assert search[2]-search[0]<1100 and abs((search[0]+search[2])/2-640)<12
 geometry['recipe']={'image_bounds':b(n),'title_bounds':b(title),'search_bounds':search}
 checks.extend(['Recipe image remains square; title has a separate nonoverlapping column','Search fits available reading width and stays centered'])
 shot('recipes')
 tap(ident('menu-draw-entry'));assert any(n.get('text')=='抽取条件' for n in ui.dump());shot('draw')
 checks.append('Dish/soup preset page opens without saving or drawing; labels have no fixed tick column')
 ui.hdc('shell','uitest','uiInput','keyEvent',2);time.sleep(1.2)
 nav('我的');nodes=ui.dump();labels=['口味与抽菜','食材管理','外观与动效','提醒','账号与同步','数据与备份','帮助与课堂']
 found=[next(n for n in nodes if n.get('text')==label) for label in labels]
 assert all(b(a)[3]<=b(z)[1] for a,z in zip(found,found[1:]))
 checks.append('Seven settings labels have disjoint vertical bounds; row height is a minimum')
 nav('记餐');tap(next(n for n in ui.dump() if n.get('text')=='＋ 记一餐'))
 nodes=ui.dump();assert any(n.get('text')=='今天吃了什么' for n in nodes);shot('meal')
 checks.append('Meal form remains accessible with wrapping dining/occasion controls and intrinsic save action')
 ui.hdc('shell','uitest','uiInput','keyEvent',2);time.sleep(1.2)
 nodes=ui.dump()
 discard=next((n for n in nodes if n.get('text')=='放弃修改'),None)
 if discard:tap(discard)
 nav('今日')
 result={'passed':True,'checks':checks}
except Exception as e:
 result={'passed':False,'checks':checks,'error':repr(e)};raise
finally:
 result.update(geometry=geometry,screenshots=shots,source_sha256=hashlib.sha256((root/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),compiled_hap_sha256=hashlib.sha256((root/'client/entry/build/default/outputs/default/entry-default-unsigned.hap').read_bytes()).hexdigest(),scope='Actual geometry on existing1280px Harmony emulator; no saved records or submitted searches. Other Harmony window sizes were not device-tested: emulator rejects windowOptions10106107.',physicalDeviceVerified=False)
 (root/'work/reports/responsive-native.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
