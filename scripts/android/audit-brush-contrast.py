"""Fresh representative pigment sampling; not a device accessibility audit."""
from pathlib import Path
import hashlib,json,datetime
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2]
sha=lambda data:hashlib.sha256(data).hexdigest()
style=(root/'android/web/style.css').read_text()
configs=[('button.active','crayon_swatch_sage','#294b3f'),('.order-chips button.active','crayon_ribbon_sage','#294b3f'),('.draw-entry / drawFull primary','crayon_ribbon_honey','#62442c'),('.profile-editor-heading h1','crayon_ribbon_lilac','#304f52'),('.draw-presets button.active','crayon_swatch_wheat','#304f52')]
def lum(rgb):
 v=np.asarray(rgb)/255
 return np.sum(np.where(v<=.04045,v/12.92,((v+.055)/1.055)**2.4)*[.2126,.7152,.0722],axis=-1)
rows=[]
for selector,name,color in configs:
 assert color.lower() in style.lower() and name in style,(selector,'CSS pigment changed')
 path='client/entry/src/main/resources/base/media/'+name+'.png'
 image=Image.open(root/path).convert('RGBA').resize((180,48),Image.Resampling.LANCZOS)
 paper=Image.new('RGBA',(180,48),'#faf4e8');paper.alpha_composite(image)
 pixels=np.asarray(paper.convert('RGB'))[12:36,30:150];l=lum(pixels)
 text=float(lum([int(color[i:i+2],16) for i in (1,3,5)]));c=(np.maximum(l,text)+.05)/(np.minimum(l,text)+.05)
 rows.append(dict(selector=selector,image=path,image_sha256=sha((root/path).read_bytes()),color=color,text_luminance=text,samples=int(c.size),min=float(c.min()),p05=float(np.percentile(c,5)),median=float(np.median(c)),fraction_at_least_4_5=float(np.mean(c>=4.5))))
report=dict(passed=all(row['p05']>=4.5 for row in rows),executed_at=datetime.datetime.now().astimezone().isoformat(),scope='Fresh 180x48 alpha-composited samples on ivory #faf4e8; central x30..150/y12..36, not glyph masks or exhaustive device/page audit.',generated_core_sha256=sha((root/'android/app/build/generated/assets/core.js').read_bytes()),style_sha256=sha(style.encode()),test_source_sha256=sha(Path(__file__).read_bytes()),rows=rows)
(root/'work/reports/android-brush-contrast.json').write_text(json.dumps(report,indent=2)+'\n')
assert report['passed'];print('PASS 5 fresh brush contrast samples')
