"""Inspect actual release packages before allowing an Android download to be published."""
import datetime, hashlib, io, json, os, pathlib, re, subprocess, zipfile

root = pathlib.Path(__file__).resolve().parents[2]
apk = root / 'outputs/kaifan-monster-android-release.apk'
harmony = root / 'outputs/kaifan-monster-harmony-release.app'
tools = pathlib.Path.home() / 'Library/Android/sdk/build-tools/36.0.0'
env = {**os.environ, 'JAVA_HOME': '/Applications/Android Studio.app/Contents/jbr/Contents/Home'}
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
badge = subprocess.check_output([str(tools/'aapt2'), 'dump', 'badging', str(apk)], text=True)
package, code, version = re.search(r"package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'", badge).groups()
assert package == 'com.kaifan.monster' and 'application-debuggable' not in badge
signature = subprocess.check_output([str(tools/'apksigner'), 'verify', '--verbose', '--print-certs', str(apk)], env=env, text=True)
assert all(f'Verified using v{v} scheme' in signature and re.search(fr'Verified using v{v} scheme[^\n]*: true', signature) for v in [2,3])
with zipfile.ZipFile(harmony) as outer, zipfile.ZipFile(apk) as android:
    assert outer.testzip() is None and android.testzip() is None
    info = json.loads(outer.read('pack.info'))['summary']['app']
    assert info['bundleName'] == 'com.shiku.foodkeeper'
    assert info['version'] == {'name': version, 'code': int(code)}, 'Android/Harmony release versions differ'
    with zipfile.ZipFile(io.BytesIO(outer.read('entry-default.hap'))) as hap:
        assert json.loads(hap.read('module.json'))['app']['versionName'] == version
        for filename in ['recipes.json','release-legal.json']:
            assert hap.read('resources/rawfile/'+filename) == (root/'client/entry/src/main/resources/rawfile'/filename).read_bytes(), filename+' changed after Harmony build'
        assert android.read('assets/recipes.json') == hap.read('resources/rawfile/recipes.json')
    for file in (root/'android/web').glob('*'):
        if file.is_file() and 'assets/'+file.name in android.namelist():
            assert android.read('assets/'+file.name) == file.read_bytes(), 'Stale Android UI: '+file.name
    assert android.read('assets/core.js') == (root/'android/app/build/generated/assets/core.js').read_bytes()
shared = json.loads((root/'work/reports/android-shared-core.json').read_text())
for name, sha in shared['sourceHashes'].items():
    assert digest(root/f'client/entry/src/main/ets/model/{name}.ets') == sha
report = {
    'passed': True, 'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'version': version, 'versionCode': int(code), 'package': package, 'minAndroid': '8.0',
    'source': str(apk.relative_to(root)), 'url': f'/downloads/kaifan-monster-{version}-android.apk',
    'bytes': apk.stat().st_size, 'sha256': digest(apk),
    'harmonySource': str(harmony.relative_to(root)), 'harmonySha256': digest(harmony),
    'appGalleryUrl': 'https://appgallery.huawei.com/app/detail?id=com.shiku.foodkeeper',
    'signatures': ['v2','v3'], 'debuggable': False,
    'certificateSha256': re.search(r'Signer #1 certificate SHA-256 digest: (\S+)', signature)[1],
    'checks': ['Actual Android and Harmony package versions match', 'Release v2/v3 signature verified', 'Packaged Android UI, shared models, catalog and legal configuration match current sources'],
    'limitations': ['No physical device installation verified', 'Public AppGallery desktop page does not expose the listed version']
}
(root/'website/release.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
