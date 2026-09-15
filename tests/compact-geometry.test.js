import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { compactGeometry } from '../src/lib/compact-geometry.js';
test('exact compaction preserves expanded triangles, UV seams and signed zero',()=>{
 const g=new THREE.PlaneGeometry(1,1,8,8).toNonIndexed();g.attributes.normal.array[0]=-0;
 const c=compactGeometry(g),restored=c.toNonIndexed();assert.ok(c.attributes.position.count<g.attributes.position.count);
 for(const name of Object.keys(g.attributes))assert.deepEqual(restored.attributes[name].array,g.attributes[name].array);
 assert.equal(c.index.count,g.attributes.position.count);g.dispose();c.dispose();restored.dispose();
});
test('compaction preserves integer normalized attributes and rejects morphs',()=>{
 const g=new THREE.PlaneGeometry();g.setAttribute('joints',new THREE.Uint16BufferAttribute(new Uint16Array(g.attributes.position.count*4),4));
 const c=compactGeometry(g);assert.ok(c.attributes.joints.array instanceof Uint16Array);
 g.morphAttributes.position=[g.attributes.position.clone()];assert.throws(()=>compactGeometry(g));g.dispose();c.dispose();
});
