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


/** Independent pin constraints make shoulder and torso acting edits possible
 * without hand/foot sliding. The previous confident pose stays available. */
export function xbotPoised(rig,{hipShift=[-.055,0,-.008],chest=[-4,-14,10],pelvis=[0,-4,-3],head=[2,-26,24],shoulders=[-5,4]}={}){
 xbotStance(rig);
 const pins=[];
 for(const [side,sign]of [['Left',1],['Right',-1]]){
  pins.push({root:side+'UpLeg',joint:side+'Leg',tip:side+'Foot',pole:V(rig.position(side+'UpLeg')).add(new THREE.Vector3(-.45,-.3,.6)).toArray()});
  pins.push({root:side+'Arm',joint:side+'ForeArm',tip:side+'Hand',pole:V(rig.position(side+'Arm')).add(new THREE.Vector3(sign*.25,-.1,-.45)).toArray()});
 }
 return rig.withPins(pins,r=>{
  r.rotateWorld('Hips',pelvis);r.translateWorld('Hips',hipShift);
  r.rotateWorld('Spine',chest.map(x=>x*.25));
  r.rotateWorld('Spine1',chest.map(x=>x*.35));
  r.rotateWorld('Spine2',chest.map(x=>x*.40));
  r.rotateWorld('LeftShoulder',[0,0,shoulders[0]]);
  r.rotateWorld('RightShoulder',[0,0,shoulders[1]]);
  r.orientWorld('Head',head);
 });
}

/** Deliberate far-hand placement for the longer-legged form, rather than keeping
 * a stock wrist target inside the new thigh. Feet and near hand stay fixed. */
export function xbotSilhouette(rig,{wrist=[-.21,.90,-.005],shoulderRoll=-4}={}){
 xbotPoised(rig);
 const hand=rig.orientation('RightHand').normalize();
 rig.rotateWorld('RightShoulder',[0,0,shoulderRoll]);
 const shoulder=V(rig.position('RightArm'));
 const solved=rig.solve({root:'RightArm',joint:'RightForeArm',tip:'RightHand',target:wrist,
  pole:shoulder.clone().add(new THREE.Vector3(-.28,-.1,-.32)).toArray()});
 const angles=new THREE.Euler().setFromQuaternion(hand,'XYZ');
 rig.orientWorld('RightHand',[angles.x,angles.y,angles.z].map(THREE.MathUtils.radToDeg));
 return solved;
}

/** User-directed correction: standing, not a spiralling look-back. The body has
 * one heading; only the lumbar pitch/roll displaces the pelvis from the ribcage.
 * Arm targets are regenerated from their own shoulders, not held at the old
 * twisted pose's world targets. Run inside hold() from rest. */
export function xbotUpright(rig,{heading=-30,lumbarPitch=-8,lumbarRoll=-14,hipShift=[-.035,-.02,.025],headPitch=20,headRoll=12}={}){
 const feet=Object.fromEntries(['Left','Right'].map(s=>[s,rig.position(s+'Foot')]));
 const lengths=(a,b,c)=>[V(rig.position(a)).distanceTo(V(rig.position(b))),V(rig.position(b)).distanceTo(V(rig.position(c)))];
 const yaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(heading));
 const forward=new THREE.Vector3(0,0,1).applyQuaternion(yaw),right=new THREE.Vector3(1,0,0).applyQuaternion(yaw);
 rig.orientWorld('Hips',[0,heading,5]);rig.translateWorld('Hips',hipShift);
 rig.orientWorld('Spine',[lumbarPitch,heading,lumbarRoll]);
 rig.orientWorld('Spine1',[lumbarPitch*.5,heading,lumbarRoll*.8]);
 rig.orientWorld('Spine2',[0,heading,0]);
 rig.orientWorld('Neck',[headPitch*.35,heading,headRoll*.35]);
 rig.orientWorld('Head',[headPitch,heading+12,headRoll]);
 feet.Left=[.115,feet.Left[1],.055];feet.Right=[-.055,feet.Right[1],-.115];
 const slide=slideRootForBend({root:rig.position('LeftUpLeg'),target:feet.Left,lengths:lengths('LeftUpLeg','LeftLeg','LeftFoot'),bendDegrees:10,maxSlide:.15});
 rig.translateWorld('Hips',slide.offset);
 const result={};
 for(const [side,sign] of [['Left',1],['Right',-1]]){
  const kneePole=V(rig.position(side+'UpLeg')).addScaledVector(forward,.6).add(new THREE.Vector3(0,-.3,0)).toArray();
  const leg=rig.solve({root:side+'UpLeg',joint:side+'Leg',tip:side+'Foot',target:feet[side],pole:kneePole});
  rig.orientWorld(side+'Foot',[0,heading+sign*7,0]);
  const shoulder=V(rig.position(side+'Arm')),reach=lengths(side+'Arm',side+'ForeArm',side+'Hand').reduce((a,b)=>a+b);
  const wrist=shoulder.clone().add(new THREE.Vector3(0,-reach*.975,0)).addScaledVector(right,sign*.050).addScaledVector(forward,.060);
  const pole=shoulder.clone().addScaledVector(forward,-.4).addScaledVector(right,sign*.10).add(new THREE.Vector3(0,-.25,0));
  const arm=rig.solve({root:side+'Arm',joint:side+'ForeArm',tip:side+'Hand',target:wrist.toArray(),pole:pole.toArray()});
  rig.twist(side+'ForeArm',side+'Hand',sign*55);
  for(const finger of ['Index','Middle','Ring','Pinky'])for(const [i,angle]of [[1,10],[2,22],[3,15]])rig.rotateLocal('mixamorig'+side+'Hand'+finger+i,[0,0,-sign*angle]);
  result[side]={arm,leg};
 }
 return result;
}
