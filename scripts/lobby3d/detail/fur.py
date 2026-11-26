"""Short transported surface fibers on sculpted appendages, exported as real GLB geometry."""
from common import *
import common as C
from bisect import bisect_left

def groom_appendages():
 owner=bpy.context.scene.objects.get('part_monster_paws');ear_owner=bpy.context.scene.objects.get('part_monster_skin')
 objects=[o for o in bpy.context.scene.objects if any(o.name.startswith(s) for s in ['Short plush hugging arm','Short inward plush bean foot','Very short round soft tuft ear'])]
 bpy.context.view_layer.update();rng=random.Random(81283)
 old=C.CURRENT
 for ob in objects:
  C.CURRENT=owner if 'ear' not in ob.name else ear_owner
  me=ob.data;me.calc_loop_triangles();areas=[];total=0
  for tr in me.loop_triangles:total+=tr.area;areas.append(total)
  vs=[];fs=[];count=1100 if 'arm' in ob.name else 650;norm_matrix=ob.matrix_world.to_3x3().inverted().transposed()
  for i in range(count):
   tri=me.loop_triangles[bisect_left(areas,rng.random()*total)];a,b,c=[me.vertices[j] for j in tri.vertices];u=rng.random();v=rng.random()
   if u+v>1:u=1-u;v=1-v
   pos=ob.matrix_world@(a.co+(b.co-a.co)*u+(c.co-a.co)*v);n=(norm_matrix@(a.normal*(1-u-v)+b.normal*u+c.normal*v)).normalized()
   direction=Vector((rng.uniform(-.4,.4),-.3,-1));flow=direction-n*direction.dot(n)
   if flow.length<.01:flow=n.cross(Vector((1,0,0)))
   flow.normalize();cross=n.cross(flow).normalized();length=rng.uniform(.028,.064);width=rng.uniform(.0013,.0024);st=len(vs)
   for j in range(5):
    t=j/4;center=pos+n*(.003+.008*math.sin(t*math.pi*.8))+flow*length*t+cross*.008*math.sin(t*math.pi)
    vs.extend([tuple(center+cross*width*(1-t*.93)*side) for side in [-1,1]])
   for j in range(4):fs.append((st+j*2,st+j*2+1,st+j*2+3,st+j*2+2))
  mesh('Groomed appendage velvet fibers',vs,fs,'pile')
 C.CURRENT=old
