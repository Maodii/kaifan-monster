"""Repair reviewed source parsing failures; quantities remain unknown unless explicit."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parent.parent;p=ROOT/'backend/data/recipes.json';data=json.loads(p.read_text());changed=[]
def item(name,q=0,unit='g',optional=False):return {'name':name,'quantity':q,'unit':unit,'optional':optional,'quantitySource':'来源明确用量' if q>0 else '来源未注明，待确认','quantityBasis':'保留原始用料逐项拆分；不把包装规格当成菜谱用量','amountText':name+(str(q)+unit if q else '（用量未注明）')}
fixes={
 '咖啡椰奶冻':[item('淡奶油',125,'mL'),item('椰汁',250,'mL'),item('意式浓缩咖啡',35,'mL'),item('椰子水',50,'mL'),item('吉利丁',10)],
 '南派红烧肉':[item('五花肉')]+[item(n,optional=True) for n in ['食用油','冰糖','老抽','料酒','香叶','八角','生姜','盐','葱','水','蒜','花椒']],
 '简易红烧肉':[item('五花肉'),item('鸡蛋',optional=True),item('豆皮',optional=True)]+[item(n,optional=True) for n in ['生姜','冰糖','生抽','老抽','料酒','香叶','八角','盐','水','葱']],
 '鲣鱼海苔玉米饭':[item('大米'),item('鲣鱼海苔碎'),item('玉米粒')]
}
# Quantity-prefix/annotation artifacts that refer to unambiguous actual foods.
aliases={'一个鸡蛋的鸡蛋清':'鸡蛋清','牛排，参见如何选择不同种类的牛排':'牛排','香菜一颗':'香菜','鱼头一个':'鱼头','内脂豆腐':'内酯豆腐','胡箩卜':'胡萝卜','耗油':'蚝油','蕃茄酱':'番茄酱','肉沫':'肉末'}
for row in data['recipes']:
 notes=[]
 if row['name'] in fixes:
  row['ingredients']=fixes[row['name']];row['needsQuantityReview']=any(i['quantity']==0 for i in row['ingredients']);notes.append('reviewed raw-list parsing repair; unknown quantities preserved')
  if row['name']=='简易红烧肉':row['tips']=row.get('tips','')+' 原料列鸡蛋，步骤另有鹌鹑蛋写法；请先选择一种蛋类再备料，不重复计算。'
 for i in row['ingredients']:
  if i['name'] in aliases:
   old=i['name'];i['name']=aliases[old];notes.append('ingredient label '+old+' → '+i['name'])
 if notes:changed.append({'id':row['id'],'name':row['name'],'changes':notes})
# Content hash ensures every actual data revision reseeds an existing native RDB.
data['sourceRevision']=hashlib.sha256(json.dumps(data['recipes'],ensure_ascii=False,sort_keys=True).encode()).hexdigest()+'|source-ingredient-repair'
text=json.dumps(data,ensure_ascii=False,separators=(',',':'));p.write_text(text);(ROOT/'client/entry/src/main/resources/rawfile/recipes.json').write_text(text)
(ROOT/'work/reports/source-ingredient-repair.json').write_text(json.dumps({'changes':changed,'rawPreserved':True,'policy':'Original steps and ingredientsRaw retained; reviewed names and source-explicit amounts only. Unknown doses remain unknown.'},ensure_ascii=False,indent=2)+'\n');print('Repaired',len(changed),'recipes')
