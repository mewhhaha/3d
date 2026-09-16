import * as THREE from 'three';
import { group, material } from '../modeling.js';
import { contourVolume } from '../contour-volume.js';
import { shapeProfile, surfaceBand, thickenSurface } from '../shape-rails.js';
import { surfaceLayer, attachToSurface } from '../surface-frame.js';
import { panel, radialPort, orient, routedCable } from './mechanics.js';

/** A smooth support in physical units; one support drives both shell edges and attachments. */
export function limbVolume({ length, radii, bend = [[0,0],[1,0]] }) {
 if(!Number.isFinite(length)||length<=0||!Array.isArray(radii)||radii.some(p=>p.length!==3||p.slice(1).some(v=>!Number.isFinite(v)||v<=0)))throw new Error('Invalid limb volume');
 const rx=shapeProfile(radii.map(([t,x])=>[t,x])),rz=shapeProfile(radii.map(([t,,z])=>[t,z])),sweep=shapeProfile(bend);
 return (u,v)=>{const t=1-v,a=(u-.5)*2*Math.PI;return[Math.sin(a)*rx(t),-length*t,Math.cos(a)*rz(t)+sweep(t)];};
}
export function armorLeaf(support,{name='Armor leaf',left,right,start=0,end=1,thickness=.004,segments=[18,32],offset=0,lift=null,material}={}) {
 if(!Number.isFinite(offset)||lift!==null&&(!Array.isArray(lift)||lift.length<2))throw new Error('Armor leaf offset/lift must be finite authored profiles');
 const rise=lift&&shapeProfile(lift),base=(offset||rise)?surfaceLayer(support,{offset,relief:rise?(_,v)=>rise(v):()=>0}):support;
 return thickenSurface(name,surfaceBand(base,{left:shapeProfile(left),right:shapeProfile(right),start,end}),{thickness,segments,material});
}
/** Compose independently editable longitudinal shell patches on one support.
 * Each part owns only boundaries/thickness/look; pose and limb volume stay shared. */
export function segmentedArmor(support,{name='Segmented armor',parts=[],segments=[18,32]}={}){
 if(typeof support!=='function'||!Array.isArray(parts)||!parts.length)throw new Error('Segmented armor needs a support and parts');
 const root=group(name),seen=new Set();
 for(const [index,part] of parts.entries()){
  const {label=`segment ${index}`,left,right,start=0,end=1,thickness=.004,offset=0,lift=null,segments:partSegments=segments,material}=part;
  if(typeof label!=='string'||!label||seen.has(label)||![start,end,thickness,offset].every(Number.isFinite)||start<0||end>1||end<=start||thickness<=0)throw new Error('Invalid segmented armor part');
  seen.add(label);
  root.add(armorLeaf(support,{name:`${name} / ${label}`,left,right,start,end,thickness,offset,lift,segments:partSegments,material}));
 }
 root.userData.construction={method:'shared-support segmented shell set',segments,parts:parts.map(({label,start=0,end=1,offset=0,lift=null,segments:partSegments=segments})=>({label,start,end,offset,lift,segments:partSegments}))};return root;
}

