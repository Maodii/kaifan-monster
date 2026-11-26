import concurrent.futures,json,re,urllib.request,datetime
from pathlib import Path
from html.parser import HTMLParser
class PageText(HTMLParser):
 def __init__(self):super().__init__();self.hidden=0;self.parts=[];self.title='';self.in_title=False
 def handle_starttag(self,tag,attrs):
  if tag in ['script','style','noscript','svg']:self.hidden+=1
  if tag=='title':self.in_title=True
 def handle_endtag(self,tag):
  if tag in ['script','style','noscript','svg']:self.hidden=max(0,self.hidden-1)
  if tag=='title':self.in_title=False
 def handle_data(self,data):
  if self.in_title:self.title+=data
  if not self.hidden and data.strip():self.parts.append(data.strip())
urls=[('Paprika','https://www.paprikaapp.com/'),('AnyList','https://www.anylist.com/'),('Mealime','https://www.mealime.com/'),('Cronometer','https://cronometer.com/'),('MyFitnessPal','https://www.myfitnesspal.com/'),('Samsung Food','https://samsungfood.com/'),('SideChef','https://www.sidechef.com/'),('下厨房','https://www.xiachufang.com/'),('豆果美食','https://www.douguo.com/'),('Bring!','https://www.getbring.com/en/home')]
keywords=['meal plan','grocery','shopping list','pantry','recipe','nutrition','diary','track','cook','share','sync','family','菜谱','菜单','做法','作品','收藏','笔记','搜索']
def fetch(pair):
 name,url=pair
 try:
  request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36'})
  with urllib.request.urlopen(request,timeout=25) as r:raw=r.read(2500000);final=r.url;status=r.status
  parser=PageText();parser.feed(raw.decode('utf-8',errors='replace'));title=parser.title
  lines=[re.sub(r'\s+',' ',s).strip() for s in parser.parts];matches=[]
  for i,line in enumerate(lines):
   if any(k in line.lower() for k in keywords):
    snippet=' '.join(lines[max(0,i-1):i+2])[:650]
    if snippet not in matches:matches.append(snippet)
  return {'name':name,'url':url,'resolved_url':final,'status':status,'title':title,'excerpts':matches[:18]}
 except Exception as e:return {'name':name,'url':url,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:results=list(pool.map(fetch,urls))
p=Path('/Users/developer/Documents/ChatGPT/HarmonyOS/work/reports/competitive-sources.json');p.write_text(json.dumps({'checked_at':datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),'method':'Official public web pages; no app installation or account login','sources':results},ensure_ascii=False,indent=2)+'\n')
for row in results:print(json.dumps(row,ensure_ascii=False))
