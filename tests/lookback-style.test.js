import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {prismGuide} from '../src/lib/cyber/reference-layout.js';
import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
import {contourLineMaps} from '../src/lib/contour-line-maps.js';
import {surfaceContourGeometry} from '../src/lib/surface-contour.js';
import {inspect,dispose} from '../src/lib/modeling.js';
import fixture from '../studies/posed-enamel.js';
const values={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'lookback',massStyle:'structured',handStyle:'relaxed',panelStyle:'cutaway',footStyle:'bridged',girdleStyle:'connected',shoulderStyle:'seated',emitterStyle:'mapped',cables:false};
const distance=(a,b)=>new T.Vector3(...a).distanceTo(new T.Vector3(...b));
test('lookback narrows shoulder spread while preserving total arm reach, leg lengths and planted targets',()=>{
 const before=prismGuide({poseStyle:'relaxed',gestureStyle:'counterpose'}),after=prismGuide({poseStyle:'relaxed',gestureStyle:'lookback'});
 for(const side of ['Near','Far']){
  for(const [a,b,len] of [['shoulder','elbow',.285],['elbow','wrist',.265],['hip','knee',.43],['knee','ankle',.45]])assert.ok(Math.abs(distance(after.point(a+side),after.point(b+side))-len)<1e-10);
  for(const k of ['wrist','ankle'])assert.deepEqual(after.point(k+side),before.point(k+side));
 }
 assert.deepEqual(after.bodyGesture.armLengths,[.285,.265]);
 assert.ok(distance(after.point('shoulderNear'),after.point('shoulderFar'))<distance(before.point('shoulderNear'),before.point('shoulderFar'))*.8);
 assert.deepEqual(after.point('head'),before.point('head'));assert.deepEqual(after.point('reactor'),before.point('reactor'));
});
test('contour paint is deterministic, density-independent and owns color/noncolor textures',()=>{
 const options={outline:[[.1,.1],[.9,.1],[.9,.9],[.1,.9]],holes:[[[.4,.4],[.4,.6],[.6,.6],[.6,.4]]],rounding:.1},f=(u,v)=>[u,v,.1*u*v];
 const a=surfaceContourGeometry(f,{...options,refinement:1}),b=surfaceContourGeometry(f,{...options,refinement:3});
 const before=a.attributes.position.array.slice(),m=contourLineMaps(a,{size:64,lineWidth:.035}),n=contourLineMaps(b,{size:64,lineWidth:.035});
 assert.deepEqual(m.map.image.data,n.map.image.data);assert.notEqual(m.map.image.data,n.map.image.data);assert.deepEqual(before,a.attributes.position.array);
 assert.equal(m.map.colorSpace,T.SRGBColorSpace);assert.equal(m.roughnessMap.colorSpace,T.NoColorSpace);assert.ok(m.map.image.data.some((x,i)=>i%4!==3&&x<100));
 assert.throws(()=>contourLineMaps(a,{size:33}));assert.throws(()=>contourLineMaps(a,{lineWidth:0}));assert.throws(()=>contourLineMaps(a,{ink:'bad'}));assert.throws(()=>contourLineMaps(new T.BoxGeometry()));
 [m.map,m.roughnessMap,n.map,n.roughnessMap].forEach(t=>t.dispose());a.dispose();b.dispose();
});
test('shader/pigment control does not modify any scene geometry or pose',()=>{
 const a=refinedAndroid(values),b=refinedAndroid({...values,surfaceStyle:'outlined'});a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 const parts=r=>{const list=[];r.traverse(o=>{if(o.isMesh)list.push(o)});return list;},aa=parts(a),bb=parts(b);assert.equal(aa.length,bb.length);assert.equal(inspect(a).triangles,inspect(b).triangles);
 aa.forEach((m,i)=>{assert.equal(m.name,bb[i].name);assert.deepEqual(m.matrixWorld.elements,bb[i].matrixWorld.elements);assert.deepEqual(m.geometry.index?.array,bb[i].geometry.index?.array);for(const key of ['position','normal','uv','tangent'])assert.deepEqual(m.geometry.attributes[key]?.array,bb[i].geometry.attributes[key]?.array);});
 const ceramic=b.getObjectByName('thigh flowing plate 0 / ceramic');assert.ok(Array.isArray(ceramic.material));assert.ok(ceramic.material[0].map);assert.ok(ceramic.material[0].userData.twoTone);
 dispose(a);dispose(b);
});
test('independent inspection cover is deterministic and uses same pose and map layers',()=>{
 const a=fixture.build({shaped:true,marked:true}),b=fixture.build({shaped:true,marked:true}),plain=fixture.build({shaped:true,marked:false});assert.deepEqual(inspect(a),inspect(b));assert.equal(inspect(a).triangles,inspect(plain).triangles);
 assert.notEqual(a.children[0].geometry,b.children[0].geometry);assert.deepEqual(a.children[0].geometry.attributes.position.array,plain.children[0].geometry.attributes.position.array);dispose(a);dispose(b);dispose(plain);
});
