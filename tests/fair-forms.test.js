import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {surface,tessellate} from '../src/lib/forms/surface.js';
import {fairJoin,jointRegion,unionRegions,normalSampler}from'../src/lib/forms/fair.js';
test('joint fields compose without summing beyond one',()=>{const f=jointRegion({center:[0,0,0],radius:[1,1,1]});assert.equal(unionRegions(f,f)([0,0,0]),1);assert.throws(()=>jointRegion({center:[0,0,0],radius:[0,1,1]}));});
test('shared chart borders remain coincident while fairing normals and geometry',()=>{
 const chart=surface((u,v)=>[u,v,.2*Math.abs(u-.5)]),g=tessellate(chart,{segments:[4,4]}),m=new THREE.Mesh(g);
 const uv=g.attributes.uv.array.slice(),r=fairJoin([m],{iterations:4});assert.equal(r.geometricVertices,25);assert.deepEqual(g.attributes.uv.array,uv);assert.ok(g.attributes.tangent.array.every(Number.isFinite));
 const positions=new Map();for(let i=0;i<g.attributes.position.count;i++){const key=[g.attributes.uv.getX(i),g.attributes.uv.getY(i)].join(',');const p=[g.attributes.position.getX(i),g.attributes.position.getY(i),g.attributes.position.getZ(i)];if(positions.has(key))assert.deepEqual(p,positions.get(key));else positions.set(key,p);}g.dispose();
});
test('normal lookup uses actual high geometry and rejects missing UV regions',()=>{
 const g=tessellate(surface((u,v)=>[u,v,.3*u]),{segments:[8,8]}),sample=normalSampler(g);assert.ok(sample(.2,.3).distanceTo(new THREE.Vector3(-.3,0,1).normalize())<1e-6);assert.throws(()=>sample(2,.5));g.dispose();
});
