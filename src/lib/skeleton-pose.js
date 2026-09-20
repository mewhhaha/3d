import * as THREE from 'three';
import {twoLinkPose} from './two-link-pose.js';
const V=p=>new THREE.Vector3(...p);
const vector=(p,label)=>{if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))throw new Error(label+' must be a finite 3-vector');return V(p);};
const rotation=p=>new THREE.Quaternion().setFromEuler(new THREE.Euler(...vector(p,'rotation').toArray().map(THREE.MathUtils.degToRad),'XYZ'));

/** Controls on an EXISTING owned skeleton. No rebinding, renaming or copied skin.
 * Capture in rest pose. Targets/directions are world-space meters, including
 * parent scale. Local rotation deltas use the imported bone's authored axes.
 * A hold clip starts from captured rest, then restores the caller's prior pose.
 */
export function skeletonPose(root,{names={}}={}){
 if(!root?.isObject3D)throw new Error('Expected an owned Object3D skeleton root');
 root.updateWorldMatrix(true,true);
 const bones=[],byName=new Map(),skins=new Set();
 root.traverse(n=>{if(n.isSkinnedMesh)skins.add(n.skeleton);if(n.isBone){if(!n.name||THREE.PropertyBinding.sanitizeNodeName(n.name)!==n.name||byName.has(n.name))throw new Error('Bones need unique track-safe names');bones.push(n);byName.set(n.name,n);}});
 if(!bones.length)throw new Error('No bones in pose root');
 const bone=name=>{const b=byName.get(names[name]??name);if(!b)throw new Error('Unknown pose bone '+name);return b;};
 for(const name of Object.keys(names))bone(name);
 const snapshot=()=>bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
 const sync=()=>{root.updateWorldMatrix(true,true);skins.forEach(s=>s.update());};
 const restore=state=>{bones.forEach((b,i)=>{b.position.copy(state[i].p);b.quaternion.copy(state[i].q);b.scale.copy(state[i].s);});sync();};
 const rest=snapshot();
 const position=name=>bone(name).getWorldPosition(new THREE.Vector3()).toArray();
 const orientation=name=>bone(name).getWorldQuaternion(new THREE.Quaternion());
 const setWorldQuaternion=(b,q)=>{
  const parent=b.parent;if(!parent){b.quaternion.copy(q).normalize();sync();return;}parent.updateWorldMatrix(true,false);
  const scale=parent.getWorldScale(new THREE.Vector3()),max=Math.max(...scale.toArray());
  if(!(max>0)||scale.toArray().some(x=>x<=0||Math.abs(x-max)>max*1e-5))throw new Error('World pose requires positive uniform ancestor scale');
  b.quaternion.copy(parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q).normalize());sync();
 };
 const aim=(from,to,target)=>{
  const b=bone(from),origin=V(position(from));
  const current=V(position(to)).sub(origin),desired=vector(target,'target').sub(origin);
  if(current.length()<1e-10||desired.length()<1e-10)throw new Error('Cannot aim a zero-length direction');
  const delta=new THREE.Quaternion().setFromUnitVectors(current.normalize(),desired.normalize());
  setWorldQuaternion(b,delta.multiply(orientation(from)));
 };
 const api={
  names:bones.map(b=>b.name),position,orientation,
  reset(){restore(rest);return api;},
  rotateLocal(name,angles){bone(name).quaternion.multiply(rotation(angles)).normalize();sync();return api;},
  rotateWorld(name,angles){setWorldQuaternion(bone(name),rotation(angles).multiply(orientation(name)));return api;},
  twist(from,to,angle){
   if(!Number.isFinite(angle))throw new Error('Twist angle must be finite');
   const axis=V(position(to)).sub(V(position(from)));if(axis.length()<1e-10)throw new Error('Cannot twist a zero-length axis');
   const delta=new THREE.Quaternion().setFromAxisAngle(axis.normalize(),THREE.MathUtils.degToRad(angle));
   setWorldQuaternion(bone(from),delta.multiply(orientation(from)));return api;
  },
  orientWorld(name,angles){setWorldQuaternion(bone(name),rotation(angles));return api;},
  translateWorld(name,offset){const b=bone(name),p=V(position(name)).add(vector(offset,'offset'));b.position.copy(b.parent?b.parent.worldToLocal(p):p);sync();return api;},
  solve({root:from,joint,tip,target,pole,swivel=0}){
   if(bone(joint).parent!==bone(from)||bone(tip).parent!==bone(joint))throw new Error('Expected a directly connected two-link chain');
   const before=snapshot();try{
    const a=position(from),b=position(joint),c=position(tip);
    const lengths=[V(a).distanceTo(V(b)),V(b).distanceTo(V(c))];
    const solved=twoLinkPose({root:a,target,lengths,pole,swivel});
    aim(from,joint,solved.joint);aim(joint,tip,solved.target);return solved;
   }catch(error){restore(before);throw error;}
  },
  hold(name,author){
   if(typeof name!=='string'||!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)||typeof author!=='function')throw new Error('Invalid pose clip');
   const previous=snapshot();try{
    restore(rest);author(api);
    const tracks=bones.flatMap(b=>[
     new THREE.QuaternionKeyframeTrack(b.name+'.quaternion',[0,1],[...b.quaternion.toArray(),...b.quaternion.toArray()]),
     new THREE.VectorKeyframeTrack(b.name+'.position',[0,1],[...b.position.toArray(),...b.position.toArray()]),
     new THREE.VectorKeyframeTrack(b.name+'.scale',[0,1],[...b.scale.toArray(),...b.scale.toArray()]),
    ]);
    const clip=new THREE.AnimationClip(name,1,tracks);if(!clip.validate())throw new Error('Invalid solved clip');return clip;
   }finally{restore(previous);}
  },
 };
 return api;
}
