#!/usr/bin/env python3
# coding: utf-8
"""Import Unlicense HowToCook text into the versioned offline catalog; never invent missing quantities."""
import json,re,uuid,hashlib,urllib.request,time,concurrent.futures
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parent.parent;CACHE=ROOT/'work/research/recipe-text';CACHE.mkdir(parents=True,exist_ok=True)
tree=json.loads((ROOT/'work/research/cook-tree.json').read_text());paths=[x['path'] for x in tree['tree'] if x['path'].endswith('.md') and x['path'].split('/')[0]=='dishes' and x['path'].split('/')[1] in ['meat_dish','vegetable_dish','staple','aquatic','breakfast','soup','dessert']]
REGIONS={
 '四川':['宫保','麻婆','回锅','鱼香','水煮','夫妻肺片','口水鸡','担担','辣子鸡','麻辣','酸菜鱼','蚂蚁上树','豆瓣鱼','甜烧白','红油','泡椒','棒棒鸡','干煸'],
 '湖南':['剁椒','小炒肉','湘','辣椒炒肉','小炒黄牛肉','口味虾','擂椒'],
 '广东':['白切鸡','白灼','煲仔','豉汁','广式','肠粉','叉烧','清蒸鲈','冬瓜排骨','老火','菜干','艇仔','煲汤','猪肚鸡','双皮奶','姜撞奶','豉油'],
 '山东':['葱烧海参','糖醋鲤鱼','九转大肠','油爆双脆','木须','爆炒腰花','葱爆','拔丝','醋溜'],
 '江苏':['扬州','狮子头','盐水鸭','松鼠','大煮干丝','南京','淮扬','文思豆腐'],
 '浙江':['东坡','龙井','西湖','宋嫂','油焖笋','梅干菜','红烧肉','糖醋排骨','葱油面'],
 '福建':['佛跳墙','荔枝肉','蛏抱蛋','福州','沙茶','福鼎','海蛎煎'],
 '安徽':['臭鳜鱼','毛豆腐','徽','黄山','板栗烧鸡'],
 '东北':['锅包肉','地三鲜','东北','小鸡炖蘑菇','酸菜白肉','猪肉炖粉条','溜肉段','乱炖','溜三样'],
 '西北':['大盘鸡','新疆','孜然','手抓','抓饭','肉夹馍','油泼','臊子','羊肉泡馍','烤羊','拉条子'],
 '云贵':['汽锅鸡','酸汤','云南','贵州','菌菇','折耳根','过桥米线'],
 '广西':['啤酒鱼','螺蛳','阳朔','柠檬鸭'],
 '华北':['京酱','炸酱','卤煮','北京','天津','打卤','炸灌肠'],
 '港台':['三杯鸡','卤肉饭','台式','港式','蚵仔','菠萝油'],
 '异国风味':['意大利','披萨','咖喱','日式','韩式','泰式','寿司','寿喜','味噌','冬阴功','照烧','韩国','罗宋','汉堡','三明治','培根','牛排','法式','蛋包饭','可乐饼','西班牙','沙拉','瑞典','美式','大阪','奶油蘑菇']}
COND=['盐','糖','酱','醋','油','料酒','胡椒','花椒','八角','香叶','桂皮','淀粉','味精','鸡精','清水','饮用水','开水','水','葱','香菜','生姜','姜片','大蒜','葱花','小葱','辣椒粉','孜然','五香粉','酵母','泡打粉']
UNITS={'克':'g','千克':'kg','毫升':'mL','升':'L','g':'g','kg':'kg','ml':'mL','mL':'mL','L':'L','个':'个','根':'根','片':'片','瓣':'瓣','块':'块','只':'只','碗':'碗','杯':'杯','把':'把','条':'条','袋':'袋','盒':'盒'}
def fetch(path):
 target=CACHE/(hashlib.sha256(path.encode()).hexdigest()[:16]+'.md')
 if target.exists():return path,target.read_text()
 url='https://raw.githubusercontent.com/Anduin2017/HowToCook/master/'+urllib.parse.quote(path)
 for attempt in range(3):
  try:
   with urllib.request.urlopen(url,timeout=30) as f:text=f.read().decode('utf-8')
   target.write_text(text);return path,text
  except Exception:
   if attempt==2:raise
   time.sleep(attempt+1)
