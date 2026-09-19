import * as THREE from 'three';
const vector=(p,name)=>{if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))throw new Error(`${name} must be three finite coordinates`);return new THREE.Vector3(...p);};
/** Analytic two-link position solve in one caller-chosen coordinate space.
 * Root and target stay fixed; pole and swivel (degrees) choose the bend plane.
 * Optional jointPlane is n dot joint = constant in that SAME coordinate space.
 * It intersects the bend circle; the pole/swivel selects the nearer branch.
 * Never stretches or clamps an unreachable target. No mesh or rig is mutated.
 */
export function twoLinkPose({root,target,lengths,pole,swivel=0,jointPlane=null}={}){
 const a=vector(root,'root'),c=vector(target,'target'),p=vector(pole,'pole');
 if(!Array.isArray(lengths)||lengths.length!==2||!lengths.every(x=>Number.isFinite(x)&&x>0))throw new Error('twoLinkPose needs two positive lengths');
 if(!Number.isFinite(swivel)||Math.abs(swivel)>360)throw new Error('swivel must be within +/-360 degrees');
 const [l0,l1]=lengths,axis=c.clone().sub(a),d=axis.length(),eps=1e-10*Math.max(l0,l1);
 if(d<=eps)throw new Error('coincident endpoints do not determine a bend axis');
 if(d>l0+l1+eps||d<Math.abs(l0-l1)-eps)throw new Error('unreachable two-link target; stretching is not allowed');
 axis.divideScalar(d);
 const along=(l0*l0-l1*l1+d*d)/(2*d),radius=Math.sqrt(Math.max(0,l0*l0-along*along));
 if(![d,along,radius].every(Number.isFinite))throw new Error('two-link arithmetic exceeded finite range');
 const bend=p.clone().sub(a);bend.addScaledVector(axis,-bend.dot(axis));
 if(radius>eps&&bend.length()<eps)throw new Error('pole lies on the chain axis');
 if(radius>eps)bend.normalize().applyAxisAngle(axis,THREE.MathUtils.degToRad(swivel));else bend.set(0,0,0);
 const center=a.clone().addScaledVector(axis,along);
 let planeInfo=null;
 if(jointPlane!==null){
  const n=vector(jointPlane.normal,'joint plane normal'),magnitude=n.length();
  if(!Number.isFinite(magnitude)||magnitude<1e-12||!Number.isFinite(jointPlane.constant))throw new Error('joint plane requires nonzero normal and finite constant');
  n.divideScalar(magnitude);const constant=jointPlane.constant/magnitude;
  // Intersect the bend circle (fixed bone lengths) with an authored plane.
  const inPlane=n.clone().addScaledVector(axis,-n.dot(axis)),extent=inPlane.length();
  const required=constant-n.dot(center),tolerance=1e-9*Math.max(1,l0+l1);
  if(extent<1e-12||radius<=eps){
   if(Math.abs(required)>tolerance)throw new Error('joint plane does not intersect the two-link bend circle');
  }else{
   const x=required/extent;
   if(Math.abs(x)>radius+tolerance)throw new Error('joint plane does not intersect the two-link bend circle');
   const e=inPlane.divideScalar(extent),perpendicular=new THREE.Vector3().crossVectors(axis,e);
   const other=Math.sqrt(Math.max(0,radius*radius-x*x));
   const candidate=e.clone().multiplyScalar(THREE.MathUtils.clamp(x,-radius,radius));
   candidate.addScaledVector(perpendicular,bend.dot(perpendicular)<0?-other:other);
   bend.copy(candidate).divideScalar(radius);
  }
  planeInfo={normal:n.toArray(),constant};
 }
 const joint=center.addScaledVector(bend,radius);
 const angle=joint.clone().sub(a).angleTo(c.clone().sub(joint));
 return {root:[...root],joint:joint.toArray(),target:[...target],lengths:[...lengths],bendDegrees:THREE.MathUtils.radToDeg(angle),swivel,...(planeInfo?{jointPlane:planeInfo}:{})};
}
