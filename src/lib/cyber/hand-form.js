import {group,sphere} from '../modeling.js';
import {rigidChain} from '../rigid-chain.js';
import {shapeProfile,thickenSurface} from '../shape-rails.js';
import {contourArmor} from './torso-form.js';
import {link,orient,radialPort} from './mechanics.js';

function phalanx(length,index,width,mats){
 const root=group('Phalanx '+index),r=width*.5;
 root.add(link({name:'Digit link chassis',from:[0,0,0],to:[0,-length,0],radius:r*.75,endRadius:r*.63,segments:12,material:mats.dark}));
 root.add(link({name:'Digit transverse axle',from:[-r*.96,0,0],to:[r*.96,0,0],radius:r*.52,segments:12,material:mats.edge}));
 // Dorsal plate: flat-ish across the finger with curved corners, separately owned
 // from the hinge; the joint angle changes both plate and chassis coherently.
 const support=(u,v)=>[(.5-u)*width*(.92-.12*v),-length*(.14+.71*v),r*(.58+.28*Math.sin(Math.PI*u))];
 root.add(thickenSurface('Dorsal digit ceramic '+index,support,{thickness:.0013,segments:[6,8],material:mats.shell}));
 root.add(sphere({name:'Digit palm pad',radius:1,scale:[r*.77,length*.26,r*.49],position:[0,-length*.57,-r*.46],segments:12,material:mats.rubber}));
 return root;
}

/** Mechanical hand built from a tapered palm, arcing knuckles and connected FK
 * digits. Width/length data describe this stylized robot, not a human hand rig.
 * Positive curl bends toward local -Z (palm); +Z carries the dorsal emitter.
 */
export function articulatedHand({side=1,pose='relaxed',detail=1}={},mats){
 if(![-1,1].includes(side)||!['open','relaxed','grasp'].includes(pose))throw new Error('Invalid mechanical hand side/pose');
 const root=group(side>0?'ServoHand.L':'ServoHand.R');
 const width=shapeProfile([[0,.018],[.22,.027],[.65,.033],[1,.029]]);
 const support=(u,v)=>{const a=(.5-u)*Math.PI*2;return[Math.sin(a)*width(v),.007-.075*v,Math.cos(a)*(.011+.004*Math.sin(v*Math.PI))];};
 root.add(thickenSurface('Tapered palm chassis',support,{thickness:.002,segments:[28,22],material:mats.dark}));
 const dorsal=[[.28,.10],[.40,.035],[.63,.055],[.73,.23],[.72,.58],[.67,.80],[.60,.88],[.55,.72],[.47,.71],[.42,.87],[.33,.78],[.27,.51]];
 root.add(contourArmor('Metacarpal shield',support,dorsal,mats,{offset:.003,thickness:.0025,refinement:2}));
 // Preserve the independently scored wrist/palm feature exactly.
 root.add(orient(radialPort({name:'Palm status port',radius:.017,color:'lime',detail},mats),[0,-.027,.028],[0,0,1]));
 const lengths=[.052,.061,.057,.045],knuckles=[-.056,-.063,-.060,-.052],spreads=[-5,-1,3,9];
 const curl=pose==='open'?[[2,3,2],[0,2,2],[3,4,3],[5,6,3]]:pose==='grasp'?[[48,68,35],[52,70,38],[58,72,40],[64,76,43]]:[[12,27,16],[17,34,21],[23,42,25],[29,48,30]];
 for(let i=0;i<4;i++){
  const total=lengths[i],w=[.0145,.015,.014,.012][i];
  const digit=rigidChain({name:'Digit '+(i+1),lengths:[total*.48,total*.30,total*.22],rotations:curl[i].map((x,j)=>[x,0,j===0?side*spreads[i]:0])},(len,j)=>phalanx(len,j,w*(1-j*.12),mats));
  digit.position.set(side*(i-1.5)*.0165,knuckles[i],0);root.add(digit);
  const base=digit.position.toArray();root.add(link({name:'Dorsal metacarpal strut',from:[base[0]*.60,-.024,.011],to:[base[0],base[1]+.004,.005],radius:.0028,segments:10,material:mats.edge}));
 }
 const thumb=rigidChain({name:'Opposing thumb',lengths:[.027,.020],rotations:pose==='grasp'?[[25,-side*38,-side*48],[48,0,0]]:[[12,-side*25,-side*36],[pose==='open'?5:27,0,0]]},(len,j)=>phalanx(len,j,.018-j*.002,mats));
 thumb.position.set(-side*.028,-.032,-.003);root.add(thumb);
 root.add(sphere({name:'Thenar servo cushion',radius:1,scale:[.016,.024,.015],position:[-side*.020,-.036,-.005],segments:20,material:mats.dark}));
 root.userData.handForm={pose,side,method:'tapered palm + arcing knuckles + connected rigid phalanges',skinRig:false};
 return root;
}
