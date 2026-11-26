"""Four additional editable, original clay dioramas for the realtime lobby demo."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
exec((ROOT/'scripts/lobby3d/build_scene.py').read_text().split('# Foundation and parquet.')[0])
bpy.context.preferences.filepaths.save_version=0
# Soft edges remain round when inspected close-up.
base_cube=cube
base_sphere=sphere
def cube(name,loc,scale,m,bevel=.08):
 o=base_cube(name,loc,scale,m,bevel)
 for mod in o.modifiers:
  if mod.type=='BEVEL':mod.segments=5
 return o
def sphere(name,loc,scale,m,seg=32):return base_sphere(name,loc,scale,m,seg)
def torus(name,loc,r,t,m):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=40,minor_segments=10,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return parent(o)
def panel_floor(color=cream):
 group('Architecture');cube('Handmade floating base',(0,0,-.3),(9.6,7.8,.5),color,.24)
 for j in range(10):
  for i in range(5):cube('Individual floorboard',(-3.8+i*1.9,-3.42+j*.75,0),(1.85,.71,.1),wood if (i+j)%5 else cream2,.025)
def wall(color=cream):
 cube('Plaster back wall',(0,3.65,1.85),(9.5,.18,3.8),color,.12);cube('Left cutaway wall',(-4.65,1,1.45),(.18,5.5,3),color,.12)
 cube('Skirting',(0,3.5,.22),(9.3,.12,.25),edge,.04)
def window(x=0):
 cube('Blue window inset',(x,3.52,2.35),(2.5,.07,1.7),glass,.15)
 for dx in [-1.3,0,1.3]:cube('Window mullion',(x+dx,3.43,2.35),(.09,.12,1.82),white,.03)
 for z in [1.43,3.26]:cube('Window frame',(x,3.43,z),(2.7,.18,.11),white,.04)
 cube('Window sill',(x,3.28,1.39),(2.85,.5,.14),wood,.04)
def stool(x,y,m):
 cylinder('Round upholstered seat',(x,y,.68),.47,.2,m,40)
 for dx,dy in [(-.25,-.25),(.25,-.25),(-.25,.25),(.25,.25)]:cube('Tapered stool leg',(x+dx,y+dy,.32),(.08,.08,.64),wood,.025)
def table(x,y,w=3,h=1.9):
 cube('Thick rounded table',(x,y,1.09),(w,h,.2),wood,.2)
 for dx in [-w*.38,w*.38]:
  for dy in [-h*.35,h*.35]:cube('Table legs',(x+dx,y+dy,.52),(.15,.15,1.04),edge,.04)
def books(x,y,z,n=5):
 for i in range(n):cube('Bound book',(x+i*.18,y,z+.26+(i%2)*.04),(.14,.37,.52+(i%2)*.08),[green,pink,blue,lavender,gold][i%5],.02)
def carrots(x,y,z):
 for i in range(3):
  o=sphere('Carrot',(x+i*.15,y,z),(.07,.24,.07),red);o.rotation_euler.z=i*.2
  for j in range(3):line('Carrot leaves',[(x+i*.15,y+.2,z),(x+i*.15+(j-1)*.08,y+.43,z+.08)],.014,leaf)
def tomatoes(x,y,z):
 for i in range(4):
  a=i*2.3;xx=x+math.sin(a)*.22;yy=y+math.cos(a)*.17;sphere('Ripe tomato',(xx,yy,z),(.15,.14,.14),red)
  for j in range(4):o=sphere('Tomato crown',(xx,yy,z+.13),(.025,.09,.013),leaf);o.rotation_euler.z=j*math.pi/2

def dining():
 panel_floor();wall();window(.8)
 group('Decor');cube('Woven pastel rug',(.1,-.7,.09),(5.8,4.2,.04),green,.15)
 for i in range(26):line('Rug woven thread',[(-2.6,-2.65+i*.15,.118),(2.8,-2.65+i*.15,.118)],.009,cream2)
 for x in [-3.5,3.65]:
  pot(x,2.5,.08,.38)
  for i in range(6):
   a=i*2.3;sphere('Indoor tree canopy',(x+math.cos(a)*.35,2.5+math.sin(a)*.3,1.3+i*.12),(.4,.32,.4),leaf)
 group('meals');table(0,-.4,4.6,2.7);cube('Scalloped linen runner',(0,-.4,1.205),(1,2.62,.026),cream2,.05)
 for x,y in [(-1.4,-.7),(1.4,-.7),(-1.4,.4),(1.4,.4)]:
  torus('Raised porcelain plate rim',(x,y,1.23),.36,.035,white);dish(x,y,1.24)
  for dx in [.49,.56]:line('Chopsticks',[(x+dx,y-.34,1.24),(x+dx,y+.32,1.24)],.012,edge)
  cylinder('Soup bowl',(x-.5,y,1.35),.19,.22,blue);cylinder('Soup surface',(x-.5,y,1.47),.155,.015,gold)
 mug(.0,-.8,1.22,pink);pot(.0,.3,1.22,.16)
 for x in [-1.45,1.45]:
  for y in [-2.2,1.4]:stool(x,y,pink if y<0 else green)
 group('draw');cube('Sideboard',(2.9,2.8,.68),(2.7,.85,1.3),green,.12);cube('Sideboard top',(2.9,2.8,1.4),(2.85,1,.14),cream2,.06)
 for i in range(3):cube('Drawer front',(2.1+i*.8,2.33,.95),(.7,.04,.55),green,.04);sphere('Brass pull',(2.1+i*.8,2.28,.98),(.05,.035,.05),gold)
 cylinder('Cake stand',(2.8,2.7,1.53),.38,.13,white);sphere('Steamed bun',(2.8,2.7,1.76),(.26,.25,.18),cream2)
 mug(3.6,2.75,1.48,blue)
 group('profile');cube('Meal calendar board',(-2.5,3.43,2.4),(1.8,.15,1.7),pink,.12)
 for j in range(4):
  for i in range(5):sphere('Calendar marker',(-3.1+i*.3,3.33,1.9+j*.28),(.05,.025,.05),gold if (i+j)%5==0 else white)

def pantry_room():
 panel_floor(blue);wall(cream2);group('pantry')
 # Fully open shelving lets users inspect each food item at close range.
 for x in [-2.7,.15,3]:
  for dx in [-1.18,1.18]:cube('Pantry upright',(x+dx,2.5,1.8),(.12,.95,3.6),green,.05)
  for z in [.28,1.2,2.12,3.04]:cube('Thick oak shelf',(x,2.5,z),(2.56,1.05,.14),wood,.05)
 for x in [-3.3,-2.65,-1.95]:
  cylinder('Glass storage jar',(x,2.5,2.48),.21,.55,cream);cylinder('Cork jar lid',(x,2.5,2.79),.22,.08,edge)
  cube('Jar handwritten label',(x,2.275,2.48),(.22,.015,.17),white,.02)
 for i in range(4):
  x=-.72+i*.55;cylinder('Spice tin',(x,2.5,3.33),.18,.45,[pink,blue,gold,lavender][i]);cylinder('Tin lid',(x,2.5,3.58),.19,.07,wood)
 for x in [2.4,3,3.6]:
  cube('Milk carton',(x,2.5,2.48),(.38,.42,.58),cream2,.04);cube('Milk blue label',(x,2.27,2.46),(.27,.02,.25),blue,.025)
 for x in [-2.7,.15,3]:
  cube('Woven produce crate',(x,2.5,.65),(2,.8,.5),edge,.08)
  for i in range(10):cube('Crate slat',(x-.9+i*.2,2.075,.66),(.10,.025,.34),wood,.015)
  if x<0:tomatoes(x,2.5,1.02)
  else:carrots(x-.3,2.5,1.02)
 for x in [-3.35,-2.7,-2.05]:
  sphere('Cabbage',(x,2.5,1.53),(.25,.22,.25),leaf)
  for j in range(4):torus('Cabbage leaf fold',(x,2.5,1.53+j*.04),.18-j*.025,.017,green)
 for x in [-.6,.05,.7]:
  cylinder('Rice container',(x,2.5,1.55),.22,.54,cream);cylinder('Container lid',(x,2.5,1.85),.23,.07,pink)
 group('shopping');table(-.8,-1.3,3.8,1.7)
 cube('Grocer paper bag',(-1.8,-1.25,1.53),(.8,.6,.65),cream,.05);line('Bag handle',[(-2,-1.25,1.86),(-2,-1.25,2.2),(-1.6,-1.25,2.2),(-1.6,-1.25,1.86)],.025,edge)
 carrots(-.8,-1.25,1.25);tomatoes(.4,-1.25,1.33)
 group('recipes');cube('Kitchen scale',(2.7,-1.3,.7),(1.2,1,.3),blue,.13);cylinder('Scale tray',(2.7,-1.3,.95),.6,.16,white);torus('Scale dial',(2.7,-1.82,.7),.21,.025,gold).rotation_euler.x=math.pi/2
 pot(-4,-1.6,.06,.28)

def courtyard():
 panel_floor(green)
 group('Architecture')
 # Open pergola and tiled garden instead of another enclosed kitchen.
 cube('Garden paved platform',(0,0,.10),(9.2,7.4,.12),cream2,.15)
 for i in range(9):
  for j in range(7):cube('Terracotta garden tile',(-4+i,j-3,.18),(.95,.95,.05),rug if (i+j)%3 else pink,.025)
 for x in [-4.1,4.1]:
  for y in [-2.8,3]:cube('Pergola post',(x,y,1.85),(.2,.2,3.5),wood,.06)
 for y in [-2.8,3]:cube('Pergola beam',(0,y,3.7),(8.9,.2,.25),edge,.05)
 for i in range(7):cube('Pergola roof batten',(-3.8+i*1.25,.1,3.88),(.14,6.2,.15),wood,.04)
 # Catenary string lights with little geometric bulb sockets.
 line('String light cable',[(-4,-2.7,3.55),(0,-2.7,3.05),(4,-2.7,3.55)],.015,ink)
 for i in range(11):
  x=-3.7+i*.74;z=3.05+.5*(x/4)**2;cylinder('Bulb socket',(x,-2.7,z-.045),.04,.09,edge);sphere('Warm festival bulb',(x,-2.7,z-.15),(.075,.075,.105),gold)
 group('community');cube('Community noticeboard',(0,3.15,2.35),(3.8,.18,2),green,.12)
 for x in [-1.5,1.5]:cube('Board stand',(x,3.2,1.1),(.12,.17,2.1),wood,.03)
 for i in range(6):
  x=-1.25+(i%3)*1.2;z=1.93+(i//3)*.8;cube('Postcard white border',(x,3.03,z),(.82,.04,.65),white,.03);cube('Postcard image',(x,2.997,z+.05),(.65,.018,.4),[pink,gold,blue][i%3],.025);sphere('Postcard meal illustration',(x,2.965,z+.05),(.18,.025,.12),red);sphere('Pushpin',(x,2.95,z+.28),(.04,.035,.04),gold)
 group('meals');table(-2,-.25,2.7,1.8);dish(-2.5,-.2,1.23);dish(-1.5,-.2,1.23);mug(-2,.3,1.22);stool(-2,-1.7,pink)
 group('recipes');table(2,-.25,2.7,1.8);dish(1.5,-.2,1.23);dish(2.5,-.2,1.23);mug(2,.3,1.22,pink);stool(2,-1.7,blue)
 group('Decor')
 for x,y in [(-4,1.7),(4,1.7),(-3.5,-2.9),(3.5,-2.9)]:
  pot(x,y,.2,.3)
  for i in range(8):
   a=i*2.4;sphere('Garden climbing foliage',(x+math.cos(a)*.25,y+math.sin(a)*.25,.8+i*.25),(.33,.24,.3),leaf)
 # Fluted café counter, pastry tray and ceramic cups.
 group('draw');cube('Cafe cart',(0,1.9,.7),(2.3,.9,1.2),pink,.13);cube('Cafe counter',(0,1.9,1.4),(2.5,1.1,.15),cream2,.07)
 for i in range(16):cube('Counter flute',(-1+i*.13,1.43,.8),(.045,.035,.83),rug,.02)
 for x in [-.75,.75]:mug(x,1.9,1.5,blue)
 dish(0,1.9,1.52)

def study():
 panel_floor(lavender);wall(cream);window(-1.2)
 group('profile');cube('Personal writing desk',(-.4,1.3,1.12),(4.8,1.7,.19),wood,.15)
 for x in [-2.35,1.55]:
  for y in [.7,1.9]:cube('Desk tapered legs',(x,y,.55),(.13,.13,1.1),edge,.035)
 cube('Blotting paper',(-.5,1.2,1.23),(2.3,1.2,.025),green,.05)
 for x in [-.95,-.05]:cube('Open journal page',(x,1.15,1.27),(.85,.91,.04),cream2,.035)
 for j in range(7):cube('Written journal line',(-.95,1.47-j*.105,1.3),(.62,.014,.012),wood,.004)
 for i in range(3):sphere('Journal sticker',(-.1,1.4-i*.26,1.31),(.16,.08,.014),[pink,gold,blue][i])
 cylinder('Pen cup',(1.05,1.5,1.4),.16,.3,pink)
 for i in range(4):cube('Pencil',(1+i*.04,1.5,1.72),(.025,.025,.55),[gold,blue,red,leaf][i],.006)
 mug(-2,1.3,1.25,blue);books(.5,1.85,1.24,4);stool(-.4,-.4,lavender)
 group('Decor');cube('Cozy reading rug',(.5,-1.8,.1),(4.4,2.6,.045),rug,.2)
 cube('Lavender sofa base',(2.8,-1.3,.46),(2.25,1.25,.6),lavender,.25);cube('Sofa back',(3.65,-1.3,1.05),(.35,1.3,1),lavender,.16)
 for y in [-1.8,-.8]:cube('Seat cushion',(2.8,y,.83),(1.5,.72,.22),pink,.17)
 cube('Throw pillow',(3.2,-1.4,1.16),(.25,.52,.58),cream2,.14)
 group('recipes');cube('Favourite recipe bookshelf',(-3.7,1.8,1.2),(1.25,.85,2.35),green,.12)
 for z in [.38,1.1,1.8,2.43]:cube('Bookcase shelf',(-3.7,1.28,z),(1.22,1.0,.1),wood,.035)
 for z in [.45,1.17,1.87]:books(-4.15,1.3,z,5)
 group('meals');cube('Wall calendar',(2.6,3.43,2.4),(1.9,.12,1.8),white,.12);cube('Calendar coral top',(2.6,3.34,3),(1.85,.05,.44),red,.08)
 for j in range(4):
  for i in range(5):sphere('Embossed calendar dot',(2+i*.3,3.32,1.9+j*.26),(.045,.025,.045),pink if i==2 else leaf)
 group('Decor');pot(-3,-2,.1,.35);pot(.9,3.25,1.45,.17)
 # Small ceramic rice-bowl mascot on desk: independent profile souvenir.
 group('mascot');sphere('Pocket monster',(-1.9,1.85,1.59),(.23,.2,.3),purple)
 for x in [-2,-1.8]:sphere('Pocket eye',(x,1.66,1.7),(.075,.035,.085),white);sphere('Pocket pupil',(x+.018,1.625,1.7),(.025,.015,.035),ink)

reports=[]
for index,(key,builder) in enumerate([('meals',dining),('pantry',pantry_room),('community',courtyard),('profile',study)]):
 sc=bpy.context.scene if index==0 else bpy.data.scenes.new(key)
 sc.name=key;bpy.context.window.scene=sc;current=None;builder();current=None
 for o in list(sc.objects):
  if o.type=='CURVE':
   bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)
 bpy.ops.object.select_all(action='SELECT')
 path=ROOT/f'prototypes/3d-lobby/assets/{key}.glb'
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,use_active_scene=True,export_cameras=False,export_lights=False,export_apply=True)
 reports.append({'scene':key,'meshes':sum(o.type=='MESH' for o in sc.objects),'bytes':path.stat().st_size,'model':str(path.relative_to(ROOT))})
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art-source/lobby3d/living-spaces.blend'))
(ROOT/'work/reports/lobby3d-rooms-model.json').write_text(json.dumps(reports,indent=2)+'\n');print('ROOMS_COMPLETE',json.dumps(reports))
