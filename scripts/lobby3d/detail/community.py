from common import *
from props import *

def awning(x,y,z,w=3.4,d=1.2):
 # Continuous curved canvas roof with sewn stripe panels and scalloped hanging hem.
 for stripe in range(10):
  vs=[];rows=16;ww=w/10
  for j in range(rows+1):
   t=j/rows;yy=y-t*d;zz=z-.32*t*t+.05*math.sin(t*math.pi)
   for k in range(4):vs.append((x-w*.5+stripe*ww+k/3*ww,yy,zz+.012*math.sin(k/3*math.pi)))
  fs=[(j*4+i,j*4+i+1,(j+1)*4+i+1,(j+1)*4+i) for j in range(rows) for i in range(3)];o=mesh('Striped curved awning canvas',vs,fs,'coral' if stripe%2==0 else 'paper');o.modifiers.new('Canvas thickness','SOLIDIFY').thickness=.015
  xx=x-w*.5+(stripe+.5)*ww;vv=[]
  for i in range(13):
   t=i/12;xx2=xx+(t-.5)*ww;vv.extend([(xx2,y-d,z-.32),(xx2,y-d-.02,z-.48-.08*math.sin(t*math.pi))])
  mesh('Scalloped awning valance',vv,[(i*2,i*2+1,(i+1)*2+1,(i+1)*2) for i in range(12)],'coral' if stripe%2==0 else 'paper')
  curve('Awning stitched seam',[(x-w*.5+stripe*ww,y,z+.01),(x-w*.5+stripe*ww,y-d*.5,z-.06),(x-w*.5+stripe*ww,y-d,z-.31)],.004,'linen')
 for xx in [-w*.47,w*.47]:curve('Awning curved support',[(x+xx,y,z-.18),(x+xx,y-d*.5,z-.25),(x+xx,y-d,z-.37)],.024,'darkmetal')

