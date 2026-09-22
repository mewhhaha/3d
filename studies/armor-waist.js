import * as THREE from 'three';
import {captureBonePose} from '../src/lib/bone-pose-state.js';
import {skinInPose} from '../src/lib/skin-in-pose.js';
import {thickenSurface,shapeProfile} from '../src/lib/shape-rails.js';

/** A continuous flexible connector between the existing rib and pelvic masses.
 * Constructed in upright first, with three explicitly weighted spine owners;
 * then inverse-skinned to the unchanged imported bind. No rig is re-posed here.
 */
export function flexibleWaist(scene,skin,material){
 const restore=captureBonePose(scene),mixer=new THREE.AnimationMixer(scene);
 let clip;scene.traverse(o=>{clip??=o.animations?.find(c=>c.name==='upright');});
 if(!clip)throw new Error('Missing upright waist construction pose');
 try{
  mixer.clipAction(clip).play();mixer.setTime(.5);scene.updateMatrixWorld(true);
  const bone=n=>scene.getObjectByName('mixamorig'+n),position=n=>bone(n).getWorldPosition(new THREE.Vector3());
  const low=position('Hips').add(new THREE.Vector3(0,-.020,0)),high=position('Spine2').add(new THREE.Vector3(0,-.025,0));
  const axis=high.clone().sub(low).normalize(),right=new THREE.Vector3(1,0,0).applyQuaternion(bone('Spine2').getWorldQuaternion(new THREE.Quaternion()));
  right.addScaledVector(axis,-right.dot(axis)).normalize();const forward=right.clone().cross(axis).normalize();
  const width=shapeProfile([[0,.129],[.20,.113],[.46,.097],[.75,.109],[1,.133]]);
  const depth=shapeProfile([[0,.090],[.25,.068],[.50,.062],[.75,.070],[1,.090]]);
  const support=(u,v)=>{const a=(u-.5)*2*Math.PI;return low.clone().lerp(high,v).addScaledVector(right,width(v)*Math.sin(a)).addScaledVector(forward,depth(v)*Math.cos(a)).toArray();};
  const outer=thickenSurface('Flexible waist',support,{segments:[32,18],thickness:.003,material});
  const delta=high.clone().sub(low),length2=delta.lengthSq();
  const weights=p=>{const t=THREE.MathUtils.clamp(p.clone().sub(low).dot(delta)/length2,0,1),s=THREE.MathUtils.smoothstep(t,0,1);
   return s<.5?[['mixamorigHips',1-2*s],['mixamorigSpine',2*s]]:[['mixamorigSpine',2-2*s],['mixamorigSpine2',2*s-1]];
  };
  try{
   const result=skinInPose(outer.geometry,material,skin.skeleton,weights,{name:'Flexible waist connector'});
   result.userData.waist={method:'upright-authored connector inverse skinned onto three spine owners',low:low.toArray(),high:high.toArray(),scope:'primary silhouette bridge, not simulated cloth'};
   return result;
  }finally{outer.geometry.dispose();}
 }finally{mixer.stopAllAction();mixer.uncacheRoot(scene);restore();}
}
