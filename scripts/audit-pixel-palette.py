"""Inspect pigment/ink contrast on cream paper; design assay, not a device accessibility certification."""
from pathlib import Path
import hashlib,json,re
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parent.parent
source=root/'client/entry/src/main/ets/pages/Index.ets';text=source.read_text()
# Include literal source inks and category palettes; testing all four pigments is a conservative envelope.
inks=set(re.findall(r"ink:\s*'(#[0-9A-Fa-f]{6})'",text))
inks.update(['#38584D','#587B61','#A67257','#AE7854','#5D8498','#9477AA','#A17B45','#5B829D','#AC768F','#AC5C4A','#9B7226','#A65673','#7D609D','#587FA0','#547549'])
brushes=['crayon_swatch_clay','crayon_swatch_wheat','crayon_swatch_sage','crayon_ribbon_lilac']
def luminance(color):
 normalized=np.array(color)/255
 return np.sum(np.where(normalized<=.04045,normalized/12.92,((normalized+.055)/1.055)**2.4)*[.2126,.7152,.0722],axis=-1)
def darkened(color):
 rgb=[int(color[i:i+2],16) for i in [1,3,5]]
 for _ in range(12):
  if luminance(rgb)<=.055:break
  rgb=[int(v*.9+.5) for v in rgb]
 return rgb
rows=[];paper=np.array([255,249,237])
for brush in brushes:
 data=np.array(Image.open(root/'client/entry/src/main/resources/base/media'/(brush+'.png')).convert('RGBA'),dtype=float)
 alpha=data[:,:,3:]/255;ground=luminance(data[:,:,:3]*alpha+paper*(1-alpha));mask=data[:,:,3]>25.5
 for ink in sorted(inks):
  raw=[int(ink[i:i+2],16) for i in [1,3,5]];readable=darkened(ink)
  def contrast(rgb):
   foreground=luminance(rgb);values=(np.maximum(ground,foreground)+.05)/(np.minimum(ground,foreground)+.05)
   return {'p05':round(float(np.percentile(values[mask],5)),3),'median':round(float(np.median(values[mask])),3),'minimum':round(float(values[mask].min()),3)}
  rows.append({'pigment':brush,'source_ink':ink,'readable_ink':'#'+''.join(f'{v:02x}' for v in readable),'before':contrast(raw),'after':contrast(readable)})
report={'passed':all(r['after']['p05']>=4.5 for r in rows),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'palette_envelope_combinations':len(rows),'minimum_after_p05':min(r['after']['p05'] for r in rows),'measurements':rows,'scope':'Conservative source-palette envelope across four actual ChoiceChip pigments, composited on #FFF9ED. p05 excludes the darkest 5% of pigment grain; not a blanket all-pixels, all-themes or device accessibility claim. Device screenshots reviewed separately.'}
(root/'work/reports/pixel-polish-ribbon-contrast.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='measurements'}))
assert report['passed']
