import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {radialProfileMaps} from '../src/lib/radial-profile-maps.js';
import {signalLensGeometry} from '../src/lib/cyber/signal-face.js';
import {radialPort,cyberMaterials} from '../src/lib/cyber/mechanics.js';
import {inspect,dispose,buildModel,parametersFor} from '../src/lib/modeling.js';
import recipe from '../models/cyber-form-study.js';
const stops=[[0,'#ffffff',0],[1,'#000000',1]];
test('radial profile filters color in linear space, owns independent sRGB maps and inputs',()=>{
 const source=structuredClone(stops),a=radialProfileMaps({size:16,stops:source,samples:1}),b=radialProfileMaps({size:16,stops:source,samples:1});
 assert.deepEqual(source,stops);assert.deepEqual(a.map.image.data,b.map.image.data);assert.notEqual(a.map.image.data,b.map.image.data);assert.notEqual(a.map,a.emissiveMap);
 assert.equal(a.map.colorSpace,THREE.SRGBColorSpace);assert.equal(a.emissiveMap.colorSpace,THREE.SRGBColorSpace);assert.equal(a.map.flipY,false);
 // Pixel center, not texel corner. Half-radiance is brighter than encoded 127.
 const x=11,y=8,r=Math.hypot((x+.5)/16-.5,(y+.5)/16-.5)/.5;
 const expected=Math.round(255*(1.055*(1-r)**(1/2.4)-.055));assert.equal(a.map.image.data[(y*16+x)*4],expected);
 assert.ok([...a.emissiveMap.image.data].every((v,i)=>i%4===3?v===255:v===0),'black emitting endpoint and white unlit endpoint emit no radiance');
 a.map.dispose();a.emissiveMap.dispose();b.map.dispose();b.emissiveMap.dispose();
});
test('emission weight is independent, radial bands are symmetric and bounded',()=>{
 const {map,emissiveMap}=radialProfileMaps({size:32,stops:[[0,'#ff0000',1],[.4,'#ff0000',1],[.5,'#00ff00',0],[1,'#0000ff',0]]});
 const d=map.image.data;
 for(let y=0;y<32;y++)for(let x=0;x<32;x++)for(let k=0;k<3;k++)assert.equal(d[(y*32+x)*4+k],d[(y*32+31-x)*4+k]);
 assert.ok(emissiveMap.image.data[(16*32+16)*4]>250);assert.equal(emissiveMap.image.data[2],0);
 map.dispose();emissiveMap.dispose();
});
test('invalid profiles fail rather than silently changing intent',()=>{
 for(const opts of [{size:17},{samples:3},{radius:0},{center:[0]},{stops:[[.1,'#ffffff'],[1,'#000000']]},{stops:[[0,'#fff'],[1,'#000000']]},{stops:[[0,'#ffffff',2],[1,'#000000']]},{stops:[[0,'#ffffff'],[0,'#000000'],[1,'#ffffff']]}])assert.throws(()=>radialProfileMaps({stops,...opts}));
});
test('lens is finite, outward, planar-UV mapped, and independent of optical bands',()=>{
 const g=signalLensGeometry(.1),p=g.attributes.position,n=g.attributes.normal,index=g.index.array,uv=g.attributes.uv;
 for(let i=0;i<index.length;i+=3){const [a,b,c]=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,index[i+k]));assert.ok(b.sub(a).cross(c.sub(a)).z>0);}
 for(let i=0;i<p.count;i++){assert.ok(n.getZ(i)>0);assert.ok(Math.abs(uv.getX(i)-(.5+p.getX(i)/.2))<1e-6);}
 assert.throws(()=>signalLensGeometry(0));g.dispose();
});
test('mapped port reduces geometry but preserves housing, bezel, rim, bolts and its attachment frame',()=>{
 const a=radialPort({},cyberMaterials()),b=radialPort({},cyberMaterials({emitterStyle:'mapped'}));
 assert.ok(inspect(b).triangles<inspect(a).triangles*.55);
 for(const suffix of ['housing','machined bezel','recess','luminous annulus','captive screw']){
  const x=a.getObjectByName('Radial port / '+suffix),y=b.getObjectByName('Radial port / '+suffix);assert.deepEqual(x.geometry.attributes.position.array,y.geometry.attributes.position.array);assert.deepEqual(x.position,y.position);
 }
 assert.deepEqual(a.scale,b.scale);assert.ok(b.getObjectByName('Radial port / signal lens').material.emissiveMap);dispose(a);dispose(b);
});
test('palette-local sharing never shares mapped textures between independent builds',()=>{
 const p=cyberMaterials({emitterStyle:'mapped'}),a=radialPort({},p),b=radialPort({},p),c=radialPort({},cyberMaterials({emitterStyle:'mapped'}));
 const mat=o=>o.getObjectByName('Radial port / signal lens').material;
 assert.equal(mat(a),mat(b));assert.notEqual(mat(a).map,mat(c).map);dispose(a);dispose(b);dispose(c);
});
test('optical variant does not move body, head, joints, feet or named reactor origins',()=>{
 const opts={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',gestureStyle:'counterpose',poseStyle:'relaxed',jointStyle:'housed',massStyle:'sculpted',handStyle:'relaxed',panelStyle:'cutaway',footStyle:'bridged',cables:false};
 assert.equal(parametersFor(recipe).emitterStyle,'rings');
 const a=buildModel(recipe,opts),b=buildModel(recipe,{...opts,emitterStyle:'mapped'});
 assert.equal(a.userData.units,'meters');a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 for(const name of ['BodyGesture','HeadMount','Hip.Near','Knee.Near','Elbow.Near','Wrist.Near','Main radial reactor','Boot.L planted','Boot.R planted'])assert.deepEqual(a.getObjectByName(name).matrixWorld.elements,b.getObjectByName(name).matrixWorld.elements,name);
 assert.deepEqual(a.getObjectByName('Android').userData.poseGuide,b.getObjectByName('Android').userData.poseGuide);assert.ok(inspect(b).triangles<inspect(a).triangles);dispose(a);dispose(b);
});
