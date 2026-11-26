from common import *
from props import *

def build():
 floor('kitchen')
 with part('kitchen_architecture','厨房墙面与窗框','Architecture','砌缝釉面砖、带深度的窗框、窗台木纹与标识'):
  wall();window(-1.2);sign('菜谱厨房',2.6,3.48,3.35,2.7)
  for j in range(5):
   for i in range(14):box('Glazed backsplash tile',(-4.05+i*.62,3.46,.85+j*.31),(.59,.035,.28),'cream' if (i+j)%3 else 'enamel',.018)
 with part('kitchen_cabinet','榫接柜体与抽屉','recipes','门板框芯、台面倒角、抽屉缝、黄铜把手与铆钉'):
  for x in [-3,-1.7,-.4,.9,2.2,3.5]:
   box('Cabinet carcass',(x,2.65,.76),(1.23,1.48,1.4),'jade',.025)
   box('Raised door frame',(x,1.88,.73),(1.12,.055,1.13),'enamel',.035);box('Recessed panel',(x,1.84,.71),(.91,.02,.88),'jade',.025)
   curve('Cast brass cabinet pull',[(x-.17,1.79,1.13),(x-.15,1.72,1.13),(x+.15,1.72,1.13),(x+.17,1.79,1.13)],.023,'brass')
   for dx in [-.19,.19]:screw(x+dx,1.77,1.13)
  box('Stone countertop',(0.25,2.6,1.52),(8.3,1.65,.18),'cream',.06)
 with part('kitchen_range','燃气灶与铸铁锅架','recipes','分体炉芯、点火孔、十字锅架、旋钮指示线及拉丝面板'):
  box('Stove stainless inset',(2.0,2.5,1.64),(2.6,1.25,.08),'steel',.045)
  for x in [1.4,2.6]:
   lathe('Burner crown',[(0,0),(.23,0),(.25,.06),(.20,.09),(.13,.09),(.13,.04),(0,.04)],(x,2.55,1.69),'darkmetal',64)
   for i in range(20):
    a=i*math.tau/20;box('Gas jet slot',(x+.21*math.cos(a),2.55+.21*math.sin(a),1.75),(.018,.025,.025),'ink',.003)
   for a in [0,math.pi/2]:tube('Cast iron pan support',[(x-.4*math.cos(a),2.55-.4*math.sin(a),1.77),(x+.4*math.cos(a),2.55+.4*math.sin(a),1.77)],.026,'darkmetal')
   knob=lathe('Stove rotary dial',[(0,0),(.09,0),(.095,.05),(0,.06)],(x,1.96,1.7),'ink',40);box('Dial tick',(x,1.93,1.762),(.01,.06,.008),'cream',.002)
 with part('kitchen_pot','搪瓷炖锅与锅盖','recipes','旋压锅身、真实内壁、卷口、盖沿、铆接耳柄及蒸汽孔'):
  lathe('Hollow cooking casserole',[(0,0),(.35,0),(.48,.08),(.53,.46),(.55,.50),(.53,.54),(.49,.54),(.47,.46),(.42,.10),(0,.075)],(2.6,2.55,1.79),'coral',72,.008)
  for side in [-1,1]:
   curve('Pot ear handle',[(2.6+side*.49,2.5,2.15),(2.6+side*.76,2.5,2.19),(2.6+side*.78,2.7,2.19),(2.6+side*.49,2.7,2.15)],.045,'brass')
   for yy in [2.5,2.7]:screw(2.6+side*.45,yy-.025,2.15)
  lathe('Domed lid with stepped lip',[(0,.13),(.12,.13),(.36,.09),(.56,0),(.58,-.02),(.56,-.04),(.5,-.04),(.32,.065),(0,.10)],(2.6,2.55,2.35),'coral',72)
  lathe('Lid knob',[(0,0),(.06,0),(.08,.08),(.13,.10),(.13,.14),(0,.15)],(2.6,2.55,2.48),'wood',40)
 with part('kitchen_sink','水槽与弯管龙头','recipes','内凹盆体、排水滤网、弯曲水嘴与双阀旋钮'):
  basin=lathe('Recessed sink basin',[(0,0),(.14,0),(.3,.08),(.48,.26),(.53,.33),(.55,.36),(.52,.37),(.48,.33),(.43,.25),(.25,.05),(0,.035)],(-2.5,2.6,1.36),'steel',64);basin.scale.x=1.25
  curve('Swan neck tap',[(-2.5,3.12,1.63),(-2.5,3.12,2.25),(-2.5,2.8,2.48),(-2.5,2.55,2.3)],.034,'steel')
  for x in [-2.85,-2.15]:lathe('Tap mixer',[(0,0),(.06,0),(.06,.12),(0,.14)],(x,3.1,1.63),'steel',32)
  lathe('Sink drain rim',[(.07,0),(.1,0),(.1,.01),(.07,.01)],(-2.5,2.6,1.4),'ink',40)
 with part('kitchen_chopping','案板、厨刀与蔬菜切片','recipes','端面拼接案板、楔形刀刃、刀柄铆钉、番茄籽与切面'):
  box('Butcher block',(-.65,2.3,1.67),(1.65,1,.12),'wood',.07);grain_lines(-.65,2.3,1.736,1.55,.88)
  mesh('Chef knife forged blade',[(-1.3,1.98,1.75),(-.42,1.98,1.75),(-.3,1.98,1.88),(-1.24,1.98,1.94),(-1.3,2.01,1.75),(-.42,2.01,1.75),(-.3,2.01,1.88),(-1.24,2.01,1.94)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3)],'steel')
  box('Riveted knife handle',(-1.55,2,1.85),(.48,.14,.12),'endgrain',.045)
  for x in [-1.68,-1.45]:screw(x,1.92,1.85)
  tomato(-.7,2.5,1.74,.17)
  for i in range(3):
   x=-.15+i*.2;lathe('Tomato slice skin',[(0,0),(.15,0),(.16,.035),(0,.04)],(x,2.4,1.74),'tomato',48,.04)
   lathe('Tomato cut flesh',[(.138,0),(.14,.004),(0,.006)],(x,2.4,1.783),'flesh',48,.025)
   for chamber in range(3):
    a=chamber*math.tau/3;curve('Tomato flesh chamber',[(x+.025*math.cos(a),2.4+.025*math.sin(a),1.797),(x+.11*math.cos(a-.5),2.4+.11*math.sin(a-.5),1.796),(x+.11*math.cos(a+.5),2.4+.11*math.sin(a+.5),1.796),(x+.025*math.cos(a),2.4+.025*math.sin(a),1.797)],.007,'cream')
   for j in range(5):
    a=j*math.tau/5;lathe('Visible tomato seed',[(0,0),(.016,0),(.018,.006),(0,.009)],(x+.08*math.cos(a),2.4+.08*math.sin(a),1.785),'gold',16)
 with part('kitchen_recipebook','翻开的教程与书架','draw','纸页弯曲、分层书芯、装订线、步骤字样与书签'):
  table(-2.8,-1.3,2.3,1.5,1.1);book(-2.8,-1.3,1.22,1.8,1.2,'今日食谱');text('1 备菜   2 下锅   3 调味',(-2.7,-1.65,1.45),.09,'jade',(0,0,0));box('Recipe bookmark',(-2.1,-1.3,1.38),(.14,1.3,.018),'coral',.006)
 with part('kitchen_spices','香料架与标签','recipes','阶梯置物架、瓶肩、螺纹瓶盖、不同调料标识'):
  box('Spice shelf',(.2,3.15,2.62),(3,.6,.09),'wood',.025)
  for i,label in enumerate(['盐','糖','胡椒','辣椒']):bottle(-.9+i*.7,3.05,2.68,label,['cream','cream','endgrain','coral'][i],.55)
 with part('kitchen_meal','摆盘与成品展示','meals','空心器皿、炙烤切面、手工釉线、茶杯内壁及餐巾褶皱'):
  table(1.5,-1.3,3.2,1.8,1.0);surface('Woven napkin',(1.5,-1.3,1.135),1.1,1.6,'linen',.017)
  plate(1.35,-1.25,1.13,.55);steak(1.35,-1.25,1.25);leaf('Salad leaf',(1.8,-1.4,1.25),.4,.12,.2,.12);mug(2.5,-.9,1.12)
 with part('kitchen_herbs','香草叶与陶土花盆','Architecture','叶片厚度、边缘卷曲、主叶脉和釉面盆口'):
  plant(-3.8,3.1,1.64,.2);plant(3.8,2.9,1.64,.18)
