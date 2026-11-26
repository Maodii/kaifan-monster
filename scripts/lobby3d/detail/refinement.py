"""Per-component finishing; actual interiors and PBR detail, shared by offline and GLB exports."""
from common import *
import common as C
from contextlib import contextmanager

@contextmanager
def augment(name):
 old=C.CURRENT;C.CURRENT=bpy.context.scene.objects.get(name)
 try:yield C.CURRENT
 finally:C.CURRENT=old

def parent_keep_world(objects,parent):
 for o in objects:
  world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world

def cut_hole(obj,loc,r,depth=1.2,ratio=1):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=loc)
 cutter=bpy.context.object;cutter.scale.x=ratio;bpy.context.view_layer.update()
 modifier=obj.modifiers.new('True interior opening','BOOLEAN');modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
 bpy.context.view_layer.objects.active=obj
 bpy.ops.object.modifier_apply(modifier=modifier.name)
 bpy.data.objects.remove(cutter,do_unlink=True)

def clear_sink_cabinet():
 # Cabinet dividers used to protrude into the recessed basin as two white bars.
 # Keep the lower load-bearing divider while carving clearance for the bowl.
 touched=[]
 for ob in list(bpy.context.scene.objects):
  if not ob.name.startswith('Cabinet side panel'):continue
  if abs(ob.location.x+2.5)<.72:
   cut_hole(ob,(-2.5,2.6,1.49),.535,.56,1.25);touched.append(ob.name)
 return touched

def true_lid_vents():
 # Close-up review exposed the old black disks as raised dots, not steam holes.
 import bmesh
 sc=bpy.context.scene;lid=next(o for o in sc.objects if o.name.startswith('Domed lid with stepped lip'))
 for ob in list(sc.objects):
  if ob.name.startswith('Lid vent hole'):bpy.data.objects.remove(ob,do_unlink=True)
 bm=bmesh.new();bm.from_mesh(lid.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bm.to_mesh(lid.data);bm.free()
 bpy.context.view_layer.update()
 for i in range(5):
  a=i*math.tau/5;location=lid.matrix_world@Vector((.35*math.cos(a),.35*math.sin(a),.06))
  bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.013,depth=.28,location=location)
  cutter=bpy.context.object;cutter.rotation_euler=lid.matrix_world.to_euler()
  modifier=lid.modifiers.new('Through steam vent','BOOLEAN');modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
  bpy.context.view_layer.objects.active=lid;bpy.ops.object.modifier_apply(modifier=modifier.name);bpy.data.objects.remove(cutter,do_unlink=True)
 edge=lid.modifiers.new('Soft steam vent rims','BEVEL');edge.width=.0015;edge.segments=3
 polish_pot_normals()
 return [lid.name]

def seat_pot_lid():
 rig=bpy.context.scene.objects['rig_pot_lid']
 rig.location.z=2.35;rig.rotation_euler.x=0
 return [rig.name]

