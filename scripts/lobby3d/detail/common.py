"""Editable mesh modelling tools. Dimensions in metres, Z up; front faces -Y."""
import bpy, math, random, json
from mathutils import Vector
from contextlib import contextmanager
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];random.seed(712)
CURRENT=None;STATIONS={};PARTS=[];SCENE_KEY='';M={}
def material(key,color,rough=.6,metal=0):
 m=bpy.data.materials.new(key);lin=lambda c:c/12.92 if c<.04045 else ((c+.055)/1.055)**2.4
 m.diffuse_color=(*[lin(int(color[i:i+2],16)/255) for i in (1,3,5)],1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=m.diffuse_color;p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 M[key]=m;return m
def palette():
 for key,c,r,met in [('ivory','#E9DCC4',.78,0),('enamel','#C3D5CB',.26,0),('cream','#FFF4D6',.38,0),('jade','#537C6F',.5,0),('ink','#293C3A',.6,0),('coral','#C76958',.45,0),('rose','#D7A294',.65,0),('wood','#AD784E',.62,0),('endgrain','#775037',.72,0),('grain','#96633F',.7,0),('brass','#B99355',.28,.65),('steel','#A6B3AE',.25,.75),('darkmetal','#374A48',.35,.6),('lavender','#9F87B7',.9,0),('purple_dark','#6B537C',.88,0),('paper','#F8EED8',.95,0),('linen','#CEB38F',.95,0),('blue','#7BABB2',.4,0),('leaf','#4E824C',.7,0),('leaflight','#91AA64',.73,0),('vein','#B7C582',.8,0),('tomato','#C44C37',.36,0),('flesh','#DD8C66',.65,0),('gold','#D8A445',.4,0),('rice','#F6E6C4',.72,0),('white','#FCF5E9',.33,0)]:material(key,c,r,met)
 material('glass','#B5D1CB',.18,.05);p=M['glass'].node_tree.nodes.get('Principled BSDF');p.inputs['Alpha'].default_value=.35;M['glass'].surface_render_method='DITHERED';M['glass'].diffuse_color=(*M['glass'].diffuse_color[:3],.35)
 material('light','#FFF3B5',.28,0);p=M['light'].node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.75,.35,1);p.inputs['Emission Strength'].default_value=.35
FONT=None
def font():
 global FONT
 if FONT is None:FONT=bpy.data.fonts.load(str(ROOT/'client/entry/src/main/resources/rawfile/fonts/shiku_hand.ttf'))
 return FONT
def group(name,parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o)
 if parent:o.parent=parent
 return o
@contextmanager
def part(key,label,station,details,parent=None):
 global CURRENT
 old=CURRENT
 if station not in STATIONS:STATIONS[station]=group(station)
 ob=group('part_'+key,parent or STATIONS[station]);ob['label']=label;ob['details']=details;ob['station']=station
 routes={'diary_calendar':'meal-plan','diary_journal':'diary','diary_meal':'new-meal','diary_receipts':'stats','diary_pen':'new-meal','kitchen_recipebook':'draw','kitchen_meal':'new-meal','fridge_market':'shopping','monster_favorites':'favorites','monster_badges':'stats','square_menu':'community-search','square_table':'new-meal'}
 if key in routes:ob['route']=routes[key]
 CURRENT=ob
 PARTS.append({'id':ob.name,'name':label,'station':station,'details':details})
 try:yield ob
 finally:CURRENT=old
def attach(o,m):
 if isinstance(m,str):m=M[m]
 o.data.materials.append(m)
 if CURRENT:o.parent=CURRENT
 return o
def mesh(name,verts,faces,m,smooth=True):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);attach(o,m)
 if smooth:
  for p in me.polygons:p.use_smooth=True
 return o
def box(name,loc,size,m='wood',bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);attach(o,m)
 if bevel:
  mod=o.modifiers.new('Machined edge radius','BEVEL');mod.width=min(bevel,min(size)*.4);mod.segments=4;o.modifiers.new('Surface normals','WEIGHTED_NORMAL')
 return o
def lathe(name,profile,loc,m,segments=48,warp=0):
 vs=[]
 for j,(r,z) in enumerate(profile):
  for i in range(segments):
   a=2*math.pi*i/segments;rr=r*(1+warp*math.sin(3*a+j*.25));vs.append((rr*math.cos(a),rr*math.sin(a),z))
 fs=[]
 for j in range(len(profile)-1):
  for i in range(segments):fs.append((j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i))
 o=mesh(name,vs,fs,m);o.location=loc;return o
