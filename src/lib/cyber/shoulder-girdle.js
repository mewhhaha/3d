import * as THREE from 'three';
import {group,sphere,material} from '../modeling.js';
import {bridgeSurface,edgeDerivative} from '../surface-boundary.js';
import {thickenSurface} from '../shape-rails.js';
import {surfacePath} from '../surface-frame.js';
import {torsoSupport,contourArmor} from './torso-form.js';
import {bellows,link,routedCable} from './mechanics.js';
const V=p=>new THREE.Vector3(...p);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);

/** Resolve connecting surfaces AFTER the torso, shoulder and head owners are posed.
 * Build in the torso's local frame. The two seams stay on their named source
 * surfaces; no independently positioned armor or inferred skeletal motion.
 */
export function shoulderGirdle(android,mats,{pose=null,massStyle='structured'}={}){
 const torso=android.getObjectByName('Torso'),head=android.getObjectByName('HeadMount');
 if(!torso||!head)throw new Error('Girdle requires torso and head owners');
 android.updateMatrixWorld(true);
 const inv=torso.matrixWorld.clone().invert();
 const inTorso=owner=>{const matrix=inv.clone().multiply(owner.matrixWorld);return p=>V(p).applyMatrix4(matrix).toArray();};
 const support=torsoSupport({pose,massStyle}),headPoint=inTorso(head);
 const neck=headPoint([0,-.112,0]);
 const base=pose?pose.point([0,1.490,-.011]):[0,1.490,-.011];
 const root=group('Connected shoulder girdle');
 const dark=material('#172a2b',{metalness:.28,roughness:.62});dark.name='Girdle flexible support';
 root.add(bellows({name:'Angled cervical connector',from:base,to:neck,radius:.027,ribs:5},mats));
 root.add(sphere({name:'Cervical saddle',radius:.025,position:neck,segments:20,material:dark}));
 // Close the torso's exposed top ring into the tilted cervical socket. This
 // shared perimeter is sampled from the torso itself, not a scaled duplicate.
 const axis=V(neck).sub(V(base)).normalize(),right=new THREE.Vector3(1,0,0).addScaledVector(axis,-axis.x).normalize();
 const across=right.clone().cross(axis).normalize(),landing=V(base).lerp(V(neck),.82);
 const rim=u=>support(u,1),socket=u=>{const a=(u-.5)*Math.PI*2;return landing.clone().addScaledVector(right,.031*Math.sin(a)).addScaledVector(across,.031*Math.cos(a)).toArray();};
 const incoming=edgeDerivative(support,'v1',{scale:-.045});
 const collar=bridgeSurface(rim,socket,{tangentStart:incoming,tangentEnd:()=>axis.clone().multiplyScalar(.032).toArray()});
 root.add(thickenSurface('Cervical collar transition',collar,{thickness:.003,segments:[48,12],material:dark}));
 const bindings=[];
 function span(name,start,end,lift,{ceramic=false}={}){
  const chord=u=>sub(end(u),start(u));
  const skin=bridgeSurface(start,end,{tangentStart:u=>add(chord(u),lift),tangentEnd:u=>sub(chord(u),lift)});
  root.add(thickenSurface(name+' / flex',skin,{thickness:.003,segments:[10,14],material:dark}));
  if(ceramic){
   const outline=[[.07,.18],[.22,.055],[.75,.09],[.94,.28],[.91,.68],[.78,.94],[.63,.96],[.55,.76],[.20,.82],[.08,.58]];
   root.add(contourArmor(name+' / cover',skin,outline,mats,{offset:.004,thickness:.003,refinement:2,rounding:.10}));
  }
  bindings.push({name,start:start(.5),end:end(.5),from:'Torso',to:name.endsWith('Near')?'Shoulder.L':'Shoulder.R'});
  return skin;
 }
 for(const side of [1,-1]){
  const label=side>0?'Near':'Far',shoulder=android.getObjectByName(side>0?'Shoulder.L':'Shoulder.R');
  if(!shoulder)throw new Error('Missing shoulder owner');
  const shoulderPoint=inTorso(shoulder),flip=u=>side>0?u:1-u;
  // Exact points on the retained .069*.82 shoulder ball. The span ends inside
  // the independently owned cowl/port, not at a guessed image-space point.
  const ball=p=>shoulderPoint(V(p).normalize().multiplyScalar(.069*.82).toArray());
  const clavicleStart=u=>support(side>0?.543:.457,.977-.040*flip(u));
  const clavicleEnd=u=>ball([-side*.045,.026-.042*flip(u),.034]);
  const clavicle=span('Clavicular bridge '+label,clavicleStart,clavicleEnd,[0,.035,.036],{ceramic:true});
  const under=surfacePath(clavicle,[[.50,.08],[.50,.34],[.50,.66],[.50,.94]],{offset:-.004});
  root.add(routedCable({name:'Clavicular structural rail '+label,points:under,radius:.006,segments:24,ends:false,material:mats.edge}));
  // Broad posterior blade against the ribs, narrowing toward the glenoid.
  const backStart=u=>support(side>0?.91:.09,.74+.215*flip(u));
  const backEnd=u=>ball([-side*.033,-.020+.056*flip(u),-.039]);
  span('Scapular bridge '+label,backStart,backEnd,[0,.005,-.048],{ceramic:true});
  // Neck-to-acromion mantle gives the sloping trapezial line, not a tall tube.
  const trapStart=u=>add(neck,[side*.019,-.009,side*(2*u-1)*.014]);
  const trapEnd=u=>ball([-side*.022,.041,side*(2*u-1)*.043]);
  span('Trapezial bridge '+label,trapStart,trapEnd,[0,-.025,-.014]);
  root.add(link({name:'Neck tension strut '+label,from:headPoint([side*.020,-.117,.005]),to:clavicle(.5,.24),radius:.005,segments:12,material:mats.edge}));
 }
 root.userData.girdle={method:'source-boundary Hermite bridges in torso-local space',neckBase:base,neckEnd:neck,bindings,scope:'build-time resolved; separate shells, not welded anatomy or skinning'};
 return root;
}

/** A socket-cover with a true aperture around the retained light module.
 * Same local frame as the previous cowl; no emitter or hinge repositioning. */
export function girdleCowl({portCenter=[0,.018,.070],cowlZ=.024}={},mats){
 const width=.162,height=.181,crownDepth=portCenter[2]-cowlZ-.003;
 const surface=(u,v)=>{
  const x=(u-.5)*width,y=(v-.5)*height;
  // Smooth rounded shoulder plane, kept behind the existing lens housing.
  return[x,y,crownDepth*(1-.38*(2*u-1)**2-.44*(2*v-1)**2)];
 };
 const [cx,cy]=portCenter;
 const aperture=Array.from({length:24},(_,i)=>{
  const a=i/24*Math.PI*2;
  return[.5+(cx+.040*Math.cos(a))/width,.5+(cy+.040*Math.sin(a))/height];
 });
 const outline=[[.035,.56],[.09,.83],[.30,.985],[.64,.975],[.86,.80],[.98,.57],[.88,.26],[.80,.075],[.64,.04],[.58,.24],[.43,.265],[.385,.14],[.21,.09],[.14,.32]];
 const object=contourArmor('Scalloped shoulder shell',surface,outline,mats,{offset:.002,thickness:.0045,rounding:.10,refinement:2,holes:[aperture]});
 object.userData.socketCover={portCenter:[...portCenter],apertureRadius:.040,cowlZ};return object;
}
