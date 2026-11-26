"""Refine existing selected mascot, preserving its original illustration; no generation."""
from pathlib import Path
import json,hashlib
from PIL import Image,ImageFilter,ImageDraw
root=Path(__file__).resolve().parent.parent
path=root/'client/entry/src/main/resources/base/media/brand_monster.png'
im=Image.open(path).convert('RGBA')
# Existing mascot already has real transparency; exclude invisible padding and
# subpixel alpha haze so later runs remain stable.
box=im.getchannel('A').point(lambda a:255 if a>20 else 0).getbbox()
subject=im.crop(box)
formal=[]
for target,size,extent in [('client/entry/src/main/resources/base/media/brand_monster.png',768,716),('client/entry/src/main/resources/base/media/app_icon.png',1024,882),('client/AppScope/resources/base/media/app_icon.png',1024,882)]:
 factor=extent/max(subject.size);art=subject.resize((round(subject.width*factor),round(subject.height*factor)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(size,size));out.alpha_composite(art,((size-art.width)//2,(size-art.height)//2));p=root/target;out.save(p)
 a=out.getchannel('A');assert all(a.getpixel(xy)==0 for xy in [(0,0),(0,size-1),(size-1,0),(size-1,size-1)])
 formal.append({'path':target,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'alpha_bbox':a.point(lambda a:255 if a>20 else 0).getbbox(),'size':size})
proof=Image.new('RGB',(1056,576),'#FFF9ED')
for i,bg in enumerate(['#FFF9ED','#DCE9E5','#EADFF2']):
 tile=Image.new('RGBA',(352,576),bg);art=Image.open(path);art.thumbnail((304,304),Image.Resampling.LANCZOS);tile.alpha_composite(art,((352-art.width)//2,100));proof.paste(tile.convert('RGB'),(i*352,0))
proof.save(root/'work/generated-art/launch/transparent-mascot-review.jpg',quality=94)
r={'passed':True,'method':'Reuse selected transparent mascot; trim empty canvas; remove opaque icon backing; enlarge safe-area subject','formal_files':formal,'generation':False}
(root/'work/reports/launch-brand.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
p=root/'work/artifacts.json';j=json.loads(p.read_text());entries={x['path']:x for x in j['files']}
for f in formal:entries[f['path']]={'path':f['path'],'kind':'generated_art','purpose':'选定小怪透明放大版，去除图标实色底','target_path':f['path'],'sha256':f['sha256']}
q='work/generated-art/launch/transparent-mascot-review.jpg';entries[q]={'path':q,'kind':'generated_art','purpose':'透明小怪在三种底色上的边缘检查'}
j['files']=list(entries.values());p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False))
