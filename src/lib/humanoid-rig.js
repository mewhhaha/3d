import * as THREE from 'three';
import {skeleton, clip} from './rigging.js';
import {twoLinkPose} from './two-link-pose.js';
const V = p => new THREE.Vector3(...p);
const degrees = a => new THREE.Quaternion().setFromEuler(new THREE.Euler(...a.map(THREE.MathUtils.degToRad), 'XYZ'));
const finite = (x, lo, hi, name) => {
  if (!Number.isFinite(x) || x < lo || x > hi) throw new RangeError(`${name} must be ${lo}..${hi}`);
  return x;
};

/** Two artistic proportion presets, NOT sex classification or an imported Mixamo rig.
 * All returned measurements are meters. The skeleton/layout is shared. */
export function humanoidProportions({height=1.72, build='slender', shoulderSpan, hipSpan, legLength, shinShare=.23/.48, shoulderHeight, ankleHeight}={}) {
  finite(height, .8, 2.5, 'height');
  if (!['slender','broad'].includes(build)) throw new Error('Unknown humanoid build');
  const h=height,legs=finite(legLength??h*.48,h*.40,h*.57,'legLength'),fraction=finite(shinShare,.42,.56,'shinShare');
  return Object.freeze({height:h, build,
    shoulderSpan:finite(shoulderSpan??h*(build==='slender'?.215:.255),h*.15,h*.32,'shoulderSpan'),
    hipSpan:finite(hipSpan??h*(build==='slender'?.114:.10),h*.07,h*.17,'hipSpan'),
    pelvisBreadth:h*(build==='slender'?.172:.16), ribBreadth:h*(build==='slender'?.167:.204),
    upperArm:h*.17, forearm:h*.15, hand:h*.09, thigh:legs*(1-fraction), shin:legs*fraction, ankleHeight:finite(ankleHeight??h*.06,h*.045,h*.10,'ankleHeight'),
    shoulderHeight:finite(shoulderHeight??h*.80,h*.76,h*.835,'shoulderHeight'),
  });
}

/** Conventional T-pose skeleton, absolute bind coordinates, Y up, +Z forward.
 * +X is the subject's left. Bone names aid interoperability, not verified retargeting.
 * Geometry, weights and pose are deliberately separate from these proportions. */
export function humanoidRig(proportions=humanoidProportions()) {
  const d=proportions;
  if(!d||!['height','shoulderSpan','hipSpan','upperArm','forearm','hand','thigh','shin','ankleHeight'].every(k=>Number.isFinite(d[k])&&d[k]>0))throw new Error('Invalid humanoid dimensions');
  const h=d.height,hipY=d.ankleHeight+d.thigh+d.shin;
  const spec=[
    {name:'Root',position:[0,0,0]},
    {name:'Hips',parent:'Root',position:[0,hipY,0]},
    {name:'Spine',parent:'Hips',position:[0,hipY+(h*.75-hipY)*(.06/.21),0]},
    {name:'Spine1',parent:'Spine',position:[0,hipY+(h*.75-hipY)*(.13/.21),0]},
    {name:'Spine2',parent:'Spine1',position:[0,h*.75,0]},
    {name:'Neck',parent:'Spine2',position:[0,h*.835,0]},
    {name:'Head',parent:'Neck',position:[0,h*.875,0]},
    {name:'HeadTop',parent:'Head',position:[0,h,0]},
  ];
  for(const [side,sign] of [['Left',1],['Right',-1]]) {
    const x=d.shoulderSpan/2,hy=d.shoulderHeight??h*.80,hx=d.hipSpan/2;
    spec.push(
      {name:side+'Shoulder',parent:'Spine2',position:[sign*h*.055,hy,0]},
      {name:side+'Arm',parent:side+'Shoulder',position:[sign*x,hy,0]},
      {name:side+'ForeArm',parent:side+'Arm',position:[sign*(x+d.upperArm),hy,0]},
      {name:side+'Hand',parent:side+'ForeArm',position:[sign*(x+d.upperArm+d.forearm),hy,0]},
      {name:side+'HandEnd',parent:side+'Hand',position:[sign*(x+d.upperArm+d.forearm+d.hand),hy,0]},
      {name:side+'UpLeg',parent:'Hips',position:[sign*hx,hipY,0]},
      {name:side+'Leg',parent:side+'UpLeg',position:[sign*hx,hipY-d.thigh,0]},
      {name:side+'Foot',parent:side+'Leg',position:[sign*hx,d.ankleHeight,0]},
      {name:side+'ToeBase',parent:side+'Foot',position:[sign*hx,h*.023,h*.105]},
      {name:side+'ToeEnd',parent:side+'ToeBase',position:[sign*hx,h*.020,h*.135]},
    );
  }
  const rig=skeleton(spec);
  rig.proportions=d;rig.spec=spec;
  return rig;
}

