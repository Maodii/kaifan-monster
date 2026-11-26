#!/usr/bin/env python3
"""Sign a non-debuggable APK with the owner's existing prepared release identity."""
import argparse,json,subprocess,hashlib,datetime,os
from pathlib import Path
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('input',type=Path);a=p.parse_args()
c=json.loads((Path.home()/'.kaifan/signing/signing.json').read_text())['android']
tools=Path(os.environ.get('ANDROID_HOME',str(Path.home()/'Library/Android/sdk')))/'build-tools/36.0.0'
def run(args):
 r=subprocess.run([str(x) for x in args],capture_output=True,text=True,timeout=90)
 if r.returncode:
  safe=(r.stdout+'\n'+r.stderr).replace(Path(c['passwordFile']).read_text().strip(),'[REDACTED]')
  (R/'work/reports/android-signing.log').write_text(safe)
  raise SystemExit('Android signing/verification failed; see sanitized work/reports/android-signing.log')
 return r.stdout
badging=run([tools/'aapt2','dump','badging',a.input])
if 'application-debuggable' in badging:raise SystemExit('Release signing refused: APK is debuggable')
if "package: name='com.kaifan.monster'" not in badging:raise SystemExit('Unexpected Android package identifier')
output=R/'outputs/kaifan-monster-android-release.apk'
staged=R/'android/app/build/release-signed.apk'
run([tools/'apksigner','sign','--ks',c['keystore'],'--ks-key-alias',c['alias'],'--ks-pass','file:'+c['passwordFile'],'--out',staged,a.input])
verified=run([tools/'apksigner','verify','--verbose','--print-certs',staged])
if 'Verified using v2 scheme (APK Signature Scheme v2): true' not in verified or 'Verified using v3 scheme (APK Signature Scheme v3): true' not in verified:raise SystemExit('Expected v2/v3 release signatures missing')
staged.replace(output)
for unused in [staged.with_suffix('.apk.idsig'),output.with_suffix('.apk.idsig')]:
 if unused.exists():unused.unlink()
report={'passed':True,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'package':str(output.relative_to(R)),'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'bytes':output.stat().st_size,'debuggable':False,'signatures':['v2','v3'],'signatureVerification':verified.splitlines(),'existingDebugPackagePreserved':True,'deviceInstallVerified':False,'limits':['Different certificate from debug APK: cannot update an existing debug installation in place','Store submission still requires platform compliance and release review']}
(R/'work/reports/android-production-signing.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['passed','package','bytes','debuggable','existingDebugPackagePreserved']},ensure_ascii=False))
