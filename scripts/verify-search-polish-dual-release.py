"""Verify current package/source evidence; does not assert native device acceptance."""
from pathlib import Path
import hashlib,json,datetime,re,argparse,zipfile
parser=argparse.ArgumentParser();parser.add_argument('--iteration',default='search-polish');parser.add_argument('--version',default='0.4.1');parser.add_argument('--code',type=int,default=7);args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
load=lambda name:json.loads((root/name).read_text())
sha=lambda name:hashlib.sha256((root/name).read_bytes()).hexdigest()
harmony=load('work/reports/'+args.iteration+'-release.json');android=load('work/reports/android-release.json');shared=load('work/reports/android-shared-core.json')
assert harmony['packageVerified'] and android['passed']
assert android['apk']['versionName']==harmony['versionName']==args.version
assert android['apk']['versionCode']==harmony['versionCode']==args.code
assert len(shared['sourceHashes'])==32
assert android.get('media_files_verified',0)>=543
assert sha(harmony['hap'])==harmony['hap_sha256']
assert sha(android['apk']['path'])==android['apk']['sha256']
assert sha('client/entry/src/main/ets/pages/Index.ets')==harmony['source_sha256']==android['ui_reference']['sha256']
for name,expected in shared['sourceHashes'].items():assert sha('client/entry/src/main/ets/model/'+name+'.ets')==expected,name
for name,expected in android['source_hashes'].items():assert sha(name)==expected,name
crypto=load('work/reports/android-backup-crypto-tests.json')
assert crypto['native_source_sha256']==sha('android/app/src/main/java/com/kaifan/monster/BackupCrypto.java')
assert re.search(r'encrypted\s*:\s*true',(root/'android/web/living.js').read_text()),'Android encrypted backup must default on'
assert 'backupEncrypted:boolean=true' in (root/'client/entry/src/main/ets/pages/Index.ets').read_text().replace(' ',''),'Harmony encrypted backup must default on'
evidence_core_sha256=sha('android/app/build/generated/assets/core.js')
if args.iteration == 'pixel-polish':
 with zipfile.ZipFile(root/android['apk']['path']) as packed:
  assert hashlib.sha256(packed.read('assets/core.js')).hexdigest()==evidence_core_sha256
  for name in android['source_hashes']:
   if name.startswith('android/web/'):
    asset='assets/'+name.removeprefix('android/web/')
    assert packed.read(asset)==(root/name).read_bytes(),name+' package content mismatch'
  for color in ['honey','lilac','sage']:
   asset='media/crayon_ribbon_'+color+'.png'
   assert packed.read('assets/'+asset)==(root/'client/entry/src/main/resources/base'/asset).read_bytes()
retained=False
if args.iteration=='search-strip':
 proof=load('work/reports/android-compact-evidence.json')
 with zipfile.ZipFile(root/android['apk']['path']) as packed:
  code=packed.read('assets/core.js');assert hashlib.sha256(code).hexdigest()==evidence_core_sha256==proof['current_core_sha256']
  line=re.search(rb'window\.kaifanBuild=\{[^\n]+\};',code).group();assert code.count(line)==1
  old_code=code.replace(line,proof['previous_build_line'].encode());assert hashlib.sha256(old_code).hexdigest()==proof['previous_core_sha256']
  style=packed.read('assets/style.css');suffix=proof['css_append'].encode();assert style.endswith(suffix) and hashlib.sha256(style[:-len(suffix)]).hexdigest()==proof['previous_style_sha256']
  for name,expected in proof['previous_ui_web_hashes'].items():
   if name!='style.css':assert hashlib.sha256(packed.read('assets/'+name)).hexdigest()==expected
 for name,expected in proof['previous_native_source_hashes'].items():assert sha(name)==expected
 targeted=load('work/reports/android-compact-search-tests.json');assert targeted['passed'] and targeted['generated_core_sha256']==evidence_core_sha256
 assert len(targeted['compact_search']['measurements'])==12 and targeted['compact_search']['passed']
 assert targeted['compact_search']['test_source_sha256']==sha('scripts/android/check-compact-search.cjs')
 evidence_core_sha256=proof['previous_core_sha256'];retained=True
counts={}
for name in ['android-core-tests','android-next20-tests','android-next10-tests','android-living-tests','android-ui-tests','android-backup-crypto-tests']:
 report=load('work/reports/'+name+'.json');assert report['passed'];counts[name]=len(report['checks'])
 if report.get('generated_core_sha256'):assert report['generated_core_sha256']==evidence_core_sha256,name+' core changed after test'
report={'passed':True,'checkedAt':datetime.datetime.now().astimezone().isoformat(),'harmony':{'path':harmony['hap'],'sha256':harmony['hap_sha256']},'android':android['apk'],'shared_source_modules':len(shared['sourceHashes']),'current_reference_matches':True,'harmony_regression_suites':harmony['regression_suites'],'android_host_groups':counts,'android_prior_groups_retained_not_rerun':retained,'nativeDeviceVerified':False,'fullVisualParityVerified':False,'limits':['Native device installation/offline restart/camera/notifications/widgets/performance pending','Harmony unsigned HAP requires device signing','Android hybrid UI with native adapters; shared business source does not prove identical visuals']}
if args.iteration == 'pixel-polish':
 report.update(harmony_business_baseline_reused=True, harmony_emulator_navigation_verified=harmony.get('emulatorVerified',False), harmony_stability_accepted=harmony.get('stabilityAccepted',False), harmony_native_reports=harmony.get('native_reports',[]))
 report['limits'][0]='Physical-device camera/notifications/widgets/performance pending; Harmony emulator navigation measured, long stress interrupted by conservative host RSS guard; Android host UI is not a device test'
(root/('work/reports/'+args.iteration+'-dual-release.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
