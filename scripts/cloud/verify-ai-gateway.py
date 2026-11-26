#!/usr/bin/env python3
"""Run bounded local validation, recording evidence without keys or model calls."""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
python = str(root / 'ai-gateway/.venv/bin/python')
checks = []
commands = [
    ('unit_tests', [python, '-m', 'unittest', 'discover', '-s', 'ai-gateway/tests', '-v']),
    ('loopback_http_smoke', [python, 'ai-gateway/tests/wire_smoke.py']),
    ('compose_validation', ['docker', 'compose', '--env-file', '/dev/null', '-f', 'compose.ai.yaml', 'config', '--quiet']),
    ('compose_default_profile_disabled', ['docker', 'compose', '--env-file', '/dev/null', '-f', 'compose.ai.yaml', 'config', '--services']),
    ('compose_cloud_network_overlay', ['docker', 'compose', '--env-file', '/dev/null', '-f', 'compose.ai.yaml', '-f', 'compose.ai.cloud.yaml', '--profile', 'ai', 'config', '--quiet']),
    ('compose_business_api_overlay', ['docker', 'compose', '--env-file', '/dev/null', '-f', 'compose.yaml', '-f', 'compose.app.yaml', '-f', 'compose.trial.yaml', '-f', 'compose.ai.api.yaml', 'config', '--quiet', '--no-env-resolution']),
]
test_env = dict(os.environ, AI_ENABLED='false', AI_ALLOW_OUTBOUND='false',
                AI_GATEWAY_TOKEN='test-token-' + 'x' * 32, AI_BASE_URL='', AI_MODEL='', AI_API_KEY='',
                POSTGRES_USER='test', POSTGRES_DB='test', POSTGRES_PASSWORD='test-only',
                REDIS_PASSWORD='test-only', MINIO_ROOT_USER='test-only', MINIO_ROOT_PASSWORD='test-only')
for name, command in commands:
    result = subprocess.run(command, cwd=root, env=test_env, capture_output=True, text=True, timeout=30)
    passed = result.returncode == 0
    if name == 'compose_default_profile_disabled':
        passed = passed and not result.stdout.strip()
    checks.append({'name': name, 'passed': passed, 'exit_code': result.returncode,
                   'evidence': (result.stdout + result.stderr).strip()})
sources = ['ai-gateway/app.py', 'ai-gateway/tests/test_gateway.py', 'ai-gateway/tests/wire_smoke.py',
           'ai-gateway/Dockerfile', 'ai-gateway/requirements.lock', 'compose.ai.yaml',
           'compose.ai.cloud.yaml', 'compose.ai.api.yaml']
report = {'checked_at': datetime.now(timezone.utc).isoformat(), 'scope': 'local mock and loopback HTTP validation only', 'checks': checks,
          'real_model_calls': 0, 'paid_model_calls': 0,
          'limitations': ['Real model/cloud container results are recorded separately in server-ai-cloud.json',
                          'Business route and phone UI verification belong to original chat'],
          'sha256': {p: hashlib.sha256((root / p).read_bytes()).hexdigest() for p in sources}}
path = root / 'work/reports/server-ai-verification.json'
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
passed = all(x['passed'] for x in checks)
print(json.dumps({'passed': passed, 'checks': len(checks), 'report': str(path)}))
raise SystemExit(0 if passed else 1)
