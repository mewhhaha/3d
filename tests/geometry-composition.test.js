import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { composeGeometries, remapCompositionAnchor } from '../src/lib/geometry-composition.js';
import { defineFaceRegions, faceRegionNames, faceRegionTriangles } from '../src/lib/face-regions.js';
import { triangleSpatialIndex } from '../src/lib/triangle-spatial-index.js';
import { bindSurfaceAnchor, resolveSurfaceAnchor, surfaceTopologySignature } from '../src/lib/surface-mount.js';

function quad(z=0) {
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([-.5,-.5,z,.5,-.5,z,.5,.5,z,-.5,.5,z],3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1,0,0,1],3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
  g.setIndex([0,1,2,0,2,3]);
  return g;
}

function snapshot(g){return {position:[...g.attributes.position.array],normal:[...g.attributes.normal.array],uv:[...g.attributes.uv.array],index:[...g.index.array],userData:JSON.stringify(g.userData),groups:JSON.stringify(g.groups)};}

test('composition owns buffers, offsets indices and leaves sources unchanged',()=>{
 const a=quad(),b=quad(); const beforeA=snapshot(a),beforeB=snapshot(b);
 const out=composeGeometries([{name:'a',geometry:a},{name:'b',geometry:b,position:[2,0,0]}]);
 assert.equal(out.attributes.position.count,8); assert.equal(out.index.count,12);
 assert.deepEqual([...out.index.array],[0,1,2,0,2,3,4,5,6,4,6,7]);
 assert.deepEqual(snapshot(a),beforeA);assert.deepEqual(snapshot(b),beforeB);
 out.attributes.position.setX(0,99);assert.notEqual(a.attributes.position.getX(0),99);
 assert.deepEqual(out.userData.geometryComposition.parts,[
  {name:'a',firstVertex:0,vertexCount:4,firstFace:0,faceCount:2,sourceTopologySignature:surfaceTopologySignature(a)},
  {name:'b',firstVertex:4,vertexCount:4,firstFace:2,faceCount:2,sourceTopologySignature:surfaceTopologySignature(b)},
 ]);
});

test('part transforms use authoring meters/degrees and transform normals',()=>{
 const out=composeGeometries([{name:'panel',geometry:quad(),position:[1,2,3],rotation:[0,90,0],scale:[2,1,1]}]);
 const p=new THREE.Vector3().fromBufferAttribute(out.attributes.position,0);
 assert.ok(p.distanceTo(new THREE.Vector3(1,1.5,4))<1e-6);
 const n=new THREE.Vector3().fromBufferAttribute(out.attributes.normal,0);
 assert.ok(n.distanceTo(new THREE.Vector3(1,0,0))<1e-6);
});

test('inherited overlapping face regions union by name while exact part regions remain independent of groups',()=>{
 let a=defineFaceRegions(quad(),{'detail.tip':[1],'shared.mark':[0]},{clone:false});
 let b=defineFaceRegions(quad(),{'detail.root':[0],'shared.mark':[1]},{clone:false});
 a.addGroup(0,6,7); b.addGroup(0,6,2);
 const out=composeGeometries([{name:'leaf',geometry:a,materialOffset:3},{name:'panel',geometry:b,materialOffset:10}]);
 assert.deepEqual(faceRegionNames(out),['detail.root','detail.tip','part.leaf','part.panel','shared.mark']);
 assert.deepEqual(faceRegionTriangles(out,'detail.tip'),[1]);
 assert.deepEqual(faceRegionTriangles(out,'detail.root'),[2]);
 assert.deepEqual(faceRegionTriangles(out,'shared.mark'),[0,3]);
 assert.deepEqual(faceRegionTriangles(out,'part.leaf'),[0,1]);
 assert.deepEqual(faceRegionTriangles(out,'part.panel'),[2,3]);
 assert.equal(out.groups[0].materialIndex,10); assert.equal(out.groups[1].materialIndex,12);
 a.clearGroups();b.clearGroups();a.addGroup(0,6,0);b.addGroup(0,6,0);
 const regrouped=composeGeometries([{name:'leaf',geometry:a},{name:'panel',geometry:b}]);
 assert.deepEqual(faceRegionTriangles(regrouped,'part.panel'),[2,3]);
});

test('generated part regions can drive downstream spatial queries',()=>{
 const out=composeGeometries([{name:'front',geometry:quad(.2)},{name:'back',geometry:quad(.02)}]);
 const index=triangleSpatialIndex(out,{leafSize:2});
 const point=new THREE.Vector3(0,0,0);
 assert.ok(index.closestPoint(point).point.z<.03);
 const front=index.closestPoint(point,{regionNames:['part.front']});
 assert.ok(front.point.z>.19);assert.deepEqual(front.regionNames,['part.front']);
});

