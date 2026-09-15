import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { computeTangents } from '../tangents.js';
import { hand } from './hand.js';
import { deformCage, softMove } from './cage-shape.js';
import { quadCage, growFace, atlasCage, subdivideCage, displaceCage, cageGeometry } from './cage.js';
import { contour } from './structure.js';
import { smooth, surface, surfaceMesh, bakeNormals } from './surface.js';
import { normalSampler } from './fair.js';
import { skeleton, skin, rotationTrack, clip } from '../rigging.js';
import { projectMesh } from '../characters/surface-fitting.js';
const V = p => new THREE.Vector3(...p);
const clamp = t => Math.min(1, Math.max(0, t));

/** Broad palm volume with named distal and thumb sockets, all in one closed quad graph. */
export function palmHull({ breadth = 1, arch = .45 } = {}) {
  if (!Number.isFinite(breadth) || breadth < .8 || breadth > 1.2 || !Number.isFinite(arch) || arch < 0 || arch > 1) throw new Error('Invalid palm proportions');
  const xs = [-.043, -.037, -.021, -.018, -.001, .002, .018, .021, .035, .041];
  const ys = [0, .017, .041, .066, .085], zs = [-1, -.70, .70, 1];
  const width = contour([[0,.67],[.25,.86],[.6,1.03],[1,1]]);
  const depth = contour([[0,.012],[.40,.019],[.7,.017],[1,.013]]);
  const points = [], faces = [], ids = new Map(), nx = xs.length-1, ny = ys.length-1, nz = zs.length-1;
  const id = (i,j,k) => {
    const key = `${i}:${j}:${k}`;
    if (!ids.has(key)) {
      const u = xs[i]/.043, t = ys[j]/ys.at(-1), z = zs[k];
      const crown = Math.sqrt(1 - .58*u*u);
      const p = [xs[i]*breadth*width(t)*Math.sqrt(1-.12*z*z), ys[j] + smooth((t-.5)/.5)*(-.008*u*u-.002*u),
        z*depth(t)*crown - .002*arch*Math.sin(Math.PI*t)**2];
      ids.set(key, points.length); points.push(p);
    }
    return ids.get(key);
  };
  const face = (tag, corners) => faces.push({tag, vertices:corners.map(p=>id(...p))});
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
    face(`Dorsal${i}_${j}`,[[i,j,nz],[i+1,j,nz],[i+1,j+1,nz],[i,j+1,nz]]);
    face(`Palmar${i}_${j}`,[[i,j,0],[i,j+1,0],[i+1,j+1,0],[i+1,j,0]]);
  }
  for(let i=0;i<nx;i++)for(let k=0;k<nz;k++){
    face(`Distal${i}_${k}`,[[i,ny,k],[i,ny,k+1],[i+1,ny,k+1],[i+1,ny,k]]);
    face(`Wrist${i}_${k}`,[[i,0,k],[i+1,0,k],[i+1,0,k+1],[i,0,k+1]]);
  }
  for(let j=0;j<ny;j++)for(let k=0;k<nz;k++){
    face(`Radial${j}_${k}`,[[0,j,k],[0,j,k+1],[0,j+1,k+1],[0,j+1,k]]);
    face(`Ulnar${j}_${k}`,[[nx,j,k],[nx,j+1,k],[nx,j+1,k+1],[nx,j,k+1]]);
  }
  return deformCage(quadCage(points, faces),
    softMove({center:[0,.048,.015],radius:[.048,.046,.016],offset:[0,0,.003]}),
    softMove({center:[-.023,.029,-.012],radius:[.020,.035,.016],offset:[-.001,0,-.005]}),
    softMove({center:[.025,.034,-.012],radius:[.016,.033,.015],offset:[0,0,-.003]}),
    softMove({center:[0,.052,-.014],radius:[.019,.023,.012],offset:[0,0,.002]}),
  );
}

