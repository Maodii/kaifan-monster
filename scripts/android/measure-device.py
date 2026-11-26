#!/usr/bin/env python3
"""Explicit Android cold-start/memory baseline; never creates an emulator or installs an APK."""
import argparse, datetime, json, re, statistics, subprocess, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'work/reports/android-performance.json'
ADB = Path.home() / 'Library/Android/sdk/platform-tools/adb'
PACKAGE = 'com.kaifan.monster'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--serial', help='Exact adb device serial when more than one device is connected')
    parser.add_argument('--measure', action='store_true', help='Force-stop only this app and measure five cold process starts')
    args = parser.parse_args()
    report = {'measured': False, 'startedAt': datetime.datetime.now().astimezone().isoformat(),
              'scope': 'Android Activity launch timing and dumpsys memory; no UI-ready, frame-rate, photo or complete workflow assertion',
              'trials': [], 'limitations': ['am start timing is not first usable content', 'No reference-device performance target set']}
    def save():
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    def adb(*command):
        prefix = [str(ADB)] + (['-s', args.serial] if args.serial else [])
        result = subprocess.run(prefix + list(command), capture_output=True, text=True, timeout=40)
        if result.returncode:
            raise RuntimeError('adb operation failed: ' + ' '.join(command[:2]))
        return result.stdout
    try:
        if not ADB.is_file():
            report['status'] = 'not_executed_adb_unavailable'; return
        lines = adb('devices').splitlines()[1:]
        available = [line.split()[0] for line in lines if len(line.split()) >= 2 and line.split()[1] == 'device']
        if not available:
            report['status'] = 'not_executed_no_device'; return
        if args.serial and args.serial not in available:
            report['status'] = 'not_executed_requested_device_unavailable'; return
        if len(available) > 1 and not args.serial:
            report['status'] = 'not_executed_device_selection_required'; return
        args.serial = args.serial or available[0]
        if not args.measure:
            report['status'] = 'ready_run_with_measure_to_restart_app'; return
        if not adb('shell', 'pm', 'path', PACKAGE).startswith('package:'):
            report['status'] = 'not_executed_app_not_installed'; return
        report['device'] = {key: adb('shell', 'getprop', prop).strip() for key, prop in
                            [('model', 'ro.product.model'), ('sdk', 'ro.build.version.sdk'), ('release', 'ro.build.version.release')]}
        package = adb('shell', 'dumpsys', 'package', PACKAGE)
        report['version'] = {key: (re.search(pattern, package).group(1) if re.search(pattern, package) else '') for key, pattern in
                             [('code', r'versionCode=(\d+)'), ('name', r'versionName=([^\s]+)')]}
        for _ in range(5):
            adb('shell', 'am', 'force-stop', PACKAGE)
            start = adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
            if 'Status: ok' not in start or 'Error:' in start:
                raise RuntimeError('Activity start did not report success')
            time.sleep(2)
            memory = adb('shell', 'dumpsys', 'meminfo', PACKAGE)
            total = re.search(r'TOTAL PSS:\s*(\d+)', memory)
            if not total:
                total = re.search(r'^\s*TOTAL\s+(\d+)', memory, re.M)
            elapsed = re.search(r'TotalTime:\s*(\d+)', start)
            if not elapsed or not total:
                raise RuntimeError('Device output does not include required timing/memory fields')
            report['trials'].append({'activityTotalTimeMs': int(elapsed.group(1)), 'totalPssKiB': int(total.group(1))})
        values = sorted(x['activityTotalTimeMs'] for x in report['trials'])
        report.update(measured=True, status='measured', activityMedianMs=statistics.median(values),
                      activityMaxMs=max(values), peakPssKiB=max(x['totalPssKiB'] for x in report['trials']))
    except (RuntimeError, subprocess.TimeoutExpired) as error:
        report.update(status='failed', error=str(error))
    finally:
        save()
        print(json.dumps({'status': report.get('status'), 'measured': report['measured'], 'report': str(REPORT.relative_to(ROOT))}))

if __name__ == '__main__':
    main()
