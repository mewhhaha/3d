import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {directNormals,ellipsoidNormalField,inkHull,twoToneMaterial,hydrateTwoTone} from '../src/lib/illustration.js';
import {animePortrait,facialChart} from '../src/lib/cyber/portrait.js';
import {cyberMaterials} from '../src/lib/cyber/mechanics.js';
import {roundedBob,illustratedHead,bobCrossSection} from '../src/lib/cyber/illustrated-head.js';
import {dispose,inspect} from '../src/lib/modeling.js';

test('normal directions preserve positions, indices, UVs, groups and source ownership',()=>{
 const a=new T.BoxGeometry(2,3,1,4,5,2);a.computeTangents();a.userData.semantic='panel';
 const before=a.clone();const b=directNormals(a,{field:()=>[1,1,1],maxAngle:22,selection:({position:p})=>p[2]>0?1:0});
 for(const key of ['position','uv']){assert.deepEqual(b.attributes[key].array,before.attributes[key].array);assert.notEqual(b.attributes[key].array,a.attributes[key].array);}
 assert.deepEqual(b.index.array,a.index.array);assert.deepEqual(b.groups,a.groups);assert.equal(b.userData.semantic,'panel');assert.equal(b.attributes.tangent,undefined);assert.ok(a.attributes.tangent);
 for(let i=0;i<a.attributes.normal.count;i++){const x=new T.Vector3().fromBufferAttribute(a.attributes.normal,i),y=new T.Vector3().fromBufferAttribute(b.attributes.normal,i);assert.ok(Math.abs(y.length()-1)<1e-6);assert.ok(x.angleTo(y)<=T.MathUtils.degToRad(22)+1e-6);}
 assert.deepEqual(a.attributes.normal.array,before.attributes.normal.array);a.dispose();b.dispose();before.dispose();
});
test('invalid normal fields and rig/morph ownership fail without touching the source',()=>{
 const g=new T.PlaneGeometry();assert.throws(()=>ellipsoidNormalField({radii:[1,0,1]}));assert.throws(()=>ellipsoidNormalField()([0,0,0]));
 assert.throws(()=>directNormals(g,{field:()=>[0,0,0]}));assert.throws(()=>directNormals(g,{field:()=>[0,0,1],selection:()=>2}));
 g.setAttribute('skinWeight',new T.Float32BufferAttribute(new Float32Array(16),4));assert.throws(()=>directNormals(g,{field:()=>[0,0,1]}),/pre-rig/);g.dispose();
});
test('ink hull is reversed, opaque ordinary geometry, not a BackSide export approximation',()=>{
 const a=new T.SphereGeometry(1,16,10),b=inkHull(a,{width:.02});
 assert.equal(b.material.side,T.FrontSide);assert.equal(b.material.isMeshBasicMaterial,true);assert.notEqual(b.geometry,a);
 assert.equal(b.geometry.index.getX(1),a.index.getX(2));assert.equal(b.geometry.index.getX(2),a.index.getX(1));
 let max=0;for(let i=0;i<a.attributes.position.count;i++)max=Math.max(max,new T.Vector3().fromBufferAttribute(b.geometry.attributes.position,i).length());assert.ok(max>1.019);dispose(b);a.dispose();
});
test('two-tone survives JSON metadata roundtrip and preserves an explicit PBR fallback',()=>{
 const m=twoToneMaterial(),g=new T.Mesh(new T.SphereGeometry(),m),parsed=new T.ObjectLoader().parse(g.toJSON());
 assert.equal(parsed.material.isMeshStandardMaterial,true);assert.match(parsed.material.userData.twoTone.export,/fallback/);
 const result=hydrateTwoTone(parsed.material),shader={uniforms:{},fragmentShader:'#include <opaque_fragment>'};result.onBeforeCompile(shader);
 assert.match(shader.fragmentShader,/dot\(normal,keyDirection\)/);assert.match(shader.fragmentShader,/viewMatrix/);assert.ok(shader.uniforms.illustrationDirection);
 assert.throws(()=>twoToneMaterial({direction:[0,0,0]}));assert.throws(()=>twoToneMaterial({softness:0}));dispose(g);dispose(parsed);
});
test('defined portrait is genuine relief with conforming eyes and preserves baseline mode',()=>{
 assert.notDeepEqual(facialChart(0,-.02),facialChart(0,-.02,{definition:1}));
 for(const definition of [0,1]){
  const r=animePortrait({definition},cyberMaterials());
  r.traverse(o=>{if(['Conforming almond sclera','Surface iris','Surface pupil'].includes(o.name))for(let i=0;i<o.geometry.attributes.position.count;i++){const p=new T.Vector3().fromBufferAttribute(o.geometry.attributes.position,i),gap=p.z-facialChart(p.x,p.y,{definition})[2];assert.ok(gap>0&&gap<.0045,`${o.name}: ${gap}`);}});
  assert.equal(!!r.getObjectByName('Sculpted upper lid rim'),definition===1);dispose(r);
 }
});
test('rounded bob has editable finite cuts and independent geometry/material ownership',()=>{
 const a=roundedBob(),b=roundedBob({fringeHeight:.05,opening:.9}),head=illustratedHead({},cyberMaterials());
 assert.ok(inspect(head).triangles<60000);assert.ok(a.getObjectByName('Rounded crown'));
 for(const part of ['Rounded crown','Rounded curtain','Rounded fringe']){const g=a.getObjectByName(part).geometry,p=g.attributes.position,n=g.attributes.normal;let dot=0;for(let i=0;i<p.count;i++)dot+=p.getX(i)*n.getX(i)+(p.getZ(i)+.045)*n.getZ(i);assert.ok(dot>0,part+' has outward normals');}assert.ok(head.getObjectByName('Portrait ink contour'));
 const af=a.getObjectByName('Rounded fringe'),bf=b.getObjectByName('Rounded fringe');assert.notDeepEqual(af.geometry.attributes.position.array,bf.geometry.attributes.position.array);
 assert.notEqual(af.material.map,bf.material.map);assert.throws(()=>roundedBob({opening:2}));assert.throws(()=>bobCrossSection({width:0}));
 dispose(a);dispose(b);dispose(head);
});
test('independent mechanical fixture builds deterministically in both modes',async()=>{
 const {default:definition}=await import('../studies/illustration-tools.js');
 const {buildModel}=await import('../src/lib/modeling.js');
 for(const illustrated of [false,true]){const a=buildModel(definition,{illustrated}),b=buildModel(definition,{illustrated});assert.deepEqual(inspect(a),inspect(b));assert.ok(inspect(a).triangles>0);dispose(a);dispose(b);}
});