/** Pose semantic controls, not a list of baked world-space joint coordinates.
 * Reach targets are relative to stature. Ground targets stay world/model-space.
 * This is a blockout study, not contact-solved animation or an anatomical rig. */
export function humanoidPose(name='neutral') {
  if(!['neutral','contrapposto','lookback'].includes(name))throw new Error('Unknown humanoid pose');
  if(name==='neutral')return {hips:[0,0,0],chest:[0,0,0],head:[0,0,0],shift:[0,-.008,0],feet:[[-.058,.018],[.058,.018]],turn:0};
  if(name==='contrapposto')return {hips:[0,-8,-7],chest:[-5,14,10],head:[0,-7,-5],shift:[.030,-.025,0],feet:[[-.075,.025],[.065,-.012]],turn:-6};
  return {hips:[0,-48,-7],chest:[-7,-15,9],head:[9,55,-14],shift:[-.018,-.022,0],feet:[[-.078,.033],[.065,-.018]],turn:-38};
}

function reset(rig) {
  for(const s of rig.spec){const bone=rig.bones[s.name];bone.quaternion.identity();bone.scale.set(1,1,1);
    bone.position.copy(V(s.position));if(s.parent)bone.position.sub(V(rig.spec[rig.indices[s.parent]].position));}
  rig.root.updateMatrixWorld(true);
}
function world(rig,name){return rig.bones[name].getWorldPosition(new THREE.Vector3());}
function orientWorld(rig,name,rotation){
  const b=rig.bones[name],parent=b.parent?.getWorldQuaternion(new THREE.Quaternion())??new THREE.Quaternion();
  b.quaternion.copy(parent.invert().multiply(rotation));rig.root.updateMatrixWorld(true);
}
function aimBone(rig,from,to,target){
  const b=rig.bones[from],child=rig.bones[to];
  const direction=V(target).sub(world(rig,from)).normalize();
  const parentQ=b.parent.getWorldQuaternion(new THREE.Quaternion());
  direction.applyQuaternion(parentQ.invert());
  b.quaternion.setFromUnitVectors(child.position.clone().normalize(),direction);rig.root.updateMatrixWorld(true);
}

/** Apply a pose to a freshly owned rig. Repeated calls reset to bind first.
 * IK changes rotations, never link lengths or bind matrices. */
