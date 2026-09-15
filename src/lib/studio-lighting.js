import * as THREE from 'three';
export const LIGHTING_PRESETS = Object.freeze({
 studio:Object.freeze({key:2.5,fill:.65,rim:1.8,ambient:.28,environment:.35,background:'#e4e2de'}),
 daylight:Object.freeze({key:2.0,fill:1.05,rim:.7,ambient:.65,environment:.65,background:'#e8ecec'}),
 dramatic:Object.freeze({key:3.0,fill:.22,rim:2.3,ambient:.12,environment:.20,background:'#333b41'}),
});
/** Preview-only lighting. Never parent this rig beneath an exportable model. */
export function createStudioLighting(scene,renderer,{preset='studio'}={}) {
 const rig=new THREE.Group();rig.name='PreviewLighting';
 const key=new THREE.DirectionalLight('#fff0dc'),fill=new THREE.DirectionalLight('#dde9ff'),rim=new THREE.DirectionalLight('#fff5e3'),ambient=new THREE.HemisphereLight('#e8eef4','#554b41');
 key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.00015;rig.add(key,fill,rim,ambient,key.target,fill.target,rim.target);scene.add(rig);let active;
 function setPreset(name){const p=LIGHTING_PRESETS[name];if(!p)throw new Error(`Unknown lighting preset: ${name}`);active=name;key.intensity=p.key;fill.intensity=p.fill;rim.intensity=p.rim;ambient.intensity=p.ambient;scene.environmentIntensity=p.environment;scene.background=new THREE.Color(p.background);}
 function fit(bounds){const c=bounds.getCenter(new THREE.Vector3()),r=Math.max(.01,bounds.getBoundingSphere(new THREE.Sphere()).radius),span=r*1.7;for(const [light,direction] of [[key,[-3,4,4]],[fill,[4,1,2]],[rim,[1,3,-4]]]){light.position.copy(c).addScaledVector(new THREE.Vector3(...direction),r);light.target.position.copy(c);}Object.assign(key.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:r*.1,far:r*20});key.shadow.camera.updateProjectionMatrix();key.shadow.normalBias=r*.001;}
 function setExposure(value){if(!Number.isFinite(value)||value<.5||value>1.8)throw new Error('Exposure must be .5..1.8');renderer.toneMappingExposure=value;}
 setPreset(preset);setExposure(1);
 return {fit,setPreset,setExposure,info:()=>({preset:active,exposure:renderer.toneMappingExposure,key:key.intensity,fill:fill.intensity,rim:rim.intensity,environment:scene.environmentIntensity}),dispose(){scene.remove(rig);key.shadow.dispose();}};
}
export function installLightingControls(lighting,render){const box=document.createElement('details');box.className='surface-tools';box.id='lighting-tools';box.innerHTML='<summary>Studio lighting</summary><label>Lighting preset<select id="lighting-preset"><option value="studio">Studio · key / fill / rim</option><option value="daylight">Soft daylight</option><option value="dramatic">Rim / silhouette</option></select></label><label>Exposure<input id="lighting-exposure" aria-label="Exposure" type="range" min="0.5" max="1.8" step="0.05" value="1"></label><p>Preview lights stay out of the model GLB.</p>';document.querySelector('.export-actions').before(box);box.querySelector('select').onchange=e=>{lighting.setPreset(e.target.value);render();};box.querySelector('input').oninput=e=>{lighting.setExposure(Number(e.target.value));render();};}
