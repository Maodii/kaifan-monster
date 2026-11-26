#!/usr/bin/env python3
"""Start an isolated server preview on loopback; no production gateway changes."""
import pathlib
import re
import subprocess

site=pathlib.Path('/var/www/site.example.invalid')
assert (site/'.managed-by-kaifanghost-website').is_file()
deploy=site/'deploy'
body=(deploy/'site-https.conf').read_text().split('\nserver {',1)[0]
body=re.sub(r'^\s*(listen |ssl_|error_log ).*;\n','',body,flags=re.M)
body=body.replace('server {','server {\n    listen 127.0.0.1:14179;',1)
config=deploy/'private-preview.conf'
pidfile=deploy/'private-preview.pid'
config.write_text(f'pid {pidfile};\nerror_log stderr;\nevents {{}}\nhttp {{\ninclude /etc/nginx/mime.types;\n{body}\n}}\n')
subprocess.run(['nginx','-t','-c',str(config)],check=True,capture_output=True,timeout=10)
running=False
if pidfile.exists():
    try:
        pid=int(pidfile.read_text().strip())
        running=str(config).encode() in pathlib.Path(f'/proc/{pid}/cmdline').read_bytes()
    except (FileNotFoundError,ValueError):pass
if not running:
    subprocess.run(['nginx','-c',str(config)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=10)
print('Private server preview ready at 127.0.0.1:14179; access via SSH tunnel only.')
