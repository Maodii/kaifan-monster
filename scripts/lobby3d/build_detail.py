"""Build named, inspectable bespoke meshes; no live-editor or native-app changes."""
import sys,bpy,json,time,importlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'scripts/lobby3d/detail'))
import common as C
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
C.palette()
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
keys=args or ['pantry','meals','kitchen','community','profile'];reports=[]
for key in keys:
 print('BUILD_COMPONENTS',key,flush=True);C.start_scene(key);importlib.import_module(key).build();importlib.import_module('refinement').finish_all();reports.append(C.finalize(key));print('BUILT',key,reports[-1]['meshes'],reports[-1]['evaluated_triangles'],flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art-source/lobby3d/detailed-spaces.blend'))
p=ROOT/'work/reports/lobby3d-detail-models.json';old=json.loads(p.read_text()) if p.exists() else [];bykey={r['scene']:r for r in old};bykey.update({r['scene']:r for r in reports});p.write_text(json.dumps(list(bykey.values()),ensure_ascii=False,indent=2)+'\n')
manifest={('recipes' if r['scene']=='kitchen' else r['scene']):r['parts'] for r in bykey.values()};(ROOT/'prototypes/3d-lobby/parts.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print('DETAIL_EXPORT_COMPLETE',flush=True)
