import {group,mesh,material} from '../modeling.js';
import {shapeProfile,thickenSurface} from '../shape-rails.js';
import {surfaceContourGeometry} from '../surface-contour.js';
import {solidifyGeometry} from '../surface-thickness.js';
import {surfacePath,attachToSurface} from '../surface-frame.js';
import {radialPort,routedCable,link,bellows} from './mechanics.js';

/** Local Y-up torso support. Ribcage, waist and pelvic ring share a bowed centerline.
 * Radius/profile data are design hypotheses, not anatomy recovered from a single view.
 */
export function torsoSupport(){
 const rx=shapeProfile([[0,.093],[.13,.151],[.27,.142],[.42,.090],[.61,.105],[.80,.160],[.92,.174],[1,.100]]);
 const rz=shapeProfile([[0,.065],[.13,.091],[.27,.087],[.42,.060],[.61,.065],[.80,.079],[.92,.071],[1,.044]]);
 const spine=shapeProfile([[0,-.014],[.22,.003],[.48,-.002],[.78,.030],[1,.002]]);
 const sway=shapeProfile([[0,0],[.25,0],[.55,-.006],[.82,-.016],[1,-.009]]);
 return (u,v)=>{const a=(u-.5)*Math.PI*2;return[Math.sin(a)*rx(v)+sway(v),.935+v*.582,Math.cos(a)*rz(v)+spine(v)];};
}
/** One contour drives a ceramic plate and its darker backing; support drives ports too. */
export function contourArmor(name,support,outline,mats,{offset=.004,thickness=.004,refinement=3,rounding=.15}={}){
 const base=surfaceContourGeometry(support,{outline,refinement,rounding,offset});
 const shell=solidifyGeometry(base,{thickness,offset:-1,regionPrefix:'panel'});
 const root=group(name,[mesh(shell,{name:name+' / ceramic',material:mats.shell})]);
 base.dispose();
 // Thin dark backing is normal-offset, not a scaled duplicate crossing the support.
 const backing=surfaceContourGeometry(support,{outline,refinement,rounding,offset:offset-thickness-.0004});
 const substrate=solidifyGeometry(backing,{thickness:.0015,offset:-1});backing.dispose();
 root.add(mesh(substrate,{name:name+' / substrate',material:mats.dark}));
 root.userData.construction={method:'concave chart contour on shared body support',outline,offset,thickness};return root;
}
const mirror=outline=>outline.map(([u,v])=>[1-u,v]).reverse();
/** Replacement torso only; retains the original mount and joint locations. */
export function articulatedTorso(mats){
 const root=group('Torso'),support=torsoSupport();
 const chassis=material('#101f22',{roughness:.55,metalness:.35});chassis.name='Recessed articulated torso';
 root.add(thickenSurface('Contoured torso understructure',support,{thickness:.004,segments:[72,48],material:chassis}));
 root.add(bellows({name:'Cervical column',from:[0,1.490,-.011],to:[0,1.619,-.011],radius:.034,ribs:8},mats));
 // Scalloped pectoral / clavicular cover: a broad upper flange, inset shoulder notch,
 // and a descending side tab rather than a swollen oval sitting on the chest.
 const chest=[[.508,.977],[.589,.983],[.706,.931],[.735,.874],[.692,.839],[.683,.792],[.711,.752],[.691,.685],[.631,.679],[.606,.739],[.548,.751],[.519,.814]];
 const iliac=[[.509,.311],[.591,.359],[.721,.355],[.800,.289],[.789,.207],[.744,.174],[.716,.222],[.649,.249],[.575,.222],[.524,.252]];
 const apron=[[.511,.211],[.550,.235],[.624,.221],[.647,.160],[.608,.124],[.584,.058],[.529,.017],[.511,.052]];
 for(const side of [-1,1]){
  const chart=side>0?x=>x:mirror;
  root.add(contourArmor('Scalloped rib cover '+side,support,chart(chest),mats,{offset:.007,thickness:.0045}));
  root.add(contourArmor('Swept iliac rim '+side,support,chart(iliac),mats,{offset:.009,thickness:.005}));
  root.add(contourArmor('Split pelvic apron '+side,support,chart(apron),mats,{offset:.005,thickness:.004}));
  const uu=u=>side>0?u:1-u;
  // Emission is a subordinate insert; clear dark mechanical spaces stay visible.
  for(let i=0;i<4;i++){
   const v=.671-i*.060;
   const coords=[[uu(.536),v-.026],[uu(.582),v-.013],[uu(.632-i*.009),v+.012]];
   root.add(routedCable({name:'Thoracic lateral actuator',points:surfacePath(support,coords,{offset:.006}),radius:.005,segments:20,ends:false,material:mats.edge}));
   root.add(routedCable({name:'Thoracic emissive insert',points:surfacePath(support,coords.slice(1),{offset:.011}),radius:.0023,segments:12,ends:false,material:i%2?mats.pink:mats.orange}));
  }
  const slot=[[.596,.322],[.669,.325],[.689,.302],[.610,.293]];
  const plate=surfaceContourGeometry(support,{outline:chart(slot),refinement:2,rounding:.10,offset:.015});
  root.add(mesh(plate,{name:'Iliac enamel inset '+side,material:mats.orange}));
  const port=radialPort({name:'Waist actuator',radius:.025,color:'lime',detail:1},mats);
  root.add(attachToSurface(port,support,{u:uu(.738),v:.228,offset:.007}));
 }
 // A compact dark central spine breaks the old broad featureless belly without
 // filling the narrow waist with additional ivory sheets.
 for(let i=0;i<5;i++){
  const v=.655-i*.061;const p=surfacePath(support,[[.485,v],[.515,v]],{offset:.004});
  root.add(link({name:'Abdominal vertebral bridge',from:p[0],to:p[1],radius:.0045,material:mats.edge,segments:12}));
 }
 const port=radialPort({name:'Sternum emitter',radius:.016,color:'amber',detail:1},mats);
 root.add(attachToSurface(port,support,{u:.5,v:.925,offset:.006}));
 root.userData.construction={method:'shared ribcage-waist-pelvis support with independently authored scalloped shells',fixedMount:true};return root;
}

/** Concave shoulder cowl with lower actuator clearance; port is owned by its mount. */
export function scallopedShoulder(mats){
 const support=(u,v)=>[(u-.5)*.184,(v-.5)*.190,.026*(1-(2*u-1)**2)*Math.sin(Math.PI*v)];
 const outline=[[.04,.56],[.11,.85],[.31,.98],[.62,.96],[.86,.78],[.97,.56],[.87,.27],[.79,.09],[.64,.06],[.58,.27],[.44,.30],[.40,.15],[.22,.12],[.15,.32]];
 return contourArmor('Scalloped shoulder shell',support,outline,mats,{offset:.007,thickness:.0045,rounding:.16});
}
