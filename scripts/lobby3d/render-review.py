"""Bounded, overwrite-in-place Cycles inspection renders; no project snapshots."""
import bpy,sys,json,time,math,hashlib
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/lobby3d'))
from render_provenance import equivalence
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
view_prefixes=[a.split('=',1)[1] for a in args if a.startswith('--view-prefix=')]
view_exact=[a.split('=',1)[1] for a in args if a.startswith('--view-exact=')]
report_name=next((a.split('=',1)[1] for a in args if a.startswith('--report=')),None)
render_threads=int(next((a.split('=',1)[1] for a in args if a.startswith('--render-threads=')),'3'))
assert 1<=render_threads<=3
if report_name:assert report_name.replace('-','').isalnum()
args=[a for a in args if not a.startswith(('--view-prefix=','--view-exact=','--report=','--render-threads='))]
preview='--preview' in args;quality='--production' in args;quick='--quick' in args;args=[a for a in args if a not in ['--production','--quick','--preview']];keys=args or ['meals','kitchen','pantry','community','profile']
OUT=ROOT/('work/generated-art/lobby3d/previews' if preview else 'work/generated-art/lobby3d/review');OUT.mkdir(parents=True,exist_ok=True)
report_path=ROOT/('work/reports/lobby3d-cycles-previews.json' if preview else 'work/reports/lobby3d-cycles-production.json' if quality else 'work/reports/lobby3d-cycles-fast.json' if quick else 'work/reports/lobby3d-cycles-review.json');report={'started':time.time(),'source_sha256':hashlib.sha256((ROOT/'art-source/lobby3d/detailed-spaces.blend').read_bytes()).hexdigest(),'engine':'Cycles CPU 1 thread' if preview else 'Cycles CPU 3 threads','quality':'transparent offline scene preview' if preview else 'production multi-angle' if quality else 'fast source review' if quick else 'inspection','renders':[],'status':'running'}

previous={}
if report_name:
 report_path=ROOT/f'work/reports/lobby3d-cycles-{report_name}.json'
 report['engine']=f'Cycles CPU {render_threads} threads'
 OUT=ROOT/f'work/generated-art/lobby3d/review-{report_name}';OUT.mkdir(parents=True,exist_ok=True)
if (quality or preview) and report_path.exists():
 prior=json.loads(report_path.read_text())
 if prior.get('quality')==report['quality']:
  usable=[]
  for r in prior.get('renders',[]):
   rendered=r.get('rendered_from_blend_sha256',prior.get('source_sha256'))
   proof=equivalence(r['scene'],rendered,report['source_sha256'])
   if proof is None:continue
   r['rendered_from_blend_sha256']=rendered
   r['equivalent_geometry_proofs']=proof
   usable.append(r)
  previous={r['view']:r for r in usable}
  report['started']=prior['started']
  report['source_revisions']=prior.get('source_revisions',[])
  if prior.get('source_sha256')!=report['source_sha256']:
   report['source_revisions'].append({'from':prior.get('source_sha256'),'to':report['source_sha256'],'resumed_scenes':keys,'reason':'Changed source loaded for remaining scenes; every retained frame keeps its original source hash'})
  retained=usable if preview else prior.get('renders',[])
  report['renders']=[dict(r,rendered_from_blend_sha256=r.get('rendered_from_blend_sha256',prior.get('source_sha256'))) for r in retained if r['scene'] not in keys]

def descendants(ob):
 return [ob]+list(ob.children_recursive)
def bounds(objects):
 pts=[o.matrix_world@Vector(c) for o in objects if o.type=='MESH' for c in o.bound_box]
 if not pts:return Vector(),Vector((1,1,1))
 mn=Vector([min(p[a] for p in pts) for a in range(3)]);mx=Vector([max(p[a] for p in pts) for a in range(3)]);return (mn+mx)*.5,mx-mn

