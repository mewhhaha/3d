import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import * as THREE from 'three';
import {browserPath} from './render.mjs';
import {captureBonePose} from '../src/lib/bone-pose-state.js';

/** Actual browser GLB reload (including embedded PNG decoding) plus rigid-part
 * motion verification. The established skin tests remain separate. No texture
 * stubs or stripping of material extensions to make parsing pass. */
export async function checkCostumeExport(file,source,poses){
 const reset=captureBonePose(source),expected={};
 for(const name of poses){
  let clip;source.traverse(o=>{clip??=o.animations?.find(c=>c.name===name);});
  if(!clip)throw new Error('Missing source clip '+name);
  const mixer=new THREE.AnimationMixer(source);mixer.clipAction(clip).play();mixer.setTime(.5);source.updateMatrixWorld(true);
  expected[name]={};source.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh){const p=o.geometry.attributes.position;expected[name][o.name]=Array.from({length:p.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).toArray());}});
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
    const mixer=new T.AnimationMixer(gltf.scene);mixer.clipAction(clip).play();mixer.setTime(.5);gltf.scene.updateMatrixWorld(true);
    let max=0,sum=0,vertices=0;
    for(const [label,points]of Object.entries(objects)){
     const node=gltf.scene.getObjectByName(T.PropertyBinding.sanitizeNodeName(label));
     if(!node?.isMesh||node.geometry.attributes.position.count!==points.length)throw new Error('Changed rigid part '+label);
     points.forEach((p,i)=>{const q=new T.Vector3().fromBufferAttribute(node.geometry.attributes.position,i).applyMatrix4(node.matrixWorld);const d=q.distanceTo(new T.Vector3(...p));max=Math.max(max,d);sum+=d*d;vertices++;});
    }
    if(max>2e-6)throw new Error(name+' rigid export error '+max);
    report.poses[name]={vertices,maxPositionErrorMeters:max,rmsMeters:Math.sqrt(sum/vertices)};mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
   }
   return report;
  },{bytes:(await readFile(file)).toString('base64'),expected});
 }finally{await browser.close();}
}
