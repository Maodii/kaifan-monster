"""Independent final APK payload and evidence binding for the motion iteration."""
from pathlib import Path
import json,hashlib,zipfile,re,datetime
root=Path(__file__).resolve().parent.parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda p:json.loads((root/p).read_text())
h=load('work/reports/motion-polish-release.json');a=load('work/reports/android-release.json');shared=load('work/reports/android-shared-core.json');checks=[]
assert h['passed'] and a['passed'];assert a['apk']['versionName']=='0.6.0' and a['apk']['versionCode']==12
index=sha(root/'client/entry/src/main/ets/pages/Index.ets');assert index==h['source_sha256']==a['ui_reference']['sha256']
assert sha(root/'outputs/shiku-mvp-unsigned.hap')==h['hap_sha256'];apk=root/a['apk']['path'];assert sha(apk)==a['apk']['sha256']
assert len(shared['sourceHashes'])==32
for name,value in shared['sourceHashes'].items():assert sha(root/'client/entry/src/main/ets/model'/str(name+'.ets'))==value,name
for path,value in a['source_hashes'].items():assert sha(root/path)==value,path
checks.append('Both0.6.0/code12 packages bound to frozen Index and32 shared modules')
with zipfile.ZipFile(apk) as z:
 assert z.testzip() is None
 core=z.read('assets/core.js');core_hash=hashlib.sha256(core).hexdigest()
 info=json.loads(re.search(r'window\.kaifanBuild=(\{[^\n]+\});',core.decode()).group(1));assert info['versionName']=='0.6.0' and info['versionCode']==12 and info['uiReferenceSha256']==index
 web={}
 for p in (root/'android/web').glob('*'):
  if not p.is_file():continue
  assert z.read('assets/'+p.name)==p.read_bytes(),p.name
  web['android/web/'+p.name]=sha(p)
 media=list((root/'client/entry/src/main/resources/base/media').rglob('*'))
 for p in media:
  if p.is_file():assert z.read('assets/media/'+p.relative_to(root/'client/entry/src/main/resources/base/media').as_posix())==p.read_bytes(),p.name
 assert core==(root/'android/app/build/generated/assets/core.js').read_bytes()
checks.append('Independent APK CRC, web payload, generated core and all formal media bytes verified')
ui=load('work/reports/android-ui-tests.json');motion=load('work/reports/android-motion.json')
for r in [ui,motion]:
 assert r['passed'] and r['generated_core_sha256']==core_hash
 for path,value in r['web_source_sha256'].items():assert web[path if path.startswith('android/web/') else 'android/web/'+path]==value,path
assert len(ui['checks'])==59 and ui['responsive']['passed'] and len(ui['responsive']['measurements'])==504
assert not any(m['failures'] for m in ui['responsive']['measurements'])
checks.append('Fresh59 UI groups and504 responsive cases plus motion report bound to actual packaged web/core')
r={'passed':True,'version':'0.6.0(12)','verified_at':datetime.datetime.now().astimezone().isoformat(),'source_sha256':index,'hap_sha256':h['hap_sha256'],'apk_sha256':sha(apk),'core_sha256':core_hash,'web_files':len(web),'media_files':sum(p.is_file() for p in media),'checks':checks,'native_checks':h['native_checks'],'android_ui_groups':59,'android_responsive_cases':504,'limits':['Harmony existing emulator verification only; Android headless host verification, not physical WebView','No frame-rate or long stress stability acceptance','Harmony HAP unsigned; Android debug APK']}
(root/'work/reports/motion-polish-dual-release.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False))