def clean(v):
 v=re.sub(r'!\[[^\]]*\]\([^)]*\)','',v);v=re.sub(r'\[([^]]*)\]\([^)]*\)',r'\1',v);return re.sub(r'[*`~]','',v).strip()
def section(text,heading):
 m=re.search(r'^##\s+'+heading+r'.*?\n(.*?)(?=^##\s|\Z)',text,re.M|re.S);return m.group(1) if m else ''
def amount(line):
 # Only explicit number+unit tokens. Ranges use their upper endpoint, shown in original amountText.
 m=re.search(r'(\d+(?:\.\d+)?)\s*(?:[-~～—至]\s*(\d+(?:\.\d+)?))?\s*(千克|毫升|kg|mL|ml|克|升|g|L|个|根|片|瓣|块|只|碗|杯|把|条|袋|盒)',line)
 return (float(m.group(2) or m.group(1)),UNITS[m.group(3)]) if m else (0,'g')
def ingredient_name(line):
 v=re.split(r'[=＝:：]|\s+(?=\d)|[（(]',line)[0].strip();v=re.sub(r'\d.*','',v).strip(' -，,：:');return v[:70]
def convert(pair):
 path,text=pair;stem=Path(path).stem;name=stem.replace('的做法','');typ=path.split('/')[1]
 raw=section(text,'必备原料和工具') or section(text,'必备原料')
 rawlines=[clean(re.sub(r'^\s*[-*+]\s*','',x)) for x in raw.splitlines() if re.match(r'^\s*[-*+]\s+',x)];rawlines=[x for x in rawlines if x and len(x)<500]
 calc=section(text,'计算');calcrows=[clean(re.sub(r'^\s*[-*+]\s*','',x)) for x in calc.splitlines() if re.match(r'^\s*[-*+]\s+',x)]
 ingredients=[];seen=set()
 for line in (rawlines or calcrows):
  nm=ingredient_name(line)
  if not nm or nm in seen or nm in ['必须配料','进阶配料','可选配料','原料','工具'] or len(nm)>22 or any(x in nm for x in ['时间','体积','容量','比例','食用','水果刀','厨刀','小碗','勺子','工具','锅','漏勺','筷子','烤箱','模具','剪刀','碗具','保鲜膜','锡纸','温度计']):continue
  related=next((c for c in calcrows if ingredient_name(c)==nm and amount(c)[0]>0),line);q,u=amount(related);seen.add(nm)
  ingredients.append({'name':nm,'quantity':q,'unit':u,'amountText':related,'optional':any(x in nm for x in COND) and not ('洋葱' in nm and '粉' not in nm)})
 op=section(text,'操作') or section(text,'制作') or section(text,'步骤')
 versions=list(re.finditer(r'^###.*(?:版本|方案|方法|做法).*$',op,re.M));
 if len(versions)>1:op=op[:versions[1].start()]
 steps=[]
 for ln in op.splitlines():
  ln=clean(ln);ln=re.sub(r'^(?:\d+[.、)]|[-+])\s*','',ln)
  if ln and not ln.startswith(('#','|','<!--','http')):steps.append(ln[:1800])
 if not steps:steps=[clean(op)[:5000]] if clean(op) else []
 if not ingredients or not steps:return None
 category='家常菜'
 if typ=='soup':category='粥类' if '粥' in name else '汤类'
 elif typ=='staple':category='主食'
 elif typ=='breakfast':category='早餐'
 elif typ=='dessert':category='甜点'
 if any(x in name for x in ['凉拌','拍黄瓜','口水','沙拉','白切']):category='凉菜'
 if any(x in name for x in ['红烧肉','东坡','大盘鸡','炖','肘子','烤鸭','狮子头','整鸡','海参','扣肉','佛跳墙']):category='大菜'
 region=next((r for r,words in REGIONS.items() if any(w in name for w in words)),'通用家常')
 taste='香辣' if any(x in name for x in ['辣','麻婆','回锅','宫保','水煮','剁椒','酸汤','鱼香']) else '酸甜' if any(x in name for x in ['糖醋','酸甜','茄汁','锅包','菠萝']) else '咸鲜' if any(x in name for x in ['红烧','酱','卤','葱烧','葱爆','炖']) else '清淡'
 # Planning estimates are explicitly tagged; no claimed per-source exact cooking duration.
 minutes=90 if category=='大菜' else 60 if category in ['粥类','汤类'] else 40 if category in ['主食','甜点'] else 20
 if any(x in name for x in ['蒸','清蒸']):minutes=30
 duration=re.findall(r'(\d+(?:\.\d+)?)\s*(小时|分钟|min|h)(?![a-z])',op);explicit=sum(float(n)*(60 if u in ['小时','h'] else 1) for n,u in duration);
 if explicit>0:minutes=max(15,min(2880,int(explicit+10)))
 if any(x in name for x in ['卤','炖','煲']):minutes=max(minutes,75)
 prep=15 if category=='大菜' else 10
 difficulty='进阶' if re.search(r'难度[：:]?\s*[★⭐]{4,}',text) or category=='大菜' else '简单'
 fullurl='https://github.com/Anduin2017/HowToCook/blob/master/'+urllib.parse.quote(path)
 return {'id':str(uuid.uuid5(uuid.NAMESPACE_URL,fullurl)),'name':name,'region':region,'cuisine':region,'category':category,'taste':taste,'minutes':minutes,'prepMinutes':prep,'cookMinutes':minutes-prep,'timeEstimated':True,'people':2,'servingsNote':'用量遵循来源说明；人数可能不同，制作前按实际用量核对。','difficulty':difficulty,'estimatedCost':0,'costKnown':False,'ingredients':ingredients,'ingredientsRaw':rawlines,'steps':steps,'tips':'时间为备餐规划估算，含预处理；浸泡、腌制等等待以步骤为准。数量缺失项请先填写实际用量，肉禽水产需充分熟透。','sourceName':'HowToCook 开放菜谱','sourceUrl':fullurl,'sourceLicense':'Unlicense','sourceRevision':tree['sha'],'methodNotes':clean(section(text,'附加内容'))[:2000],'imageKey':category,'needsQuantityReview':any(i['quantity']<=0 and not i['optional'] for i in ingredients),'version':0,'modifiedAt':'','status':'builtin','familyId':''}
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:pairs=list(pool.map(fetch,paths))
 recipes=[r for r in map(convert,pairs) if r];names=set();dedup=[]
 for r in recipes:
  if r['name'] in names:continue
  names.add(r['name']);dedup.append(r)
 out=ROOT/'backend/data';out.mkdir(exist_ok=True);catalog={'version':1,'sourceRevision':tree['sha'],'recipes':dedup};serialized=json.dumps(catalog,ensure_ascii=False,separators=(',',':'));(out/'recipes.json').write_text(serialized);(ROOT/'client/entry/src/main/resources/rawfile/recipes.json').write_text(serialized)
 lic=ROOT/'art-source/licenses';lic.mkdir(exist_ok=True);(lic/'HowToCook-Unlicense.txt').write_text((ROOT/'work/research/cook-license.txt').read_text())
 report={'count':len(dedup),'categories':dict(Counter(r['category'] for r in dedup)),'regions':dict(Counter(r['region'] for r in dedup)),'quantityReview':sum(r['needsQuantityReview'] for r in dedup),'sourceRevision':tree['sha'],'sha256':hashlib.sha256(serialized.encode()).hexdigest(),'rejected':len(paths)-len(dedup),'sources':[{'name':'小红书','url':'https://www.xiaohongshu.com/search_result?keyword=家常菜','result':'公开搜索HTML可取，但feeds为空；未获取笔记或据此编造菜谱'},{'name':'下厨房','url':'https://www.xiachufang.com/category/','result':'HTTP 418，未采集'},{'name':'美食天下','url':'https://www.meishichina.com/','result':'HTTP 403，未采集'},{'name':'HowToCook','url':'https://github.com/Anduin2017/HowToCook','license':'Unlicense','result':'文本导入，保留逐菜来源、原料说明和步骤'}]};(ROOT/'work/reports/recipe-import.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