def tube(name,points,r,m='brass',sides=10):
 # Catmull-Rom centreline, with parallel transported frames to prevent twisted joints.
 src=[Vector(p) for p in points];radii=r if isinstance(r,list) else [r]*len(src);dense=[];dr=[]
 for j in range(len(src)-1):
  p0=src[max(0,j-1)];p1=src[j];p2=src[j+1];p3=src[min(j+2,len(src)-1)]
  for k in range(7):
   t=k/7;pt=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);dense.append(tuple(pt));dr.append(radii[j]*(1-t)+radii[j+1]*t)
 dense.append(tuple(src[-1]));dr.append(radii[-1]);points=dense;r=dr;vs=[];last_u=None
 for j,pt in enumerate(points):
  p=Vector(pt);t=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(j-1,0)]);t.normalize()
  if last_u is None:
   u=t.cross(Vector((0,0,1)))
   if u.length<.001:u=t.cross(Vector((0,1,0)))
  else:u=last_u-t*last_u.dot(t)
  u.normalize();last_u=u.copy();v=t.cross(u).normalized();rad=r[j]
  for i in range(sides):vs.append(tuple(p+rad*(u*math.cos(i*2*math.pi/sides)+v*math.sin(i*2*math.pi/sides))))
 fs=[]
 for j in range(len(points)-1):
  for i in range(sides):fs.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
 fs.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+i for i in range(sides))]);return mesh(name,vs,fs,m)
def curve(name,points,r,m='brass'):
 cv=bpy.data.curves.new(name,'CURVE');cv.dimensions='3D';cv.resolution_u=8;cv.bevel_depth=r;cv.bevel_resolution=2;s=cv.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type=p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,cv);bpy.context.collection.objects.link(o);attach(o,m);return o
def text(body,loc,size=.18,m='ink',rotation=(math.pi/2,0,0),name=None):
 c=bpy.data.curves.new(name or body,'FONT');c.body=body;c.font=font();c.size=size;c.align_x='CENTER';c.extrude=.0015;c.bevel_depth=.0008;c.resolution_u=5;o=bpy.data.objects.new(name or 'Lettering '+body,c);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=rotation;attach(o,m);return o
def screw(x,y,z,normal='front'):
 ob=lathe('Countersunk screw',[(0,0),(.026,0),(.028,.012),(0,.014)],(0,0,0),'steel',20);ob.location=(x,y,z)
 if normal=='front':ob.rotation_euler.x=math.pi/2;box('Screw slot',(x,y-.018,z),(.029,.006,.004),'darkmetal',.001)
 else:box('Screw slot',(x,y,z+.018),(.029,.004,.004),'darkmetal',.001)
def grain_lines(x,y,z,w,d):
 for j in range(4):
  yy=y-d*.3+j*d*.2;curve('Oak growth ring',[(x-w*.45,yy,z),(x-w*.15,yy+.025*math.sin(j),z),(x+w*.16,yy-.035,z),(x+w*.45,yy+.015,z)],.003,'grain')
def surface(name,loc,w,d,m='linen',amp=.012,nx=35,ny=20):
 v=[]
 for j in range(ny+1):
  for i in range(nx+1):
   xx=(i/nx-.5)*w;yy=(j/ny-.5)*d;zz=amp*(math.sin(xx*17+yy*4)+.5*math.sin(yy*29));v.append((loc[0]+xx,loc[1]+yy,loc[2]+zz))
 f=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i) for j in range(ny) for i in range(nx)];return mesh(name,v,f,m)
def bowl(x,y,z,r=.4,m='cream'):
 # Continuous revolved outer wall, rounded lip, inner wall and real concavity.
 return lathe('Thrown ceramic bowl',[(0,0),(.45*r,0),(.5*r,.04),(.7*r,.10),(.92*r,.24),(r,.35),(r*1.015,.38),(r*.98,.40),(r*.93,.38),(r*.88,.26),(r*.65,.12),(.35*r,.07),(0,.065)],(x,y,z),m,64,.008)
def plate(x,y,z,r=.43):
 lathe('Glazed plate cross section',[(0,0),(r*.68,0),(r*.73,.025),(r*.92,.065),(r,.085),(r*1.02,.10),(r,.115),(r*.89,.095),(r*.65,.04),(0,.04)],(x,y,z),'cream',64,.004)
 lathe('Handpainted jade rim',[(r*.95,.105),(r*.99,.115),(r*.99,.118),(r*.95,.108)],(x,y,z),'jade',64)
def mug(x,y,z,m='blue',scale=1):
 r=.17*scale;h=.36*scale;lathe('Mug hollow wall',[(0,0),(r*.9,0),(r,.04),(r,h),(r*.96,h+.02),(r*.83,h+.02),(r*.8,.07),(0,.06)],(x,y,z),m)
 curve('Ceramic loop handle',[(x+r*.9,y,z+h*.82),(x+r*1.9,y,z+h*.82),(x+r*2,y,z+h*.3),(x+r*.92,y,z+h*.24)],.027*scale,m)
 lathe('Tea meniscus',[(r*.8,h*.79),(0,h*.79)],(x,y,z),'endgrain')
