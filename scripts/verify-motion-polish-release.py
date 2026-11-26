"""Bind this iteration's native evidence to its deliverable, without old gates."""
from pathlib import Path
import json,hashlib,zipfile,shutil,datetime,re,io
from PIL import Image,ImageChops,ImageStat
root=Path(__file__).resolve().parent.parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda p:json.loads((root/p).read_text())
src=root/'client/entry/src/main/ets/pages/Index.ets';text=src.read_text();checks=[]
native=load('work/reports/motion-polish-native.json');assert native['passed'] and len(native['checks'])==17;assert native['source_sha256']==sha(src)
checks.append('17 bounded native checks match final Index')
assert len(re.findall(r'^\|\d{2}\|',(root/'docs/motion-polish.md').read_text(),re.M))==30
assert 'iterations:-1' not in text and 'iterations: -1' not in text
assert 'this.pageFade=motion?0.86:1' in text and 'revision!==this.routeRevision' in text
assert 'this.launchVisible=false' in text and 'this.revealHome()' in text
checks.append('30 implemented scope entries; finite/revision-guarded native motion source')
manifest=load('work/artifacts.json')
for f in native['captures']:
 assert (root/f).is_file()
 assert any(x['path']==f and x['kind']=='screenshot' and x['capture_tool']=='hdc snapshot_display' for x in manifest['files'])
checks.append('Actual device screenshot evidence registered')
hap=root/'client/entry/build/default/outputs/default/entry-default-unsigned.hap';resources=root/'client/entry/src/main/resources'
with zipfile.ZipFile(hap) as z:
 assert z.testzip() is None
 app=json.loads(z.read('module.json'))['app'];assert app['versionName']=='0.6.0' and app['versionCode']==12
 abc=z.read('ets/modules.abc');assert b'launchVisible' in abc and b'routeRevision' in abc
 count=0
 for p in list((resources/'base/media').glob('*'))+list((resources/'rawfile').rglob('*')):
  if not p.is_file():continue
  packed=z.read('resources/'+p.relative_to(resources).as_posix())
  if p.name!='app_icon.png':assert packed==p.read_bytes(),str(p)
  else:
   original=Image.open(p).convert('RGBA');compiled=Image.open(io.BytesIO(packed)).convert('RGBA');resized=original.resize(compiled.size,Image.Resampling.BILINEAR)
   for colour in ['#FFF9ED','#DCE9E5','#EADFF2']:
    a=Image.new('RGBA',compiled.size,colour);a.alpha_composite(resized);b=Image.new('RGBA',compiled.size,colour);b.alpha_composite(compiled)
    assert max(ImageStat.Stat(ImageChops.difference(a.convert('RGB'),b.convert('RGB'))).mean)<.5
   assert compiled.getchannel('A').getpixel((0,0))==0
  count+=1
checks.append('HAP 0.6.0/code12 CRC/compiled motion symbols and '+str(count)+' resources checked')
out=root/'outputs/shiku-mvp-unsigned.hap';shutil.copyfile(hap,out);assert sha(hap)==sha(out)
r={'passed':True,'version':'0.6.0(12)','source_sha256':sha(src),'hap_sha256':sha(out),'hap_bytes':out.stat().st_size,'resources_verified':count,'checks':checks,'native_checks':len(native['checks']),'released_at':datetime.datetime.now().astimezone().isoformat(),'limits':['Harmony unsigned HAP requires physical-device signing','No physical-device or frame-rate benchmark','Source-level reduced-motion lifecycle verified by compilation; live native preference toggle not repeated this round','Native short checks only; no long stress stability acceptance']}
(root/'work/reports/motion-polish-release.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False))