def configure(sc):
 bpy.context.window.scene=sc
 sc.render.engine='CYCLES';sc.cycles.device='CPU';sc.render.threads_mode='FIXED';sc.render.threads=1 if preview else render_threads;sc.cycles.use_denoising=True;sc.cycles.adaptive_threshold=.010 if quality else .025;sc.cycles.max_bounces=8;sc.cycles.diffuse_bounces=4;sc.cycles.glossy_bounces=4;sc.cycles.transparent_max_bounces=8
 sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA' if preview else 'RGB';sc.render.resolution_percentage=100;sc.render.film_transparent=preview;sc.view_settings.view_transform='AgX'
 world=bpy.data.worlds.new('Review neutral studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.70,.76,.79,1);world.node_tree.nodes['Background'].inputs[1].default_value=.30;sc.world=world
 for name,pos,power,size,color in [('Broad warm key',(-4,-6,10),1500,7,(1,.87,.71)),('Soft cool fill',(6,-2,6),800,6,(.76,.88,1)),('Top rear sheen',(1,6,9),1800,5,(1,.91,.81))]:
  light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size;light.color=color;ob=bpy.data.objects.new(name,light);sc.collection.objects.link(ob);ob.location=pos;ob.rotation_euler=(Vector((0,0,1.5))-ob.location).to_track_quat('-Z','Y').to_euler()
 camera=bpy.data.objects.new('Inspection camera',bpy.data.cameras.new('Inspection lens'));sc.collection.objects.link(camera);sc.camera=camera;camera.data.type='ORTHO';camera.data.lens=52
 return camera

def render(sc,cam,name,objects,angle=(.68,-1,.72),pixels=(1440,1200),samples=192,isolate=False,inspection_note=None):
 if view_exact and name not in view_exact:return
 if view_prefixes and not any(name.startswith(prefix) for prefix in view_prefixes):return
 if preview:pixels=(2048,1664);samples=128
 if quick:pixels=(960,800) if pixels[0]>=pixels[1] else (800,960);samples=48
 if quality:pixels=(2048,1664) if pixels[0]>=pixels[1] else (1664,2048);samples=384
 start=time.time();all_meshes=[o for o in sc.objects if o.type=='MESH'];old={o:o.hide_render for o in all_meshes};chosen=set(objects)
 if isolate:
  for o in all_meshes:o.hide_render=o not in chosen
 center,size=bounds(objects);direction=Vector(angle).normalized();cam.location=center+direction*max(size.length*1.7,4);cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
 bpy.context.view_layer.update();inv=cam.matrix_world.inverted();corners=[inv@(o.matrix_world@Vector(c)) for o in objects if o.type=='MESH' for c in o.bound_box];aspect=pixels[0]/pixels[1]
 cam.data.ortho_scale=max((max(p.x for p in corners)-min(p.x for p in corners))/aspect,max(p.y for p in corners)-min(p.y for p in corners))*1.17
 sc.render.resolution_x,sc.render.resolution_y=pixels;sc.cycles.samples=samples;path=OUT/f'{name}.png';sc.render.filepath=str(path)
 # Blender AUTO sensor fitting makes ortho_scale horizontal on a landscape frame.
 # Verify the actual projection instead of assuming an OpenGL vertical field of view.
 def envelope():
  pts=[world_to_camera_view(sc,cam,o.matrix_world@Vector(c)) for o in objects if o.type=='MESH' for c in o.bound_box]
  return [min(p.x for p in pts),max(p.x for p in pts),min(p.y for p in pts),max(p.y for p in pts)]
 fit=envelope();prior=previous.get(name)
 if prior and (prior.get('camera_direction')==list(angle) or ('camera_direction' not in prior and not name.endswith('-interior'))) and path.exists() and path.stat().st_size>1024 and (prior.get('camera_fit') or (min(fit[0],fit[2])>=.035 and max(fit[1],fit[3])<=.965)):
  # Reuse only same-source completed output whose old camera is geometrically proven to fit.
  if not prior.get('camera_fit'):prior['camera_fit']={'envelope':fit,'verified_existing_projection':True}
  report['renders'].append(prior);report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('REVIEW_REUSED',name,flush=True)
  for o,hidden in old.items():o.hide_render=hidden
  return
 for attempt in range(8):
  fit=envelope();extent=max(abs(fit[0]-.5),abs(fit[1]-.5),abs(fit[2]-.5),abs(fit[3]-.5))
  if extent<=.445:break
  cam.data.ortho_scale*=max(1.01,extent/.44)
 else:raise RuntimeError('Camera does not fit '+name)
 fit=envelope()

 print('REVIEW_START',name,'samples',samples,'pixels',pixels,flush=True);result=bpy.ops.render.render(write_still=True)
 if 'FINISHED' not in result or not path.exists() or path.stat().st_mtime<start or path.stat().st_size<1024:raise RuntimeError('Render cancelled or output not refreshed: '+name)
 for o,hidden in old.items():o.hide_render=hidden
 entry={'path':str(path.relative_to(ROOT)),'scene':sc.name,'view':name,'seconds':round(time.time()-start,2),'samples':samples,'pixels':pixels,'isolated':isolate,'inspection_note':inspection_note,'rendered_from_blend_sha256':report['source_sha256'],'camera_direction':list(angle),'camera_fit':{'envelope':fit,'verified_existing_projection':False}};report['renders'].append(entry);report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('REVIEW_SAVED',name,entry['seconds'],flush=True)

for key in keys:
 sc=bpy.data.scenes.get(key)
 if not sc:raise RuntimeError('Missing complete source scene '+key)
 cam=configure(sc);meshes=[o for o in sc.objects if o.type=='MESH']
 render(sc,cam,key+'-full',meshes)
 if quality:
  render(sc,cam,key+'-full-front',meshes,angle=(0,-1,.58))
  render(sc,cam,key+'-full-rear',meshes,angle=(-.7,1,.72))
 for ob in list(sc.objects):
  if quick or preview or not ob.name.startswith('part_'):continue
  # A part nested under a larger part is separately inspected as well.
  objects=[o for o in descendants(ob) if o.type=='MESH']
  if not objects:continue
  render(sc,cam,key+'-'+ob.name,objects,pixels=(960,800),samples=128,isolate=True)
  if quality:
   render(sc,cam,key+'-'+ob.name+'-front',objects,angle=(0,-1,.35),pixels=(960,800),samples=128,isolate=True)
   render(sc,cam,key+'-'+ob.name+'-interior',objects,angle=(-.38,-1,1.05),pixels=(960,800),samples=128,isolate=True)
   if ob.name=='part_kitchen_pot':
    lid=set(sc.objects['rig_pot_lid'].children_recursive)
    render(sc,cam,key+'-'+ob.name+'-open-interior',[o for o in objects if o not in lid],angle=(-.38,-1,1.05),isolate=True,inspection_note='锅盖仅在此离线检查图中隐藏，用于核对汤面与食材；非软件实时开盖画面')
 if key=='profile' and not preview:
  hero=sc.objects.get('part_monster_character');objects=[o for o in descendants(hero) if o.type=='MESH']
  for label,angle in [('front',(0,-1,.12)),('side',(1,-.25,.18)),('rear',(.35,1,.20))]:render(sc,cam,'mascot-'+label,objects,angle=angle,pixels=(1200,1400),samples=256,isolate=True)
report['status']='complete';report['finished']=time.time();report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('REVIEW_COMPLETE',flush=True)
