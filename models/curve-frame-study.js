import * as THREE from 'three';
import {box,cylinder,defineModel,group,material,torus,tube} from '../src/lib/modeling.js';
import {sweep} from '../src/lib/surfaces.js';
import {attachToCurve,curveTransforms,offsetCurvePoints} from '../src/lib/curve-frame.js';

const bone=material('#d2d7c5',{roughness:.68,metalness:.02});
const coral=material('#d67562',{roughness:.50,metalness:.04});
const graphite=material('#293239',{roughness:.34,metalness:.58});
const steel=material('#87969a',{roughness:.25,metalness:.72});
const cyan=material('#55e1df',{roughness:.28,metalness:.12,emissive:'#123f43',emissiveIntensity:.9});

const organicPoints=[[-.50,-.12,-.04],[-.37,.08,.08],[-.18,.26,.14],[.04,.17,.08],[.22,-.03,.02],[.37,.13,-.06],[.50,.32,-.02]];
function organicStudy(){
 const root=group('Organic transported-frame study'),curve=new THREE.CatmullRomCurve3(organicPoints.map(p=>new THREE.Vector3(...p)),false,'centripetal');
 root.add(sweep({name:'Tapered horn support',points:organicPoints,radii:[.045,.060,.055,.043,.030,.018,.007],segments:72,sides:12,material:bone}));
 const poses=curveTransforms(curve,{segments:12,up:[0,1,0],tilt:t=>-22+44*t,offset:[.006,0,0]});
 poses.slice(1,-1).forEach((pose,i)=>{
  const collar=torus({name:`Horn collar ${i+1}`,radius:.052*(1-i/(poses.length-1))+.010,tube:.004,segments:28,material:i%3===0?coral:graphite});
  root.add(attachToCurve(collar,pose));
 });
 root.userData.workflow={subject:'organic horn / tendril',operation:'rotation-minimizing frames with authored progressive tilt'};
 return root;
}

const mechPoints=[[-.50,-.28,.03],[-.30,-.05,.11],[-.08,.19,.02],[.16,.02,-.08],[.34,.24,.01],[.52,.08,.10]];
function mechanicalStudy(){
 const root=group('Mechanical transported-frame study'),curve=new THREE.CatmullRomCurve3(mechPoints.map(p=>new THREE.Vector3(...p)),false,'centripetal');
 for(const [k,offset] of [[0,[-.026,0]],[1,[.026,0]]])root.add(tube({name:`Harness rail ${k+1}`,points:offsetCurvePoints(curve,{segments:72,up:[0,1,0],offset}),radius:.007,segments:72,material:cyan}));
 const poses=curveTransforms(curve,{segments:10,up:[0,1,0],tilt:t=>18*Math.sin(t*Math.PI*2)});
 poses.slice(1,-1).forEach((pose,i)=>{
  const clamp=box({name:`Transported clamp ${i+1}`,size:[.080,.023,.035],radius:.005,segments:2,material:i%2?steel:graphite});
  root.add(attachToCurve(clamp,pose));
  if(i%3===1){
   const pin=cylinder({name:`Clamp pin ${i+1}`,radius:.008,height:.045,segments:14,material:steel});pin.rotation.z=Math.PI/2;clamp.add(pin);
  }
 });
 root.userData.workflow={subject:'mechanical cable harness',operation:'paired offset routes and repeated clamps from one transported frame field'};
 return root;
}

export default defineModel({
 id:'curve-frame-study',title:'Workflow lab / transported curve frames',
 description:'Organic and hard-surface fixtures use one minimum-twist frame field for sweeps, offsets and repeated attachments along inflected 3D curves.',
 parameters:{organic:{type:'boolean',default:true},mechanical:{type:'boolean',default:true}},
 build:p=>{const children=[];if(p.organic)children.push(organicStudy());if(p.mechanical)children.push(mechanicalStudy());if(!children.length)children.push(box({size:[.05,.05,.05],material:'#888888'}));return group('Transported curve frame workflow',children);}
});
