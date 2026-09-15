import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { inspect, dispose, buildModel } from '../src/lib/modeling.js';
import { wrapShell, onShell, refineTriangles } from '../src/lib/cyber/shells.js';
import { cyberMaterials } from '../src/lib/cyber/mechanics.js';
import { neonCity, neonLightRig } from '../src/lib/cyber/stage.js';
import { hydrateScene, findSceneLook } from '../src/lib/scene-look.js';
import android from '../models/cyber-android.js';
import sceneRecipe from '../models/cyber-android-scene.js';
const stations=[[.3,.08,.07],[.15,.10,.09],[0,.05,.04]];
test('shells have closed indexed rims, outward normals and surface-relative attachments',()=>{
 const shell=wrapShell({stations,arc:[-.5,.5],material:cyberMaterials().shell});
 const g=shell.geometry, index=g.index.array,edges=new Map();
 for(let i=0;i<index.length;i+=3)for(let j=0;j<3;j++){
  const a=index[i+j],b=index[i+(j+1)%3],key=a<b?`${a},${b}`:`${b},${a}`;
  const uses=edges.get(key)||[];uses.push(a<b?1:-1);edges.set(key,uses);
 }
 assert.ok([...edges.values()].every(e=>e.length===2&&e[0]+e[1]===0),'Closed, consistently wound shell');
 assert.ok(g.attributes.normal.getZ(12*37+18)>.98,'Outer front normal');
 const attached=onShell(new THREE.Group(),stations,{t:.5,clearance:.003});
 assert.ok(Math.abs(attached.position.distanceTo(new THREE.Vector3(0,.15,.09))-.003)<1e-8);
 assert.ok(attached.position.z>.0929,'Clearance follows the sloped surface normal');
 assert.throws(()=>wrapShell({stations:[[0,.1,.1],[1,.1,.1]]}));
 assert.throws(()=>onShell(attached,stations,{t:2}));dispose(shell);
});
test('triangle refinement preserves UV range and increases deformation samples',()=>{
 const source=new THREE.PlaneGeometry(1,1),refined=refineTriangles(source,2);
 assert.equal(refined.index.count,source.index.count*16);
 assert.ok([...refined.attributes.uv.array].every(v=>v>=0&&v<=1));
 source.dispose();refined.dispose();
});
test('reference scene is geometry, a named camera, authored lights and explicit optical settings',()=>{
 const root=buildModel(sceneRecipe,{detail:'draft'}),look=findSceneLook(root),stats=inspect(root);
 assert.equal(look.subject,'Android');assert.equal(look.depthOfField.target,'HeadMount');
 assert.ok(root.getObjectByName(look.camera).isPerspectiveCamera);
 let lights=0;root.traverse(n=>{if(n.isLight)lights++;});assert.equal(lights,5);
 assert.ok(stats.triangles<1000000);assert.ok(stats.triangles>50000);
 assert.ok(root.getObjectByName('Hanging power loop'));assert.ok(root.getObjectByName('NeonPlatform'));
 dispose(root);
});
test('city batching is deterministic and light target directions survive ObjectLoader',async()=>{
 const a=neonCity({seed:12,density:.1}),b=neonCity({seed:12,density:.1});
 assert.deepEqual(inspect(a),inspect(b));assert.ok(a.children.length<15);
 const lights=neonLightRig();lights.updateMatrixWorld(true);
 const clone=hydrateScene(await new THREE.ObjectLoader().parseAsync(lights.toJSON()));clone.updateMatrixWorld(true);
 const before=lights.getObjectByName('Warm key'),after=clone.getObjectByName('Warm key');
 const direction=o=>o.target.getWorldPosition(new THREE.Vector3()).sub(o.getWorldPosition(new THREE.Vector3())).normalize();
 assert.ok(direction(before).distanceTo(direction(after))<1e-12);dispose(a);dispose(b);
});
test('draft is reduced geometry, not a falsely advertised normal-baked LOD; head clip moves and restores',()=>{
 const a=buildModel(android,{detail:'draft'}),b=buildModel(android,{detail:'hero'});
 assert.ok(inspect(a).triangles<inspect(b).triangles);
 const target=a.getObjectByName('HeadMount'),q=target.quaternion.clone();
 const mixer=new THREE.AnimationMixer(a),clip=a.children[0].animations[0];
 mixer.clipAction(clip).play();mixer.setTime(2);assert.ok(q.angleTo(target.quaternion)>.04);
 mixer.stopAllAction();assert.ok(q.angleTo(target.quaternion)<1e-7);mixer.uncacheRoot(a);
 dispose(a);dispose(b);
});
