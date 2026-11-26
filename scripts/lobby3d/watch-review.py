"""Maintain one lightweight review index while the existing renderer runs; never accepts artwork."""
from pathlib import Path
import json,os,time,sys,hashlib,datetime,subprocess
from render_provenance import current_source,equivalence,selected_views
ROOT=Path(__file__).resolve().parents[2];pid=int(sys.argv[1]);last=''
for iteration in range(1800):
 p=ROOT/'work/reports/lobby3d-cycles-production.json'
 try:
  contents=p.read_text();extras=[(q,q.read_text()) for q in (ROOT/'work/reports').glob('lobby3d-cycles-refined-*.json')];signature=hashlib.sha256((contents+''.join(t for _,t in extras)).encode()).hexdigest()
  if signature!=last:
   r=json.loads(contents);source=hashlib.sha256((ROOT/'art-source/lobby3d/detailed-spaces.blend').read_bytes()).hexdigest()
   historical=0
   manifest_path=ROOT/'work/artifacts.json';manifest=json.loads(manifest_path.read_text());known={f['path']:f for f in manifest['files']}
   views=selected_views(r,[json.loads(t) for _,t in extras])
   for render,batch_source in views.values():
    target=ROOT/render['path']
    if not target.is_file() or target.stat().st_size<1024:raise RuntimeError('Missing rendered output '+render['path'])
    entry=known.get(render['path'])
    if entry is None:entry={'path':render['path']};manifest['files'].append(entry)
    rendered=render.get('rendered_from_blend_sha256',batch_source);proof=equivalence(render['scene'],rendered,source);historical+=proof is None
    entry.update(kind='generated_art',purpose='Cycles原始部件与多角度审视；非设备截图，不代表美术验收',source_sha256=rendered,validated_source_sha256=source if proof is not None else None,equivalent_geometry_proofs=proof,evidence_status='current' if rendered==source else 'equivalent' if proof is not None else 'historical-source-changed',render_view=render['view'])
   manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
   state_path=ROOT/'work/task-state.json';state=json.loads(state_path.read_text());state['lobby3d']['production_refinement']['render_progress']={'status':r['status'],'views_completed':len(views),'original_batch_completed':len(r['renders']),'last_view':r['renders'][-1]['view'] if r['renders'] else None,'source_sha256':source,'checked_at':datetime.datetime.now().astimezone().isoformat(),'aesthetic_acceptance':False,'historical_views_pending_refresh':historical};state_path.write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n')
   subprocess.run([sys.executable,str(ROOT/'scripts/lobby3d/review-gallery.py')],cwd=ROOT,check=True)
   print('INDEX_UPDATED',len(r['renders']),r['status'],flush=True);last=signature
   if r['status']=='complete' and all(json.loads(t)['status'] in ['complete','cancelled_superseded'] for _,t in extras):break
  # A completed primary can exit while a focused correction batch remains healthy.
  if r['status']!='complete':os.kill(pid,0)
 except ProcessLookupError:raise RuntimeError('Renderer exited before complete report; inspect original render log')
 time.sleep(30)
else:raise RuntimeError('Review monitoring window exhausted; no automatic acceptance')
