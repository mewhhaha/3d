import * as THREE from 'three';
import { defineModel, group, material, mesh, box } from '../src/lib/modeling.js';
import { profileSweepGeometry } from '../src/lib/profile-sweep.js';
import { solidifyGeometry } from '../src/lib/surface-thickness.js';
import { boundaryProfileGeometry, roundBoundaryProfile } from '../src/lib/surface-boundary-profile.js';

function organicSheet(){
  return profileSweepGeometry({
    path:[[-.38,-.3,0],[-.18,-.12,.04],[-.08,.12,.075],[.02,.36,.03]],
    profile:[[-.09,0],[-.035,.025],[.04,.018],[.085,0]],closedProfile:false,segments:24,
    scale:t=>[1-.36*t,1-.15*t],tilt:t=>-18+42*t,
  });
}
function organicFixture(palette,trimmed){
  const root=group('Organic boundary fixture',[],{position:[-.53,-.02,0],rotation:[4,-16,8]});
  const sheet=organicSheet();
  const shell=solidifyGeometry(sheet,{thickness:.018,offset:-1,rim:'smooth'});
  root.add(mesh(shell,{name:'Leaf shell',material:palette.leaf}));
  if(trimmed){
    const trim=boundaryProfileGeometry(sheet,{profile:roundBoundaryProfile({radius:.010,segments:7,aspect:.68}),offset:[.002,0]});
    root.add(mesh(trim,{name:'Leaf boundary bead',material:palette.leafEdge}));
  }
  sheet.dispose();
  root.userData.workflow={subject:'organic swept crest',operation:trimmed?'surface-boundary profile trim':'plain solidified edge'};
  return root;
}
function mechanicalSheet(){
  const g=new THREE.PlaneGeometry(.58,.50,8,6),p=g.getAttribute('position');
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i), ridge=.035*Math.exp(-Math.pow(x/.17,2))*(.4+.6*(1-y/.55));
    p.setZ(i,ridge+.018*Math.sin((y+.25)*5.4));
  }
  p.needsUpdate=true;g.computeVertexNormals();return g;
}
function mechanicalFixture(palette,trimmed){
  const root=group('Mechanical boundary fixture',[],{position:[.48,.01,0],rotation:[-5,20,-4]});
  const sheet=mechanicalSheet(),shell=solidifyGeometry(sheet,{thickness:.034,offset:-1,rim:'sharp'});
  root.add(mesh(shell,{name:'Service panel shell',material:palette.panel}));
  if(trimmed){
    const profile=[[-.010,-.011],[.014,-.011],[.014,.011],[-.010,.011]];
    const trim=boundaryProfileGeometry(sheet,{profile,offset:[.007,-.004]});
    root.add(mesh(trim,{name:'Panel perimeter gasket',material:palette.gasket}));
  }
  for(const x of [-.21,.21])root.add(box({name:'Panel mount',size:[.07,.055,.05],radius:.008,segments:2,position:[x,-.18,-.03],material:palette.mount}));
  sheet.dispose();
  root.userData.workflow={subject:'deformed mechanical service panel',operation:trimmed?'rectangular boundary gasket':'plain solidified edge'};
  return root;
}

export default defineModel({
  id:'boundary-profile-study',title:'Workflow lab / surface boundary profiles',
  description:'Ordered source boundaries become reusable local guides for additive organic rim beads or hard-surface perimeter gaskets without rewriting the source sheet.',
  parameters:{treatment:{type:'select',options:['Trimmed','Plain'],default:'Trimmed'},organic:{type:'boolean',default:true},mechanical:{type:'boolean',default:true}},
  build:p=>{
    const trimmed=p.treatment==='Trimmed',palette={
      leaf:material('#789e80',{roughness:.5}),leafEdge:material('#d9b779',{roughness:.37}),
      panel:material('#82949d',{roughness:.34,metalness:.3}),gasket:material('#43cad1',{roughness:.27,metalness:.12,emissive:'#092d30'}),mount:material('#bc9762',{roughness:.3,metalness:.55}),
    };
    const children=[];if(p.organic)children.push(organicFixture(palette,trimmed));if(p.mechanical)children.push(mechanicalFixture(palette,trimmed));
    if(!children.length)children.push(box({size:[.05,.05,.05],material:material('#888888')}));
    const root=group('Surface boundary profile workflow',children);root.userData.workflow={treatment:p.treatment};return root;
  },
});
