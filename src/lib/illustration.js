import * as THREE from 'three';
import {selectionWeights} from './geometry-sculpt.js';

const vector=(p,label)=>{
  if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))throw new Error(`${label} needs three finite values`);
  return new THREE.Vector3(...p);
};
function staticGeometry(g){
  if(!g?.isBufferGeometry||!g.index||!g.attributes.position||!g.attributes.normal)throw new Error('Indexed geometry with positions and normals required');
  if(g.attributes.skinIndex||g.attributes.skinWeight||Object.keys(g.morphAttributes).length)throw new Error('Illustration edits require static, pre-rig geometry');
}
/** Geometry-local ellipsoid-gradient field. Shape and shading remain separate. */
export function ellipsoidNormalField({center=[0,0,0],radii=[1,1,1]}={}){
  const c=vector(center,'center'),r=vector(radii,'radii');
  if(Math.min(r.x,r.y,r.z)<=0)throw new Error('Normal field radii must be positive');
  return p=>{const n=vector(p,'point').sub(c).divide(r).divide(r);if(n.lengthSq()<1e-24)throw new Error('Normal field is undefined at its center');return n.normalize().toArray();};
}
/** Own a copy; edit only shading normals, never positions/UVs/indices. Max angle is degrees.
 * Run AFTER shape edits and BEFORE normal baking. Old tangents are explicitly invalidated. */
export function directNormals(geometry,{field,selection=()=>1,maxAngle=75}={}){
  staticGeometry(geometry);
  if(typeof field!=='function'||!Number.isFinite(maxAngle)||maxAngle<0||maxAngle>180)throw new Error('Invalid normal direction field');
  const weights=selectionWeights(geometry,selection);
  const g=geometry.clone(),p=g.attributes.position,n=g.attributes.normal;
  const limit=THREE.MathUtils.degToRad(maxAngle);
  try{
    for(let i=0;i<p.count;i++){
      const position=[p.getX(i),p.getY(i),p.getZ(i)],a=new THREE.Vector3().fromBufferAttribute(n,i).normalize(),w=weights[i];
      if(!Number.isFinite(w)||w<0||w>1)throw new Error('Normal field weight must be 0..1');
      if(w===0)continue;
      const b=vector(field(position.slice()),'field result');if(b.lengthSq()<1e-24)throw new Error('Normal field returned zero');b.normalize();
      const angle=a.angleTo(b),fraction=angle>0?Math.min(w,limit/angle):0;
      const q=new THREE.Quaternion().setFromUnitVectors(a,b),rotation=new THREE.Quaternion().slerp(q,fraction);
      a.applyQuaternion(rotation).normalize();n.setXYZ(i,a.x,a.y,a.z);
    }
    g.deleteAttribute('tangent');
    g.userData.illustrationNormals={method:'bounded spherical normal-field blend',maxAngle,tangents:'invalidated; rebake detail after changing shading normals'};
    return g;
  }catch(e){g.dispose();throw e;}
}
/** An exportable reversed-winding shell. Width is geometry-local meters, not pixels.
 * Use geometric normals, not art-directed ones, to avoid swollen nose/cheek outlines. */
export function inkHull(geometry,{width=.0006,color='#332c35',name='Ink hull'}={}){
  staticGeometry(geometry);if(!Number.isFinite(width)||width<=0)throw new Error('Outline width must be positive');
  const g=geometry.clone();g.computeVertexNormals();const p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<p.count;i++){p.setXYZ(i,p.getX(i)+width*n.getX(i),p.getY(i)+width*n.getY(i),p.getZ(i)+width*n.getZ(i));n.setXYZ(i,-n.getX(i),-n.getY(i),-n.getZ(i));}
  for(let i=0;i<g.index.count;i+=3){const b=g.index.getX(i+1);g.index.setX(i+1,g.index.getX(i+2));g.index.setX(i+2,b);}
  g.deleteAttribute('tangent');g.computeBoundingBox();g.computeBoundingSphere();g.clearGroups();
  const m=new THREE.MeshBasicMaterial({color});m.name=name;
  const result=new THREE.Mesh(g,m);result.name=name;result.userData.illustrationOutline=true;return result;
}
export {twoToneMaterial,hydrateTwoTone} from './illustration-material.js';
