from pathlib import Path
from PIL import Image
import json,hashlib,shutil
root=Path(__file__).resolve().parent.parent
source=root/'work/generated-art/ui-icons/atlas.png'
formal_source=root/'art-source/ui-icons/atlas.png'
if source.exists():shutil.move(source,formal_source)
atlas=Image.open(formal_source).convert('RGBA');w,h=atlas.size
keys=['today','recipes','diary','pantry','profile','community','camera','album','shuffle','people','time','budget','home','soup','light','quick','porridge','feast','staples','breakfast','cold','dessert','protein','taste','storage','appearance','reminder','cloud','backup','help']
files=[]
for n,key in enumerate(keys):
 x,y=n%6,n//6
 # Measured transparent gutters from the generated canvas; equal rows cut off first-row icons.
 xs=[0,240,465,690,915,1135,w];ys=[0,265,480,698,923,h]
 cell=atlas.crop((xs[x],ys[y],xs[x+1],ys[y+1]))
 alpha=cell.getchannel('A');box=alpha.point(lambda p:255 if p>40 else 0).getbbox();assert box,key
 # Native small icons need consistent visual weight; crop only transparent perimeter then contain with generous padding.
 cell=cell.crop(box);cell.thumbnail((196,196),Image.Resampling.LANCZOS);out=Image.new('RGBA',(256,256));out.alpha_composite(cell,((256-cell.width)//2,(256-cell.height)//2))
 target=root/f'client/entry/src/main/resources/base/media/ui_{key}.png';out.save(target,optimize=True)
 files.append({'path':str(target.relative_to(root)),'kind':'generated_ui','purpose':f'独立蜡笔功能图标：{key}','target_path':str(target.relative_to(root)),'source_path':'art-source/ui-icons/atlas.png','cell':n,'atlas_bounds':[xs[x],ys[y],xs[x+1],ys[y+1]],'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'dimensions':[256,256],'alpha':True,'source_crop':box})
(root/'art-source/ui-icons/manifest.json').write_text(json.dumps({'model':'gpt-image-2.5-flare','prompt':'art-source/ui-icons/prompt.txt','style_reference':'art-source/crayon/crayon-pack-source.png','actual_source_size':[w,h],'files':files},ensure_ascii=False,indent=2)+'\n')
# Explicit Resource references permit ArkTS resource checking.
text='export function uiIcon(key:string):Resource {\n'+''.join(f" if(key==='{key}'){{return $r('app.media.ui_{key}');}}\n" for key in keys)+" return $r('app.media.ui_help');\n}\n"
(root/'client/entry/src/main/ets/model/UiIconMap.ets').write_text(text)
print('Processed 30 unique generated icons, source retained once; no opaque backplates')
