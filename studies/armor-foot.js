import {group,mesh} from '../src/lib/modeling.js';
import {contourVolume} from '../src/lib/contour-volume.js';
import {shapeProfile,thickenSurface} from '../src/lib/shape-rails.js';
import {surfaceContourGeometry} from '../src/lib/surface-contour.js';
import {solidifyGeometry} from '../src/lib/surface-thickness.js';
/** Simple toe/instep/heel volumes in meters about the foot bone's rest origin.
 * Retains the old sole-bottom datum, rather than changing the ankle or foot pose. */
export function roughArmorFoot(side,mats){
 const root=group(side+' shaped boot');
 const footprint=[[-.039,-.051],[-.055,-.036],[-.054,.062],[-.065,.165],[-.057,.214],[-.03,.237],[.025,.234],[.059,.212],[.064,.175],[.047,.058],[.042,-.031]];
 root.add(contourVolume({name:side+' profiled orange sole',outline:footprint,segments:36,layers:3,
  sections:[{height:-.0805,scale:[.93,.98]},{height:-.074,scale:[1,1]},{height:-.057,scale:[1,1]},{height:-.052,scale:[.94,.985]}],material:mats.orange}));
 const height=shapeProfile([[0,.036],[.22,.060],[.40,.026],[.64,-.018],[.87,-.025],[1,-.043]]);
 const width=shapeProfile([[0,.041],[.24,.047],[.5,.054],[.78,.061],[1,.021]]);
 const upper=(u,v)=>{const a=(u-.5)*Math.PI;return[-Math.sin(a)*width(v),-.048+(height(v)+.048)*Math.cos(a),-.037+v*.270];};
 root.add(thickenSurface(side+' boot flexible upper',upper,{segments:[12,16],thickness:.003,material:mats.dark}));
 const plates=[['toe',[[.06,.69],[.18,.58],[.43,.62],[.52,.56],[.71,.61],[.95,.71],[.90,.92],[.69,.99],[.27,.98],[.09,.89]]],
  ['instep',[[.06,.30],[.18,.10],[.36,.075],[.67,.09],[.94,.26],[.87,.44],[.72,.56],[.60,.43],[.40,.45],[.28,.55],[.13,.44]]]];
 for(const [label,outline]of plates){
  const front=surfaceContourGeometry(upper,{outline,offset:.004,rounding:.12,cornerSegments:2,refinement:2});
  const solid=solidifyGeometry(front,{thickness:.003,offset:-1});front.dispose();root.add(mesh(solid,{name:side+' '+label+' cover',material:mats.shell}));
 }
 root.userData.roughFoot={soleBottom:-.0805,scope:'contoured rough shell; not collision tested in arbitrary clips'};return root;
}
