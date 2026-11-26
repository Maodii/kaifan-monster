"""Verify transparent enlarged branding and actual compact native layout before replacing HAP."""
from pathlib import Path
import json,hashlib,zipfile,io,shutil,datetime
from PIL import Image,ImageChops,ImageStat
root=Path(__file__).resolve().parent.parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda p:json.loads((root/p).read_text())
source=root/'client/entry/build/default/outputs/default/entry-default-unsigned.hap'
resources=root/'client/entry/src/main/resources'
native=load('work/reports/native-gesture-motion.json');assert native['passed']
assert native['source_sha256']==sha(root/'client/entry/src/main/ets/pages/Index.ets')
for report in ['native-gesture-navigation','native-gesture-reduced-motion']:
 check=load('work/reports/'+report+'.json');assert check['passed'],report;assert check['source_sha256']==native['source_sha256'],report

art=load('work/reports/launch-brand.json');assert art['passed']
for f in art['formal_files']:
 p=root/f['path'];assert sha(p)==f['sha256'];im=Image.open(p).convert('RGBA');a=im.getchannel('A');box=a.point(lambda a:255 if a>20 else 0).getbbox();assert (box[2]-box[0])/im.width>.85
 assert all(a.getpixel(xy)==0 for xy in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)])
with zipfile.ZipFile(source) as z:
 formal=[p for p in list((resources/'base/media').glob('*'))+list((resources/'rawfile').rglob('*')) if p.is_file()]
 for p in formal:
  packed=z.read('resources/'+p.relative_to(resources).as_posix())
  if p.name!='app_icon.png':assert packed==p.read_bytes(),str(p)
  else:
   original=Image.open(p).convert('RGBA');compiled=Image.open(io.BytesIO(packed)).convert('RGBA');assert compiled.size==(512,512)
   resized=original.resize(compiled.size,Image.Resampling.BILINEAR)
   errors=[]
   for color in ['#FFF9ED','#DCE9E5','#EADFF2']:
    a=Image.new('RGBA',compiled.size,color);a.alpha_composite(resized)
    b=Image.new('RGBA',compiled.size,color);b.alpha_composite(compiled)
    errors.append(max(ImageStat.Stat(ImageChops.difference(a.convert('RGB'),b.convert('RGB'))).mean))
   assert max(errors)<.5,errors
   assert compiled.getchannel('A').getpixel((0,0))==0
cover=load('art-source/recipe-covers/manifest.json')['files'];assert len(cover)==454 and len({f['recipeId'] for f in cover})==454
for f in cover:assert sha(root/f['path'])==f['sha256']
assert len({f['sha256'] for f in cover})==454
assert (root/'backend/data/recipes.json').read_bytes()==(resources/'rawfile/recipes.json').read_bytes()
assert (root/'client/AppScope/resources/base/media/app_icon.png').read_bytes()==(resources/'base/media/app_icon.png').read_bytes()
module=(root/'client/entry/src/main/module.json5').read_text();assert '"startWindowIcon": "$media:brand_monster"' in module
out=root/'outputs/shiku-mvp-unsigned.hap';shutil.copyfile(source,out)
r={'passed':True,'released_at':datetime.datetime.now().astimezone().isoformat(),'hap':str(out.relative_to(root)),'hap_sha256':sha(out),'hap_bytes':out.stat().st_size,'source_sha256':native['source_sha256'],'formal_resources_verified':len(formal),'unique_covers':454,'compiled_icon_composite_errors':errors,'changes':['Bidirectional main-tab swipes with retained scroll position','Native child gesture priority for calendar and horizontal scrollers','Calendar week/month swipes','Left-side drag return with cancel rebound','Cooking step swipes','Retap tab and double-tap title scroll to top','Press feedback and directional page transitions','Search clear control'],'native_report':'work/reports/native-gesture-motion.json','limits':['Unsigned emulator HAP; device signing required','No frame-rate benchmark','Prior discovery and launch reports cover prior source; no full new regression claimed']}
(root/'work/reports/gesture-motion-release.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False))
