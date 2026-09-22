import * as THREE from 'three';
import {defineModel,group,mesh,box,material} from '../src/lib/modeling.js';
import source from './imported-xbot.js';
import {coatPanel} from './armor-pigment.js';
import {flexibleWaist} from './armor-waist.js';
import {mountOnBone} from '../src/lib/bone-mount.js';
import {segmentFrame} from '../src/lib/reference-shot.js';
import {limbVolume,armorLeaf} from '../src/lib/cyber/contour-armor.js';
import {surfaceContourGeometry} from '../src/lib/surface-contour.js';
import {solidifyGeometry} from '../src/lib/surface-thickness.js';
import {radialProfileMaps} from '../src/lib/radial-profile-maps.js';
import {roughArmorFoot} from './armor-foot.js';
import {mountedPortrait} from './armor-head.js';
import {posedArmorTargets,projectedArmorSupport} from './armor-pose-fit.js';
import {armorLook} from './armor-look.js';
import {fittedLimbSupport} from './armor-support.js';
import {defineFaceRegions} from '../src/lib/face-regions.js';
import {assignFaceMaterials} from '../src/lib/material-regions.js';

// Rough garment construction data, not new pose targets or a replacement rig.
export function dressBlockout(scene,{textured=false,pack=true,fit=false,head=false,feet=false,flow=false,panelLines=false}={}) {
 const mats=armorLook(textured),bones=n=>scene.getObjectByName('mixamorig'+n);
 const P=n=>bones(n).getWorldPosition(new THREE.Vector3());scene.updateMatrixWorld(true);
 const mounts=[],optics=new Map(),fits=[];
 const sourceSkin=scene.getObjectByName('Beta_Surface');
 const mount=(part,bone,frame=new THREE.Matrix4())=>{const holder=mountOnBone(scene,bones(bone),part,{frame});mounts.push(holder);return holder;};
 // Keep the existing skin as visible construction, only changing its owned look.
 scene.traverse(o=>{if(o.isSkinnedMesh){o.material.color.set(o.name==='Beta_Joints'?'#131c20':'#29363a');o.material.roughness=.76;}});
 // Keep the faceless head light for readable blockout, using existing face-region
 // materials without rewriting any skin vertex, UV, weight or index.
 const headIndex=sourceSkin.skeleton.bones.indexOf(bones('Head')),g=sourceSkin.geometry;
 const chosen=[];
 for(let f=0;f<g.index.count/3;f++){
  let weight=0;for(let j=0;j<3;j++){const i=g.index.getX(f*3+j);for(let k=0;k<4;k++)if(g.attributes.skinIndex.array[i*4+k]===headIndex)weight+=g.attributes.skinWeight.array[i*4+k];}
  if(weight>1.5)chosen.push(f);
 }
 defineFaceRegions(g,{Head:chosen},{clone:false});const withHead=assignFaceMaterials(g,{Head:1},{defaultMaterial:0});g.dispose();sourceSkin.geometry=withHead;
 sourceSkin.material=[sourceSkin.material,material('#b3aca0',{roughness:.8})];
 if(head){
  mountedPortrait(scene,sourceSkin,chosen);
  const remove=new Set(chosen),kept=[];
  for(let f=0;f<withHead.index.count/3;f++)if(!remove.has(f))for(let j=0;j<3;j++)kept.push(withHead.index.getX(f*3+j));
  withHead.setIndex(kept);withHead.clearGroups();withHead.addGroup(0,kept.length,0);
  withHead.userData={headReplacement:{removedFaces:chosen.length,scope:'source head faces removed; previous face regions/material groups and high-low correspondence invalidated; old source remains in head:false variant'}};
 }
 function plate(name,outline,support,bone){
  const surface=surfaceContourGeometry(support,{outline,rounding:.10,refinement:2});
  const g=solidifyGeometry(surface,{thickness:.005,offset:-1});surface.dispose();
  const o=mesh(g,{name,material:mats.shell});mount(o,bone);return o;
 }
 if(flow)sourceSkin.parent.add(flexibleWaist(scene,sourceSkin,sourceSkin.material[0]));
 const targets=fit?posedArmorTargets(scene,sourceSkin,[bones('Spine2'),bones('Hips')]):null;
 const shape=[[.08,.35],[.13,.80],[.33,.99],[.70,.98],[.93,.78],[.98,.36],[.79,.08],[.57,.18],[.47,.06],[.28,.10]];
 // Broad central chest volume; a tapered gap leaves the black waist readable.
 const chest=P('Spine2');
 const chestBase=(u,v)=>[(u-.5)*(fit?.28:.30),chest.y-(fit?.025:.08)+v*(fit?.17:.22),.102+.060*(1-(2*u-1)**2)*Math.sin(Math.PI*v)];
 const chestSupport=fit?projectedArmorSupport(targets[0],chestBase,{outline:shape}):chestBase;
 plate('Chest carapace',shape,chestSupport,'Spine2');if(fit)fits.push(chestSupport.fit);
 const hip=P('Hips');
 for(const side of [-1,1]){
  const s=side>0?'Left':'Right';
  const base=(u,v)=>[side*((fit?.035:.05)+u*(fit?.095:.11)),hip.y+(fit?-.015:-.03)+(v-.5)*(fit?.095:.14),.065+.085*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)];
  const fitted=fit?projectedArmorSupport(targets[1],base,{outline:shape}):base;
  // Mirroring the chart keeps the outward normal, rather than inverting the right shell.
  plate(s+' iliac wing',shape,fit&&side<0?(u,v)=>fitted(1-u,v):fitted,'Hips');if(fit)fits.push(fitted.fit);
  // Each limb shares a support and an attachment frame; only the boundaries
  // and radii differ. Geometry resolution is intentionally modest.
  const specs=[
   ['Arm','ForeArm','Upper arm',.072,.058,.066,.052,.13,.86],
   ['ForeArm','Hand','Forearm',.069,.049,.069,.052,.13,.88],
   ['UpLeg','Leg','Thigh',.120,.077,.115,.078,.12,.83],
   ['Leg','Foot','Shin',.086,.051,.093,.054,.13,.90],
  ];
  for(const [from,to,label,rx0,rx1,rz0,rz1,start,end] of specs){
   const a=P(s+from),b=P(s+to),length=a.distanceTo(b),basis=segmentFrame(a.toArray(),b.toArray(),{referenceLength:length});
   const frame=new THREE.Matrix4().compose(basis.position,basis.quaternion,new THREE.Vector3(1,1,1));
   const base=limbVolume({length,radii:[[0,rx0,rz0],[.35,rx0*1.06,rz0],[1,rx1,rz1]]});
   const support=fittedLimbSupport(sourceSkin,bones(s+from),frame,base,{length});fits.push(support.fit);
   const parts=group(s+' '+label+' armor');
   const panelOutline=flow&&label==='Thigh'?[[.30,.72],[.34,.84],[.43,.85],[.48,.76],[.56,.73],[.63,.83],[.69,.82],[.73,.65],[.71,.51],[.67,.26],[.63,.12],[.56,.18],[.48,.10],[.35,.14],[.29,.38]]:[[.38,start],[.29,start+.10],[.28,.55],[.33,end-.06],[.44,end],[.57,end],[.69,end-.08],[.73,.54],[.70,start+.11],[.62,start],[.56,start+.045],[.44,start+.045]];
   const front=surfaceContourGeometry(support,{outline:panelOutline,rounding:.12,cornerSegments:2,refinement:2});
   const solid=solidifyGeometry(front,{thickness:.005,offset:-1});front.dispose();
   const frontPanel=mesh(solid,{name:s+' '+label+' front',material:mats.shell});
   parts.add(panelLines&&['Thigh','Shin'].includes(label)?coatPanel(frontPanel):frontPanel);
   // Rear sliver is separate; no rigid shell spans an elbow or knee.
   parts.add(armorLeaf(support,{name:s+' '+label+' rear',start:start+.04,end:end-.06,left:[[0,.025],[1,.06]],right:[[0,.18],[.5,.22],[1,.15]],segments:[4,8],thickness:.004,material:mats.shell}));
   mount(parts,s+from,frame);
  }
 }
 function optic(name,r,color,position,bone,direction=[0,0,1]){
  if(!optics.has(color)){
   const maps=radialProfileMaps({name:'Blockout '+color,size:128,stops:[[0,'#ffb42b',.9],[.18,'#ff8530',.8],[.25,'#fff3a5',.8],[.29,color,1],[.60,color,.85],[.64,'#eee9dc',0],[.69,color,.7],[.80,'#162e32',0],[1,'#142326',0]]});
   optics.set(color,material('#ffffff',{...maps,roughness:.4,emissive:'#ffffff',emissiveIntensity:.7}));
  }
  const part=group(name);
  const housing=new THREE.CylinderGeometry(r,r*.96,.021,32);housing.rotateX(Math.PI/2);
  part.add(mesh(housing,{name:name+' bezel',material:mats.edge}));
  part.add(mesh(new THREE.CircleGeometry(r*.92,32),{name:name+' mapped lens',position:[0,0,.012],material:optics.get(color)}));
  part.position.copy(position);part.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...direction).normalize());
  mount(part,bone);
 }
 for(const side of [-1,1]){
  const s=side>0?'Left':'Right',shoulder=P(s+'Arm');
  const shell=new THREE.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI*.78);shell.scale(.076,.077,.070);shell.translate(...shoulder.clone().add(new THREE.Vector3(side*.020,0,.008)).toArray());
  mount(mesh(shell,{name:s+' shoulder cap',material:mats.shell}),s+'Arm');
  optic(s+' shoulder signal',.044,side>0?'#ff42ba':'#6affb4',shoulder.clone().add(new THREE.Vector3(side*.045,.025,.064)),s+'Arm');
  optic(s+' knee signal',.037,'#ff6932',P(s+'Leg').add(new THREE.Vector3(0,0,.066)),s+'Leg');
  const ankle=P(s+'Foot');
  if(feet){const boot=roughArmorFoot(s,mats);boot.position.copy(ankle);mount(boot,s+'Foot');}else {
  const boot=box({name:s+' toe shell',size:[.136,.063,.29],radius:.022,segments:2,position:ankle.clone().add(new THREE.Vector3(0,-.024,.086)).toArray(),material:mats.shell});mount(boot,s+'Foot');
  mount(box({name:s+' orange sole',size:[.141,.021,.302],radius:.008,segments:1,position:ankle.clone().add(new THREE.Vector3(0,-.070,.086)).toArray(),material:mats.orange}),s+'Foot');
  }
 }
 if(pack){
  const packFrame=new THREE.Matrix4().makeTranslation(0,chest.y,-.205),back=group('Reactor blockout');
  back.add(box({name:'Backpack spine',size:[.18,.30,.12],radius:.025,segments:2,material:mats.dark}));mount(back,'Spine2',packFrame);
  optic('Backpack reactor',.147,'#ff42ba',new THREE.Vector3(.105,chest.y+.01,-.26),'Spine2',[1,0,-.25]);
  for(const [i,color]of ['#ff52b4','#b5ef59','#39d9df'].entries()){
   const x=.06+i*.045,route=[[x,chest.y-.10,-.25],[x+.11,chest.y-.34,-.34],[x+.16,chest.y-.52,-.31],[x+.23,chest.y-.36,-.27],[x+.10,chest.y-.03,-.24]];
   const curve=new THREE.CatmullRomCurve3(route.map(p=>new THREE.Vector3(...p)));
   mount(mesh(new THREE.TubeGeometry(curve,40,.006,6,false),{name:'Backpack cable '+i,material:material(color,{emissive:color,emissiveIntensity:.5,roughness:.45})}),'Spine2');
  }
 }
 targets?.forEach(g=>g.dispose());
 scene.userData.armorBlockout={mounts:mounts.map(m=>m.name),fits,pose:'unchanged upright clip',surface:textured?'generated color samples':'plain PBR',options:{fit,head,feet,flow,panelLines},scope:'rigid rough shells; selected-pose fit only, no collision guarantee'};
 return scene;
}
export default defineModel({id:'prism-armor-blockout',title:'Upright rig / coarse fitted costume',parameters:{panelLines:{type:'boolean',default:false},flow:{type:'boolean',default:false},feet:{type:'boolean',default:false},head:{type:'boolean',default:false},fit:{type:'boolean',default:false},armor:{type:'boolean',default:true},textured:{type:'boolean',default:true},pack:{type:'boolean',default:true}},build:p=>{
 const scene=source.build({form:'tailored'});if(p.armor)dressBlockout(scene,p);return scene;
}});