export function poseHumanoid(rig, pose=humanoidPose()) {
  if(!rig?.bones?.Hips||!rig?.proportions)throw new Error('Expected an owned humanoid rig');
  const h=rig.proportions.height,d=rig.proportions;
  rig.root.updateWorldMatrix(true,true);
  if(rig.root.parent&&!rig.root.parent.matrixWorld.equals(new THREE.Matrix4()))throw new Error('Solve humanoid poses in untransformed model space before scene placement');
  for(const key of ['hips','chest','head','shift'])if(!Array.isArray(pose[key])||pose[key].length!==3||!pose[key].every(Number.isFinite))throw new Error('Invalid pose '+key);
  if(!Number.isFinite(pose.turn)||!Array.isArray(pose.feet)||pose.feet.length!==2||pose.feet.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw new Error('Invalid ground targets/turn');
  if(pose.waist!==undefined&&(!Array.isArray(pose.waist)||pose.waist.length!==3||!pose.waist.every(Number.isFinite)))throw new Error('Invalid waist rotation');
  if(pose.headWorld!==undefined&&(!Array.isArray(pose.headWorld)||pose.headWorld.length!==3||!pose.headWorld.every(Number.isFinite)))throw new Error('Invalid model-space head orientation');
  for(const [side,values] of Object.entries(pose.targets??{})){
    if(!['Left','Right'].includes(side))throw new Error('Unknown reach side');
    for(const [key,p]of Object.entries(values)){
      if(!['wrist','ankle','elbowPole','kneePole'].includes(key)||!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))throw new Error('Invalid normalized reach '+key);
    }
  }
  const previous=rig.skeleton.bones.map(b=>({position:b.position.clone(),quaternion:b.quaternion.clone(),scale:b.scale.clone()}));
  try {
  reset(rig);
  rig.bones.Hips.position.addScaledVector(V(pose.shift),h);
  rig.bones.Hips.quaternion.copy(degrees(pose.hips));
  if(pose.waist)rig.bones.Spine.quaternion.copy(degrees(pose.waist));
  // Spread the chest counterturn across two spine joints.
  rig.bones.Spine1.quaternion.copy(degrees(pose.chest.map(x=>x*.45)));
  rig.bones.Spine2.quaternion.copy(degrees(pose.chest.map(x=>x*.55)));
  rig.bones.Neck.quaternion.copy(degrees(pose.head.map(x=>x*.35)));
  rig.bones.Head.quaternion.copy(degrees(pose.head.map(x=>x*.65)));
  rig.root.updateMatrixWorld(true);
  if(pose.headWorld){
    // Absolute model-space head direction, split between neck and head while
    // retaining connected translations; no independent head repositioning.
    const desired=degrees(pose.headWorld),neckQ=rig.bones.Neck.getWorldQuaternion(new THREE.Quaternion());
    orientWorld(rig,'Neck',neckQ.slerp(desired,.35));
    orientWorld(rig,'Head',desired);
  }
  const targets={};
  const turn=degrees([0,pose.turn,0]);
  for(const [index,side,sign] of [[0,'Right',-1],[1,'Left',1]]) {
    const controls=pose.targets?.[side]??{};
    const ankle=controls.ankle?V(controls.ankle).multiplyScalar(h):V([pose.feet[index][0]*h,d.ankleHeight,pose.feet[index][1]*h]).applyQuaternion(turn);
    const hip=world(rig,side+'UpLeg'),pole=controls.kneePole?V(controls.kneePole).multiplyScalar(h):hip.clone().add(V([0,-.2*h,.65*h]).applyQuaternion(turn));
    const leg=twoLinkPose({root:hip.toArray(),target:ankle.toArray(),lengths:[d.thigh,d.shin],pole:pole.toArray()});
    aimBone(rig,side+'UpLeg',side+'Leg',leg.joint);aimBone(rig,side+'Leg',side+'Foot',leg.target);
    orientWorld(rig,side+'Foot',degrees([0,pose.turn+sign*7,0]));
    // A gravity-aligned relaxed hang follows the shoulder without stretching.
    // No limb endpoint is inferred from a reference pixel or optical module.
    const shoulder=world(rig,side+'Arm');
    const wrist=controls.wrist?V(controls.wrist).multiplyScalar(h):shoulder.clone().add(V([sign*.028*h,-.310*h,.022*h]).applyQuaternion(turn));
    const elbowPole=controls.elbowPole?V(controls.elbowPole).multiplyScalar(h):shoulder.clone().add(V([sign*.20*h,-.1*h,-.30*h]).applyQuaternion(turn));
    const arm=twoLinkPose({root:shoulder.toArray(),target:wrist.toArray(),lengths:[d.upperArm,d.forearm],pole:elbowPole.toArray()});
    aimBone(rig,side+'Arm',side+'ForeArm',arm.joint);aimBone(rig,side+'ForeArm',side+'Hand',arm.target);
    targets[side]={ankle:ankle.toArray(),wrist:wrist.toArray(),leg,arm};
  }
  rig.skeleton.update();return targets;
  }catch(error){
    rig.skeleton.bones.forEach((b,i)=>{b.position.copy(previous[i].position);b.quaternion.copy(previous[i].quaternion);b.scale.copy(previous[i].scale);});
    rig.root.updateMatrixWorld(true);rig.skeleton.update();throw error;
  }
}

/** Build hold clips from solved transforms; exporting always starts in bind pose.
 * Explicit tracks for EVERY bone avoid state leaking between chosen poses. */
export function humanoidPoseClips(rig, poses = Object.fromEntries(['neutral','contrapposto','lookback'].map(name=>[name,humanoidPose(name)]))) {
  const entries=Object.entries(poses);
  if(!entries.length||entries.length>16||entries.some(([name])=>!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)))throw new Error('Expected 1..16 named humanoid poses');
  try {
  return entries.map(([name,pose])=>{
    poseHumanoid(rig,pose);
    const tracks=rig.skeleton.bones.flatMap(b=>[
      new THREE.QuaternionKeyframeTrack(b.name+'.quaternion',[0,1],[...b.quaternion.toArray(),...b.quaternion.toArray()]),
      new THREE.VectorKeyframeTrack(b.name+'.position',[0,1],[...b.position.toArray(),...b.position.toArray()]),
    ]);
    return clip(name,tracks);
  });
  }finally{reset(rig);rig.skeleton.update();}
}
