from PIL import Image
from pathlib import Path
import io,json,zipfile
root=Path(__file__).resolve().parent.parent;checks=[]
for name in ['shiku-mvp-unsigned.hap','kaifan-monster-harmony-release.hap']:
 with zipfile.ZipFile(root/'outputs'/name) as z:
  module=json.loads(z.read('module.json'));assert module['app']['icon']=='$media:launcher_layered'
  assert module['module']['abilities'][0]['icon']=='$media:launcher_layered'
  spec=json.loads(z.read('resources/base/media/launcher_layered.json'))['layered-image'];assert set(spec)=={'foreground','background'} and spec['foreground']!=spec['background']
  for layer in ['background','foreground']:
   im=Image.open(io.BytesIO(z.read('resources/base/media/launcher_'+layer+'.png')));assert im.size==(1024,1024),(name,layer,im.size)
   if layer=='background':assert im.mode=='RGB'
   else:assert im.mode=='RGBA' and im.getchannel('A').getbbox()==(0,0,1024,1024)
 checks.append(name+': application/ability use layered icon, actual packed layers are1024, opaque full background, alpha foreground, no pre-rounded mask')
r={'passed':True,'checks':checks,'scope':'Actual HAP resources and declarations; Huawei precheck rerun pending'}
(root/'work/reports/harmony-precheck-v0918-icons.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r))
