import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {rigidChain} from '../src/lib/rigid-chain.js';
const v=p=>new THREE.Vector3(...p);
const near=(a,b)=>assert.ok(a.distanceTo(b)<1e-10,`${a.toArray()} != ${b.toArray()}`);

test('FK chain connects exact local endpoints under noncoplanar articulation and parent transforms',()=>{
 const lengths=[.2,.17,.08],rotations=[[10,20,15],[42,-10,3],[17,8,11]],snap=JSON.stringify({lengths,rotations});
 const root=rigidChain({name:'Test',lengths,rotations},()=>new THREE.Group());root.position.set(1,2,3);root.rotation.set(.2,.4,-.1);root.updateMatrixWorld(true);
 const nodes=root.userData.rigidChain.joints.map(n=>root.getObjectByName(n));
 nodes.forEach((node,i)=>{const end=node.localToWorld(v([0,-lengths[i],0])),next=i+1<nodes.length?nodes[i+1]:root.getObjectByName('Test tip');near(end,next.getWorldPosition(new THREE.Vector3()));assert.ok(Math.abs(node.getWorldPosition(new THREE.Vector3()).distanceTo(end)-lengths[i])<1e-10);});
 nodes[1].rotation.z+=.6;root.updateMatrixWorld(true);near(nodes[1].localToWorld(v([0,-.17,0])),nodes[2].getWorldPosition(new THREE.Vector3()));
 assert.equal(JSON.stringify({lengths,rotations}),snap);
});

test('angles are local XYZ degrees; link construction and pose stay independent',()=>{
 const positions=new Float32Array([0,0,0,0,-1,0,.1,-.5,0]);const g=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(positions,3));
 const root=rigidChain({name:'Hinge',lengths:[1,1],rotations:[[90,0,0],[0,0,0]]},()=>new THREE.Mesh(g.clone()));root.updateMatrixWorld(true);
 near(root.getObjectByName('Hinge tip').getWorldPosition(new THREE.Vector3()),v([0,0,-2]));
 assert.deepEqual(g.attributes.position.array,positions);
 const loaded=new THREE.ObjectLoader().parse(root.toJSON());loaded.updateMatrixWorld(true);near(loaded.getObjectByName('Hinge tip').getWorldPosition(new THREE.Vector3()),v([0,0,-2]));
 assert.equal(loaded.userData.rigidChain.lengths.length,2);
});

test('rigid chain validates input and refuses stolen or duplicated link ownership',()=>{
 for(const lengths of [[],[0],[NaN],[-.1]])assert.throws(()=>rigidChain({lengths}));
 for(const rotations of [[[0,0]],[[NaN,0,0]],[[0,0,0],[0,0,0]]])assert.throws(()=>rigidChain({lengths:[1],rotations}));
 const object=new THREE.Group();assert.throws(()=>rigidChain({lengths:[1,1]},()=>object));assert.equal(object.parent,null);
 const parent=new THREE.Group();parent.add(object);assert.throws(()=>rigidChain({lengths:[1]},()=>object));assert.equal(object.parent,parent);
 assert.throws(()=>rigidChain({lengths:[1]},()=>({})));assert.throws(()=>rigidChain({lengths:[1]},1));
});
