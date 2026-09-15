import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { group, box, cylinder, material, mesh } from '../modeling.js';
import { cyberMaterials, ring, orient, routedCable } from './mechanics.js';
export function neonPlatform({radius=.64}={},mats=cyberMaterials()){
 const g=group('NeonPlatform');g.userData.environment=true;
 g.add(cylinder({name:'Platform drum',radius,height:.11,segments:128,position:[0,.078,0],material:mats.dark}));
 g.add(cylinder({name:'Inset holographic deck',radius:radius*.975,height:.018,segments:128,position:[0,.144,0],material:material('#245d52',{metalness:.55,roughness:.24})}));
 for(const [r,y,c] of [[1,.137,'lime'],[.994,.028,'cyan'],[.95,.157,'cyan'],[.85,.158,'amber'],[.70,.159,'lime'],[.45,.159,'cyan']])g.add(orient(ring({name:'Concentric deck light',radius:radius*r,width:.0028,segments:128,material:mats[c]}),[0,y,0],[0,1,0]));
 for(let i=0;i<48;i++){
  const a=i/48*Math.PI*2,x=Math.cos(a),z=Math.sin(a);
  g.add(box({name:'Drum ceramic rib',size:[.009,.094,.015],radius:.003,position:[x*radius,.080,z*radius],rotation:[0,-a*180/Math.PI,0],material:i%4===0?mats.shell:mats.edge}));
  g.add(box({name:'Vertical deck emitter',size:[.004,.075,.006],position:[x*(radius+.009),.080,z*(radius+.009)],rotation:[0,-a*180/Math.PI,0],material:i%3?mats.cyan:mats.amber}));
  if(i%2===0){const p=[[x*radius*.73,.158,z*radius*.73],[x*radius*.81,.158,z*radius*.81],[Math.cos(a+.023)*radius*.89,.158,Math.sin(a+.023)*radius*.89]];g.add(routedCable({name:'Radial printed circuit',points:p,radius:.0012,material:mats.lime,ends:false,segments:8}));}
 }
 return g;
}
const rng=seed=>()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
/** Actual layered buildings/windows, not a projected reference photograph. */
export function neonCity({seed=42,density=1}={},mats=cyberMaterials()){
 const rand=rng(seed),g=group('CityBackdrop');g.userData.environment=true;
 const building=material('#071b23',{roughness:.8,metalness:.15});building.name='Distant city structure';
 const glass=material('#082b33',{roughness:.3,metalness:.4});glass.name='City facade';
 const windows=['#175e77','#36bdb2','#e78440','#cb5082','#718f46'].map((c,i)=>{const m=material(c,{emissive:c,emissiveIntensity:.8,roughness:.65});m.name=`Distant window ${i}`;return m;});
 for(let i=0;i<Math.round(48*density);i++){
  const layer=i%3,x=(rand()-.5)*9,z=-2.0-layer*1.5-rand(),height=1.7+rand()*4.7,width=.20+rand()*.50,y=height/2-1.0;
  g.add(box({name:`Tower ${i}`,size:[width,height,.35],position:[x,y,z],material:i%2?glass:building}));
  const rows=20+Math.floor(rand()*20),cols=2+Math.floor(width*6);
  for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){
   if(rand()<.40)continue;const mat=windows[Math.floor(rand()*windows.length)];
   g.add(box({name:'City window',size:[width/cols*.36,.017+rand()*.034,.005],position:[x+(k-(cols-1)/2)*width/cols,-.8+j*(height-.2)/rows,z+.178],material:mat}));
  }
  if(i%4===0){g.add(box({name:'Vertical neon sign',size:[.018,height*.45,.009],position:[x+width*.42,y,z+.19],material:i%2?mats.pink:mats.cyan}));}
 }
 g.updateMatrixWorld(true);const batches=new Map();g.traverse(o=>{if(o.isMesh){const a=batches.get(o.material)||[];a.push(o.geometry.clone().applyMatrix4(o.matrixWorld));batches.set(o.material,a);o.geometry.dispose();}});g.clear();
 for(const [mat,geometries] of batches){g.add(mesh(mergeGeometries(geometries),{name:'City batch / '+mat.name,material:mat}));geometries.forEach(geometry=>geometry.dispose());}
 return g;
}
export function neonLightRig(){
 const g=group('AuthoredSceneLights');
 for(const [name,color,intensity,pos,target] of [
  ['Warm key','#ffe5c4',1.8,[-2,3,3],[0,1,0]],
  ['Cyan edge','#40e5db',.8,[3,2,1],[0,1,0]],
  ['Magenta rim','#ff489f',1.8,[1,2.6,-2],[0,1,0]],
  ['Soft front fill','#c9e2f2',.65,[-.2,1.6,3],[0,1,0]],
 ]){
  const light=new THREE.DirectionalLight(color,intensity);light.name=name;light.position.fromArray(pos);light.lookAt(new THREE.Vector3(...target));
  light.target.position.set(0,0,-1);light.target.name=name+' target';light.target.userData.lightTarget=true;light.add(light.target);g.add(light);
 }
 const under=new THREE.PointLight('#77ffd0',.035,2.7,2);under.name='Platform underlight';under.position.set(0,.26,.20);g.add(under);
 return g;
}
export function heroCamera({name='HeroCamera'}={}){
 const camera=new THREE.PerspectiveCamera(26.2,768/1376,.02,50);camera.name=name;camera.position.set(.12,1.70,4.12);
 const target=[.235,1.035,0];camera.lookAt(new THREE.Vector3(...target));camera.userData.lookAt=target;return camera;
}
/** Explicit authored-scene boundary distinguishes exportable lights from preview lights. */
export function sceneAssembly({name='CyberScene',subject='Android',camera='HeroCamera',bloom=.22}={},...parts){
 const g=group(name,parts);g.userData.sceneRecipe={schema:1,subject,camera,background:'#020b0f',fog:{near:4.5,far:12},bloom:{strength:bloom,radius:.24,threshold:1.0},depthOfField:{target:'HeadMount',focus:4.13,aperture:.009,maxBlur:.015},lighting:'authored'};return g;
}

export function overheadFeeds({},mats=cyberMaterials()){const g=group('OverheadPower');g.userData.environment=true;for(const [i,color]of ['lime','pink'].entries())g.add(routedCable({name:'Overhead '+color,points:[[.24+i*.055,1.54,-.23],[.34+i*.12,1.80,-.30],[.33+i*.13,2.25,-.38],[.35+i*.13,3,-.43]],radius:.004,material:mats[color],segments:80,ends:false}));return g;}
