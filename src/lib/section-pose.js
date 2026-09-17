import * as THREE from 'three';
const xyz=(p,label)=>{if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))throw new Error(`${label} needs three finite coordinates`);return [...p];};
/** Build-time cross-section poses in one Y-up authoring space (metres/degrees).
 * Translation and quaternion orientation are interpolated, not transform matrices.
 * A section rotates around [0, y, 0]. Outside the range, the end transform is rigid.
 * Sampling the same field for support points and sockets keeps them coherent.
 */
export function sectionPose(stations){
 if(!Array.isArray(stations)||stations.length<2||stations.length>32)throw new Error('sectionPose needs 2..32 ordered stations');
 const data=stations.map((s,i)=>{
  if(!s||!Number.isFinite(s.y)||(i&&s.y<=stations[i-1].y))throw new Error('station y must increase strictly');
  const offset=xyz(s.offset??[0,0,0],'offset'),rotation=xyz(s.rotation??[0,0,0],'rotation');
  if(rotation.some(x=>Math.abs(x)>180))throw new Error('section rotations must be within +/-180 degrees');
  return Object.freeze({y:s.y,offset:Object.freeze(offset),rotation:Object.freeze(rotation)});
 });
 const quats=data.map(s=>new THREE.Quaternion().setFromEuler(new THREE.Euler(...s.rotation.map(THREE.MathUtils.degToRad),'XYZ')));
 function frame(y){
  if(!Number.isFinite(y))throw new Error('section coordinate must be finite');
  const c=THREE.MathUtils.clamp(y,data[0].y,data.at(-1).y);let i=0;
  while(i<data.length-2&&c>data[i+1].y)i++;
  const a=data[i],b=data[i+1],t=(c-a.y)/(b.y-a.y),w=t*t*(3-2*t);
  const q=quats[i].clone().slerp(quats[i+1],w),offset=new THREE.Vector3(...a.offset).lerp(new THREE.Vector3(...b.offset),w);
  const pivot=new THREE.Vector3(0,c,0),translation=pivot.clone().add(offset).sub(pivot.clone().applyQuaternion(q));
  return {position:translation,quaternion:q};
 }
 return Object.freeze({stations:Object.freeze(data),
  transform(y){const f=frame(y);return new THREE.Matrix4().compose(f.position,f.quaternion,new THREE.Vector3(1,1,1));},
  point(p,sectionY){const v=new THREE.Vector3(...xyz(p,'point')),f=frame(sectionY??p[1]);return v.applyQuaternion(f.quaternion).add(f.position).toArray();},
 });
}