test('composition rejects ambiguous or unsupported attribute ownership',()=>{
 const a=quad(),b=quad(); b.deleteAttribute('uv');
 assert.throws(()=>composeGeometries([{name:'a',geometry:a},{name:'b',geometry:b}]),/attributes are incompatible/);
 const skin=quad();skin.setAttribute('skinWeight',new THREE.Float32BufferAttribute(new Float32Array(16),4));
 assert.throws(()=>composeGeometries([{name:'skin',geometry:skin}]),/skinWeight needs an explicit/);
 const tangent=quad();tangent.setAttribute('tangent',new THREE.Float32BufferAttribute(new Float32Array(16),4));
 assert.throws(()=>composeGeometries([{name:'tan',geometry:tangent}]),/tangent needs an explicit/);
 assert.throws(()=>composeGeometries([{name:'same',geometry:quad()},{name:'same',geometry:quad()}]),/duplicate/);
});


test('persistent anchors remap exactly into named transformed composition parts',()=>{
 const source=defineFaceRegions(quad(),{'mount.zone':[0,1]},{clone:false});
 const anchor=bindSurfaceAnchor(source,{near:[.18,.13,.2],regionNames:['mount.zone'],tangentHint:[1,.25,0],offset:.012});
 const position=[1.1,-.35,.6],rotation=[12,38,-17],scale=[1.25,.85,1.1];
 const composed=composeGeometries([
  {name:'first',geometry:source,position:[-.8,.1,-.2],rotation:[0,-15,5]},
  {name:'mounted',geometry:source,position,rotation,scale},
 ]);
 const remapped=remapCompositionAnchor(composed,anchor,{part:'mounted'});
 const entry=composed.userData.geometryComposition.parts[1];
 assert.equal(remapped.triangleIndex,entry.firstFace+anchor.triangleIndex);
 assert.deepEqual(remapped.indices,anchor.indices.map(i=>i+entry.firstVertex));
 assert.deepEqual(remapped.barycoord,anchor.barycoord);
 assert.deepEqual(remapped.tangentWeights,anchor.tangentWeights);
 assert.equal(remapped.topologySignature,surfaceTopologySignature(composed));

 const sourcePose=resolveSurfaceAnchor(source,anchor);
 const expectedMatrix=new THREE.Matrix4().compose(
  new THREE.Vector3().fromArray(position),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation.map(THREE.MathUtils.degToRad),'XYZ')),
  new THREE.Vector3().fromArray(scale),
 );
 const expectedOrigin=sourcePose.frame.origin.clone().applyMatrix4(expectedMatrix);
 const pose=resolveSurfaceAnchor(composed,remapped);
 assert.ok(pose.frame.origin.distanceTo(expectedOrigin)<1e-6);
 assert.ok(Math.abs(pose.frame.tangent.dot(pose.frame.normal))<1e-6);
 source.dispose();composed.dispose();
});

test('composition-anchor remap uses explicit part identity and rejects stale source topology',()=>{
 const source=quad(), anchor=bindSurfaceAnchor(source,{near:[.1,.1,.2]});
 const composed=composeGeometries([{name:'left',geometry:source},{name:'right',geometry:source,position:[2,0,0]}]);
 const left=remapCompositionAnchor(composed,anchor,{part:'left'}),right=remapCompositionAnchor(composed,anchor,{part:'right'});
 assert.notEqual(left.triangleIndex,right.triangleIndex);
 assert.ok(resolveSurfaceAnchor(composed,left).frame.origin.distanceTo(resolveSurfaceAnchor(composed,right).frame.origin)>1.9);
 assert.throws(()=>remapCompositionAnchor(composed,anchor,{part:'missing'}),/unknown composition part/);
 assert.throws(()=>remapCompositionAnchor(composed,{...anchor,topologySignature:null},{part:'left'}),/bindSurfaceAnchor/);
 const other=quad();other.setIndex([0,2,1,0,3,2]);
 const otherAnchor=bindSurfaceAnchor(other,{near:[.1,.1,.2]});
 assert.throws(()=>remapCompositionAnchor(composed,otherAnchor,{part:'left'}),/different source topology/);
 assert.throws(()=>remapCompositionAnchor(source,anchor,{part:'left'}),/produced by composeGeometries/);
 source.dispose();other.dispose();composed.dispose();
});
