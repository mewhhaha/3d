import * as THREE from 'three';
import { mesh } from './modeling.js';
import { transportedFrames } from './curve-frame.js';

const finite2=(value,label)=>{
  if(!Array.isArray(value)||value.length!==2||!value.every(Number.isFinite))throw new Error(`${label} must contain two finite numbers`);
  return value;
};
const count=(value,label,min=1,max=2048)=>{
  if(!Number.isInteger(value)||value<min||value>max)throw new Error(`${label} must be an integer in ${min}..${max}`);
  return value;
};
function pathCurve(path,closed){
  if(path?.isCurve||typeof path?.getPointAt==='function')return path;
  if(!Array.isArray(path)||path.length<2||!path.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)))throw new Error('profileSweep path must be a Three.js curve or at least two finite XYZ points');
  return new THREE.CatmullRomCurve3(path.map(p=>new THREE.Vector3(...p)),closed,'centripetal');
}
function normalizedProfile(profile,closedProfile){
  if(!Array.isArray(profile)||profile.length<(closedProfile?3:2))throw new Error(`profileSweep profile needs at least ${closedProfile?3:2} points`);
  const points=profile.map((p,i)=>new THREE.Vector2(...finite2(p,`profile point ${i}`)));
  if(points.length>1&&points[0].distanceTo(points.at(-1))<1e-12)points.pop();
  if(points.length<(closedProfile?3:2))throw new Error(`profileSweep profile needs at least ${closedProfile?3:2} distinct points`);
  for(let i=1;i<points.length;i++)if(points[i].distanceTo(points[i-1])<1e-12)throw new Error('profileSweep profile contains duplicate adjacent points');
  if(closedProfile&&points[0].distanceTo(points.at(-1))<1e-12)throw new Error('profileSweep profile contains a duplicate closing point');
  return points;
}
function vector2At(value,t,index,label,{positive=false}={}){
  const resolved=typeof value==='function'?value(t,index):value;
  if(Array.isArray(resolved)&&resolved.length===2&&resolved.every(n=>Number.isFinite(n)&&(!positive||n>0)))return resolved;
  throw new Error(`profileSweep ${label} must be a ${positive?'positive ':''}[x,y] or function returning one`);
}
function scaleAt(scale,t,index){
  const value=typeof scale==='function'?scale(t,index):scale;
  if(Number.isFinite(value)&&value>0)return [value,value];
  if(Array.isArray(value))return vector2At(value,t,index,'scale',{positive:true});
  throw new Error('profileSweep scale must be a positive number, positive [x,y], or function returning one');
}
function cumulativeProfile(points,closed){
  const distances=[0];let total=0;
  const edges=closed?points.length:points.length-1;
  for(let i=0;i<edges;i++){
    total+=points[i].distanceTo(points[(i+1)%points.length]);distances.push(total);
  }
  if(!(total>1e-12))throw new Error('profileSweep profile perimeter must be positive');
  return {distances,total};
}
function profileBounds(points){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const p of points){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}
  const dx=Math.max(maxX-minX,1e-12),dy=Math.max(maxY-minY,1e-12);
  return {minX,minY,dx,dy};
}
function samplePoint(frame,p,sx,sy){
  return frame.origin.clone().addScaledVector(frame.normal,p.x*sx).addScaledVector(frame.binormal,p.y*sy);
}
/** Sweep an independently authored 2D profile along a 3D guide using transported frames.
 * Profile coordinates are meters in the local normal/binormal plane. `scale` is a separate
 * taper field and `tilt` is delegated to the guide frame, so path, section and roll remain editable. */
