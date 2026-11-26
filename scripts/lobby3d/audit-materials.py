"""Read-only scene source audit; never writes the authored blend or exports copies."""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[2]
source=root/'art-source/lobby3d/detailed-spaces.blend'
report={'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'scenes':[],'materials':[],'scope':'Read-only authored mesh/material inventory; numeric checks are not visual acceptance'}
for name in ['meals','kitchen','pantry','community','profile']:
 sc=bpy.data.scenes[name];bpy.context.window.scene=sc;bpy.context.view_layer.update()
 meshes=[o for o in sc.objects if o.type=='MESH'];points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
 finite=all(math.isfinite(v) for p in points for v in p)
 report['scenes'].append({'scene':name,'meshes':len(meshes),'parts':len([o for o in sc.objects if o.name.startswith('part_')]),'bounds_min':[min(p[i] for p in points) for i in range(3)],'bounds_max':[max(p[i] for p in points) for i in range(3)],'finite':finite,'textured_meshes':sum(bool(o.data.uv_layers) for o in meshes),'rounded_or_sculpted':sum(any(m.type in ['BEVEL','SUBSURF','WEIGHTED_NORMAL'] for m in o.modifiers) or len(o.data.vertices)>64 for o in meshes)})
 assert finite and len(meshes)>10
for m in bpy.data.materials:
 if not m.use_nodes:continue
 bsdf=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
 if not bsdf:continue
 rough=float(bsdf.inputs['Roughness'].default_value);metal=float(bsdf.inputs['Metallic'].default_value)
 assert 0<=rough<=1 and 0<=metal<=1
 report['materials'].append({'name':m.name,'roughness':rough,'metalness':metal,'maps':sum(n.type=='TEX_IMAGE' for n in m.node_tree.nodes)})
report['passed']=True
(root/'work/reports/iteration90-blender-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('READ_ONLY_ART_AUDIT',len(report['scenes']),len(report['materials']),flush=True)
