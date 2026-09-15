"""Compile pinned CC0 graphical assets into a synchronous JavaScript anatomical template."""
import hashlib
import json
import math
from pathlib import Path
from urllib.request import urlopen
ROOT = Path(__file__).resolve().parents[1]
REVISION = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482'
BASE = f'https://raw.githubusercontent.com/makehumancommunity/makehuman/{REVISION}/'
SOURCES = {
 'data/3dobjs/base.obj': '8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c',
 'data/rigs/default.mhskel': '99f179bce0aa850b45d4191a1d0d234c5851f881c057439470ded3bddf729a24',
 'data/rigs/default_weights.mhw': '0f3641d651ae3d00ad6b4ccee43142edb109d3bd909d27d9e4139ef1beed8625',
 'data/targets/macrodetails/caucasian-female-young.target': '118379f6e8ba9266247fdb8788a20e1df40a239f97ced0b9905bcbcc74f6e820',
 'data/targets/macrodetails/asian-female-young.target': '095fe79694fa19e1fe98d93009ec116199bd524e081c640351a10eccf2cca1eb',
 'data/targets/macrodetails/african-female-young.target': '92d61eeb3c164b421fd5a7c3537ee45e7e1a51de4d49bf312e19c3df2be1d8fc',
 'data/targets/macrodetails/universal-female-young-averagemuscle-averageweight.target': '4ba5396ddabda448ece15650a566fbebfbb10239256ccb201e8f883429e12249',
 'data/targets/macrodetails/universal-female-young-maxmuscle-averageweight.target': '2e56b09b44a8497b927585447fdaac5ea7293521d1f3a3df1059495873c53f4e',
}
def source(path):
 file=ROOT/'vendor-src/makehuman'/path
 if not file.exists():
  file.parent.mkdir(parents=True,exist_ok=True)
  with urlopen(BASE+'makehuman/'+path,timeout=60) as response: data=response.read()
  file.write_bytes(data)
 data=file.read_bytes()
 if hashlib.sha256(data).hexdigest()!=SOURCES[path]: raise ValueError(f'Anatomical asset checksum mismatch: {path}')
 return data.decode('utf-8-sig')
