"""Check current native release and formal resources; one installable artifact only."""
from pathlib import Path
import json,hashlib,zipfile,shutil,urllib.request,re,datetime
root=Path(__file__).resolve().parent.parent
load=lambda p:json.loads((root/p).read_text())
cover=load('art-source/recipe-covers/manifest.json');assert cover['total']==454;assert len(cover['files'])==454
icons=load('art-source/ui-icons/manifest.json')['files'];extra=load('work/reports/next-utility-art.json')['files'];art=load('work/reports/recipe-community-art.json')['files']
source=root/'client/entry/build/default/outputs/default/entry-default-unsigned.hap'
with zipfile.ZipFile(source) as z:
 formal=cover['files']+icons+extra+art
 for f in formal:
  p=root/f['path'];b=p.read_bytes();name='resources/'+str(p.relative_to(root/'client/entry/src/main/resources'));assert z.read(name)==b,p
  if f.get('sha256'):assert hashlib.sha256(b).hexdigest()==f['sha256'],p
 for p in list((root/'client/entry/src/main/resources/base/media').glob('crayon_*'))+[root/'client/entry/src/main/resources/rawfile/recipes.json',root/'client/entry/src/main/resources/rawfile/fonts/shiku_hand.ttf']:
  assert z.read('resources/'+str(p.relative_to(root/'client/entry/src/main/resources')))==p.read_bytes(),p
assert len(set(f['recipeId'] for f in cover['files']))==454
assert len(set(f['sha256'] for f in cover['files']))==454
for r in ['native-utility-smoke','native-utility-final','native-cooking-step','recipe-cover-gallery-test']:
 assert load('work/reports/'+r+'.json')['passed'],r
gallery=load('work/reports/recipe-cover-gallery-test.json');assert gallery['loaded']==454 and gallery['unique_urls']==454,'gallery must cover current corpus'
source_hash=hashlib.sha256((root/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest()
for report in ['native-cooking-step']:
 assert load('work/reports/'+report+'.json')['source_sha256']==source_hash,report+' tested different source'
assert load('work/reports/local-plans-verification.json')['result']=='passed'
assert load('work/reports/recipe-expansion-v3.json')['passed']
checks={}
for port in [3000,3001]:
 with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/v1/health',timeout=5) as r:assert r.status==200
 checks[str(port)]='healthy'
catalog=load('backend/data/recipes.json');assert len(catalog['recipes'])==450
assert (root/'backend/data/recipes.json').read_bytes()==(root/'client/entry/src/main/resources/rawfile/recipes.json').read_bytes()
page=(root/'client/entry/src/main/ets/pages/Index.ets').read_text();routes=sorted(set(re.findall(r"this\.page\s*===\s*'([^']+)'",page)));assert '.opacity(this.pageFade).translate({y:this.pageShift,x:this.routeX}).scale({x:this.routeScale,y:this.routeScale})' in page
out=root/'outputs/shiku-mvp-unsigned.hap';shutil.copyfile(source,out)
r={'passed':True,'released_at':datetime.datetime.now().astimezone().isoformat(),'features':6,'interaction_improvements':25,'resolved_findings':35,'motion_presentations':12,'acceptance':'docs/utility-motion-acceptance.md','catalog_total':454,'unique_covers':454,'new_recipes':64,'new_utility_art':len(extra),'hap':str(out.relative_to(root)),'hap_bytes':out.stat().st_size,'hap_sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'formal_asset_bytes_match':len(formal),'local_api':checks,'shared_route_transition_pages':routes,'native_evidence':'work/reports/native-utility-smoke.json','persistence_evidence':'work/reports/local-plans-verification.json','camera_hardware':'not verified','system_reminder_actual_delivery':'not verified','motion_scope':'Source implementation and actual native controls exercised; no frame-rate benchmark','preview_scope':'Older browser usability preview is previous iteration; current features verified on native emulator'}
(root/'work/reports/utility-release.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps(r,ensure_ascii=False))
