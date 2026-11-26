#!/usr/bin/env python3
"""Current account UI, credential policy, deployed API and package provenance."""
import datetime,hashlib,json,subprocess,zipfile
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(name):
 d=json.loads((R/'work/reports'/f'{name}.json').read_text());assert d['passed'],name;return d
version=json.loads((R/'client/AppScope/app.json5').read_text())['app']['versionName']
unit=load('account-v0914-unit');ui=load('account-v0914-ui');cloud=load('account-v0914-cloud');device=load('account-v0914-device')
assert cloud['temporaryAccountRemoved'] and cloud['businessRecordsCreated']==0
assert ui['generated_core_sha256']==sha(R/'android/app/build/generated/assets/core.js')
for filename,digest in unit['sourceHashes'].items():assert digest==sha(R/filename)
paths=list(unit['sourceHashes']);remote="import json,hashlib;from pathlib import Path;print(json.dumps({p:hashlib.sha256((Path('/opt/kaifan')/p).read_bytes()).hexdigest() for p in "+repr(paths)+"}))"
ssh=Path.home()/'.ssh';args=['ssh','-i',str(ssh/'service-deploy-key'),'-o','BatchMode=yes','-o','ConnectTimeout=12','-o','StrictHostKeyChecking=yes','-o',f'UserKnownHostsFile={ssh/"known_hosts_service"}','root@api.example.invalid','python3 -']
p=subprocess.run(args,input=remote,text=True,capture_output=True,timeout=30,check=True);deployed=json.loads(p.stdout);assert deployed==unit['sourceHashes']
packages={}
for filename in ['shiku-mvp-unsigned.hap','kaifan-monster-android-debug.apk','kaifan-monster-android-release.apk']:
 path=R/'outputs'/filename
 with zipfile.ZipFile(path) as z:
  assert z.testzip() is None
  if filename.endswith('hap'):
   assert json.loads(z.read('module.json'))['app']['versionName']==version
   assert b'auth-email' in b''.join(z.read(n) for n in z.namelist() if n.endswith('.abc'))
  else:
   for name in ['core.js','app.js','parity.js']:assert z.read('assets/'+name)==(R/'android/app/build/generated/assets'/name).read_bytes()
   assert b'\xe9\xab\x98\xe7\xba\xa7\xe8\xbf\x9e\xe6\x8e\xa5' not in z.read('assets/app.js')+z.read('assets/parity.js')
  for name in z.namelist():
   if name.endswith('/'):continue
   assert not any(marker in z.read(name) for marker in [b'sk-sp-',b'BEGIN OPENSSH PRIVATE KEY',b'provider.example.invalid'])
 packages[filename]={'sha256':sha(path),'bytes':path.stat().st_size}
assert load('android-production-signing')['sha256']==packages['kaifan-monster-android-release.apk']['sha256']
assert device['version']==version and device['replaceOnly'] and not device['businessWritesPerformed']
d={'passed':True,'version':version,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'unitGroups':len(unit['checks']),'uiGroups':len(ui['checks']),'publicGroups':len(cloud['checks']),'deployedSourceHashes':deployed,'packages':packages,'device':device,'guide':'docs/account-rules-v0914.md','limits':['Android native device not exercised in this release','Harmony emulator package remains unsigned; physical device needs Huawei signing']}
(R/'work/reports/account-v0914-release.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'passed':True,'version':version,'checks':15,'packages':3,'cloudAccountRemoved':True}))