def refine_pot_soup():
 # Macro review: uniform shiny cubes read as marshmallows. Give ingredients cut anatomy.
 sc=bpy.context.scene
 for ob in list(sc.objects):
  if ob.name.startswith(('Rounded cooked vegetable','Broth oil glint','Soup ingredient','Soup oil','Soup herb')):bpy.data.objects.remove(ob,do_unlink=True)
 for name,color,roughness in [('soup_carrot','#CC803F',.64),('soup_carrot_cut','#E1A15A',.72),('soup_potato','#DDC88F',.80),('soup_potato_skin','#947649',.85),('soup_mushroom','#72543B',.72),('soup_gills','#C7B28D',.88),('soup_leaf','#547846',.76),('soup_oil','#CBA257',.16)]:
  if name not in C.M:material(name,color,roughness)
 rng=random.Random(7701);locations=[]
 for i in range(18):
  for attempt in range(100):
   a=rng.uniform(0,math.tau);rr=.385*math.sqrt(rng.random());x=2.6+rr*math.cos(a);y=2.55+rr*math.sin(a)
   if all(math.hypot(x-xx,y-yy)>.135 for xx,yy in locations):break
  locations.append((x,y))
 with augment('part_kitchen_pot'):
  for i,(x,y) in enumerate(locations):
   z=2.225
   if i<6:
    # Tapered oblique carrot section, visible central core and irregular radial growth marks.
    n=9;angle=rng.random()*math.tau;verts=[]
    for layer in range(2):
     for k in range(n):
      a=angle+k*math.tau/n;r=(.067 if layer else .052)*(1+rng.uniform(-.10,.10));verts.append((x+r*math.cos(a),y+r*math.sin(a),z-.025+layer*.080+.012*math.cos(a)))
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(k,(k+1)%n,(k+1)%n+n,k+n) for k in range(n)]
    ob=mesh('Soup ingredient carrot oblique cut',verts,faces,'soup_carrot',False);edge=ob.modifiers.new('Soft cooked cut edges','BEVEL');edge.width=.006;edge.segments=3
    core=lathe('Soup ingredient carrot central pith',[(0,0),(.024,0),(.026,.001),(0,.001)],(x,y,z+.056),'soup_carrot_cut',32)
    for k in range(6):
     a=angle+k*math.tau/6;curve('Soup ingredient carrot radial fibre',[(x+.03*math.cos(a),y+.03*math.sin(a),z+.057),(x+.052*math.cos(a+.08),y+.052*math.sin(a+.08),z+.058)],.0015,'soup_carrot_cut')
   elif i<13:
    # Skewed hand-cut potato chunks with flat cut faces, small bevels and skin remnants.
    vv=[]
    for dz in [-.035,.055]:
     for dx,dy in [(-1,-1),(1,-1),(1,1),(-1,1)]:vv.append((x+dx*rng.uniform(.045,.069),y+dy*rng.uniform(.040,.067),z+dz+rng.uniform(-.009,.009)))
    ob=mesh('Soup ingredient irregular potato cut',vv,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],'soup_potato',False);edge=ob.modifiers.new('Cooked potato edge rounding','BEVEL');edge.width=.007;edge.segments=3
    for k in range(3):
     px=x+rng.uniform(-.035,.035);py=y+rng.uniform(-.035,.035);mark=lathe('Soup ingredient potato eye',[(0,0),(.0025,0),(.003,.0006),(0,.0006)],(px,py,z+.060),'soup_potato_skin',16);mark.scale.x=1.6
   else:
    # Half mushroom cap with real cut edge, recessed underside gills and a stem cross section.
    rows=16;cols=40;verts=[];radius=.083;turn=rng.random()*math.tau
    for j in range(rows+1):
     r=radius*j/rows
     for k in range(cols+1):
      a=turn-math.pi/2+k*math.pi/cols;verts.append((x+r*math.cos(a),y+r*math.sin(a),z+.022+.055*math.sqrt(max(0,1-(r/radius)**2))))
    ob=mesh('Soup ingredient half mushroom cap',verts,[(j*(cols+1)+k,j*(cols+1)+k+1,(j+1)*(cols+1)+k+1,(j+1)*(cols+1)+k) for j in range(rows) for k in range(cols)],'soup_mushroom');ob.modifiers.new('Mushroom cut thickness','SOLIDIFY').thickness=.010
    for k in range(18):
     a=turn-math.pi/2+(k+.5)*math.pi/18;curve('Soup ingredient mushroom underside gill',[(x+.019*math.cos(a),y+.019*math.sin(a),z+.018),(x+.078*math.cos(a),y+.078*math.sin(a),z+.014)],.0018,'soup_gills')
    lathe('Soup ingredient mushroom stem',[(0,0),(.018,0),(.020,.034),(0,.034)],(x,y,z-.010),'soup_gills',32)
  for i in range(5):
   a=i*2.399;rr=.29;leaf('Soup herb veined leaf',(2.6+rr*math.cos(a),2.55+rr*math.sin(a),2.234),.14,.052,a,.014,'soup_leaf')
  for i in range(28):
   a=i*2.399;rr=.425*math.sqrt((i+.5)/28);radius=rng.uniform(.006,.014)
   oil=lathe('Soup oil thin meniscus',[(0,0),(radius*.85,0),(radius,.00025),(radius*.75,.00055),(0,.00055)],(2.6+rr*math.cos(a),2.55+rr*math.sin(a),2.2276),'soup_oil',24);oil.scale.x=rng.uniform(1.1,1.9)
 return ['Soup ingredient anatomy','Soup herb veined leaf','Soup oil thin meniscus']

def polish_pot_normals():
 # A dense smooth shell prevents long Boolean ngons from pulling lid shading toward vent walls.
 import bmesh
 sc=bpy.context.scene;lid=next(o for o in sc.objects if o.name.startswith('Domed lid with stepped lip'))
 for mod in list(lid.modifiers):lid.modifiers.remove(mod)
 profile=[(.56*i/64,.13*(1-(.56*i/64/.575)**2)) for i in range(65)]
 profile += [(.572,.001),(.580,-.010),(.579,-.021),(.568,-.029),(.552,-.025)]
 profile += [(.548*i/64,.13*(1-(.548*i/64/.575)**2)-.025) for i in range(64,-1,-1)]
 temporary=lathe('Dense reference enamel lid shell',profile,(0,0,0),'coral',192);lid.data=temporary.data;bpy.data.objects.remove(temporary,do_unlink=True)
 bm=bmesh.new();bm.from_mesh(lid.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bm.to_mesh(lid.data);bm.free();bpy.context.view_layer.update()
 for i in range(5):
  a=i*math.tau/5;location=lid.matrix_world@Vector((.35*math.cos(a),.35*math.sin(a),.06))
  bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=.013,depth=.28,location=location);cutter=bpy.context.object;cutter.rotation_euler=lid.matrix_world.to_euler()
  modifier=lid.modifiers.new('Through steam vent refined shell','BOOLEAN');modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter;bpy.context.view_layer.objects.active=lid;bpy.ops.object.modifier_apply(modifier=modifier.name);bpy.data.objects.remove(cutter,do_unlink=True)
 edge=lid.modifiers.new('Soft rolled through-vent rims','BEVEL');edge.width=.0008;edge.segments=3;edge.harden_normals=True
 for ob in list(sc.objects):
  if ob.name.startswith('Pot ear handle'):bpy.data.objects.remove(ob,do_unlink=True)
 with augment('part_kitchen_pot'):
  for side in [-1,1]:tube('Pot ear handle smooth cast brass',[(2.6+side*.49,2.5,2.15),(2.6+side*.76,2.5,2.19),(2.6+side*.78,2.7,2.19),(2.6+side*.49,2.7,2.15)],.045,'brass',32)
 return [lid.name,'Pot ear handle smooth cast brass']

