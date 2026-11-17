#!/usr/bin/env python3
"""Negative design experiment, not a new physics interpreter."""
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
  if i in [9,99,499,1499]: rows.append({"redirects":i+1,"maximum_denominator_bits":peak,"time_approx":float(t),"last_positive_midpoint_duration_approx":float(dt)})
 return rows
heads={(0,0):(-2,-3),(0,1):(-3,-2),(1,0):(3,-2),(1,1):(-2,-3)}
import json
print(json.dumps({'scope':'Exact unit-cell geometry research on a 2x2 abstract torus; not a certified 1000-cell game, canonical speed table, rearm proof, or installed purchase. Demonstrates denominator growth in the naive exact-anchor proposal only.','samples':loop(heads,1500),'status':'UNBOUNDED-DENOMINATOR PROPOSAL NOT QUALIFIED'}))