def leaf(name,loc,length=.6,width=.2,angle=0,curl=.15,m='leaf'):
 vs=[];rows=15;cols=6
 for j in range(rows+1):
  t=j/rows;w=width*(math.sin(math.pi*t)**.7)*(1+.12*math.sin(t*20));zz=curl*t*t
  for i in range(cols+1):
   s=(i/cols-.5)*2;xx=w*s;yy=t*length;z=zz+width*(.16*s*s*math.sin(t*12)+.11*math.sin(t*25)*abs(s))
   vs.append((loc[0]+xx*math.cos(angle)-yy*math.sin(angle),loc[1]+xx*math.sin(angle)+yy*math.cos(angle),loc[2]+z))
 fs=[(j*(cols+1)+i,j*(cols+1)+i+1,(j+1)*(cols+1)+i+1,(j+1)*(cols+1)+i) for j in range(rows) for i in range(cols)];o=mesh(name,vs,fs,m);so=o.modifiers.new('Leaf thickness','SOLIDIFY');so.thickness=min(.006,width*.05)
 def point(t,s=0):
  xx=width*math.sin(math.pi*t)*s;yy=t*length;return(loc[0]+xx*math.cos(angle)-yy*math.sin(angle),loc[1]+xx*math.sin(angle)+yy*math.cos(angle),loc[2]+curl*t*t+.009)
 curve('Leaf central rib',[point(0),point(.3),point(.65),point(1)],min(.009,width*.06),'vein')
 for t in [.25,.4,.55,.7]:
  for sign in [-1,1]:curve('Branching leaf vein',[point(t),point(t+.09,.38*sign),point(min(t+.16,.95),.8*sign)],min(.003,width*.025),'leaflight')
 return o
def tomato(x,y,z,r=.21):
 prof=[]
 for j in range(25):
  t=j/24;rr=r*math.sin(math.pi*t)**.65;prof.append((rr,r*(t*1.8)))
 lathe('Lobed tomato skin',prof,(x,y,z),'tomato',48,.045)
 for i in range(5):leaf('Tomato calyx',(x,y,z+r*1.8),r*.65,r*.1,i*math.tau/5,-r*.25)
 curve('Tomato stem',[(x,y,z+r*1.78),(x+.03,y,z+r*2.05)],.018,'leaf')
def carrot(x,y,z):
 lathe('Tapered carrot',[(0,0),(.04,.04),(.075,.15),(.11,.35),(.12,.5),(.09,.55),(0,.55)],(x,y,z),'flesh',32,.03)
 for i in range(6):curve('Carrot root furrow',[(x-.05,y-.075,z+.12+i*.06),(x+.01,y-.09,z+.13+i*.06),(x+.05,y-.075,z+.12+i*.06)],.006,'coral')
 for i in range(4):leaf('Carrot feathery leaf',(x,y,z+.55),.32,.045,i*1.7,.18)
def egg(x,y,z):lathe('Asymmetric egg shell',[(0,0),(.10,.025),(.16,.11),(.175,.23),(.15,.34),(.10,.44),(0,.48)],(x,y,z),'ivory',40)
def bottle(x,y,z,label='MILK',m='cream',h=.9):
 jar=label in ['JAM','盐','糖','胡椒','辣椒'];cap_r=.178 if jar else .095
 if jar:
  lathe('Wide mouth hollow pantry jar',[(0,0),(.17,0),(.19,.035),(.19,h*.82),(.178,h*.94),(.16,h*.94),(.172,h*.80),(.172,.055),(0,.055)],(x,y,z),'glass',48)
  fill='cream' if label in ['盐','糖'] else 'endgrain' if label=='胡椒' else 'coral'
  lathe('Contained spice or preserve',[(0,0),(.165,0),(.17,h*.65),(.16,h*.70),(0,h*.70+.008)],(x,y,z+.045),fill,48)
  if label in ['盐','糖','胡椒','辣椒']:
   rng=random.Random(label)
   for i in range(32):
    a=i*2.399;r=.145*math.sqrt((i+.5)/32);grain=lathe('Visible seasoning surface grain',[(0,0),(.008,0),(.010,.006),(0,.012)],(x+r*math.cos(a),y+r*math.sin(a),z+.045+h*.70+.008),fill,8);grain.rotation_euler.z=rng.random()*math.tau
 else:
  lathe('Bottle shoulder neck and base',[(0,0),(.17,0),(.19,.05),(.19,h*.65),(.17,h*.72),(.09,h*.8),(.085,h*.95),(0,h*.95)],(x,y,z),m,48)
 lathe('Bottle rolled cap',[(0,0),(cap_r*.95,0),(cap_r,.03),(cap_r,.075),(0,.075)],(x,y,z+h*.94),'brass',40)
 box('Bottle label',(x,y-.192,z+h*.42),(.27,.008,.27),'paper',.015);text(label,(x,y-.201,z+h*.41),.075,'jade')