export function limbArmor({ name, length, radii, type='thigh' },mats){
 const root=group(name),support=limbVolume({length,radii,bend:[[0,0],[.55,.006],[1,0]]}),shellSegments=(type==='thigh'||type==='shin')?[12,20]:[16,24];
 const front=type==='shin'?[
  {label:'ankle blade',start:.02,end:.255,left:[[0,.37],[.18,.35],[.28,.36],[1,.38]],right:[[0,.63],[.18,.65],[.28,.64],[1,.62]],material:mats.shell},
  {label:'calf outer leaf',start:.27,end:.775,left:[[0,.28],[.35,.22],[.57,.18],[1,.27]],right:[[0,.485],[.45,.47],[1,.49]],material:mats.shell},
  {label:'calf inner leaf',start:.285,end:.765,left:[[0,.525],[.45,.53],[1,.51]],right:[[0,.72],[.35,.78],[.57,.82],[1,.70]],offset:.001,material:mats.shell},
  {label:'knee flare',start:.79,end:.965,left:[[0,.34],[.78,.24],[1,.31]],right:[[0,.66],[.78,.76],[1,.69]],offset:.0015,material:mats.shell},
 ]:type==='thigh'?[
  {label:'knee tongue',start:.035,end:.285,left:[[0,.39],[.16,.34],[.28,.33],[1,.37]],right:[[0,.61],[.16,.66],[.28,.67],[1,.63]],material:mats.shell},
  {label:'main outer leaf',start:.30,end:.795,left:[[0,.30],[.34,.22],[.61,.20],[1,.27]],right:[[0,.485],[.42,.465],[1,.49]],material:mats.shell},
  {label:'main inner leaf',start:.315,end:.785,left:[[0,.525],[.45,.535],[1,.515]],right:[[0,.70],[.34,.78],[.61,.80],[1,.72]],offset:.0012,material:mats.shell},
  {label:'hip mantle',start:.805,end:.985,left:[[0,.34],[.83,.17],[1,.23]],right:[[0,.66],[.83,.83],[1,.77]],offset:.002,material:mats.shell},
 ]:null;
 if(front)root.add(segmentedArmor(support,{name:name+' / articulated front',parts:front,segments:shellSegments}));
 else{
  const spec=type==='forearm'?{start:.025,end:.91,span:.22}:{start:.09,end:.99,span:.29},a=spec.span;
  root.add(armorLeaf(support,{name:name+' / front shell',start:spec.start,end:spec.end,segments:shellSegments,left:[[0,.5-a*.45],[.12,.5-a*.72],[.38,.5-a],[.64,.5-a*.82],[.84,.5-a],[1,.5-a*.68]],right:[[0,.5+a*.45],[.19,.5+a*.74],[.42,.5+a*.85],[.71,.5+a],[1,.5+a*.64]],material:mats.shell}));
 }
 // Narrow side plates leave controlled dark chassis channels between the front and rear shells.
 const wingWindows=type==='thigh'?[[.12,.47],[.55,.91]]:type==='shin'?[[.09,.42],[.52,.89]]:[[.15,.9]];
 for(const side of [-1,1])for(const [j,[start,end]] of wingWindows.entries()){
  const c=side<0?.08:.92,spread=(type==='shin'?.050:.044)*(j? .82:1);
  root.add(armorLeaf(support,{name:`${name} / rear wing ${side} ${j}`,start,end,segments:shellSegments,left:[[0,c-spread*.72],[.5,c-spread],[1,c-spread*.65]],right:[[0,c+spread*.72],[.5,c+spread],[1,c+spread*.65]],thickness:.003,material:mats.shell}));
 }
 // A dark nested bridge under each major front gap makes segmentation read as mechanics, not missing geometry.
 if(type==='thigh'||type==='shin'){
  const gaps=type==='thigh'?[[.285,.30],[.795,.805]]:[[.255,.27],[.775,.79]];
  for(const [i,[start,end]] of gaps.entries())root.add(armorLeaf(surfaceLayer(support,{offset:-.002}),{name:`${name} / exposed flex bridge ${i}`,start,end,segments:[10,12],left:[[0,.38],[1,.38]],right:[[0,.62],[1,.62]],thickness:.0025,material:mats.dark}));
 }
 if(type==='thigh'||type==='shin'){
  // Different inner/outer knee ears interrupt the otherwise smooth tube and visually clamp the bearing.
  // They are still bands on the shared support, so their clearance and curvature track the limb volume.
  const kneeParts=type==='thigh'?[
   {label:'outer knee ear',start:.01,end:.19,left:[[0,.075],[.55,.045],[1,.065]],right:[[0,.19],[.45,.22],[1,.18]],offset:.0025,lift:[[0,0],[.45,.0045],[1,.001]]},
   {label:'inner knee ear',start:.025,end:.145,left:[[0,.81],[.5,.80],[1,.825]],right:[[0,.91],[.55,.945],[1,.925]],offset:.002},
  ]:[
   {label:'outer knee receiver',start:.82,end:.995,left:[[0,.065],[.5,.045],[1,.08]],right:[[0,.205],[.45,.235],[1,.19]],offset:.0025,lift:[[0,.001],[.48,.006],[1,.0015]]},
   {label:'inner knee receiver',start:.86,end:.985,left:[[0,.805],[.5,.79],[1,.82]],right:[[0,.91],[.5,.94],[1,.92]],offset:.002},
  ];
  root.add(segmentedArmor(support,{name:name+' / knee bracket stack',parts:kneeParts.map(p=>({...p,thickness:.0035,material:mats.shell})),segments:[10,14]}));
  if(type==='shin')root.add(segmentedArmor(support,{name:name+' / lateral brace stack',segments:[10,18],parts:[
   {label:'outer shin shoulder',start:.62,end:.86,left:[[0,.115],[.45,.085],[1,.105]],right:[[0,.28],[.45,.31],[1,.255]],offset:.002,lift:[[0,0],[.35,.008],[.72,.006],[1,0]],thickness:.0038,material:mats.shell},
   {label:'outer shin rail',start:.23,end:.68,left:[[0,.12],[.42,.09],[.72,.105],[1,.14]],right:[[0,.235],[.35,.27],[.70,.255],[1,.225]],offset:.0015,lift:[[0,0],[.28,.0055],[.55,.009],[.80,.0045],[1,0]],thickness:.0035,material:mats.shell},
   {label:'lower outer clamp',start:.08,end:.30,left:[[0,.14],[.55,.11],[1,.13]],right:[[0,.265],[.45,.29],[1,.25]],offset:.0015,lift:[[0,0],[.55,.0065],[1,0]],thickness:.0035,material:mats.shell},
  ]}));
 }
 const accent=[];for(let i=0;i<=24;i++){const v=.15+i/24*.65,u=.5+(type==='forearm'?-.045:.065)+.019*Math.sin(v*10),temp=new THREE.Object3D();attachToSurface(temp,support,{u,v,offset:.002});accent.push(temp.position.toArray());}
 root.add(routedCable({name:name+' / surface inlay',points:accent,radius:.0010,segments:32,ends:false,material:type==='forearm'?mats.cyan:mats.orange}));
 root.userData.construction={method:front?'shared-support segmented armor with exposed flex gaps':'curve-bounded normal-offset shell',type};return root;
}
/** Shaped footprint instead of a rounded rectangular sole; all values are local meters. */
export function sculptedBoot({side=1}={},mats){
 const root=group(side>0?'Boot.L':'Boot.R');
 const footprint=[[-.037,-.066],[-.048,-.048],[-.046,.018],[-.061,.103],[-.056,.155],[-.033,.187],[.012,.191],[.047,.177],[.058,.138],[.052,.083],[.040,.005],[.038,-.049]];
 const sole=contourVolume({name:'Contoured orange sole',outline:footprint,sections:[
  {height:-.0435,scale:[.92,.97]}, {height:-.038,scale:[1,1]},
  {height:-.026,scale:[1.01,1]}, {height:-.018,scale:[.91,.975]},
 ],material:material('#cb431c',{roughness:.5,metalness:.08})});root.add(sole);
 root.add(contourVolume({name:'Dark flexible midsole',outline:footprint,sections:[{height:-.021,scale:[.88,.96]},{height:-.009,scale:[.88,.96]}],layers:2,material:mats.dark}));
 const width=shapeProfile([[0,.036],[.25,.044],[.55,.057],[.80,.057],[1,.024]]),height=shapeProfile([[0,.075],[.24,.060],[.53,.041],[.82,.025],[1,.017]]);
 const upper=(u,v)=>{const a=(u-.5)*Math.PI;return[-Math.sin(a)*width(v),-.006+Math.cos(a)*height(v),THREE.MathUtils.lerp(-.053,.181,v)];};
 root.add(thickenSurface('Shoe flexible upper',upper,{thickness:.004,segments:[20,32],material:mats.dark}));
 const upperShell=surfaceLayer(upper,{offset:.0045});
 for(const [label,left,right,start,end,segments]of [
  ['Toe outer petal',.07,.455,.53,.995,[12,20]],
  ['Toe inner petal',.545,.93,.57,.985,[12,20]],
  ['Outer instep',.03,.42,.05,.60,[12,20]],
  ['Inner instep',.60,.97,.08,.57,[12,20]],
 ])root.add(thickenSurface(label,surfaceBand(upperShell,{left:()=>left,right:()=>right,start,end}),{thickness:.004,segments,material:mats.shell}));
 const toeOutline=[[-.026,-.013],[.026,-.013]];for(let i=0;i<=16;i++){const a=i/16*Math.PI;toeOutline.push([.026*Math.cos(a),-.005+.020*Math.sin(a)]);}
 const toe=panel({name:'Toe bumper',outline:toeOutline,depth:.006,bevel:.002,material:mats.shell});toe.position.z=.176;root.add(toe);
 const collar=limbVolume({length:.072,radii:[[0,.037,.038],[.5,.041,.043],[1,.044,.048]]}),cuff=group('Segmented ankle cuff');cuff.position.set(0,.094,-.026);
 for(const [label,a,b,start,end] of [['outer',.04,.42,.08,.98],['inner',.62,.95,.18,.88]])cuff.add(armorLeaf(collar,{name:'Ankle cuff '+label,start,end,left:[[0,a],[.42,a+.02],[.72,a+.07],[1,a+.045]],right:[[0,b],[.48,b-.015],[.78,b-.06],[1,b-.035]],thickness:.004,segments:[10,16],material:mats.shell}));
 root.add(cuff);
 for(const s of[-1,1])root.add(orient(radialPort({name:'Boot heel bearing',radius:.025,color:'amber',detail:1},mats),[s*.044,.026,-.024],[s,0,0]));
 for(const z of [-.033,.034,.080,.127])root.add(routedCable({name:'Raised sole grip',points:[[-.046,-.034,z],[-.047,-.0435,z+.005],[.047,-.0435,z+.005],[.048,-.034,z]],radius:.003,segments:12,ends:false,material:mats.orange}));
 root.userData.construction={method:'section-lofted sole + instep loft + toe and side shell bands'};return root;
}

