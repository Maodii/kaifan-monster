"""Evidence for reusing only geometrically unchanged scenes across source corrections."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[2]
def current_source():return hashlib.sha256((ROOT/'art-source/lobby3d/detailed-spaces.blend').read_bytes()).hexdigest()
def equivalence(scene,rendered,current):
 if rendered==current:return []
 edges={}
 for p in (ROOT/'work/reports').glob('lobby3d-*-correction*.json'):
  try:d=json.loads(p.read_text())
  except (OSError,ValueError):continue
  if d.get('old_blend_sha256') and d.get('new_blend_sha256'):edges[d['old_blend_sha256']]=(d,p)
 path=[];seen=set()
 while rendered!=current and rendered not in seen:
  seen.add(rendered)
  if rendered not in edges:return None
  d,p=edges[rendered]
  if scene not in d.get('geometry_unchanged_scenes',[]):return None
  path.append(str(p.relative_to(ROOT)));rendered=d['new_blend_sha256']
 return path if rendered==current else None

def selected_views(primary, extras):
 """Prefer proven current geometry and production samples over stale/diagnostic images."""
 current=current_source();views={};ranks={}
 for batch in [primary]+extras:
  for render in batch.get('renders',[]):
   rendered=render.get('rendered_from_blend_sha256',batch.get('source_sha256'))
   proof=equivalence(render['scene'],rendered,current)
   target=ROOT/render['path']
   if not target.is_file():continue
   rank=(proof is not None,render.get('samples',0)>=384,rendered==current,render.get('samples',0),target.stat().st_mtime)
   if render['view'] not in ranks or rank>ranks[render['view']]:
    views[render['view']]=(render,batch.get('source_sha256'));ranks[render['view']]=rank
 return views