def finish_sink_fittings():
 import bmesh
 sc=bpy.context.scene;basin=next(o for o in sc.objects if o.name.startswith('Recessed sink basin'))
 for ob in list(sc.objects):
  if ob.name.startswith('Drain perforation'):bpy.data.objects.remove(ob,do_unlink=True)
 bm=bmesh.new();bm.from_mesh(basin.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bm.to_mesh(basin.data);bm.free()
 cut_hole(basin,(-2.5,2.6,1.25),.063,.16)
 with augment('part_kitchen_sink'):
  plate=lathe('Perforated sink strainer',[(0,0),(.077,0),(.077,.008),(0,.008)],(-2.5,2.6,1.277),'steel',64)
  bm=bmesh.new();bm.from_mesh(plate.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bm.to_mesh(plate.data);bm.free()
  for i in range(12):
   a=i*math.tau/12;cut_hole(plate,(-2.5+.052*math.cos(a),2.6+.052*math.sin(a),1.282),.006,.045)
  edge=plate.modifiers.new('Polished strainer hole rims','BEVEL');edge.width=.0007;edge.segments=2
  gasket=next(o for o in sc.objects if o.name.startswith('Tap aerator gasket'))
  direction=Vector((0,-.25,-.18)).normalized();gasket.location=Vector((-2.5,2.55,2.30))+direction*.001;gasket.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
 return [basin.name,plate.name,gasket.name]

def finish_kitchen():
 sc=bpy.context.scene
 counter=next((o for o in sc.objects if o.name.startswith('Stone countertop')),None)
 if counter:cut_hole(counter,(-2.5,2.6,1.52),.52,1.3,1.25)
 for ob in sc.objects:
  if ob.name.startswith('Recessed sink basin'):ob.location.z-=.12
  if ob.name.startswith('Sink drain rim'):ob.location.z-=.12
 with augment('part_kitchen_sink'):
  for a in range(12):
   theta=a*math.tau/12;lathe('Drain perforation',[(0,0),(.008,0),(.008,.007),(0,.007)],(-2.5+.055*math.cos(theta),2.6+.055*math.sin(theta),1.285),'ink',12)
  for x in [-2.85,-2.15]:
   tube('Mixer cross handle',[(x-.08,3.1,1.78),(x+.08,3.1,1.78)],.015,'steel',12)
   tube('Mixer cross handle',[(x,3.02,1.78),(x,3.18,1.78)],.015,'steel',12)
  # Aerator and gasket are separate surfaces, visible from underneath the tap.
  lathe('Tap aerator gasket',[(.024,0),(.041,0),(.041,.025),(.024,.025)],(-2.5,2.55,2.27),'darkmetal',32)
  finish_sink_fittings()
 with augment('part_kitchen_cabinet') as owner:
  for old in list(sc.objects):
   if old.parent==owner and old.name.startswith('Cabinet carcass'):
    x=old.location.x;bpy.data.objects.remove(old,do_unlink=True)
    box('Cabinet bottom interior',(x,2.65,.12),(1.23,1.48,.10),'enamel',.015)
    box('Cabinet rear panel',(x,3.35,.77),(1.23,.07,1.30),'enamel',.012)
    for side in [-1,1]:
     box('Cabinet side panel',(x+side*.575,2.65,.77),(.08,1.48,1.30),'enamel',.012)
     for row in range(5):
      lathe('Shelf pin socket',[(0,0),(.012,0),(.012,.004),(0,.004)],(x+side*.527,2.14,.54+row*.11),'darkmetal',12)
    box('Cabinet removable shelf',(x,2.66,.79),(1.09,1.32,.055),'wood',.012)
    for side in [-1,1]:
     for yy in [2.1,3.15]:lathe('Adjustable cabinet foot',[(0,0),(.07,0),(.07,.14),(.045,.17),(0,.17)],(x+side*.44,yy,-.015),'darkmetal',24)
  # One genuine open cabinet demonstrates shelf depth, cup interiors and the hinge mechanism.
  selected=[]
  for o in list(sc.objects):
   if o.parent==owner and (o.name.startswith('Raised door frame') or o.name.startswith('Recessed panel') or o.name.startswith('Cast brass cabinet pull') or o.name.startswith('Countersunk screw') or o.name.startswith('Screw slot')):
    center=sum((o.matrix_world@Vector(c) for c in o.bound_box),Vector())/8
    if abs(center.x-.9)<.56 and center.y<1.95:selected.append(o)
  rig=C.group('rig_cabinet_door',owner);rig.location=(.9-.56,1.88,.72);bpy.context.view_layer.update();parent_keep_world(selected,rig);rig.rotation_euler.z=-.85
  for zz in [.26,1.20]:
   box('Cabinet inset hinge leaf',(.35,1.96,zz),(.13,.04,.18),'steel',.008)
   lathe('Cabinet hinge barrel',[(0,0),(.024,0),(.024,.15),(0,.15)],(.35,1.91,zz-.075),'steel',24)
  for x in [.66,.97,1.28]:
   C.mug(x,2.27,.84,'cream',.64)
  for j in range(4):C.plate(.96,2.82,.20+j*.052,.36)
 clear_sink_cabinet()
 with augment('part_kitchen_pot') as owner:
  # Soup exists under the lid, with surface tension, small fat droplets and cooked ingredients.
  soup=material('broth','#AF7541',.19);p=soup.node_tree.nodes.get('Principled BSDF');p.inputs['Coat Weight'].default_value=.35
  lathe('Stew meniscus',[(0,0),(.43,0),(.465,.015),(.47,.025),(0,.027)],(2.6,2.55,2.20),'broth',72)
  rng=random.Random(991)
  for j in range(20):
   a=rng.uniform(0,math.tau);rr=rng.uniform(.08,.4);x=2.6+rr*math.cos(a);y=2.55+rr*math.sin(a)
   chunk=box('Rounded cooked vegetable',(x,y,2.24),(.075,.09,.06),'flesh' if j%2 else 'cream',.026);chunk.rotation_euler.z=a
  for i in range(16):
   a=i*2.399;rr=.42*math.sqrt((i+.5)/16);lathe('Broth oil glint',[(0,0),(.016,0),(.018,.001),(0,.003)],(2.6+rr*math.cos(a),2.55+rr*math.sin(a),2.229),'gold',16)
  parts=[o for o in sc.objects if o.parent==owner and (o.name.startswith('Domed lid') or o.name.startswith('Lid knob'))]
  rig=C.group('rig_pot_lid',owner);rig.location=(2.6,2.55,2.35);bpy.context.view_layer.update();parent_keep_world(parts,rig)
  rig.location.z+=.13;rig.rotation_euler.x=.10
  # Vents follow the raised lid rigidly; they must never float above the countertop.
  for i in range(5):
   a=i*math.tau/5;o=lathe('Lid vent hole',[(0,0),(.013,0),(.013,.007),(0,.007)],(2.6+.35*math.cos(a),2.55+.35*math.sin(a),2.55),'ink',16);bpy.context.view_layer.update();parent_keep_world([o],rig)
  true_lid_vents()
  seat_pot_lid()
  refine_pot_soup()
 with augment('part_kitchen_recipebook'):
  for side in [-1,1]:
   curve('Recipe paper edge curl',[(-2.8+side*.84,-1.8,1.35),(-2.8+side*.88,-1.3,1.36),(-2.8+side*.84,-.8,1.35)],.005,'cream')
 with augment('part_kitchen_chopping'):
  for i in range(14):
   x=-1.25+i*.10;curve('Fine worn knife mark',[(x,2.09,1.738),(x+.16,2.47,1.738)],.0015,'endgrain')
  for x in [-1.39,.08]:
   box('Board end grain inset',(x,2.3,1.669),(.09,.84,.10),'endgrain',.014)

def finish_all():
 # Material values are bounded and remain PBR-exportable; no Blender-only node is claimed as runtime support.
 for m in bpy.data.materials:
  if not m.use_nodes:continue
  p=m.node_tree.nodes.get('Principled BSDF')
  if not p:continue
  name=m.name.split('.')[0]
  if name in ['cream','enamel','coral','jade','rose','blue','gold']:
   p.inputs['Roughness'].default_value=.24 if name not in ['rose'] else .42;p.inputs['Coat Weight'].default_value=.30;p.inputs['Coat Roughness'].default_value=.21
  if name in ['brass','steel']:
   p.inputs['Roughness'].default_value=.27;p.inputs['Metallic'].default_value=.82
  if name in ['wood','endgrain']:
   p.inputs['Roughness'].default_value=.48;p.inputs['Coat Weight'].default_value=.12
  if name=='rice':p.inputs['Roughness'].default_value=.33;p.inputs['Subsurface Weight'].default_value=.07
  if name in ['tomato','flesh','leaf','leaflight']:
   p.inputs['Roughness'].default_value=.38;p.inputs['Subsurface Weight'].default_value=.06
  if name in ['linen','paper']:
   p.inputs['Roughness'].default_value=.91;p.inputs['Sheen Weight'].default_value=.18
 # Small hard-surface edges catch light. Avoid beveling fibers, thin paper, leaf ribs or custom smooth bodies.
 for o in bpy.context.scene.objects:
  if o.type!='MESH' or not o.data.materials:continue
  name=o.name.lower();m=o.data.materials[0]
  if any(w in name for w in ['glazed plate','hollow','mug','bottle','rolled cap','meniscus','knob','foot ring']):
   if not any(mod.type=='BEVEL' for mod in o.modifiers):
    edge=o.modifiers.new('Hand finished light catching lip','BEVEL');edge.width=.004;edge.segments=3
  # A deterministic material audit accompanies the render queue.
 if C.SCENE_KEY=='kitchen':finish_kitchen()
 if C.SCENE_KEY=='pantry':finish_pantry()
 if C.SCENE_KEY=='community':finish_community()
 if C.SCENE_KEY=='meals':finish_meals()
 if C.SCENE_KEY=='profile':finish_profile()
 finish_bottles()
 finish_textures()

def finish_textures():
 """Only glTF-supported image/normal/ORM nodes; metric UVs on every participating mesh."""
 directory=C.ROOT/'art-source/lobby3d/textures'
 for key in ['wood','linen','seared-food']:
  if key not in C.M:continue
  mat=C.M[key];nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes.get('Principled BSDF')
  def image_node(suffix,space):
   node=nodes.new('ShaderNodeTexImage');node.image=bpy.data.images.load(str(directory/f'{key}-{suffix}'),check_existing=True);node.image.colorspace_settings.name=space;node.extension='REPEAT';return node
  albedo=image_node('albedo.jpg','sRGB');links.new(albedo.outputs['Color'],p.inputs['Base Color'])
  normal=image_node('normal.png','Non-Color');bump=nodes.new('ShaderNodeNormalMap');bump.inputs['Strength'].default_value=.38 if key=='wood' else .25 if key=='seared-food' else .6;links.new(normal.outputs['Color'],bump.inputs['Color']);links.new(bump.outputs['Normal'],p.inputs['Normal'])
  orm=image_node('orm.jpg','Non-Color');sep=nodes.new('ShaderNodeSeparateColor');links.new(orm.outputs['Color'],sep.inputs['Color']);links.new(sep.outputs['Green'],p.inputs['Roughness'])

def refine_market_bag():
 # Inspection revealed the grocery bag was still a solid box with wire-like loops.
 sc=bpy.context.scene
 for ob in list(sc.objects):
  if ob.name.startswith(('Folded paper bag','Flat paper handle','Bag folded','Bag side','Bag bottom','Bag paper','Bag rim')):bpy.data.objects.remove(ob,do_unlink=True)
 with augment('part_fridge_market'):
  x,y=2.95,-1.8;bottom,top=.905,1.70;w,d=.75,.65
  for sign in [-1,1]:
   vertices=[];nx,ny=24,18
   for row in range(ny+1):
    t=row/ny
    for col in range(nx+1):
     u=col/nx;xx=x+(u-.5)*w;yy=y+sign*(d*.5+.008*math.sin(u*math.pi*4)*math.sin(t*math.pi));zz=bottom+(top-bottom)*t+.006*math.sin(u*math.pi*3)*t*t;vertices.append((xx,yy,zz))
   faces=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i) for j in range(ny) for i in range(nx)]
   if sign<0:faces=[tuple(reversed(f)) for f in faces]
   panel=mesh('Bag folded front back paper',vertices,faces,'linen');panel.modifiers.new('Paper sheet true thickness','SOLIDIFY').thickness=.004
   curve('Bag rim folded paper lip',[(x-w*.5,y+sign*d*.5,top),(x,y+sign*d*.5,top-.006),(x+w*.5,y+sign*d*.5,top)],.006,'linen')
  for sign in [-1,1]:
   vertices=[(x+sign*w*.5,y-d*.5,bottom),(x+sign*w*.5,y+d*.5,bottom),(x+sign*w*.5,y+d*.5,top),(x+sign*(w*.5-.075),y,top-.018),(x+sign*w*.5,y-d*.5,top),(x+sign*(w*.5-.075),y,bottom+.13)]
   side=mesh('Bag side inward folded gusset',vertices,[(0,5,3,4),(5,1,2,3),(0,1,5)],'linen');side.modifiers.new('Folded side paper thickness','SOLIDIFY').thickness=.004
   curve('Bag side pressed fold',[(x+sign*w*.5,y-d*.5,bottom+.025),(x+sign*(w*.5-.075),y,bottom+.13),(x+sign*(w*.5-.075),y,top-.02)],.0018,'endgrain')
  box('Bag bottom folded overlap',(x,y,bottom),(.74,.64,.012),'linen',.004)
  for sign in [-1,1]:
   yy=y+sign*(d*.5-.008);verts=[];segments=40
   for i in range(segments+1):
    a=math.pi-i*math.pi/segments;xx=x+.235*math.cos(a);zz=1.63+.38*math.sin(a)
    tangent=Vector((.235*math.sin(a),0,-.38*math.cos(a))).normalized();across=Vector((-tangent.z,0,tangent.x))*.012
    center=Vector((xx,yy,zz));verts.extend([tuple(center-across),tuple(center+across)])
   handle=mesh('Bag paper flat rolled handle',verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(segments)],'endgrain');handle.modifiers.new('Rolled paper handle thickness','SOLIDIFY').thickness=.006
   for dx in [-.235,.235]:box('Bag paper handle reinforcement',(x+dx,yy-sign*.005,1.62),(.065,.006,.11),'linen',.004)
 return ['part_fridge_market']

