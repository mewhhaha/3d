import { findSceneLook, createLookRenderer } from './lib/scene-look.js';
import { createStudioLighting, installLightingControls } from './lib/studio-lighting.js';
import { installWorkbench } from './lib/workbench.js';
import { installRigControls } from './lib/rig-controls.js';
import { exportAssetGLB } from './lib/export-assets.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildModel, parametersFor, inspect, dispose } from './lib/modeling.js';
import catalog from './catalog.js';
const $ = selector => document.querySelector(selector);
const canvas = $('#canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
const environment = pmrem.fromScene(room, 0.04);scene.environment = environment.texture;room.dispose();pmrem.dispose();
const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000);
const controls = new OrbitControls(camera, canvas);controls.enableDamping = true;controls.dampingFactor = 0.09;controls.autoRotateSpeed = 1.5;
const lighting = createStudioLighting(scene, renderer);
const lookRenderer = createLookRenderer(renderer,scene);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.13 }));
ground.rotation.x = -Math.PI / 2;ground.receiveShadow = true;scene.add(ground);
const grid = new THREE.GridHelper(10, 20, '#c6d2c7', '#dce2d8');grid.material.transparent = true;grid.material.opacity = 0.48;scene.add(grid);
const wireMaterial = new THREE.MeshBasicMaterial({ color: '#35554d', wireframe: true });
let selected, parameters = {}, root, stats, buildError = null;
let view = 'perspective', version = { sha: 'local', repository: 'mewhhaha/3d' };
let pending = 0, busy = false, workbench, rigControls;
function report(error) {buildError = error;$('#error').hidden = false;$('#error').textContent = error.message || String(error);$('#status').textContent = 'Build failed';console.error(error);}
function render() {const look=findSceneLook(root);lookRenderer.render(camera,look&&!scene.overrideMaterial?look:null);}
function resize() {
 const bounds = $('#viewport').getBoundingClientRect();renderer.setSize(Math.max(1,bounds.width),Math.max(1,bounds.height),false);
 camera.aspect=bounds.width/Math.max(1,bounds.height);const look=findSceneLook(root);if(look&&view==='perspective'){const hero=root.getObjectByName(look.camera);camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(hero.fov)/2)*Math.max(1,hero.aspect/camera.aspect)));}camera.updateProjectionMatrix();render();
}
new ResizeObserver(resize).observe($('#viewport'));
function frame(nextView='perspective') {
 if(!root)return;view=nextView;
 const look=findSceneLook(root);
 scene.getObjectByName('PreviewLighting').visible=!look;
 ground.visible=!look;grid.visible=!look&&$('#grid').checked;
 camera.fov=38;scene.environmentIntensity=look?0:.35;
 if($('#lighting-preset')){$('#lighting-preset').disabled=!!look;$('#lighting-tools p').textContent=look?'Authored scene lights export with this scene. Exposure and optical effects are preview settings.':'Preview lights stay out of the model GLB.';}
 if(look){scene.background=new THREE.Color(look.background);scene.fog=new THREE.Fog(look.background,look.fog.near,look.fog.far);}else{scene.fog=null;lighting.setPreset(lighting.info().preset);}
 const bounds=new THREE.Box3().setFromObject(look?root.getObjectByName(look.subject):root,true),center=bounds.getCenter(new THREE.Vector3()),radius=Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius,.01);
 const vfov=THREE.MathUtils.degToRad(camera.fov),hfov=2*Math.atan(Math.tan(vfov/2)*camera.aspect),distance=radius/Math.sin(Math.min(vfov,hfov)/2)*1.22;
 const directions={perspective:[.65,.18,1.9],front:[0,0,1],side:[1,0,0],top:[0,1,.0001]};
 if(!directions[nextView])throw new Error('Unknown view');
 camera.position.copy(center).add(new THREE.Vector3(...directions[nextView]).normalize().multiplyScalar(distance));camera.near=radius/100;camera.far=distance+radius*100;camera.updateProjectionMatrix();
 controls.target.copy(center);controls.minDistance=radius*.1;controls.maxDistance=distance*8;controls.update();
 const span=radius*3;ground.position.set(center.x,bounds.min.y-radius*.001,center.z);ground.scale.setScalar(span*10);grid.position.set(center.x,bounds.min.y-radius*.002,center.z);grid.scale.setScalar(span/10);lighting.fit(bounds);
 if(look&&nextView==='perspective'){const hero=root.getObjectByName(look.camera);camera.position.copy(hero.getWorldPosition(new THREE.Vector3()));camera.quaternion.copy(hero.getWorldQuaternion(new THREE.Quaternion()));camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(hero.fov)/2)*Math.max(1,hero.aspect/camera.aspect)));camera.near=hero.near;camera.far=hero.far;camera.updateProjectionMatrix();controls.target.fromArray(hero.userData.lookAt);controls.update();}
 render();
}
function frameDetail(feature='face') {
 const object=root?.children.find(o=>o.userData.landmarks);if(!object)throw new Error('This model has no anatomical landmarks');
 const anchors=object.userData.landmarks,presets={face:{key:'l-eye',delta:[-anchors['l-eye'][0],-.005,0],radius:.16,direction:[.28,.02,1]},hand:{key:'l-hand',delta:[0,-.055,0],radius:.10,direction:[.5,.2,1]},boots:{key:'l-ankle',delta:[0,.04,.04],radius:.19,direction:[1,.3,1.3]}};
 const p=presets[feature];if(!p)throw new Error('Unknown detail view');const c=new THREE.Vector3(...anchors[p.key]).add(new THREE.Vector3(...p.delta));object.localToWorld(c);
 const radius=p.radius*object.scale.x,vfov=THREE.MathUtils.degToRad(camera.fov),hfov=2*Math.atan(Math.tan(vfov/2)*camera.aspect),distance=radius/Math.sin(Math.min(vfov,hfov)/2)*1.1;
 camera.position.copy(c).addScaledVector(new THREE.Vector3(...p.direction).normalize(),distance);camera.near=radius/100;camera.updateProjectionMatrix();controls.target.copy(c);controls.update();render();
}
function writeHash(){const hash=new URLSearchParams({model:selected.id});for(const [name,value] of Object.entries(parameters))hash.set(`p.${name}`,String(value));history.replaceState(null,'',`${location.pathname}${location.search}#${hash}`);}
function showStats(){const rows=[['Objects',stats.meshes.toLocaleString()],['Triangles',stats.triangles.toLocaleString()],['Materials',stats.materials.toLocaleString()],['Size (X × Y × Z)',stats.dimensions.map(n=>n.toFixed(2)).join(' × ')+' m']];$('#stats').replaceChildren(...rows.flatMap(([label,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;return[dt,dd];}));}
function rebuild({fit=false}={}) {
 cancelAnimationFrame(pending);pending=0;
 try{const next=buildModel(selected,parameters),old=root;root=next;parameters=next.userData.parameters;stats=inspect(next);if(old){scene.remove(old);dispose(old);}scene.add(root);
 buildError=null;$('#error').hidden=true;$('#status').textContent='● Ready';showStats();writeHash();workbench?.refresh();rigControls?.refresh(root);
 if($('#detail-tools'))$('#detail-tools').hidden=!root.children.some(o=>o.userData.landmarks);
 frame(fit?'perspective':view);render();}catch(error){report(error);}
}
function parameterInputs(){
 $('#parameters').replaceChildren();for(const [name,spec] of Object.entries(selected.parameters)){
 const label=document.createElement('label');label.className=`parameter ${spec.type}`;
 const heading=document.createElement('span');heading.className='parameter-heading';const text=document.createElement('span');text.textContent=spec.label||name;const output=document.createElement('output');heading.append(text,output);label.append(heading);
 const input=document.createElement(spec.type==='select'?'select':'input');input.name=name;input.id=`parameter-${name}`;input.setAttribute('aria-label',spec.label||name);label.htmlFor=input.id;
 if(spec.type==='select'){for(const value of spec.options){const option=document.createElement('option');option.value=option.textContent=value;input.append(option);}input.value=parameters[name];}
 else if(spec.type==='boolean'){input.type='checkbox';input.checked=parameters[name];}else if(spec.type==='color'){input.type='color';input.value=parameters[name];}
 else Object.assign(input,{type:'range',min:spec.min,max:spec.max,step:spec.step,value:parameters[name]});
 output.value=spec.type==='boolean'?'':String(parameters[name]);input.addEventListener('input',()=>{parameters[name]=spec.type==='boolean'?input.checked:spec.type==='number'?Number(input.value):input.value;output.value=spec.type==='boolean'?'':String(parameters[name]);cancelAnimationFrame(pending);pending=requestAnimationFrame(()=>rebuild());});label.append(input);$('#parameters').append(label);
 }
}
function select(id,values={}){
 const entry=catalog.find(item=>item.model.id===id);if(!entry)throw new Error(`Unknown model: ${id}`);selected=entry.model;parameters=parametersFor(selected,values);
 $('#model-title').textContent=selected.title;$('#description').textContent=selected.description||'';$('#source-link').href=`https://github.com/${version.repository}/blob/${version.sha==='local'?'main':version.sha}/models/${entry.file}`;document.title=`${selected.title} · 3D Workshop`;
 for(const button of $('#model-list').children)button.setAttribute('aria-current',String(button.dataset.id===id));parameterInputs();rebuild({fit:true});if(buildError)throw buildError;return stats;
}
function setParameters(values){parameters=parametersFor(selected,{...parameters,...values});parameterInputs();rebuild();if(buildError)throw buildError;return stats;}
function loadHash(){const hash=new URLSearchParams(location.hash.slice(1)),id=hash.get('model'),values=Object.fromEntries([...hash.entries()].filter(([key])=>key.startsWith('p.')).map(([key,value])=>[key.slice(2),value]));select(catalog.some(item=>item.model.id===id)?id:(catalog.some(item=>item.model.id==='cyber-android-scene')?'cyber-android-scene':catalog[0].model.id),values);}
async function exportGLB(){if(pending)rebuild();if(buildError)throw buildError;return exportAssetGLB(selected,parameters);}
function download(blob,filename){const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function action(button,fn){if(busy)return;busy=true;button.disabled=true;try{await fn();}catch(error){$('#status').textContent=error.message||String(error);}finally{busy=false;button.disabled=false;}}
$('#download-glb').onclick=event=>action(event.currentTarget,async()=>{const id=selected.id,data=await exportGLB();download(new Blob([data],{type:'model/gltf-binary'}),`${id}.glb`);});
$('#download-png').onclick=event=>action(event.currentTarget,async()=>{render();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Could not capture image');download(blob,`${selected.id}.png`);});
$('#download-recipe').onclick=()=>{if(pending)rebuild();download(new Blob([JSON.stringify({model:selected.id,parameters,commit:version.sha},null,2)],{type:'application/json'}),`${selected.id}.parameters.json`);};
$('#share').onclick=event=>action(event.currentTarget,async()=>{if(pending)rebuild();try{await navigator.clipboard.writeText(location.href);$('#status').textContent='Link copied';}catch{$('#status').textContent='Copy the URL from your address bar';}});
$('#reset').onclick=()=>select(selected.id);$('#fit').onclick=()=>frame();for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>frame(button.dataset.view);
$('#wireframe').onchange=event=>{scene.overrideMaterial=event.target.checked?wireMaterial:null;ground.visible=!event.target.checked&&!findSceneLook(root);render();};$('#grid').onchange=event=>{grid.visible=event.target.checked&&!findSceneLook(root);render();};$('#rotate').onchange=event=>{controls.autoRotate=event.target.checked;};$('#parameters').onsubmit=event=>event.preventDefault();canvas.addEventListener('keydown',event=>{if(event.key.toLowerCase()==='f')frame();});window.addEventListener('hashchange',()=>{try{loadHash();}catch(error){report(error);}});
if(!catalog.length)throw new Error('No recipes found in models/');
try{const response=await fetch(new URL('../build.json',import.meta.url));if(response.ok)version=await response.json();}catch{/* Local metadata is optional. */}
$('#build-label').textContent=version.sha==='local'?'LOCAL WORKSPACE':`BUILD ${version.sha.slice(0,7)}`;$('#model-count').textContent=String(catalog.length).padStart(2,'0');
for(const [index,entry] of catalog.entries()){const button=document.createElement('button');button.className='model-button';button.dataset.id=entry.model.id;const number=document.createElement('span');number.className='model-number';number.textContent=String(index+1).padStart(2,'0');const label=document.createElement('span');label.textContent=entry.model.title;const sub=document.createElement('small');sub.textContent='PARAMETRIC RECIPE';label.append(sub);button.append(number,label);button.onclick=()=>{try{select(entry.model.id);}catch(error){report(error);}};$('#model-list').append(button);}
workbench=installWorkbench({getRoot:()=>root,scene,camera,controls,render,frame,getModel:()=>selected.id});rigControls=installRigControls({scene,render});installLightingControls(lighting,render);
const detailTools=document.createElement('div');detailTools.id='detail-tools';detailTools.className='surface-tools';
for(const name of ['face','hand','boots']){const button=document.createElement('button');button.type='button';button.textContent=`Inspect ${name}`;button.onclick=()=>frameDetail(name);detailTools.append(button);}document.querySelector('.export-actions').before(detailTools);
resize();loadHash();
window.studio={setLighting(name){lighting.setPreset(name);render();},lightingInfo:lighting.info,...workbench.api,...rigControls.api,ready:true,models:catalog.map(({model})=>({id:model.id,title:model.title,parameters:model.parameters})),select,setParameters,frame,frameDetail,render,exportGLB,get state(){return{model:selected.id,parameters:{...parameters},commit:version.sha};},sceneInfo:()=>findSceneLook(root),get stats(){return inspect(root);}};
if(!new URLSearchParams(location.search).has('capture')){let previousTime=performance.now();renderer.setAnimationLoop(time=>{rigControls.tick((time-previousTime)/1000);previousTime=time;controls.update();render();});}
