import { THREE } from './modeling.js';
// Explicit projections, not a distortion-minimizing unwrap solver.
export function projectUV(geometry, { mode = 'box' } = {}) {
  if (!['box','planar','cylindrical','spherical'].includes(mode)) throw new Error('Unknown UV projection');
  const g=geometry.index ? geometry.toNonIndexed() : geometry.clone();
  g.computeBoundingBox(); const b=g.boundingBox, s=b.getSize(new THREE.Vector3()), c=b.getCenter(new THREE.Vector3());
  const p=g.attributes.position, out=new Float32Array(p.count*2);
  for(let t=0;t<p.count;t+=3) {
    const points=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,t+k));
    const n=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
    const axis=[Math.abs(n.x),Math.abs(n.y),Math.abs(n.z)].indexOf(Math.max(Math.abs(n.x),Math.abs(n.y),Math.abs(n.z)));
    const uvs=points.map(q=>{
      const d=q.clone().sub(c), norm=(k)=>(q.getComponent(k)-b.min.getComponent(k))/(s.getComponent(k)||1);
      if(mode==='planar') return [norm(0),norm(1)];
      if(mode==='box') {
        const axes=[[2,1],[0,2],[0,1]][axis], face=axis*2+(n.getComponent(axis)<0?1:0);
        return [(face%3+norm(axes[0]))/3,(Math.floor(face/3)+norm(axes[1]))/2];
      }
      return [Math.atan2(d.x,d.z)/(Math.PI*2)+.5,mode==='spherical'?Math.acos(THREE.MathUtils.clamp(d.y/(d.length()||1),-1,1))/Math.PI:norm(1)];
    });
    if(['cylindrical','spherical'].includes(mode) && Math.max(...uvs.map(p=>p[0]))-Math.min(...uvs.map(p=>p[0]))>.5) for(const uv of uvs) if(uv[0]<.5) uv[0]+=1;
    uvs.forEach((uv,k)=>out.set(uv,(t+k)*2));
  }
  g.setAttribute('uv',new THREE.Float32BufferAttribute(out,2)); g.deleteAttribute('tangent'); return g;
}
export function auditUV(root) {
  const result={ meshes:0, missing:[], invalid:[], outside:0, degenerateTriangles:0, texturedMeshes:0, textures:0 };
  const maps=new Set();
  root.traverse(node=>{
    if(!node.isMesh) return; result.meshes++;
    const g=node.geometry, uv=g.attributes.uv, count=g.attributes.position.count;
    if(!uv) { result.missing.push(node.name); return; }
    if(uv.count!==count || !uv.array.every(Number.isFinite)) { result.invalid.push(node.name); return; }
    for(let i=0;i<uv.count;i++) if(uv.getX(i)<-1e-5 || uv.getX(i)>1.00001 || uv.getY(i)<-1e-5 || uv.getY(i)>1.00001) result.outside++;
    const index=g.index, length=index?index.count:count;
    for(let i=0;i<length;i+=3) {
      const [a,b,c]=[0,1,2].map(k=>index?index.getX(i+k):i+k);
      if(Math.abs((uv.getX(b)-uv.getX(a))*(uv.getY(c)-uv.getY(a))-(uv.getY(b)-uv.getY(a))*(uv.getX(c)-uv.getX(a)))<1e-12) result.degenerateTriangles++;
    }
    let textured=false;
    for(const mat of Array.isArray(node.material)?node.material:[node.material]) for(const value of Object.values(mat)) if(value?.isTexture) { maps.add(value); textured=true; }
    if(textured) result.texturedMeshes++;
  });
  result.textures=maps.size; return result;
}
// Places already-authored mesh charts into cells; does not rebake materials.
export function packUV(meshes, { padding = 0.02 } = {}) {
  if(!Array.isArray(meshes)||!meshes.length||!(padding>=0&&padding<.2)) throw new Error('Invalid atlas input');
  const columns=Math.ceil(Math.sqrt(meshes.length)), rows=Math.ceil(meshes.length/columns);
  return meshes.map((node,i)=>{
    const g=node.geometry.clone(), uv=g.attributes.uv;
    if(!uv || !uv.array.every(Number.isFinite)) throw new Error('Every atlas mesh needs valid UVs');
    for(let j=0;j<uv.count;j++) {
      const u=uv.getX(j),v=uv.getY(j);
      if(u<0||u>1||v<0||v>1) throw new Error('Atlas requires UVs already inside 0..1');
      uv.setXY(j,((i%columns)+padding+u*(1-2*padding))/columns,(Math.floor(i/columns)+padding+v*(1-2*padding))/rows);
    }
    g.deleteAttribute('tangent'); return g;
  });
}
export function uvSVG(geometry, { size = 1024, maxTriangles = 100000 } = {}) {
  const uv=geometry.attributes.uv; if(!uv) throw new Error('Mesh has no UV coordinates');
  const index=geometry.index, length=index?index.count:uv.count, stride=Math.max(1,Math.ceil(length/3/maxTriangles));
  const paths=[];
  for(let t=0;t<length;t+=3*stride) {
    const points=[0,1,2].map(k=>{
      const i=index?index.getX(t+k):t+k;
      return `${(uv.getX(i)*size).toFixed(2)},${((1-uv.getY(i))*size).toFixed(2)}`;
    });
    paths.push(`M${points[0]}L${points[1]}L${points[2]}Z`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><desc>UV layout; ${stride===1?'all triangles':`one triangle in ${stride} shown`}. UV repetition/overlap is not certified by this view.</desc><rect width="100%" height="100%" fill="#f5f0e5"/><path d="${paths.join('')}" fill="none" stroke="#27586a" stroke-width="0.6"/></svg>`;
}
