from common import *
from props import *

from cute_character import build_character

def build():
 floor('monster')
 with part('monster_backdrop','角色房间与拱窗','Architecture','圆拱壁龛、厚窗框、木质踢脚和示例主体空间标识'):
  wall();sign('我的小怪',0,3.48,3.5,3.2)
  for x in [-3.2,3.2]:
   curve('Arched alcove frame',[(x-.8,3.43,1.3),(x-.8,3.43,2.6),(x,3.43,3.2),(x+.8,3.43,2.6),(x+.8,3.43,1.3)],.07,'wood')
 build_character()
 with part('monster_plinth','角色展示台与刻度','profile','旋压台阶、凹槽、金属嵌条与旋转展示刻度'):
  lathe('Character display plinth',[(0,0),(1.67,0),(1.72,.05),(1.72,.15),(1.65,.22),(0,.22)],(0,0,.06),'jade',96)
  lathe('Turntable brass rim',[(1.65,0),(1.7,0),(1.7,.035),(1.65,.035)],(0,0,.23),'brass',96)
  for i in range(32):
   a=i*math.tau/32;line=tube('Turntable etched tick',[(1.46*math.cos(a),1.46*math.sin(a),.29),(1.59*math.cos(a),1.59*math.sin(a),.29)],.006,'brass',6)
 with part('monster_wardrobe','围裙与角色衣架','profile','悬挂布料曲面、褶皱、口袋、围裙系带、衣架接头'):
  for x in [2.0,3.7]:tube('Wardrobe upright',[(x,1.7,.10),(x,1.7,3.0)],.035,'brass',12)
  tube('Wardrobe rail',[(2,1.7,3),(3.7,1.7,3)],.045,'brass',12)
  curve('Wooden hanger',[(2.35,1.7,2.53),(2.85,1.7,2.78),(3.35,1.7,2.53),(2.35,1.7,2.53)],.025,'wood');curve('Hanger hook',[(2.85,1.7,2.75),(2.8,1.7,3.1),(2.95,1.7,3.12),(2.98,1.7,3.02)],.018,'brass')
  vv=[];nx=20;ny=25
  for j in range(ny+1):
   t=j/ny;w=.33+.25*t
   for i in range(nx+1):
    s=i/nx*2-1;vv.append((2.85+s*w,1.62+.055*math.sin(s*14)*t,2.5-t*1.35+.03*s*s))
  o=mesh('Draped tailored apron',vv,[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i) for j in range(ny) for i in range(nx)],'rose');o.modifiers.new('Apron fabric thickness','SOLIDIFY').thickness=.014
  box('Apron pocket',(2.85,1.51,1.64),(.5,.025,.34),'linen',.035)
  for i in range(14):box('Pocket topstitch',(2.61+i*.036,1.49,1.78),(.015,.007,.006),'cream',.001)
 with part('monster_badges','示例主体成就徽章','profile','切角星章、压边、双层缎带和独立铭牌'):
  box('Badge display board',(-2.8,3.43,2.13),(2.25,.12,1.75),'jade',.06)
  for j in range(2):
   for i in range(3):
    x=-3.5+i*.7;z=1.8+j*.68;vs=[(x,3.32,z)]+[(x+(.20 if k%2==0 else .095)*math.sin(k*math.pi/5),3.31,z+(.20 if k%2==0 else .095)*math.cos(k*math.pi/5)) for k in range(10)];o=mesh('Pressed five point badge',vs,[(0,k+1,(k+1)%10+1) for k in range(10)],'brass',False);o.modifiers.new('Badge metal thickness','SOLIDIFY').thickness=.025
    for side in [-1,1]:mesh('Cut ribbon tail',[(x+side*.03,3.335,z-.07),(x+side*.12,3.335,z-.08),(x+side*.14,3.335,z-.36),(x+side*.07,3.335,z-.30)],[(0,1,2,3)],'coral',False)
 with part('monster_favorites','喜欢的食谱与收藏柜','recipes','相册层板、书脊、书签、金属挡书与红心收藏标识'):
  for z in [.35,1.12,1.9]:box('Favorites shelf',(-3.2,1.4,z),(2,.65,.11),'wood',.02)
  for x in [-4.12,-2.28]:box('Shelf upright',(x,1.4,1.1),(.1,.65,1.8),'jade',.025)
  for i in range(5):box('Cookbook spine',(-3.9+i*.3,1.4,.72),(.23,.43,.62),'coral' if i%2 else 'enamel',.025)
  text('我的收藏',(-3.2,1.04,1.67),.2,'jade');book(-3.2,1.4,1.99,1.45,.8,'喜欢的菜')
 with part('monster_nameplate','昵称牌与偏好卡','profile','镶边昵称牌、示例主体档案卡、翻页铰链和独立字样'):
  box('Personal name plaque',(0,-2.43,.64),(3.2,.14,.72),'paper',.055);text('今天也开饭',(0,-2.515,.71),.30,'jade');text('我的口味 · 我的三餐',(0,-2.515,.43),.12,'coral')
  for x in [-1.25,1.25]:screw(x,-2.52,.64)
 with part('monster_mirror','全身镜与边框接缝','profile','镜面反射材质、连续拱形外框、支脚和压条'):
  # Convex arched outline filled with a single mesh and a rounded metal frame.
  pts=[(2.25,3.2,.55),(2.25,3.2,2.3)]+[(2.9+.65*math.cos(math.pi-i*math.pi/20),3.2,2.3+.65*math.sin(math.pi-i*math.pi/20)) for i in range(21)]+[(3.55,3.2,.55)]
  mesh('Arched brushed mirror',pts,[tuple(reversed(range(len(pts))))],'steel',False);curve('Mirror arched continuous rim',pts+[pts[0]],.045,'brass')
