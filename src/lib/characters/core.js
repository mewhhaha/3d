import data from '../../generated/human-data.js';
import { THREE, group, dispose } from '../modeling.js';
import { skeleton, skin, clip, rotationTrack, morphTarget } from '../rigging.js';
import { pbrMaterial } from '../textures.js';
import { subdivide, geometryFrom, normalsFor, faceCenter } from './topology.js';
const validNumber=(n,min,max,label)=>{if(!Number.isFinite(n)||n<min||n>max)throw new Error(`${label} must be ${min}..${max}`);return n;};
export const stage=(name,run)=>Object.freeze({name,run});
export function composeCharacter({name='Character',height=1.72,quality='studio'}={},...stages) {
  validNumber(height,1.4,2.1,'height');if(!['draft','studio','fine'].includes(quality))throw new Error('Unknown character quality');
  const root=group(name),ctx={root,height,quality,textureSize:quality==='fine'?1024:quality==='studio'?512:256,components:[],cover:[],parts:[],materials:new Map()};
  ctx.material=(kind,color)=>{const key=`${kind}:${color}`;if(!ctx.materials.has(key))ctx.materials.set(key,pbrMaterial(kind,{color,size:ctx.textureSize,name:key}));return ctx.materials.get(key);};
  ctx.anchor=name=>{if(!ctx.anchors?.[name])throw new Error(`Unknown anatomical anchor: ${name}`);return new THREE.Vector3(...ctx.anchors[name]);};
  ctx.add=(object,bind='Chest',weights=null)=>{ctx.parts.push({object,bind,weights});return object;};
  try {
    for(const item of stages.flat(Infinity).filter(Boolean)){
      if(typeof item?.run!=='function')throw new Error('Character components must be stages');
      if(ctx.components.includes(item.name))throw new Error(`Duplicate component: ${item.name}`);
      item.run(ctx);ctx.components.push(item.name);
    }
    if(!ctx.body)throw new Error('anatomy() must be the first character component');
    const visible={...ctx.body,faces:ctx.body.faces.filter(f=>!ctx.cover.some(mask=>mask(faceCenter(f,ctx.body.points),f)))};
    const skinSurface=geometryFrom(visible);const skinMat=ctx.material('skin',ctx.skinColor);skinMat.vertexColors=true;skinMat.roughness=.9;
    const skinObject=new THREE.Mesh(skinSurface.geometry,skinMat);skinObject.name='AnatomicalSkin';ctx.parts.unshift({object:skinObject,weights:skinSurface.weights,bind:'Head'});
    const rig=skeleton(ctx.joints);root.add(rig.root);
    for(const {object,bind,weights} of ctx.parts){
      object.updateMatrixWorld(true);const meshes=[];object.traverse(n=>{if(n.isMesh)meshes.push(n);});
      for(const [i,part] of meshes.entries()){
        const g=part.geometry;g.applyMatrix4(part.matrixWorld);if(!g.attributes.tangent&&g.attributes.uv&&g.index)g.computeTangents();
        const m=skin(g,part.material,rig,(_,v)=>weights?weights[v]:[[bind,1]],meshes.length===1?object.name:`${object.name}_${i}`);
        m.frustumCulled=false;root.add(m);if(object.userData.breath)morphTarget(m,'Breath',p=>new THREE.Vector3(p.x*.006,0,p.z*.012));
      }
    }
    root.animations=(ctx.animators||[]).map(fn=>fn(ctx));
    root.userData={components:ctx.components,anatomicalSource:{project:'MakeHuman',revision:data.revision,license:data.license},landmarks:ctx.anchors,coverage:'Covered anatomical faces removed; fitted clothing shares body coordinates and weights'};
    root.scale.setScalar(height/data.height);return root;
  }catch(error){dispose(root);for(const {object} of ctx.parts)dispose(object);throw error;}
}
export function anatomy({skin='#b98168',build='athletic'}={}) {return stage('anatomy',ctx=>{
  if(ctx.body)throw new Error('Only one anatomical foundation may be composed');
  if(!['athletic','slender'].includes(build))throw new Error('Unknown adult build');
  ctx.skinColor=skin;ctx.anchors=structuredClone(data.anchors);
  const points=data.points.map(p=>p.slice());
  const stance=p=>{const t=THREE.MathUtils.smoothstep(.95-p[1],0,.7);p[0]*=1-.28*t;return p;};
  points.forEach(stance);Object.values(ctx.anchors).forEach(stance);
  if(build==='slender'){for(const p of points)if(p[1]<1.45)p[0]*=.96;for(const p of Object.values(ctx.anchors))if(p[1]<1.45)p[0]*=.96;}
  const colors=points.map((p,i)=>{const lip=Math.min(1,data.lip[i]*1.2),c=new THREE.Color(1,1,1);c.lerp(new THREE.Color('#af706c'),lip*.75);return c.toArray();});
  const faces=data.faces.body.map(f=>({ids:f.map(v=>v[0]),uv:f.map(v=>data.uvs[v[1]])}));
  ctx.body=subdivide({points,faces,weights:data.weights,colors},ctx.quality==='draft'?0:1);
  ctx.normals=normalsFor(ctx.body.points,ctx.body.faces);
  const envelope=new Map(),step=.004;
  for(const p of ctx.body.points){const key=`${Math.round(p[0]/step)},${Math.round(p[1]/step)}`;let e=envelope.get(key);if(!e){e={front:-Infinity,back:Infinity};envelope.set(key,e);}e.front=Math.max(e.front,p[2]);e.back=Math.min(e.back,p[2]);}
  const samples=new Map();
  ctx.frontAt=(x,y,side=1)=>{
    const key=`${x.toFixed(5)},${y.toFixed(5)},${side}`;if(samples.has(key))return samples.get(key);
    let best=Infinity,z=0;const ix=Math.round(x/step),iy=Math.round(y/step);
    for(let range=1;range<=4&&best===Infinity;range++)for(let dx=-range;dx<=range;dx++)for(let dy=-range;dy<=range;dy++){
      const e=envelope.get(`${ix+dx},${iy+dy}`);if(!e)continue;const d=((ix+dx)*step-x)**2+((iy+dy)*step-y)**2;
      if(d<best){best=d;z=side>0?e.front:e.back;}
    }
    if(best===Infinity)for(const p of ctx.body.points){if(Math.sign(p[2]-.015)!==side)continue;const d=(p[0]-x)**2+(p[1]-y)**2;if(d<best){best=d;z=p[2];}}
    samples.set(key,z);return z;
  };
  const a=ctx.anchors,j=(name,parent,key)=>({name,parent,position:a[key]});
  ctx.joints=[{name:'Root',position:[0,0,0]},j('Hips','Root','pelvis'),j('Spine','Hips','spine-3'),j('Chest','Spine','spine-1'),j('Neck','Chest','neck'),{name:'Head',parent:'Neck',position:[0,1.51,.037]}];
  for(const s of ['l','r']){const S=s.toUpperCase();ctx.joints.push(j(`${S}_Clavicle`,'Chest',`${s}-clavicle`),j(`${S}_UpperArm`,`${S}_Clavicle`,`${s}-shoulder`),j(`${S}_Forearm`,`${S}_UpperArm`,`${s}-elbow`),j(`${S}_Hand`,`${S}_Forearm`,`${s}-hand`),j(`${S}_Thigh`,'Hips',`${s}-upper-leg`),j(`${S}_Shin`,`${S}_Thigh`,`${s}-knee`),j(`${S}_Foot`,`${S}_Shin`,`${s}-ankle`));
    for(let digit=1;digit<=5;digit++)for(let joint=1;joint<=3;joint++)ctx.joints.push(j(`${S}_Finger${digit}_${joint}`,joint===1?`${S}_Hand`:`${S}_Finger${digit}_${joint-1}`,`${s}-finger-${digit}-${joint}`));
  }
});}
export function fitSurface(ctx,{name,select,ease=.012,folds=()=>0,color='#575343',kind='cloth',breath=false}) {
  if(!ctx.body)throw new Error(`${name} requires anatomy() first`);validNumber(ease,0,.08,'ease');
  const faces=ctx.body.faces.filter(f=>select(faceCenter(f,ctx.body.points),f));
  if(!faces.length)throw new Error(`${name} selected no anatomical faces`);
  const points=ctx.body.points.map((p,i)=>p.map((v,k)=>v+ctx.normals[i][k]*(ease+folds(p))));
  const g=geometryFrom({...ctx.body,points,faces,colors:points.map(()=>[1,1,1])});
  const object=new THREE.Mesh(g.geometry,ctx.material(kind,color));object.name=name;object.userData.breath=breath;
  ctx.cover.push(select);ctx.add(object,'Chest',g.weights);return object;
}
export const wear=(...garments)=>stage('outfit',ctx=>{for(const g of garments.flat().filter(Boolean)){if(!g?.run)throw new Error('wear expects garment functions');g.run(ctx);ctx.components.push(g.name);}});
export const equip=(...items)=>stage('equipment',ctx=>{for(const i of items.flat().filter(Boolean)){if(!i?.run)throw new Error('equip expects equipment functions');i.run(ctx);ctx.components.push(i.name);}});
export const animate=(...clips)=>stage('animation',ctx=>{ctx.animators=clips;});
export function idle(){return ()=>clip('Idle',[rotationTrack('Head',[[0,[0,-2,0]],[2,[0,2,0]],[4,[0,-2,0]]]),new THREE.NumberKeyframeTrack('FieldShirt.morphTargetInfluences[Breath]',[0,2,4],[0,1,0])]);}
export function walk(){return ()=>clip('Walk', ['L','R'].flatMap((s,i)=>{const sign=i?1:-1;return [rotationTrack(`${s}_Thigh`,[[0,[sign*13,0,0]],[.6,[-sign*13,0,0]],[1.2,[sign*13,0,0]]]),rotationTrack(`${s}_Shin`,[[0,[-5,0,0]],[.6,[-20,0,0]],[1.2,[-5,0,0]]]),rotationTrack(`${s}_UpperArm`,[[0,[-sign*7,0,0]],[.6,[sign*7,0,0]],[1.2,[-sign*7,0,0]]])];}));}
export function wave(){return ()=>clip('Wave',[rotationTrack('L_UpperArm',[[0,[0,0,0]],[.7,[0,0,78]],[2,[0,0,78]],[2.7,[0,0,0]]]),rotationTrack('L_Forearm',[[0,[0,0,0]],[.7,[0,0,70]],[1.2,[18,0,70]],[1.7,[-18,0,70]],[2.2,[0,0,70]],[2.7,[0,0,0]]])]);}
