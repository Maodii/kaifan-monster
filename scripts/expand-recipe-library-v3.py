#!/usr/bin/env python3
# coding: utf-8
"""Idempotent original editorial supplement. Does not overwrite pre-existing IDs or sourced recipes."""
from pathlib import Path
from collections import Counter
import json,uuid,hashlib,re,subprocess
ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'backend/data/recipes.json'
RAW=ROOT/'client/entry/src/main/resources/rawfile/recipes.json'
SUPPLEMENT=ROOT/'backend/data/recipes-expansion-v3.json'
RESEARCH=ROOT/'work/research/recipe-expansion/sources.json'
CONDIMENTS={'盐','食用油','生抽','米醋','姜','蒜','葱','黑胡椒','孜然粉','干混合香草','柠檬汁','干桂花','肉桂粉','干辣椒'}
METHOD_REFERENCE='https://github.com/Anduin2017/HowToCook'
def sha(v):return hashlib.sha256(v).hexdigest()
def main():
 catalog=json.loads(BASE.read_text());before=list(catalog['recipes']);rows=json.loads(SUPPLEMENT.read_text());old_ids={r['name']:r['id'] for r in before};added=[]
 for row in rows:
  existing=next((r for r in catalog['recipes'] if r['name']==row['name']),None)
  key=str(uuid.uuid5(uuid.NAMESPACE_URL,'shiku:editorial:v3:'+row['name']))
  if existing and existing['id']!=key:raise ValueError('Would overwrite existing recipe '+row['name'])
  items=[{'name':n,'quantity':q,'unit':u,'optional':n in CONDIMENTS,'amountText':f'{n} {q}{u}（2人份推荐总量）','quantitySource':'食库编辑推荐，非实测或来源原文定量','quantityBasis':'2人份可食原料参考；按食量、人数、器具和口味调整'} for n,q,u in row['foods']]
  oil=sum(i['quantity'] for i in items if i['name']=='食用油');tags=[]
  if oil<=10 and not any(n in row['name'] for n in ['奶酪','花生','豆泡']):tags.append('清淡少油')
  # A composition-based suggestion, not a measured protein or weight-loss claim.
  protein_foods=[i for i in items if re.search(r'鸡胸|鸡腿|牛里脊|猪瘦肉|鲈鱼|三文鱼|虾仁|金枪鱼',i['name']) and i['unit']=='g']
  if sum(i['quantity'] for i in protein_foods)>=220:tags.append('高蛋白')
  taste='香辣' if any(i['name']=='干辣椒' for i in items) else '酸甜' if row['category']=='甜点' else '清淡' if '清淡少油' in tags else '咸鲜'
  prep=min(15,max(5,round(row['minutes']*.3)));equipment=['称量工具','生熟分开的刀与砧板']
  joined=' '.join(row['steps'])
  if '烤箱' in joined:equipment+=['烤箱','耐热烤盘','隔热手套']
  elif '蒸' in joined:equipment+=['蒸锅','浅耐热容器','隔热手套']
  if re.search('炒|煎',joined):equipment+=['炒锅或不粘平底锅','锅铲']
  if re.search('煮|炖|焖',joined):equipment+=['煮锅或厚底锅']
  r={'id':key,'name':row['name'],'region':row['region'],'cuisine':row['region'],'category':row['category'],'taste':taste,'minutes':row['minutes'],'prepMinutes':prep,'cookMinutes':row['minutes']-prep,'timeEstimated':True,'people':2,'servingsNote':'2人份推荐总量，非标准定量；时间含备料，按食量、器具与实际熟度调整。','difficulty':'简单','estimatedCost':0,'costKnown':False,'ingredients':items,'ingredientsRaw':[i['amountText'] for i in items],'steps':row['steps'],'equipment':list(dict.fromkeys(equipment)),'tips':'剂量与时间为编辑推荐；肉蛋水产、豆类及菌菇按实际熟度确认。营养未测算，不用未知值代替0。','sourceName':'食库编辑整理','sourceUrl':'','sourceLicense':'项目原创整理','referenceUrls':[METHOD_REFERENCE],'referenceScope':'公开做饭技术与步骤组织方式参考；并非同名菜来源，不复制原站正文或图片。','sourceRevision':'editorial-2026-11-04-v3','methodNotes':'独立编写的家常参考版本；地区标签仅表示风味方向，不声称正宗、地域唯一或营养处方。','imageKey':row['category'],'needsQuantityReview':False,'version':0,'modifiedAt':'','status':'builtin','familyId':'','dietTags':tags,'mealOccasions':row['mealOccasions'],'mealOccasionsSource':'编辑搭配建议，餐次与菜品类别独立','dietTagsSource':'依原料组成和推荐用油给出搭配建议；未做营养实测','calories':-1,'protein':-1,'caloriesSource':'未估算','nutritionKnown':False}
  if existing:catalog['recipes'][catalog['recipes'].index(existing)]=r
  else:catalog['recipes'].append(r)
  added.append(r)
 assert len({r['id'] for r in catalog['recipes']})==len(catalog['recipes'])
 assert len({r['name'] for r in catalog['recipes']})==len(catalog['recipes'])
 assert all(next(r for r in catalog['recipes'] if r['name']==n)['id']==v for n,v in old_ids.items())
 catalog['version']=3;catalog['sourceRevision']=sha(json.dumps(catalog['recipes'],ensure_ascii=False,separators=(',',':')).encode())
 payload=json.dumps(catalog,ensure_ascii=False,indent=2);BASE.write_text(payload);RAW.write_text(payload)
 subprocess.run(['node','--import','tsx','scripts/normalize-cooking-guides.ts'],cwd=ROOT/'backend',check=True)
 payload=BASE.read_text()
 research=json.loads(RESEARCH.read_text()) if RESEARCH.exists() else []
 request={'count':len(added),'recipes':[{'id':r['id'],'name':r['name'],'category':r['category'],'ingredients':[i['name'] for i in r['ingredients'] if not i['optional']],'imageFile':'dish_v3_'+r['id'].split('-')[0]+'.webp'} for r in added]}
 (ROOT/'work/reports/recipe-expansion-image-request.json').write_text(json.dumps(request,ensure_ascii=False,indent=2))
 report={'passed':True,'accessed':'2026-11-04','before':len(catalog['recipes'])-len(added),'beforeThisRun':len(before),'newlyAdded':len(catalog['recipes'])-len(before),'supplementCount':len(added),'catalogCount':len(catalog['recipes']),'totalWithNativeBuiltins':len(catalog['recipes'])+4,'existingIdsPreserved':True,'categories':dict(Counter(r['category'] for r in added)),'regions':dict(Counter(r['region'] for r in added)),'mealOccasions':dict(Counter(o for r in added for o in r['mealOccasions'])),'quickUnder20':sum(r['minutes']<=20 for r in added),'highProteinCompositionSuggestions':sum('高蛋白' in r['dietTags'] for r in added),'nutritionUnknown':sum(r['calories']==-1 and r['protein']==-1 for r in added),'sourcePolicy':'64个独立编辑家常版本；HowToCook仅公开技术参考。未声称抓取小红书/受限平台，无闭源正文或菜图复制。地区仅风味建议，所有量/时间为推荐；热量与价格未知不填0。','research':research,'pending':'每菜专属图由主任务接入；本脚本不改既有390菜图映射','sha256':sha(payload.encode())}
 (ROOT/'work/reports/recipe-expansion-v3.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':main()
