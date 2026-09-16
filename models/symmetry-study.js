import { defineModel, group, material, sphere, torus } from '../src/lib/modeling.js';
import { cageAsset } from '../src/lib/forms/cage-asset.js';
import { ball, ellipsoidCage, inflate, mirrorMask, pull, sculpt, stroke } from '../src/lib/forms/sculpt.js';
import { symmetryPlane, mirrorPoints } from '../src/lib/symmetry.js';

const deg=n=>n*Math.PI/180;

function organicStudy(){
 const plane=symmetryPlane({origin:[-.55,.08,0],normal:[1,0,0]});
 const seed=ellipsoidCage({radii:[.20,.27,.18],at:[-.55,.12,0],level:3});
 const cheek=mirrorMask(ball({at:[-.43,.10,.13],radius:[.09,.11,.10]}),plane);
 const temple=mirrorMask(ball({at:[-.46,.24,.05],radius:[.07,.08,.12]}),plane);
 const jawStroke=mirrorMask(stroke([[-.45,.02,.10],[-.42,-.03,.07],[-.45,-.08,.02]],{radius:.055,plane:'xyz'}),plane);
 const shaped=sculpt(seed,inflate(cheek,.018),pull(temple,[0,.008,.006]),pull(jawStroke,[0,-.006,.012]));
 const mesh=cageAsset(shaped,{name:'Bilateral stylized bust',mode:'cage',lowLevel:1,highLevel:2,color:'#d7c1aa',roughness:.82});
 mesh.userData.symmetry={origin:plane.origin,normal:plane.normal,example:'organic primary-form sculpt'};return mesh;
}

function mechanicalStudy(){
 const angle=deg(28),normal=[Math.cos(angle),0,Math.sin(angle)],plane=symmetryPlane({origin:[.55,.03,0],normal});
 const seed=ellipsoidCage({radii:[.19,.24,.19],at:[.55,.04,0],level:3});
 // One authored diagonal panel stroke is mirrored in the pod's own rotated local plane.
 const ridge=mirrorMask(stroke([[.64,-.11,.08],[.69,.03,.12],[.63,.16,.09]],{radius:.047,plane:'xyz'}),plane);
 const recess=mirrorMask(ball({at:[.66,.035,.13],radius:[.075,.095,.060]}),plane);
 const shaped=sculpt(seed,inflate(ridge,.020),pull(recess,[0,0,-.017]));
 const root=group('Mirrored mechanical pod',[cageAsset(shaped,{name:'Pod shell',mode:'cage',lowLevel:1,highLevel:2,color:'#aab3bb',roughness:.34})]);
 const authored=[[.72,.19,.02],[.75,.25,.01],[.74,.31,-.01]],mirrored=mirrorPoints(authored,plane,{reverse:true});
 root.add(torus({name:'Service collar',radius:.085,tube:.010,segments:36,position:[.55,.30,0],rotation:[90,0,0],material:material('#39424b',{metalness:.6,roughness:.28})}));
 for(const [i,p] of [...authored,...mirrored].entries())root.add(sphere({name:`Service node ${i+1}`,radius:.016,segments:16,position:p,material:material(i<authored.length?'#ff845f':'#6dd8ff',{metalness:.15,roughness:.30})}));
 root.userData.symmetry={origin:plane.origin,normal:plane.normal,example:'rotated-plane mechanical construction'};return root;
}

export default defineModel({
 id:'symmetry-study',title:'Workflow lab / local symmetry',
 description:'Two unrelated forms exercise explicit local symmetry planes: an organic blockout and a rotated mechanical pod.',
 parameters:{organic:{type:'boolean',default:true},mechanical:{type:'boolean',default:true}},
 build:p=>{
  const children=[];if(p.organic)children.push(organicStudy());if(p.mechanical)children.push(mechanicalStudy());
  if(!children.length)children.push(sphere({radius:.03,material:'#888888'}));
  return group('Local symmetry workflow',children);
 }
});
