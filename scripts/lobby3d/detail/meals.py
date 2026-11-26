from common import *
from props import *

def build():
 floor('diary')
 with part('diary_backdrop','记餐角的建筑与置物格','Architecture','木格窗、凹槽边框、软木公告面与独立小抽屉'):
  wall();window(-2.15);sign('今日记餐',2.35,3.48,3.34,2.8)
  box('Cork backing',(2.35,3.47,2.12),(2.6,.07,1.57),'linen',.06)
  for x in [1.15,3.55]:box('Cork brass corner',(x,3.41,2.13),(.05,.03,1.43),'brass',.008)
 with part('diary_desktop','记餐书桌与黄铜角码','meals','厚实桌板、橡木纹路、倒角桌沿、锥形腿及可见角码'):
  table(0,-.1,7,3.7,1.25)
  for x in [-2.75,2.75]:
   box('Brass corner bracket',(x,-1.56,1.05),(.3,.045,.24),'brass',.016)
   for dx in [-.09,.09]:screw(x+dx,-1.589,1.05)
 with part('diary_calendar','翻页日历与日期卡','meals','双层月历纸页、七列日期格、双环装订、当前日期框'):
  box('Calendar desk pedestal',(-1.7,1,1.44),(2.7,.7,.18),'jade',.05)
  box('Calendar hinged backing',(-1.7,1.05,2.45),(2.6,.13,2.05),'jade',.05)
  for i in range(6):box('Calendar paper page',(-1.7,.948-i*.012,2.42),(2.43,.012,1.88),'paper',.015)
  import datetime,calendar
  today=datetime.date.today();text(str(today.month)+' 月',(-1.7,.86,3.04),.28,'coral');text('MON  TUE  WED  THU  FRI  SAT  SUN',(-1.7,.86,2.76),.09,'jade')
  start,total=calendar.monthrange(today.year,today.month)
  for day in range(1,total+1):
   cell=start+day-1;i=cell%7;j=cell//7;x=-2.72+i*.34;z=2.54-j*.18
   if day==today.day:box('Today raised date tile',(x,.844,z+.025),(.29,.026,.16),'coral',.018)
   text(str(day),(x,.82,z),.13,'cream' if day==today.day else 'ink')
  for x in [-2.5,-.9]:ring(x,1,3.40,.13,'brass','x')
 with part('diary_journal','三餐手账与纸页结构','meals','书芯分层、中央凹折、手写三餐条目、独立标签和骑马订线'):
  box('Handmade journal cover',(-.35,-.55,1.38),(3.25,2.25,.09),'coral',.05)
  for i in range(12):
   for side in [-1,1]:
    o=surface('Journal curved leaf',(-.35+side*.78,-.55,1.44+i*.009),1.51,2.13,'paper',.009,nx=30,ny=18)
  curve('Centre valley binding',[(-.35,-1.6,1.57),(-.35,-.55,1.54),(-.35,.49,1.57)],.012,'linen')
  text('今天吃了什么',(-1.1,.12,1.58),.21,'jade',(0,0,0))
  for j,(meal,food) in enumerate([('早',''),('午',''),('晚','')]):
   text(meal,(-1.65,-.23-j*.48,1.59),.19,'coral',(0,0,0));text(food,(-1.02,-.23-j*.48,1.59),.13,'ink',(0,0,0))
   for k in range(2):box('Journal ruled lines',(-1.1,-.38-j*.48-k*.05,1.58),(.95,.006,.003),'linen',.001)
  for x in [-.31,.31,.94]:
   box('Page edge tab',(x,-1.68,1.55),(.48,.19,.025),['jade','gold','blue'][int((x+.4)*2)%3],.015)
  text('好好吃饭',(.48,.03,1.59),.22,'coral',(0,0,0));photo(.48,-1.34,1.60,w=1.03,h=1.1,rotation=(0,0,0))
 with part('diary_meal','一餐的食物与真实餐具','meals','空心碗盘、食物横截面、米粒、蔬菜叶脉与筷子尖'):
  surface('Linen placement',(2.18,-.5,1.36),1.6,2.25,'linen',.02)
  bowl(2.18,-.42,1.39,.55,'blue')
  for i in range(80):
   a=i*2.4;rr=.44*math.sqrt((i+.5)/80);xx=2.18+rr*math.cos(a);yy=-.42+rr*math.sin(a)
   o=lathe('Separate rice kernel',[(0,0),(.013,.004),(.023,.015),(.026,.037),(.022,.06),(.012,.073),(0,.078)],(xx,yy,1.65),'rice',20);o.rotation_euler=(.5,i*.7,i*1.2)
  steak(2.15,-.38,1.88);leaf('Vegetable garnish',(2.45,-.4,1.86),.4,.15,.3,.08)
  for x in [2.8,2.91]:tube('Tapered chopstick',[(x,-1.22,1.41),(x,.42,1.42)],[.014,.025],'endgrain',8)
  mug(2.3,1.03,1.38,'rose')
 with part('diary_receipts','花费小票与热量卡','meals','带齿纸边、消费条目、合计与独立营养标签'):
  surface('Folded paper receipt',(1,1.05,1.39),.85,1.25,'paper',.025,nx=12,ny=22)
  text('今日花费',(1,1.38,1.45),.13,'ink',(0,0,0));text('查看记录',(1,1.11,1.45),.19,'coral',(0,0,0));text('营养与花费',(1,.85,1.45),.12,'jade',(0,0,0))
  for i in range(13):mesh('Receipt tear tooth',[(.61+i*.06,.4,1.42),(.64+i*.06,.34,1.42),(.67+i*.06,.4,1.42)],[(0,1,2)],'paper',False)
 with part('diary_pen','钢笔、笔帽与纸夹','meals','笔尖开缝、夹片、笔帽台阶及金属纸夹双弯'):
  tube('Fountain pen barrel',[(-2.5,-1.3,1.43),(-2.5,.2,1.43)],[.055,.046],'jade',24)
  mesh('Fountain pen split nib',[(-2.5,.2,1.43),(-2.57,.36,1.43),(-2.5,.6,1.43),(-2.43,.36,1.43),(-2.5,.2,1.47)],[(0,1,2,4),(0,4,2,3)],'brass')
  curve('Pen cap clip',[(-2.5,-1.27,1.49),(-2.5,-1.18,1.53),(-2.5,-.88,1.53)],.012,'brass')
  curve('Double bent paperclip',[(-2.5,.7,1.4),(-2.68,.7,1.4),(-2.68,1.05,1.4),(-2.42,1.05,1.4),(-2.42,.6,1.4),(-2.62,.6,1.4),(-2.62,.92,1.4)],.012,'steel')
 with part('diary_memories','餐食照片与便签','meals','独立照片白边、木夹、黄铜钉与当天标语'):
  for i in range(2):
   x=1.75+i*1.2;box('Photo print backing',(x,3.385,2.1),(1.02,.035,1.1),'paper',.008);photo(x,3.36,1.7,name=['番茄炒蛋','香菇滑鸡'][i],w=.88,h=.8);box('Wood photo peg',(x,3.31,2.66),(.15,.12,.25),'wood',.02);screw(x,3.24,2.67)
  text('一餐一记',(2.35,3.35,1.38),.23,'jade')
 with part('diary_chair','弯木椅与织物','Architecture','连续弯木靠背、截面厚度、斜腿和座面固定件'):
  chair(-1.1,-2.8,math.pi,'enamel');plant(-3.85,2.9,.06,.32)
