import { limbArmor, sculptedBoot, contouredShield } from './contour-armor.js';
import { cyberMaterials } from './mechanics.js';
import { reshapeAssembly } from '../shape-deform.js';
import { portraitFields } from './head-form.js';
import { posedAndroid } from './reference-layout.js';
import { guidedBob } from './hair-design.js';
/** Preserve guide/camera and replace only named components. Baseline stays available. */
export function refinedAndroid({ stage='assembly', hairMode='cage', ...options }={}){
 const root=posedAndroid({stage,...options});
 if(stage==='assembly'){
  const materials=cyberMaterials({glow:.7});
  // Previous cylindrical under-structure outgrew the new tapered shells near joints.
  // Keep joint centers unchanged; only the unscored internal chassis is reduced.
  root.traverse(o=>{
   if(['Femur armature','Tibia chassis'].includes(o.name)){o.scale.x*=.55;o.scale.z*=.55;}
   if(['Forearm exposed core','Upper arm actuator'].includes(o.name)){o.scale.x*=.65;o.scale.z*=.65;}
  });
  const shields=[];root.traverse(o=>{if(['Scalloped shoulder shell','Pectoral ceramic','Clavicle plating'].includes(o.name))shields.push(o);});
  for(const old of shields){
   const shoulder=old.name==='Scalloped shoulder shell',clavicle=old.name==='Clavicle plating';
   const next=contouredShield({name:old.name,width:shoulder?.145:clavicle?.135:.135,height:shoulder?.154:clavicle?.050:.131,bulge:shoulder?.038:clavicle?.009:.030},materials);
   next.position.copy(old.position);next.quaternion.copy(old.quaternion);next.scale.copy(old.scale);
   if(clavicle)next.position.x+=(old.rotation.z?1:-1)*.070;
   old.parent.add(next);old.removeFromParent();old.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
  }

  const old=root.getObjectByName('Prismatic bob'),parent=old.parent;old.removeFromParent();
  old.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
  parent.add(guidedBob({mode:hairMode}));
  const face=parent.getObjectByName('Portrait'),reshaped=reshapeAssembly(face,portraitFields);face.removeFromParent();parent.add(reshaped);
  const ears=[];reshaped.traverse(o=>{if(o.name==='Ear attachment')ears.push(o);});for(const ear of ears){ear.removeFromParent();ear.geometry.dispose();}
  const replacing=[];root.traverse(o=>{if(['Thigh enclosing panels','Shin enclosing panels','Forearm wrapped armor','Upper arm wrapped armor'].includes(o.name))replacing.push(o);});
  for(const old of replacing){const parent=old.parent,name=old.name;old.removeFromParent();old.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
   const shin=name.startsWith('Shin'),fore=name.startsWith('Forearm'),upper=name.startsWith('Upper');
   const length=shin?.329:fore?.225:upper?.242:.428;
   const radii=shin?[[0,.048,.048],[.25,.065,.056],[.49,.048,.05],[.80,.028,.031],[1,.027,.03]]:fore?[[0,.035,.037],[.26,.047,.049],[.65,.035,.037],[1,.023,.025]]:upper?[[0,.040,.043],[.25,.045,.047],[.6,.037,.037],[1,.03,.033]]:[[0,.073,.08],[.22,.088,.081],[.52,.075,.073],[.79,.056,.06],[1,.045,.048]];
   parent.add(limbArmor({name:'Contoured '+name,length,radii,type:shin?'shin':fore?'forearm':upper?'upper':'thigh'},materials));
  }
  const boots=[];root.traverse(o=>{if(o.name==='Boot.L'||o.name==='Boot.R')boots.push(o);});
  for(const old of boots){const boot=sculptedBoot({side:old.name.endsWith('L')?1:-1},materials);boot.position.copy(old.position);boot.quaternion.copy(old.quaternion);boot.scale.copy(old.scale);old.parent.add(boot);old.removeFromParent();old.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
 }
 return root;
}
