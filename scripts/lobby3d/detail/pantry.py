from common import *
import common as C

def build():
 floor('fridge')
 with part('fridge_shell','冰箱壳体与密封结构','pantry','双层钣金壳体、内胆圆角、橡胶密封圈、检修缝、底脚与散热栅'):
  # Open cavity assembled from wall thicknesses; no solid box masking the interior.
  box('Rear refrigerator shell',(0,2.7,2.95),(4.1,.18,5.7),'enamel',.07)
  for x in [-1.98,1.98]:
   box('Outer side casing',(x,1.6,2.95),(.22,2.4,5.7),'enamel',.08);box('Inset liner side',(x*.945,1.5,3.02),(.07,2.12,5.35),'cream',.04)
  for z in [.25,5.72]:box('Body top or bottom',(0,1.6,z),(4.0,2.35,.2),'enamel',.08)
  box('Rear inner liner',(0,2.56,3),(3.8,.10,5.35),'cream',.045)
  for x in [-1.84,1.84]:box('Rubber gasket lip',(x,.36,3),(.046,.045,5.26),'darkmetal',.015)
  for z in [.38,5.63]:box('Rubber gasket lip',(0,.36,z),(3.7,.045,.046),'darkmetal',.015)
  for x in [-1.65,1.65]:lathe('Levelling foot',[(0,0),(.13,0),(.13,.10),(.08,.14),(0,.14)],(x,.9,.06),'darkmetal',32)
  box('Lower ventilation panel',(0,.29,.52),(3.5,.13,.28),'enamel',.025)
  for i in range(25):box('Ventilation slit',(-1.5+i*.125,.215,.52),(.064,.015,.11),'darkmetal',.012)
  sign('我的冰箱',0,2.5,5.35,2.7)
 with part('fridge_thermostat','冷藏背板与温控','pantry','分层风道、金属出风片、旋钮刻线、温度面板与顶灯'):
  box('Cooling duct',(0,2.42,3.95),(1.7,.11,1.4),'enamel',.07)
  for j in range(12):box('Cooling louvre',(0,2.345,3.43+j*.09),(1.37,.04,.028),'steel',.006)
  box('Digital display',(1.25,2.37,4.88),(.55,.05,.35),'ink',.045);text('04°',(1.25,2.335,4.82),.19,'light')
  box('Interior LED diffuser',(0,1.55,5.51),(2.4,1.4,.035),'light',.02)
  for x in [-1.62,1.62]:screw(x,2.34,4.85)
 with part('fridge_shelves','冷藏层板与导轨','pantry','带真实厚度的透光层板、包边、挂轨及高度调节卡槽'):
  for z in [1.97,3.10,4.20]:
   box('Glass shelf',(0,1.45,z),(3.55,1.8,.045),'glass',.012);box('Shelf rolled front edge',(0,.53,z),(3.6,.06,.085),'steel',.02)
   for x in [-1.72,1.72]:box('Shelf support rail',(x,1.48,z-.06),(.09,1.8,.08),'enamel',.02)
  for x in [-1.79,1.79]:
   for j in range(20):box('Adjustable shelf socket',(x,2.35,1.9+j*.15),(.032,.035,.055),'darkmetal',.004)
  for z,t in [(2.03,'冷藏 04°'),(3.16,'新鲜食材'),(4.26,'早餐补给')]:
   box('Shelf label',(1.03,.49,z+.06),(.78,.018,.17),'paper',.015);text(t,(1.03,.477,z+.025),.10,'jade')
 with part('fridge_dairy','奶瓶、果酱与酸奶','pantry','瓶肩收口、旋纹瓶盖、纸质标签、果酱罐和封口酸奶杯'):
  for x in [-1.22,-.6]:bottle(x,1.55,4.25,'MILK','cream',.9)
  for i in range(3):
   x=.2+i*.48;lathe('Yoghurt taper cup',[(0,0),(.13,0),(.20,.36),(.22,.38),(.22,.4),(0,.4)],(x,1.4,4.25),'blue',40)
   text('酸奶',(x,1.195,4.42),.09,'cream');lathe('Foil pull tab',[(0,0),(.07,0),(.07,.008),(0,.008)],(x+.19,1.4,4.65),'steel',24)
  for x in [-1.1,-.45]:bottle(x,2.05,3.16,'JAM','coral',.56)
 with part('fridge_eggs','模压纸浆蛋托','pantry','六个凹槽、隔柱、折边和不对称蛋壳轮廓'):
  box('Egg tray foundation',(.55,1.4,3.15),(1.45,.88,.05),'linen',.025)
  for j in range(2):
   for i in range(3):
    x=.06+i*.49;y=1.17+j*.46;lathe('Moulded egg cup',[(0,0),(.20,0),(.22,.12),(.24,.16),(.22,.18),(.16,.06),(0,.045)],(x,y,3.18),'ivory',32,.015);egg(x,y,3.24)
  for i in range(4):lathe('Egg separator pillar',[(0,0),(.07,0),(.045,.2),(0,.23)],(-.2+i*.49,1.4,3.2),'ivory',24)
 with part('fridge_produce','蔬果、叶脉与切面','pantry','番茄萼片、胡萝卜根纹、菜叶卷边与分叉叶脉'):
  for x,y in [(-1.25,1.1),(-.75,1.15),(-1,1.7)]:tomato(x,y,2.02,.22)
  for x,y in [(.3,1.1),(.8,1.3),(1.25,1.15)]:carrot(x,y,2.03)
  for i in range(6):leaf('Bok choy folded leaf',(.55,1.7,2.12),.65,.23,i*1.1,.27)
 with part('fridge_crisper','保鲜抽屉','pantry','透明前挡、内凹拉手、滑轨、沥水沟槽与分隔'):
  for x in [-.92,.92]:
   box('Crisper bottom',(x,1.35,1.1),(1.68,1.95,.06),'enamel',.03)
   for dx in [-.83,.83]:box('Crisper wall',(x+dx,1.35,1.43),(.04,1.95,.65),'glass',.012)
   box('Crisper front',(x,.36,1.43),(1.7,.055,.65),'glass',.02);box('Crisper handle',(x,.30,1.65),(.8,.10,.055),'steel',.02)
   for j in range(9):box('Drawer drainage channel',(x-.7+j*.17,1.35,1.14),(.015,1.8,.015),'cream',.004)
   for i in range(4):leaf('Crisper lettuce',(x,1.25,1.16),.6,.22,i*1.5,.30)
 with part('fridge_door','可开合冰箱门与门铰','pantry','有厚度的门板、独立铰链轴、螺丝、门封与弯曲金属把手') as doorpart:
  rig=group('rig_fridge_door',doorpart);rig.location=(-1.93,.34,0);rig.rotation_euler.z=math.radians(-102);C.CURRENT=rig
  box('Fridge sculpted door',(1.91,-.08,3.05),(3.82,.24,5.43),'enamel',.10)
  box('Door interior moulding',(1.91,.065,3.05),(3.5,.10,5.14),'cream',.07)
  for x in [.18,3.64]:box('Door magnetic gasket',(x,.13,3.05),(.048,.04,5.12),'darkmetal',.014)
  for z in [.50,5.61]:box('Door magnetic gasket',(1.91,.13,z),(3.5,.04,.048),'darkmetal',.014)
  curve('Swept brass door pull',[(3.42,-.23,2.7),(3.42,-.36,2.85),(3.42,-.36,4.0),(3.42,-.23,4.15)],.048,'brass')
  for z in [.65,5.35]:
   lathe('Hinge barrel',[(0,0),(.075,0),(.075,.27),(0,.27)],(0,0,z),'steel',32)
   box('Hinge plate',(.15,.12,z+.13),(.3,.04,.21),'steel',.015);screw(.14,.089,z+.13)
  for z in [1.10,2.45,3.85]:
   box('Door rack bottom',(1.90,.37,z),(3.04,.5,.045),'cream',.02)
   box('Door rack clear retaining wall',(1.9,.64,z+.21),(3.08,.045,.42),'glass',.025)
   for x in [.35,3.45]:box('Door rack side',(x,.37,z+.2),(.045,.55,.4),'cream',.02)
  for x in [.85,1.45,2.1,2.75]:bottle(x,.36,1.14,'SAUCE','coral' if x<1.5 else 'blue',.85)
  for x in [1,1.8,2.6]:bottle(x,.36,2.49,'JUICE','gold',.85)
  for x in [1,1.8,2.6]:bottle(x,.36,3.89,'FRESH','cream',.75)
 with part('fridge_market','采购袋与补货清单','shopping','纸袋折边、扁平提手、收据锯齿与购物篮编织纹'):
  table(2.95,-1.8,2.0,1.3,.85)
  box('Folded paper bag',(2.95,-1.8,1.3),(.75,.65,.8),'linen',.015)
  for x in [2.75,3.15]:curve('Flat paper handle',[(x,-1.9,1.7),(x,-1.9,2.05),(x+.12,-1.9,2.08),(x+.12,-1.9,1.7)],.018,'endgrain')
  for i in range(3):carrot(2.8+i*.16,-1.75,1.5)
  box('Shopping list',(2.9,-2.1,.95),(.72,.45,.014),'paper',.01);text('补货清单',(2.9,-2.12,.96),.11,'jade',(0,0,0))
  for j in range(3):box('List lines',(2.9,-2.22+j*.09,.967),(.43,.012,.005),'wood',.001)
