"""Verify and publish the current local iteration without launching any UI."""
from pathlib import Path
import datetime, hashlib, io, json, shutil, zipfile
from PIL import Image, ImageChops, ImageStat
root = Path(__file__).resolve().parent.parent
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
load = lambda p: json.loads((root / p).read_text())
reports = ['next20-tests', 'next20-services', 'next20-core', 'next20-workspace-api', 'experience-workflow',
           'editorial-workflow-api', 'editorial-workflow-ui', 'kitchen-workflow-core',
           'social-pagination-claims']
for name in reports:
    assert load('work/reports/' + name + '.json')['passed'], name
assert len(load('work/reports/next20-tests.json')['cases']) == 19
assert 'BUILD SUCCESSFUL' in (root / 'work/reports/next20-build.log').read_text()
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
 'packageVerified': True,
 'released_at': datetime.datetime.now().astimezone().isoformat(),
 'hap': str(out.relative_to(root)), 'hap_sha256': sha(out), 'hap_bytes': out.stat().st_size,
 'source_sha256': sha(root / 'client/entry/src/main/ets/pages/Index.ets'),
 'formal_resources_verified': len(formal), 'unique_covers': len(cover),
 'compiled_icon_composite_errors': errors, 'passed_reports': reports,
 'regression_suites': 19, 'scope_directions': 20, 'all_directions_device_accepted': False,
 'build_log': 'work/reports/next20-build.log',
 'acceptance': 'docs/next20-acceptance.md',
 'nativeDeviceVerified': False, 'native_status': 'not_connected_guard_stopped_emulator_at_3GiB',
 'limits': ['Unsigned HAP; final native interaction/performance regression pending',
            'Physical camera, notifications, keep-screen-on and cards pending hardware verification',
            'Single-administrator preview/publish workflow; claims require network',
            'Unknown source amounts remain unknown; content accuracy needs editorial review',
            'Real mail, Huawei cloud and photo recognition are not configured']
}
(root / 'work/reports/next20-release.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