export function contouredShield({name='Contoured shield',width=.14,height=.13,bulge=.025,notch=.0,
 widthProfile=[[0,.54],[.14,.90],[.43,1],[.78,.82],[1,.57]],centerProfile=[[0,0],[1,0]]}={},mats){
 if(![width,height,bulge,notch].every(Number.isFinite)||width<=0||height<=0||bulge<0)throw new Error('Invalid shield dimensions');
 const shape=shapeProfile(widthProfile),center=shapeProfile(centerProfile);
 const support=(u,v)=>{
   const x=width*(center(v)+(u-.5)*shape(v)), y=(v-.5)*height;
   return [x,y,bulge*(1-(2*u-1)**2)*Math.sin(Math.PI*v) - notch*Math.exp(-(((u-.5)/.18)**2))*Math.exp(-((v/.18)**2))];
 };
 const root=group(name);
 root.add(thickenSurface(name+' / substrate',support,{thickness:.004,segments:[24,28],material:mats.dark}));
 const ceramic=surfaceLayer(surfaceBand(support,{left:()=>.027,right:()=>.973,start:.025,end:.975}),{offset:.004});
 root.add(thickenSurface(name+' / ceramic',ceramic,{thickness:.0025,segments:[24,28],material:mats.shell}));
 root.userData.construction={method:'profiled single-support layered shield',normalClearance:.0015,widthProfile,centerProfile};return root;
}
