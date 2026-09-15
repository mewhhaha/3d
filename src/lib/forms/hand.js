import * as THREE from 'three';
import { surface, surfaceMesh, profile, layers, mound, crease, grain, smooth } from './surface.js';
import { skeleton, skin, rotationTrack, clip } from '../rigging.js';
const TAU = 2 * Math.PI;
const v3 = (a) => new THREE.Vector3(...a);
const finite = (n, a, b, name) => { if (!Number.isFinite(n) || n < a || n > b) throw new Error(`${name} must be ${a}..${b}`); return n; };
const stage = (kind, values) => Object.freeze({ kind, ...values });
export const palm = ({ breadth = 1, arch = .45 } = {}) => stage('palm', { breadth: finite(breadth, .8, 1.2, 'breadth'), arch: finite(arch, 0, 1, 'arch') });
export const fingers = ({ spread = .3, curl = .1 } = {}) => stage('fingers', { spread: finite(spread, 0, 1, 'spread'), curl: finite(curl, 0, .7, 'curl') });
export const opposingThumb = ({ reach = 1 } = {}) => stage('thumb', { reach: finite(reach, .8, 1.2, 'thumb reach') });
export const skinDetail = ({ creases = 1, pores = .4 } = {}) => stage('skin', { creases: finite(creases, 0, 2, 'creases'), pores: finite(pores, 0, 1, 'pores') });
export function hand(...parts) {
  const defaults = [palm(), fingers(), opposingThumb(), skinDetail()];
  const values = Object.fromEntries(defaults.map(p => [p.kind, p])); const seen = new Set();
  for (const p of parts) {
    if (!p || !Object.hasOwn(values, p.kind) || seen.has(p.kind)) throw new Error('hand: unsupported or duplicate component');
    values[p.kind] = p; seen.add(p.kind);
  }
  return stage('hand', { parts: values });
}
export function forearm({ length = .255 } = {}, end = hand()) {
  if (end.kind !== 'hand') throw new Error('forearm requires a hand end component');
  return stage('forearm', { length: finite(length, .18, .34, 'forearm length'), end });
}
function cap(name, outer, holes, normal, mat) {
  // Real annulus with finger openings, not overlapping spheres.
  const contour = outer.map(p => new THREE.Vector2(p.x, p.z)), rings = holes.map(h => h.map(p => new THREE.Vector2(p.x, p.z)));
  const all = [outer, ...holes].flat(), uvpoints = [contour, ...rings].flat();
  const triangles = THREE.ShapeUtils.triangulateShape(contour, rings), position = [], uv = [];
  const box = new THREE.Box2().setFromPoints(uvpoints), size = box.getSize(new THREE.Vector2());
  for (const ids of triangles) {
    const [a,b,c]=ids.map(i=>all[i]);
    if (b.clone().sub(a).cross(c.clone().sub(a)).dot(normal) < 0) [ids[1],ids[2]]=[ids[2],ids[1]];
    for (const i of ids) { position.push(...all[i].toArray()); uv.push((uvpoints[i].x-box.min.x)/Math.max(size.x,1e-6),(uvpoints[i].y-box.min.y)/Math.max(size.y,1e-6)); }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
  const m=new THREE.Mesh(g,mat.clone());m.name=name;m.castShadow=m.receiveShadow=true;return m;
}
function endCap(name, ring, center, mat, reverse=false) {
  const p=[],uv=[];
  for(let i=0;i<ring.length;i++){
    const tri=[center,ring[i],ring[(i+1)%ring.length]];if(reverse)[tri[1],tri[2]]=[tri[2],tri[1]];
    for(const q of tri){p.push(...q.toArray());uv.push(.5,.5);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
  const m=new THREE.Mesh(g,mat.clone());m.name=name;return m;
}
function influence(names, v, boundaries, width=.10) {
  for(let k=0;k<boundaries.length;k++){
    const b=boundaries[k];
    if(v < b-width/2) return [[names[k],1]];
    if(v <= b+width/2){const t=smooth((v-b+width/2)/width);return [[names[k],1-t],[names[k+1],t]];}
  }
  return [[names.at(-1),1]];
}
/** Compile shared landmark data into skin, digit geometry and a deformation skeleton. */
export function buildHand(component = hand(), { mode='baked', textureSize=256, color='#b98770', side='right' } = {}) {
  if(!['hand','forearm'].includes(component.kind))throw new Error('buildHand: expected hand or forearm');
  if(!['right','left'].includes(side))throw new Error('side must be right or left');
  const armLength=component.kind==='forearm'?component.length:0, opts=(component.end||component).parts;
  const width=opts.palm.breadth, palmLength=.093;
  const mat=new THREE.MeshStandardMaterial({color,roughness:.64});mat.name='Skin';
  const nailmat=new THREE.MeshStandardMaterial({color:'#ceaca0',roughness:.4});nailmat.name='Nail';
  const root=new THREE.Group();root.name='HandStudy'; const entries=[],spec=[{name:'Forearm',position:[0,-armLength,0]}];
  spec.push({name:'Wrist',parent:'Forearm',position:[0,0,0]});
  const add=(part,weights)=>{entries.push({part,weights});return part;};
  const resolution=mode==='sculpt'?4:1;
  const options=(segments,material=mat)=>({mode,textureSize,segments,material});
  const skinFields=opts.skin;
  const wristX=.024*width,wristZ=.011;
  const rx=profile([[0,wristX],[.32,.039*width],[.72,.040*width],[1,.041*width]]);
  const rz=profile([[0,wristZ],[.32,.016],[.72,.013],[1,.014]]);
  const palmForm=(u,v)=>{
    const a=u*TAU,s=Math.sin(a),c=Math.cos(a);
    const x=rx(v)*s, z=rz(v)*c;
    const pad=.0035*opts.palm.arch*Math.exp(-(((u-.55)/.14)**2+((v-.42)/.28)**2));
    return [x,v*palmLength,z-pad*Math.sin(Math.PI*v)**2];
  };
  const palmRelief=layers(
    ...[-.1,0,.1].map((dx)=>mound({at:[dx,.63],radius:[.025,.25],height:.0007,wrapU:true})),
    crease({from:[.28,.78],to:[.7,.68],width:.018,depth:.00038*skinFields.creases}),
    crease({from:[.3,.59],to:[.67,.50],width:.015,depth:.0003*skinFields.creases}),
    crease({from:[.54,.17],to:[.68,.57],width:.02,depth:.00035*skinFields.creases}),
    grain({amplitude:.000028*skinFields.pores,frequency:32,seed:3}),
  );
  const hole={u0:.625,u1:.875,v0:.3,v1:.7};
  const palmChart=surface(palmForm,{wrapU:true,mask:(u,v)=>!(u>hole.u0&&u<hole.u1&&v>hole.v0&&v<hole.v1),detail:(u,v)=>{
    const d=Math.min(Math.abs(u-hole.u0),Math.abs(u-hole.u1),Math.abs(v-hole.v0),Math.abs(v-hole.v1));
    return palmRelief(u,v)*smooth(v/.1)*smooth((1-v)/.1)*smooth(d/.03);
  }});
  add(surfaceMesh('Palm',palmChart,options([48,20])),()=>[['Wrist',1]]);
  const digitSpecs=[['Index',-.0275,.079,.0076,-.015],['Middle',-.009,.090,.0084,-.002],['Ring',.010,.083,.0078,.01],['Little',.027,.064,.0063,.024]];
  const digitCharts=[];
  for(const [name,x,length,radius,lean] of digitSpecs){
    const center=(v)=>v3([x*width+lean*opts.fingers.spread*smooth(v),palmLength+length*v,-.005*v*v-.011*opts.fingers.curl*v*v]);
    const shape=profile([[0,1],[.12,1.03],[.32,.86],[.44,.98],[.59,.81],[.72,.88],[.84,.8],[.93,.66],[.98,.36],[1,.055]]);
    const form=(u,v)=>{const a=u*TAU,r=radius*shape(v);return center(v).add(v3([r*width*Math.sin(a),0,r*1.12*Math.cos(a)]));};
    const detail=layers(
      ...[.43,.72].flatMap(t=>[
        crease({from:[.27,t-.02],to:[.73,t],width:.013,depth:.00027*skinFields.creases}),
        crease({from:[.28,t+.024],to:[.72,t+.029],width:.011,depth:.00013*skinFields.creases}),
        mound({at:[0,t],radius:[.16,.035],height:.00035,wrapU:true}),
      ]),grain({amplitude:.000018*skinFields.pores,frequency:28,seed:length*100}),
    );
    const chart=surface(form,{wrapU:true,detail:(u,v)=>detail(u,v)*smooth(v/.1)*smooth((1-v)/.06)});
    digitCharts.push(chart);
    for(const [suffix,t,parent] of [['MCP',0,'Wrist'],['PIP',.43,`${name}_MCP`],['DIP',.72,`${name}_PIP`]])spec.push({name:`${name}_${suffix}`,parent,position:center(t).toArray()});
    const weight=(p,i,g)=>influence(['Wrist',`${name}_MCP`,`${name}_PIP`,`${name}_DIP`],g.attributes.uv.getY(i),[.06,.43,.72],.10);
    add(surfaceMesh(name,chart,options([20,28])),weight);
    const ring=Array.from({length:20*resolution},(_,i)=>chart.point(i/(20*resolution),1));
    add(endCap(`${name}_Tip`,ring,center(1),mat),()=>[[`${name}_DIP`,1]]);
    const nail=surface((u,v)=>{
      const vv=.79+.16*v, half=.105*(.75+.25*Math.sin(Math.PI*v));
      const uu=((u-.5)*2*half+1)%1;
      return chart.point(uu,vv).addScaledVector(chart.normal(uu,vv),.00028);
    });
    add(surfaceMesh(`${name}_Nail`,nail,{...options([8,8],nailmat),mode:'cage',subdivision:1}),()=>[[`${name}_DIP`,1]]);
  }
  const outer=Array.from({length:48*resolution},(_,i)=>palmChart.point(i/(48*resolution),1));
  const holes=digitCharts.map(chart=>Array.from({length:20*resolution},(_,i)=>chart.point(i/(20*resolution),0)));
  add(cap('KnuckleWeb',outer,holes,new THREE.Vector3(0,1,0),mat),()=>[['Wrist',1]]);
  const edge=(t)=>{
    const s=t*40;
    if(s<12)return palmChart.point(hole.u0+(hole.u1-hole.u0)*s/12,hole.v0);
    if(s<20)return palmChart.point(hole.u1,hole.v0+(hole.v1-hole.v0)*(s-12)/8);
    if(s<32)return palmChart.point(hole.u1-(hole.u1-hole.u0)*(s-20)/12,hole.v1);
    return palmChart.point(hole.u0,hole.v1-(hole.v1-hole.v0)*(s-32)/8);
  };
  const start=Array.from({length:40},(_,i)=>edge(i/40)).reduce((p,q)=>p.add(q),new THREE.Vector3()).multiplyScalar(1/40);
  const direction=v3([-.66,.72,.10]).normalize(), distance=.067*opts.thumb.reach;
  const b1=edge(0).sub(start);b1.addScaledVector(direction,-b1.dot(direction)).normalize();const b2=new THREE.Vector3().crossVectors(direction,b1).normalize();
  const thumbProfile=profile([[0,.012],[.28,.011],[.52,.009],[.7,.0088],[.87,.007],[.96,.004],[1,.0004]]);
  const thumbCenter=t=>start.clone().addScaledVector(direction,distance*t);
  const thumbForm=(u,v)=>{
    const r=thumbProfile(v),a=u*TAU;
    const oval=b1.clone().multiplyScalar(Math.cos(a)*r).addScaledVector(b2,Math.sin(a)*r*.9);
    return thumbCenter(v).add(edge(u).sub(start).lerp(oval,smooth(v/.33)));
  };
  const thumbDetail=layers(crease({from:[.25,.57],to:[.7,.61],depth:.0003*skinFields.creases}),grain({amplitude:.00002*skinFields.pores,frequency:24}));
  const thumbChart=surface(thumbForm,{wrapU:true,detail:(u,v)=>thumbDetail(u,v)*smooth(v/.3)*smooth((1-v)/.08)});
  spec.push({name:'Thumb_CMC',parent:'Wrist',position:start.toArray()},{name:'Thumb_MCP',parent:'Thumb_CMC',position:thumbCenter(.28).toArray()},{name:'Thumb_IP',parent:'Thumb_MCP',position:thumbCenter(.61).toArray()});
  add(surfaceMesh('Thumb',thumbChart,options([40,24])),(p,i,g)=>influence(['Wrist','Thumb_CMC','Thumb_MCP','Thumb_IP'],g.attributes.uv.getY(i),[.1,.28,.61]));
  add(endCap('Thumb_Tip',Array.from({length:40*resolution},(_,i)=>thumbChart.point(i/(40*resolution),1)),thumbCenter(1),mat),()=>[['Thumb_IP',1]]);
  if(armLength){
    const ax=profile([[0,.034*width],[.25,.038*width],[.55,.031*width],[.8,.025*width],[1,wristX]]),az=profile([[0,.027],[.25,.03],[.65,.022],[1,wristZ]]);
    const relief=layers(mound({at:[.03,.55],radius:[.02,.3],height:.0006,wrapU:true}),mound({at:[.9,.68],radius:[.018,.2],height:.0004}),crease({from:[.25,.96],to:[.75,.96],width:.009,depth:.00022*skinFields.creases}),grain({amplitude:.000028*skinFields.pores,frequency:42}));
    const forearmChart=surface((u,v)=>{const a=u*TAU;return[ax(v)*Math.sin(a)+.003*Math.sin(Math.PI*v),armLength*(v-1),az(v)*Math.cos(a)];},{wrapU:true,detail:(u,v)=>relief(u,v)*smooth(v/.1)*smooth((1-v)/.04)});
    add(surfaceMesh('ForearmSkin',forearmChart,options([48,40])),p=>influence(['Forearm','Wrist'],p.y,[-.02],.04));
    const ring=Array.from({length:48*resolution},(_,i)=>forearmChart.point(i/(48*resolution),0));
    add(endCap('ElbowSection',ring,v3([0,-armLength,0]),mat,true),()=>[['Forearm',1]]);
  }else{
    const ring=Array.from({length:48*resolution},(_,i)=>palmChart.point(i/(48*resolution),0));
    add(endCap('WristSection',ring,new THREE.Vector3(),mat,true),()=>[['Wrist',1]]);
  }
  const rig=skeleton(spec);root.add(rig.root);
  for(const {part,weights} of entries){
    const m=skin(part.geometry,part.material,rig,(p,i)=>weights(p,i,part.geometry),part.name);m.userData=part.userData;m.userData.anatomyPart=part.name;root.add(m);
  }
  mat.dispose();nailmat.dispose();
  root.animations=[clip('Grasp',digitSpecs.flatMap(([n])=>[
    rotationTrack(`${n}_MCP`,[[0,[0,0,0]],[1.1,[-50,0,0]],[2.2,[0,0,0]]]),
    rotationTrack(`${n}_PIP`,[[0,[0,0,0]],[1.1,[-65,0,0]],[2.2,[0,0,0]]]),
    rotationTrack(`${n}_DIP`,[[0,[0,0,0]],[1.1,[-35,0,0]],[2.2,[0,0,0]]]),
  ])),clip('WristFlex',[rotationTrack('Wrist',[[0,[0,0,0]],[1,[-30,0,0]],[2,[20,0,0]],[3,[0,0,0]]])])];
  root.userData.landmarks=Object.fromEntries(spec.map(j=>[j.name,j.position]));
  root.userData.provenance='First-principles procedural hand; no anatomical template vertices';
  root.userData.representation=mode;
  if(side==='left'){
    root.traverse(o=>{if(o.isBone)o.position.x*=-1;if(!o.isMesh)return;const g=o.geometry;for(const key of ['position','normal','tangent']){const a=g.attributes[key];if(a)for(let i=0;i<a.count;i++){a.setX(i,-a.getX(i));if(key==='tangent')a.setW(i,-a.getW(i));}}
      for(const attr of Object.values(g.attributes))for(let i=0;i<attr.count;i+=3)for(let k=0;k<attr.itemSize;k++){const a=(i+1)*attr.itemSize+k,b=(i+2)*attr.itemSize+k;[attr.array[a],attr.array[b]]=[attr.array[b],attr.array[a]];}
    });
    root.updateMatrixWorld(true);rig.skeleton.calculateInverses();
    for(const p of Object.values(root.userData.landmarks))p[0]*=-1;
  }
  root.updateMatrixWorld(true);return root;
}
