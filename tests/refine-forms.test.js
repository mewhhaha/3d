import test from'node:test';import assert from'node:assert/strict';import * as THREE from'three';
import{refinePatch,clearSphere}from'../src/lib/forms/refine.js';
import{buildEye,eye}from'../src/lib/forms/eye.js';import{dispose}from'../src/lib/modeling.js';
test('refinement preserves boundary data and re-allocates normals',()=>{
 const g=new THREE.PlaneGeometry(1,1,4,4).toNonIndexed();const before=g.attributes.position.count;refinePatch(g);assert.ok(g.attributes.position.count>=before);assert.equal(g.attributes.normal.count,g.attributes.position.count);assert.equal(g.attributes.uv.count,g.attributes.position.count);assert.ok(g.attributes.normal.array.every(Number.isFinite));g.dispose();
});
test('an overlying eye patch cannot expose the sphere outside its opening',()=>{
 const root=buildEye(eye(),{mode:'cage'}),p=root.getObjectByName('EyelidsAndOrbit').geometry.attributes.position,r=.014;
 for(let i=0;i<p.count;i++){const d=r*r-p.getX(i)**2-p.getY(i)**2;if(d>0)assert.ok(p.getZ(i)>=Math.sqrt(d)+.00039);}
 const v=new THREE.Vector3(.1,.1,-1);assert.equal(clearSphere(v,.01).z,-1);dispose(root);
});
