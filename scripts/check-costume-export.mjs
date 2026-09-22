import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import * as THREE from 'three';
import {browserPath} from './render.mjs';
import {captureBonePose} from '../src/lib/bone-pose-state.js';

/** Actual browser GLB reload (including embedded PNG decoding) plus rigid-part
 * motion verification. Optional named costume skins are evaluated explicitly;
 * unselected source skins remain outside this check. No texture
 * stubs or stripping of material extensions to make parsing pass. */
export async function checkCostumeExport(file,source,poses,{skinNames=[]}={}){
 if(!Array.isArray(skinNames)||skinNames.some(n=>!source.getObjectByName(n)?.isSkinnedMesh))throw new Error('Select existing costume skin names');
 const reset=captureBonePose(source),expected={};
 for(const name of poses){
  let clip;source.traverse(o=>{clip??=o.animations?.find(c=>c.name===name);});
  if(!clip)throw new Error('Missing source clip '+name);
  const mixer=new THREE.AnimationMixer(source);mixer.clipAction(clip).play();mixer.setTime(.5);source.updateMatrixWorld(true);source.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
  expected[name]={};source.traverse(o=>{if(o.isMesh&&(!o.isSkinnedMesh||skinNames.includes(o.name))){const p=o.geometry.attributes.position;expected[name][o.name]={points:Array.from({length:p.count},(_,i)=>o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld).toArray()),indices:o.geometry.index?Array.from(o.geometry.index.array):null};}});
  mixer.stopAllAction();mixer.uncacheRoot(source);reset();
 }
 const paths={three:'build/three.module.js',core:'build/three.core.js',loader:'examples/jsm/loaders/GLTFLoader.js',buffer:'examples/jsm/utils/BufferGeometryUtils.js',skeleton:'examples/jsm/utils/SkeletonUtils.js'},imports={};
 for(const [name,path]of Object.entries(paths)){
  const code=(await readFile('node_modules/three/'+path,'utf8')).replaceAll("'./three.core.js'","'core'").replaceAll("'../utils/BufferGeometryUtils.js'","'buffer'").replaceAll("'../utils/SkeletonUtils.js'","'skeleton'");
  imports[name]='data:text/javascript;base64,'+Buffer.from(code).toString('base64');
 }
 const browser=await chromium.launch({executablePath:await browserPath(),args:['--disable-gpu']});
 try{
  const page=await browser.newPage();await page.route('https://**/*',r=>r.abort());
  await page.setContent('<script type="importmap">'+JSON.stringify({imports})+'</script>');
  return await page.evaluate(async({bytes,expected})=>{
   const T=await import('three'),{GLTFLoader}=await import('loader');
   const gltf=await new GLTFLoader().parseAsync(Uint8Array.from(atob(bytes),c=>c.charCodeAt(0)).buffer,'');
   const textures=await gltf.parser.getDependencies('texture');
   if(textures.some(t=>!t.image||!(t.image.width>0&&t.image.height>0)))throw new Error('Undecoded texture');
   const report={textures:textures.map(t=>({name:t.name,width:t.image.width,height:t.image.height,colorSpace:t.colorSpace})),poses:{}};
   for(const [name,objects]of Object.entries(expected)){
    const clip=gltf.animations.find(c=>c.name===name);if(!clip)throw new Error('Missing exported clip '+name);
    const mixer=new T.AnimationMixer(gltf.scene);mixer.clipAction(clip).play();mixer.setTime(.5);gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
    let max=0,sum=0,vertices=0;
    for(const [label,{points,indices}]of Object.entries(objects)){
     const node=gltf.scene.getObjectByName(T.PropertyBinding.sanitizeNodeName(label));
     if(!node)throw new Error('Missing costume part '+label);
     // GLTFLoader represents a multi-material mesh as a group of primitives.
     // Verify every split primitive AND their concatenated original topology.
     const primitives=[];node.traverse(o=>{if(o.isMesh)primitives.push(o);});
     if(!primitives.length)throw new Error('Missing mesh primitives '+label);
     const importedIndices=[];
     for(const part of primitives){
      if(part.geometry.attributes.position.count!==points.length)throw new Error('Changed costume vertices '+label);
      if(indices){if(!part.geometry.index)throw new Error('Lost indexed topology '+label);importedIndices.push(...part.geometry.index.array);}
      points.forEach((p,i)=>{const q=part.getVertexPosition(i,new T.Vector3()).applyMatrix4(part.matrixWorld);const d=q.distanceTo(new T.Vector3(...p));max=Math.max(max,d);sum+=d*d;vertices++;});
     }
     if(indices&&(indices.length!==importedIndices.length||indices.some((v,i)=>v!==importedIndices[i])))throw new Error('Changed costume topology '+label);
    }
    if(max>2e-6)throw new Error(name+' costume export error '+max);
    report.poses[name]={vertices,maxPositionErrorMeters:max,rmsMeters:Math.sqrt(sum/vertices)};mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
   }
   return report;
  },{bytes:(await readFile(file)).toString('base64'),expected});
 }finally{await browser.close();}
}
