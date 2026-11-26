"""0.6.1 scoped release: fresh presentation checks, explicitly retained business baseline."""
from pathlib import Path
import datetime,hashlib,json,re,subprocess,os,zipfile
root=Path(__file__).resolve().parents[2]
sha=lambda data:hashlib.sha256(data).hexdigest()
bt=Path.home()/'Library/Android/sdk/build-tools/36.0.0'
apk=root/'outputs/kaifan-monster-android-debug.apk'
report={'passed':False,'version':'0.6.1/code13','checked_at':datetime.datetime.now().astimezone().isoformat(),'checks':[],'scope':'Targeted UI release. Prior core/business/full UI reports retained unchanged, not rerun or rebound. No physical Android/frame-rate/stress acceptance.'}
try:
 baseline_path=root/'work/reports/android-v061-baseline.json';baseline=json.loads(baseline_path.read_text())
 for name,expected in baseline['reports'].items():assert sha((root/'work/reports'/name).read_bytes())==expected,'Baseline changed: '+name
 report['checks'].append('Prior0.6.0 core/UI/crypto/pixel/motion/contrast/release reports retained unchanged; not newly executed')
 sig=subprocess.check_output([str(bt/'apksigner'),'verify','--verbose',str(apk)],text=True,env={**os.environ,'JAVA_HOME':'/Applications/Android Studio.app/Contents/jbr/Contents/Home'})
 assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in sig and 'Verified using v3 scheme (APK Signature Scheme v3): true' in sig
 badge=subprocess.check_output([str(bt/'aapt2'),'dump','badging',str(apk)],text=True)
 assert "versionCode='13'" in badge and "versionName='0.6.1'" in badge and "icon='res/drawable/app_icon.png'" in badge
 report['checks'].append('Actual APK signatures,0.6.1/code13 version and formal icon manifest binding verified')
 with zipfile.ZipFile(apk) as z:
  assert z.testzip() is None
  core=z.read('assets/core.js');core_hash=sha(core)
  normalized=re.sub(rb'window\.kaifanBuild=\{[^\n]+\};',b'window.kaifanBuild={};',core)
  assert sha(normalized)==baseline['core_payload_without_build_info_sha256'],'Business payload changed beyond version/reference metadata'
  info=json.loads(re.search(rb'window\.kaifanBuild=(\{[^\n]+\});',core).group(1))
  assert info['versionName']=='0.6.1' and info['versionCode']==13
  assert info['uiReferenceSha256']=='0ef5715a21e9766fa25907571e54a30fe37e3626fcd6742b526af97b12518ca1'
  assert info['uiReferenceSha256']==sha((root/'client/entry/src/main/ets/pages/Index.ets').read_bytes())
  report['checks'].append('Final frozen Index bound; compiled core payload identical to0.6.0 except build metadata')
  web=['index.html','app.js','parity.js','experience.js','daily.js','convenience.js','living.js','search.js','style.css'];hashes={}
  for name in web:
   data=z.read('assets/'+name);assert data==(root/'android/web'/name).read_bytes(),name
   assert data==(root/'android/app/build/generated/assets'/name).read_bytes(),name+' generated';hashes[name]=sha(data)
  changed=[]
  for name,expected in baseline['web_sha256'].items():
   if name.startswith('android/web/'):
    if sha((root/name).read_bytes())!=expected:changed.append(name)
   elif name.startswith('android/app/src/main/java/') or name.startswith('android/app/src/main/res/'):
    assert sha((root/name).read_bytes())==expected,name+' unexpected platform change'
  assert set(changed)=={'android/web/index.html','android/web/app.js','android/web/parity.js','android/web/style.css','android/web/living.js'},changed
  report['checks'].append('All9 packaged web assets match current sources; only5 requested presentation files changed; platform/adapters unchanged')
  media=root/'client/entry/src/main/resources/base/media';files=[p for p in media.rglob('*') if p.is_file()]
  for p in files:assert z.read('assets/media/'+p.relative_to(media).as_posix())==p.read_bytes(),str(p)
  assert z.read('res/drawable/app_icon.png')==(root/'client/AppScope/resources/base/media/app_icon.png').read_bytes()
  assert z.read('assets/fonts/shiku_hand.ttf')==(root/'client/entry/src/main/resources/rawfile/fonts/shiku_hand.ttf').read_bytes()
  assert z.read('assets/licenses/font-OFL.txt')==(root/'art-source/fonts/OFL.txt').read_bytes()
  covers=re.findall(r"case '([^']+)': return \$r\('app.media.([^']+)'\)",(root/'client/entry/src/main/ets/model/RecipeCoverMap.ets').read_text());assert len(covers)==454
  mapping=json.loads(z.read('assets/cover-map.js').decode().removeprefix('window.recipeCovers=').strip().removesuffix(';'));assert mapping=={id:'media/'+resource+'.webp' for id,resource in covers}
  report['checks'].append('All547 formal media,454 cover map entries, original launcher image and licensed font bytes verified')
  report['media_files']=len(files)
 manifest=json.loads((root/'work/reports/android-shared-core.json').read_text());assert len(manifest['sourceHashes'])==32
 for name,expected in manifest['sourceHashes'].items():assert sha((root/'client/entry/src/main/ets/model'/str(name+'.ets')).read_bytes())==expected,name
 report['checks'].append('All32 canonical module source hashes match generated core manifest')
 tests=json.loads((root/'work/reports/android-icon-hearts.json').read_text());assert tests['passed'] and not tests['draft_ui_not_packaged']
 assert tests['generated_core_sha256']==core_hash and tests['web_source_sha256']==hashes
 targeted=tests['icon_hearts'];assert targeted['passed'] and len(targeted['measurements'])==18 and len(targeted['checks'])==4
 assert targeted['test_source_sha256']==sha((root/'scripts/android/check-icon-hearts.cjs').read_bytes())
 report['checks'].append('Fresh18 scoped geometry/search cases and4 interaction groups bound to actual packaged core/web:scroll, independent search, hearts, keyboard, persistence, undo, motion cleanup')
 report.update(passed=True,apk={'path':'outputs/kaifan-monster-android-debug.apk','sha256':sha(apk.read_bytes()),'bytes':apk.stat().st_size,'versionName':'0.6.1','versionCode':13},core_sha256=core_hash,ui_reference=info['uiReferenceSha256'],web_sha256=hashes,baseline_report='work/reports/android-v061-baseline.json',baseline_report_sha256=sha(baseline_path.read_bytes()),targeted_report='work/reports/android-icon-hearts.json',full_business_rerun=False,retained_baseline_verified=True)
 print('PASS scoped release:',len(report['checks']),'groups',report['apk'])
finally:
 (root/'work/reports/android-icon-hearts-release.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
