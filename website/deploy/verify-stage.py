#!/usr/bin/env python3
"""Verify the staged static site in an isolated, loopback-only Nginx instance."""
import hashlib
import json
import pathlib
import re
import subprocess
import time
import urllib.error
import urllib.request

site = pathlib.Path('/var/www/site.example.invalid')
deploy = site / 'deploy'
public = site / 'public'
server = json.loads((deploy / 'server.json').read_text())['host']
assert (site / '.managed-by-kaifanghost-website').is_file()
files = sorted(p for p in public.rglob('*') if p.is_file())
release = json.loads((public / 'downloads.json').read_text())
assert re.fullmatch(r'/downloads/kaifan-monster-[\d.]+-android\.apk', release['url'])
apk = public / release['url'].lstrip('/')
assert apk.stat().st_size == release['bytes']
assert hashlib.sha256(apk.read_bytes()).hexdigest() == release['sha256']
assert files and not any(p.suffix.lower() in {'.app', '.hap', '.pem', '.p12', '.key'} or (p.suffix.lower() == '.apk' and p != apk) for p in files)
assert not re.search(r'测试|提审|运营者|谢宇飞', (public / 'index.html').read_text())

# Validate full production syntax against the existing certificate without copying any key.
tls = (deploy / 'site-https.conf').read_text()
validation_tls = tls.replace('/etc/letsencrypt/live/site.example.invalid/', '/etc/letsencrypt/live/kaifan-ip/')
(deploy / 'syntax-https.conf').write_text(validation_tls)
syntax = deploy / 'syntax.conf'
syntax.write_text('pid /var/www/site.example.invalid/deploy/syntax.pid;\nerror_log stderr;\nevents {}\nhttp {\ninclude /etc/nginx/mime.types;\ninclude '+str(deploy / 'site-http.conf')+';\ninclude '+str(deploy / 'syntax-https.conf')+';\n}\n')
subprocess.run(['nginx', '-t', '-c', str(syntax)], check=True, capture_output=True)

body = tls.split('\nserver {', 1)[0]
body = re.sub(r'^\s*listen .*;\n', '', body, flags=re.M)
body = re.sub(r'^\s*ssl_.*;\n', '', body, flags=re.M)
body = re.sub(r'^\s*error_log .*;\n', '', body, flags=re.M)
body = body.replace('server {', 'server {\n    listen 127.0.0.1:14178;', 1)
config = deploy / 'loopback-verify.conf'
config.write_text('pid /var/www/site.example.invalid/deploy/loopback-verify.pid;\nerror_log stderr;\nevents {}\nhttp {\ninclude /etc/nginx/mime.types;\n'+body+'\n}\n')
subprocess.run(['nginx', '-t', '-c', str(config)], check=True, capture_output=True)
started = False
try:
    # A daemon retains stderr; PIPE would make communicate() wait for its entire lifetime.
    subprocess.run(['nginx', '-c', str(config)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
    started = True
    origin = 'http://127.0.0.1:14178'
    checks = []
    for p in files:
        if p.name == '_headers':
            continue
        url = origin + '/' + p.relative_to(public).as_posix()
        with urllib.request.urlopen(url, timeout=10) as response:
            assert hashlib.sha256(response.read()).digest() == hashlib.sha256(p.read_bytes()).digest()
            assert response.headers['X-Content-Type-Options'] == 'nosniff'
            assert "default-src 'self'" in response.headers['Content-Security-Policy']
            if p.suffix == '.js':
                assert 'javascript' in response.headers['Content-Type']
    checks.append('All public assets served byte-for-byte through isolated Nginx with security headers and correct JavaScript MIME')
    for path in ['/missing.html', '/.env', '/_headers', '/outputs/admin-access.md', '/downloads/kaifan-monster-android-release.apk', '/deploy/activate.sh']:
        try:
            urllib.request.urlopen(origin + path, timeout=10)
            raise AssertionError('Unexpectedly accessible: ' + path)
        except urllib.error.HTTPError as error:
            assert error.code == 404
    checks.append('Only the allowlisted Android release is public; private files and other packages return 404')
    enabled = pathlib.Path('/etc/nginx/sites-enabled/kaifanghost-https').exists()
    if not enabled:
        assert not pathlib.Path('/etc/nginx/sites-enabled/kaifanghost-http').exists()
        checks.append('Production domain configurations are staged but not enabled during ICP review')
    else:
        checks.append('Website update validated without changing enabled production configuration')
    subprocess.run(['nginx', '-t'], check=True, capture_output=True)
    with urllib.request.urlopen('http://127.0.0.1:3000/api/v1/health', timeout=10) as response:
        assert json.load(response)['status'] == 'ok'
    checks.append('Existing Nginx configuration and application API remain healthy')
    report = {'passed': True, 'verifiedAt': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'domain': 'site.example.invalid', 'server': server, 'publicRoot': str(public), 'files': [{'path':p.relative_to(public).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files], 'checks': checks, 'publicWebsiteEnabled': enabled, 'reason': 'Existing site update' if enabled else 'DNS and confirmed website ICP status required before public domain activation', 'certificateIssued': pathlib.Path('/etc/letsencrypt/live/site.example.invalid/fullchain.pem').exists()}
    (deploy / 'stage-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))
finally:
    if started:
        subprocess.run(['nginx', '-s', 'quit', '-c', str(config)], check=True, capture_output=True)
    for name in ['syntax-https.conf','syntax.conf','syntax.pid','loopback-verify.conf']:
        (deploy / name).unlink(missing_ok=True)