def build():
 with part('square_paving','广场铺装与边缘排水','Architecture','六边形石砖、铜质边线、路缘石与排水孔'):
  box('Public square base',(0,0,-.2),(10,8.3,.38),'ivory',.16);box('Terracotta border',(0,0,-.01),(9.8,8.1,.12),'coral',.10)
  for row in range(10):
   for col in range(14):
    x=-4.45+col*.675;y=-3.55+row*.779+(col%2)*.3895
    if x>4.6 or y>3.55:continue
    tile=lathe('Hexagonal limestone paver',[(0,0),(.443,0),(.443,.05),(0,.05)],(x,y,.045),'ivory' if (row+col)%5 else 'rose',6)
    for face in tile.data.polygons:face.use_smooth=False
  for i in range(22):box('Street drain slot',(-4.5+i*.42,-3.86,.12),(.18,.025,.01),'darkmetal',.003)
 with part('square_kiosk','交流亭与木作立面','community','带深度的交流窗口、拼板柜体、金属踢脚、柜门缝和拱形装饰'):
  for x in [-2.7,2.7]:
   box('Kiosk enclosure',(x,2.3,1.35),(3.15,1.4,2.5),'jade' if x<0 else 'coral',.045)
   box('Serving hatch recess',(x,1.55,2.1),(2.65,.07,1.1),'ink',.025)
   for dx in [-1.4,1.4]:box('Kiosk upright frame',(x+dx,1.48,2.25),(.15,.16,2.2),'wood',.025)
   box('Counter solid wood lip',(x,1.3,1.44),(3.4,.8,.14),'wood',.04);grain_lines(x,1.3,1.515,3.2,.7)
   for j in range(18):box('Fluted kiosk front',(x-1.4+j*.166,1.535,.78),(.075,.04,.95),'enamel' if x<0 else 'rose',.025)
   box('Kiosk brass toe kick',(x,1.52,.24),(3,.04,.10),'brass',.015)
  sign('餐桌广场',0,3.45,3.90,3.3)
  for x in [-1.65,1.65]:box('Community sign post',(x,3.45,2.15),(.1,.12,3.8),'darkmetal',.02)
 with part('square_awnings','条纹布篷与缝线','community','连续曲面篷布、弧形支架、分色布条、波浪裙边和独立缝线'):
  awning(-2.7,2.75,3.48);awning(2.7,2.75,3.48)
 with part('square_posts','社区照片墙与留言','community','拍立得纸边、餐食配图、夹子、话题标签、点赞和评论入口'):
  box('Community shared pinboard',(0,2.68,2.20),(2.4,.15,1.95),'wood',.05);box('Cork pin surface',(0,2.57,2.20),(2.22,.035,1.77),'linen',.02)
  for i in range(4):
   x=-.58+(i%2)*1.16;z=1.65+(i//2)*.84;box('Postcard paper border',(x,2.53,z),(.92,.025,.73),'paper',.01);photo(x,2.508,z-.22,name=['番茄炒蛋','香菇滑鸡','红烧肉','嫩滑蒸蛋'][i],w=.72,h=.53);text('♡ 23  ·  讨论',(x,2.49,z-.31),.078,'coral');box('Small wooden peg',(x,2.46,z+.35),(.09,.07,.18),'wood',.012)
  text('来聊聊今天吃什么',(0,2.48,2.97),.17,'cream')
 with part('square_table','同桌长桌与弯木椅','meals','共享长桌、端面木纹、桌下横撑、弯木座椅和金属固定件'):
  table(0,-1.3,6.6,1.9,1.04)
  tube('Table stretcher',[(-2.5,-1.3,.3),(2.5,-1.3,.3)],.07,'endgrain',8)
  for x in [-2.2,0,2.2]:chair(x,-2.9,math.pi,'enamel');chair(x,.35,0,'rose')
 with part('square_tableware','共享餐桌上的成品','meals','手作釉线餐盘、叉勺、内凹茶杯、织物餐垫和不同菜品'):
  for i,x in enumerate([-2.25,0,2.25]):
   surface('Woven table mat',(x,-1.3,1.14),1.5,1.5,'linen',.01);plate(x,-1.3,1.18,.48)
   if i==0:steak(x,-1.3,1.31)
   elif i==1:fish(x,-1.3,1.45)
   else:
    for j in range(5):leaf('Shared salad leaf',(x,-1.3,1.32),.42,.15,j*1.3,.13)
   mug(x+.5,-.76,1.16,'blue' if i%2 else 'rose',.8)
 with part('square_menu','话题招牌与黑板','community','立体招牌边框、字样、木架铰链和今日话题'):
  for x,title in [(-2.7,'今日分享'),(2.7,'热门话题')]:
   box('Kiosk header sign',(x,1.49,2.90),(2.5,.06,.34),'paper',.04);text(title,(x,1.45,2.83),.20,'jade')
   box('Chalkboard',(x,1.45,2.1),(1.4,.04,.85),'jade',.02);text('一餐一故事',(x,1.416,2.2),.16,'cream');text('家常 · 烘焙 · 轻食',(x,1.416,1.97),.10,'cream')
 with part('square_lights','广场灯串与灯座','community','悬垂电缆、灯泡玻璃轮廓、螺口灯座与护罩'):
  curve('Catenary light cable',[(-4.6,1,4.0),(0,.4,3.6),(4.6,1,4.0)],.014,'darkmetal')
  for i in range(13):
   x=-4.25+i*.71;z=3.6+.4*(x/4.6)**2;y=.4+.6*(x/4.6)**2
   lathe('Brass bulb socket',[(0,0),(.046,0),(.046,.12),(0,.12)],(x,y,z-.12),'brass',24)
   lathe('Pear shaped glowing bulb',[(0,0),(.05,.015),(.08,.07),(.07,.13),(.035,.18),(0,.2)],(x,y,z-.31),'light',40)
 with part('square_planters','广场绿植与陶土台阶','Architecture','叶片卷曲、分叉叶脉、花盆内壁及独立路沿'):
  for x,y in [(-4.25,-2.6),(4.25,-2.6),(-4.25,.2),(4.25,.2)]:plant(x,y,.13,.34)
 with part('square_market','分享餐篮与餐巾','community','逐根编织篮体、提手弯折、叠放餐巾和分享卡'):
  basket(-3.6,-.55,.12,.95,.7);surface('Sharing napkin',(-3.6,-.55,.72),.9,.6,'paper',.04);text('同桌分享',(-3.6,-.64,.8),.12,'coral',(0,0,0))
