import * as THREE from 'three';
import { defineModel, group, material, mesh, sphere, box } from '../src/lib/modeling.js';
import { profileSweepGeometry } from '../src/lib/profile-sweep.js';
import { creaseNormals, solidifyGeometry } from '../src/lib/surface-thickness.js';

const leafPath=[[-.46,-.28,-.02],[-.34,-.08,.05],[-.22,.14,.08],[-.02,.28,.02],[.18,.18,-.05],[.34,.32,-.02],[.48,.46,.04]];
const leafProfile=[[-.06,0],[-.038,.018],[0,.026],[.038,.018],[.06,0]];
function organicFixture(palette){
  const root=group('Organic thickness fixture',[],{position:[-.62,.06,0]});
  const sheet=profileSweepGeometry({
    path:leafPath,profile:leafProfile,closedProfile:false,segments:64,up:[0,1,0],
    scale:t=>[.48+.82*Math.sin(Math.PI*t)**.72,.7+.42*Math.sin(Math.PI*t)],
    tilt:t=>-16+38*t,
  });
  const thick=solidifyGeometry(sheet,{thickness:.014,offset:-.25,rim:'smooth'});
  sheet.dispose();
  root.add(mesh(thick,{name:'Solid leaf crest',material:palette.leaf}));
  const curve=new THREE.CatmullRomCurve3(leafPath.map(p=>new THREE.Vector3(...p)),false,'centripetal');
  for(const t of [.2,.46,.72])root.add(sphere({name:'Guide bud',radius:.014,segments:16,position:curve.getPointAt(t).toArray(),material:palette.bud}));
  root.userData.workflow={subject:'organic leaf / crest',source:'open profiled guide sheet',operation:'smooth-rim normal-offset solidification'};
  return root;
}

function foldedPanelGeometry(){
  const geometry=new THREE.PlaneGeometry(.72,.46,12,8);
  const position=geometry.getAttribute('position');
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i);
    const ridge=.07-.19*Math.abs(x);
    const crown=.018*(1-(y/.23)**2);
    position.setZ(i,ridge+crown);
  }
  position.needsUpdate=true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return geometry;
}
function mechanicalFixture(palette){
  const root=group('Mechanical thickness fixture',[],{position:[.64,-.02,0],rotation:[-5,18,-4]});
  const source=foldedPanelGeometry();
  const thick=solidifyGeometry(source,{thickness:.034,offset:-1,rim:'sharp'});
  source.dispose();
  const finished=creaseNormals(thick,{angle:34});
  thick.dispose();
  root.add(mesh(finished,{name:'Folded service panel',material:palette.panel}));
  root.add(box({name:'Panel mount left',size:[.08,.07,.055],radius:.01,segments:2,position:[-.31,-.18,-.03],material:palette.mount}));
  root.add(box({name:'Panel mount right',size:[.08,.07,.055],radius:.01,segments:2,position:[.31,-.18,-.03],material:palette.mount}));
  root.userData.workflow={subject:'folded mechanical panel',source:'deformed indexed PlaneGeometry',operation:'sharp-rim solidification followed by 34 degree crease-normal finish'};
  return root;
}

export default defineModel({
  id:'surface-thickness-study',title:'Workflow lab / surface thickness and crease finish',
  description:'Two unrelated open surfaces gain editable physical thickness without baking it into their source shape; a hard-surface example adds a separate angle-based crease-normal finish.',
  parameters:{organic:{type:'boolean',default:true},mechanical:{type:'boolean',default:true}},
  build:p=>{
    const palette={
      leaf:material('#7dbb91',{roughness:.5,metalness:.02}),bud:material('#d58c91',{roughness:.55}),
      panel:material('#74848d',{roughness:.38,metalness:.34}),mount:material('#c29b59',{roughness:.28,metalness:.7}),
    };
    const children=[];if(p.organic)children.push(organicFixture(palette));if(p.mechanical)children.push(mechanicalFixture(palette));
    if(!children.length)children.push(box({size:[.05,.05,.05],material:material('#888888')}));
    return group('Surface thickness workflow',children);
  },
});