def compile_template():
 points,uvs,groups=[],[],{};group='body'
 for line in source('data/3dobjs/base.obj').splitlines():
  t=line.split()
  if not t:continue
  if t[0]=='v':points.append([float(x) for x in t[1:4]])
  elif t[0]=='vt':uvs.append([float(x) for x in t[1:3]])
  elif t[0]=='g':group=t[1]
  elif t[0]=='f':groups.setdefault(group,[]).append([[int(v)-1 for v in item.split('/')[:2]] for item in t[1:]])
 for name,amount in [('caucasian-female-young',.8),('asian-female-young',.1),('african-female-young',.1),('universal-female-young-averagemuscle-averageweight',.8),('universal-female-young-maxmuscle-averageweight',.2)]:
  for line in source(f'data/targets/macrodetails/{name}.target').splitlines():
   t=line.split()
   if len(t)!=4 or not t[0].isdigit():continue
   for axis in range(3):points[int(t[0])][axis]+=float(t[axis+1])*amount
 source('data/rigs/default.mhskel')
 raw_weights=json.loads(source('data/rigs/default_weights.mhw'))['weights']
 def mean(indices):return [sum(points[i][k] for i in indices)/len(indices) for k in range(3)]
 anchors={key[6:]:mean(sorted({i for face in faces for i,_ in face})) for key,faces in groups.items() if key.startswith('joint-')}
 def map_bone(name):
  side='L' if name.endswith('.L') else 'R'
  if name.startswith('finger'):return side+'_'+name.split('.')[0].replace('-','_').title()
  if name.startswith(('wrist','metacarpal')):return side+'_Hand'
  for prefix,target in [('upperarm','UpperArm'),('lowerarm','Forearm'),('upperleg','Thigh'),('lowerleg','Shin'),('foot','Foot'),('toe','Foot')]:
   if name.startswith(prefix):return side+'_'+target
  if name.startswith(('clavicle','shoulder')):return side+'_Clavicle'
  if name in ['root','spine05'] or name.startswith('pelvis'):return 'Hips'
  if name in ['spine04','spine03']:return 'Spine'
  if name in ['spine02','spine01'] or name.startswith('breast'):return 'Chest'
  if name.startswith('neck'):return 'Neck'
  return 'Head'
 weights=[{} for _ in points];lip=[0.0 for _ in points]
 for bone,values in raw_weights.items():
  target=map_bone(bone)
  for i,weight in values:
   weights[i][target]=weights[i].get(target,0)+weight
   if bone.startswith('oris'):lip[i]+=weight
 for i,ws in enumerate(weights):
  vals=sorted(ws.items(),key=lambda x:-x[1])[:4] or [('Hips',1)];total=sum(w for _,w in vals)
  weights[i]=[[name,round(w/total,7)] for name,w in vals]
 body=groups['body'];ids=sorted({i for face in body for i,_ in face});low=min(points[i][1] for i in ids);high=max(points[i][1] for i in ids);factor=1.72/(high-low)
 norm=lambda p:[round(p[0]*factor,7),round((p[1]-low)*factor,7),round(p[2]*factor,7)]
 points=[norm(p) for p in points];anchors={k:norm(p) for k,p in anchors.items()}
 original_anchors={k:p[:] for k,p in anchors.items()}
 def straighten(p,side,amount=1):
  elbow=original_anchors[f'{side}-elbow'];wrist=original_anchors[f'{side}-hand'];a=math.atan2(wrist[2]-elbow[2],-(wrist[1]-elbow[1]));dy=p[1]-elbow[1];dz=p[2]-elbow[2]
  return [p[0],p[1]+amount*(math.cos(a)*dy-math.sin(a)*dz-dy),p[2]+amount*(math.sin(a)*dy+math.cos(a)*dz-dz)]
 for i,p in enumerate(points):
  for side in ['l','r']:
   amount=sum(w for b,w in weights[i] if b.startswith(side.upper()+'_') and any(s in b for s in ['Forearm','Hand','Finger']))
   if amount:p=straighten(p,side,amount)
  points[i]=p
 for key,p in list(anchors.items()):
  if key.startswith(('l-','r-')) and any(s in key for s in ['hand','finger']):anchors[key]=straighten(p,key[0])
 angle=math.radians(30)
 def relax(p,side,weight=1):
  shoulder=anchors[f'{side}-shoulder'];sign=1 if side=='l' else -1;a=-sign*angle;dx=p[0]-shoulder[0];dy=p[1]-shoulder[1]
  return [p[0]+weight*(math.cos(a)*dx-math.sin(a)*dy-dx),p[1]+weight*(math.sin(a)*dx+math.cos(a)*dy-dy),p[2]]
 for i,p in enumerate(points):
  for side in ['l','r']:
   amount=sum(w for b,w in weights[i] if b.startswith(side.upper()+'_') and any(s in b for s in ['UpperArm','Forearm','Hand','Finger']))
   if amount:p=relax(p,side,amount)
  points[i]=[round(x,7) for x in p]
 for key,p in list(anchors.items()):
  if key.startswith(('l-','r-')) and any(s in key for s in ['elbow','hand','finger']):anchors[key]=relax(p,key[0])
 data={'revision':REVISION,'license':'CC0-1.0','height':1.72,'points':points,'uvs':uvs,'faces':{'body':body,'hair':groups['helper-hair']},'weights':weights,'lip':lip,'anchors':anchors}
 target=ROOT/'src/generated/human-data.js';target.parent.mkdir(parents=True,exist_ok=True)
 target.write_text('// Generated from pinned CC0 MakeHuman assets. See THIRD_PARTY.md.\nexport default '+json.dumps(data,separators=(',',':'))+';\n')
 print(f'Compiled {len(body)} anatomical quads and {len(anchors)} landmarks')
if __name__=='__main__':compile_template()
