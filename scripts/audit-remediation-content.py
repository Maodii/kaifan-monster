"""Audit actual shipped recipe facts without silently inventing missing instructions."""
from pathlib import Path
import json, math, re, collections, hashlib
ROOT=Path(__file__).resolve().parent.parent
raw=ROOT/'backend/data/recipes.json';data=json.loads(raw.read_text());rows=data['recipes'];hard=[];review=[]
for r in rows:
 fields=[]
 if not r.get('id') or not r.get('name'):hard.append({'id':r.get('id'),'reason':'missing identity'})
 if not r.get('ingredients') or not r.get('steps'):hard.append({'id':r['id'],'reason':'missing recipe content'})
 if not all(isinstance(s,str) and s.strip() for s in r.get('steps',[])):hard.append({'id':r['id'],'reason':'empty instruction'})
 if not isinstance(r.get('minutes'),(int,float)) or r['minutes']<=0:hard.append({'id':r['id'],'reason':'invalid total time'})
 for i in r.get('ingredients',[]):
  if re.search(r'分蛋器|砧板|厨房纸|容器|打蛋器|擀面杖|^必备$|^主料$|^辅料$',i.get('name','')):hard.append({'id':r['id'],'reason':'equipment/header in edible list'})
  if not i.get('name') or not i.get('unit') or not isinstance(i.get('quantity'),(int,float)) or not math.isfinite(i['quantity']) or i['quantity']<0:hard.append({'id':r['id'],'reason':'invalid ingredient'})
  elif i['quantity']==0:fields.append('推荐量待人工确认:'+i['name'])
 if not any(re.search(r'\d+\s*(分钟|小时|秒)',s) for s in r.get('steps',[])):fields.append('步骤没有独立时长，以操作状态判断，不均摊总耗时')
 if not r.get('nutritionKnown'):fields.append('整菜营养未核实，UI仅显示已识别原料估算')
 if fields:review.append({'id':r['id'],'name':r['name'],'fields':list(dict.fromkeys(fields))})
ids=[r['id'] for r in rows]
if len(set(ids))!=len(ids):hard.append({'reason':'duplicate recipe identities'})
mirror=ROOT/'client/entry/src/main/resources/rawfile/recipes.json'
if mirror.read_bytes()!=raw.read_bytes():hard.append({'reason':'native recipe mirror differs'})
covers=json.loads((ROOT/'art-source/recipe-covers/manifest.json').read_text())['files'];coverids={f['recipeId'] for f in covers}
for r in rows:
 if r['id'] not in coverids:hard.append({'id':r['id'],'reason':'no matching cover'})
result={'passed':not hard,'catalogRecipes':len(rows),'nativeBuiltinTotal':len(covers),'uniqueCovers':len(coverids),'regions':dict(collections.Counter(r.get('region','未标注') for r in rows)),'categories':dict(collections.Counter(r.get('category','未标注') for r in rows)),'sourceSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'hardErrors':hard,'editorialReview':review,'policy':'Unknown quantities, independent step time and whole-recipe nutrition remain explicitly unknown. No missing source facts invented.'}
(ROOT/'work/reports/remediation-content-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['passed','catalogRecipes','nativeBuiltinTotal','uniqueCovers','hardErrors']},ensure_ascii=False));raise SystemExit(0 if result['passed'] else 1)
