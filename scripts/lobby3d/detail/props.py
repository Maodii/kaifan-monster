from common import *

def book(x,y,z,w=1.5,d=1.1,title='家常食谱'):
 box('Cloth book cover',(x,y,z),(w+.1,d+.1,.08),'jade',.025)
 for i in range(9):
  surface('Layered curved paper',(x,y,z+.05+i*.013),w,d,'paper',amp=.007+i*.001,nx=24,ny=10)
 curve('Sewn book spine',[(x-w*.48,y-d*.49,z+.10),(x-w*.48,y,z+.14),(x-w*.48,y+d*.49,z+.1)],.016,'linen')
 text(title,(x+.15,y+.2,z+.19),.16,'ink',(0,0,0))
 for j in range(4):box('Printed instruction line',(x+.12,y-.12-j*.12,z+.19),(w*.52,.017,.008),'wood',.003)
def ring(x,y,z,r=.09,m='brass',axis='z'):
 ob=lathe('Circular metal ring',[(r+math.cos(a*math.tau/12)*.014,math.sin(a*math.tau/12)*.014) for a in range(13)],(0,0,0),m,40)
 ob.location=(x,y,z)
 if axis=='x':ob.rotation_euler.y=math.pi/2
 if axis=='y':ob.rotation_euler.x=math.pi/2
 return ob
def chair(x,y,rot=0,m='jade'):
 # Continuous bent-plywood profile, with thickness, rather than a box and ball back.
 vs=[];rows=20;cols=14
 for j in range(rows+1):
  t=j/rows
  if t<.58:yy=-.42+t/.58*.75;zz=.65+.025*math.cos(t*5)
  else:a=(t-.58)/.42*math.pi*.43;yy=.33+math.sin(a)*.25;zz=.66+(1-math.cos(a))*.72
  for i in range(cols+1):
   xx=(i/cols-.5)*.85*(1-.10*math.sin(t*math.pi));yy2=yy+.04*(xx/.45)**2
   vs.append((x+xx*math.cos(rot)-yy2*math.sin(rot),y+xx*math.sin(rot)+yy2*math.cos(rot),zz))
 fs=[(j*(cols+1)+i,j*(cols+1)+i+1,(j+1)*(cols+1)+i+1,(j+1)*(cols+1)+i) for j in range(rows) for i in range(cols)];o=mesh('Steam bent plywood seat',vs,fs,m);o.modifiers.new('Plywood thickness','SOLIDIFY').thickness=.055;mod=o.modifiers.new('Soft plywood edge','BEVEL');mod.width=.02;mod.segments=3
 for dx in [-.3,.3]:
  for dy in [-.25,.25]:
   xx=dx*math.cos(rot)-dy*math.sin(rot);yy=dx*math.sin(rot)+dy*math.cos(rot);tube('Splayed chair leg',[(x+xx*1.15,y+yy*1.15,.07),(x+xx,y+yy,.65)],[.035,.055],'endgrain',8)
 for dx in [-.3,.3]:
  xx=dx*math.cos(rot);yy=dx*math.sin(rot);screw(x+xx,y+yy,.72,normal='top')
def steak(x,y,z):
 if 'seared-food' not in M:material('seared-food','#B06B42',.42)
 # Domed asymmetric slab with an inward rolled edge; no tall extruded toy cylinder.
 n=72;vs=[];profiles=[(.0,.01),(.92,.01),(1,.045),(.98,.095),(.88,.13),(.48,.145),(0,.15)]
 for ring,(scale,h) in enumerate(profiles):
  for i in range(n):
   a=i*math.tau/n;outline=1+.065*math.sin(a*3+.4)+.035*math.sin(a*7)
   zz=h+.006*math.sin(a*11+ring)*scale
   vs.append((x+.43*scale*outline*math.cos(a),y+.3*scale*outline*math.sin(a),z+zz))
 fs=[]
 for ring in range(len(profiles)-1):
  for i in range(n):fs.append((ring*n+i,ring*n+(i+1)%n,(ring+1)*n+(i+1)%n,(ring+1)*n+i))
 mesh('Seared steak irregular outline',vs,fs,'seared-food')
 # Small irregular char details sit flush with the meat instead of floating above it.
 for i in range(4):
  xx=x-.21+i*.13;curve('Subtle caramelised sear',[(xx,y-.11,z+.137),(xx+.035,y+.03,z+.146),(xx+.055,y+.13,z+.137)],.003,'endgrain')
 curve('Fine rendered fat seam',[(x-.15,y-.10,z+.143),(x-.05,y+.02,z+.151),(x+.08,y+.06,z+.148)],.003,'cream')

