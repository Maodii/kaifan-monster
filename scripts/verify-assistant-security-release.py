#!/usr/bin/env python3
"""Bind AI collaboration/security evidence to deployed code and current artifacts."""
import datetime,hashlib,json,zipfile
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def report(name):
    d=json.loads((R/'work/reports'/f'{name}.json').read_text());assert d.get('passed') is True,name;return d
app=json.loads((R/'client/AppScope/app.json5').read_text())['app'];version=app['versionName']
core_sha=sha(R/'android/app/build/generated/assets/core.js')
for name in ['assistant-native-unit','assistant-ui','assistant-client-core','assistant-experience-unit','assistant-interaction-unit','companion-ui','companion-core','cloud-refresh-unit','android-core-tests','android-parity-input']:
    d=report(name);assert d['generated_core_sha256']==core_sha,name+' stale core'
ui=report('assistant-ui');assert any('stock-audit' in s for s in ui['checks']);assert any('injected native command' in s for s in ui['checks'])
cloud=report('assistant-security-cloud');assert cloud['realModelCalls']==0 and cloud['accountRemoved']
semantic=report('assistant-semantic-scope-cloud');assert semantic['realModelCalls']==1 and semantic['accountRemoved']
empty=report('assistant-empty-public-https');assert empty['accountRemoved']
gateway=report('gateway-stream-unit');assert gateway['gatewaySourceSha256']==sha(R/'ai-gateway/app.py') and gateway['tests']==15
for filename,digest in report('ai-v094-deployment')['sourceHashes'].items():assert sha(R/filename)==digest,filename+' not deployed'
report('assistant-release');report('android-parity-release')
packages={}
for filename in ['shiku-mvp-unsigned.hap','kaifan-monster-android-debug.apk','kaifan-monster-android-release.apk']:
    path=R/'outputs'/filename
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        if filename.endswith('apk'):
            for name in ['core.js','assistant.js']:
                assert z.read('assets/'+name)==(R/'android/app/build/generated/assets'/name).read_bytes()
        else:
            assert json.loads(z.read('module.json'))['app']['versionName']==version
        for name in z.namelist():
            if name.endswith('/'):continue
            data=z.read(name)
            assert not any(marker in data for marker in [b'sk-sp-',b'BEGIN OPENSSH PRIVATE KEY',b'provider.example.invalid']),filename+' credential marker'
    packages[filename]={'sha256':sha(path),'bytes':path.stat().st_size}
signing=report('android-production-signing');assert signing['sha256']==packages['kaifan-monster-android-release.apk']['sha256']
device=report('assistant-v0913-device');assert device['version']==version and device['localAuditButtonVerified'] and device['injectionRefusalWithoutCloudConsentVerified'] and device['mutationButtonAbsentOnAttack'];assert not device['businessWritesPerformed']
for path in device['screenshots']:assert (R/path).is_file()
d={'passed':True,'version':version,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'packages':packages,'sharedCoreSha256':core_sha,'uiChecks':len(ui['checks']),'nativeUnitGroups':len(report('assistant-native-unit')['checks']),'gatewayTests':15,'cloudSecurityChecks':len(cloud['checks']),'realModelProbes':2,'device':device,'guide':'docs/assistant-security-v0913.md','limits':['One semantic scope probe does not prove universal jailbreak resistance','Confirmed mutations/undo exercised with real SQLite host; emulator acceptance used read-only and denial workflows','A valid stolen account token can consume bounded quota until expiry or revocation','Previously disclosed provider API keys require owner rotation in provider console','No physical Android/Harmony device acceptance in this release']}
(R/'work/reports/assistant-security-release.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':True,'version':version,'packages':len(packages),'uiChecks':len(ui['checks']),'gatewayTests':15,'cloudSecurityChecks':len(cloud['checks']),'emulatorReadOnlyAndDenialVerified':True}))
