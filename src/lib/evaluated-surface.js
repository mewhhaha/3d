import * as THREE from 'three';
/** Owned geometric snapshot of the CURRENT evaluated mesh in an explicit frame.
 * frame maps destination coordinates to world. Caller updates/poses the skeleton
 * first. Skin/morph bindings, shading normals, tangents and baked correspondence
 * are deliberately not copied. Intended for fitting/querying, not animation.
 */
export function evaluatedSurfaceGeometry(mesh,{frame=new THREE.Matrix4(),includeFace=null}={}){
 if(!mesh?.isMesh||mesh.isInstancedMesh||!frame?.isMatrix4||includeFace!==null&&typeof includeFace!=='function')throw new Error('Expected mesh, destination frame and optional face predicate');
 const source=mesh.geometry,p=source?.attributes?.position,index=source?.index;
 if(!p||p.itemSize!==3||!p.count||!index||index.count%3)throw new Error('Snapshot needs indexed triangles');
 if([3,7,11].some(i=>frame.elements[i]!==0)||frame.elements[15]!==1||!frame.elements.every(Number.isFinite)||!Number.isFinite(frame.determinant())||frame.determinant()<=0)throw new Error('Snapshot frame must be positive and nonsingular');
 mesh.updateWorldMatrix(true,false);if(mesh.isSkinnedMesh)mesh.skeleton.update();
 const transform=frame.clone().invert().multiply(mesh.matrixWorld);
 if(!transform.elements.every(Number.isFinite)||transform.determinant()<=0)throw new Error('Snapshot source transform must be positive and nonsingular');
 const positions=new Float32Array(p.count*3),point=new THREE.Vector3(),indices=[];
 for(let i=0;i<p.count;i++){
  mesh.getVertexPosition(i,point).applyMatrix4(transform);point.toArray(positions,i*3);
 }
 if(!positions.every(Number.isFinite))throw new Error('Nonfinite evaluated geometry');
 for(let i=0;i<index.count;i+=3){
  const triangle=[index.getX(i),index.getX(i+1),index.getX(i+2)];
  if(triangle.some(v=>!Number.isInteger(v)||v<0||v>=p.count))throw new Error('Invalid source index');
  if(!includeFace||includeFace(i/3,triangle.slice()))indices.push(...triangle);
 }
 if(!indices.length)throw new Error('Snapshot selection is empty');
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(indices);
 geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData.evaluatedSurface={source:mesh.name,scope:'geometry-only pose snapshot; no binding/UV/detail transfer'};
 return geometry;
}
