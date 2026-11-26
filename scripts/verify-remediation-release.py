"""Verify current compiled resources and publish the sole local HAP, with explicit native limits."""
from pathlib import Path
import datetime
import hashlib
import io
import json
import shutil
import sys
import zipfile
from PIL import Image, ImageChops, ImageStat

root = Path(__file__).resolve().parent.parent
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
load = lambda p: json.loads((root / p).read_text())
reports = ['remediation-core-tests', 'remediation-content-audit',
           'account-lifecycle-integration', 'community-relations-integration',
           'discovery-catalog-integration', 'discovery-http-integration', 'local-account-spaces']
if '--demo' in sys.argv:
    reports += ['demo-seed', 'demo-seed-verification']
for name in reports:
    assert load('work/reports/' + name + '.json')['passed'], name
build_log = 'demo-build.log' if '--demo' in sys.argv else 'remediation-build.log'
assert 'BUILD SUCCESSFUL' in (root / 'work/reports' / build_log).read_text()
source = root / 'client/entry/build/default/outputs/default/entry-default-unsigned.hap'
resources = root / 'client/entry/src/main/resources'
inputs = [p for p in (root / 'client/entry/src/main').rglob('*') if p.is_file()]
assert all(p.stat().st_mtime <= source.stat().st_mtime for p in inputs), 'Sources changed after build'
formal = [p for p in list((resources / 'base/media').glob('*')) +
          list((resources / 'rawfile').rglob('*')) if p.is_file()]
with zipfile.ZipFile(source) as z:
    assert z.testzip() is None
    for p in formal:
        packed = z.read('resources/' + p.relative_to(resources).as_posix())
        if p.name != 'app_icon.png':
            assert packed == p.read_bytes(), str(p)
            continue
        original = Image.open(p).convert('RGBA')
        compiled = Image.open(io.BytesIO(packed)).convert('RGBA')
        assert compiled.size == (512, 512)
        resized = original.resize(compiled.size, Image.Resampling.BILINEAR)
        errors = []
        for color in ['#FFF9ED', '#DCE9E5', '#EADFF2']:
            a = Image.new('RGBA', compiled.size, color); a.alpha_composite(resized)
            b = Image.new('RGBA', compiled.size, color); b.alpha_composite(compiled)
            errors.append(max(ImageStat.Stat(ImageChops.difference(a.convert('RGB'), b.convert('RGB'))).mean))
        assert max(errors) < .5
        assert compiled.getchannel('A').getpixel((0, 0)) == 0
cover = load('art-source/recipe-covers/manifest.json')['files']
assert len(cover) == len({f['recipeId'] for f in cover}) == len({f['sha256'] for f in cover}) == 454
for f in cover:
    assert sha(root / f['path']) == f['sha256']
assert (root / 'backend/data/recipes.json').read_bytes() == (resources / 'rawfile/recipes.json').read_bytes()
out = root / 'outputs/shiku-mvp-unsigned.hap'
shutil.copyfile(source, out)
report = {
    'packageVerified': True, 'released_at': datetime.datetime.now().astimezone().isoformat(),
    'hap': str(out.relative_to(root)), 'hap_sha256': sha(out), 'hap_bytes': out.stat().st_size,
    'source_sha256': sha(root / 'client/entry/src/main/ets/pages/Index.ets'),
    'formal_resources_verified': len(formal), 'unique_covers': 454,
    'compiled_icon_composite_errors': errors, 'passed_reports': reports,
    'build_log': 'work/reports/' + build_log,
    'contains_labeled_demo_data': '--demo' in sys.argv,
    'native_status': 'partial_pressure_blocked',
    'native_evidence': 'work/reports/native-remediation.json',
    'native_scope': 'Intermediate build: search entry/history, filter apply/cancel/reset. Test stopped on empty inventory fixture assumption; final script revised but not rerun.',
    'limits': ['Final native regression pending safe host memory pressure',
               'Unsigned emulator HAP; physical-device signing/camera/reminder/card verification pending',
               'Real email provider and Huawei cloud deployment not configured',
               'Unknown source quantities remain unknown; no photo recognition AI',
               'Temporary test search 五花肉 鸡蛋 may remain in local history; other history preserved']}
(root / 'work/reports/remediation-release.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
