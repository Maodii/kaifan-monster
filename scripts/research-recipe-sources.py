#!/usr/bin/env python3
# coding: utf-8
"""Read publicly available recipe ingredient facts and source links, not images or copied prose."""
from pathlib import Path
import urllib.request,urllib.parse,re,json,concurrent.futures,html,time
ROOT=Path(__file__).resolve().parent.parent;out=ROOT/'work/research/platform-recipes';out.mkdir(parents=True,exist_ok=True)
queries=['川菜','湖南菜','广东汤','山东菜','淮扬菜','浙江菜','福建菜','安徽菜','东北菜','新疆菜','减脂餐','高蛋白','粥']
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
 with urllib.request.urlopen(req,timeout=25) as f:return f.read(1500000).decode('utf-8',errors='replace')
def search(q):
 url='https://m.xiachufang.com/search/?keyword='+urllib.parse.quote(q)
 try:
  s=get(url);links=list(dict.fromkeys(re.findall(r'href=["\'](/recipe/\d+/)',s)));return q,['https://m.xiachufang.com'+x for x in links[:2]]
 except Exception as e:return q,[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:searches=list(pool.map(search,queries))
links=list(dict.fromkeys([u for _,ls in searches for u in ls]+['https://m.xiachufang.com/recipe/101761223/']))
def page(url):
 try:
  s=get(url);m=re.search(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',s,re.S)
  if not m:return {'url':url,'error':'无结构化菜谱信息'}
  data=json.loads(html.unescape(m.group(1)));facts=[]
  for name,amount in re.findall(r'class="ing-name"[^>]*>\s*(.*?)\s*</div>\s*<div class="ing-amount"[^>]*>\s*(.*?)\s*</div>',s,re.S):facts.append({'name':html.unescape(re.sub('<[^>]+>','',name)).strip(),'amount':html.unescape(re.sub('<[^>]+>','',amount)).strip()})
  item={'url':url,'platform':'下厨房','name':data.get('name',''),'author':data.get('author',{}).get('name',''),'ingredients':facts or [{'name':x,'amount':''} for x in data.get('recipeIngredient',[])],'recipeYield':data.get('recipeYield',''),'totalTime':data.get('totalTime',''),'accessed':'2026-11-03','usage':'仅事实用料与来源索引，未复制作者步骤、照片或宣传文案'}
  return item
 except Exception as e:return {'url':url,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:facts=list(pool.map(page,links))
# Douguo public front page and representative recipe pages.
try:
 s=get('https://www.douguo.com/');urls=list(dict.fromkeys(re.findall(r'href=["\'](?:https://www.douguo.com)?(/cookbook/\d+\.html)',s)))[:4]
 for p in urls:
  u='https://www.douguo.com'+p
  try:
   text=get(u);title=re.findall(r'<title[^>]*>(.*?)</title>',text,re.S);facts.append({'url':u,'platform':'豆果美食','name':html.unescape(title[0]) if title else '', 'usage':'公开来源索引；未复制步骤和图片','accessed':'2026-11-03'})
  except Exception as e:facts.append({'url':u,'error':str(e)})
except Exception as e:facts.append({'url':'https://www.douguo.com/','error':str(e)})
report={'accessed':'2026-11-03','searches':[{'query':q,'urls':u} for q,u in searches],'sources':facts};(ROOT/'work/reports/recipe-platform-facts.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('Public recipe sources:',len(facts),'successful:',sum('error' not in x for x in facts))
