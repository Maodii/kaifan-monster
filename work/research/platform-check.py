import urllib.request,concurrent.futures,json,re
from pathlib import Path
urls=[('豆果美食','https://www.douguo.com/caipu/'),('美食天下移动','https://m.meishichina.com/recipe/'),('美食杰','https://www.meishij.net/'),('下厨房移动','https://m.xiachufang.com/'),('小红书发现','https://www.xiaohongshu.com/explore'),('哔哩哔哩搜索','https://search.bilibili.com/all?keyword=%E5%AE%B6%E5%B8%B8%E8%8F%9C'),('必应菜谱搜索','https://www.bing.com/search?q=%E5%AE%AB%E4%BF%9D%E9%B8%A1%E4%B8%81+%E8%B1%86%E6%9E%9C+%E7%94%A8%E6%96%99')]
root=Path('work/research');root.mkdir(exist_ok=True)
def fetch(pair):
 name,url=pair
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36'})
  with urllib.request.urlopen(req,timeout=25) as f:data=f.read(2000000);status=f.status
  text=data.decode('utf-8',errors='replace');path=root/(str(urls.index(pair))+'.html');path.write_text(text);return {'name':name,'url':url,'status':status,'bytes':len(data),'title':re.findall('<title[^>]*>(.*?)</title>',text,re.S)[:1],'path':str(path)}
 except Exception as e:return {'name':name,'url':url,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(fetch,urls))
Path('work/reports/platform-research.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