def refine_cold_fan():
 # The old rectangular blades were in front of the grille: put a real rotor inside a duct cavity.
 sc=bpy.context.scene
 for ob in list(sc.objects):
  if ob.name.startswith(('Concealed fan blade','Air circulation fan hub','Duct fan ')):bpy.data.objects.remove(ob,do_unlink=True)
 duct=next(o for o in sc.objects if o.name.startswith('Cooling duct'))
 bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=.405,depth=.22,location=(0,2.42,4.04),rotation=(math.pi/2,0,0))
 cutter=bpy.context.object;modifier=duct.modifiers.new('Actual recessed fan cavity','BOOLEAN');modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter;bpy.context.view_layer.objects.active=duct;bpy.ops.object.modifier_apply(modifier=modifier.name);bpy.data.objects.remove(cutter,do_unlink=True)
 with augment('part_fridge_thermostat'):
  for name,profile,y,mat in [
   ('Duct fan back bowl',[(0,0),(.40,0),(.40,.012),(0,.012)],2.495,'darkmetal'),
   ('Duct fan rolled safety rim',[(.37,0),(.41,0),(.42,.012),(.41,.026),(.37,.026)],2.38,'enamel'),
   ('Duct fan rounded rotor hub',[(0,0),(.075,0),(.087,.015),(.072,.047),(0,.053)],2.408,'steel')]:
   ob=lathe(name,profile,(0,y,4.04),mat,72);ob.rotation_euler.x=math.pi/2
  for blade in range(5):
   vertices=[];rows,cols=24,8
   for row in range(rows+1):
    t=row/rows;r=.068+.292*t
    for col in range(cols+1):
     side=col/cols*2-1;a=blade*math.tau/5+.64*t+side*(.11+.21*math.sin(math.pi*t))
     vertices.append((r*math.cos(a),2.423+.020*side*math.sin(math.pi*t),4.04+r*math.sin(a)))
   ob=mesh('Duct fan swept pitched airfoil',vertices,[(j*(cols+1)+i,j*(cols+1)+i+1,(j+1)*(cols+1)+i+1,(j+1)*(cols+1)+i) for j in range(rows) for i in range(cols)],'darkmetal');ob.modifiers.new('Airfoil sheet thickness','SOLIDIFY').thickness=.009
  for x in [-.51,.51]:
   for z in [3.53,4.55]:screw(x,2.345,z)
 return ['part_fridge_thermostat']