/** The same semantic hand definition now compiles by growing ports, not filling holes. */
export function handCage(definition = hand()) {
  if (definition?.kind !== 'hand') throw new Error('handCage requires hand(...)');
  const {palm:p, fingers:f, thumb:t, skin:detail} = definition.parts;
  let cage = palmHull(p);
  const digits = [];
  const describe = (name, socket, length, radius, lean, thumb=false) => {
    const face = cage.faces.find(f=>f.tag===socket);
    const origin = face.vertices.reduce((s,i)=>s.add(V(cage.points[i])),new THREE.Vector3()).multiplyScalar(.25);
    const direction = thumb ? V([-.77,.63,-.06]).normalize() : V([lean*f.spread,1,-.04-.10*f.curl]).normalize();
    const across = V([direction.y,-direction.x,0]).normalize();
    const front = new THREE.Vector3().crossVectors(across,direction).normalize();
    // A regular four-sided cage is rounded by subdivision; allow for that shrinkage.
    const shape = contour([[0,1.12],[.16,1.13],[.37,1.03],[.43,1.08],[.52,.99],[.70,.95],[.76,.92],[.90,.84],[.985,.55],[1,.35]]);
    const stations = [.09,.23,.37,.44,.55,.68,.75,.87,.955,1];
    const center = s => origin.clone().addScaledVector(direction,length*s);
    const ring = s => {
      const c = center(s), r = radius*1.24*shape(s);
      // Distal socket corners wind toward +Y; radial socket winds toward -X.
      const signs = [[-1,-1],[-1,1],[1,1],[1,-1]];
      // across x front = -direction, so increasing front then across gives +direction.
      return signs.map(([a,b])=>c.clone().addScaledVector(across,r*a).addScaledVector(front,r*.95*b).toArray());
    };
    cage = growFace(cage, socket, stations.map(ring), {name});
    digits.push({name,origin,direction,across,front,length,radius,center,thumb});
  };
  describe('Index','Distal1_1',.081,.0079,-.16);
  describe('Middle','Distal3_1',.091,.0084,-.02);
  describe('Ring','Distal5_1',.084,.0079,.11);
  describe('Little','Distal7_1',.067,.0068,.30);
  // Side-face coordinates have +Y as their across direction, not +X.
  describe('Thumb','Radial1_1',.065*t.reach,.0105,0,true);
  return {cage,digits,detail};
}

/** Object-space relief is shared across every chart: creases cannot crack the geometry. */
export function handRelief({digits,detail}) {
  return (p,n) => {
    let d = .000016*detail.pores*Math.sin(p.x*5100+.4*Math.sin(p.y*2300))*Math.sin(p.y*5900)*Math.sin(p.z*4700);
    for(const digit of digits){
      const q=p.clone().sub(digit.origin), v=q.dot(digit.direction)/digit.length;
      if(v<.15||v>.88)continue;
      const distance=q.clone().addScaledVector(digit.direction,-q.dot(digit.direction)).length();
      if(distance>digit.radius*1.5)continue;
      const palmSide=smooth((-n.dot(digit.front)+.1)/.9);
      for(const station of [.43,.72])d-=.00024*detail.creases*palmSide*Math.exp(-2*((v-station)/.013)**2);
    }
    if(p.y>.014&&p.y<.073){
      const mask=smooth((p.y-.014)/.008)*smooth((.073-p.y)/.009)*smooth((-n.z-.2)/.5);
      const a=p.y-(.059-.10*p.x),b=p.y-(.042+.19*p.x);
      d-=mask*detail.creases*(.00022*Math.exp(-2*(a/.0014)**2)+.00016*Math.exp(-2*(b/.0012)**2));
    }
    return d;
  };
}

