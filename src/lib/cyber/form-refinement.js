import {shoulderGirdle,girdleCowl,seatShoulderModule} from './shoulder-girdle.js';
import {bridgedBoot} from './foot-form.js';
import {articulatedHand} from './hand-form.js';
import {jointSocketShell} from './joint-housings.js';
import {torsoGesture} from './body-gesture.js';
import { scallopedLimb, articulatedBoot, deltoidMantle } from './limb-form.js';
import { articulatedTorso, scallopedShoulder } from './torso-form.js';
import { illustratedHead } from './illustrated-head.js';
import { limbArmor, sculptedBoot, contouredShield } from './contour-armor.js';
import { cyberMaterials, ring, radialArray, link, cableLoom } from './mechanics.js';
import { box, group } from '../modeling.js';
import { reshapeAssembly } from '../shape-deform.js';
import { portraitFields } from './head-form.js';
import { posedAndroid } from './reference-layout.js';
import { guidedBob } from './hair-design.js';
/** Preserve guide/camera and replace only named components. Baseline stays available. */
export function refinedAndroid({ stage='assembly', hairMode='cage', crownRoundness=1, headStyle='legacy', bodyStyle='legacy', limbStyle='legacy', gestureStyle='fixed', jointStyle='open', massStyle='profiled', handStyle='legacy', panelStyle='broad', footStyle='legacy', emitterStyle='rings', girdleStyle='legacy', shoulderStyle='legacy', ...options }={}){
 if(!['legacy','seated'].includes(shoulderStyle))throw new Error('Unknown shoulder style');
 if(!['legacy','connected'].includes(girdleStyle))throw new Error('Unknown girdle style');
 if(!['legacy','bridged'].includes(footStyle))throw new Error('Unknown foot style');
 if(!['profiled','sculpted','structured'].includes(massStyle))throw new Error('Unknown mass style');
 if(!['open','housed'].includes(jointStyle))throw new Error('Unknown joint style');
 if(!['legacy','illustrated'].includes(headStyle))throw new Error('Unknown head style');
 if(!['legacy','articulated'].includes(bodyStyle))throw new Error('Unknown body style');
 if(!['legacy','scalloped'].includes(limbStyle))throw new Error('Unknown limb style');
 if(!['legacy','relaxed'].includes(handStyle))throw new Error('Unknown hand style');
 if(!['broad','cutaway'].includes(panelStyle))throw new Error('Unknown panel style');
 const root=posedAndroid({stage,gestureStyle,emitterStyle,...options});
 const bodyPose=gestureStyle==='fixed'?null:torsoGesture(gestureStyle);
 if(stage==='assembly'){
  const materials=cyberMaterials({glow:.7,emitterStyle});
  // Previous cylindrical under-structure outgrew the new tapered shells near joints.
  // Keep joint centers unchanged; only the unscored internal chassis is reduced.
  root.traverse(o=>{
   if(['Femur armature','Tibia chassis'].includes(o.name)){o.scale.x*=.55;o.scale.z*=.55;}
   if(['Forearm exposed core','Upper arm actuator'].includes(o.name)){o.scale.x*=.65;o.scale.z*=.65;}
   // The spherical shoulder core remains articulated, but should read as a recessed joint
   // beneath the ceramic cowl rather than as the dominant outer shoulder volume.
   if(o.name==='Shoulder joint ball')o.scale.setScalar(.82);
  });
  const shields=[];root.traverse(o=>{if(['Scalloped shoulder shell','Pectoral ceramic','Clavicle plating'].includes(o.name))shields.push(o);});
  for(const old of shields){
   const shoulder=old.name==='Scalloped shoulder shell',clavicle=old.name==='Clavicle plating',side=Math.sign(old.position.x)||1;
   // The reference exposes a narrow black thoracic core. Keep broad mechanical shoulders,
   // but make chest ceramics flatter, leaf-like and biased away from the sternum instead
   // of forming two round breast-like domes. Profiles define silhouette, not tessellation.
   const spec=shoulder?{
    width:.158,height:.174,bulge:.020,
    widthProfile:[[0,.34],[.12,.72],[.36,1],[.61,.92],[.82,.61],[1,.28]],
    centerProfile:[[0,side*.04],[.45,side*.09],[1,side*.02]],
   }:clavicle?{
    width:.124,height:.046,bulge:.006,
    widthProfile:[[0,.42],[.20,.76],[.55,1],[.82,.82],[1,.52]],
   }:{
    width:.106,height:.118,bulge:.014,
    widthProfile:[[0,.28],[.16,.63],[.40,.92],[.66,.78],[.86,.50],[1,.24]],
    centerProfile:[[0,side*.10],[.45,side*.05],[1,side*.15]],
   };
   const next=contouredShield({name:old.name,...spec},materials);
   next.position.copy(old.position);next.quaternion.copy(old.quaternion);next.scale.copy(old.scale);
   if(clavicle)next.position.x+=(old.rotation.z?1:-1)*.070;
   old.parent.add(next);old.removeFromParent();old.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
  }
  // Reveal the intended mechanical waist/chest structure behind the smaller ceramic leaves.
  // These are unscored internal masses; the reference guide and named feature origins stay fixed.
  for(const name of ['Thoracic understructure','Abdominal chassis']){const o=root.getObjectByName(name);if(o){o.scale.x*=name.startsWith('Thoracic')?.82:.90;o.scale.z*=.92;}}

  if(bodyStyle==='articulated'){
   const old=root.getObjectByName('Torso'),next=articulatedTorso(materials,{pose:bodyPose,massStyle,panelStyle});
   next.position.copy(old.position);next.quaternion.copy(old.quaternion);next.scale.copy(old.scale);
   old.parent.add(next);old.removeFromParent();old.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
   const cowls=[];root.traverse(o=>{if(o.name==='Scalloped shoulder shell')cowls.push(o);if(o.name==='Hip articulation')o.scale.multiplyScalar(.86);});
   for(const cowl of cowls){const replacement=scallopedShoulder(materials,{compact:jointStyle==='housed',structured:massStyle==='structured'});replacement.position.copy(cowl.position);replacement.quaternion.copy(cowl.quaternion);replacement.scale.copy(cowl.scale);cowl.parent.add(replacement);cowl.removeFromParent();cowl.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
  }

  if(bodyStyle==='legacy'&&bodyPose){const old=root.getObjectByName('Torso'),next=reshapeAssembly(old,p=>bodyPose.point(p));old.parent.add(next);old.removeFromParent();old.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}

  // Build the large reactor as a nested carrier rather than adding unrelated surface greebles.
  // The carrier lives in the existing reactor's local frame, so pose and mounting stay untouched.
  const reactor=root.getObjectByName('Main radial reactor');
  if(reactor){
   const carrier=group('Main reactor carrier');reactor.add(carrier);
   const outer=ring({name:'Reactor carrier outer ring',radius:.184,width:.010,segments:96,material:materials.dark});outer.position.z=-.018;carrier.add(outer);
   const inner=ring({name:'Reactor carrier inner ring',radius:.151,width:.006,segments:96,material:materials.edge});inner.position.z=-.008;carrier.add(inner);
   carrier.add(radialArray({name:'Reactor radial braces',count:6,radius:.105,phase:Math.PI/12,z:-.026,build:i=>link({name:'Reactor brace',from:[0,0,0],to:[.070,0,0],radius:.007,material:i%2?materials.edge:materials.dark,segments:12})}));
   carrier.add(radialArray({name:'Reactor carrier lugs',count:12,radius:.181,z:-.010,build:i=>box({name:'Reactor carrier lug',size:[.040,.022,.054],radius:.006,material:i%3===0?materials.shell:materials.edge})}));
  }

  // Rebuild the already socket-routed main loom with thinner, dimmer local materials. Averaging
  // the symmetric baseline bundle recovers its centerline, so endpoints remain on the same sockets.
  const oldLoop=root.getObjectByName('Reference power loop');
  if(oldLoop){
   const routes=oldLoop.children.map(o=>o.userData?.route?.points).filter(p=>Array.isArray(p)&&p.length>1);
   if(routes.length&&routes.every(p=>p.length===routes[0].length)){
    const center=routes[0].map((_,i)=>[0,1,2].map(axis=>routes.reduce((sum,p)=>sum+p[i][axis],0)/routes.length));
    const replacement=cableLoom({name:'Reference power loop',points:center,colors:['pink','white','lime','cyan'],radius:.0044,spacing:.0105,segments:96,emissiveScale:.48,opacity:.72},materials);
    const parent=oldLoop.parent;oldLoop.removeFromParent();oldLoop.traverse(o=>{if(o.isMesh)o.geometry.dispose();});parent.add(replacement);
   }
  }

  if(headStyle==='illustrated'){
   const mount=root.getObjectByName('HeadMount');
   for(const name of ['Prismatic bob','Portrait']){const o=mount.getObjectByName(name);o.removeFromParent();o.traverse(m=>{if(m.isMesh)m.geometry.dispose();});}
   mount.add(illustratedHead({hairMode},materials));
  }else{
  const old=root.getObjectByName('Prismatic bob'),parent=old.parent;old.removeFromParent();
  old.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
  parent.add(guidedBob({mode:hairMode,crownRoundness}));
  const face=parent.getObjectByName('Portrait'),reshaped=reshapeAssembly(face,portraitFields);face.removeFromParent();parent.add(reshaped);
  const ears=[];reshaped.traverse(o=>{if(o.name==='Ear attachment')ears.push(o);});for(const ear of ears){ear.removeFromParent();ear.geometry.dispose();}
  }
  if(girdleStyle==='connected'&&bodyStyle==='articulated'){
   const torso=root.getObjectByName('Torso');
   for(const name of ['Cervical column','Clavicular sweep 1','Clavicular sweep -1']){
    const old=torso.getObjectByName(name);if(old){old.removeFromParent();old.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
   }
   torso.add(shoulderGirdle(root,materials,{pose:bodyPose,massStyle}));
   for(const suffix of ['L','R']){
    const shoulder=root.getObjectByName('Shoulder.'+suffix),cowl=shoulder.getObjectByName('Scalloped shoulder shell'),port=shoulder.getObjectByName('Shoulder neon module');
    const replacement=girdleCowl({portCenter:port.position.toArray(),cowlZ:cowl.position.z},materials);
    replacement.position.copy(cowl.position);replacement.quaternion.copy(cowl.quaternion);replacement.scale.copy(cowl.scale);
    cowl.parent.add(replacement);cowl.removeFromParent();cowl.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
    if(shoulderStyle==='seated')seatShoulderModule(shoulder,materials,{direction:suffix==='L'?[-.45,.20,.87]:[-.40,.06,.91]});
   }
  }
  const replacing=[];root.traverse(o=>{if(['Thigh enclosing panels','Shin enclosing panels','Forearm wrapped armor','Upper arm wrapped armor'].includes(o.name))replacing.push(o);});
  for(const old of replacing){const parent=old.parent,name=old.name;old.removeFromParent();old.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
   const shin=name.startsWith('Shin'),fore=name.startsWith('Forearm'),upper=name.startsWith('Upper');
   const length=shin?.329:fore?.225:upper?.242:.428;
   const radii=shin?[[0,.048,.048],[.25,.065,.056],[.49,.048,.05],[.80,.028,.031],[1,.027,.03]]:fore?[[0,.035,.037],[.26,.047,.049],[.65,.035,.037],[1,.023,.025]]:upper?[[0,.040,.043],[.25,.045,.047],[.6,.037,.037],[1,.03,.033]]:[[0,.073,.08],[.22,.088,.081],[.52,.075,.073],[.79,.056,.06],[1,.045,.048]];
   const type=shin?'shin':fore?'forearm':upper?'upper':'thigh';
   if(limbStyle==='scalloped'){
    const remove=shin?['Tibia chassis','Shin neon inset','Shin longitudinal seam','Calf external piston','Surface-mounted details']:fore?['Forearm exposed core','Cyan forearm inlay','Forearm vent','Surface-mounted details']:upper?['Upper arm actuator','Triceps piston']:['Femur armature','Thigh panel seam','Thigh inset','Surface-mounted details'];
    for(const child of [...parent.children])if(remove.includes(child.name)){child.removeFromParent();child.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
    parent.add(scallopedLimb({type,side:parent.name.endsWith('L')?1:-1,socketClearance:jointStyle==='housed',massStyle,panelStyle},materials));
   }else parent.add(limbArmor({name:'Contoured '+name,length,radii,type},materials));
  }
  if(massStyle!=='profiled'&&limbStyle==='scalloped'){
   for(const side of [-1,1]){const shoulder=root.getObjectByName('Shoulder.'+(side>0?'L':'R'));shoulder.add(deltoidMantle({side,structured:massStyle==='structured'},materials));}
  }
  if(jointStyle==='housed'){
   for(const side of [-1,1]){const suffix=side>0?'L':'R';
    root.getObjectByName('Hip.'+suffix).add(jointSocketShell({name:'Iliac socket '+suffix,radius:.071,side},materials));
    root.getObjectByName('Elbow.'+suffix).add(jointSocketShell({name:'Elbow clevis '+suffix,radius:.037,side},materials));
   }
  }
  if(handStyle==='relaxed')for(const side of [-1,1]){
   const old=root.getObjectByName(side>0?'ServoHand.L':'ServoHand.R'),next=articulatedHand({side},materials);
   next.position.copy(old.position);next.quaternion.copy(old.quaternion);next.scale.copy(old.scale);
   old.parent.add(next);old.removeFromParent();old.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
  }
  const boots=[];root.traverse(o=>{if(o.name==='Boot.L'||o.name==='Boot.R')boots.push(o);});
  for(const old of boots){const boot=(footStyle==='bridged'?bridgedBoot:limbStyle==='scalloped'?articulatedBoot:sculptedBoot)({side:old.name.endsWith('L')?1:-1},materials);boot.position.copy(old.position);boot.quaternion.copy(old.quaternion);boot.scale.copy(old.scale);old.parent.add(boot);old.removeFromParent();old.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
 }
 return root;
}