def finish_pantry():
 refine_market_bag()
 with augment('part_fridge_crisper'):
  for x in [-.92,.92]:
   box('Crisper rear wall',(x,2.32,1.43),(1.68,.045,.65),'glass',.012)
   for side in [-1,1]:
    xx=x+side*.86
    box('Drawer fixed steel slide',(xx,1.40,1.18),(.035,1.88,.055),'steel',.008)
    box('Drawer telescoping runner',(xx,1.23,1.22),(.025,1.54,.035),'darkmetal',.006)
    for yy in [.64,2.05]:screw(xx,yy,1.22,'top')
 with augment('part_fridge_thermostat'):
  # Refrigeration condensate channel and serviceable fan hub are visible behind the food.
  curve('Rear condensate gutter',[(-1.6,2.45,1.84),(0,2.43,1.76),(1.6,2.45,1.84)],.022,'enamel')
  for i in range(3):
   a=i*math.tau/3
   blade=box('Concealed fan blade',(.20*math.cos(a),2.325,4.04+.20*math.sin(a)),(.35,.015,.11),'darkmetal',.04);blade.rotation_euler.y=-a
  hub=lathe('Air circulation fan hub',[(0,0),(.07,0),(.09,.025),(0,.04)],(0,2.30,4.04),'steel',32);hub.rotation_euler.x=math.pi/2
 refine_cold_fan()

