import * as THREE from 'three';
/** Lossless indexing of complete vertex attribute tuples, not geometric decimation.
 * UV seams, hard normals, tangent signs and skin weights participate in the key.
 * Triangle order and every referenced attribute value are preserved exactly. */
export function compactGeometry(input){
 if(!input?.isBufferGeometry||!input.attributes.position||Object.keys(input.morphAttributes).length)throw new Error('Compaction needs ordinary geometry without morph targets');
 const names=Object.keys(input.attributes).sort(),attrs=names.map(n=>input.attributes[n]),count=attrs[0].count;
 if(attrs.some(a=>a.isInterleavedBufferAttribute||a.count!==count))throw new Error('Compaction needs equal-length non-interleaved attributes');
 const unique=new Map(),values=attrs.map(()=>[]),indices=[],total=input.index?.count||count;
 for(let j=0;j<total;j++){
  const i=input.index?input.index.getX(j):j,parts=[];
  for(const a of attrs)for(let k=0;k<a.itemSize;k++){const v=a.array[i*a.itemSize+k];if(!Number.isFinite(v))throw new Error('Cannot compact nonfinite attributes');parts.push(Object.is(v,-0)?'-0':String(v));}
  const key=parts.join('|');let id=unique.get(key);
  if(id===undefined){id=unique.size;unique.set(key,id);for(let a=0;a<attrs.length;a++)for(let k=0;k<attrs[a].itemSize;k++)values[a].push(attrs[a].array[i*attrs[a].itemSize+k]);}
  indices.push(id);
 }
 const out=new THREE.BufferGeometry();names.forEach((name,k)=>{const a=attrs[k],b=new THREE.BufferAttribute(new a.array.constructor(values[k]),a.itemSize,a.normalized);b.name=a.name;b.setUsage(a.usage);out.setAttribute(name,b);});
 out.setIndex(indices);input.groups.forEach(g=>out.addGroup(g.start,g.count,g.materialIndex));out.setDrawRange(input.drawRange.start,input.drawRange.count);
 out.name=input.name;out.userData=JSON.parse(JSON.stringify(input.userData));out.userData.compaction={sourceVertices:input.attributes.position.count,vertices:out.attributes.position.count,triangles:total/3,method:'exact complete-attribute indexing'};
 out.computeBoundingBox();out.computeBoundingSphere();return out;
}
