#!/usr/bin/env python3
# coding: utf-8
"""Editorial two-person recipe recommendations; all amounts/times/calories are labelled estimates."""
from pathlib import Path
import json,uuid,hashlib,re
from collections import Counter
ROOT=Path(__file__).resolve().parent.parent;p=ROOT/'backend/data/recipes.json';catalog=json.loads(p.read_text());recipes=catalog['recipes']
def dish(name,region,category,minutes,foods,steps,taste='清淡',cal=-1,protein=-1,tags=None):
 old=next((r for r in recipes if r['name']==name),None);items=[]
 for n,q,u in foods:
  items.append({'name':n,'quantity':q,'unit':u,'optional':n in ['盐','食用油','生抽','醋','姜','葱','蒜','辣椒','剁椒','花椒','胡椒粉','水','高汤','清汤','豆豉','藤椒油'],'amountText':f'{n} {q}{u}（两人份推荐）','quantitySource':'食库两人份推荐','quantityBasis':'家常烹饪经验参考，按人数、食量和口味可调整'})
 r={'id':old['id'] if old else str(uuid.uuid5(uuid.NAMESPACE_URL,'shiku:editorial:'+name)),'name':name,'region':region,'cuisine':region,'category':category,'taste':taste,'minutes':minutes,'prepMinutes':10,'cookMinutes':max(1,minutes-10),'timeEstimated':True,'people':2,'servingsNote':'基准为2人份推荐量；所有分量、时间和营养值均为参考，可按人数、食量和口味调整。','difficulty':'进阶' if minutes>60 else '简单','estimatedCost':0,'costKnown':False,'ingredients':items,'ingredientsRaw':[x['amountText'] for x in items],'steps':steps,'tips':'推荐量并非标准定量；按食材大小和熟透程度调整火候。热量以每人份估算，油量、品牌和实际分量会影响结果。','sourceName':'食库编辑整理','sourceUrl':'','sourceLicense':'项目原创整理','referenceUrls':[old['sourceUrl']] if old else [],'sourceRevision':'editorial-2026-11-v1','methodNotes':'独立整理的家常风味版本，不声称是某地区唯一或正宗做法。','imageKey':category,'needsQuantityReview':False,'version':0,'modifiedAt':'','status':'builtin','familyId':'','dietTags':tags or [],'calories':cal,'protein':protein,'caloriesSource':'食库按两人份原料与常用食物能量估算（每人份）' if cal>=0 else '未估算'}
 if old:recipes[recipes.index(old)]=r
 else:recipes.append(r)
# Regional gaps and common home preparations; methods are independently written, not copied from closed platforms.
dish('徽州一品锅','安徽','大菜',110,[('五花肉',250,'g'),('豆腐',200,'g'),('白菜',300,'g'),('香菇',100,'g'),('鸡蛋',2,'个'),('姜',10,'g')],['五花肉切厚片，鸡蛋煮熟剥壳，蔬菜与香菇洗净。','肉片焯去浮沫；豆腐切块，喜欢煎香时可另用少量油煎表面。','锅底铺白菜，依次放肉、豆腐、香菇和熟鸡蛋，加入热水至接近食材上沿。','煮沸后转小火炖约70至90分钟，确认肉熟软，再按口味调味。'],taste='咸鲜')
dish('黄山炖鸽','安徽','汤类',100,[('乳鸽',1,'只'),('山药',200,'g'),('香菇',80,'g'),('姜',10,'g')],['乳鸽处理干净，去除内脏残留；山药切段，香菇洗净。','乳鸽焯水后用温水冲去浮沫，与姜和香菇放入炖锅。','加足量热水，煮开后小火炖约70分钟。','加入山药再炖约20分钟，确认鸽肉完全熟透后调味。'])
dish('清炖狮子头','江苏','大菜',85,[('猪肉末',300,'g'),('荸荠',80,'g'),('白菜',250,'g'),('鸡蛋',1,'个'),('姜',8,'g')],['荸荠切细碎，与肉末、鸡蛋和少量姜水拌匀，朝同一方向搅打。','分成4个肉丸，锅中水保持微沸，轻轻放入肉丸。','小火炖约50分钟，避免大滚冲散肉丸。','加入白菜再煮约10分钟，检查肉丸中心完全熟透后调味。'],taste='咸鲜')
dish('剁椒鱼头','湖南','大菜',40,[('鱼头',600,'g'),('剁椒',40,'g'),('姜',15,'g'),('葱',15,'g'),('食用油',10,'g')],['鱼头去净鳃与血污，剖开后洗净沥干。','盘底铺姜葱，放上鱼头，将剁椒均匀铺在鱼头上。','蒸锅水开后放入，大火蒸约18至25分钟，具体随鱼头厚度调整。','检查最厚处已完全熟透，再按口味淋少量热油。'],taste='香辣')
dish('东北锅包肉','东北','大菜',45,[('猪里脊',300,'g'),('胡萝卜',60,'g'),('淀粉',80,'g'),('醋',30,'mL'),('葱',10,'g'),('姜',10,'g')],['里脊切约3毫米厚片，胡萝卜与葱姜切细丝。','淀粉调成能附着肉片的糊，逐片挂糊后分批炸至熟透，捞出沥油。','按口味用醋、糖和少量水调汁；热锅中煮至略浓。','倒入肉片和配菜丝快速翻匀，保持外层酥脆。'],taste='酸甜')
dish('西北大盘鸡','西北','大菜',65,[('鸡肉',500,'g'),('土豆',300,'g'),('青椒',120,'g'),('洋葱',100,'g'),('姜',15,'g'),('辣椒',10,'g')],['鸡肉斩块洗净并沥干，土豆和蔬菜切块。','锅中少油炒香姜与辣椒，放鸡块翻炒至表面变色。','加入热水没过大半食材，按口味调味，小火炖约25分钟。','加入土豆继续炖15至20分钟，确认鸡肉熟透和土豆软熟。','放青椒和洋葱，翻煮至断生后收汁。'],taste='香辣')
# Porridge, grains and balanced meals.
for name,grain,extra,time in [('燕麦南瓜粥','燕麦','南瓜',25),('山药小米粥','小米','山药',40),('南瓜小米粥','小米','南瓜',35),('红豆杂粮粥','红豆','大米',90),('香菇鸡肉粥','大米','鸡胸肉',50),('鲜虾蔬菜粥','大米','虾仁',45),('紫薯燕麦粥','燕麦','紫薯',30),('玉米燕麦粥','燕麦','玉米粒',25)]:
 foods=[(grain,90,'g'),(extra,180 if extra not in ['大米'] else 60,'g')]
 steps=['将原料按份量准备好；红豆等干豆可提前冷藏浸泡，肉虾另切小块。','谷物加约6至10倍水，煮沸后转小火，期间搅动防止粘底。','根据耐煮程度加入配料；鸡肉和虾仁须煮至中心完全熟透。','煮至谷物软熟、稠度合适，按示例主体口味少量调味。']
 dish(name,'通用家常','粥类',time,foods,steps,cal=240 if '肉' not in name and '虾' not in name else 290,tags=['清淡少油'])
