import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import recipe from '../models/anatomy-hand.js';
import { buildModel, inspect, dispose } from './lib/modeling.js';
import { assetInfo } from './lib/rigging.js';
import { exportAssetGLB } from './lib/export-assets.js';
import { createStudioLighting } from './lib/studio-lighting.js';
const $=s=>document.querySelector(s),view=$('#viewport');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;
view.prepend(renderer.domElement);const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.0001,100);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;
const lighting=createStudioLighting(scene,renderer);let root,mixer,helper,clipAction,parameters={component:'hand',representation:'baked',spread:.3},animation='';
function render(){root?.updateMatrixWorld(true);renderer.render(scene,camera);}
function resize(){const w=view.clientWidth,h=view.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();render();}
const directions={front:[0,0,1],back:[0,0,-1],side:[1,0,.1],threequarter:[.75,.35,2]};
function frame(name='front'){
  const b=new THREE.Box3().setFromObject(root,true),c=b.getCenter(new THREE.Vector3()),r=b.getBoundingSphere(new THREE.Sphere()).radius;
  const angle=Math.atan(Math.tan(camera.fov*Math.PI/360)*Math.min(camera.aspect,1));
  camera.position.copy(c).addScaledVector(new THREE.Vector3(...directions[name]).normalize(),r/Math.sin(angle)*1.10);
  camera.near=Math.max(.00001,r/100);camera.far=Math.max(10,r*100);camera.updateProjectionMatrix();controls.target.copy(c);controls.update();lighting.fit(b);render();
}
function skeletonVisible(visible){if(helper){scene.remove(helper);helper.dispose();helper=null;}if(visible){helper=new THREE.SkeletonHelper(root);helper.material.depthTest=false;scene.add(helper);}render();}
function pose(name='',time=1.1){
  animation=name;mixer.stopAllAction();root.traverse(o=>{if(o.isSkinnedMesh)o.pose();});clipAction=null;
  let found;root.traverse(o=>{found ||= o.animations?.find(c=>c.name===name);});
  if(found){clipAction=mixer.clipAction(found);clipAction.play();clipAction.paused=!$('#play').checked;clipAction.time=time;mixer.update(0);}
  render();
}
function set(values={}){
  parameters={...parameters,...values};const next=buildModel(recipe,parameters);
  if(helper){scene.remove(helper);helper.dispose();helper=null;}if(root){scene.remove(root);dispose(root);}root=next;scene.add(root);mixer=new THREE.AnimationMixer(root);
  const s=inspect(root),r=assetInfo(root);$('#stats').textContent=`${s.triangles.toLocaleString()} triangles\n${r.bones} joints · ${r.uvMeshes} UV meshes\n${r.textures} textures\n${parameters.representation.toUpperCase()}`;
  $('#component').value=parameters.component;$('#representation').value=parameters.representation;$('#spread').value=parameters.spread;$('#status').textContent='Ready';
  frame();pose($('#pose').value);skeletonVisible($('#rig').checked);return{s,r};
}
for(const id of ['component','representation','spread'])$('#'+id).addEventListener('change',()=>{
  $('#status').textContent='Building…';requestAnimationFrame(()=>{try{set({[id]:id==='spread'?Number($('#'+id).value):$('#'+id).value});}catch(e){$('#status').textContent=e.message;console.error(e);}});
});
$('#pose').onchange=()=>pose($('#pose').value);$('#play').onchange=()=>{if(clipAction)clipAction.paused=!$('#play').checked;};$('#rig').onchange=()=>skeletonVisible($('#rig').checked);
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>frame(b.dataset.view);
$('#export').onclick=async()=>{const b=$('#export');b.disabled=true;try{const bytes=await exportAssetGLB(recipe,parameters),url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'})),a=document.createElement('a');a.href=url;a.download=`${parameters.component}-${parameters.representation}.glb`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch(e){$('#status').textContent=e.message;}finally{b.disabled=false;}};
controls.addEventListener('change',render);new ResizeObserver(resize).observe(view);resize();set();
window.lab={set,frame,pose,skeletonVisible,render,stats:()=>inspect(root),rigInfo:()=>assetInfo(root),exportGLB:()=>exportAssetGLB(recipe,parameters),
 normalMaps(){const maps=[];root.traverse(o=>{const t=o.material?.normalMap;if(t?.isDataTexture)maps.push({name:o.name,width:t.image.width,height:t.image.height,rgba:Array.from(t.image.data),report:t.userData.bake});});return maps;},
 get state(){return{...parameters}},ready:true};
let previous=performance.now();if(!new URLSearchParams(location.search).has('capture'))renderer.setAnimationLoop(now=>{mixer?.update(Math.min(.1,(now-previous)/1000));previous=now;render();});
