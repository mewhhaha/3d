import * as THREE from 'three';
import { group, mesh, material } from '../modeling.js';
import { contourVolume } from '../contour-volume.js';
import { shapeProfile, surfaceBand, thickenSurface } from '../shape-rails.js';
import { surfaceLayer, attachToSurface } from '../surface-frame.js';
import { panel, radialPort, orient, routedCable } from './mechanics.js';

/** A smooth support in physical units; one support drives both shell edges and attachments. */
export function limbVolume({ length, radii, bend = [[0,0],[1,0]] }) {
 if(!Number.isFinite(length)||length<=0||!Array.isArray(radii)||radii.some(p=>p.length!==3||p.slice(1).some(v=>!Number.isFinite(v)||v<=0)))throw new Error('Invalid limb volume');
 const rx=shapeProfile(radii.map(([t,x])=>[t,x])),rz=shapeProfile(radii.map(([t,,z])=>[t,z])),sweep=shapeProfile(bend);
 // v ascends from distal to proximal so du x dv faces outward.
 return (u,v)=>{const t=1-v,a=(u-.5)*2*Math.PI;return[Math.sin(a)*rx(t),-length*t,Math.cos(a)*rz(t)+sweep(t)];};
}
export function armorLeaf(support,{name='Armor leaf',left,right,start=0,end=1,thickness=.004,material}={}) {
 return thickenSurface(name,surfaceBand(support,{left:shapeProfile(left),right:shapeProfile(right),start,end}),{thickness,segments:[18,32],material});
}
export function limbArmor({ name, length, radii, type='thigh' },mats){
 const root=group(name),support=limbVolume({length,radii,bend:[[0,0],[.55,.006],[1,0]]});
 const spec=type==='shin'?{start:.015,end:.92,span:.32}:type==='forearm'?{start:.025,end:.91,span:.22}:{start:.09,end:.99,span:.29};
 // Broad irregular front panel: rounded longitudinal shaping, not a straight tube sector.
 const a=spec.span;
 root.add(armorLeaf(support,{name:name+' / front shell',start:spec.start,end:spec.end,left:[[0,.5-a*.45],[.12,.5-a*.72],[.38,.5-a],[.64,.5-a*.82],[.84,.5-a],[1,.5-a*.68]],right:[[0,.5+a*.45],[.19,.5+a*.74],[.42,.5+a*.85],[.71,.5+a],[1,.5+a*.64]],material:mats.shell}));
 for(const side of [-1,1]){
  const c=side<0?.08:.92;
  root.add(armorLeaf(support,{name:name+' / rear wing '+side,start:.15,end:.9,left:[[0,c-.037],[.5,c-.055],[1,c-.03]],right:[[0,c+.037],[.5,c+.055],[1,c+.03]],thickness:.003,material:mats.shell}));
 }
 const accent=[];for(let i=0;i<=24;i++){const v=.15+i/24*.65,u=.5+(type==='forearm'?-.045:.065)+.019*Math.sin(v*10),p=support(u,v);const temp=new THREE.Object3D();attachToSurface(temp,support,{u,v,offset:.002});accent.push(temp.position.toArray());}
 root.add(routedCable({name:name+' / surface inlay',points:accent,radius:.0010,segments:32,ends:false,material:type==='forearm'?mats.cyan:mats.orange}));
 
 root.userData.construction={method:'curve-bounded normal-offset shell',type};return root;
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
 for(const [name,left,right,start,end]of [['Toe shield',.10,.90,.55,1],['Outer instep',.03,.43,.05,.63],['Inner instep',.58,.97,.06,.62]])root.add(thickenSurface(name,surfaceLayer(surfaceBand(upper,{left:()=>left,right:()=>right,start,end}),{offset:.0045}),{thickness:.004,segments:[16,24],material:mats.shell}));
 // Close the front opening and add a separate ankle collar; toes are a volume, not a sheet.
 const toeOutline=[[-.026,-.013],[.026,-.013]];
 for(let i=0;i<=16;i++){const a=i/16*Math.PI;toeOutline.push([.026*Math.cos(a),-.005+.020*Math.sin(a)]);}
 const toe=panel({name:'Toe bumper',outline:toeOutline,depth:.006,bevel:.002,material:mats.shell});toe.position.z=.176;root.add(toe);
 const collar=limbVolume({length:.072,radii:[[0,.037,.038],[.5,.041,.043],[1,.044,.048]]});
 const cuff=group('Segmented ankle cuff');cuff.position.set(0,.094,-.026);
 for(const [label,a,b] of [['outer',.06,.39],['inner',.60,.94]])cuff.add(armorLeaf(collar,{name:'Ankle cuff '+label,left:[[0,a],[.55,a+.04],[1,a+.06]],right:[[0,b],[.5,b-.02],[1,b-.03]],thickness:.004,material:mats.shell}));
 root.add(cuff);
 for(const s of[-1,1])root.add(orient(radialPort({name:'Boot heel bearing',radius:.025,color:'amber',detail:1},mats),[s*.044,.026,-.024],[s,0,0]));
 for(const z of [-.033,.034,.080,.127])root.add(routedCable({name:'Raised sole grip',points:[[-.046,-.034,z],[-.047,-.0435,z+.005],[.047,-.0435,z+.005],[.048,-.034,z]],radius:.003,segments:12,ends:false,material:mats.orange}));
 root.userData.construction={method:'section-lofted sole + instep loft + toe and side shell bands'};return root;
}

/** Smooth shoulder/chest shield whose substrate and face are offsets of one chart.
 * Layer clearance is explicit; reducing a duplicate in XY would cause intersections. */
export function contouredShield({name='Contoured shield',width=.14,height=.13,bulge=.025,notch=.0}={},mats){
 if(![width,height,bulge,notch].every(Number.isFinite)||width<=0||height<=0||bulge<0)throw new Error('Invalid shield dimensions');
 const shape=shapeProfile([[0,.54],[.14,.90],[.43,1],[.78,.82],[1,.57]]);
 const support=(u,v)=>{
   const x=(u-.5)*width*shape(v), y=(v-.5)*height;
   return [x,y,bulge*(1-(2*u-1)**2)*Math.sin(Math.PI*v) - notch*Math.exp(-(((u-.5)/.18)**2))*Math.exp(-((v/.18)**2))];
 };
 const root=group(name);
 root.add(thickenSurface(name+' / substrate',support,{thickness:.004,segments:[24,28],material:mats.dark}));
 const ceramic=surfaceLayer(surfaceBand(support,{left:()=>.027,right:()=>.973,start:.025,end:.975}),{offset:.004});
 root.add(thickenSurface(name+' / ceramic',ceramic,{thickness:.0025,segments:[24,28],material:mats.shell}));
 root.userData.construction={method:'single-support layered shield',normalClearance:.0015};return root;
}
