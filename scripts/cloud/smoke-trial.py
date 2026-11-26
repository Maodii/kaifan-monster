#!/usr/bin/env python3
"""Exercise deployed services through SSH forwarding; never persist credentials."""
import base64
import datetime
import json
import os
import secrets
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ORIGIN = os.environ.get('SMOKE_ORIGIN','http://127.0.0.1:13000').rstrip('/')
BASE = ORIGIN + '/api/v1'
PUBLIC = ORIGIN.startswith('https://')
checks = []
accounts = []
success = False

def request(path, method='GET', data=None, token=None, status=200):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(BASE + path, data=json.dumps(data).encode() if data is not None else None, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            code, raw = response.status, response.read()
    except urllib.error.HTTPError as error:
        code, raw = error.code, error.read()
    assert code == status, f'{method} {path}: expected {status}, got {code}'
    return json.loads(raw) if raw else None

def passed(name):
    checks.append(name)
    print('PASS ' + name, flush=True)

try:
    request('/health')
    passed('cloud health')
    with urllib.request.urlopen(ORIGIN+'/admin/', timeout=20) as response:
        assert response.status == 200 and b'<html' in response.read().lower()
    passed('admin static application')
    request('/auth/admin-login', 'POST', {'email':'admin','password':'admin','deviceName':'trial-smoke'}, status=401)
    passed('weak admin login disabled')
    for index in range(2):
        email = f'trial-smoke-{uuid.uuid4().hex}@example.invalid'
        password = secrets.token_urlsafe(24)
        auth = request('/auth/register', 'POST', {'email':email,'password':password,'deviceName':'trial-smoke','displayName':'部署验证'}, status=201)
        accounts.append({'email':email,'password':password,'auth':auth})
    passed('two independent account registrations')
    account = accounts[0]
    auth = request('/auth/login','POST',{'email':account['email'],'password':account['password'],'deviceName':'trial-smoke'},status=201)
    refreshed = request('/auth/refresh','POST',{'refreshToken':auth['refreshToken']},status=201)
    account['auth'] = refreshed
    token = refreshed['accessToken']
    request('/auth/account',token=token)
    passed('login refresh and account profile')
    meal = str(uuid.uuid4())
    payload = {'name':'云端部署验证餐','date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'diningMode':'在家做','estimatedCost':12,'visibility':'private'}
    pushed = request('/sync/push','POST',{'changes':[{'changeId':str(uuid.uuid4()),'entityType':'meal_records','entityId':meal,'operation':'upsert','baseVersion':0,'modifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'payload':payload}]},token,status=201)
    assert meal in json.dumps(request('/records/meal_records',token=token))
    assert meal in json.dumps(request('/sync/pull?since=0',token=token))
    assert meal not in json.dumps(request('/records/meal_records',token=accounts[1]['auth']['accessToken']))
    passed('persisted sync and cross-account isolation')
    recipes = request('/catalog/recipes',token=token)
    assert len(recipes) > 0
    assert request('/catalog/taxonomy',token=token)
    request('/catalog/recommendations',token=token)
    request('/insights/admin/metrics',token=token,status=403)
    passed('seeded recipes taxonomy recommendations and admin authorization')
    photo = request('/photos/presign','POST',{'mealId':meal,'contentType':'image/png'},token,status=201)
    assert photo['uploadUrl'].startswith((ORIGIN if PUBLIC else 'http://127.0.0.1:19000')+'/shiku-photos/')
    png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=')
    with urllib.request.urlopen(urllib.request.Request(photo['uploadUrl'], data=png, headers={'Content-Type':'image/png'},method='PUT'),timeout=30) as response:
        assert response.status == 200
    request('/photos/'+photo['id']+'/complete','POST',{},token,status=201)
    url = request('/photos/'+photo['id']+'/download',token=token)['url']
    with urllib.request.urlopen(url,timeout=30) as response:
        assert response.read() == png
    request('/photos/'+photo['id']+'/download',token=accounts[1]['auth']['accessToken'],status=403)
    passed('private signed photo upload download and isolation')
    success = True
finally:
    for account in accounts:
        request('/auth/account','DELETE',{'password':account['password'],'confirmation':'注销我的账号'},account['auth']['accessToken'])
    Path('work/reports/public-https-smoke.json' if PUBLIC else 'work/reports/aliyun-trial-smoke.json').write_text(json.dumps({'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':success,'checks':checks,'ephemeral_accounts_closed':len(accounts),'scope':'Public HTTPS with normal system trust; native device runtime separate' if PUBLIC else 'SSH tunnel backend; native HTTPS not verified', 'origin':ORIGIN},ensure_ascii=False,indent=2)+'\n')