function rigDefinition(digits){
  const spec=[{name:'Forearm',position:[0,-.018,0]},{name:'Wrist',parent:'Forearm',position:[0,0,0]}];
  for(const digit of digits){
    const labels=digit.thumb?['CMC','MCP','IP']:['MCP','PIP','DIP'];
    const stations=digit.thumb?[0,.30,.61]:[0,.43,.72];
    labels.forEach((label,i)=>spec.push({name:`${digit.name}_${label}`,parent:i?`${digit.name}_${labels[i-1]}`:'Wrist',position:digit.center(stations[i]).toArray()}));
    digit.labels=labels;digit.stations=stations;
  }
  return spec;
}
function skinWeights(digits,p){
  // Spatially smooth support at shared web vertices; both sides evaluate the same rule.
  const candidates=digits.map(d=>{
    const q=p.clone().sub(d.origin),along=q.dot(d.direction),v=along/d.length;
    const dist=q.clone().addScaledVector(d.direction,-Math.max(0,along)).length();
    const support=1-smooth((dist/d.radius-1.45)/.60);
    const score=support*Math.exp(-2*(dist/d.radius)**2)*smooth((v+.13)/.29);
    return {d,v,score,support};
  }).sort((a,b)=>b.score-a.score).slice(0,2);
  const total=candidates.reduce((s,c)=>s+c.score,0);
  // Ownership chooses a digit; longitudinal blending chooses where it leaves the palm.
  // Do not leak radial falloff back into Wrist weights at the distal finger.
  const activation=smooth((candidates[0].v+.12)/.30)*candidates[0].support;
  const values=new Map([['Wrist',1-activation]]);
  for(const {d,v,score}of candidates){
    const amount=activation*score/(total||1);if(amount<1e-5)continue;
    let i=0,t=0;
    for(let j=1;j<3;j++){
      const b=d.stations[j];
      if(v>b+.055){i=j;continue;}
      if(v>=b-.055){i=j-1;t=smooth((v-b+.055)/.11);}break;
    }
    for(const [joint,w]of [[`${d.name}_${d.labels[i]}`,1-t],[`${d.name}_${d.labels[Math.min(2,i+1)]}`,t]])if(w>0)values.set(joint,(values.get(joint)||0)+w*amount);
  }
  return [...values].filter(([,v])=>v>1e-5).sort((a,b)=>b[1]-a[1]).slice(0,4);
}

