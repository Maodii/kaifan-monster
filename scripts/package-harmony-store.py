#!/usr/bin/env python3
"""Create and verify a release APP using official pack/sign tools; no secrets in project."""
import datetime,hashlib,io,json,shutil,subprocess,tempfile,zipfile
from pathlib import Path
R=Path(__file__).resolve().parents[1]
JAVA='/Applications/DevEco-Studio.app/Contents/jbr/Contents/Home/bin/java'
LIB=Path('/Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains/lib')
c=json.loads((Path.home()/'.kaifan/signing/signing.json').read_text())['harmonyRelease']
pwd=Path(c['passwordFile']).read_text().strip()
def run(cmd):
 p=subprocess.run(cmd,capture_output=True,text=True,timeout=180)
 if p.returncode or '[Error]' in p.stdout:
  (R/'work/reports/store-package-tool.log').write_text((p.stdout+'\n'+p.stderr).replace(pwd,'[REDACTED]'))
  raise SystemExit('Official tool failed; see work/reports/store-package-tool.log')
 return p.stdout
run(['python3',str(R/'scripts/sign-harmony.py'),'--release'])
final=R/'outputs/kaifan-monster-harmony-release.app'
with tempfile.TemporaryDirectory(prefix='store-pack-',dir=R/'work') as t:
 t=Path(t);hap=t/'entry-default.hap';unsigned=t/'unsigned.app';signed=t/'signed.app'
 # Hvigor has already run the official packer, which may normalize inner HAPs.
 # Sign exactly those bytes only after packing; never pack a signed HAP again.
 built=R/'client/build/outputs/default/client-default-unsigned.app'
 with zipfile.ZipFile(built) as z:
  contents={n:z.read(n) for n in z.namelist()}
 assert set(contents)=={'entry-default.hap','pack.info','pac.json'}
 raw=t/'entry-unsigned.hap';raw.write_bytes(contents['entry-default.hap'])
 run([JAVA,'-jar',str(LIB/'hap-sign-tool.jar'),'sign-app','-mode','localSign','-keyAlias',c['alias'],'-keyPwd',pwd,'-appCertFile',c['certificate'],'-profileFile',c['profile'],'-profileSigned','1','-inFile',str(raw),'-signAlg','SHA256withECDSA','-keystoreFile',c['keystore'],'-keystorePwd',pwd,'-outFile',str(hap),'-compatibleVersion','24'])
 contents['entry-default.hap']=hap.read_bytes()
 with zipfile.ZipFile(unsigned,'w',compression=zipfile.ZIP_DEFLATED) as z:
  for n,data in contents.items():z.writestr(n,data)
 info=json.loads(contents['pack.info']);assert info['packages'][0]['name']=='entry-default'
 run([JAVA,'-jar',str(LIB/'hap-sign-tool.jar'),'sign-app','-mode','localSign','-keyAlias',c['alias'],'-keyPwd',pwd,'-appCertFile',c['certificate'],'-profileFile',c['profile'],'-profileSigned','1','-inFile',str(unsigned),'-signAlg','SHA256withECDSA','-keystoreFile',c['keystore'],'-keystorePwd',pwd,'-outFile',str(signed),'-compatibleVersion','24'])
 for f,name in [(signed,'app'),(hap,'hap')]:
  run([JAVA,'-jar',str(LIB/'hap-sign-tool.jar'),'verify-app','-inFile',str(f),'-outCertChain',str(t/(name+'-chain.cer')),'-outProfile',str(t/(name+'-profile.p7b'))])
 with zipfile.ZipFile(signed) as z:
  modulebytes=z.read('entry-default.hap');assert modulebytes==hap.read_bytes()
  with zipfile.ZipFile(io.BytesIO(modulebytes)) as m:
   metadata=json.loads(m.read('module.json'));app=metadata['app'];names=m.namelist()
   assert app['debug'] is False and app['buildMode']=='release'
   assert app['bundleName']==c['bundle']
   assert not any('lobby3d' in n.lower() or n.lower().endswith(('.glb','.gltf')) for n in names)
   conf=json.loads(m.read('resources/rawfile/release-legal.json'));assert conf==json.loads((R/'client/entry/src/main/resources/rawfile/release-legal.json').read_text())
   abc=m.read('ets/modules.abc');assert '隐私政策'.encode() in abc and 'AI生成'.encode() in abc
 shutil.copyfile(hap,R/'outputs/kaifan-monster-harmony-release.hap')
 standalone=R/'outputs/kaifan-monster-harmony-release.hap';sr=R/'work/reports/harmony-release-signing.json';sd=json.loads(sr.read_text());sd['sha256']=hashlib.sha256(standalone.read_bytes()).hexdigest();sd['bytes']=standalone.stat().st_size;sd['signedAfterAppPacking']=True;sr.write_text(json.dumps(sd,ensure_ascii=False,indent=2)+'\n')
 signed.replace(final)
 report={'passed':True,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'package':str(final.relative_to(R)),'bundle':app['bundleName'],'version':app['versionName'],'versionCode':app['versionCode'],'buildMode':app['buildMode'],'minAPIVersion':app['minAPIVersion'],'targetAPIVersion':app['targetAPIVersion'],'bytes':final.stat().st_size,'sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'outerAppSignatureVerified':True,'embeddedHapSignatureVerified':True,'embeddedHapMatchesSignedRelease':True,'no3dAssets':True,'legalIdentity':conf['organization'],'supportEmail':conf['supportEmail'],'permissions':metadata['module']['requestPermissions'],'physicalDeviceVerified':False,'storeUploadVerified':False,'submissionReady':False,'pending':['APP备案号及相关资质','隐私政策公网URL与正式保留期限/供应商约定核对','AI功能声明及所需标识和资质材料','图片菜谱版权核查','真机与平板验收、稳定服务及审核账号']}
 (R/'work/reports/harmony-store-package.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
