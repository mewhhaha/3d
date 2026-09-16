import {box,cylinder,defineModel,group,material,sphere,torus,tube} from '../src/lib/modeling.js';
import {thickenSurface} from '../src/lib/shape-rails.js';
import {attachToSurface,surfacePath,surfaceTransform} from '../src/lib/surface-frame.js';

const shell=material('#c6d5cb',{roughness:.72,metalness:.03});
const warm=material('#e88958',{roughness:.48,metalness:.12});
const dark=material('#30383f',{roughness:.32,metalness:.55});
const cyan=material('#5ed8e2',{roughness:.28,metalness:.15,emissive:'#143e44',emissiveIntensity:.7});

function organicSupport(u,v){
 const a=(u-.5)*Math.PI*.92,y=(v-.5)*.42,waist=1-.18*(2*v-1)**2;
 return[-.48+Math.sin(a)*.20*waist,y,.02+Math.cos(a)*.145*waist+.018*Math.cos(v*Math.PI*2)];
}
function organicStudy(){
 const root=group('Organic attachment study');
 root.add(thickenSurface('Creature carapace',organicSupport,{thickness:.007,segments:[28,30],material:shell}));
 for(const [i,[u,v,twist]] of [[.50,.18,-18],[.50,.39,12],[.50,.61,-10],[.50,.82,20]].entries()){
  const spine=cylinder({name:`Normal-aligned spine ${i+1}`,top:.002,bottom:.015,radius:.015,height:.072,segments:18,material:warm});
  root.add(attachToSurface(spine,organicSupport,{u,v,offset:.012,rotation:[90,0,twist]}));
 }
 for(const [i,[u,v]] of [[.25,.33],[.73,.30],[.21,.68],[.77,.70]].entries()){
  const collar=torus({name:`Surface collar ${i+1}`,radius:.024,tube:.0045,segments:28,material:dark});
  root.add(attachToSurface(collar,organicSupport,{u,v,offset:.005,rotation:[0,0,i%2?18:-18]}));
 }
 root.userData.workflow={subject:'organic creature carapace',operation:'normal-aligned local attachments on a parametric support'};
 return root;
}

function panelSupport(u,v){
 const x=.44+(u-.5)*.38,y=(v-.5)*.42,z=.015+.075*Math.cos((u-.5)*Math.PI)-.018*(2*v-1)**2;
 return[x,y,z];
}
function mechanicalStudy(){
 const root=group('Mechanical attachment study');
 root.add(thickenSurface('Curved equipment panel',panelSupport,{thickness:.008,segments:[30,32],material:dark}));
 for(const [i,[u,v,twist]] of [[.24,.25,-24],[.70,.29,26],[.28,.73,18],[.72,.70,-22]].entries()){
  const vent=box({name:`Tangent vent ${i+1}`,size:[.060,.018,.012],radius:.004,segments:2,material:shell});
  root.add(attachToSurface(vent,panelSupport,{u,v,offset:.012,rotation:[0,0,twist]}));
 }
 const route=surfacePath(panelSupport,Array.from({length:17},(_,i)=>{const v=.14+i/16*.72;return{u:.50+.16*Math.sin(v*Math.PI*2),v,offset:.014};}));
 root.add(tube({name:'Chart-authored service cable',points:route,radius:.006,segments:48,material:cyan}));
 const pose=surfaceTransform(panelSupport,{u:.50,v:.52,offset:.020,slide:[.055,0],rotation:[0,0,35]});
 const socket=sphere({name:'Slid service socket',radius:.020,segments:18,material:warm});socket.position.copy(pose.position);socket.quaternion.copy(pose.quaternion);root.add(socket);
 root.userData.workflow={subject:'mechanical curved panel',operation:'tangent-local placement plus chart-authored routed detail'};
 return root;
}

export default defineModel({
 id:'surface-attachment-study',title:'Workflow lab / surface attachments',
 description:'Organic and hard-surface fixtures exercise chart-local placement, tangent slides, local rotation and routed surface paths.',
 parameters:{organic:{type:'boolean',default:true},mechanical:{type:'boolean',default:true}},
 build:p=>{const children=[];if(p.organic)children.push(organicStudy());if(p.mechanical)children.push(mechanicalStudy());if(!children.length)children.push(sphere({radius:.03,material:'#888888'}));return group('Surface attachment workflow',children);}
});
