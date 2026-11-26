"""Arch mirror assembly: silvered glass, layered frame, rear shell and real fittings."""
from common import *
import common as C

def arch_outline(cx=2.9,base=.55,spring=2.30,r=.65):
 # Continuous rounded bottom corners and a finely sampled semicircular crown.
 points=[(cx-r,base+.07),(cx-r,spring)]
 points += [(cx+r*math.cos(math.pi-i*math.pi/160),spring+r*math.sin(math.pi-i*math.pi/160)) for i in range(1,161)]
 points += [(cx+r,base+.07)]
 points += [(cx+r-.07+.07*math.cos(-i*math.pi/2/16),base+.07+.07*math.sin(-i*math.pi/2/16)) for i in range(1,17)]
 points += [(cx-r+.07,base)]
 points += [(cx-r+.07+.07*math.cos(-math.pi/2-i*math.pi/2/16),base+.07+.07*math.sin(-math.pi/2-i*math.pi/2/16)) for i in range(1,17)]
 return points

def ring(name,points,y,width,depth,m):
 vs=[];faces=[];n=len(points);sides=24
 for j,(x,z) in enumerate(points):
  tangent=Vector((points[(j+1)%n][0]-points[(j-1)%n][0],0,points[(j+1)%n][1]-points[(j-1)%n][1])).normalized();normal=Vector((-tangent.z,0,tangent.x))
  for k in range(sides):
   a=k*math.tau/sides;vs.append(tuple(Vector((x,y,z))+normal*(width*math.cos(a))+Vector((0,depth*math.sin(a),0))))
 for j in range(n):
  for k in range(sides):faces.append((j*sides+k,j*sides+(k+1)%sides,((j+1)%n)*sides+(k+1)%sides,((j+1)%n)*sides+k))
 return mesh(name,vs,faces,m)

def refine_room_finish():
 sc=bpy.context.scene;owner=sc.objects['part_monster_mirror'];removed=[]
 for ob in list(owner.children_recursive):
  if ob.type=='MESH':removed.append(ob.name);bpy.data.objects.remove(ob,do_unlink=True)
 old=C.CURRENT;C.CURRENT=owner
 silver=material('silvered_mirror','#F0F4F3',.014,1);p=silver.node_tree.nodes.get('Principled BSDF');p.inputs['Coat Weight'].default_value=.16;p.inputs['Coat Roughness'].default_value=.018
 material('mirror_frame_satin','#B79A64',.22,.84);material('mirror_edge_silver','#DDE5DF',.09,1);material('mirror_backing','#474E49',.72,0)
 outline=arch_outline();verts=[(x,3.153,z) for x,z in outline];face=mesh('Silvered optical arch mirror face',verts,[tuple(range(len(verts)))],'silvered_mirror',False);face['planar_mirror']=True
 # Points run clockwise from left edge around the crown; their front normal is -Y.
 if face.data.polygons[0].normal.y>0:
  face.data.clear_geometry();face.data.from_pydata(verts,[],[tuple(reversed(range(len(verts))))]);face.data.update()
 back=mesh('Mirror full thickness rear shell',[(x,3.204,z) for x,z in outline],[tuple(reversed(range(len(verts))))],'mirror_backing',False);mod=back.modifiers.new('Rear protective shell thickness','SOLIDIFY');mod.thickness=.027
 ring('Mirror satin brass rounded outer extrusion',outline,3.17,.033,.042,'mirror_frame_satin')
 ring('Mirror fine inner silver bevel',[(2.9+(x-2.9)*.974,1.75+(z-1.75)*.986) for x,z in outline],3.147,.007,.008,'mirror_edge_silver')
 ring('Mirror rear gasket reveal',outline,3.211,.020,.012,'darkmetal')
 for x in [2.29,3.51]:
  box('Mirror small lower support shoe',(x,3.216,.58),(.10,.12,.09),'mirror_frame_satin',.016)
  box('Mirror rear wall spacing bracket',(x,3.29,2.20),(.075,.17,.12),'darkmetal',.012)
  screw(x,3.145,.58)
 C.CURRENT=sc.objects['part_monster_backdrop']
 for ob in list(sc.objects):
  if ob.name.startswith('Arched alcove frame'):bpy.data.objects.remove(ob,do_unlink=True)
 # Avoid interpolating an arch from five control points, which created visible bends at the shoulder.
 for x in [-3.2,3.2]:
  pts=[(x-.8,3.43,1.3),(x-.8,3.43,2.4)]+[(x+.8*math.cos(math.pi-i*math.pi/128),3.43,2.4+.8*math.sin(math.pi-i*math.pi/128)) for i in range(1,129)]+[(x+.8,3.43,1.3)]
  tube('Smooth continuous timber arch moulding',pts,.050,'wood',24)
 box('Skirting top rounded cap',(0,3.462,.304),(9.0,.065,.022),'wood',.008)
 box('Skirting floor shadow reveal',(0,3.469,.067),(9,.052,.012),'darkmetal',.004)
 C.CURRENT=sc.objects['part_monster_wardrobe']
 for ob in list(sc.objects):
  if ob.name.startswith(('Wardrobe upright','Wardrobe rail')):bpy.data.objects.remove(ob,do_unlink=True)
 for x in [2,3.7]:
  tube('Smooth wardrobe upright',[(x,1.7,.10),(x,1.7,3.0)],.035,'brass',32)
  lathe('Wardrobe weighted foot pad',[(0,0),(.065,0),(.073,.018),(.060,.035),(0,.035)],(x,1.7,.065),'darkmetal',48)
  lathe('Wardrobe pole lower collar',[(.035,0),(.047,0),(.047,.055),(.035,.055)],(x,1.7,.105),'brass',48)
 tube('Smooth wardrobe cross rail',[(2,1.7,3),(3.7,1.7,3)],.045,'brass',32)
 for x in [2,3.7]:
  tube('Wardrobe capped rail joint',[(x,1.7,2.965),(x,1.7,3.045)],.052,'brass',32)
 C.CURRENT=sc.objects['part_monster_base']
 for x in [-4.57,4.57]:box('Floor exposed end grain finishing strip',(x,0,-.01),(.07,7.4,.13),'endgrain',.012)
 C.CURRENT=old
 return {'removed':removed,'details':['Silvered low-roughness mirror separate from brushed steel','Rounded bottom corners and160-segment crown','24-sided layered satin frame, inner silver bevel and rear gasket','Full rear shell, wall brackets, support shoes and screws','Analytic128-segment timber alcove arches','Skirting cap, floor reveal and exposed end grain','32-sided garment poles, weighted feet, collars and capped joints']}
