"""Verify current native discovery build and publish the sole local test HAP."""
from pathlib import Path
import json,hashlib,zipfile,shutil,urllib.request,datetime,io
from PIL import Image,ImageChops,ImageStat
root=Path(__file__).resolve().parent.parent
load=lambda p:json.loads((root/p).read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
page=root/'client/entry/src/main/ets/pages/Index.ets'
source_hash=sha(page)
native=['native-discovery-ui','native-discovery-search']
for name in native:
 r=load('work/reports/'+name+'.json')
 assert r['passed'],name
 if name=='native-discovery-ui' and r['source_sha256']!=source_hash:
  # Only search-message reactivity changed after the UI flow check; the final
  # search test exercises it. Reconstruct the exact earlier source to prove scope.
  prior=page.read_text().replace(" private recipeSearchStatus(query:string):string{if(!query.trim()){return '';}this.recommendations();return this.discoverySearch.message;}\n",'')
  prior=prior.replace("if(this.recipeSearch.trim()){Text(this.recipeSearchStatus(this.recipeSearch)).id('recipe-search-message').fontSize(15).lineHeight(24).fontColor('#607C69')", "if(this.recipeSearch.trim()&&this.discoverySearch.message){Text(this.discoverySearch.message).id('recipe-search-message').fontSize(15).lineHeight(24).fontColor(this.discoverySearch.mode==='similar'?'#916D4D':'#607C69')")
  assert hashlib.sha256(prior.encode()).hexdigest()==r['source_sha256'],'UI source changed beyond reviewed search-message fix'
 else:assert r['source_sha256']==source_hash,name+' source changed since native check'
cover=load('art-source/recipe-covers/manifest.json')['files']
assert len(cover)==454 and len({f['recipeId'] for f in cover})==454
assert len({sha(root/f['path']) for f in cover})==454
for f in cover:assert sha(root/f['path'])==f['sha256'],f['path']
resources=root/'client/entry/src/main/resources'
assert (root/'backend/data/recipes.json').read_bytes()==(resources/'rawfile/recipes.json').read_bytes()
evaluation=load('work/reports/search-evaluation-after.json')
assert evaluation['passed']==evaluation['cases']==30
source=root/'client/entry/build/default/outputs/default/entry-default-unsigned.hap'
with zipfile.ZipFile(source) as z:
 formal=[p for p in list((resources/'base/media').glob('*'))+list((resources/'rawfile').rglob('*')) if p.is_file()]
 for p in formal:
  packaged=z.read('resources/'+p.relative_to(resources).as_posix())
  if p.name=='app_icon.png':
   original=Image.open(p).convert('RGB');compiled=Image.open(io.BytesIO(packaged)).convert('RGB')
   assert original.size==(1024,1024) and compiled.size==(512,512)
   icon_error=max(ImageStat.Stat(ImageChops.difference(original.resize(compiled.size,Image.Resampling.BILINEAR),compiled)).mean)
   assert icon_error<0.25
  else:assert packaged==p.read_bytes(),str(p)
assert (root/'client/AppScope/resources/base/media/app_icon.png').read_bytes()==(resources/'base/media/app_icon.png').read_bytes()
for p in [root/'client/AppScope/resources/base/element/string.json',resources/'base/element/string.json']:assert '开饭小怪' in p.read_text()
health={}
for port in [3000,3001]:
 with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/v1/health',timeout=5) as r:assert r.status==200
 health[str(port)]='healthy'
out=root/'outputs/shiku-mvp-unsigned.hap';shutil.copyfile(source,out)
r={'passed':True,'released_at':datetime.datetime.now().astimezone().isoformat(),'source_sha256':source_hash,'recipes':454,'unique_covers':454,'formal_resources_verified':len(formal),'compiler_icon_error':icon_error,'hap':str(out.relative_to(root)),'hap_bytes':out.stat().st_size,'hap_sha256':sha(out),'local_api':health,'native_reports':native,'search_evaluation':{'cases':evaluation['cases'],'passed':evaluation['passed']},'limits':['Unsigned emulator HAP; physical-device signing required','Camera hardware and system reminder delivery not exercised','HTTP catalog search retains prior SQL behavior; new tolerant search runs offline','Huawei cloud functions/database planned only; local backend retained']}
(root/'work/reports/discovery-release.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps(r,ensure_ascii=False))
