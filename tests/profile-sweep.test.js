import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {profileSweepGeometry} from '../src/lib/profile-sweep.js';
import {faceRegionNames,faceRegionTriangles} from '../src/lib/face-regions.js';

const straight=()=>new THREE.LineCurve3(new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,1));
const rectangle=[[-.10,-.04],[.10,-.04],[.10,.04],[-.10,.04]];

function assertFiniteAttribute(attribute){for(const value of attribute.array)assert.ok(Number.isFinite(value));}

test('closed profile sweep separates path tessellation from authored section and caps the ends',()=>{
 const geometry=profileSweepGeometry({path:straight(),profile:rectangle,segments:8,up:[1,0,0]});
 assert.equal(geometry.userData.profileSweep.profilePoints,4);
 assert.equal(geometry.userData.profileSweep.segments,8);
 assert.equal(geometry.userData.profileSweep.caps,true);
 assert.equal(geometry.index.count/3,8*4*2+4,'side quads plus two rectangular cap triangles per end');
 assertFiniteAttribute(geometry.attributes.position);assertFiniteAttribute(geometry.attributes.normal);assertFiniteAttribute(geometry.attributes.uv);
 geometry.computeBoundingBox();
 const size=geometry.boundingBox.getSize(new THREE.Vector3());
 assert.ok(Math.abs(size.x-.2)<1e-6);assert.ok(Math.abs(size.y-.08)<1e-6);assert.ok(Math.abs(size.z-1)<1e-6);
});

test('anisotropic taper changes section size without moving the guide origin',()=>{
 const geometry=profileSweepGeometry({path:straight(),profile:rectangle,segments:4,up:[1,0,0],scale:t=>[1-.5*t,1+.5*t],caps:false});
 const ring=5,position=geometry.attributes.position;
 const start=new THREE.Vector3().fromBufferAttribute(position,0),end=new THREE.Vector3().fromBufferAttribute(position,4*ring);
 assert.ok(Math.abs(start.x+.1)<1e-6);assert.ok(Math.abs(start.y+.04)<1e-6);assert.ok(Math.abs(start.z)<1e-6);
 assert.ok(Math.abs(end.x+.05)<1e-6);assert.ok(Math.abs(end.y+.06)<1e-6);assert.ok(Math.abs(end.z-1)<1e-6);
});

test('open profiles produce ribbons without hidden end caps',()=>{
 const geometry=profileSweepGeometry({path:[[0,0,0],[0,.3,.2],[.2,.5,.4]],profile:[[-.08,0],[0,.02],[.08,0]],closedProfile:false,segments:10,up:[1,0,0]});
 assert.equal(geometry.userData.profileSweep.closedProfile,false);assert.equal(geometry.userData.profileSweep.caps,false);
 assert.equal(geometry.index.count/3,10*2*2);
});

test('tilt rolls the section around the guide tangent while closed path seams remain exact',()=>{
 const base=profileSweepGeometry({path:straight(),profile:rectangle,segments:4,up:[1,0,0],tilt:0,caps:false});
 const rolled=profileSweepGeometry({path:straight(),profile:rectangle,segments:4,up:[1,0,0],tilt:90,caps:false});
 const a=new THREE.Vector3().fromBufferAttribute(base.attributes.position,0),b=new THREE.Vector3().fromBufferAttribute(rolled.attributes.position,0);
 assert.ok(Math.abs(a.x-b.y)<1e-6);assert.ok(Math.abs(a.y+b.x)<1e-6);
 const loop=new THREE.CatmullRomCurve3([
  new THREE.Vector3(.4,0,0),new THREE.Vector3(.1,.2,.3),new THREE.Vector3(-.35,.05,.18),new THREE.Vector3(-.2,-.2,-.22),new THREE.Vector3(.12,-.18,-.34)
 ],true,'centripetal');
 const closed=profileSweepGeometry({path:loop,profile:rectangle,segments:32,closed:true,up:[1,0,0]});
 const ring=5;
 for(let j=0;j<ring;j++){
  const first=new THREE.Vector3().fromBufferAttribute(closed.attributes.position,j),last=new THREE.Vector3().fromBufferAttribute(closed.attributes.position,32*ring+j);
  assert.ok(first.distanceTo(last)<1e-6);
 }
});