dish('鸡胸肉蔬菜沙拉','通用家常','凉菜',25,[('鸡胸肉',260,'g'),('生菜',180,'g'),('西红柿',180,'g'),('黄瓜',120,'g'),('食用油',8,'g'),('醋',10,'mL')],['蔬菜逐一洗净沥干，番茄和黄瓜切块；生食叶菜清洁后与生肉分开处理。','鸡胸肉放入微沸水中煮熟，取出切开确认中心全熟，稍凉后撕条。','鸡肉和蔬菜装盘，油、醋与少量盐调匀。','食用前拌入调味汁，按实际加入量记录热量。'],cal=260,protein=32,tags=['减脂餐','高蛋白','清淡少油'])
dish('虾仁西兰花','广东','家常菜',20,[('虾仁',240,'g'),('西兰花',350,'g'),('蒜',8,'g'),('食用油',10,'g')],['虾仁去虾线洗净沥干，西兰花分小朵洗净。','西兰花先焯至断生，沥水备用。','少油炒香蒜末，加入虾仁炒至变色并完全熟透。','倒入西兰花拌炒，少量调味后出锅。'],cal=210,protein=28,tags=['减脂餐','高蛋白','清淡少油'])
dish('番茄豆腐菌菇汤','通用家常','汤类',25,[('西红柿',300,'g'),('豆腐',300,'g'),('香菇',120,'g'),('食用油',8,'g')],['番茄切块，豆腐切块，菌菇清洗后切片。','少量油将番茄炒软，加入约700毫升热水煮沸。','放豆腐和菌菇，小火煮约10至15分钟至菌菇熟透。','按口味少量调味，可搭配适量主食。'],taste='酸甜',cal=220,protein=15,tags=['减脂餐','清淡少油'])
dish('清蒸鳕鱼','通用家常','家常菜',25,[('鳕鱼',300,'g'),('姜',10,'g'),('葱',10,'g'),('生抽',10,'mL')],['鱼块充分解冻后洗净沥干，放姜丝。','水开后上锅蒸约10至15分钟，厚块适当延长。','确认鱼肉最厚处完全熟透，倒掉多余蒸汁。','按口味加少量生抽和葱丝，不必额外淋油。'],cal=170,protein=31,tags=['减脂餐','高蛋白','清淡少油'])
dish('牛肉荞麦面','西北','主食',30,[('牛肉',200,'g'),('荞麦面',140,'g'),('青菜',250,'g'),('食用油',8,'g'),('生抽',10,'mL')],['牛肉切薄片，青菜洗净；荞麦面按包装说明煮熟。','另锅少油将牛肉炒至完全熟透，加适量热水煮开。','放青菜煮至熟软，用少量生抽调味。','加入煮好的面条，按每人份分装；热量含面条。'],cal=430,protein=29,tags=['减脂餐','高蛋白'])
dish('鸡蛋全麦三明治','通用家常','早餐',15,[('全麦面包',120,'g'),('鸡蛋',2,'个'),('生菜',80,'g'),('西红柿',100,'g')],['鸡蛋煮熟或用不粘锅煎至全熟。','生菜和番茄洗净沥干，番茄切片。','面包可略烘香，依次夹入鸡蛋和蔬菜。','按需要加少量调味，分成两人份。'],cal=255,protein=14,tags=['减脂餐','清淡少油'])
dish('鸡丝荞麦凉面','通用家常','主食',25,[('鸡胸肉',220,'g'),('荞麦面',140,'g'),('黄瓜',150,'g'),('胡萝卜',100,'g'),('醋',15,'mL'),('生抽',15,'mL')],['鸡胸肉煮至完全熟透后撕丝，胡萝卜切丝并焯熟。','荞麦面煮熟，使用可饮用凉水过凉后沥干。','黄瓜洗净切丝，与鸡丝和胡萝卜拌在一起。','按口味加生抽、醋和少量饮用水调汁，拌匀分装。'],cal=410,protein=31,tags=['减脂餐','高蛋白'])
dish('香菇蒸鸡胸','广东','家常菜',30,[('鸡胸肉',300,'g'),('香菇',150,'g'),('姜',10,'g'),('生抽',12,'mL')],['鸡胸肉切薄片，香菇洗净切片。','鸡肉与姜丝、少量生抽拌匀，冷藏短时腌制。','平铺在耐热盘中，水开后蒸约15至20分钟。','检查最厚的鸡肉片完全熟透后食用。'],cal=230,protein=35,tags=['减脂餐','高蛋白','清淡少油'])
dish('菠菜豆腐拌碗','通用家常','凉菜',20,[('菠菜',250,'g'),('豆腐',300,'g'),('食用油',8,'g'),('生抽',10,'mL')],['菠菜洗净，沸水焯熟后沥干。','豆腐另放沸水中煮透，取出稍凉后切块。','将菠菜和豆腐装碗，油与少量生抽调匀。','轻轻拌匀，搭配主食或其他蛋白质来源食用。'],cal=200,protein=16,tags=['减脂餐','清淡少油'])
# Separate authored supplement; never overwrite an existing sourced recipe of the same name.
for extra in json.loads((ROOT/'backend/data/recipes-editorial.json').read_text()):
 if not any(row['name']==extra['name'] and row.get('sourceName')!='食库编辑整理' for row in recipes):
  dish(extra['name'],extra['region'],extra['category'],extra['minutes'],extra['foods'],extra['steps'],taste=extra['taste'],tags=extra['tags'])
