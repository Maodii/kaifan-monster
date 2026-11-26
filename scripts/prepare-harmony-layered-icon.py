"""Reuse approved transparent mascot, removing source canvas inset without applying an icon mask."""
import json
from pathlib import Path
from PIL import Image,ImageOps
ROOT=Path(__file__).resolve().parent.parent
media=ROOT/'client/AppScope/resources/base/media'
source=Image.open(media/'app_icon.png').convert('RGBA')
bbox=source.getchannel('A').getbbox()
foreground=source.crop(bbox).resize((1024,1024),Image.Resampling.LANCZOS)
foreground.save(media/'launcher_foreground.png',optimize=True)
background=Image.open(ROOT/'client/entry/src/main/resources/base/media/paper_ivory_tile.png').convert('RGB')
background=ImageOps.fit(background,(1024,1024),method=Image.Resampling.LANCZOS)
background.save(media/'launcher_background.png',optimize=True)
(media/'launcher_layered.json').write_text(json.dumps({'layered-image':{'background':'$media:launcher_background','foreground':'$media:launcher_foreground'}},indent=2)+'\n')
p=ROOT/'work/artifacts.json';d=json.loads(p.read_text());paths={str((media/n).relative_to(ROOT)) for n in ['launcher_foreground.png','launcher_background.png']};d['files']=[f for f in d['files'] if f.get('path') not in paths]
for name,purpose in [('launcher_foreground.png','鸿蒙分层图标前景，沿用正式小怪、去除原画布内边距，不预裁圆角'),('launcher_background.png','鸿蒙分层图标满幅纸纹背景')]:
 path=str((media/name).relative_to(ROOT));d['files'].append({'path':path,'kind':'generated_ui','purpose':purpose,'target_path':path})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