def fish(x,y,z):
 vs=[];n=24;rows=25
 for j in range(rows+1):
  t=j/rows;w=.3*math.sin(math.pi*t)**.7*(1-.3*t);h=.18*math.sin(math.pi*t)**.7
  for i in range(n):
   a=i*math.tau/n;vs.append((x+w*math.cos(a),y+(t-.5)*1.25,z+h*math.sin(a)))
 fs=[]
 for j in range(rows):
  for i in range(n):fs.append((j*n+i,(j+1)*n+i,(j+1)*n+(i+1)%n,j*n+(i+1)%n))
 mesh('Whole fish tapered body',vs,fs,'blue')
 for j in range(9):
  t=.15+j*.065;w=.29*math.sin(math.pi*t)**.7
  for side in [-1,1]:curve('Overlapping fish scales',[(x+side*w*.4,y+(t-.5)*1.25,z+.15),(x+side*w*.75,y+(t-.5)*1.25+.04,z+.10),(x+side*w,y+(t-.5)*1.25,z+.04)],.005,'steel')
 mesh('Forked tail fin',[(x,y+.61,z),(x-.23,y+.91,z+.03),(x,y+.82,z+.025),(x+.23,y+.91,z+.03)],[(0,1,2),(0,2,3)],'blue')
 for s in [-1,1]:
  lathe('Fish eye rim',[(0,0),(.038,0),(.04,.014),(0,.023)],(x+s*.07,y-.5,z+.07),'cream',24)
  lathe('Fish eye pupil',[(0,0),(.017,0),(.018,.014),(0,.018)],(x+s*.07,y-.5,z+.09),'ink',20)
def basket(x,y,z,w=1.2,d=.8):
 # Rounded rectangle basket defined by individual crossing woven strips.
 box('Woven basket base',(x,y,z+.025),(w,d,.05),'linen',.06)
 for j in range(7):
  zz=z+.07+j*.075
  for sign in [-1,1]:curve('Basket horizontal weave',[(x-w*.48,y+sign*d*.47,zz),(x,y+sign*(d*.5+.01),zz+.006),(x+w*.48,y+sign*d*.47,zz)],.022,'wood' if j%2 else 'linen')
 for i in range(13):
  xx=x-w*.45+i*w*.075
  for sign in [-1,1]:curve('Basket upright cane',[(xx,y+sign*d*.45,z+.025),(xx+.015,y+sign*d*.5,z+.3),(xx,y+sign*d*.48,z+.55)],.017,'linen')
 for sign in [-1,1]:curve('Wicker side rim',[(x+sign*w*.48,y-d*.47,z+.55),(x+sign*w*.51,y,z+.57),(x+sign*w*.48,y+d*.47,z+.55)],.033,'wood')
 for sign in [-1,1]:curve('Arched wicker handle',[(x-w*.4,y+sign*d*.38,z+.52),(x-w*.28,y+sign*d*.42,z+1.0),(x+w*.28,y+sign*d*.42,z+1.0),(x+w*.4,y+sign*d*.38,z+.52)],.032,'wood')
def photo(x,y,z,name='嫩滑蒸蛋',w=.8,h=.8,rotation=(math.pi/2,0,0)):
 rows=json.loads((ROOT/'backend/data/recipes.json').read_text())['recipes'];covers=json.loads((ROOT/'prototypes/3d-lobby/cover-map.json').read_text());r=next((r for r in rows if r['name']==name),None) or next((r for r in rows if any(k in name and k in r['name'] for k in ['蒸蛋','番茄','香菇','红烧'])),rows[0]);stem=covers[r['id']];path=ROOT/'client/entry/src/main/resources/base/media'/(stem+('.webp' if stem.startswith('dish_') else '.png'))
 key='recipe_photo_'+str(len(bpy.data.materials));m=bpy.data.materials.new(key);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(path),check_existing=True);m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color']);m.node_tree.links.new(tex.outputs['Alpha'],p.inputs['Alpha']);m.surface_render_method='DITHERED';p.inputs['Roughness'].default_value=.9
 # One quad with explicit UV mapping. Paper frame is modelled separately by caller.
 o=mesh('Printed food photograph',[(-w/2,0,0),(w/2,0,0),(w/2,h,0),(-w/2,h,0)],[(0,1,2,3)],m,False);uv=o.data.uv_layers.new();coords=[(0,0),(1,0),(1,1),(0,1)]
 for poly in o.data.polygons:
  for li in poly.loop_indices:uv.data[li].uv=coords[o.data.loops[li].vertex_index]
 o.location=(x,y,z);o.rotation_euler=rotation;return o
