import { THREE } from './modeling.js';
import { auditUV, uvSVG } from './uv.js';
import { checkerTexture } from './textures.js';
export function installWorkbench({ getRoot, scene, camera, controls, render, frame, getModel }) {
  const style=document.createElement('style');
  style.textContent='.surface-tools{border-top:1px solid #dce0d9;margin-top:18px;padding-top:14px}.surface-tools summary{cursor:pointer;font-size:12px;font-weight:650;margin-bottom:12px}.surface-tools label{display:block;font-size:11px;margin:10px 0}.surface-tools select{display:block;width:100%;max-width:100%;margin-top:5px;padding:7px;border:1px solid #dce0d9;background:white;border-radius:5px}.surface-tools img{display:block;width:100%;height:auto;border-radius:5px;margin:8px 0}.surface-tools [hidden]{display:none}.surface-tools p,.surface-tools figcaption{font-size:11px;line-height:1.55;color:#65716a}.surface-tools figure{margin:16px 0}.surface-tools>button{width:100%;margin:4px 0;padding:8px}';
  document.head.append(style);
  const box=document.createElement('details');box.id='surface-tools';box.className='surface-tools';
  box.innerHTML=`<summary>Surface, UV &amp; reference tools</summary>
    <label>Display <select id="surface-display"><option value="pbr">Materials / PBR</option><option value="clay">Clay</option><option value="normals">Normals</option><option value="uv">UV checker</option><option value="wire">Wireframe</option></select></label>
    <label>Inspect mesh <select id="surface-mesh"></select></label>
    <div class="two-buttons"><button id="surface-focus" type="button">Close-up</button><button id="surface-frame" type="button">Full model</button></div>
    <p id="surface-audit"></p><img id="surface-uv" alt="UV layout for selected mesh" width="256" height="256">
    <button id="surface-download-uv" type="button">Download UV layout (.svg)</button>
    <label>Texture <select id="surface-texture"><option value="map">Base color (sRGB)</option><option value="normalMap">Normal (linear)</option><option value="roughnessMap">Metallic / roughness (linear)</option></select></label>
    <img id="surface-map" alt="Selected texture map" width="256" height="256" hidden>
    <button id="surface-download-map" type="button">Download texture (.png)</button>
    <p class="surface-note">UVs are authored per part. Repeated textures are intentional; this is not a unique baked atlas. Packed map: G = roughness, B × material factor = metalness.</p>
    <figure id="surface-reference" hidden><img alt="Generated design reference"><figcaption>Generated concept reference — not a rendered result. Reconstruction is approximate.</figcaption></figure>`;
  document.querySelector('.export-actions').before(box);
  const $=s=>box.querySelector(s), meshes=[];
  const modes={pbr:null,clay:new THREE.MeshStandardMaterial({color:'#bca68a',roughness:.82}),normals:new THREE.MeshNormalMaterial(),uv:new THREE.MeshBasicMaterial({map:checkerTexture()}),wire:new THREE.MeshBasicMaterial({color:'#315367',wireframe:true})};
  let layoutURL;
  function chosen(){return meshes[Number($('#surface-mesh').value)||0];}
  function textureData(slot='map') {
    const m=chosen(),mat=Array.isArray(m?.material)?m.material[0]:m?.material,t=mat?.[slot];
    if(!t) return null;
    const canvas=document.createElement('canvas'),image=t.image;
    canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');
    if(image.data) ctx.putImageData(new ImageData(new Uint8ClampedArray(image.data),image.width,image.height),0,0);
    else ctx.drawImage(image,0,0);
    return {name:t.name||slot,data:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height,colorSpace:t.colorSpace};
  }
  function showTexture(){const t=textureData($('#surface-texture').value);$('#surface-map').hidden=!t;$('#surface-download-map').disabled=!t;if(t)$('#surface-map').src=t.data;}
  function showUV(){if(!chosen())return;if(layoutURL)URL.revokeObjectURL(layoutURL);layoutURL=URL.createObjectURL(new Blob([uvSVG(chosen().geometry,{maxTriangles:10000})],{type:'image/svg+xml'}));$('#surface-uv').src=layoutURL;showTexture();}
  function setDisplay(mode='pbr') {if(!Object.hasOwn(modes,mode))throw new Error('Unknown display mode');scene.overrideMaterial=modes[mode];$('#surface-display').value=mode;document.querySelector('#wireframe').checked=mode==='wire';render();}
  function focus(name) {
    const object=typeof name==='string'?getRoot().getObjectByName(name):chosen();
    if(!object) throw new Error(`No part named ${name}`);
    const b=new THREE.Box3().setFromObject(object,true),c=b.getCenter(new THREE.Vector3()),r=b.getBoundingSphere(new THREE.Sphere()).radius;
    const vfov=THREE.MathUtils.degToRad(camera.fov), hfov=2*Math.atan(Math.tan(vfov/2)*camera.aspect),distance=r/Math.sin(Math.min(vfov,hfov)/2)*1.18;
    camera.position.copy(c).add(new THREE.Vector3(.38,.15,1).normalize().multiplyScalar(distance));camera.near=r/100;camera.updateProjectionMatrix();controls.target.copy(c);controls.update();render();
  }
  function save(data,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);}
  $('#surface-display').onchange=e=>setDisplay(e.target.value);
  document.querySelector('#wireframe').onchange=e=>setDisplay(e.target.checked?'wire':'pbr');
  $('#surface-mesh').onchange=showUV;$('#surface-texture').onchange=showTexture;
  $('#surface-focus').onclick=()=>focus();$('#surface-frame').onclick=()=>frame();
  $('#surface-download-uv').onclick=()=>save(uvSVG(chosen().geometry),`${getModel()}-uv.svg`,'image/svg+xml');
  $('#surface-download-map').onclick=()=>{const t=textureData($('#surface-texture').value);if(t){const a=document.createElement('a');a.href=t.data;a.download=`${t.name}.png`;a.click();}};
  async function reference() {
    const id=getModel();
    try {const {references}=await import('../references.js');if(getModel()!==id)return;const src=references[id];$('#surface-reference').hidden=!src;if(src)$('#surface-reference img').src=src;} catch {$('#surface-reference').hidden=true;}
  }
  function refresh() {
    meshes.length=0;getRoot().traverse(o=>{if(o.isMesh)meshes.push(o);});
    $('#surface-mesh').replaceChildren(...meshes.map((m,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${i+1}. ${m.name}`;return o;}));
    const a=auditUV(getRoot());$('#surface-audit').textContent=`${a.meshes-a.missing.length}/${a.meshes} meshes have UVs · ${a.textures} textures · ${a.invalid.length} invalid UV sets`;
    showUV();reference();
  }
  return {refresh,api:{focus,setDisplay,surfaceAudit:()=>auditUV(getRoot()),uvLayout:()=>uvSVG(chosen().geometry),textureData,
    surfaceMeshes:()=>meshes.map((m,i)=>({index:i,name:m.name,vertices:m.geometry.attributes.position.count})),
    inspectMesh(index){if(!meshes[index])throw new Error('Unknown mesh');$('#surface-mesh').value=index;showUV();return meshes[index].name;},
  }};
}
