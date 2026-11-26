"""Independent0.6.1 payload/evidence binding, retaining old business reports as baseline."""
from pathlib import Path
import zipfile,json,hashlib,re,datetime
root=Path(__file__).resolve().parent.parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda p:json.loads((root/p).read_text())
h=load('work/reports/search-heart-release.json');a=load('work/reports/android-icon-hearts-release.json');t=load('work/reports/android-icon-hearts.json');shared=load('work/reports/android-shared-core.json')
assert h['passed'] and a['passed'] and t['passed'];assert a['apk']['versionName']=='0.6.1' and a['apk']['versionCode']==13
idx=sha(root/'client/entry/src/main/ets/pages/Index.ets');assert idx==h['source_sha256']==a['ui_reference']
assert sha(root/'outputs/shiku-mvp-unsigned.hap')==h['hap_sha256'];apk=root/a['apk']['path'];assert sha(apk)==a['apk']['sha256']
for path,value in a['web_sha256'].items():assert sha(root/'android/web'/path)==value,path
assert len(shared['sourceHashes'])==32
for name,value in shared['sourceHashes'].items():assert sha(root/'client/entry/src/main/ets/model'/str(name+'.ets'))==value,name
with zipfile.ZipFile(apk) as z:
 assert z.testzip() is None
 core=z.read('assets/core.js');ch=hashlib.sha256(core).hexdigest();assert t['generated_core_sha256']==ch
 info=json.loads(re.search(r'window\.kaifanBuild=(\{[^\n]+\});',core.decode()).group(1));assert info['versionName']=='0.6.1' and info['versionCode']==13 and info['uiReferenceSha256']==idx
 web={}
 for p in (root/'android/web').glob('*'):
  if p.is_file():assert z.read('assets/'+p.name)==p.read_bytes(),p.name;web[p.name]=sha(p)
 for path,value in t['web_source_sha256'].items():assert web[path.removeprefix('android/web/')]==value,path
 media=[p for p in (root/'client/entry/src/main/resources/base/media').rglob('*') if p.is_file()]
 for p in media:assert z.read('assets/media/'+p.relative_to(root/'client/entry/src/main/resources/base/media').as_posix())==p.read_bytes(),p.name
r={'passed':True,'version':'0.6.1(13)','verified_at':datetime.datetime.now().astimezone().isoformat(),'index_sha256':idx,'hap_sha256':h['hap_sha256'],'apk_sha256':sha(apk),'core_sha256':ch,'web_files':len(web),'media_files':len(media),'native_checks':h['native_checks'],'android_targeted_report':'work/reports/android-icon-hearts.json','checks':['Both version and source bindings','APK CRC and byte-for-byte web/media payload','32 canonical shared modules and freshly tested presentation hashes'],'limits':['Targeted native emulator and Android host tests, not physical-device acceptance','Old0.6.0 business reports remain baseline, not rebound']}
(root/'work/reports/search-heart-dual-release.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False))
