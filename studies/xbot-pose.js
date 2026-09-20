import {slideRootForBend} from '../src/lib/two-link-pose.js';
import * as THREE from 'three';
const V=p=>new THREE.Vector3(...p);
export const xbotNames=Object.fromEntries(['Hips','Spine','Spine1','Spine2','Neck','Head',...['Left','Right'].flatMap(s=>['Shoulder','Arm','ForeArm','Hand','UpLeg','Leg','Foot','ToeBase'].map(n=>s+n))].map(n=>[n,'mixamorig'+n]));
/** Authored confidence/weight-shift candidate on the imported skeleton, not a
 * copied animation or automatic recovery of the cyber illustration's pose. */
export function xbotStance(rig,{confident=true}={}){
 const feet=Object.fromEntries(['Left','Right'].map(s=>[s,rig.position(s+'Foot')]));
 const footAngles={Left:confident?-58:0,Right:confident?-73:0};
 if(confident){
  rig.rotateWorld('Hips',[0,-45,7]);
  rig.rotateWorld('Spine',[4,0,-18]);rig.rotateWorld('Spine1',[-5,-8,9]);rig.rotateWorld('Spine2',[-7,-12,12]);
  rig.translateWorld('Hips',[.015,-.035,0]);
  rig.orientWorld('Head',[-4,-25,18]);
  feet.Left=[.115,feet.Left[1],.055];feet.Right=[-.055,feet.Right[1],-.115];
 }else rig.translateWorld('Hips',[0,-.02,0]);
 const lengths=side=>[V(rig.position(side+'UpLeg')).distanceTo(V(rig.position(side+'Leg'))),V(rig.position(side+'Leg')).distanceTo(V(rig.position(side+'Foot')))];
 if(confident){
  const slide=slideRootForBend({root:rig.position('LeftUpLeg'),target:feet.Left,lengths:lengths('Left'),bendDegrees:10,maxSlide:.15});
  rig.translateWorld('Hips',slide.offset);
 }
 const result={};
 for(const [side,sign]of [['Left',1],['Right',-1]]){
  const hip=rig.position(side+'UpLeg');
  const kneePole=V(hip).add(new THREE.Vector3(confident?-.45:0,-.3,.6)).toArray();
  const leg=rig.solve({root:side+'UpLeg',joint:side+'Leg',tip:side+'Foot',target:feet[side],pole:kneePole});
  rig.orientWorld(side+'Foot',[0,footAngles[side],0]);
  const shoulder=V(rig.position(side+'Arm'));
  const wrist=confident?(side==='Left'?[.07,.94,.20]:[-.16,.92,-.04]):shoulder.clone().add(new THREE.Vector3(sign*.04,-.55,.02)).toArray();
  const pole=shoulder.clone().add(new THREE.Vector3(sign*.25,-.1,-.45)).toArray();
  const arm=rig.solve({root:side+'Arm',joint:side+'ForeArm',tip:side+'Hand',target:wrist,pole});
  rig.twist(side+'ForeArm',side+'Hand',sign*55);
  for(const finger of ['Index','Middle','Ring','Pinky'])for(const [i,angle]of [[1,10],[2,22],[3,15]])rig.rotateLocal('mixamorig'+side+'Hand'+finger+i,[0,0,-sign*angle]);
  result[side]={arm,leg};
 }
 return result;
}
