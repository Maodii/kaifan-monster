#!/usr/bin/env python3
"""Prepare owner-controlled keys once. Never overwrite existing signing identities."""
import json,os,secrets,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PRIVATE=Path.home()/'.kaifan/signing'
KEYTOOL='/Applications/DevEco-Studio.app/Contents/jbr/Contents/Home/bin/keytool'
PRIVATE.mkdir(parents=True,exist_ok=True);PRIVATE.chmod(0o700)
def prepare(name,alias,algorithm):
 store=PRIVATE/(name+'.p12');pwd=PRIVATE/(name+'.password')
 if store.exists()!=pwd.exists():raise SystemExit('Incomplete existing identity; preserve it and repair manually: '+str(store))
 if not store.exists():
  fd=os.open(pwd,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
  with os.fdopen(fd,'w') as f:f.write(secrets.token_urlsafe(36)+'\n')
  env={**os.environ,'KAIFAN_SIGNING_PASSWORD':pwd.read_text().strip()}
  args=[KEYTOOL,'-genkeypair','-alias',alias,'-storetype','PKCS12','-keystore',str(store),'-storepass:env','KAIFAN_SIGNING_PASSWORD','-keypass:env','KAIFAN_SIGNING_PASSWORD','-dname','CN=Kaifan Monster,OU=App Development,O=Kaifan,C=CN','-validity','3650','-noprompt']+algorithm
  result=subprocess.run(args,env=env,capture_output=True,text=True,timeout=90)
  if result.returncode:raise SystemExit('Key generation failed; existing files retained for diagnosis')
 store.chmod(0o600);pwd.chmod(0o600)
 env={**os.environ,'KAIFAN_SIGNING_PASSWORD':pwd.read_text().strip()}
 subprocess.run([KEYTOOL,'-list','-alias',alias,'-keystore',str(store),'-storepass:env','KAIFAN_SIGNING_PASSWORD'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,check=True,timeout=20)
 return {'keystore':str(store),'alias':alias,'passwordFile':str(pwd)}
h=prepare('harmony-development','kaifan-harmony-development',['-keyalg','EC','-groupname','secp256r1','-sigalg','SHA256withECDSA'])
a=prepare('android-release','kaifan-android-release',['-keyalg','RSA','-keysize','3072','-sigalg','SHA256withRSA'])
csr=ROOT/'outputs/harmony-development-request.csr'
subprocess.run([KEYTOOL,'-certreq','-rfc','-alias',h['alias'],'-keystore',h['keystore'],'-storepass:env','KAIFAN_SIGNING_PASSWORD','-file',str(csr)],env={**os.environ,'KAIFAN_SIGNING_PASSWORD':Path(h['passwordFile']).read_text().strip()},capture_output=True,check=True,timeout=20)
h.update(bundle='com.shiku.foodkeeper',certificate=str(PRIVATE/'harmony-development.cer'),profile=str(PRIVATE/'harmony-development.p7b'),csr=str(csr))
a.update(bundle='com.kaifan.monster',status='prepared; existing debug identity unchanged')
config=PRIVATE/'signing.json'
fd=os.open(config,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
with os.fdopen(fd,'w') as f:json.dump({'harmony':h,'android':a},f,ensure_ascii=False,indent=2);f.write('\n')
config.chmod(0o600)
subprocess.run(['openssl','req','-in',str(csr),'-verify','-noout'],check=True,capture_output=True,timeout=10)
print(json.dumps({'prepared':True,'privateConfig':str(config),'publicCsr':str(csr),'huaweiCertificatePresent':Path(h['certificate']).exists(),'huaweiProfilePresent':Path(h['profile']).exists(),'androidReleaseKeyPrepared':True,'existingDebugKeyChanged':False},ensure_ascii=False,indent=2))
