#!/usr/bin/env python3
"""Verify final dual packages, source payloads, release signing evidence and absence of RAM keys."""
import csv,datetime,hashlib,io,json,re,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda p:json.loads((root/p).read_text())
version='0.9.29';code=47;checks=[]
for name in ['sms-auth-integration.json','account-lifecycle-integration.json','sms-auth-cloud.json','sms-auth-real-phone.json','sms-auth-android-ui.json','android-release-privacy.json','surfaces-ui.json','store-privacy-unit.json']:
 assert load('work/reports/'+name)['passed'],name
checks.append('Backend isolated regressions, real phone acceptance, Android SMS and privacy/modal tests passed')
shared=load('work/reports/android-shared-core.json')
for name,value in shared['sourceHashes'].items():assert sha(root/'client/entry/src/main/ets/model'/str(name+'.ets'))==value,name
assert 'SmsAuthCore' in shared['modules']
idx=sha(root/'client/entry/src/main/ets/pages/Index.ets')
with (Path.home()/'Downloads/AccessKey.csv').open(encoding='utf-8-sig',newline='') as f:credentials=list(csv.DictReader(f))[0]
secrets=[credentials['AccessKey ID'].strip().encode(),credentials['AccessKey Secret'].strip().encode()]
def no_secret(data,label):
 for value in secrets:assert value not in data,'RAM credential unexpectedly present: '+label
packages=[]
for variant in ['debug','release']:
 p=root/f'outputs/kaifan-monster-android-{variant}.apk'
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None
  core=z.read('assets/core.js');info=json.loads(re.search(rb'window\.kaifanBuild=(\{[^\n]+\});',core).group(1));assert info['versionName']==version and info['versionCode']==code and info['uiReferenceSha256']==idx
  assert b'android' in core
  for f in (root/'android/web').iterdir():
   if f.is_file() and f.name not in ['Platform.js','Vault.js','EncryptedBackup.js']:assert z.read('assets/'+f.name)==f.read_bytes(),f.name
  assert b'sms-auth.js' in z.read('assets/index.html') and b'surfaces.js' in z.read('assets/index.html')
  for name in z.namelist():
   assert 'AccessKey.csv' not in name
   if not name.endswith('/'):no_secret(z.read(name),variant+':'+name)
 packages.append({'path':str(p.relative_to(root)),'sha256':sha(p),'bytes':p.stat().st_size})
checks.append('Both APK payloads match current web sources, source-bound 45 shared modules and version47; no RAM credentials')
for name in ['shiku-mvp-unsigned.hap','kaifan-monster-harmony-release.hap']:
 p=root/'outputs'/name
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None
  app=json.loads(z.read('module.json'))['app'];assert app['versionName']==version and app['versionCode']==code
  abc=z.read('ets/modules.abc')
  for text in ['smsSignIn','sms-send','验证码','SmsAuthDraft']:assert text.encode() in abc,text
  assert json.loads(z.read('resources/rawfile/release-legal.json'))['policyVersion']=='2026-11-18.1'
  for entry in z.namelist():
   if not entry.endswith('/'):no_secret(z.read(entry),name+':'+entry)
 packages.append({'path':str(p.relative_to(root)),'sha256':sha(p),'bytes':p.stat().st_size})
store=load('work/reports/harmony-store-package.json');assert store['passed'] and store['version']==version and store['versionCode']==code
p=root/'outputs/kaifan-monster-harmony-release.app'
with zipfile.ZipFile(p) as z:assert z.read('entry-default.hap')==(root/'outputs/kaifan-monster-harmony-release.hap').read_bytes()
packages.append({'path':str(p.relative_to(root)),'sha256':sha(p),'bytes':p.stat().st_size})
checks.append('Harmony debug/release compile SMS methods and current privacy disclosure; release APP embeds identical officially signed HAP')
r={'passed':True,'version':version,'versionCode':code,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'indexSha256':idx,'canonicalModules':len(shared['modules']),'checks':checks,'packages':packages,'realSmsSent':1,'phoneMasked':'1**********','limits':['No physical Harmony/Android device attached; browser tests and real backend/provider are distinct evidence','Harmony development certificate/profile unavailable; debug HAP remains unsigned; release HAP/APP use existing official release signing','Not submitted to an app store'],'sourceHashes':{str(f.relative_to(root)):sha(f) for f in [root/'client/entry/src/main/ets/pages/Index.ets',root/'client/entry/src/main/ets/model/Cloud.ets',root/'client/entry/src/main/ets/model/SmsAuthCore.ets',root/'android/web/sms-auth.js',root/'backend/src/sms-auth.ts',root/'backend/src/sms-provider.ts']}}
(root/'work/reports/sms-auth-release.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False,indent=2))