def finish_bottles():
 # Individual caps gain embossed ribs and a safety ring, without fake text decals.
 for owner_name in ['part_fridge_dairy','part_fridge_door','part_kitchen_spices']:
  owner=bpy.context.scene.objects.get(owner_name)
  if not owner:continue
  with augment(owner_name):
   caps=[o for o in bpy.context.scene.objects if o.name.startswith('Bottle rolled cap') and any(p==owner for p in [o.parent,o.parent.parent if o.parent else None])]
   for cap in caps:
    radius=max(abs(v.co.x) for v in cap.data.vertices)+.002
    # Door children use local rig coordinates; retain the same parent and coordinate frame.
    for i in range(16):
     a=i*math.tau/16;o=box('Cap grip embossing',(cap.location.x+radius*math.cos(a),cap.location.y+radius*math.sin(a),cap.location.z+.042),(.012,.012,.048),'brass',.003);o.parent=cap.parent
    o=lathe('Tamper evidence collar',[(radius*.9,0),(radius,0),(radius,.018),(radius*.9,.018)],(cap.location.x,cap.location.y,cap.location.z-.018),'ivory',32);o.parent=cap.parent

def finish_community():
 with augment('part_square_kiosk') as owner:
  for ob in list(bpy.context.scene.objects):
   if not ob.name.startswith('Kiosk enclosure'):continue
   x=ob.location.x;mat='jade' if x<0 else 'coral';bpy.data.objects.remove(ob,do_unlink=True)
   # This is an actual little booth: hollow service space, shelf, side and back walls.
   box('Kiosk rear inner wall',(x,2.94,1.35),(3.15,.12,2.5),mat,.025)
   for dx in [-1.52,1.52]:box('Kiosk side timber',(x+dx,2.27,1.35),(.11,1.30,2.5),mat,.025)
   box('Kiosk internal floor',(x,2.28,.15),(3.0,1.2,.08),'wood',.02)
   box('Kiosk front lower apron',(x,1.60,.75),(3.05,.12,1.28),mat,.025)
   box('Kiosk inner upper shelf',(x,2.56,2.34),(2.8,.62,.065),'wood',.014)
   for j in range(4):mug(x-.95+j*.55,2.55,2.38,'blue' if j%2 else 'cream',.6)
   # Recess used to be a solid black patch; remove it to see the genuine booth interior.
  for ob in list(bpy.context.scene.objects):
   if ob.parent==owner and ob.name.startswith('Serving hatch recess'):bpy.data.objects.remove(ob,do_unlink=True)
 with augment('part_square_menu'):
  for x in [-2.7,2.7]:
   for side in [-1,1]:
    box('Chalkboard bevel frame',(x+side*.74,1.40,2.1),(.08,.10,.98),'wood',.018)
   for zz in [1.63,2.57]:box('Chalkboard bevel frame',(x,1.40,zz),(1.54,.10,.07),'wood',.014)
   box('Chalk resting tray',(x,1.31,1.62),(1.5,.24,.055),'wood',.014)
   tube('Chalk piece',[(x+.23,1.29,1.67),(x+.41,1.29,1.67)],.015,'cream',12)

