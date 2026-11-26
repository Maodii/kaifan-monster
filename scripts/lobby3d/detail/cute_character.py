"""Chibi bean mascot: softly sculpted body, non-mirrored fur, restrained face.
Modelling proportions follow the provider-rendered design sheet, not the rejected horned owl.
"""
from common import *
import common as C

def build_crown_filaments():
 # Separated round, tapering hairs: adjacent ribbons previously merged into hard scalp sheets.
 rng=random.Random(27194)
 for cluster,(x,tilt) in enumerate([(-.20,-.12),(.04,.09),(.23,.12)]):
  for strand in range(14):
   offset=rng.uniform(-.047,.047);root_y=rng.uniform(-.10,.035)
   root_z=2.43-.10*abs(x+offset)
   height=rng.uniform(.075,.13);sweep=tilt*rng.uniform(.6,1.2)
   pts=[];radii=[]
   for j in range(5):
    t=j/4
    pts.append((x+offset+sweep*t,root_y-.10*t,root_z+height*math.sin(t*math.pi*.72)))
    radii.append(.0018*(1-.96*t))
   tube('Separated curved crown filament',pts,radii,'pile',6)

def build_character():
 plush=material('plush','#B689B2',.92);pile=material('pile','#C498BE',.96);coffee=material('coffee_eye','#4D302B',.23)
 p=plush.node_tree.nodes.get('Principled BSDF');p.inputs['Sheen Weight'].default_value=.35;p.inputs['Sheen Roughness'].default_value=.75
 coffee.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.28
 blushmat=bpy.data.materials.new('plush_blush');blushmat.use_nodes=True;p=blushmat.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.94;p.inputs['Sheen Weight'].default_value=.3
 vc=blushmat.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';blushmat.node_tree.links.new(vc.outputs['Color'],p.inputs['Base Color'])
 def radius(t):return max(0,math.sin(math.pi*t))**.47*(.90+.11*math.sin(math.pi*t*.85))
 def point(t,a):
  r=radius(t);return Vector((r*math.cos(a)*(1+.012*math.sin(a*3+t*14)),.72*r*math.sin(a)*(1-.055*max(0,-math.sin(a))**4*math.exp(-((t-.65)/.28)**2)),.28+2.18*t))
 def normal(t,a):
  eps=.001;dr=(radius(min(.999,t+eps))-radius(max(.001,t-eps)))/(2*eps*2.18);return Vector((math.cos(a),math.sin(a)/.72,-dr)).normalized()
 rng=random.Random(7801)
 with part('monster_character','Q萌抱饭小怪','mascot','Q萌连续雕塑、错落绒毛、嵌入小眼睛、柔和腮红、短手短脚及抱碗姿势') as character:
  with part('monster_skin','身体轮廓与蓬松毛束','mascot','连续圆润网格、非对称软毛束、三层毛流、头顶翘毛与细密绒面',parent=character):
   vs=[];fs=[];colors=[];cols=96;rows=70
   base=Vector(plush.diffuse_color[:3]);pink=Vector((.71,.35,.40))
   for j in range(rows+1):
    t=j/rows
    for i in range(cols):
     a=i*math.tau/cols;v=point(t,a);vs.append(tuple(v));cheek=(math.exp(-((v.x-.53)/.23)**2-((v.z-1.43)/.15)**2)+math.exp(-((v.x+.53)/.23)**2-((v.z-1.43)/.15)**2))*max(0,-math.sin(a))**10;color=base.lerp(pink,min(.38,cheek*.36));colors.append((*color,1))
   for j in range(rows):
    for i in range(cols):fs.append((j*cols+i,j*cols+(i+1)%cols,(j+1)*cols+(i+1)%cols,(j+1)*cols+i))
   # Ring order is bottom to top, so outward faces use angular then vertical edges.
   body=mesh('Continuous chibi plush with blended cheek tint',vs,fs,blushmat);attr=body.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
   for poly in body.data.polygons:
    for li in poly.loop_indices:attr.data[li].color=colors[body.data.loops[li].vertex_index]
   for side in [-1,1]:
    ear=lathe('Very short round soft tuft ear',[(0,0),(.085,0),(.13,.035),(.15,.10),(.155,.17),(.14,.24),(.105,.295),(.055,.325),(0,.33)],(side*.35,.05,2.30),'plush',48);ear.rotation_euler.y=side*.19
   # Swept fibers follow a perturbed tangent field; no radial conical spikes.
   fverts=[];ffaces=[]
   for k in range(18000):
    t=rng.uniform(.025,.9992);a=rng.uniform(0,math.tau);v=point(t,a);n=normal(t,a)
    near_face=v.y<-.35 and abs(v.x)<.70 and 1.27<v.z<2.02
    direction=Vector((.35*math.sin(a*3+t*12),.18*math.cos(a*2+t*9),-1))
    flow=direction-n*direction.dot(n)
    if flow.length<.05:flow=Vector((1,0,0))
    flow.normalize();u=n.cross(flow).normalized()
    length=rng.uniform(.045,.105)*(.55 if near_face else 1);width=rng.uniform(.0013,.0027)
    lift=rng.uniform(.008,.022)*(.5 if near_face else 1)
    st=len(fverts)
    for j in range(5):
     q=j/4;center=v+n*(.004+lift*math.sin(q*math.pi*.85))+flow*(q*length)+u*(math.sin(q*math.pi)*length*.12)
     half=width*(1-q*.94)
     fverts.extend([tuple(center-u*half),tuple(center+u*half)])
    for j in range(4):ffaces.append((st+j*2,st+j*2+1,st+j*2+3,st+j*2+2))
   mesh('Fine irregular crossed velvet fibers',fverts,ffaces,'pile')
   # Loose clumps are built from fine interleaved filaments, not broad leaf-like polygon cards.
   vs=[];faces=[]
   for k in range(430):
    t=rng.uniform(.09,.985);a=rng.uniform(0,math.tau);root=point(t,a)
    if root.y<-.25 and abs(root.x)<.74 and 1.18<root.z<2.14:continue
    n=normal(t,a);direction=Vector((rng.uniform(-.55,.55),rng.uniform(-.3,.3),-1));flow=direction-n*direction.dot(n)
    if flow.length<.05:flow=Vector((1,0,0))
    flow.normalize();cross=n.cross(flow).normalized();length=rng.uniform(.10,.21);spread=rng.uniform(.018,.042);lift=rng.uniform(.018,.045)
    for strand in range(16):
     offset=(strand/15-.5)*2*spread;v=root+cross*offset;st=len(vs);width=rng.uniform(.0012,.0026);phase=rng.uniform(-.2,.2)
     for j in range(7):
      q=j/6;center=v-n*.003+flow*(q*length*(1+.16*math.sin(strand)))+n*(lift*math.sin(q*math.pi*.85))+cross*(math.sin(q*math.pi*.8+phase)*length*.18-offset*q*.5)
      for side in [-1,1]:vs.append(tuple(center+cross*width*(1-q*.97)*side))
     for j in range(6):i=st+j*2;faces.append((i,i+1,i+3,i+2))
   mesh('Loose overlapping fine fur clumps',vs,faces,'pile')
   build_crown_filaments()
  with part('monster_face','小椭圆眼与微笑','mascot','嵌入眼缘、树脂眼睛、同向眼神、柔和高光、W形笑嘴和米粒小乳牙',parent=character):
   for x in [-.34,.34]:
    eye=lathe('Narrow warm eye rim',[(0,0),(.175,0),(.19,.012),(.187,.025),(.175,.036),(0,.04)],(x,-.64,1.70),'cream',64);eye.rotation_euler.x=math.pi/2;eye.scale.y=1.18
    iris=lathe('Inset glossy oval eye',[(0,0),(.15,0),(.172,.012),(.165,.033),(.11,.052),(0,.058)],(x+(.012 if x<0 else -.012),-.684,1.68),'coffee_eye',64);iris.rotation_euler.x=math.pi/2;iris.scale.y=1.22
    hi=lathe('Soft eye catchlight',[(0,0),(.025,0),(.023,.006),(0,.012)],(x-.04,-.742,1.74),'white',32);hi.rotation_euler.x=math.pi/2;hi.scale.y=1.25
   curve('Left gentle W smile',[(-.15,-.725,1.43),(-.10,-.75,1.37),(-.04,-.756,1.38),(0,-.758,1.42)],.018,'coffee_eye')
   curve('Right gentle W smile',[(0,-.758,1.42),(.055,-.754,1.37),(.11,-.744,1.38),(.155,-.722,1.45)],.018,'coffee_eye')
   tooth=lathe('Tiny rounded milk tooth',[(0,0),(.035,0),(.045,.04),(.035,.07),(0,.08)],(.01,-.75,1.32),'cream',32);tooth.rotation_euler.x=math.pi/2
  with part('monster_paws','短手短脚与掌纹','mascot','贴身短臂、圆润掌面、轻微指缝、柔软脚掌与内八字姿态',parent=character):
   for side in [-1,1]:
    tube('Short plush hugging arm',[(side*.77,-.13,1.16),(side*.83,-.49,1.03),(side*.71,-.91,.96),(side*.60,-1.17,.98),(side*.50,-1.25,.99)],[.17,.185,.17,.14,.025],'plush',32)
    for k in range(2):curve('Subtle three finger crease',[(side*.66,-1.16,.93+k*.075),(side*.59,-1.25,.92+k*.075),(side*.52,-1.26,.94+k*.075)],.004,'lavender')
    foot=lathe('Short inward plush bean foot',[(0,0),(.16,0),(.20,.06),(.21,.15),(.18,.24),(0,.28)],(side*.31,-.14,.27),'plush',48);foot.scale.y=1.22;foot.rotation_euler.z=side*.10
  with part('monster_bowl','手釉陶瓷饭碗','mascot','完整内外壁、厚圆口、收口圈足、手绘奶油圈及三瓣芽纹',parent=character):
   lathe('Hollow honey glazed rice bowl',[(0,0),(.30,0),(.34,.04),(.40,.09),(.53,.27),(.61,.48),(.63,.53),(.63,.56),(.59,.57),(.57,.53),(.51,.29),(.36,.11),(0,.09)],(0,-.91,.53),'gold',96,.003)
   lathe('Bowl trimmed foot ring',[(.25,0),(.31,0),(.32,.06),(.26,.07),(.25,0)],(0,-.91,.48),'gold',64)
   lathe('Handpainted cream band',[(.591,.425),(.605,.46),(.607,.46),(.593,.425)],(0,-.91,.53),'cream',96)
   # Painted sprout petals conform to the glaze instead of protruding like three loose rice grains.
   for dx,z,angle in [(-.075,.83,-.6),(.0,.86,0),(.075,.83,.6)]:
    vertices=[]
    for i in range(32):
     a=i*math.tau/32;xx=.020*math.cos(a);zz=.050*math.sin(a);wx=dx+xx*math.cos(angle)-zz*math.sin(angle);wz=z+xx*math.sin(angle)+zz*math.cos(angle)
     rad=.40+(wz-.62)/.18*.13 if wz<.80 else .53+(wz-.80)/.21*.08
     yy=-.91-math.sqrt(max(.01,rad*rad-wx*wx))-.006;vertices.append((wx,yy,wz))
    rad=.40+(z-.62)/.18*.13 if z<.80 else .53+(z-.80)/.21*.08;vertices.append((dx,-.91-math.sqrt(rad*rad-dx*dx)-.006,z))
    mesh('Glaze painted flat sprout petal',vertices,[(32,i,(i+1)%32) for i in range(32)],'cream')
  with part('monster_rice','细米粒与薄荷汤匙','mascot','逐粒细米、自然堆叠、微润高光、凹面汤匙和弯曲勺柄',parent=character):
   # A dense mound instead of separated popcorn shapes or floating grains.
   lathe('Soft underlying rice mound',[(0,0),(.53,0),(.46,.05),(.30,.13),(0,.19)],(0,-.91,1.04),'rice',64)
   for i in range(420):
    a=i*2.399;rr=.52*math.sqrt((i+.5)/420);z=1.04+.19*(1-(rr/.54)**2)+.014
    grain=lathe('Individual rounded rice grain',[(0,0),(.009,.002),(.017,.01),(.018,.026),(.014,.043),(.007,.05),(0,.052)],(rr*math.cos(a),-.91+rr*math.sin(a),z),'rice',16);grain.rotation_euler=(rng.uniform(.85,1.35),rng.uniform(-.25,.25),rng.uniform(0,math.tau))
   curve('Mint spoon curved handle',[(.30,-.83,1.06),(.36,-.79,1.23),(.43,-.74,1.38)],.031,'blue')
   scoop=lathe('Small concave mint spoon',[(0,0),(.065,0),(.10,.025),(.12,.05),(.12,.065),(.10,.07),(.06,.032),(0,.022)],(.45,-.73,1.37),'blue',48);scoop.scale.y=1.4
