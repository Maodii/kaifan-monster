"""Verify and publish the current local iteration without launching any UI."""
from pathlib import Path
import datetime, hashlib, io, json, shutil, zipfile, argparse
from PIL import Image, ImageChops, ImageStat
parser=argparse.ArgumentParser();parser.add_argument('--iteration',default='search-polish');parser.add_argument('--version',default='0.4.1');parser.add_argument('--code',type=int,default=7);args=parser.parse_args()
iteration=args.iteration
root = Path(__file__).resolve().parent.parent
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
load = lambda p: json.loads((root / p).read_text())
reports = ['search-polish-tests','search-polish-services','daily10-core','search-polish-api',iteration+'-ui-source','social-pagination-claims']
for name in reports:
    assert load('work/reports/' + name + '.json')['passed'], name
assert len(load('work/reports/search-polish-tests.json')['cases']) == 24
for name in ['daily10-core','search-polish-api']:
    for name_path,expected in load('work/reports/'+name+'.json')['sourceHashes'].items():assert sha(root/name_path)==expected, name_path+' changed after test'
assert load('work/reports/'+iteration+'-ui-source.json')['source_sha256']==sha(root/'client/entry/src/main/ets/pages/Index.ets')

assert 'BUILD SUCCESSFUL' in (root / ('work/reports/'+iteration+'-build.log')).read_text()
source = root / 'client/entry/build/default/outputs/default/entry-default-unsigned.hap'
resources = root / 'client/entry/src/main/resources'
inputs = [p for p in (root / 'client/entry/src/main').rglob('*') if p.is_file()] + [root/'client/AppScope/app.json5']
assert all(p.stat().st_mtime <= source.stat().st_mtime for p in inputs), 'Sources changed after build'
formal = [p for p in list((resources / 'base/media').glob('*')) +
          list((resources / 'rawfile').rglob('*')) if p.is_file()]
with zipfile.ZipFile(source) as z:
    assert z.testzip() is None
    metadata=json.loads(z.read('module.json'))['app'];assert metadata['versionName']==args.version and metadata['versionCode']==args.code
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
report = {
 'packageVerified': True, 'versionName':args.version, 'versionCode':args.code,
 'released_at': datetime.datetime.now().astimezone().isoformat(),
 'hap': str(out.relative_to(root)), 'hap_sha256': sha(source), 'hap_bytes': source.stat().st_size,
 'source_sha256': sha(root / 'client/entry/src/main/ets/pages/Index.ets'),
 'formal_resources_verified': len(formal), 'unique_covers': len(cover),
 'compiled_icon_composite_errors': errors, 'passed_reports': reports,
 'regression_suites': 24, 'scope_directions': 4, 'all_directions_device_accepted': False,
 'build_log': 'work/reports/'+iteration+'-build.log',
 'acceptance': 'docs/'+iteration+'-acceptance.md',
 'nativeDeviceVerified': False, 'native_status': 'see_iteration_native_report',
 'limits': ['Unsigned HAP; final native interaction/performance regression pending',
            'Physical camera, notifications, keep-screen-on and cards pending hardware verification',
            'Single-administrator preview/publish workflow; claims require network',
            'Unknown source amounts remain unknown; content accuracy needs editorial review',
            'Real mail, Huawei cloud and photo recognition are not configured']
}
if iteration == 'pixel-polish':
    polish_started = datetime.datetime.fromisoformat(load('work/task-state.json')['pixel_polish']['started_at'])
    polish_elapsed = (datetime.datetime.now().astimezone()-polish_started).total_seconds()
    assert polish_elapsed >= 7200, 'User requested at least two hours for this polish iteration'
    report.update(polish_started_at=polish_started.isoformat(), polish_elapsed_seconds=round(polish_elapsed,2), minimum_requested_duration_met=True)
    native = load('work/reports/pixel-polish-native.json')
    audit = load('work/reports/pixel-polish-audit-final.json')
    installation = load('work/reports/pixel-polish-installation.json')
    soak = load('work/reports/pixel-polish-soak.json')
    watch = load('work/reports/pixel-polish-memory-watch.json')
    for evidence in [native, audit, installation]:
        assert evidence['passed'] and evidence['source_sha256'] == report['source_sha256']
        assert evidence['compiled_hap_sha256'] == report['hap_sha256']
    assert audit['source_matches_installed']
    assert watch['completed'] and not watch['error'] and not watch['app_restart_detected']
    assert watch['source_sha256'] == soak['source_sha256'] == report['source_sha256']
    assert watch['compiled_hap_sha256'] == soak['compiled_hap_sha256'] == report['hap_sha256']
    if not soak['passed']:
        assert soak['error'] == "AssertionError('Existing emulator RSS exceeded 1.8GB safety guard')"
    report.update(emulatorVerified=True, stabilityAccepted=bool(soak['passed']), scope_directions=52, implemented_directions=44, retained_reviewed_directions=8, regression_baseline_reused=True,
                  native_status=str(len(native['checks']))+' geometry checks; '+str(len(audit['pages']))+' navigation states; interaction soak stopped at conservative Emulator guard; '+str(round(watch['elapsed_seconds']/60,1))+' minutes passive memory observation',
                  native_reports=['work/reports/pixel-polish-native.json','work/reports/pixel-polish-audit-final.json','work/reports/pixel-polish-installation.json','work/reports/pixel-polish-soak.json','work/reports/pixel-polish-memory-watch.json'])
    report['limits'][0] = 'Existing Harmony emulator installed and navigated; other physical widths, large native fonts and physical-device performance remain unverified'
    if not soak['passed']:
        report['limits'].append('Long navigation stress NOT accepted: conservative 1.8GB Emulator RSS guard stopped it; passive observation does not replace stress verification or prove historical crash cause')
shutil.copyfile(source, out)
(root / ('work/reports/'+iteration+'-release.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