def refine_diary_food():
 # Close-up review showed sparse, round grains and a garnish hidden by the meat.
 # Build actual tapered long-grain geometry across the bowl's curved surface.
 sc=bpy.context.scene;rng=random.Random(914)
 for ob in list(sc.objects):
  if ob.name.startswith(('Separate rice kernel','Soft rice fill inside diary bowl','Diary long grain')):
   bpy.data.objects.remove(ob,do_unlink=True)
 with augment('part_diary_meal'):
  lathe('Soft rice fill inside diary bowl',[(0,0),(.45,0),(.415,.035),(.32,.10),(.18,.132),(0,.14)],(2.18,-.42,1.73),'rice',80)
  for i in range(470):
   angle=i*2.399963;radius=.438*math.sqrt((i+.5)/470)
   x=2.18+radius*math.cos(angle);y=-.42+radius*math.sin(angle)
   z=1.73+.14*(1-(radius/.46)**2)+rng.uniform(.003,.014)
   length=rng.uniform(.051,.068);width=rng.uniform(.008,.011)
   grain=lathe('Diary long grain',[(0,-length*.5),(width*.7,-length*.34),(width,-length*.1),(width*.96,length*.16),(width*.6,length*.38),(0,length*.5)],(x,y,z),'rice',12)
   grain.rotation_euler=(math.pi/2+rng.uniform(-.16,.16),rng.uniform(-.22,.22),rng.uniform(0,math.tau))
  # The original leaf and its veins are below the slab; remove them as one assembly.
  for ob in list(sc.objects):
   if ob.parent==C.CURRENT and ob.name.startswith(('Vegetable garnish','Leaf central rib','Branching leaf vein')):
    bpy.data.objects.remove(ob,do_unlink=True)
  for j in range(3):leaf('Diary crisp greens',(2.48+j*.035,-.30+j*.045,1.91+j*.012),.23+j*.025,.085, -.85+j*.40,.065)

