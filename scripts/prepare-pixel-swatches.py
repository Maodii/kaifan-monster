"""Extract neutral white matte from the reviewed API-generated wax sheet; no unknown originals removed."""
from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib,shutil
root=Path(__file__).resolve().parent.parent
candidate=root/'work/generated-art/pixel-polish/swatch-atlas.png'
source=root/'art-source/pixel-polish/swatch-atlas.png'
if candidate.exists():shutil.move(candidate,source)
im=Image.open(source).convert('RGB')
entries=[]
purposes={'honey': '抽餐入口与主操作、最近浏览入口的透明蜡笔承托', 'lilac': '示例主体资料档案头及紫色选中标签的透明蜡笔承托', 'sage': '设置档案入口与七日计划入口的透明蜡笔承托'}
for name,(top,bottom) in {'honey':(0,342),'lilac':(342,684),'sage':(684,1024)}.items():
 rgb=np.asarray(im.crop((0,top,1536,bottom)),dtype=np.float32)/255
 alpha=1-rgb.min(axis=2)
 alpha[alpha<0.035]=0
 color=np.where(alpha[:,:,None]>0,(rgb-(1-alpha[:,:,None]))/np.maximum(alpha[:,:,None],.001),0)
 pixels=np.dstack((np.clip(color,0,1),alpha));out=Image.fromarray(np.uint8(np.clip(pixels*255,0,255)))
 bounds=out.getbbox();assert bounds
 out=out.crop((max(0,bounds[0]-16),max(0,bounds[1]-12),min(out.width,bounds[2]+16),min(out.height,bounds[3]+12)))
 out.thumbnail((768,256),Image.Resampling.LANCZOS)
 path=root/f'client/entry/src/main/resources/base/media/crayon_ribbon_{name}.png';out.save(path,optimize=True)
 entries.append({'path':str(path.relative_to(root)),'kind':'generated_ui','purpose':purposes[name],'target_path':str(path.relative_to(root)),'source':'art-source/pixel-polish/swatch-atlas.png','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'size':list(out.size),'alpha_bbox':list(out.getbbox())})
manifest=root/'work/artifacts.json';d=json.loads(manifest.read_text());keys={e['path'] for e in entries};d['files']=[e for e in d['files'] if e['path'] not in keys]+entries;manifest.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
(root/'work/reports/pixel-polish-swatches.json').write_text(json.dumps({'model':'gpt-image-2.5-flare','source':str(source.relative_to(root)),'prompt':'art-source/pixel-polish/prompt.txt','files':entries,'matte':'neutral white subtraction using alpha=1-min(rgb); alpha<0.035 removed; original preserved'},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(entries,ensure_ascii=False))
