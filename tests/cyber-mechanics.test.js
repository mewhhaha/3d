import test from 'node:test';
import assert from 'node:assert/strict';
import { inspect, dispose, THREE } from '../src/lib/modeling.js';
import { cyberMaterials, panel, radialArray, radialPort, cableCurve, routedCable, cableLoom, orient } from '../src/lib/cyber/mechanics.js';
test('contour plates support a true aperture and reject invalid outlines',()=>{
 const m=cyberMaterials();const p=panel({outline:[[-1,-1],[1,-1],[1,1],[-1,1]],holes:[{at:[0,0],radius:.3}],material:m.shell});
 assert.ok(inspect(p).triangles>0);p.updateMatrixWorld(true);
 assert.equal(new THREE.Raycaster(new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)).intersectObject(p).length,0);
 assert.ok(new THREE.Raycaster(new THREE.Vector3(.7,0,1),new THREE.Vector3(0,0,-1)).intersectObject(p).length>0);
 assert.throws(()=>panel({outline:[[0,0],[1,0],[NaN,1]]}));dispose(p);
});
test('cable routes preserve endpoints, arc-length clamp positions and tangent frames',()=>{
 const pts=[[0,0,0],[.1,.2,.03],[.3,.1,.05]], curve=cableCurve(pts),m=cyberMaterials();
 assert.deepEqual(curve.getPointAt(0).toArray(),pts[0]);assert.ok(curve.getPointAt(1).distanceTo(new THREE.Vector3(...pts.at(-1)))<1e-12);
 const cable=routedCable({points:pts,radius:.01,clamps:3,material:m.dark,clampMaterial:m.edge});
 assert.equal(cable.children.length,6);assert.ok(inspect(cable).triangles>0);assert.throws(()=>cableCurve([[0,0,0],[0,0,0]]));
 const group=orient(new THREE.Group(),[0,0,0],[1,0,0]);assert.ok(new THREE.Vector3(0,0,1).applyQuaternion(group.quaternion).distanceTo(new THREE.Vector3(1,0,0))<1e-12);dispose(cable);
});
test('emitter materials are build-owned and loom palettes are explicit',()=>{
 const a=cyberMaterials(),b=cyberMaterials();assert.notEqual(a.shell,b.shell);
 assert.throws(()=>cyberMaterials({glow:NaN}));assert.throws(()=>radialPort({color:'missing'},a));
 const originalIntensity=a.pink.emissiveIntensity;
 const loom=cableLoom({points:[[0,0,0],[0,.3,.1],[.1,.6,0]],emissiveScale:.5,opacity:.7},a);assert.equal(loom.children.length,3);
 assert.equal(a.pink.emissiveIntensity,originalIntensity);assert.equal(loom.userData.loomLook.opacity,.7);assert.ok(loom.children[0].children[0].material.transparent);
 assert.throws(()=>cableLoom({points:[[0,0,0],[0,.2,0]],opacity:0},a));dispose(loom);
});

test('radial arrays expose stable annular frames and compose owned modules',()=>{
 const g=radialArray({count:4,radius:.2,phase:Math.PI/4,build:(i,frame)=>{const o=new THREE.Group();o.name='module-'+i;o.userData.frame=frame;return o;}});
 assert.equal(g.children.length,4);assert.equal(g.userData.radialArray.orientation,'radial');
 for(const child of g.children)assert.ok(Math.abs(Math.hypot(child.position.x,child.position.y)-.2)<1e-12);
 assert.ok(Math.abs(g.children[0].rotation.z-Math.PI/4)<1e-12);
 assert.throws(()=>radialArray({count:0,radius:.1,build:()=>new THREE.Group()}));
 assert.throws(()=>radialArray({count:2,radius:.1,orientation:'bad',build:()=>new THREE.Group()}));dispose(g);
});
