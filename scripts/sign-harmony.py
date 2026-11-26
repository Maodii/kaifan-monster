#!/usr/bin/env python3
"""Sign a HAP with the owner's Huawei-issued certificate/profile. No shared SDK keys."""
import argparse,datetime,hashlib,json,subprocess,tempfile,zipfile
from pathlib import Path
R=Path(__file__).resolve().parents[1]
JAVA='/Applications/DevEco-Studio.app/Contents/jbr/Contents/Home/bin/java'
TOOL='/Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains/lib/hap-sign-tool.jar'
p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');p.add_argument('--release',action='store_true');args=p.parse_args()
config=Path.home()/'.kaifan/signing/signing.json'
if not config.exists():raise SystemExit('Run python3 scripts/prepare-signing.py first')
c=json.loads(config.read_text())['harmonyRelease' if args.release else 'harmony'];required=['keystore','passwordFile','certificate','profile']
missing=[c[k] for k in required if not Path(c[k]).is_file()]
if args.check or missing:
 print(json.dumps({'ready':not missing,'bundle':c['bundle'],'missing':missing,'note':'Huawei must issue the certificate and signed Profile; a local CSR is not a trusted app signature.'},ensure_ascii=False,indent=2))
 raise SystemExit(0 if args.check else 2)
pwd=Path(c['passwordFile']).read_text().strip()
def run(cmd):
 result=subprocess.run(cmd,capture_output=True,text=True,timeout=120)
 if result.returncode:
  safe=(result.stdout+'\n'+result.stderr).replace(pwd,'[REDACTED]')
  (R/'work/reports/harmony-signing.log').write_text(safe)
  raise SystemExit('Signing tool failed; see work/reports/harmony-signing.log. No private key/password printed.')
 return result.stdout
# A Huawei certificate for another key must not be used with this private key.
cert=Path(c['certificate'])
public=None
for encoding in ['PEM','DER']:
 result=subprocess.run(['openssl','x509','-in',str(cert),'-inform',encoding,'-pubkey','-noout'],capture_output=True,text=True,timeout=10)
 if result.returncode==0:public=result.stdout.strip();break
if not public:raise SystemExit('Application certificate is not a readable PEM/DER X.509 certificate')
localcert=run(['openssl','pkcs12','-in',c['keystore'],'-passin','file:'+c['passwordFile'],'-clcerts','-nokeys'])
local=subprocess.run(['openssl','x509','-pubkey','-noout'],input=localcert,capture_output=True,text=True,timeout=10)
if local.returncode or local.stdout.strip()!=public:raise SystemExit('Certificate does not match the prepared key; preserve both and check Huawei CSR selection')
source=R/'client/entry/build/default/outputs/default/entry-default-unsigned.hap' if args.release else R/'outputs/shiku-mvp-unsigned.hap'
target=R/'outputs/kaifan-monster-harmony-release.hap' if args.release else R/'outputs/shiku-mvp-signed.hap'
with zipfile.ZipFile(source) as z:app=json.loads(z.read('module.json'))['app']
if app['bundleName']!=c['bundle']:raise SystemExit('HAP bundle differs from signing configuration')
if args.release and (app.get('debug') is not False or app.get('buildMode')!='release'):raise SystemExit('Build a non-debug release HAP before release signing')
with tempfile.TemporaryDirectory(prefix='kaifan-sign-',dir=R/'work') as temporary:
 temp=Path(temporary)
 run([JAVA,'-jar',TOOL,'verify-profile','-inFile',c['profile'],'-outFile',str(temp/'profile-check.json')])
 verified=json.loads((temp/'profile-check.json').read_text())
 if verified.get('verifiedPassed') is not True:raise SystemExit('Profile signature verification failed')
 profile=verified['content'];bundle=profile['bundle-info'];now=datetime.datetime.now(datetime.timezone.utc).timestamp()
 if bundle['bundle-name']!=c['bundle']:raise SystemExit('Provision Profile does not match this bundle')
 if not profile['validity']['not-before']<=now<profile['validity']['not-after']:raise SystemExit('Profile is outside its validity period')
 if args.release and (profile['type']!='release' or profile['app-distribution-type']!='app_gallery'):raise SystemExit('Expected an AppGallery release Profile')
 if args.release and bundle.get('app-identifier')!=c.get('appIdentifier'):raise SystemExit('Profile application ID does not match release configuration')
 boundcert=temp/'bound.cer';boundcert.write_text(bundle['distribution-certificate'])
 if run(['openssl','x509','-in',str(boundcert),'-noout','-fingerprint','-sha256'])!=run(['openssl','x509','-in',str(cert),'-noout','-fingerprint','-sha256']):raise SystemExit('Profile binds a different signing certificate')
 staged=temp/'signed.hap'
 run([JAVA,'-jar',TOOL,'sign-app','-mode','localSign','-keyAlias',c['alias'],'-keyPwd',pwd,'-appCertFile',c['certificate'],'-profileFile',c['profile'],'-profileSigned','1','-inFile',str(source),'-signAlg','SHA256withECDSA','-keystoreFile',c['keystore'],'-keystorePwd',pwd,'-outFile',str(staged),'-compatibleVersion',str(app['minAPIVersion'])])
 run([JAVA,'-jar',TOOL,'verify-app','-inFile',str(staged),'-outCertChain',str(temp/'verified-chain.cer'),'-outProfile',str(temp/'verified-profile.p7b')])
 # Replace only after signature verification; temporary key-free exports are removed.
 staged.replace(target)
report={'passed':True,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'package':str(target.relative_to(R)),'bundle':app['bundleName'],'version':app['versionName'],'buildMode':app['buildMode'],'profileType':profile['type'],'distribution':profile['app-distribution-type'],'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'deviceInstallVerified':False}
(R/('work/reports/harmony-release-signing.json' if args.release else 'work/reports/harmony-signing.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
