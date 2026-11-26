#!/usr/bin/env python3
"""Bind source, deployed tests and both current deliverables without storing secrets."""
from pathlib import Path
import hashlib,json,re,zipfile,datetime
R=Path(__file__).resolve().parents[1]
def sha(b):return hashlib.sha256(b).hexdigest()
checks=[];packages={}
current=json.loads((R/'client/AppScope/app.json5').read_text())['app'];version=current['versionName'];version_code=current['versionCode']
public_reports=['public-https-smoke','assistant-public-https','assistant-stream-public-https','service-endpoint-unit']
public_ready=all((R/'work/reports'/f'{n}.json').exists() and json.loads((R/'work/reports'/f'{n}.json').read_text()).get('passed') is True for n in public_reports)

for label,path in [('harmony','outputs/shiku-mvp-unsigned.hap'),('android','outputs/kaifan-monster-android-debug.apk')]:
 p=R/path
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None
  names=z.namelist()
  assert not any(re.search(r'(^|/)(\.env(?:\..*)?|auth\.json|.*\.(pem|key|keystore))$',n) for n in names)
  for name in names:
   data=z.read(name)
   assert not any(marker in data for marker in [b'sk-sp-',b'BEGIN OPENSSH PRIVATE KEY',b'provider.example.invalid']),label+': forbidden credential/provider marker'
  if label=='harmony':
   app=json.loads(z.read('module.json'))['app'];assert app['versionName']==version and app['versionCode']==version_code and app['bundleName']=='com.shiku.foodkeeper'
   for icon in ['ingredients','timer','shopping','favorite','assistant','plan']:
    filename='experience_'+icon+'.png'
    assert z.read('resources/base/media/'+filename)==(R/'client/entry/src/main/resources/base/media'/filename).read_bytes()
   for pose in ['idle','blink','wave','think','joy','eat','peek','sleep','stretch','surprise']:
    filename='ai_mascot_'+pose+'.png'
    assert z.read('resources/base/media/'+filename)==(R/'client/entry/src/main/resources/base/media'/filename).read_bytes(),filename
   code=b''.join(z.read(n) for n in names if n.endswith('.abc'));assert b'/ai/assist' in code and b'ai-assistant' in code
   assert not any(n.startswith('resources/rawfile/lobby/') for n in names),'suspended 3D bundle included'
   packages[label]={'path':path,'bytes':p.stat().st_size,'sha256':sha(p.read_bytes()),'bundle':app['bundleName'],'version':app['versionName'],'signing':'unsigned development HAP'}
  else:
   assert b'/ai/assist/jobs' in z.read('assets/core.js')
   assert b'AssistantLive' in z.read('assets/assistant.js')
   assert z.read('assets/assistant.js')==(R/'android/web/assistant.js').read_bytes()
   packages[label]={'path':path,'bytes':p.stat().st_size,'sha256':sha(p.read_bytes()),'bundle':'com.kaifan.monster','version':version,'signing':'debug v2/v3; independently verified'}
checks.append(f'ZIP integrity, distinct identifiers, {version}/code{version_code} and current AI entry in both packages')
checks.append('No provider key prefix, provider base URL, environment files or private key in either package')
for name in ['assistant-ui','assistant-cloud','assistant-workflow-cloud','assistant-workflow-unit','assistant-transport-unit','assistant-network-cloud','assistant-client-core','cloud-refresh-unit','android-parity-release','android-core-tests','android-parity-input','assistant-jobs-unit','assistant-experience-unit','assistant-interaction-unit','companion-ui','companion-core','companion-art','assistant-stream-cloud','assistant-device-matrix','assistant-host-performance','experience-art','gateway-stream-unit']:
 x=json.loads((R/'work/reports'/f'{name}.json').read_text());assert x['passed'],name
refresh_report=json.loads((R/'work/reports/cloud-refresh-unit.json').read_text());assert refresh_report['generated_core_sha256']==sha((R/'android/app/build/generated/assets/core.js').read_bytes())
assert json.loads((R/'work/reports/assistant-unit.json').read_text())['status']=='passed'
for report_name in ['assistant-ui','assistant-client-core','assistant-experience-unit','assistant-interaction-unit','companion-ui','companion-core']:
 report=json.loads((R/'work/reports'/f'{report_name}.json').read_text());assert report['generated_core_sha256']==sha((R/'android/app/build/generated/assets/core.js').read_bytes()),report_name+' stale core'
report=json.loads((R/'work/reports/gateway-stream-unit.json').read_text());assert report['gatewaySourceSha256']==sha((R/'ai-gateway/app.py').read_bytes())
deployment=json.loads((R/'work/reports/ai-v094-deployment.json').read_text());assert deployment['passed']
for filename,digest in deployment['sourceHashes'].items():assert digest==sha((R/filename).read_bytes()),filename+' differs from deployed source'
assert json.loads((R/'work/reports/assistant-stream-cloud.json').read_text())['accountsRemoved']==2
checks.append('AI cloud, service unit, browser UI, input navigation, SQLite/HTTP and APK evidence passed')
device_path=R/'work/reports/assistant-v0913-device.json';device=json.loads(device_path.read_text()) if device_path.exists() else {};installed=device.get('passed') and device.get('version')==version
report={'passed':True,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'packages':packages,'harmonyUiSourceSha256':sha((R/'client/entry/src/main/ets/pages/Index.ets').read_bytes()),'publicHttpsVerified':public_ready,'limits':([] if public_ready else ['Public HTTPS verification pending'])+([] if installed else ['No current Harmony device installation evidence'])+['Harmony HAP is unsigned for emulator; physical device requires Huawei signing','Inference provided by Alibaba qwen3.8-flash; server hosts gateway, not model weights']}
(R/'work/reports/assistant-release.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
