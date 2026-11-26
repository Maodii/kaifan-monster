#!/usr/bin/env python3
"""Tie the native UI acceptance report and generated assets to the signed store package."""
from pathlib import Path
import hashlib,io,json,zipfile
R=Path(__file__).resolve().parents[1]
report=json.loads((R/'work/reports/harmony-store-package.json').read_text())
native=json.loads((R/'work/reports/store-privacy-native.json').read_text());unit=json.loads((R/'work/reports/store-privacy-unit.json').read_text())
assert native['passed'] and unit['passed']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert native['sourceSha256']==sha(R/'client/entry/src/main/ets/pages/Index.ets')
unsigned=R/'client/entry/build/default/outputs/default/entry-default-unsigned.hap'
assert native['testedUnsignedReleaseHapSha256']==sha(unsigned)
with zipfile.ZipFile(R/'outputs/kaifan-monster-harmony-release.app') as app:
 with zipfile.ZipFile(io.BytesIO(app.read('entry-default.hap'))) as signed,zipfile.ZipFile(unsigned) as tested:
  paths=['ets/modules.abc','resources/rawfile/release-legal.json']+[f'resources/base/media/legal_{k}.png' for k in ['privacy','terms','permissions','ai','support','about']]
  for path in paths:assert signed.read(path)==tested.read(path),path
  for path in paths[2:]:assert signed.read(path)==(R/'client/entry/src/main'/path).read_bytes(),path
report.update({'testedReleaseCodeMatchesSignedApp':True,'generatedIconCount':6,'generatedIconsMatchSourceAndTestedHap':True,'nativePrivacyChecks':native['checks'],'privacyUnitChecks':unit['checks'],'note':'Native UI tested using unsigned release HAP on existing phone emulator; ABC, legal config and six generated icons match final signed APP. Physical phone/tablet and release certificate install remain untested.'})
text=json.dumps(report,ensure_ascii=False,indent=2)+'\n'
(R/'work/reports/harmony-store-package.json').write_text(text)
(R/'outputs/harmony-store/package-verification.json').write_text(text)
files=[R/'outputs/kaifan-monster-harmony-release.app',R/'outputs/kaifan-monster-harmony-release.hap']+sorted(p for p in (R/'outputs/harmony-store').rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt')
(R/'outputs/harmony-store/SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(R/"outputs")}\n' for p in files))
print('PASS: signed APP matches native-tested code, legal config and six generated icon assets; delivery hashes updated')