def floor(name):
 with part(name+'_base','建筑地台','Architecture','边框榫接、铺装缝、包边、独立踢脚线'):
  box('Foundation bevel',(0,0,-.23),(9.2,7.7,.4),'ivory',.16);box('Inset brass base line',(0,0,-.08),(9.05,7.55,.035),'brass',.012)
  for j in range(10):
   for i in range(5):box('Staggered oak board',(-3.65+i*1.82,-3.35+j*.73,.01),(1.79,.70,.07),'wood',.012)
def wall():
 box('Back plaster',(0,3.65,2),(9.15,.18,4),'ivory',.05);box('Left cutaway',(-4.5,1.3,1.45),(.16,4.6,2.9),'ivory',.04)
 box('Oak skirting',(0,3.52,.18),(9.0,.09,.24),'endgrain',.015)
def sign(title,x=0,y=3.48,z=3.3,w=2.9):
 box('Enamel title plaque',(x,y,z),(w,.10,.5),'jade',.08);text(title,(x,y-.063,z-.07),.26,'cream')
def window(x=0):
 box('Recessed window',(x,3.53,2.35),(2.8,.06,1.8),'blue',.08)
 for xx in [-1.45,0,1.45]:box('Rebated window frame',(x+xx,3.43,2.35),(.10,.18,1.98),'cream',.018)
 for zz in [1.36,2.35,3.34]:box('Cross sash',(x,3.43,zz),(3,.18,.09),'cream',.015)
 box('Sill timber',(x,3.20,1.28),(3.2,.64,.12),'wood',.025);grain_lines(x,3.2,1.345,3,.5)
def plant(x,y,z,r=.25):
 lathe('Planter with inside rim',[(0,0),(.7*r,0),(r,.42),(r*1.05,.44),(r*.9,.47),(r*.85,.4),(.65*r,.06),(0,.06)],(x,y,z),'rose',48,.006)
 lathe('Recessed planter soil',[(0,0),(.85*r,0),(.85*r,.008),(0,.008)],(x,y,z+.405),'endgrain',32)
 for i in range(8):leaf('Sculpted plant leaf',(x,y,z+.4),.42+(i%3)*.08,.13,i*2.4,.18+(i%3)*.07)
def table(x,y,w=3,d=1.5,z=1.05):
 box('Solid oak tabletop',(x,y,z),(w,d,.16),'wood',.08);grain_lines(x,y,z+.083,w*.96,d*.9)
 for dx in [-w*.38,w*.38]:
  for dy in [-d*.34,d*.34]:
   # Tapered, angled furniture legs are custom swept sections.
   tube('Tapered table leg',[(x+dx*1.07,y+dy*1.08,.08),(x+dx,y+dy,z-.07)],[.06,.095],'endgrain',4)
 box('Front apron',(x,y-d*.37,z-.2),(w*.78,.07,.23),'endgrain',.012)
def start_scene(key):
 global CURRENT,STATIONS,PARTS,SCENE_KEY
 CURRENT=None;STATIONS={};PARTS=[];SCENE_KEY=key;sc=bpy.data.scenes.new(key);bpy.context.window.scene=sc;return sc
def finalize(key):
 global CURRENT
 CURRENT=None;sc=bpy.context.scene
 for ob in list(sc.objects):
  if ob.type in ['CURVE','FONT']:
   bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH');ob.select_set(False)
 from refinement import assign_metric_uv
 assign_metric_uv()
 # Evaluated counts include bevel, thickness and subdivision.
 deps=bpy.context.evaluated_depsgraph_get();tris=0
 for ob in sc.objects:
  if ob.type=='MESH':
   me=ob.evaluated_get(deps).to_mesh();me.calc_loop_triangles();tris+=len(me.loop_triangles);ob.evaluated_get(deps).to_mesh_clear()
 path=ROOT/f'prototypes/3d-lobby/assets/{key}.glb';bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_extras=True,export_cameras=False,export_lights=False)
 return {'scene':key,'parts':PARTS[:],'meshes':sum(o.type=='MESH' for o in sc.objects),'evaluated_triangles':tris,'bytes':path.stat().st_size,'model':str(path.relative_to(ROOT))}
