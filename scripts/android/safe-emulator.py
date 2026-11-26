#!/usr/bin/env python3
"""Bounded, headless Android emulator for this task; never stops another process."""
import ctypes,fcntl,json,os,re,signal,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
REPORT=ROOT/'work/reports/android-emulator-memory.json'
SDK=Path.home()/'Library/Android/sdk'
GIB=1024**3
class Usage(ctypes.Structure):
    _fields_=[('uuid',ctypes.c_uint8*16)]+[(n,ctypes.c_uint64) for n in ('user','system','idle','interrupt','pageins','wired','resident','footprint','started','exited')]
lib=ctypes.CDLL('/usr/lib/libproc.dylib',use_errno=True)
lib.proc_pid_rusage.argtypes=[ctypes.c_int,ctypes.c_int,ctypes.c_void_p]
lib.proc_pid_rusage.restype=ctypes.c_int

def host():
    pressure=int(subprocess.check_output(['sysctl','-n','kern.memorystatus_vm_pressure_level'],text=True))
    v=subprocess.check_output(['vm_stat'],text=True)
    page=int(re.search(r'page size of (\d+)',v)[1])
    comp=int(re.search(r'Pages occupied by compressor:\s*(\d+)',v)[1])*page
    return {'pressure':pressure,'compressor_bytes':comp,'free_bytes':int(re.search(r'Pages free:\s*(\d+)',v)[1])*page}

def save(report):
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

def main():
    report={'launched':False,'status':'preflight','started_at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'samples':[],'peak_footprint_bytes':0,'peak_rss_bytes':0,'scope':'Only this isolated process group; no IDE window or emulator window.'}
    lock=(ROOT/'work/emulator-memory-guard.lock').open('a')
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    initial=host();report['initial_host']=initial
    if not (Path.home()/'.android/avd/kaifan-atd-36.avd/config.ini').is_file():
        report['status']='preflight_blocked_avd_not_configured';save(report);return
    processes=subprocess.check_output(['ps','-axo','comm='],text=True)
    if initial['pressure']!=1 or initial['compressor_bytes']>6*GIB or re.search(r'/(qemu-system[^/]*|emulator/Emulator)\s*$',processes,re.M):
        report['status']='preflight_blocked';save(report);return
    # Read-only second observation before launch. Does not infer safety from swap alone.
    time.sleep(2)
    if host()['pressure']!=1:report['status']='preflight_pressure_changed';save(report);return
    cmd=[str(SDK/'emulator/emulator'),'-avd','kaifan-atd-36','-no-window','-no-audio','-no-snapshot','-no-boot-anim','-memory','1024','-cores','2','-gpu','swiftshader_indirect','-port','5580','-camera-back','emulated','-camera-front','none']
    start=time.monotonic()
    with (ROOT/'work/reports/android-emulator.log').open('w') as log:
        proc=subprocess.Popen(cmd,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
        report.update(launched=True,pid=proc.pid,status='running',command=cmd);save(report)
        try:
            while proc.poll() is None:
                h=host();rss=foot=0
                ps=subprocess.check_output(['ps','-axo','pid=,pgid=,rss='],text=True)
                pids=[]
                for row in ps.splitlines():
                    p,g,r=map(int,row.split())
                    if g==proc.pid:
                        pids.append(p);rss+=r*1024
                        u=Usage()
                        if lib.proc_pid_rusage(p,0,ctypes.byref(u))==0:foot+=u.footprint
                elapsed=round(time.monotonic()-start,1)
                sample={'elapsed':elapsed,'pids':pids,'rss_bytes':rss,'footprint_bytes':foot,**h}
                report['samples']=(report['samples']+[sample])[-180:]
                report['peak_footprint_bytes']=max(report['peak_footprint_bytes'],foot)
                report['peak_rss_bytes']=max(report['peak_rss_bytes'],rss)
                reason=''
                if h['pressure']!=1:reason='host_memory_pressure_rose'
                elif foot>2.5*GIB:reason='own_group_footprint_above_2_5_gib'
                elif h['compressor_bytes']-initial['compressor_bytes']>0.75*GIB:reason='host_compressor_growth_above_0_75_gib'
                elif h['compressor_bytes']>6*GIB:reason='host_compressor_above_6_gib'
                elif elapsed>600:reason='ten_minute_test_budget'
                elif elapsed>180:
                    boot=subprocess.run([str(SDK/'platform-tools/adb'),'-s','emulator-5580','shell','getprop','sys.boot_completed'],capture_output=True,text=True,timeout=5)
                    if boot.stdout.strip()!='1':reason='boot_exceeded_three_minutes'
                if reason:report['status']=reason;save(report);break
                save(report);time.sleep(2)
        except KeyboardInterrupt:report['status']='stopped_by_task'
        except Exception as exc:report['status']='monitor_failed';report['error']=str(exc)
        finally:
            if proc.poll() is None:
                os.killpg(proc.pid,signal.SIGTERM)
                try:proc.wait(timeout=8)
                except subprocess.TimeoutExpired:os.killpg(proc.pid,signal.SIGKILL);proc.wait(timeout=5)
            if report['status']=='running':report['status']='emulator_exited'
            report['exit_code']=proc.returncode;report['elapsed_seconds']=round(time.monotonic()-start,1);save(report)
if __name__=='__main__':main()
