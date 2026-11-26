#!/usr/bin/env python3
"""Verify current signed dual release payloads without reading signing credentials."""
import datetime,hashlib,io,json,re,zipfile
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.loads((R/p).read_text())
checks=[];packages=[]
idx=digest(R/'client/entry/src/main/ets/pages/Index.ets')
version=json.loads((R/'client/AppScope/app.json5').read_text())['app']
shared=load('work/reports/android-shared-core.json')
for name,value in shared['sourceHashes'].items():assert digest(R/'client/entry/src/main/ets/model'/str(name+'.ets'))==value,name
apk=R/'outputs/kaifan-monster-android-release.apk'
with zipfile.ZipFile(apk) as z:
 assert z.testzip() is None
 info=json.loads(re.search(rb'window\.kaifanBuild=(\{[^\n]+\});',z.read('assets/core.js')).group(1))
 assert info['versionName']==version['versionName'] and info['versionCode']==version['versionCode']
 assert info['uiReferenceSha256']==idx
 for f in (R/'android/web').iterdir():
  if f.is_file() and f.name not in ['Platform.js','Vault.js','EncryptedBackup.js']:assert z.read('assets/'+f.name)==f.read_bytes(),f.name
 assert b'interaction-pending' in z.read('assets/app.js')
 assert b'--control-touch:44px' in z.read('assets/style.css')
checks.append('Release APK embeds exact current Android UI and source-bound shared modules, including interaction feedback and SMS')
sign=load('work/reports/android-production-signing.json');assert sign['passed'] and not sign['debuggable'] and sign['sha256']==digest(apk)
assert sign['signatures']==['v2','v3']
checks.append('Android release signature v2/v3 verified and non-debuggable')
hap=R/'outputs/kaifan-monster-harmony-release.hap'
with zipfile.ZipFile(hap) as z:
 assert z.testzip() is None
 app=json.loads(z.read('module.json'))['app']
 assert app['versionName']==version['versionName'] and app['versionCode']==version['versionCode']
 assert app['debug'] is False and app['buildMode']=='release'
 abc=z.read('ets/modules.abc')
 for text in ['operationPending','touchFeedback','正在处理，请稍候','SmsAuthDraft','smsSignIn']:assert text.encode() in abc,text
 assert json.loads(z.read('resources/rawfile/release-legal.json'))==load('client/entry/src/main/resources/rawfile/release-legal.json')
checks.append('Native release HAP includes progress, touch feedback and SMS code with current privacy configuration')
store=load('work/reports/harmony-store-package.json');assert store['passed'] and store['version']==version['versionName'] and store['versionCode']==version['versionCode']
assert store['outerAppSignatureVerified'] and store['embeddedHapSignatureVerified'] and store['embeddedHapMatchesSignedRelease']
appfile=R/'outputs/kaifan-monster-harmony-release.app'
with zipfile.ZipFile(appfile) as z:assert z.read('entry-default.hap')==hap.read_bytes()
assert store['sha256']==digest(appfile)
hsign=load('work/reports/harmony-release-signing.json');assert hsign['passed'] and hsign['sha256']==digest(hap)
checks.append('Huawei release HAP and outer APP signatures verified; APP embeds identical standalone HAP')
assert load('work/reports/interaction-feedback-ui.json')['passed']
for p in [apk,hap,appfile]:packages.append({'path':str(p.relative_to(R)),'bytes':p.stat().st_size,'sha256':digest(p)})
r={'passed':True,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'version':version['versionName'],'versionCode':version['versionCode'],'checks':checks,'packages':packages,'sourceHashes':{str(p.relative_to(R)):digest(p) for p in [R/'client/entry/src/main/ets/pages/Index.ets',R/'android/web/app.js',R/'android/web/assistant.js',R/'android/web/style.css']},'limits':['Not submitted to stores','No physical device install performed','Existing debug/unsigned exports are older builds; use the three release artifacts in this report']}
(R/'work/reports/interaction-dual-release.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False,indent=2))
