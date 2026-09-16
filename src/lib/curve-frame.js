import * as THREE from 'three';

const finite3=(value,label)=>{
  if(!Array.isArray(value)||value.length!==3||!value.every(Number.isFinite))throw new Error(`${label} must contain three finite numbers`);
  return value;
};
const count=(value,label,min=1,max=2048)=>{
  if(!Number.isInteger(value)||value<min||value>max)throw new Error(`${label} must be an integer in ${min}..${max}`);
  return value;
};
function chooseNormal(tangent,up){
  if(up){
    const normal=new THREE.Vector3(...finite3(up,'curve frame up'));
    normal.addScaledVector(tangent,-normal.dot(tangent));
    if(normal.lengthSq()<1e-18)throw new Error('curve frame up must not be parallel to the first tangent');
    return normal.normalize();
  }
  const axes=[new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)];
  axes.sort((a,b)=>Math.abs(a.dot(tangent))-Math.abs(b.dot(tangent)));
  // Match Three.js' historical Frenet-frame seed direction for compatibility.
  return axes[0].addScaledVector(tangent,-axes[0].dot(tangent)).normalize().negate();
}
function tiltAt(tilt,t,index){
  const degrees=typeof tilt==='function'?tilt(t,index):tilt;
  if(!Number.isFinite(degrees))throw new Error('Curve tilt must be finite');
  return THREE.MathUtils.degToRad(degrees);
}
function validateCurve(curve){
  if(!curve||typeof curve.getPointAt!=='function'||typeof curve.getTangentAt!=='function')throw new Error('A Three.js curve is required');
  return curve;
}
/** Rotation-minimizing frames along an authored curve.
 * Local +X is the transported normal, +Y the binormal and +Z the curve tangent.
 * `up` seeds the first normal; `tilt` adds author-controlled roll in degrees after transport. */
export function transportedFrames(curve,{segments=64,closed=false,up,tilt=0}={}){
  validateCurve(curve);count(segments,'curve frame segments',2);
  if(typeof tilt!=='number'&&typeof tilt!=='function')throw new Error('Curve tilt must be a number or function');
  const tangents=[],normals=[],binormals=[],points=[];
  for(let i=0;i<=segments;i++){
    const t=i/segments,point=curve.getPointAt(t,new THREE.Vector3()),tangent=curve.getTangentAt(t,new THREE.Vector3());
    if(!point.toArray().every(Number.isFinite)||!tangent.toArray().every(Number.isFinite)||tangent.lengthSq()<1e-18)throw new Error('Curve frame sampled an invalid point or tangent');
    points.push(point);tangents.push(tangent.normalize());
  }
  if(closed){
    // Three.js tangent sampling clamps endpoint differences instead of wrapping them.
    // A closed authoring frame must share one endpoint position/tangent before seam roll is distributed.
    points[segments].copy(points[0]);tangents[segments].copy(tangents[0]);
  }
  normals[0]=chooseNormal(tangents[0],up);
  binormals[0]=new THREE.Vector3().crossVectors(tangents[0],normals[0]).normalize();
  const rotation=new THREE.Quaternion();
  for(let i=1;i<=segments;i++){
    rotation.setFromUnitVectors(tangents[i-1],tangents[i]);
    const normal=normals[i-1].clone().applyQuaternion(rotation);
    normal.addScaledVector(tangents[i],-normal.dot(tangents[i]));
    if(normal.lengthSq()<1e-18)throw new Error('Curve frame became degenerate');
    normals[i]=normal.normalize();
    binormals[i]=new THREE.Vector3().crossVectors(tangents[i],normals[i]).normalize();
  }
  if(closed){
    const cross=new THREE.Vector3().crossVectors(normals[segments],normals[0]);
    const correction=Math.atan2(tangents[0].dot(cross),THREE.MathUtils.clamp(normals[segments].dot(normals[0]),-1,1));
    for(let i=1;i<=segments;i++){
      normals[i].applyAxisAngle(tangents[i],correction*i/segments).normalize();
      binormals[i].crossVectors(tangents[i],normals[i]).normalize();
    }
  }
  const frames=[];
  for(let i=0;i<=segments;i++){
    const roll=tiltAt(tilt,i/segments,i);
    if(roll){
      normals[i].applyAxisAngle(tangents[i],roll).normalize();
      binormals[i].crossVectors(tangents[i],normals[i]).normalize();
    }
    const basis=new THREE.Matrix4().makeBasis(normals[i],binormals[i],tangents[i]);
    const quaternion=new THREE.Quaternion().setFromRotationMatrix(basis);
    frames.push({t:i/segments,origin:points[i],tangent:tangents[i],normal:normals[i],binormal:binormals[i],quaternion});
  }
  return frames;
}
/** Turn transported frames into complete attachment poses with local XYZ offsets in meters. */
export function curveTransforms(curve,{offset=[0,0,0],...options}={}){
  finite3(offset,'curve frame offset');
  return transportedFrames(curve,options).map(frame=>{
    const position=frame.origin.clone()
      .addScaledVector(frame.normal,offset[0])
      .addScaledVector(frame.binormal,offset[1])
      .addScaledVector(frame.tangent,offset[2]);
    const matrix=new THREE.Matrix4().compose(position,frame.quaternion,new THREE.Vector3(1,1,1));
    return {...frame,position,matrix};
  });
}
/** Sample an offset route using the same transported frame as swept sections and attachments. */
export function offsetCurvePoints(curve,{offset=[0,0],...options}={}){
  if(!Array.isArray(offset)||offset.length!==2||!offset.every(Number.isFinite))throw new Error('curve offset must contain two finite numbers');
  return transportedFrames(curve,options).map(frame=>frame.origin.clone()
    .addScaledVector(frame.normal,offset[0])
    .addScaledVector(frame.binormal,offset[1]).toArray());
}
/** Apply one sampled curve pose to an Object3D without adding hidden parenting. */
export function attachToCurve(object,pose){
  if(!object?.isObject3D||!pose?.position?.isVector3||!pose?.quaternion?.isQuaternion)throw new Error('attachToCurve requires an Object3D and curve pose');
  object.position.copy(pose.position);object.quaternion.copy(pose.quaternion);return object;
}
