import * as THREE from 'three';
const vector=(p,name)=>{if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))throw new Error(`${name} must be three finite coordinates`);return new THREE.Vector3(...p);};
/** Analytic two-link position solve in one caller-chosen coordinate space.
 * Root and target stay fixed; pole and swivel (degrees) choose the bend plane.
 * Never stretches or clamps an unreachable target. No mesh or rig is mutated.
 */
export function twoLinkPose({root,target,lengths,pole,swivel=0}={}){
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
 const joint=a.clone().addScaledVector(axis,along).addScaledVector(bend,radius);
 const angle=joint.clone().sub(a).angleTo(c.clone().sub(joint));
 return {root:[...root],joint:joint.toArray(),target:[...target],lengths:[...lengths],bendDegrees:THREE.MathUtils.radToDeg(angle),swivel};
}