def finish_meals():
 with augment('part_diary_desktop'):
  for x in [-2.65,2.65]:
   for y in [-1.25,1.05]:
    box('Table mortise tenon block',(x,y,1.04),(.19,.21,.22),'wood',.012)
    for dx in [-.045,.045]:screw(x+dx,y-.12,1.03)
 refine_diary_food()
 with augment('part_diary_calendar'):
  # Thin metal ring retainers actually join the paper and desk backing.
  for x in [-2.5,-.9]:
   box('Calendar ring mounting tab',(x,1.07,3.34),(.23,.035,.18),'brass',.01);screw(x,1.044,3.31)
 with augment('part_diary_pen'):
  curve('Fine nib ink slit',[(-2.5,.26,1.452),(-2.5,.54,1.452)],.0017,'ink')
  lathe('Nib breather eye',[(0,0),(.012,0),(.012,.002),(0,.002)],(-2.5,.30,1.455),'ink',16)

def refine_crown_filaments():
 from cute_character import build_crown_filaments
 removed=[]
 for ob in list(bpy.context.scene.objects):
  if ob.name.startswith(('Individual swept forehead wisps','Separated curved crown filament')):
   removed.append(ob.name);bpy.data.objects.remove(ob,do_unlink=True)
 with augment('part_monster_skin'):build_crown_filaments()
 return {'removed':removed,'new_hairs':42,'reason':'Adjacent parallel ribbons formed hard sheets above the scalp; independent tapered six-sided curved filaments replace them'}

def refine_monster_grains():
 # Actual close-up revealed stubby beads; retain rice structure at inspection scale.
 rng=random.Random(780142)
 for ob in list(bpy.context.scene.objects):
  if ob.name.startswith(('Individual rounded rice grain','Mascot tapered rice grain')):bpy.data.objects.remove(ob,do_unlink=True)
 with augment('part_monster_rice'):
  for i in range(620):
   a=i*2.399963;rr=.52*math.sqrt((i+.5)/620);z=1.04+.19*(1-(rr/.54)**2)+rng.uniform(.008,.017)
   length=rng.uniform(.070,.085);width=rng.uniform(.011,.013)
   grain=lathe('Mascot tapered rice grain',[(0,-length*.5),(width*.68,-length*.34),(width,-length*.10),(width*.94,length*.16),(width*.56,length*.38),(0,length*.5)],(rr*math.cos(a),-.91+rr*math.sin(a),z),'rice',12)
   grain.rotation_euler=(math.pi/2+rng.uniform(-.24,.24),rng.uniform(-.22,.22),rng.uniform(0,math.tau))
 return ['part_monster_rice']

def finish_profile():
 from mirror_finish import refine_room_finish
 refine_room_finish()
 refine_monster_grains()
 from fur import groom_appendages
 groom_appendages()
 with augment('part_monster_wardrobe'):
  # Fabric seams follow the draped outline and pocket; bottom hem has two stitch rows.
  for side in [-1,1]:
   pts=[]
   for j in range(20):
    t=j/19;pts.append((2.85+side*(.33+.25*t),1.613+.055*math.sin(side*14)*t,2.5-t*1.35+.03))
   curve('Apron bound side seam',pts,.009,'linen')
  for i in range(28):
   x=2.32+i*.038;curve('Apron hem topstitch',[(x,1.60,1.20),(x+.018,1.60,1.20)],.0025,'cream')
  for x in [2.58,3.12]:
   curve('Apron waist tie',[(x,1.62,1.98),(x+.20,1.68,1.88),(x+.28,1.62,1.56)],.013,'rose')
 with augment('part_monster_favorites'):
  for ob in list(bpy.context.scene.objects):
   if ob.name.startswith('Cookbook spine'):
    x=ob.location.x
    for z in [.47,.95]:box('Cookbook embossed spine rule',(x,1.178,z),(.17,.008,.012),'brass',.002)
    box('Cookbook ribbon marker',(x,1.28,.41),(.055,.14,.015),'jade',.004)

def assign_metric_uv():
 # Run after curves and lettering are converted, so wood handles and wicker strands retain their texture coordinates too.
 for ob in bpy.context.scene.objects:
  if ob.type!='MESH' or not ob.data.materials:continue
  names={m.name for m in ob.data.materials if m}
  key=next((k for k in ['wood','linen','seared-food'] if k in names),None)
  if not key:continue
  me=ob.data;uv=me.uv_layers.active or me.uv_layers.new(name='MetricMaterialUV');rng=random.Random(ob.name+str(C.SCENE_KEY));offset=(rng.random()*7,rng.random()*7) if key=='wood' else (0,0);extent=[max(v.co[a] for v in me.vertices)-min(v.co[a] for v in me.vertices) for a in range(3)];scale=1.4 if key=='wood' else .85 if key=='seared-food' else .5
  for face in me.polygons:
   axis=max(range(3),key=lambda i:abs(face.normal[i]));axes=[i for i in range(3) if i!=axis]
   if key=='wood':axes.sort(key=lambda a:extent[a])
   for li in face.loop_indices:
    co=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]]/scale+offset[0],co[axes[1]]/scale+offset[1])
