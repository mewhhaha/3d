import {group,mesh,material} from '../modeling.js';
import {shapeProfile,thickenSurface} from '../shape-rails.js';
import {contourVolume} from '../contour-volume.js';
import {surfaceContourGeometry} from '../surface-contour.js';
import {solidifyGeometry} from '../surface-thickness.js';
import {contourArmor} from './torso-form.js';
import {archedFootSurface} from './contour-armor.js';
import {radialPort,orient,bellows,routedCable} from './mechanics.js';

const reverse=loop=>loop.map(([u,v])=>[1-u,v]).reverse();
const toe=.166; // flex toe stays inside the rounded outsole perimeter
/** Open heel/instep bridge, low toe wedge and apertured sole carrier.
 * Planted -0.0435 m bottom datum and ankle-owner frames remain unchanged.
 * This is a mechanical foot interpretation, not a shoe last or an anatomical asset.
 */
export function bridgedBoot({side=1}={},mats){
 if(![-1,1].includes(side))throw new Error('bridgedBoot: side must be -1 or 1');
 const root=group(side>0?'Boot.L':'Boot.R');
 const footprint=[[-.034,-.054],[-.043,-.040],[-.043,.003],[-.040,.040],[-.050,.093],[-.055,.132],[-.046,.153],[-.024,.172],[.008,.175],[.039,.156],[.052,.130],[.051,.085],[.034,.045],[.033,.005],[.036,-.039]].map(([x,z])=>[x*side,z]);
 const sole=material('#e75620',{roughness:.47,metalness:.10});sole.name='Warm mechanical outsole';
 root.add(contourVolume({name:'Planted split outsole base',outline:footprint,sections:[{height:-.0435,scale:[.95,.99]},{height:-.0385,scale:[1,1]},{height:-.032,scale:[.97,.995]}],layers:4,material:sole}));
 root.add(contourVolume({name:'Inset flexible footbed',outline:footprint,sections:[{height:-.033,scale:[.86,.92]},{height:-.023,scale:[.86,.92]}],layers:2,material:mats.dark}));
 const width=shapeProfile([[0,.035],[.15,.042],[.40,.038],[.67,.052],[.82,.053],[1,.010]]);
 const wallHeight=shapeProfile([[0,.027],[.10,.037],[.29,.017],[.48,.023],[.66,.029],[.84,.021],[1,.019]]);
 for(const flank of [-1,1]){
  // UV u goes heel -> toe. Reverse on +X side to retain outward winding.
  const raw=(u,v)=>[flank*(width(u)+.002*Math.sin(Math.PI*v)), -.038+wallHeight(u)*v,-.054+.229*u];
  const support=flank>0?(u,v)=>raw(1-u,v):raw, chart=flank>0?reverse:x=>x;
  const border=[[.018,.02],[.982,.02],[.98,.62],[.88,.90],[.74,.91],[.62,.68],[.49,.98],[.38,.90],[.28,.65],[.14,.97],[.03,.92]];
  const holes=[[[.36,.23],[.41,.55],[.46,.59],[.49,.43],[.45,.20]],[[.69,.18],[.72,.46],[.80,.52],[.83,.28],[.78,.16]]].map(chart);
  const sheet=surfaceContourGeometry(support,{outline:chart(border),holes,rounding:.15,refinement:2});
  const shell=solidifyGeometry(sheet,{thickness:.004,offset:-1,regionPrefix:'carrier'});sheet.dispose();
  root.add(mesh(shell,{name:'Apertured sole carrier '+flank,material:sole}));
 }
 const base=archedFootSurface({heel:-.054,toe,base:-.021,
  height:[[0,.064],[.19,.105],[.34,.080],[.53,.052],[.73,.037],[.89,.024],[1,.005]],
  width:[[0,.033],[.22,.039],[.42,.042],[.67,.053],[.84,.048],[1,.021]],
  center:[[0,0],[.25,-side*.007],[.54,-side*.004],[.82,-side*.002],[1,0]]});
 // Complete underlying support is dark and structural. Apertured orange carriers
 // sit outside it, with an actual empty space at the medial/outer arch.
 root.add(thickenSurface('Foot bridge flex core',base,{thickness:.002,segments:[24,32],material:mats.dark}));
 // Close the toe/heel cross-sections; a roof alone otherwise exposes a tunnel
 // below the toe cap in front/side inspection. These remain separately owned.
 for(const end of [0,1]){
  const cap=(u,v)=>{const p=base(end?1-u:u,end);return[p[0],-.0335+v*(p[1]+.0335),p[2]];};
  root.add(thickenSurface(end?'Closed flex toe':'Closed flex heel',cap,{thickness:.002,segments:[24,4],material:mats.dark}));
 }
 const plateChart=side>0?x=>x:reverse;
 const toeCover=[[.03,.67],[.13,.57],[.28,.61],[.39,.70],[.52,.68],[.60,.60],[.83,.65],[.97,.78],[.94,.95],[.70,.99],[.32,.98],[.11,.91]];
 const bridge=[[.08,.22],[.20,.08],[.39,.06],[.61,.09],[.87,.23],[.82,.40],[.70,.44],[.65,.55],[.51,.51],[.47,.40],[.34,.37],[.26,.48],[.16,.43]];
 root.add(contourArmor('Low split toe shell',base,plateChart(toeCover),mats,{offset:.0035,thickness:.0035,refinement:2,rounding:.11}));
 root.add(contourArmor('Diagonal instep bridge',base,plateChart(bridge),mats,{offset:.004,thickness:.004,refinement:2,rounding:.13}));
 for(const flank of [-1,1]){
  const raw=(u,v)=>[flank*(.035+.010*Math.sin(Math.PI*v)), -.012+v*.096,-.050+u*.112];
  const support=flank>0?(u,v)=>raw(1-u,v):raw, chart=flank>0?reverse:x=>x;
  const guard=[[.03,.09],[.02,.36],[.13,.54],[.16,.91],[.35,.97],[.53,.87],[.60,.65],[.92,.28],[.91,.10],[.77,.055],[.62,.20],[.45,.16],[.35,.045]];
  const holes=[[[.16,.24],[.17,.39],[.29,.43],[.33,.33],[.29,.22]]].map(chart);
  root.add(contourArmor('Open heel buttress '+flank,support,chart(guard),mats,{holes,offset:.004,thickness:.004,rounding:.12,refinement:2}));
  root.add(orient(radialPort({name:'Boot heel bearing',radius:.019,color:'amber',detail:1},mats),[flank*.049,.036,-.024],[flank,0,0]));
  root.add(routedCable({name:'Heel actuator lead',points:[[flank*.026,.058,-.038],[flank*.036,.028,-.042],[flank*.037,-.009,-.035]],radius:.002,segments:16,ends:false,material:mats.orange}));
 }
 root.add(bellows({name:'Foot ankle flexor',from:[0,.045,-.024],to:[0,.082,-.024],radius:.024,ribs:4},mats));
 root.userData.construction={method:'planted sole, apertured carriers, oblique instep and independent heel buttresses',soleBottom:-.0435,side};
 return root;
}
