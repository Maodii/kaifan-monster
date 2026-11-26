"""Verify compact search/card heart native iteration and replace the single HAP."""
from pathlib import Path
import json,hashlib,zipfile,shutil,datetime
root=Path(__file__).resolve().parent.parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
src=root/'client/entry/src/main/ets/pages/Index.ets';native=json.loads((root/'work/reports/search-hub-native.json').read_text());assert native['passed'] and len(native['checks'])==8 and native['source_sha256']==sha(src)
assert 'BUILD SUCCESSFUL' in (root/'work/reports/search-hub-build.log').read_text()
hap=root/'client/entry/build/default/outputs/default/entry-default-unsigned.hap';out=root/'outputs/shiku-mvp-unsigned.hap';resources=root/'client/entry/src/main/resources'
assert all(p.stat().st_mtime<=hap.stat().st_mtime for p in (root/'client/entry/src/main').rglob('*') if p.is_file())
with zipfile.ZipFile(out) as old:old_icon=old.read('resources/base/media/app_icon.png')
count=0
with zipfile.ZipFile(hap) as z:
 assert z.testzip() is None
 app=json.loads(z.read('module.json'))['app'];assert app['versionName']=='0.6.2' and app['versionCode']==14
 for p in list((resources/'base/media').glob('*'))+list((resources/'rawfile').rglob('*')):
  if not p.is_file():continue
  data=z.read('resources/'+p.relative_to(resources).as_posix());assert data==(old_icon if p.name=='app_icon.png' else p.read_bytes()),p;count+=1
 assert b'recipe-card-heart-' in z.read('ets/modules.abc')
shutil.copyfile(hap,out)
r={'passed':True,'version':'0.6.2(14)','source_sha256':sha(src),'hap_sha256':sha(out),'hap_bytes':out.stat().st_size,'resources_verified':count,'native_checks':8,'verified_at':datetime.datetime.now().astimezone().isoformat(),'limits':native['limits']+['HAP unsigned; no new full-business regression for presentation-only changes']}
(root/'work/reports/search-hub-release.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False))
