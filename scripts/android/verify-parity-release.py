#!/usr/bin/env python3
"""Verify the current Android package and evidence, without historical version constants."""
import hashlib,json,os,re,subprocess,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
APK=ROOT/'outputs/kaifan-monster-android-debug.apk'
BT=Path.home()/'Library/Android/sdk/build-tools/36.0.0'
def sha(b):return hashlib.sha256(b).hexdigest()
report={'passed':False,'checks':[]}
try:
 manifest=(ROOT/'android/app/src/main/AndroidManifest.xml').read_text()
 version=re.search(r'android:versionName="([^"]+)"',manifest)[1]
 code=int(re.search(r'android:versionCode="(\d+)"',manifest)[1])
 env={**os.environ,'JAVA_HOME':'/Applications/Android Studio.app/Contents/jbr/Contents/Home'}
 sig=subprocess.check_output([str(BT/'apksigner'),'verify','--verbose',str(APK)],text=True,env=env)
 assert all(f'Verified using {v} scheme (APK Signature Scheme {v}): true' in sig for v in ['v2','v3'])
 badge=subprocess.check_output([str(BT/'aapt2'),'dump','badging',str(APK)],text=True)
 assert f"versionName='{version}'" in badge and f"versionCode='{code}'" in badge
 report['checks'].append('Actual manifest version and APK v2/v3 signatures match')
 with zipfile.ZipFile(APK) as z:
  assert z.testzip() is None
  files=[f for f in (ROOT/'android/web').glob('*.js') if f.stem not in ['Platform','Vault','EncryptedBackup']]+[ROOT/'android/web/index.html',ROOT/'android/web/style.css']
  hashes={}
  for f in files:
   assert z.read('assets/'+f.name)==f.read_bytes(),f.name
   hashes[f.name]=sha(f.read_bytes())
  core=z.read('assets/core.js')
  assert core==(ROOT/'android/app/build/generated/assets/core.js').read_bytes()
  core_report=json.loads((ROOT/'work/reports/android-shared-core.json').read_text())
  for name,h in core_report['sourceHashes'].items():
   assert sha((ROOT/'client/entry/src/main/ets/model'/f'{name}.ets').read_bytes())==h,name
  report['checks'].append('All current Android UI files and canonical shared modules match package')
  media=list((ROOT/'client/entry/src/main/resources/base/media').glob('*'))
  for f in media:
   if f.is_file():assert z.read('assets/media/'+f.name)==f.read_bytes(),f.name
  assert z.read('res/drawable/app_icon.png')==(ROOT/'client/AppScope/resources/base/media/app_icon.png').read_bytes()
  assert z.read('assets/fonts/shiku_hand.ttf')==(ROOT/'client/entry/src/main/resources/rawfile/fonts/shiku_hand.ttf').read_bytes()
  assert not any(n.startswith('assets/lobby/') for n in z.namelist()),'suspended 3D bundle included'
  assert not (ROOT/'android/app/build/generated/assets/lobby').exists()
  report['checks'].append('Canonical food art, launcher and font retained; suspended 3D assets excluded')
  for name in ['assistant-ui.json','assistant-client-core.json','android-parity-input.json','android-core-tests.json']:
   r=json.loads((ROOT/'work/reports'/name).read_text());assert r['passed'],name
   assert r['generated_core_sha256']==sha(core),name+' stale core'
   for f,h in r.get('web_source_sha256',{}).items():assert h==sha(z.read('assets/'+f)),name+' stale '+f
  report['checks'].append('AI/social rollout UI, targeted input and core regression evidence binds to this package')
 report.update(passed=True,version=version,version_code=code,bytes=APK.stat().st_size,sha256=sha(APK.read_bytes()),web_source_sha256=hashes,
  native_source_sha256={str(f.relative_to(ROOT)):sha(f.read_bytes()) for f in (ROOT/'android/app/src/main/java').rglob('*.java')},
  device_acceptance='Not completed in this release: native Android device workflows have not been exercised',
  limits=['Debug signature only','No physical-device camera, OEM alarm or GPU acceptance','Device runtime acceptance remains separate from successful public HTTPS backend tests'])
except Exception as e:
 report['error']=str(e)
 raise
finally:
 (ROOT/'work/reports/android-parity-release.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'passed':report['passed'],'checks':report['checks']},ensure_ascii=False))
