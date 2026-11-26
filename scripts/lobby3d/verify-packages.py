"""Verify actual current dual-client package payloads; does not imply device or aesthetic acceptance."""
from pathlib import Path
import json,hashlib,zipfile,struct,subprocess,os,re,datetime
ROOT=Path(__file__).resolve().parents[2];os.chdir(ROOT)
sha=lambda b:hashlib.sha256(b).hexdigest()
raw=ROOT/'client/entry/src/main/resources/rawfile/lobby';files=[p for p in raw.rglob('*') if p.is_file()]
report={'passed':False,'checked_at':datetime.datetime.now().astimezone().isoformat(),'checks':[],'limits':['Headless browser / compile and byte-level packaging verification; no physical-device GPU or permission acceptance','Harmony HAP unsigned; production signing not configured','Art refinement/time requirement recorded separately; package verification does not certify aesthetic completion']}
try:
 expected=json.loads((ROOT/'client/AppScope/app.json5').read_text())['app'];assert expected['versionName']=='0.7.0' and expected['versionCode']==15
 for f in (raw/'models').glob('*.glb'):
  b=f.read_bytes();assert struct.unpack_from('<I',b,8)[0]==len(b);n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);assert 'EXT_meshopt_compression' in j['extensionsRequired']
  for im in j['images']:
   assert 'bufferView' not in im and im['uri'].startswith('../textures/');texture=(f.parent/im['uri']).resolve();assert texture.is_relative_to(raw) and texture.is_file()
   assert texture.stem==sha(texture.read_bytes())[:24]
 report['checks'].append('All five meshopt GLB headers and content-hash-bound external texture references valid')
 compression=json.loads((ROOT/'work/reports/lobby3d-model-compression.json').read_text())
 previews=json.loads((ROOT/'work/reports/lobby3d-cycles-previews.json').read_text())
 assert previews['status']=='complete' and previews['source_sha256']==sha((ROOT/'art-source/lobby3d/detailed-spaces.blend').read_bytes()),'Stale preview source'
 for name in ['meals','kitchen','pantry','community','profile']:
  assert compression[name]['sourceHash']==sha((ROOT/f'prototypes/3d-lobby/assets/{name}.glb').read_bytes()),'Stale compressed model '+name
  preview=next(v for v in previews['renders'] if v['view']==name+'-full')
  assert (raw/f'previews/{name}.png').read_bytes()==(ROOT/preview['path']).read_bytes(),'Stale offline preview '+name
 report['checks'].append('Five packaged model source hashes and all offline preview images match the current editable scene revision')

 apk=ROOT/'outputs/kaifan-monster-android-debug.apk';hap=ROOT/'outputs/shiku-mvp-unsigned.hap'
 bt=Path.home()/'Library/Android/sdk/build-tools/36.0.0';env={**os.environ,'JAVA_HOME':'/Applications/Android Studio.app/Contents/jbr/Contents/Home'}
 signature=subprocess.check_output([str(bt/'apksigner'),'verify','--verbose',str(apk)],text=True,env=env);assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in signature and 'Verified using v3 scheme (APK Signature Scheme v3): true' in signature
 badging=subprocess.check_output([str(bt/'aapt2'),'dump','badging',str(apk)],text=True);assert "versionCode='15'" in badging and "versionName='0.7.0'" in badging
 with zipfile.ZipFile(apk) as a,zipfile.ZipFile(hap) as h:
  assert a.testzip() is None and h.testzip() is None
  app=json.loads(h.read('module.json'))['app'];assert app['versionCode']==15 and app['versionName']=='0.7.0'
  for p in files:
   rel=p.relative_to(raw).as_posix();assert a.read('assets/lobby/'+rel)==p.read_bytes(),rel+' APK stale';assert h.read('resources/rawfile/lobby/'+rel)==p.read_bytes(),rel+' HAP stale'
  web=list((ROOT/'android/web').glob('*'))
  for p in web:
   if p.is_file():assert a.read('assets/'+p.name)==p.read_bytes(),p.name
  build=json.loads(re.search(r'window\.kaifanBuild=(\{[^\n]+\});',a.read('assets/core.js').decode()).group(1));assert build['versionCode']==15 and build['versionName']=='0.7.0';assert build['uiReferenceSha256']==sha((ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes())
  assert '__modules["LobbyCore"]' in a.read('assets/core.js').decode()
 report['checks'].append('Actual0.7.0/code15 manifests, current Android web sources and every shared lobby asset match both packages byte for byte')
 integration=json.loads((ROOT/'work/reports/lobby3d-native-integration.json').read_text());assert integration['passed']
 for p,value in integration['sourceHashes'].items():assert sha((ROOT/p).read_bytes())==value,'Stale integration evidence: '+p
 report['checks'].append('Current integration evidence source hashes bound to final package sources')
 harmony=json.loads((ROOT/'work/reports/lobby3d-harmony-device.json').read_text())
 assert harmony['passed'] and len(harmony['checks'])==24,'Missing current Harmony route evidence'
 assert harmony['hap_sha256']==sha(hap.read_bytes()),'Harmony evidence belongs to an older HAP'
 inspection=json.loads((ROOT/'work/reports/lobby3d-runtime-model-review.json').read_text())
 assert inspection['status']=='complete' and len(inspection['views'])==55,'Missing component material inspection'
 for p,value in inspection['sourceHashes'].items():assert sha((ROOT/p).read_bytes())==value,'Stale model inspection '+p
 report['checks'].append('Current installed Harmony24-check evidence and55 runtime component inspections match final sources')
 report.update(passed=True,version='0.7.0(15)',lobby_files=len(files),lobby_bytes=sum(p.stat().st_size for p in files),integration_checks=len(integration['checks']),apk={'path':str(apk.relative_to(ROOT)),'sha256':sha(apk.read_bytes()),'bytes':apk.stat().st_size},hap={'path':str(hap.relative_to(ROOT)),'sha256':sha(hap.read_bytes()),'bytes':hap.stat().st_size,'signed':False})
except Exception as e:report['error']=str(e)
(ROOT/'work/reports/lobby3d-dual-packages.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(0 if report['passed'] else 1)
