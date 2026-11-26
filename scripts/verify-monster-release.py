"""Validate current brand/calendar/auth iteration before replacing sole HAP delivery."""
from pathlib import Path
import json,hashlib,zipfile,shutil,urllib.request,datetime,io
from PIL import Image,ImageChops,ImageStat
root=Path(__file__).resolve().parent.parent
load=lambda p:json.loads((root/p).read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
page=root/'client/entry/src/main/ets/pages/Index.ets'
source_hash=sha(page)
for name in ['native-monster-ux','native-monster-auth','native-monster-draw']:
 r=load('work/reports/'+name+'.json');assert r['passed'],name;assert r['source_sha256']==source_hash,name+' source mismatch'
for name in ['daily-experience-core','native-auth-client']:
 assert load('work/reports/'+name+'.json')['passed'],name
art=load('work/reports/brand-monster-art.json');assert art['recipe_count']==454 and art['unique_hashes']==454
assert art['status'] in ['passed','completed','resources_fixed','verified','complete_assets_frozen'],art['status']
cover=load('art-source/recipe-covers/manifest.json')['files'];assert len(cover)==454
assert len({f['recipeId'] for f in cover})==454
assert len({sha(root/f['path']) for f in cover})==454
for f in cover:assert sha(root/f['path'])==f['sha256'],f['path']
for f in art['formal_paths']:assert sha(root/f['path'])==f['sha256'],f['path']
source=root/'client/entry/build/default/outputs/default/entry-default-unsigned.hap'
resources=root/'client/entry/src/main/resources'
with zipfile.ZipFile(source) as z:
 formal=list((resources/'base/media').glob('*'))+list((resources/'rawfile').rglob('*'))
 formal=[p for p in formal if p.is_file()]
 for p in formal:
  packaged=z.read('resources/'+p.relative_to(resources).as_posix())
  if p.name=='app_icon.png':
   original=Image.open(p).convert('RGB');compiled=Image.open(io.BytesIO(packaged)).convert('RGB')
   assert original.size==(1024,1024) and compiled.size==(512,512)
   icon_error=max(ImageStat.Stat(ImageChops.difference(original.resize(compiled.size,Image.Resampling.BILINEAR),compiled)).mean)
   assert icon_error<0.25,'Compiler-scaled icon differs from selected logo'
  else:assert packaged==p.read_bytes(),str(p)
 # AppScope icon is compiled into the same app_icon resource as entry; identical bytes required.
 assert (root/'client/AppScope/resources/base/media/app_icon.png').read_bytes()==(resources/'base/media/app_icon.png').read_bytes()
for p in [root/'client/AppScope/resources/base/element/string.json',resources/'base/element/string.json']:
 assert '开饭小怪' in p.read_text(),str(p)
assert (root/'backend/data/recipes.json').read_bytes()==(resources/'rawfile/recipes.json').read_bytes()
health={}
for port in [3000,3001]:
 with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/v1/health',timeout=5) as r:assert r.status==200
 health[str(port)]='healthy'
out=root/'outputs/shiku-mvp-unsigned.hap';shutil.copyfile(source,out)
r={'passed':True,'released_at':datetime.datetime.now().astimezone().isoformat(),'brand':'开饭小怪','source_sha256':source_hash,'recipes':454,'unique_covers':454,'formal_resource_bytes_match':len(formal)-1,'compiler_icon':{'source_size':1024,'packaged_size':512,'mean_channel_error_max':icon_error,'explanation':'Harmony resource compiler scales app icon; bilinear pixel verification within 0.25/255'},'hap':str(out.relative_to(root)),'hap_bytes':out.stat().st_size,'hap_sha256':sha(out),'local_api':health,'native_reports':['native-monster-ux.json','native-monster-auth.json','native-monster-draw.json'],'filter_chips':'No leading checkmark; centered text; selected wax texture retained','forecast_bases':load('work/reports/daily-experience-core.json')['estimate_bases'],'limits':['Unsigned emulator HAP; physical-device signing required','Camera hardware and system reminder delivery not exercised','Forecast costs are recommendations, not live prices','No frame-rate benchmark; native screenshots are static verification']}
(root/'work/reports/monster-release.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps(r,ensure_ascii=False))