/** Compile one connected skinned hand, with a single normal atlas and independent nails. */
export function buildCageHand(definition=hand(),{mode='baked',textureSize=1024,lowLevel=2,highLevel=4,color='#b98c76'}={}){
  if(!['cage','sculpt','baked'].includes(mode)||!Number.isInteger(lowLevel)||lowLevel<1||lowLevel>3||!Number.isInteger(highLevel)||highLevel<=lowLevel||highLevel>4)throw new Error('Invalid detail representation');
  const structure=handCage(definition),{digits}=structure,atlas=atlasCage(structure.cage,{size:textureSize,gutter:4});
  const low=cageGeometry(subdivideCage(atlas,lowLevel));let geometry=low,high;
  const material=new THREE.MeshStandardMaterial({color,roughness:.68});material.name='ContinuousSkin';
  if(mode!=='cage'){
    high=cageGeometry(displaceCage(subdivideCage(atlas,highLevel),handRelief(structure)));
    if(mode==='sculpt'){geometry=high;low.dispose();}
    else{
      const source=normalSampler(high);
      material.normalMap=bakeNormals({normal:(u,v)=>source(u,v),wrapU:false},low,{size:textureSize});
      material.normalMap.name='ContinuousHand_Normal';
      material.normalMap.userData.bake.method='Shared quad cage / Catmull-Clark / exact face-varying UV correspondence';
      material.normalMap.userData.bake.boundaryExtension={...source.stats}; high.dispose();
    }
  }
  const spec=rigDefinition(digits),rig=skeleton(spec),root=new THREE.Group();root.name='CageHandStudy';root.add(rig.root);
  const body=skin(geometry,material,rig,p=>skinWeights(digits,p),'ContinuousHand');root.add(body);
  body.userData.surface={representation:mode,chart:'HandAtlas',source:'Shared procedural branching quad cage',...(material.normalMap?{bake:material.normalMap.userData.bake}:{})};
  const project=projectMesh(body),nailMaterial=new THREE.MeshStandardMaterial({color:'#c49c8a',roughness:.38});nailMaterial.name='NailKeratin';
  for(const digit of digits){
    const chart=surface((u,v)=>{
      const a=2*u-1,b=2*v-1;
      const x=a*Math.sqrt(1-.42*b*b),y=b*Math.sqrt(1-.42*a*a);
      const c=digit.center(.837+.084*y);
      c.addScaledVector(digit.across,x*digit.radius*.62);
      c.z=project(c.x,c.y)+.00012+.00022*(1-x*x)*(1-y*y);return c;
    });
    const plate=surfaceMesh(`${digit.name}_Nail`,chart,{mode:'cage',segments:[8,8],material:nailMaterial});
    // Projected triangle slopes are not a smooth nail normal field. Reconstruct the
    // indexed patch normals before the Mikk split, rather than differentiating facets.
    plate.geometry.deleteAttribute('normal'); plate.geometry.deleteAttribute('tangent');
    const smoothPlate=mergeVertices(plate.geometry,1e-7); plate.geometry.dispose();
    smoothPlate.computeVertexNormals(); computeTangents(smoothPlate);
    root.add(skin(smoothPlate,plate.material,rig,p=>skinWeights(digits,p),plate.name));
  }
  nailMaterial.dispose();
  root.animations=[clip('Grasp',digits.filter(d=>!d.thumb).flatMap(d=>d.labels.map((label,i)=>rotationTrack(`${d.name}_${label}`,[[0,[0,0,0]],[1.1,[-[45,60,30][i],0,0]],[2.2,[0,0,0]]])))),
    clip('WristFlex',[rotationTrack('Wrist',[[0,[0,0,0]],[1,[-25,0,0]],[2,[20,0,0]],[3,[0,0,0]]])])];
  root.userData.landmarks=Object.fromEntries(spec.map(j=>[j.name,j.position]));root.userData.representation=mode;
  root.userData.cage={controlQuads:atlas.faces.length,geometricVertices:atlas.points.length,lowLevel,highLevel,atlas:atlas.atlas};
  root.userData.provenance='First-principles procedural quad hull and socket extrusion; no template vertices or scans';
  root.userData.limitations='One connected skin mesh, but UV corner duplicates remain. Closed wrist study; not integrated into the old arm. Illustrative grasp, not contact or tendon simulation. Per-control-face atlas is not a production hand unwrap.';
  root.updateMatrixWorld(true);return root;
}

/** Portable editable construction source, separate from the evaluated triangle asset. */
export function cageHandSource(definition=hand(),{textureSize=1024,lowLevel=2,highLevel=4}={}){
  if(!Number.isInteger(lowLevel)||lowLevel<1||lowLevel>3||!Number.isInteger(highLevel)||highLevel<=lowLevel||highLevel>4)throw new Error('Invalid source subdivision levels');
  const {cage,digits}=handCage(definition), mapped=atlasCage(cage,{size:textureSize,gutter:4}), joints=rigDefinition(digits);
  const weights=mapped.points.map(p=>{
    const values=skinWeights(digits,V(p)),total=values.reduce((s,[,w])=>s+w,0);
    return values.map(([name,w])=>[name,w/total]);
  });
  return {format:'procedural-quad-cage',version:1,units:'meters',up:'Y',forward:'Z',
    points:mapped.points,faces:mapped.faces.map(f=>({vertices:f.vertices,uv:f.uv,tag:f.tag})),
    joints,weights,subdivision:{scheme:'Catmull-Clark',viewport:lowLevel,render:highLevel,uvInterpolation:'bilinear-per-face'},
    atlas:mapped.atlas,notes:'Editable primary form, not the evaluated detail bake. Native subdivision and interpolated control weights can differ from compiled skin. JS relief and nails are not replayed by this control object.'};
}
