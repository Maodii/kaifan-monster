from pathlib import Path
from collections import deque
import json,sys
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'art-source/experience-v094/icons-source.png'
sheet=Image.open(source).convert('RGBA')
assert sheet.size==(1536,1024)
media=ROOT/'client/entry/src/main/resources/base/media'
report=[]
for index,name in enumerate(['ingredients','timer','shopping','favorite','assistant','plan']):
 im=sheet.crop(((index%3)*512,(index//3)*512,(index%3+1)*512,(index//3+1)*512));pix=im.load();queue=deque()
 for x in range(512):queue.extend([(x,0),(x,511)])
 for y in range(512):queue.extend([(0,y),(511,y)])
 seen=set()
 while queue:
  x,y=queue.popleft()
  if (x,y) in seen or x<0 or y<0 or x>=512 or y>=512:continue
  seen.add((x,y));r,g,b,a=pix[x,y]
  if min(r,g,b)<229 or max(r,g,b)-min(r,g,b)>24:continue
  pix[x,y]=(r,g,b,0);queue.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
 bbox=im.getbbox();assert bbox and bbox[0]>5 and bbox[1]>5 and bbox[2]<507 and bbox[3]<507
 obj=im.crop(bbox);obj.thumbnail((208,208),Image.Resampling.LANCZOS);out=Image.new('RGBA',(256,256));out.alpha_composite(obj,((256-obj.width)//2,(256-obj.height)//2));p=media/f'experience_{name}.png';out.save(p,optimize=True);report.append({'file':str(p.relative_to(ROOT)),'pixels':[256,256],'bytes':p.stat().st_size,'alpha':out.getextrema()[3]})
# Opt-in migration for existing accepted poses; ordinary icon exports never reprocess them.
if '--align-existing-poses' in sys.argv:
 # Stabilize the bowl anchor, with translations only: no stretching the six poses.
 poses=['idle','blink','wave','think','joy','eat'];anchors=[]
 for name in poses:
  im=Image.open(media/f'ai_mascot_{name}.png').convert('RGBA');points=[(x,y) for y in range(im.height//2,im.height) for x in range(im.width) if (lambda p:p[3]>100 and p[0]>170 and p[1]>125 and p[2]<125 and p[1]<p[0]*.95)(im.getpixel((x,y)))];anchors.append((sum(x for x,y in points)/len(points),sum(y for x,y in points)/len(points)))
 cx=sorted(x for x,y in anchors)[3];cy=sorted(y for x,y in anchors)[3]
 for name,(x,y) in zip(poses,anchors):
  p=media/f'ai_mascot_{name}.png';im=Image.open(p).convert('RGBA');dx=round(cx-x);dy=round(cy-y);assert abs(dx)<45 and abs(dy)<45
  box=im.getbbox();dx=max(-box[0],min(dx,im.width-box[2]));dy=max(-box[1],min(dy,im.height-box[3]));assert box[0]+dx>=0 and box[1]+dy>=0 and box[2]+dx<=im.width and box[3]+dy<=im.height
  out=Image.new('RGBA',im.size);out.alpha_composite(im,(dx,dy));out.save(p,optimize=True);report.append({'file':str(p.relative_to(ROOT)),'anchorShift':[dx,dy],'bytes':p.stat().st_size})
(ROOT/'work/reports/experience-art.json').write_text(json.dumps({'passed':True,'assets':report},indent=2)+'\n')
