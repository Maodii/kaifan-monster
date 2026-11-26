from pathlib import Path
from collections import deque
import json,hashlib
from PIL import Image
R=Path(__file__).resolve().parents[1]
source=R/'art-source/ai-mascot/companion-poses-source.png'
sheet=Image.open(source).convert('RGBA');w,h=sheet.size
assert w==h and w%2==0;size=w//2;rows=[]
for index,name in enumerate(['peek','sleep','stretch','surprise']):
 im=sheet.crop(((index%2)*size,(index//2)*size,(index%2+1)*size,(index//2+1)*size));pix=im.load();q=deque();seen=set()
 for x in range(size):q.extend([(x,0),(x,size-1)])
 for y in range(size):q.extend([(0,y),(size-1,y)])
 while q:
  x,y=q.popleft()
  if x<0 or y<0 or x>=size or y>=size or (x,y) in seen:continue
  seen.add((x,y));r,g,b,a=pix[x,y]
  if min(r,g,b)<229 or max(r,g,b)-min(r,g,b)>24:continue
  pix[x,y]=(r,g,b,0);q.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
 box=im.getbbox();assert box and box[0]>8 and box[1]>8 and box[2]<size-8 and box[3]<size-8
 obj=im.crop(box);obj.thumbnail((220,220),Image.Resampling.LANCZOS);out=Image.new('RGBA',(256,256));out.alpha_composite(obj,((256-obj.width)//2,236-obj.height));p=R/'client/entry/src/main/resources/base/media'/('ai_mascot_'+name+'.png');out.save(p,optimize=True)
 assert out.getpixel((0,0))[3]==0 and out.getbbox()[0]>0
 rows.append({'path':str(p.relative_to(R)),'pixels':[256,256],'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(R/'work/reports/companion-art.json').write_text(json.dumps({'passed':True,'source':str(source.relative_to(R)),'assets':rows},ensure_ascii=False,indent=2)+'\n')
