import * as THREE from 'three';
import { hand, forearm, buildHand } from './hand.js';
import { jointChain, link, contour, radialMass, sectionLoft } from './structure.js';
import { surface, surfaceMesh, layers, crease, grain, smooth } from './surface.js';
import { skeleton, skin, clip, rotationTrack } from '../rigging.js';
const range = (n, a, b, label) => {
  if (!Number.isFinite(n) || n < a || n > b) throw new RangeError(`${label}: expected ${a}..${b}`);
  return n;
};
export const upperArm = ({ length = .30, tone = .5 } = {}) => Object.freeze({ kind:'upperArm', length:range(length,.23,.38,'upper arm length'), tone:range(tone,0,1,'muscle tone') });
export const elbow = ({ definition = .5 } = {}) => Object.freeze({ kind:'elbow', definition:range(definition,0,1,'elbow definition') });
/** Compose the upper limb from independent sections and an existing hand definition. */
export function arm(...parts) {
  const values = { upperArm:upperArm(), elbow:elbow(), forearm:forearm({},hand()) }, seen=new Set();
  for(const part of parts){
    if(!part || !Object.hasOwn(values,part.kind) || seen.has(part.kind)) throw new Error('arm: unsupported or duplicate component');
    values[part.kind]=part;seen.add(part.kind);
  }
  return Object.freeze({kind:'arm',parts:Object.freeze(values)});
}
function weightsAt(y, elbowY, twistY) {
  const zones=[['Shoulder','Elbow',elbowY,.06],['Elbow','ForearmTwist',twistY,.10],['ForearmTwist','Wrist',-.012,.024]];
  for(const [before,after,center,width] of zones){
    if(y<center-width/2)return [[before,1]];
    if(y<=center+width/2){const t=smooth((y-center+width/2)/width);return [[before,1-t],[after,t]];}
  }
  return [['Wrist',1]];
}
function cutCap(chart, segments, material) {
  const p=[],uv=[],center=chart.point(0,0);center.x=center.z=0;
  for(let i=0;i<segments;i++){
    const points=[center,chart.point((i+1)/segments,0),chart.point(i/segments,0)];
    for(const point of points){p.push(...point.toArray());uv.push(.5+point.x/.13,.5+point.z/.13);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
  const m=new THREE.Mesh(g,material.clone());m.name='ShoulderSection';return m;
}
/** One continuous arm chart; skeleton and skin transitions share the same chain landmarks. */
export function buildArm(component=arm(),{mode='baked',textureSize=256,color='#b98770'}={}) {
  if(component?.kind!=='arm')throw new Error('buildArm requires arm(...)');
  if(!['cage','sculpt','baked'].includes(mode))throw new Error('Invalid representation');
  const upper=component.parts.upperArm, lower=component.parts.forearm, definition=component.parts.elbow.definition;
  const length=upper.length+lower.length;
  const chain=jointChain({root:'Shoulder',origin:[0,-length,0]},link('Elbow',{length:upper.length}),link('ForearmTwist',{length:lower.length*.52}),link('Wrist',{length:lower.length*.48}));
  const t=chain.station('Elbow'), lowerT=v=>t+(1-t)*v;
  const end=buildHand(lower.end,{mode,textureSize,color}),port=end.userData.ports.wrist;
  const oldRig=end.getObjectByName('Palm').skeleton;
  const handSpec=oldRig.bones.filter(b=>!['Forearm','Wrist'].includes(b.name)).map(b=>({name:b.name,parent:b.parent.name,position:end.userData.landmarks[b.name]}));
  const rig=skeleton([...chain.spec,...handSpec]),root=new THREE.Group();root.name='ArmStudy';root.add(rig.root);
  const breadth=contour([[0,.042],[t*.20,.048],[t*.5,.040],[t,.029],[lowerT(.22),.035],[lowerT(.65),.027],[1,port.radii[0]]]);
  const depth=contour([[0,.040],[t*.18,.046],[t*.58,.035],[t,.026],[lowerT(.20),.028],[lowerT(.65),.019],[1,port.radii[1]]]);
  const form=sectionLoft({from:-length,to:0,breadth,depth,masses:[
    radialMass({at:t*.19,span:t*.23,angle:Math.PI/2,spread:1.1,amount:.006*upper.tone}),
    radialMass({at:t*.50,span:t*.32,angle:Math.PI,spread:.95,amount:.010*upper.tone}),
    radialMass({at:t*.51,span:t*.40,angle:0,spread:.9,amount:.007*upper.tone}),
    radialMass({at:t,span:.045,angle:0,spread:.60,amount:.004*definition}),
    radialMass({at:lowerT(.27),span:(1-t)*.30,angle:-Math.PI/2,spread:.7,amount:.004}),
  ]});
  const skinOptions=lower.end.parts.skin;
  const relief=layers(
    crease({from:[.29,t-.010],to:[.71,t+.009],width:.004,depth:.00025*skinOptions.creases}),
    crease({from:[.29,.975],to:[.70,.978],width:.003,depth:.00017*skinOptions.creases}),
    grain({amplitude:.000019*skinOptions.pores,frequency:64,seed:17}),
  );
  const chart=surface(form,{wrapU:true,detail:(u,v)=>relief(u,v)*smooth(v/.06)*smooth((1-v)/.025)});
  const mat=new THREE.MeshStandardMaterial({color,roughness:.64});mat.name='ArmSkinMaterial';
  const body=surfaceMesh('ArmSkin',chart,{mode,segments:[48,72],textureSize,material:mat});
  const bodySkin=skin(body.geometry,body.material,rig,p=>weightsAt(p.y,chain.at('Elbow').y,chain.at('ForearmTwist').y),'ArmSkin');bodySkin.userData=body.userData;root.add(bodySkin);
  const cap=cutCap(chart,48*(mode==='sculpt'?4:1),mat);root.add(skin(cap.geometry,cap.material,rig,()=>[['Shoulder',1]],cap.name));mat.dispose();
  end.traverse(part=>{
    if(!part.isMesh)return;
    if(part.name==='WristSection'){part.geometry.dispose();part.material.dispose();return;}
    const ix=part.geometry.attributes.skinIndex,w=part.geometry.attributes.skinWeight;
    const result=skin(part.geometry,part.material,rig,(_,i)=>[0,1,2,3].map(k=>[oldRig.bones[ix.array[i*4+k]].name,w.array[i*4+k]]).filter(([,v])=>v>0),part.name);
    result.userData=part.userData;root.add(result);
  });
  root.animations=[...end.animations,
    clip('ElbowFlex',[rotationTrack('Elbow',[[0,[0,0,0]],[1.2,[-90,0,0]],[2.4,[0,0,0]]])]),
    clip('ForearmTurn',[rotationTrack('ForearmTwist',[[0,[0,0,0]],[1,[0,60,0]],[2,[0,-40,0]],[3,[0,0,0]]])]),
  ];
  root.userData.landmarks={...end.userData.landmarks,...Object.fromEntries(chain.spec.map(j=>[j.name,j.position]))};delete root.userData.landmarks.Forearm;
  root.userData.ports={shoulder:{center:chain.at('Shoulder').toArray(),axis:[0,-1,0]},wrist:port};
  root.userData.representation=mode;root.userData.provenance='Procedural continuous section loft plus first-principles hand; no anatomical template vertices';
  root.userData.limitations='Shoulder is a study cut, not a torso attachment. Linear skinning can pinch at extreme flexion. Twist is a deformation approximation, not a radius/ulna simulation.';
  root.updateMatrixWorld(true);return root;
}