test('local profile offsets keep section shape independent from placement',()=>{
 const geometry=profileSweepGeometry({path:straight(),profile:rectangle,segments:2,up:[1,0,0],offset:t=>[.02*t,-.01],caps:false});
 const position=geometry.attributes.position,ring=5;
 const start=new THREE.Vector3().fromBufferAttribute(position,0),end=new THREE.Vector3().fromBufferAttribute(position,2*ring);
 assert.ok(Math.abs(start.x+.1)<1e-6);assert.ok(Math.abs(start.y+.05)<1e-6);
 assert.ok(Math.abs(end.x+.08)<1e-6);assert.ok(Math.abs(end.y+.05)<1e-6);
});

test('profile sweep rejects malformed path, profile and taper fields',()=>{
 assert.throws(()=>profileSweepGeometry({path:[[0,0,0]],profile:rectangle}),/path/);
 assert.throws(()=>profileSweepGeometry({path:straight(),profile:[[0,0],[1,0]],closedProfile:true}),/at least 3/);
 assert.throws(()=>profileSweepGeometry({path:straight(),profile:[[0,0],[1,0],[1,0],[0,1]]}),/duplicate adjacent/);
 assert.throws(()=>profileSweepGeometry({path:straight(),profile:rectangle,scale:0}),/scale/);
 assert.throws(()=>profileSweepGeometry({path:straight(),profile:rectangle,scale:()=>[1,NaN]}),/scale/);
 assert.throws(()=>profileSweepGeometry({path:straight(),profile:rectangle,offset:[0,NaN]}),/offset/);
});

test('profile sweep exposes exact structural side and cap regions',()=>{
 const geometry=profileSweepGeometry({path:straight(),profile:rectangle,segments:8,up:[1,0,0],regionPrefix:'strap'});
 assert.deepEqual(faceRegionNames(geometry),['strap.cap.end','strap.cap.start','strap.side']);
 assert.equal(faceRegionTriangles(geometry,'strap.side').length,8*4*2);
 assert.equal(faceRegionTriangles(geometry,'strap.cap.start').length,2);
 assert.equal(faceRegionTriangles(geometry,'strap.cap.end').length,2);
});

test('parametric face regions are authored in sweep space instead of world coordinates',()=>{
 const build=segments=>profileSweepGeometry({
  path:straight(),profile:rectangle,segments,up:[1,0,0],regionPrefix:'strap',
  faceRegions:{
   'strap.tip':meta=>meta.kind==='side'&&meta.pathMid>=.75,
   'strap.flank':meta=>meta.kind==='side'&&meta.profileEdge===1,
   'strap.terminal':meta=>meta.kind==='cap'&&meta.end==='end',
  },
 });
 const coarse=build(8),fine=build(16);
 assert.equal(faceRegionTriangles(coarse,'strap.tip').length,2*4*2);
 assert.equal(faceRegionTriangles(fine,'strap.tip').length,4*4*2);
 assert.equal(faceRegionTriangles(coarse,'strap.flank').length,8*2);
 assert.equal(faceRegionTriangles(fine,'strap.flank').length,16*2);
 assert.deepEqual(faceRegionTriangles(coarse,'strap.terminal'),faceRegionTriangles(coarse,'strap.cap.end'));
 assert.deepEqual(faceRegionTriangles(fine,'strap.terminal'),faceRegionTriangles(fine,'strap.cap.end'));
});

test('open profile region metadata omits nonexistent caps and validates selectors',()=>{
 const geometry=profileSweepGeometry({
  path:straight(),profile:[[-.08,0],[0,.02],[.08,0]],closedProfile:false,segments:10,up:[1,0,0],regionPrefix:'ribbon',
  faceRegions:{'ribbon.leading':meta=>meta.kind==='side'&&meta.profileEdge===0},
 });
 assert.deepEqual(faceRegionNames(geometry),['ribbon.leading','ribbon.side']);
 assert.equal(faceRegionTriangles(geometry,'ribbon.leading').length,20);
 assert.throws(()=>profileSweepGeometry({path:straight(),profile:rectangle,regionPrefix:'strap',faceRegions:{'strap.side':()=>true}}),/collides/);
 assert.throws(()=>profileSweepGeometry({path:straight(),profile:rectangle,faceRegions:{bad:true}}),/predicate/);
});
