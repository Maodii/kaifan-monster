"""Original rounded-clay kitchen diorama; isolated background Blender scene."""
import bpy, math, random, json
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
random.seed(42)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,hex,rough=.83):
 c=tuple(int(hex[i:i+2],16)/255 for i in (1,3,5));linear=lambda x:x/12.92 if x<.04045 else ((x+.055)/1.055)**2.4
 m=bpy.data.materials.new(name);m.diffuse_color=(*[linear(x) for x in c],1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=m.diffuse_color;p.inputs['Roughness'].default_value=rough;return m
cream=mat('Warm oat plaster','#F2DFC3');cream2=mat('Buttermilk enamel','#FFF3D7');wood=mat('Honey oak','#C58C59');edge=mat('Biscuit edge','#AB7046');pink=mat('Strawberry clay','#D99989');green=mat('Pistachio cabinets','#93B6A1');dark=mat('Deep olive ink','#485949');purple=mat('Mulberry monster','#A183B5');lavender=mat('Lavender fridge','#B4A6C9');gold=mat('Egg yolk yellow','#E5B558');white=mat('Rice porcelain','#FDF4DF');red=mat('Tomato coral','#CB715B');leaf=mat('Fresh herb','#6C9668');blue=mat('Powder blue','#8CB6BE');ink=mat('Cocoa ink','#584640');soil=mat('Potting soil','#775A3E');rug=mat('Apricot woven rug','#E4AB85');glass=mat('Window sky','#B4D8CD');rice=mat('Warm rice','#F9E7C3')
current=None
all_mats=[cream,cream2,wood,edge,pink,green,dark,purple,lavender,gold,white,red,leaf,blue,ink,soil,rug,glass,rice]
def parent(o):
 if current:o.parent=current
 return o
def cube(name,loc,scale,m,bevel=.08):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft handmade corners','BEVEL');mod.width=bevel;mod.segments=3
  mod=o.modifiers.new('Clay normals','WEIGHTED_NORMAL')
 o.data.materials.append(m);return parent(o)
def sphere(name,loc,scale,m,seg=20):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=12,radius=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return parent(o)
def cylinder(name,loc,r,depth,m,vertices=24):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(m);mod=o.modifiers.new('Rounded rim','BEVEL');mod.width=min(.05,depth*.2);mod.segments=3;o.modifiers.new('Soft normals','WEIGHTED_NORMAL');return parent(o)
def line(name,points,r,m):
 cv=bpy.data.curves.new(name,'CURVE');cv.dimensions='3D';cv.resolution_u=12;cv.bevel_depth=r;cv.bevel_resolution=2;sp=cv.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
 for p,co in zip(sp.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,cv);bpy.context.collection.objects.link(o);o.data.materials.append(m);return parent(o)
def group(name):
 global current
 current=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(current);return current
def pot(x,y,z,r=.22,plant=True):
 cylinder('Terracotta planter',(x,y,z+.14),r,.28,pink);cylinder('Soil',(x,y,z+.285),r*.83,.02,soil)
 if plant:
  for i in range(7):
   a=i*2.4;s=sphere('Sculpted herb leaf',(x+math.cos(a)*r*.65,y+math.sin(a)*r*.65,z+.45+(i%3)*.07),(.07,.15,.06),leaf);s.rotation_euler=(.4,0,a)
  line('Stem',[(x,y,z+.24),(x,y,z+.65)],.018,leaf)
def dish(x,y,z):
 cylinder('Ceramic plate',(x,y,z),.34,.055,white);sphere('Sunny omelette',(x,y,z+.06),(.25,.22,.045),gold)
 for i in range(6):
  a=i*1.3;sphere('Green garnish',(x+.16*math.cos(a),y+.13*math.sin(a),z+.105),(.025,.045,.013),leaf,12)
def mug(x,y,z,m=blue):
 cylinder('Stoneware mug',(x,y,z+.13),.12,.25,m);cylinder('Tea',(x,y,z+.261),.09,.008,ink);line('Mug handle',[(x+.1,y,z+.22),(x+.23,y,z+.15),(x+.1,y,z+.07)],.028,m)
# Foundation and parquet.
group('Architecture');cube('Floating biscuit plinth',(0,0,-.36),(10.1,8.4,.55),cream,.24);cube('Foundation trim',(0,0,-.12),(9.9,8.2,.2),wood,.16)
for j in range(12):
 for i in range(5):
  x=-4.0+i*1.96+(0 if j%2==0 else .24);y=-3.66+j*.66
  cube('Oak floor plank',(x,y,.015),(1.92,.62,.10),wood if (i+j)%4 else cream,.028)
cube('Back wall',(0,3.88,1.9),(10,.18,3.85),cream,.09);cube('Left wall',(-4.9,.25,1.9),(.18,7.4,3.85),cream,.09)
cube('Back skirting',(0,3.73,.2),(9.7,.1,.24),edge,.03);cube('Left skirting',(-4.76,.1,.2),(.1,7.2,.24),edge,.03)
# Window with scalloped curtain.
cube('Window opening',(-.7,3.735,2.55),(2.25,.08,1.85),glass,.16)
for x in [-1.92,.52]:cube('Window side frame',(x,3.63,2.55),(.13,.20,2.04),white,.04)
for z in [1.55,3.55]:cube('Window frame',(-.7,3.63,z),(2.5,.2,.13),white,.04)
cube('Window crossbar',(-.7,3.58,2.55),(.1,.1,1.9),white,.02);cube('Window sill',(-.7,3.45,1.5),(2.65,.55,.14),wood,.05)
for i in range(10):sphere('Scalloped curtain',(-1.78+i*.24,3.47,3.4),(.17,.10,.26),green)
pot(-1.55,3.4,1.58,.14);mug(.05,3.4,1.58)
# Fridge corner.
group('pantry');cube('Fridge body',(-3.75,2.73,1.37),(1.5,1.45,2.62),lavender,.2)
cube('Fridge inner seam',(-3.75,1.985,1.42),(1.37,.045,2.36),dark,.06)
old=current;door=group('FridgeDoor');door.parent=old
cube('Freezer door',(-3.75,1.93,2.18),(1.42,.15,.81),lavender,.1);cube('Fridge door',(-3.75,1.93,.99),(1.42,.15,1.5),lavender,.12)
for z in [1.55,2.15]:cube('Brass fridge handle',(-3.25,1.79,z),(.075,.12,.43),gold,.035)
cube('Pinned grocery note',(-3.95,1.83,1.27),(.43,.015,.47),cream2,.015)
for z in [1.16,1.26,1.36]:cube('Note handwritten dash',(-3.96,1.805,z),(.27,.01,.016),leaf,.005)
sphere('Tomato fridge magnet',(-3.58,1.81,1.62),(.1,.04,.1),red)
current=old
cube('Bread basket',(-3.8,2.6,2.8),(1.0,.65,.25),edge,.12)
for i in range(3):sphere('Bread loaf',(-4.1+i*.3,2.6,2.98),(.16,.26,.18),gold)
pot(-4.2,1.1,.11,.29)
# Back kitchen cabinets.
group('recipes')
for x in [-1.9,-.65,.6,1.85,3.1]:
 cube('Pistachio base cabinet',(x,2.9,.72),(1.19,1.35,1.28),green,.09)
 cube('Inset cabinet panel',(x,2.19,.70),(.98,.035,.97),green,.08)
 cube('Wood cabinet pull',(x,2.12,1.09),(.30,.07,.055),wood,.025)
cube('Cream countertop',(.6,2.85,1.44),(6.7,1.55,.20),cream2,.09)
# Range.
cube('Range plate',(2.28,2.75,1.565),(1.5,1.15,.08),dark,.06)
for x in [1.9,2.6]:
 for y in [2.42,3.03]:cylinder('Burner',(x,y,1.62),.23,.04,ink)
cylinder('Terracotta cooking pot',(2.22,2.7,1.83),.40,.42,red);sphere('Pot lid',(2.22,2.7,2.05),(.41,.41,.08),red);sphere('Pot lid knob',(2.22,2.7,2.16),(.08,.08,.08),wood)
for x in [1.7,2.74]:cube('Pot side handle',(x,2.7,1.92),(.22,.1,.09),red,.04)
cube('Oven door',(2.28,2.13,.72),(1.04,.07,.70),dark,.08);cube('Oven glass',(2.28,2.075,.7),(.82,.035,.48),ink,.06)
for x in [1.95,2.25,2.55]:cylinder('Oven knob',(x,2.12,1.17),.055,.07,gold).rotation_euler.x=math.pi/2
cube('Wood hood',(2.28,3.30,3.1),(1.7,.7,.32),wood,.12);cube('Hood chimney',(2.28,3.60,3.5),(.5,.42,.7),cream2,.07)
# Chopping board, produce.
cube('Chopping board',(.35,2.55,1.59),(.85,.60,.09),wood,.1)
for i in range(3):sphere('Tomato',(0.1+i*.23,2.52,1.73),(.10,.09,.1),red)
line('Knife blade',[(.05,2.2,1.67),(.55,2.2,1.67)],.03,white)
pot(3.7,3.12,1.54,.19);mug(-1.75,2.56,1.55,gold)
# Floating shelf & colourful jars.
cube('Open shelf',(-2.2,3.47,2.76),(1.6,.53,.12),wood,.05)
for i,m in enumerate([pink,blue,gold]):
 cylinder('Pantry jar',(-2.7+i*.48,3.43,2.99),.15,.34,m);cylinder('Jar cork',(-2.7+i*.48,3.43,3.19),.155,.07,wood)
# Cookbook easel left foreground.
group('draw');cube('Book stand',(-3.35,-.4,1.0),(1.35,.55,.16),wood,.08)
for x in [-3.85,-2.85]:cube('Easel leg',(x,-.2,.55),(.10,.15,1.05),edge,.03)
book=cube('Open cookbook',(-3.35,-.23,1.65),(1.45,.16,1.05),cream2,.06);book.rotation_euler.x=math.radians(12)
cube('Book spine',(-3.35,-.34,1.65),(.04,.04,.98),pink,.02)
for i in range(5):
 cube('Recipe line',(-3.69,-.355,1.89-i*.12),(.42,.02,.024),wood,.005)
sphere('Book tomato sketch',(-3.02,-.36,1.65),(.19,.035,.19),red);sphere('Sketch leaf',(-3,-.4,1.86),(.1,.025,.055),leaf)
# Community pinboard, back right.
group('community');cube('Community corkboard',(4.17,3.63,2.64),(1.15,.16,1.28),wood,.09);cube('Cork insert',(4.17,3.52,2.64),(.99,.03,1.1),pink,.04)
for i,(x,z,m) in enumerate([(3.94,2.83,leaf),(4.37,2.45,gold),(4.37,2.98,blue)]):
 ob=cube('Polaroid frame',(x,3.47,z),(.38,.025,.43),white,.01);ob.rotation_euler.y=(-.1+i*.09);cube('Photo food',(x,3.445,z+.025),(.28,.015,.24),m,.015);sphere('Pin',(x,3.42,z+.19),(.035,.022,.035),red)
# Profile calendar on left wall.
group('profile');cube('Hanging calendar',(-4.73,.35,2.5),(.1,.90,1.1),white,.07)
for j in range(3):
 for i in range(4):sphere('Calendar dates',(-4.66,.05+i*.17,2.22+j*.18),(.018,.028,.028),pink if i==1 and j==1 else leaf,12)
cube('Calendar header',(-4.65,.35,2.91),(.03,.76,.22),red,.025)
# Central table and chairs.
group('meals');cube('Rounded dining tabletop',(.25,-1.15,1.05),(3.1,1.85,.22),wood,.23)
for x in [-.9,1.4]:
 for y in [-1.72,-.55]:cube('Table leg',(x,y,.49),(.17,.17,1.0),edge,.035)
cube('Linen runner',(.25,-1.15,1.18),(.92,1.79,.025),cream2,.03)
dish(-.7,-1.05,1.21);dish(1.15,-1.2,1.21);mug(.15,-.68,1.20,pink);pot(.18,-1.62,1.20,.13)
for x in [-1.05,1.4]:
 cube('Sage chair seat',(x,-2.35,.58),(.78,.73,.16),green,.13)
 for dx in [-.26,.26]:
  for dy in [-.24,.24]:cube('Chair leg',(x+dx,-2.35+dy,.27),(.09,.09,.55),wood,.025)
 cube('Chair back',(x,-2.64,1.02),(.78,.11,.7),green,.15)
# Woven oval rug under mascot.
group('Decor');sphere('Apricot oval rug',(2.8,-1.6,.095),(1.42,1.03,.035),rug,32)
for i in range(12):line('Rug fringe',[(1.57+i*.21,-2.38,.10),(1.52+i*.21,-2.51,.1)],.014,cream2)
# Original mascot sculpt, based on the app silhouette: purple round fuzzy creature, big uneven eyes, rice bowl.
group('mascot');sphere('Monster pear body',(2.95,-1.45,.83),(.68,.47,.70),purple,28)
for i in range(13):
 a=i*2*math.pi/13;sphere('Clay fur scallop',(2.95+.60*math.cos(a),-1.46,.84+.62*math.sin(a)),(.19,.33,.18),purple,16)
for x,z,rx in [(2.69,1.14,.2),(3.15,1.23,.23)]:
 sphere('Cream monster eye',(x,-1.878,z),(rx,.115,.23),cream2);sphere('Dark curious pupil',(x+.055,-1.979,z+.015),(.072,.036,.095),ink)
sphere('Smile',(3.0,-1.91,.79),(.31,.06,.18),ink);sphere('Happy tongue',(3.06,-1.975,.72),(.16,.015,.068),red)
for x in [2.87,3.12]:cube('Little tooth',(x,-1.975,.90),(.1,.025,.08),cream2,.02)
for x in [2.4,3.48]:sphere('Monster hand',(x,-1.85,.52),(.19,.18,.25),purple)
for x in [2.61,3.26]:sphere('Monster foot',(x,-1.68,.22),(.24,.28,.12),purple)
sphere('Bowl',(2.96,-1.98,.5),(.43,.32,.27),gold);cylinder('Bowl rim',(2.96,-1.98,.65),.38,.06,gold)
for i in range(30):
 x=2.96+random.uniform(-.29,.29);y=-1.98+random.uniform(-.22,.22);sphere('Rice grain',(x,y,.71+random.uniform(-.03,.03)),(.065,.04,.03),rice,10)
spoon=cube('Turquoise spoon handle',(3.28,-1.99,.96),(.09,.07,.64),blue,.04);spoon.rotation_euler.y=.42
sphere('Spoon bowl',(3.41,-1.99,1.25),(.12,.07,.18),blue)
# Accent rays.
for i in range(3):line('Golden delight ray',[(3.55+i*.12,-1.5,1.7-i*.10),(3.61+i*.16,-1.5,1.87-i*.07)],.04,gold)
# Pendant lamp.
group('Decor');line('Pendant cord',[(.4,1.05,4.45),(.4,1.05,3.4)],.018,ink)
sphere('Honey pendant shade',(.4,1.05,3.35),(.48,.48,.22),gold);sphere('Lamp glowing underside',(.4,1.05,3.27),(.36,.36,.045),white)
# Small shopping basket on foreground edge.
group('shopping');cube('Market basket',(-2.9,-2.7,.32),(1.0,.72,.5),pink,.13)
for i in range(5):cube('Basket weave',(-3.28+i*.19,-3.07,.34),(.06,.018,.28),cream,.01)
line('Basket handle',[(-3.3,-2.7,.52),(-3.25,-2.7,1.0),(-2.55,-2.7,1.0),(-2.5,-2.7,.52)],.045,wood)
for i in range(3):sphere('Market tomato',(-3.18+i*.27,-2.78,.65),(.17,.15,.16),red)
sphere('Lettuce',(-2.83,-2.48,.73),(.25,.18,.26),leaf)
# Blender source and GLB export. No render-only shaders, all PBR materials transfer.
current=None
for o in list(bpy.data.objects):
 if o.type=='CURVE':
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
# Camera and lights only for source review; web owns realtime lighting.
bpy.ops.object.camera_add(location=(12,-16,13));cam=bpy.context.object;cam.name='ArtDirectionCamera';cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=14;bpy.context.scene.camera=cam
bpy.context.scene.world.color=(.65,.65,.65)
for name,loc,power,size in [('Warm studio key',(-4,-6,10),1000,8),('Soft window light',(1,5,7),800,6)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1440;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art-source/lobby3d/kitchen-diorama.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'prototypes/3d-lobby/assets/kitchen.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_apply=True)
meshes=[o for o in bpy.data.objects if o.type=='MESH'];stats={'meshes':len(meshes),'triangles':sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons),'materials':len(bpy.data.materials),'style':'Original hand-sculpted clay kitchen, purple rice-bowl mascot','source':'art-source/lobby3d/kitchen-diorama.blend','model':'prototypes/3d-lobby/assets/kitchen.glb'}
(ROOT/'work/reports/lobby3d-model.json').write_text(json.dumps(stats,indent=2)+'\n');print('LOBBY_MODEL',json.dumps(stats))
