import * as THREE from 'three';
import { group, sphere, box, cylinder } from '../modeling.js';
import { cyberMaterials, ring, orient, link, armorPanel, radialPort, routedCable, cableLoom, bellows } from './mechanics.js';
import { shellDetails, portAt, fastenerRow, seamPath, ventAt } from './details.js';
import { splitShell, onShell } from './shells.js';
import { animePortrait, prismBob } from './portrait.js';
const V=a=>new THREE.Vector3(...a);
const D=THREE.MathUtils.degToRad;
function install(root, child, position=[0,0,0], rotation=[0,0,0]){child.position.fromArray(position);child.rotation.set(...rotation.map(D));root.add(child);return child;}
function plate(root,name,outline,position,mats,{rotation=[0,0,0],bulge=.01,material,holes=[]}={}){
 return install(root,armorPanel({name,outline,depth:.006,bevel:.0028,bulge,material,holes},mats),position,rotation);
}
function engraved(root,name,points,mat,radius=.0013){root.add(routedCable({name,points,radius,material:mat,ends:false,segments:28}));}
function pod(root,name,at,radius,color,mats,detail,direction=[0,0,1]){root.add(orient(radialPort({name,radius,color,detail},mats),at,direction));}
function rigidJoint(name,at){const g=group(name);g.position.fromArray(at);g.userData.articulation='rigid servo joint';return g;}
/** A deliberately rigid robotic hand: no claim of organic skin deformation. */
export function servoHand({side=1,detail=1}={},mats){
 const root=group(side>0?'ServoHand.L':'ServoHand.R');
 root.add(box({name:'Palm chassis',size:[.064,.087,.025],radius:.012,position:[0,-.032,0],material:mats.dark}));
 plate(root,'Metacarpal shield',[[-.029,.002],[-.034,-.030],[-.022,-.066],[.025,-.065],[.032,-.018],[.019,.007]],[0,0,.015],mats,{bulge:.003});
 pod(root,'Palm status port',[0,-.027,.028],.017,'lime',mats,detail);
 for(let f=0;f<4;f++){
  const x=(f-1.5)*.016, len=[.054,.063,.059,.046][f];
  const finger=rigidJoint(`Digit${f+1}${side>0?'L':'R'}`,[x,-.071,0]);root.add(finger);
  const pts=[[0,0,0],[0,-len*.47,.003],[0,-len*.78,.012],[0,-len,.022]];
  for(let j=0;j<3;j++){
   finger.add(link({name:'Phalanx mechanism',from:pts[j],to:pts[j+1],radius:.007,material:mats.dark,segments:12}));
   const p=V(pts[j]).lerp(V(pts[j+1]),.52).add(new THREE.Vector3(0,0,.006));
   finger.add(box({name:'Finger ceramic segment',size:[.011,len*.23,.009],radius:.003,position:p.toArray(),material:mats.shell}));
   finger.add(sphere({name:'Finger hinge',radius:.0072,scale:[1,.8,1],position:pts[j],segments:12,material:mats.edge}));
  }
 }
 const thumb=[[-side*.030,-.019,0],[-side*.046,-.043,.005],[-side*.049,-.069,.024]];
 for(let i=0;i<2;i++)root.add(link({name:'Opposing thumb segment',from:thumb[i],to:thumb[i+1],radius:.009,material:i?mats.shell:mats.dark,segments:16}));
 return root;
}
export function exoArm({side=1,detail=1}={},mats){
 const root=rigidJoint(side>0?'Shoulder.L':'Shoulder.R',[side*.207,1.465,-.01]);
 root.rotation.z=D(side>0?7:-2);root.rotation.x=D(side>0?-4:4);
 root.add(sphere({name:'Shoulder joint ball',radius:.069,segments:32,material:mats.dark}));
 plate(root,'Scalloped shoulder shell',[[-.070,.035],[-.050,.081],[.012,.089],[.067,.040],[.058,-.039],[.021,-.077],[-.023,-.060],[-.050,-.015]],[0,0,.024],mats,{bulge:.034});
 pod(root,'Shoulder neon module',[side*.005,.018,.070],.041,'pink',mats,detail);
 const elbow=[side*.012,-.242,-.018];
 root.add(splitShell({name:'Upper arm wrapped armor',stations:[[-.061,.039,.042],[-.12,.042,.040],[-.205,.030,.031]],material:mats.shell,backOpen:.70}));
 root.add(bellows({name:'Upper arm actuator',from:[0,-.055,0],to:elbow,radius:.032,ribs:9},mats));
 root.add(link({name:'Triceps piston',from:[side*.032,-.074,-.029],to:[side*.031,-.203,-.028],radius:.009,material:mats.edge}));
 const fore=rigidJoint(side>0?'Elbow.L':'Elbow.R',elbow);fore.rotation.x=D(-12);root.add(fore);
 fore.add(splitShell({name:'Forearm wrapped armor',stations:[[-.024,.040,.044],[-.077,.044,.047],[-.16,.031,.035],[-.22,.023,.024]],material:mats.shell,backOpen:.65}));
 pod(fore,'Elbow side bearing',[side*.030,0,0],.034,'amber',mats,detail,[side,0,0]);
 fore.add(bellows({name:'Forearm exposed core',from:[0,0,0],to:[0,-.236,0],radius:.030,ribs:11},mats));
 engraved(fore,'Cyan forearm inlay',[[-.022,-.056,.035],[-.013,-.085,.040],[-.019,-.140,.040],[-.009,-.192,.034]],mats.cyan,.0024);
 if(detail)for(let i=0;i<3;i++)fore.add(box({name:'Forearm vent',size:[.013,.003,.004],radius:.001,position:[.018,-.046-i*.012,.038],material:mats.dark}));
 pod(fore,'Wrist swivel',[0,-.225,.018],.025,'cyan',mats,detail);
 if(detail)fore.add(shellDetails([[-.024,.040,.044],[-.077,.044,.047],[-.16,.031,.035],[-.22,.023,.024]],mats,portAt({t:.20,angle:side*.5,radius:.015,color:'cyan'}),fastenerRow({heights:[.3,.7],angle:side*1,radius:.002}),ventAt({t:.42,angle:0,width:.008,height:.027}),seamPath({points:[[.32,-.3],[.44,-.35],[.73,-.45],[.88,-.15]],color:'lime',width:.0014})));
 const hand=servoHand({side,detail},mats);hand.position.set(0,-.26,.002);hand.rotation.x=D(-4);fore.add(hand);return root;
}
export function exoLeg({side=1,detail=1}={},mats){
 const root=rigidJoint(side>0?'Hip.L':'Hip.R',[side*.112,.991,0]);
 root.rotation.z=D(side*3);root.rotation.x=D(side>0?-2:3);
 root.add(sphere({name:'Hip articulation',radius:.077,segments:32,material:mats.dark}));
 pod(root,'Hip lateral servo',[side*.069,.015,0],.044,'amber',mats,detail,[side,0,0]);
 root.add(link({name:'Femur armature',from:[0,-.03,0],to:[0,-.410,0],radius:.042,endRadius:.060,material:mats.dark}));
 root.add(splitShell({name:'Thigh enclosing panels',stations:[[-.044,.079,.075],[-.11,.084,.079],[-.22,.070,.070],[-.37,.047,.050]],material:mats.shell,backOpen:.65}));
 engraved(root,'Thigh panel seam',[[-.025,-.070,.071],[-.037,-.170,.070],[-.014,-.270,.069],[-.010,-.337,.058]],mats.dark,.0010);
 root.add(onShell(radialPort({name:'Thigh inset',radius:.016,color:'cyan',detail},mats),[[-.044,.079,.075],[-.11,.084,.079],[-.22,.070,.070],[-.37,.047,.050]],{t:.17,angle:side*.3}));
 if(detail)root.add(shellDetails([[-.044,.079,.075],[-.11,.084,.079],[-.22,.070,.070],[-.37,.047,.050]],mats,portAt({t:.71,angle:side*.7,radius:.018,color:'amber'}),fastenerRow({angle:side*1.05}),ventAt({t:.42,angle:side*.4}),seamPath({points:[[.20,-.25],[.39,-.30],[.54,-.15],[.86,-.15]],color:'orange'})));
 const knee=rigidJoint(side>0?'Knee.L':'Knee.R',[0,-.428,0]);root.add(knee);
 knee.rotation.x=D(3);
 pod(knee,'Knee concentric bearing',[0,0,.039],.051,'amber',mats,detail);
 knee.add(link({name:'Tibia chassis',from:[0,-.045,0],to:[0,-.326,0],radius:.033,endRadius:.036,material:mats.dark}));
 knee.add(splitShell({name:'Shin enclosing panels',stations:[[-.053,.052,.052],[-.12,.059,.060],[-.23,.037,.043],[-.313,.029,.033]],material:mats.shell,backOpen:.55}));
 knee.add(onShell(radialPort({name:'Shin neon inset',radius:.030,color:'lime',detail},mats),[[-.053,.052,.052],[-.12,.059,.060],[-.23,.037,.043],[-.313,.029,.033]],{t:.25,angle:side*.15}));
 engraved(knee,'Shin longitudinal seam',[[side*.031,-.165,.048],[side*.023,-.228,.050],[side*.017,-.289,.045]],mats.orange,.0012);
 knee.add(link({name:'Calf external piston',from:[side*.043,-.085,-.023],to:[side*.035,-.303,-.019],radius:.009,material:mats.edge}));
 pod(knee,'Ankle side bearing',[side*.035,-.329,.005],.030,'cyan',mats,detail,[side,0,0]);
 if(detail)knee.add(shellDetails([[-.053,.052,.052],[-.12,.059,.060],[-.23,.037,.043],[-.313,.029,.033]],mats,portAt({t:.72,angle:-side*.5,radius:.014,color:'amber'}),fastenerRow({angle:side*.95,radius:.002}),seamPath({points:[[.35,-.2],[.43,-.38],[.86,-.38]],color:'orange'})));
 const foot=group(side>0?'Boot.L':'Boot.R');foot.position.set(0,-.347,.032);foot.rotation.y=D(side*6);knee.add(foot);
 // Rounded segmented sole, with angular upper panels rather than a box foot.
 foot.add(box({name:'Orange sole',size:[.115,.035,.241],radius:.014,position:[0,-.026,.050],material:mats.orange}));
 foot.add(sphere({name:'Rounded toe armor',radius:1,scale:[.058,.044,.103],position:[0,.027,.082],segments:32,material:mats.shell}));
 foot.add(box({name:'Ankle ceramic collar',size:[.09,.09,.105],radius:.018,position:[0,.052,-.027],material:mats.shell}));
 foot.add(box({name:'Black shoe chassis',size:[.100,.052,.208],radius:.025,position:[0,.011,.050],material:mats.dark}));
 plate(foot,'Instep shield',[[-.041,-.019],[-.040,.048],[-.011,.079],[.027,.066],[.043,.005],[.028,-.030]],[0,.036,.026],mats,{rotation:[-33,0,0],bulge:.013});
 for(const s of[-1,1])pod(foot,'Heel pivot',[s*.049,.022,-.021],.022,'amber',mats,detail,[s,0,0]);
 if(detail)for(let j=0;j<5;j++)foot.add(box({name:'Sole tread',size:[.119,.009,.010],radius:.003,position:[0,-.015,-.030+j*.038],material:mats.orange}));
 return root;
}
export function shellTorso({detail=1}={},mats){
 const root=group('Torso');
 root.add(splitShell({name:'Iliac ceramic girdle',stations:[[1.096,.12,.074],[1.063,.156,.095],[1.014,.156,.092]],material:mats.shell,backOpen:.5}));
 root.add(sphere({name:'Pelvic structure',radius:1,scale:[.160,.136,.093],position:[0,1.005,-.015],segments:36,material:mats.dark}));
 root.add(sphere({name:'Abdominal chassis',radius:1,scale:[.095,.176,.065],position:[0,1.189,-.008],segments:36,material:mats.rubber}));
 root.add(sphere({name:'Thoracic understructure',radius:1,scale:[.175,.126,.069],position:[0,1.407,0],segments:36,material:mats.dark}));
 root.add(bellows({name:'Cervical column',from:[0,1.490,-.011],to:[0,1.619,-.011],radius:.034,ribs:8},mats));
 for(const side of[-1,1]){
  plate(root,'Clavicle plating',[[-.008,.008],[-.047,.049],[-.120,.055],[-.172,.029],[-.145,-.005],[-.055,-.021]],[side*.002,1.46,.063],mats,{rotation:[0,0,side===-1?0:180],bulge:.013});
  const chest=plate(root,'Pectoral ceramic',[[-.045,.058],[-.067,.022],[-.063,-.031],[-.020,-.060],[.047,-.043],[.063,.006],[.029,.048]],[side*.071,1.409,.078],mats,{rotation:[-10,side*14,side*-11],bulge:.032});
  if(side>0)chest.scale.x=.93;
  for(let i=0;i<4;i++){
   const y=1.319-i*.031, x=side*(.107-i*.010);
   root.add(link({name:'Exposed rib strut',from:[x,y,.010],to:[side*.028,y-.025,.054],radius:.006,material:mats.edge,segments:12}));
   engraved(root,'Rib accent',[[x,y+.004,.033],[side*.078,y-.012,.058],[side*.051,y-.026,.064]],i%2?mats.pink:mats.orange,.004);
  }
  plate(root,'Iliac crest',[[-.058,.025],[-.043,.053],[.028,.055],[.085,.013],[.078,-.019],[.024,-.013],[-.032,-.029]],[side*.080,1.090,.050],mats,{rotation:[0,side*20,side*-8],bulge:.012});
  pod(root,'Waist actuator',[side*.123,1.067,.016],.032,'lime',mats,detail,[side,0,.4]);
 }
 plate(root,'Sternum insert',[[-.019,.070],[-.029,.021],[-.020,-.061],[0,-.090],[.020,-.061],[.029,.021],[.019,.070]],[0,1.381,.092],mats,{bulge:.008,material:mats.dark});
 pod(root,'Sternum emitter',[0,1.454,.101],.020,'amber',mats,detail);
 for(let i=0;i<5;i++)root.add(box({name:'Abdominal vertebral bridge',size:[.065-i*.003,.018,.025],radius:.006,position:[0,1.30-i*.033,.052],rotation:[0,0,i%2?8:-8],material:mats.edge}));
 plate(root,'Pelvis front shell',[[-.10,.038],[-.074,.072],[-.022,.056],[0,.038],[.049,.067],[.10,.036],[.065,-.015],[.026,-.092],[-.027,-.088],[-.065,-.013]],[0,1.003,.062],mats,{bulge:.01});
 return root;
}
export function reactorBackpack({detail=1,loops=true}={},mats){
 const root=group('ReactorBackpack');
 root.add(box({name:'Reactor spine',size:[.160,.352,.101],radius:.033,position:[0,1.373,-.169],material:mats.dark}));
 for(let i=0;i<8;i++)root.add(box({name:'Back vertebral plate',size:[.118,.022,.067],radius:.009,position:[0,1.540-i*.042,-.215],material:i%2?mats.edge:mats.shell}));
 const hub=group('Main radial reactor');hub.position.set(.135,1.419,-.222);hub.rotation.y=D(70);root.add(hub);
 hub.add(radialPort({name:'Main magenta reactor',radius:.131,color:'pink',detail,bolts:12},mats));
 for(let i=0;i<10;i++){
  const a=i/10*Math.PI*2;
  const segment=box({name:'Radial cooling cartridge',size:[.050,.029,.071],radius:.007,position:[Math.cos(a)*.153,Math.sin(a)*.153,-.012],rotation:[0,0,a*180/Math.PI],material:i%3?mats.edge:mats.shell});hub.add(segment);
  if(detail){const p=[Math.cos(a)*.147,Math.sin(a)*.147,.040];pod(hub,'Cartridge screw',p,.008,i%2?'amber':'cyan',mats,0);}
 }
 pod(root,'Secondary blue reactor',[.116,1.141,-.184],.092,'cyan',mats,detail,[1,0,.25]);
 pod(root,'Lower coolant manifold',[.059,1.041,-.192],.047,'amber',mats,detail,[1,0,0]);
 for(let i=0;i<3;i++){
  const y=1.575-i*.056;
  root.add(routedCable({name:'Armored upper hose',points:[[-.10+i*.034,y,-.11],[-.095,y+.13,-.21],[.080,y+.10,-.36],[.242,y-.030,-.28]],radius:.012-i*.001,clamps:7,material:mats.dark,clampMaterial:mats.edge,segments:64}));
 }
 root.add(routedCable({name:'Outer backpack cage',points:[[.125,1.650,-.18],[.285,1.565,-.25],[.350,1.350,-.28],[.232,1.177,-.29],[.080,1.216,-.25]],radius:.010,clamps:9,material:mats.edge,clampMaterial:mats.shell,segments:100}));
 if(loops){
  const route=[[.075,1.295,-.22],[.170,1.135,-.43],[.206,.939,-.70],[.200,.704,-.85],[.102,.634,-.67],[.050,.785,-.49],[-.015,1.044,-.27]];
  root.add(cableLoom({name:'Hanging power loop',points:route,colors:['pink','white','lime','cyan'],radius:.008,spacing:.018,segments:120,clamps:0},mats));
  for(let k=0;k<3;k++)root.add(routedCable({name:'Service return hose',points:[[.18,1.33,-.26],[.27+k*.022,1.09,-.35],[.25,.97,-.53-k*.024],[.10,1.10,-.46],[-.01,1.45,-.21]],radius:.0045,material:k===1?mats.cyan:mats.orange,segments:80,clampMaterial:mats.edge}));
 }
 return root;
}
/** Semantic assembly. This is a procedural design study, not automatic image reconstruction. */
export function cyberAndroid({detail='hero',shell='#dbdac4',glow=1,cables=true,turn=-50,headTurn=25}={}){
 const level=detail==='hero'?1:0,mats=cyberMaterials({shell,glow}),root=group('Android');
 root.rotation.y=D(turn);
 root.add(shellTorso({detail:level},mats),exoLeg({side:-1,detail:level},mats),exoLeg({side:1,detail:level},mats));
 root.add(exoArm({side:-1,detail:level},mats),exoArm({side:1,detail:level},mats),reactorBackpack({detail:level,loops:cables},mats));
 const head=group('HeadMount');head.position.set(0,1.714,-.003);head.scale.setScalar(1.12);head.rotation.set(D(6),D(headTurn),D(10));head.add(animePortrait({detail:level},mats),prismBob({detail:level},mats));root.add(head);
 root.userData.design={source:'procedural components, guided by user reference',status:'blockout and material study',rig:'rigid named servo hierarchy; not a skinned humanoid'};
 const headTimes=[0,2,4],base=head.quaternion.clone();
 const quaternions=headTimes.flatMap((_,i)=>base.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),i===1?.055:0)).toArray());
 root.animations=[new THREE.AnimationClip('Survey',4,[new THREE.QuaternionKeyframeTrack('HeadMount.quaternion',headTimes,quaternions)])];
 return root;
}
