# coding: utf-8
"""只维护一份轻量任务状态，不创建检查点或项目副本。"""
import json,datetime,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'work/task-state.json';d=json.loads(p.read_text())
for name in ['native-smoke','native-design-smoke','native-meal-smoke','admin-ui']:
 assert json.loads((root/('work/reports/'+name+'.json')).read_text())['passed'],name+' 未通过'
assert 'BUILD SUCCESSFUL' in (root/'work/reports/client-build.txt').read_text()
assert (root/'work/reports/integration-all.txt').read_text().count('PASS ')==2
assert (root/'work/reports/rules-tests.txt').read_text().count('PASS ')==3
assert 'Valid configuration' in (root/'work/reports/caddy-validation.txt').read_text()
updates=[
'API-generated doodle hero, nine ingredients, four recipes and six navigation icons integrated with licensed ShikuHand subset font',
'Multi-dish diary editing and integer-cent estimates implemented; legacy compatibility and backend payload validation tests passed',
'20 formal generated illustration assets integrated, with five original canvases and detailed prompts retained',
'Reactive native choice components verified; three themes and month calendar passed real emulator interaction',
'Explicit field-level conflict comparison and merge implemented; metadata/photo preservation and stale-local-edit protection',
'Location rename atomically migrates foods and private templates; family invite retrieval/rotation and revoke serialization implemented',
'Redis per-user synchronization lock with PostgreSQL correctness fallback, contention response and family invite permission tests passed',
'Final native HAP installed and smoke tested, backend container healthy, Caddy and production Compose validated',
'Admin login rendered in headless Chromium; no JavaScript runtime errors',
'Honest acceptance matrix, design, deployment, API and route documents prepared; obsolete task artifacts cleaned'
]
for value in updates:
 if value not in d['completed']:d['completed'].append(value)
d['remaining']=[
'Physical device signing, camera/scanner success paths, reminder delivery and actual home-screen card instance verification',
'Remote HTTPS deployment explicitly deferred by user; complete local version first',
'P1 details listed honestly in docs/acceptance.md: complete public recipe filtering, community favorites, food-photo upload and additional offline/file-flow checks'
]
d['phase']='手绘撞色原生UI已验证；本地P1按验收表继续，云端依用户要求暂缓'
hap=root/'outputs/shiku-mvp-unsigned.hap';source=root/'client/entry/build/default/outputs/default/entry-default-unsigned.hap'
assert hap.read_bytes()==source.read_bytes(),'正式HAP尚未更新'
d['deliverable']={'path':str(hap.relative_to(root)),'sha256':hashlib.sha256(hap.read_bytes()).hexdigest(),'scope':'unsigned; installed and exercised on this task ARM64 emulator only'}
d['updated_at']=datetime.datetime.now().astimezone().isoformat();p.write_text(json.dumps(d,ensure_ascii=False,indent=2))
print('Task state updated; verified current deliverable SHA256 '+d['deliverable']['sha256'])
