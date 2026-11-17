from fractions import Fraction as F
import math,random

def loop(heads,n=500):
 p=[F(0),F(1,3)];v=(3,2);cell=(0,0);peak=0;rows=[];t=F(0)
 for i in range(n):
  exit=min((F(cell[k]+(v[k]>0))-p[k])/v[k] for k in range(2) if v[k]);dt=exit/2
  if dt<=0:return None
  p=[p[k]+v[k]*dt for k in range(2)];t+=dt;v=heads[cell];peak=max(peak,*(q.denominator.bit_length() for q in [*p,t]))
  exit=min((F(cell[k]+(v[k]>0))-p[k])/v[k] for k in range(2) if v[k]);p=[p[k]+v[k]*exit for k in range(2)];t+=exit
  for k in range(2):
   if p[k]==cell[k]+(v[k]>0):cell=tuple(cell[j]+(1 if v[j]>0 else -1) if j==k else cell[j] for j in range(2))
  p=[p[k]-2*math.floor(F(cell[k],2)) for k in range(2)];cell=tuple(c%2 for c in cell)
  if i in [9,99,499]: rows.append((i+1,peak))
 return rows
random.seed(0)
vs=[(3,2),(2,3),(-3,2),(-2,3),(3,-2),(2,-3),(-3,-2),(-2,-3)]
for _ in range(200):
 h={(x,y):random.choice(vs) for x in range(2) for y in range(2)};r=loop(h)
 if r and r[-1][1]>1000:print(h,r);break
