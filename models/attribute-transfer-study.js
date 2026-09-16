import * as THREE from 'three';
import { defineModel, group, material, mesh, box } from '../src/lib/modeling.js';
import { profileSweepGeometry } from '../src/lib/profile-sweep.js';
import { solidifyGeometry } from '../src/lib/surface-thickness.js';
import { boundaryProfileGeometry, roundBoundaryProfile } from '../src/lib/surface-boundary-profile.js';
import { transferSurfaceAttributes } from '../src/lib/attribute-transfer.js';

function addContinuousColor(geometry, colorAt){
  const position=geometry.getAttribute('position'),colors=new Float32Array(position.count*3);
  for(let i=0;i<position.count;i++){
    const c=new THREE.Color(colorAt(new THREE.Vector3().fromBufferAttribute(position,i),i));
    colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  return geometry;
}

function organicSource(){
  const source=profileSweepGeometry({
    path:[[-.40,-.32,-.02],[-.30,-.12,.035],[-.16,.08,.07],[.02,.27,.025],[.22,.39,-.04]],
    profile:[[-.082,0],[-.04,.02],[0,.03],[.04,.02],[.082,0]],closedProfile:false,segments:44,up:[0,1,0],
    scale:t=>[.68+.45*Math.sin(Math.PI*t),.9-.18*t],tilt:t=>-18+39*t,
  });
  source.computeBoundingBox();const min=source.boundingBox.min.y,max=source.boundingBox.max.y,span=Math.max(1e-6,max-min);
  return addContinuousColor(source,p=>new THREE.Color('#4f8f78').lerp(new THREE.Color('#e7b35f'),THREE.MathUtils.clamp((p.y-min)/span,0,1)));
}
function organicFixture(transferred){
  const root=group('Organic transfer fixture',[],{position:[-.55,.02,0],rotation:[2,-12,5]});
  const source=organicSource();
  const shell=solidifyGeometry(source,{thickness:.022,offset:-.25,rim:'smooth'});
  const target=transferred?transferSurfaceAttributes(source,shell,{attributes:['color'],maxDistance:.04}):shell.clone();
  source.dispose();shell.dispose();
  root.add(mesh(target,{name:transferred?'Transferred leaf shell':'Untransferred leaf shell',material:material(transferred?'#ffffff':'#7f9986',{roughness:.46,vertexColors:transferred})}));
  root.userData.workflow={subject:'organic guide-swept leaf',target:'solidified shell',attribute:transferred?'continuous source color transferred by nearest face':'none'};
  return root;
}

function mechanicalSource(){
  const source=new THREE.PlaneGeometry(.68,.48,10,8),position=source.getAttribute('position');
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),rib=.05*Math.exp(-Math.pow(x/.16,2)),warp=.017*Math.sin((y+.24)*5.8)+.012*x*y/.16;
    position.setZ(i,rib+warp);
  }
  position.needsUpdate=true;source.computeVertexNormals();source.computeBoundingBox();
  const min=source.boundingBox.min.x,max=source.boundingBox.max.x,span=Math.max(1e-6,max-min);
  addContinuousColor(source,p=>new THREE.Color('#4db3cc').lerp(new THREE.Color('#d47d60'),THREE.MathUtils.clamp((p.x-min)/span,0,1)));
  return source;
}
function mechanicalFixture(transferred){
  const root=group('Mechanical transfer fixture',[],{position:[.55,-.03,0],rotation:[-5,18,-4]});
  const source=mechanicalSource();
  const panel=solidifyGeometry(source,{thickness:.032,offset:-1,rim:'sharp'});
  const trim=boundaryProfileGeometry(source,{profile:roundBoundaryProfile({radius:.014,segments:6,aspect:.72}),offset:[.005,-.002]});
  const target=transferred?transferSurfaceAttributes(source,trim,{attributes:['color'],maxDistance:.035}):trim.clone();
  trim.dispose();
  root.add(mesh(panel,{name:'Neutral service panel',material:material('#76848d',{roughness:.38,metalness:.28})}));
  root.add(mesh(target,{name:transferred?'Transferred perimeter trim':'Untransferred perimeter trim',material:material(transferred?'#ffffff':'#63aeb5',{roughness:.30,metalness:.08,vertexColors:transferred})}));
  for(const x of [-.26,.26])root.add(box({name:'Panel mount',size:[.065,.055,.052],radius:.007,segments:2,position:[x,-.18,-.04],material:material('#bd945c',{roughness:.3,metalness:.55})}));
  source.dispose();
  root.userData.workflow={subject:'deformed mechanical panel',target:'independent boundary profile trim',attribute:transferred?'continuous source color transferred by nearest face':'none'};
  return root;
}

export default defineModel({
  id:'attribute-transfer-study',title:'Workflow lab / closest-surface attribute transfer',
  description:'Continuous per-vertex data is sampled from the closest source triangle and barycentrically transferred onto new topology without mutating either construction input.',
  parameters:{transfer:{type:'boolean',default:true},organic:{type:'boolean',default:true},mechanical:{type:'boolean',default:true}},
  build:p=>{
    const children=[];if(p.organic)children.push(organicFixture(p.transfer));if(p.mechanical)children.push(mechanicalFixture(p.transfer));
    if(!children.length)children.push(box({size:[.05,.05,.05],material:material('#888888')}));
    const root=group('Closest-surface attribute transfer workflow',children);root.userData.workflow={transfer:p.transfer};return root;
  },
});
