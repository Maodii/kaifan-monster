# coding: utf-8
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parent.parent;report=json.loads((root/'work/reports/recipe-platform-facts.json').read_text());facts=[x for x in report['sources'] if 'error' not in x and x.get('ingredients') and not any(w in x.get('name','') for w in ['减重','瘦','合集'])]
p=root/'backend/data/recipes.json';catalog=json.loads(p.read_text());linked=0
for recipe in catalog['recipes']:
 refs=[]
 for fact in facts:
  name=recipe['name'];title=fact['name'];key=name.replace('西北','').replace('东北','')
  if key and key in title:
   refs.append({'url':fact['url'],'platform':fact['platform'],'author':fact['author'],'ingredients':[x['name']+(' '+x['amount'] if x['amount'] else '（原站未明示用量）') for x in fact['ingredients']]})
 recipe['referenceSources']=refs
 linked+=bool(refs)
serialized=json.dumps(catalog['recipes'],ensure_ascii=False,separators=(',',':'));catalog['sourceRevision']=hashlib.sha256(serialized.encode()).hexdigest();payload=json.dumps(catalog,ensure_ascii=False,separators=(',',':'));p.write_text(payload);(root/'client/entry/src/main/resources/rawfile/recipes.json').write_text(payload)
index={'accessed':'2026-11-03','sources':facts,'note':'仅用料事实和公开来源索引；未复制闭源平台的作者步骤与图片'};data=json.dumps(index,ensure_ascii=False,separators=(',',':'));(root/'backend/data/recipe-source-index.json').write_text(data);(root/'client/entry/src/main/resources/rawfile/recipe-source-index.json').write_text(data)
print('Public ingredient-fact sources',len(facts),'linked recipes',linked)
