"""Launch real loopback HTTP server with AI disabled, then stop only our child."""
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import time
import httpx

root = Path(__file__).resolve().parents[1]
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
token = secrets.token_hex(24)
env = dict(os.environ, AI_ENABLED='false', AI_ALLOW_OUTBOUND='false',
           AI_GATEWAY_TOKEN=token, AI_API_KEY='', AI_BASE_URL='', AI_MODEL='')
process = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app:app', '--host', '127.0.0.1',
                            '--port', str(port), '--no-access-log'], cwd=root, env=env,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    base = f'http://127.0.0.1:{port}'
    with httpx.Client(base_url=base, timeout=2, trust_env=False) as client:
        for _ in range(50):
            if process.poll() is not None:
                raise RuntimeError('gateway exited before readiness')
            try:
                health = client.get('/health')
                if health.is_success:
                    break
            except httpx.ConnectError:
                pass
            time.sleep(.1)
        else:
            raise RuntimeError('gateway not ready within 5 seconds')
        assert health.json()['enabled'] is False
        assert client.post('/v1/assist', json={'prompt': '晚饭怎么做'}).status_code == 401
        result = client.post('/v1/assist', headers={'Authorization': f'Bearer {token}'},
                             json={'prompt': '晚饭怎么做'})
        assert result.status_code == 200
        assert result.json()['source'] == 'fallback'
        assert result.json()['reason'] == 'disabled'
        print(json.dumps({'real_http': True, 'loopback_only': True, 'enabled': False,
                          'auth': 'passed', 'disabled_fallback': 'passed',
                          'real_model_calls': 0}))
finally:
    process.terminate()
    process.wait(timeout=5)
