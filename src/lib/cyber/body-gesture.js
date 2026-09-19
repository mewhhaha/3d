import * as THREE from 'three';
import {sectionPose} from '../section-pose.js';
import {segmentFrame} from '../reference-shot.js';
import {twoLinkPose} from '../two-link-pose.js';
const V=p=>new THREE.Vector3(...p);
export function torsoGesture(style='fixed'){
 if(!['fixed','counterpose','lookback','poised'].includes(style))throw new Error('Unknown body gesture');
 if(style==='lookback'||style==='poised')return sectionPose([
  {y:.991,offset:[-.012,0,.012],rotation:[0,-8,1],scale:[1,1,1]},
  {y:1.190,offset:[-.015,0,.070],rotation:[-4,-12,5],scale:[.88,1,1.1]},
  {y:1.465,offset:[.080,-.018,.005],rotation:[-5,-10,-7],scale:[.65,1,1.2]},
  {y:1.619},
 ]);
 return sectionPose(style==='fixed'?[{y:.991},{y:1.619}]:[
  {y:.991,offset:[0,0,.004],rotation:[0,-3,0]},
  {y:1.190,offset:[-.030,0,.036],rotation:[-2,-3,3]},
  {y:1.465,offset:[-.019,0,-.006],rotation:[-3,6,-4]},
  {y:1.619},
 ]);
}
/** Move proximal limb sockets with posed pelvis/rib frames, then solve whole
 * chains to the prior hand/ankle targets. No independent armor-only rotations.
 */
export function applyBodyGesture(guide,style='fixed'){
 if(style==='fixed')return guide;
 let pose=torsoGesture(style);const rest=structuredClone(guide.points);
 // Explicit look-back proportion hypothesis: retain .55m total arm reach but
 // give the upper link more of it. Historical poses keep their old lengths.
 const armLengths=['lookback','poised'].includes(style)?[.285,.265]:[.25,.30];
 const forward=V(rest.shoulderNear).sub(V(rest.shoulderFar)).cross(V(rest.chest).sub(V(rest.pelvis))).normalize();
 const frame=segmentFrame(rest.chest,rest.pelvis,{referenceLength:.474,width:.88,forward:forward.toArray()});
 const localToWorld=new THREE.Matrix4().compose(frame.position,frame.quaternion,frame.scale).multiply(new THREE.Matrix4().makeTranslation(0,-1.465,0));
 const worldToLocal=localToWorld.clone().invert();
 const mapped=(point,y)=>V(pose.point(V(point).applyMatrix4(worldToLocal).toArray(),y)).applyMatrix4(localToWorld).toArray();
 const pinnedNear=mapped(rest.shoulderNear,1.465);
 if(style==='poised'){
  // Reorient the SAME rib section that owns both sockets. Moving the far socket
  // alone across an unchanged rib cage would put both arms on one side.
  const y=1.465,near=V(mapped(rest.shoulderNear,y)).applyMatrix4(worldToLocal);
  const far=V(mapped(rest.shoulderFar,y)).applyMatrix4(worldToLocal);
  const target=V(mapped(rest.shoulderFar,y)).add(new THREE.Vector3(.006,-.022,.247)).applyMatrix4(worldToLocal);
  const oldAxis=far.clone().sub(near),newAxis=target.clone().sub(near);
  const swing=new THREE.Quaternion().setFromUnitVectors(oldAxis.clone().normalize(),newAxis.clone().normalize());
  const k=newAxis.length()/oldAxis.length();
  const correction=new THREE.Matrix4().makeTranslation(...near.toArray())
   .multiply(new THREE.Matrix4().compose(new THREE.Vector3(),swing,new THREE.Vector3(k,k,k)))
   .multiply(new THREE.Matrix4().makeTranslation(...near.clone().negate().toArray()));
  const fitted=correction.multiply(pose.transform(y)),position=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3();
  fitted.decompose(position,q,scale);
  const pivot=new THREE.Vector3(0,y,0),offset=pivot.clone().applyMatrix4(fitted).sub(pivot);
  const euler=new THREE.Euler().setFromQuaternion(q,'XYZ');
  pose=sectionPose(pose.stations.map(s=>s.y!==y?s:{y,offset:offset.toArray(),rotation:[euler.x,euler.y,euler.z].map(THREE.MathUtils.radToDeg),scale:scale.toArray()}));
 }

 for(const side of ['Near','Far'])for(const [start,mid,end,lengths,y] of [
  ['shoulder','elbow','wrist',armLengths,1.465],['hip','knee','ankle',[.43,.45],.991],
 ]){
  const root=style==='poised'&&start==='shoulder'&&side==='Near'?[...pinnedNear]:mapped(rest[start+side],y);
  const farCorrection=style==='poised'&&start==='shoulder'&&side==='Far';
  const pole=[...rest[mid+side]];
  // Guide-space metres, deliberately separate from the observational annotations.
  // The earlier far-shoulder depth placed its cowl behind the whole rib cage.
  // Rebuild the connecting girdle from this protracted socket, not a mesh offset.
  if(farCorrection)pole[2]+=.35;
  const solved=twoLinkPose({root,target:rest[end+side],pole,lengths,
   swivel:['lookback','poised'].includes(style)&&start==='shoulder'&&side==='Near'?30:0,
   ...(farCorrection?{jointPlane:{normal:[1,0,0],constant:-.20}}:{}),
  });
  guide.points[start+side]=root;guide.points[mid+side]=solved.joint;
 }
 guide.restBodyPoints=rest; // construction frame only; not observational annotation
 guide.points.chest=mapped(rest.chest,1.465);guide.points.pelvis=mapped(rest.pelvis,.991);
 guide.bodyGesture={style,stations:pose.stations,...(style==='poised'?{farSocketOffset:[.006,-.022,.247],farJointPlane:{normal:[1,0,0],constant:-.20},constraintSpace:'guide/world metres'}:{}),...(['lookback','poised'].includes(style)?{armLengths,proportionScope:'authored arm redistribution, fixed total reach; not measured anatomy'}:{})};return guide;
}
