#!/usr/bin/env python3
"""Opt-in launcher: observe physical footprint and stop only its own emulator.

Default is a read-only preflight. No automatic retry, data reset or host cleanup.
"""
import argparse
import ctypes
import fcntl
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import time

ROOT = Path(__file__).resolve().parent.parent
EMULATOR = '/Applications/DevEco-Studio.app/Contents/tools/emulator/Emulator'
GIB = 1024 ** 3


class Usage(ctypes.Structure):
    _fields_ = [('uuid', ctypes.c_uint8 * 16)] + [
        (name, ctypes.c_uint64) for name in (
            'user', 'system', 'idle', 'interrupt', 'pageins', 'wired',
            'resident', 'footprint', 'started', 'exited')]


def footprint(pid):
    usage = Usage()
    lib = ctypes.CDLL('/usr/lib/libproc.dylib', use_errno=True)
    lib.proc_pid_rusage.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_void_p]
    lib.proc_pid_rusage.restype = ctypes.c_int
    if lib.proc_pid_rusage(pid, 0, ctypes.byref(usage)) != 0:
        raise OSError(ctypes.get_errno(), 'Cannot read process physical footprint')
    return usage.footprint


def sysctl(name):
    return subprocess.check_output(['sysctl', '-n', name], text=True, timeout=5).strip()


def host_state():
    swap = sysctl('vm.swapusage')
    used = re.search(r'used\s*=\s*([\d.]+)M', swap)
    if not used:
        raise RuntimeError('Unrecognized swap metrics; refusing unmonitored launch')
    return {'ram_bytes': int(sysctl('hw.memsize')),
            'pressure_level': int(sysctl('kern.memorystatus_vm_pressure_level')),
            'swap_used_bytes': int(float(used[1]) * 1024 ** 2)}


def stop_reason(host, used, limit, previous=None, elapsed=0):
    if used >= limit:
        return 'emulator_physical_footprint_limit'
    if host['pressure_level'] >= 4:
        return 'host_critical_memory_pressure'
    if previous is not None and elapsed >= 90 and used > 4 * GIB and used - previous > 1.5 * GIB:
        return 'emulator_rapid_memory_growth'
    return ''


def save(report):
    dest = ROOT / 'work/reports/emulator-memory-guard.json'
    temp = dest.with_suffix('.tmp')
    temp.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    temp.replace(dest)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--start', action='store_true', help='Explicitly start guarded headless emulator')
    parser.add_argument('--max-seconds',type=int,default=0)
    parser.add_argument('--limit-gib',type=float,default=6)
    parser.add_argument('--stop-on-warning',action='store_true')
    args = parser.parse_args()
    if not 0.5<=args.limit_gib<=6 or args.max_seconds<0:parser.error('Invalid memory/time budget')
    host = host_state()
    report = {'time': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'host': host,
              'mode': 'start' if args.start else 'preflight', 'launched': False}
    blocked = host['pressure_level'] != 1 or host['swap_used_bytes'] > host['ram_bytes']
    report['safe_to_launch'] = not blocked
    if not args.start or blocked:
        report['status'] = 'blocked_host_memory_pressure' if blocked else 'preflight_passed'
        save(report)
        print(json.dumps(report, ensure_ascii=False))
        return 2 if args.start and blocked else 0
    # Only one guarded run; refuse an existing instance rather than stopping it.
    lock = (ROOT / 'work/emulator-memory-guard.lock').open('w')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    processes = subprocess.check_output(['ps', '-axo', 'comm='], text=True, timeout=5)
    if any(line.strip() == EMULATOR for line in processes.splitlines()):
        raise RuntimeError('An emulator already exists; no second instance started')
    if any('qemu-system-' in line or '/emulator/qemu/' in line for line in processes.splitlines()):
        raise RuntimeError('Android emulator already exists; no second platform instance started')
    command = [EMULATOR, '-start', 'Mate 90 Pro', '-instancePath',
               str(Path.home() / '.Huawei/Emulator/deployed'), '-imageRoot',
               str(Path.home() / 'Library/Huawei/Sdk'), '-bootMode', 'coldboot', '-noWindow']
    proc = subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
                            start_new_session=True)
    report.update(launched=True, pid=proc.pid, status='monitoring', peak_bytes=0,
                  limit_bytes=min(int(args.limit_gib * GIB), host['ram_bytes'] * 3 // 8))
    history = []
    started = time.monotonic()
    reason = ''
    try:
        while proc.poll() is None:
            now = time.monotonic()
            # Dedicated session: include emulator children as well as the main process.
            table = subprocess.check_output(['ps', '-axo', 'pid=,pgid='], text=True, timeout=5)
            pids = [int(row[0]) for line in table.splitlines()
                    if len(row := line.split()) == 2 and int(row[1]) == proc.pid]
            used = 0
            for pid in pids:
                try:
                    used += footprint(pid)
                except OSError:
                    if pid == proc.pid and proc.poll() is None:
                        raise
            host = host_state()
            baseline = next((value for stamp, value in reversed(history) if now - stamp >= 15), None)
            reason = stop_reason(host, used, report['limit_bytes'], baseline, now - started)
            if args.stop_on_warning and host['pressure_level']!=1:reason='host_warning_memory_pressure'
            if args.max_seconds and now-started>=args.max_seconds:reason='bounded_validation_window_complete'
            report.update(host=host, footprint_bytes=used, peak_bytes=max(report['peak_bytes'], used),
                          elapsed_seconds=round(now - started, 1))
            history.append((now, used))
            history = [(stamp, value) for stamp, value in history if now - stamp <= 20]
            save(report)
            if reason:
                break
            time.sleep(2)
    except BaseException as error:
        reason = 'monitor_interrupted_or_failed: ' + type(error).__name__
    finally:
        if proc.poll() is None:
            # Never signal a process group that we did not create.
            os.killpg(proc.pid, signal.SIGTERM)
            try:
                proc.wait(timeout=8)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL)
                proc.wait(timeout=5)
        report.update(status='stopped_by_guard' if reason else 'emulator_exited',
                      reason=reason, exit_code=proc.returncode)
        save(report)
        print(json.dumps(report, ensure_ascii=False))
    return 3 if reason else 0


if __name__ == '__main__':
    raise SystemExit(main())
