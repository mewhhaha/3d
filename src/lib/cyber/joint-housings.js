import {group} from '../modeling.js';
import {contourArmor} from './torso-form.js';
/** Open spherical socket around a lateral hinge. This is a shell/cowl, not an
 * anatomical joint or a collision-safe bearing. The luminous hub stays separate.
 * Local X is the hinge axis; the open sector exposes its flexing inner structure.
 */
export function jointSocketShell({name='Joint socket shell',radius=.070,side=1}={},mats){
 if(!Number.isFinite(radius)||radius<=0||![-1,1].includes(side))throw new Error('Invalid socket radius/side');
 const support=(u,v)=>{
  const a=(-.18+1.72*(side>0?u:1-u))*Math.PI,polar=.61+.70*v;
  return [side*radius*Math.cos(polar),radius*Math.sin(polar)*Math.sin(a),radius*Math.sin(polar)*Math.cos(a)];
 };
 const outline=[[.02,.13],[.10,.02],[.38,.02],[.46,.20],[.55,.20],[.61,.02],[.91,.02],[.99,.15],[.96,.90],[.82,.97],[.54,.95],[.40,.81],[.21,.97],[.04,.89]];
 const root=group(name,[contourArmor(name+' cowl',support,outline,mats,{offset:radius*.055,thickness:radius*.06,rounding:.10,refinement:2})]);
 root.userData.construction={method:'open annular spherical contour, separate from hinge and emitter',radius,side};return root;
}
