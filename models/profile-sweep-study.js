import * as THREE from 'three';
import {box,defineModel,group,material,sphere} from '../src/lib/modeling.js';
import {profileSweep} from '../src/lib/profile-sweep.js';

const organicPath=[[-.54,-.24,-.06],[-.39,-.04,.02],[-.24,.20,.10],[-.04,.31,.03],[.18,.18,-.08],[.34,.34,-.04],[.50,.48,.04]];
const leafProfile=[[-.052,0],[-.032,.014],[0,.020],[.032,.014],[.052,0]];
function organicStudy(palette){
 const root=group('Organic profile sweep study',[],{position:[-.62,.10,0]});
 root.add(profileSweep({name:'Tapered crest ribbon',path:organicPath,profile:leafProfile,closedProfile:false,segments:72,up:[0,1,0],
  scale:t=>[.42+.95*Math.sin(Math.PI*t)**.72,.65+.55*Math.sin(Math.PI*t)],tilt:t=>-18+42*t,material:palette.jade}));
 const curve=new THREE.CatmullRomCurve3(organicPath.map(p=>new THREE.Vector3(...p)),false,'centripetal');
 for(const t of [.16,.34,.52,.70,.86]){
  const p=curve.getPointAt(t);root.add(sphere({name:'Guide bud',radius:.015,segments:18,position:p.toArray(),material:palette.blush}));
 }
 root.userData.workflow={subject:'organic crest / leaf ribbon',operation:'open profile, anisotropic taper and authored roll along one guide'};
 return root;
}

const mechPath=[[-.50,-.30,.03],[-.31,-.09,.08],[-.11,.10,.02],[.12,.05,-.08],[.30,.25,-.02],[.52,.18,.07]];
const strapProfile=[[-.048,-.010],[.040,-.010],[.052,-.004],[.052,.008],[-.040,.008],[-.052,.003]];
function mechanicalStudy(palette){
 const root=group('Mechanical profile sweep study',[],{position:[.62,-.08,0]});
 root.add(profileSweep({name:'Profiled service strap',path:mechPath,profile:strapProfile,segments:64,up:[0,1,0],tilt:t=>12*Math.sin(t*Math.PI*2),
  scale:t=>[1-.18*Math.sin(Math.PI*t),1],material:palette.graphite}));
 const trimProfile=[[-.010,-.006],[.010,-.006],[.014,0],[.010,.006],[-.010,.006],[-.014,0]];
 root.add(profileSweep({name:'Raised trim rail',path:mechPath,profile:trimProfile,segments:64,up:[0,1,0],tilt:t=>12*Math.sin(t*Math.PI*2),scale:[1,.75],offset:[0,.016],material:palette.cyan}));
 root.add(box({name:'Mount A',size:[.11,.09,.07],radius:.012,segments:3,position:mechPath[0],material:palette.brass}));
 root.add(box({name:'Mount B',size:[.11,.09,.07],radius:.012,segments:3,position:mechPath.at(-1),material:palette.brass}));
 root.userData.workflow={subject:'mechanical strap / trim',operation:'closed non-circular profile with caps, taper and independent section geometry'};
 return root;
}

export default defineModel({
 id:'profile-sweep-study',title:'Workflow lab / profiled guide sweeps',
 description:'Two unrelated fixtures sweep independently authored 2D sections along transported 3D guide frames, separating route, cross-section, taper, tilt and tessellation.',
 parameters:{organic:{type:'boolean',default:true},mechanical:{type:'boolean',default:true}},
 build:p=>{
  const palette={
   jade:material('#78bba0',{roughness:.46,metalness:.02,side:THREE.DoubleSide}),blush:material('#d88488',{roughness:.52,metalness:.01}),
   graphite:material('#253038',{roughness:.31,metalness:.62}),brass:material('#b69355',{roughness:.27,metalness:.72}),
   cyan:material('#65dcdf',{roughness:.24,metalness:.08,emissive:'#123d42',emissiveIntensity:.75}),
  };
  const children=[];if(p.organic)children.push(organicStudy(palette));if(p.mechanical)children.push(mechanicalStudy(palette));
  if(!children.length)children.push(box({size:[.05,.05,.05],material:material('#888888')}));return group('Profile sweep workflow',children);
 }
});