# Fill reliable serving hints from source wording, and keep original uncertainty visible.
for r in recipes:
 r.setdefault('dietTags',[]);r.setdefault('calories',-1);r.setdefault('protein',-1);r.setdefault('caloriesSource','未估算')
 for i in r['ingredients']:
  i.setdefault('quantitySource','来源推荐用量' if i['quantity']>0 else '待推荐');i.setdefault('quantityBasis','来源原料/计算段；人数未明时按2人参考，实际可调整')
 raw=' '.join(r.get('ingredientsRaw',[]))
 if r['name']=='宫保鸡丁':r['people']=1;r['servingsNote']='来源注明1人版本（亦可两人分享），人数换算均为推荐。'
 # Obvious optional garnish and equipment residue: preserve the original source list separately.
 r['ingredients']=[i for i in r['ingredients'] if not any(k in i['name'] for k in ['水果刀','小碗','筷子','温度计','刀具','漏勺'])]
serialized=json.dumps(recipes,ensure_ascii=False,separators=(',',':'));catalog['version']=2;catalog['upstreamRevision']=catalog['sourceRevision'];catalog['sourceRevision']=hashlib.sha256(serialized.encode()).hexdigest();catalog['recipes']=recipes
payload=json.dumps(catalog,ensure_ascii=False,separators=(',',':'));p.write_text(payload);(ROOT/'client/entry/src/main/resources/rawfile/recipes.json').write_text(payload)
report={'count':len(recipes),'categories':dict(Counter(r['category'] for r in recipes)),'regions':dict(Counter(r['region'] for r in recipes)),'dietRecipeCount':sum('减脂餐' in r['dietTags'] for r in recipes),'highProteinCount':sum('高蛋白' in r['dietTags'] for r in recipes),'sourceRevision':catalog['sourceRevision'],'allAmounts':'推荐量；来源明示与独立编辑估算分开标记'};(ROOT/'work/reports/catalog-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
