#!/usr/bin/env python3
"""Split the reviewed AI source sheet into native transparent icon resources."""
from pathlib import Path
from collections import deque
import json,shutil
from PIL import Image,ImageFilter
R=Path(__file__).resolve().parents[1]
source=R/'art-source/legal-icons-sheet.png'
candidate=R/'work/generated-art/legal-icons-sheet.png'
if candidate.exists():
 if source.exists():raise SystemExit('Reviewed source already exists; inspect before replacing')
 candidate.replace(source)
im=Image.open(source).convert('RGB');assert im.size==(1536,1024)
keys=['privacy','terms','permissions','ai','support','about'];entries=[]
for i,key in enumerate(keys):
 cell=im.crop(((i%3)*512,(i//3)*512,(i%3+1)*512,(i//3+1)*512)).convert('RGBA')
 # Remove only white connected to the exterior, preserving white paper interiors.
 px=cell.load();seen=set();q=deque([(x,y) for x in range(512) for y in (0,511)]+[(x,y) for y in range(512) for x in (0,511)])
 while q:
  x,y=q.popleft()
  if (x,y) in seen or not(0<=x<512 and 0<=y<512):continue
  if min(px[x,y][:3])<237:continue
  seen.add((x,y));q.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
 for x,y in seen:px[x,y]=(255,255,255,0)
 box=cell.getbbox();assert box and box[0]>10 and box[1]>10 and box[2]<502 and box[3]<502,box
 cell=cell.crop(box);cell.thumbnail((208,208),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(240,240));out.alpha_composite(cell,((240-cell.width)//2,(240-cell.height)//2))
 target=R/f'client/entry/src/main/resources/base/media/legal_{key}.png';out.save(target,optimize=True)
 entries.append({'path':str(target.relative_to(R)),'kind':'generated_ui','purpose':f'协议与关于页面插画图标：{key}','target_path':str(target.relative_to(R)),'source':'art-source/legal-icons-sheet.png'})
prompt=R/'work/generated-art/legal-icons-prompt.txt'
if prompt.exists():prompt.replace(R/'art-source/legal-icons-prompt.txt')
entries.extend([{'path':'art-source/legal-icons-sheet.png','kind':'generated_art','purpose':'api-image生成的六枚协议插画原图；参考brand_monster.png，仅样式与身份参考','target_path':'client/entry/src/main/resources/base/media/legal_*.png'}])
p=R/'work/artifacts.json';d=json.loads(p.read_text());paths={e['path'] for e in entries};d['files']=[e for e in d['files'] if e['path'] not in paths]+entries;p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print('Prepared six transparent 240px icons; source and prompt retained once in art-source/')
