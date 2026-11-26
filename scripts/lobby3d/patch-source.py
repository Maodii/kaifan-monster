"""Apply two inspected corrections without rebuilding or copying the project."""
import bpy,hashlib,json,array
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];keys=['meals','kitchen','pantry','community','profile'];bpy.context.preferences.filepaths.save_version=0
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def scene_hash(scene):
 bpy.context.window.scene=scene;bpy.context.view_layer.update();h=hashlib.sha256()
 for ob in sorted(scene.objects,key=lambda o:o.name):
  h.update(json.dumps([ob.name,ob.type,[v for row in ob.matrix_world for v in row]],ensure_ascii=False).encode())
  if ob.type!='MESH':continue
  me=ob.data;coords=array.array('f',[0])*(len(me.vertices)*3);me.vertices.foreach_get('co',coords);h.update(coords.tobytes())
  indices=array.array('i',[0])*len(me.loops);me.loops.foreach_get('vertex_index',indices);h.update(indices.tobytes())
  for uv in me.uv_layers:
   data=array.array('f',[0])*(len(uv.data)*2);uv.data.foreach_get('uv',data);h.update(data.tobytes())
  h.update(json.dumps([(m.name,list(m.diffuse_color)) for m in me.materials if m is not None],ensure_ascii=False).encode())
 return h.hexdigest()
blend=ROOT/'art-source/lobby3d/detailed-spaces.blend';old_blend=sha(blend);before={k:scene_hash(bpy.data.scenes[k]) for k in keys};old_glb={k:sha(ROOT/f'prototypes/3d-lobby/assets/{k}.glb') for k in keys}
sc=bpy.data.scenes['community'];ob=next(o for o in sc.objects if o.name.startswith('Lettering 来聊聊今天吃什么'));old=list(ob.location);assert abs(ob.location.z-3.34)<.001;ob.location.z=2.97;bpy.context.view_layer.update()
after={k:scene_hash(bpy.data.scenes[k]) for k in keys};assert all(before[k]==after[k] for k in keys if k!='community')
for key in keys:
 bpy.context.window.scene=bpy.data.scenes[key];bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=str(ROOT/f'prototypes/3d-lobby/assets/{key}.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_extras=True,export_cameras=False,export_lights=False)
bpy.ops.wm.save_as_mainfile(filepath=str(blend));new_glb={k:sha(ROOT/f'prototypes/3d-lobby/assets/{k}.glb') for k in keys}
report={'old_blend_sha256':old_blend,'new_blend_sha256':sha(blend),'old_glb':old_glb,'new_glb':new_glb,'scene_geometry_before':before,'scene_geometry_after':after,'geometry_unchanged_scenes':[k for k in keys if before[k]==after[k]],'corrections':[{'object':ob.name,'from':old,'to':list(ob.location),'reason':'Anchor community heading inside its board instead of floating above'},{'export_extras':True,'reason':'Preserve actual model click station and whitelist route metadata; default export omitted it'}]}
(ROOT/'work/reports/lobby3d-source-corrections.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('SOURCE_CORRECTIONS_COMPLETE',flush=True)