export function profileSweepGeometry({path,profile,segments=64,closed=false,closedProfile=true,caps=true,up,tilt=0,scale=1,offset=[0,0]}={}){
  count(segments,'profileSweep segments',2);
  if(typeof closed!=='boolean'||typeof closedProfile!=='boolean'||typeof caps!=='boolean')throw new Error('profileSweep closed, closedProfile and caps must be booleans');
  if(closed&&caps) caps=false;
  if(!closedProfile&&caps) caps=false;
  const curve=pathCurve(path,closed),section=normalizedProfile(profile,closedProfile);
  const frames=transportedFrames(curve,{segments,closed,up,tilt});
  const {distances,total}=cumulativeProfile(section,closedProfile);
  const ringSize=section.length+(closedProfile?1:0),positions=[],uvs=[],indices=[];
  const scales=[],offsets=[];
  for(let i=0;i<=segments;i++){
    const [sx,sy]=scaleAt(scale,i/segments,i),[ox,oy]=vector2At(offset,i/segments,i,'offset');scales.push([sx,sy]);offsets.push([ox,oy]);
    for(let j=0;j<ringSize;j++){
      const k=j%section.length,local=section[k].clone().multiply(new THREE.Vector2(sx,sy)).add(new THREE.Vector2(ox,oy)),p=samplePoint(frames[i],local,1,1);positions.push(...p.toArray());
      const u=closedProfile?(j===section.length?1:distances[j]/total):distances[j]/total;
      uvs.push(u,.25+.75*(i/segments));
    }
  }
  const profileEdges=closedProfile?section.length:section.length-1;
  for(let i=0;i<segments;i++)for(let j=0;j<profileEdges;j++){
    const a=i*ringSize+j,b=a+1,c=(i+1)*ringSize+j,d=c+1;
    indices.push(a,b,c,b,d,c);
  }
  const sideVertexCount=positions.length/3;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const normals=geometry.attributes.normal;
  const average=(a,b)=>{
    const n=new THREE.Vector3().fromBufferAttribute(normals,a).add(new THREE.Vector3().fromBufferAttribute(normals,b));
    if(n.lengthSq()>1e-18)n.normalize();
    normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);
  };
  if(closedProfile)for(let i=0;i<=segments;i++)average(i*ringSize,i*ringSize+section.length);
  if(closed)for(let j=0;j<ringSize;j++)average(j,segments*ringSize+j);

  if(caps){
    const triangles=THREE.ShapeUtils.triangulateShape(section,[]),bounds=profileBounds(section);
    const pos=[...geometry.attributes.position.array],norm=[...geometry.attributes.normal.array],uv=[...geometry.attributes.uv.array],idx=[...geometry.index.array];
    for(const end of [0,segments]){
      const frame=frames[end],[sx,sy]=scales[end],[ox,oy]=offsets[end],vertexOffset=pos.length/3,sign=end===0?-1:1;
      for(const p of section){
        const local=p.clone().multiply(new THREE.Vector2(sx,sy)).add(new THREE.Vector2(ox,oy)),world=samplePoint(frame,local,1,1);pos.push(...world.toArray());norm.push(...frame.tangent.clone().multiplyScalar(sign).toArray());
        const ux=(p.x-bounds.minX)/bounds.dx,uy=(p.y-bounds.minY)/bounds.dy;
        uv.push((end===0?0:.5)+ux*.5,uy*.22);
      }
      for(const tri of triangles){
        const a=vertexOffset+tri[0],b=vertexOffset+tri[1],c=vertexOffset+tri[2];
        const pa=new THREE.Vector3(...pos.slice(a*3,a*3+3)),pb=new THREE.Vector3(...pos.slice(b*3,b*3+3)),pc=new THREE.Vector3(...pos.slice(c*3,c*3+3));
        const face=new THREE.Vector3().crossVectors(pb.clone().sub(pa),pc.clone().sub(pa));
        idx.push(...(face.dot(frame.tangent)*sign>=0?[a,b,c]:[a,c,b]));
      }
    }
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(idx);
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData={...geometry.userData,profileSweep:{segments,profilePoints:section.length,closed,closedProfile,caps,sideVertexCount}};
  return geometry;
}
export function profileSweep(options){
  const {path,profile,segments,closed,closedProfile,caps,up,tilt,scale,offset,...meshOptions}=options??{};
  return mesh(profileSweepGeometry({path,profile,segments,closed,closedProfile,caps,up,tilt,scale,offset}),meshOptions);
}
