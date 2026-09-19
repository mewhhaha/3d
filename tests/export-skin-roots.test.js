import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {promoteExportSkinRoots} from '../src/lib/export-skin-roots.js';
import {humanoidMannequin} from '../src/lib/humanoid-mannequin.js';
import {dispose} from '../src/lib/modeling.js';

test('opted-in identity skins become actual scene roots without changing any bone or geometry',()=>{
 const scene=new T.Scene(),root=humanoidMannequin();scene.add(root);scene.updateMatrixWorld(true);
 const meshes=[];root.traverse(n=>{if(n.isSkinnedMesh)meshes.push([n,n.geometry,n.skeleton,n.bindMatrix.toArray()]);});
 const before=root.getObjectByName('LeftHand').matrixWorld.toArray();
 assert.equal(promoteExportSkinRoots(scene),34);
 for(const [m,g,s,bind]of meshes){assert.equal(m.parent,scene);assert.equal(m.geometry,g);assert.equal(m.skeleton,s);assert.deepEqual(m.bindMatrix.toArray(),bind);}
 assert.deepEqual(root.getObjectByName('LeftHand').matrixWorld.toArray(),before);
 dispose(scene);
});
test('unrequested layouts stay intact, ambiguous transforms/animation fail before mutation',()=>{
 const scene=new T.Scene(),root=humanoidMannequin();scene.add(root);root.userData.exportSkinRoots=false;
 assert.equal(promoteExportSkinRoots(scene),0);root.userData.exportSkinRoots=true;
 root.position.x=1;const skin=root.getObjectByName('Pelvis mass');assert.throws(()=>promoteExportSkinRoots(scene),/identity/);assert.equal(skin.parent,root);
 root.position.x=0;const clip=new T.AnimationClip('invalid',1,[new T.VectorKeyframeTrack(skin.uuid+'.position',[0,1],[0,0,0,0,1,0])]);root.animations.push(clip);
 assert.throws(()=>promoteExportSkinRoots(scene),/animated/);assert.equal(skin.parent,root);
 dispose(scene);
});
