#!/usr/bin/env python3
import hashlib,json,os,re,subprocess,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
APK=ROOT/'outputs/kaifan-monster-android-debug.apk'
BT=Path.home()/'Library/Android/sdk/build-tools/36.0.0'
def sha(data):return hashlib.sha256(data).hexdigest()
report={'passed':False,'checks':[],'device_tests':'See android-device-tests.json if present; absent means not executed.'}
try:
    sig=subprocess.check_output([str(BT/'apksigner'),'verify','--verbose',str(APK)],text=True,env={**os.environ,'JAVA_HOME':'/Applications/Android Studio.app/Contents/jbr/Contents/Home'})
    assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in sig
    assert 'Verified using v3 scheme (APK Signature Scheme v3): true' in sig
    report['checks'].append('APK v2/v3 signatures verified')
    with zipfile.ZipFile(APK) as z:
        assert z.testzip() is None
        packaged_core_hash=sha(z.read('assets/core.js'))
        packaged_web_hashes={f:sha(z.read('assets/'+f)) for f in ['index.html','app.js','parity.js','experience.js','daily.js','convenience.js','living.js','search.js','style.css']}
        for f in ['core.js','app.js','parity.js','experience.js','daily.js','convenience.js','living.js','search.js','style.css','index.html','recipes.json','cover-map.js']:
            assert z.read('assets/'+f)==(ROOT/'android/app/build/generated/assets'/f).read_bytes(),f
            if (ROOT/'android/web'/f).is_file():
                assert z.read('assets/'+f)==(ROOT/'android/web'/f).read_bytes(),f+' stale source'
        assert 'src="parity.js"' in z.read('assets/index.html').decode()
        assert 'src="experience.js"' in z.read('assets/index.html').decode()
        assert 'src="daily.js"' in z.read('assets/index.html').decode()
        assert 'src="convenience.js"' in z.read('assets/index.html').decode()
        assert 'src="living.js"' in z.read('assets/index.html').decode()
        assert 'src="search.js"' in z.read('assets/index.html').decode()
        assert '__modules["DailyLivingCore"]' in z.read('assets/core.js').decode()
        assert '__modules["EncryptedBackup"]' in z.read('assets/core.js').decode()
        assert z.read('assets/licenses/zxing-LICENSE.txt')==(ROOT/'android/licenses/zxing-LICENSE.txt').read_bytes()
        covers=re.findall(r"case '([^']+)': return \$r\('app.media.([^']+)'\)",(ROOT/'client/entry/src/main/ets/model/RecipeCoverMap.ets').read_text())
        assert len(covers)==454
        mapping=json.loads(z.read('assets/cover-map.js').decode().removeprefix('window.recipeCovers=').strip().removesuffix(';'))
        assert mapping=={id:'media/'+resource+'.webp' for id,resource in covers}
        assert 'window.recipeCovers[r.id]' in z.read('assets/app.js').decode()
        assert 'src="cover-map.js"' in z.read('assets/index.html').decode()
        assert z.read('res/drawable/app_icon.png')==(ROOT/'client/AppScope/resources/base/media/app_icon.png').read_bytes()
        assert z.read('assets/licenses/font-OFL.txt')==(ROOT/'art-source/fonts/OFL.txt').read_bytes()
        assert z.read('assets/fonts/shiku_hand.ttf')==(ROOT/'client/entry/src/main/resources/rawfile/fonts/shiku_hand.ttf').read_bytes()
        badge=subprocess.check_output([str(BT/'aapt2'),'dump','badging',str(APK)],text=True)
        assert "versionCode='12'" in badge and "versionName='0.6.0'" in badge
        assert "icon='res/drawable/app_icon.png'" in badge
        report['checks'].append('Actual UI cover map, formal launcher icon bytes and manifest binding, licensed shared font verified')
        for id,resource in covers:
            assert z.read('assets/media/'+resource+'.webp')==(ROOT/'client/entry/src/main/resources/base/media'/str(resource+'.webp')).read_bytes(),id
        media=ROOT/'client/entry/src/main/resources/base/media'
        all_media=[p for p in media.rglob('*') if p.is_file()]
        for p in all_media:
            assert z.read('assets/media/'+p.relative_to(media).as_posix())==p.read_bytes(),str(p)+' missing/stale media'
        build_info=json.loads(re.search(r'window\.kaifanBuild=(\{[^\n]+\});',z.read('assets/core.js').decode()).group(1))
        assert build_info['versionName']=='0.6.0' and build_info['versionCode']==12
        assert build_info['uiReferenceSha256']==sha((ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()),'UI reference changed since build'
        report['media_files_verified']=len(all_media)
        report['checks'].append('ZIP CRC, current JS/HTML/CSS/catalog/license and all 454 canonical ID covers match')
        report['entries']=len(z.namelist())
    core=json.loads((ROOT/'work/reports/android-shared-core.json').read_text())
    for name,expected in core['sourceHashes'].items():assert sha((ROOT/'client/entry/src/main/ets/model'/str(name+'.ets')).read_bytes())==expected,name
    report['checks'].append('All '+str(len(core['sourceHashes']))+' canonical source hashes match generated core manifest')
    frozen_index='7c99295e818ebd2604241865e6beb1a14be72705a0414caa4827450b2fd00e6b'
    assert build_info['uiReferenceSha256']==frozen_index,'Different Index than the authorized freeze'
    assert len(core['sourceHashes'])==32
    for f in ['android-core-tests.json','android-ui-tests.json','android-next20-tests.json','android-next10-tests.json','android-living-tests.json']:
        tests=json.loads((ROOT/'work/reports'/f).read_text());assert tests['passed'],f
        assert tests['generated_core_sha256']==packaged_core_hash,f+' tested another core'
        assert not tests.get('reference_only_rebind'),f+' must be newly executed'
        if f=='android-ui-tests.json':
            assert tests['web_source_sha256']==packaged_web_hashes,'Full UI tested another presentation'
            assert len(tests['checks'])==59
            responsive=tests['responsive']
            assert responsive['passed'] and len(responsive['measurements'])==504
            assert responsive['test_source_sha256']==sha((ROOT/'scripts/android/check-responsive.cjs').read_bytes())
            assert not any(m['failures'] for m in responsive['measurements'])
        report['checks'].append(f+': '+str(len(tests['checks']))+' freshly executed groups; packaged core hash bound')
    targeted=json.loads((ROOT/'work/reports/android-pixel-polish.json').read_text())
    assert targeted['passed'] and targeted['generated_core_sha256']==packaged_core_hash
    assert targeted['web_source_sha256']==packaged_web_hashes
    pixel=targeted['pixel_polish'];assert pixel['passed'] and len(pixel['controls'])==19
    assert len(pixel['walkthrough'])==75 and not any(m['failures'] for m in pixel['walkthrough'])
    assert pixel['test_source_sha256']==sha((ROOT/'scripts/android/check-pixel-polish.cjs').read_bytes())
    report['checks'].append('Fresh pixel polish:19 control checks including switch keyboard toggle and crayon pigment;15 pages x5 viewport/text scenarios including2x text; packaged hashes bound')
    report['fresh_validation']={'core_sha256':packaged_core_hash,'full_ui':'work/reports/android-ui-tests.json','pixel_polish':'work/reports/android-pixel-polish.json','responsive_cases':504,'pixel_walkthrough_cases':75,'retained_evidence_used':False}
    motion=json.loads((ROOT/'work/reports/android-motion.json').read_text())
    assert motion['passed'] and motion['generated_core_sha256']==packaged_core_hash
    assert not motion['draft_ui_not_packaged'] and motion['web_source_sha256']==packaged_web_hashes
    assert motion['motion']['passed'] and len(motion['motion']['checks'])>=15
    assert motion['motion']['module_sha256']==sha((ROOT/'scripts/android/check-motion.cjs').read_bytes())
    report['checks'].append('Fresh bounded-motion checks including missing-core watchdog, API failure, lifecycle, form preservation and eleven checkless filter groups; packaged hashes bound')
    contrast=json.loads((ROOT/'work/reports/android-brush-contrast.json').read_text())
    assert contrast['passed'] and contrast['generated_core_sha256']==packaged_core_hash
    assert contrast['style_sha256']==packaged_web_hashes['style.css']
    assert len(contrast['rows'])==5
    for row in contrast['rows']:
        assert row['p05']>=4.5 and row['image_sha256']==sha((ROOT/row['image']).read_bytes())
    report['checks'].append('Five representative alpha-composited brush/color samples meet fifth-percentile4.5 contrast; current CSS/core/image hashes bound; not an exhaustive page audit')
    assert sha((ROOT/'android/app/libs/zxing-core-3.5.3.jar').read_bytes())=='8d8064c1636fdaef7189dd9055c7d59950a8940a12f2293956446ec3c109fd82'
    report['checks'].append('Pinned ZXing binary SHA256 matches')
    native_crypto=json.loads((ROOT/'work/reports/android-backup-crypto-tests.json').read_text())
    assert native_crypto['passed']
    assert native_crypto['native_source_sha256']==sha((ROOT/'android/app/src/main/java/com/kaifan/monster/BackupCrypto.java').read_bytes())
    report['checks'].append('Production Java backup crypto: '+str(len(native_crypto['checks']))+' host interoperability groups, source hash bound')
    report['apk']={'path':str(APK.relative_to(ROOT)),'bytes':APK.stat().st_size,'sha256':sha(APK.read_bytes()),'package':'com.kaifan.monster','minSdk':26,'targetSdk':36,'versionCode':12,'versionName':'0.6.0','debug':True}
    report['ui_reference']={'path':'client/entry/src/main/ets/pages/Index.ets','sha256':sha((ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()),'pixel_parity_verified':False}
    report['source_hashes']={str(p.relative_to(ROOT)):sha(p.read_bytes()) for folder in ['android/web','android/app/src/main/java','android/app/src/main/res'] for p in (ROOT/folder).rglob('*') if p.is_file()}
    report['checks'].append('Existing HarmonyOS HAP remains present')
    assert (ROOT/'outputs/shiku-mvp-unsigned.hap').is_file()
    report['passed']=True
    print('PASS release:',len(report['checks']),'groups;',report['apk']['bytes'],'bytes')
finally:
    (ROOT/'work/reports/android-release.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
