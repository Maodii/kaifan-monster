"""Verify current package/source evidence; does not assert native device acceptance."""
from pathlib import Path
import hashlib,json,datetime
root=Path(__file__).resolve().parent.parent
load=lambda name:json.loads((root/name).read_text())
sha=lambda name:hashlib.sha256((root/name).read_bytes()).hexdigest()
harmony=load('work/reports/next10-release.json');android=load('work/reports/android-release.json');shared=load('work/reports/android-shared-core.json')
assert harmony['packageVerified'] and android['passed']
assert android['apk']['versionName']==harmony['versionName']=='0.3.0'
assert android['apk']['versionCode']==harmony['versionCode']==5
assert len(shared['sourceHashes'])==31
assert android.get('media_files_verified',0)>=543
assert sha(harmony['hap'])==harmony['hap_sha256']
assert sha(android['apk']['path'])==android['apk']['sha256']
assert sha('client/entry/src/main/ets/pages/Index.ets')==harmony['source_sha256']==android['ui_reference']['sha256']
for name,expected in shared['sourceHashes'].items():assert sha('client/entry/src/main/ets/model/'+name+'.ets')==expected,name
for name,expected in android['source_hashes'].items():assert sha(name)==expected,name
counts={}
for name in ['android-core-tests','android-next20-tests','android-next10-tests','android-ui-tests']:
 report=load('work/reports/'+name+'.json');assert report['passed'];counts[name]=len(report['checks'])
report={'passed':True,'checkedAt':datetime.datetime.now().astimezone().isoformat(),'harmony':{'path':harmony['hap'],'sha256':harmony['hap_sha256']},'android':android['apk'],'shared_source_modules':len(shared['sourceHashes']),'current_reference_matches':True,'harmony_regression_suites':harmony['regression_suites'],'android_host_groups':counts,'nativeDeviceVerified':False,'fullVisualParityVerified':False,'limits':['Native device installation/offline restart/camera/notifications/widgets/performance pending','Harmony unsigned HAP requires device signing','Android hybrid UI with native adapters; shared business source does not prove identical visuals']}
(root/'work/reports/next10-dual-release.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
