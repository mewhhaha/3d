import * as THREE from 'three';
import { hydrateScene, findSceneLook, createLookRenderer } from './lib/scene-look.js';
import { inspect, dispose } from './lib/modeling.js';
import { assetInfo } from './lib/rigging.js';
import { exportOwnedObjectGLB } from './lib/export-assets.js';
import { createStudioLighting } from './lib/studio-lighting.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
const lighting = createStudioLighting(scene, renderer);
const lookRenderer = createLookRenderer(renderer,scene);
let root, sourceJSON, mixer, poseName = '', poseTime = 0;
const clips = () => {
  const result = new Map();
  root.traverse(o => o.animations?.forEach(c => result.set(c.name, c)));
  return result;
};
const vec = a => new THREE.Vector3(...a);
const directions = { front: [0,0,1], back: [0,0,-1], side: [1,0,0], left: [-1,0,0], top: [0,1,0], threequarter: [.75,.35,2] };

function pose(name = '', time = 0) {
  if (!Number.isFinite(time) || time < 0) throw new Error('Pose time must be nonnegative');
  const animation = clips().get(name);
  if (name && !animation) throw new Error(`Unknown clip ${name}; available: ${[...clips().keys()].join(', ')}`);
  mixer.stopAllAction();
  const skeletons = new Set();
  root.traverse(o => { if (o.isSkinnedMesh) skeletons.add(o.skeleton); });
  skeletons.forEach(s => s.pose());
  if (animation) mixer.clipAction(animation).reset().play();
  mixer.setTime(time);
  root.updateMatrixWorld(true);
  skeletons.forEach(s => s.update());
  poseName = name; poseTime = time;
}

/** Evaluate visible referenced vertices, including skin and morph deformation. */
function pointsOf(object) {
  const points = [];
  object.traverseVisible(o => {
    if (!o.isMesh) return;
    const g = o.geometry, count = g.index?.count ?? g.attributes.position.count;
    const start = g.drawRange.start, end = Math.min(count, start + g.drawRange.count);
    const indices = new Set();
    for (let i = start; i < end; i++) indices.add(g.index ? g.index.getX(i) : i);
    for (const i of indices) points.push(o.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(o.matrixWorld));
  });
  if (!points.length) throw new Error('Focus has no visible mesh vertices');
  return points;
}

function cameraFor(points, { view = 'threequarter', width = 800, height = 800, occupancy = .82, projection = 'orthographic', cameraState } = {}) {
  if (!(occupancy > .1 && occupancy < .98)) throw new Error('occupancy must be between .1 and .98');
  if (!['orthographic','perspective'].includes(projection)) throw new Error('Unknown projection');
  if (cameraState) {
    if (cameraState.width!==width || cameraState.height!==height) throw new Error('Locked camera requires the original image dimensions');
    const camera=new THREE.ObjectLoader().parse(cameraState.camera);
    if(!camera.isCamera)throw new Error('Invalid locked camera');
    camera.updateMatrixWorld(true);
    const bounds=new THREE.Box3(vec(cameraState.lightingBounds.min),vec(cameraState.lightingBounds.max));
    return {camera,bounds,framing:framingOf(points,camera)};
  }
  const dir = Array.isArray(view) ? view : directions[view];
  if (!dir || dir.length !== 3 || !dir.every(Number.isFinite) || vec(dir).lengthSq() === 0) throw new Error(`Invalid view ${view}`);
  const bounds = new THREE.Box3().setFromPoints(points), center = bounds.getCenter(new THREE.Vector3());
  const radius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, .001), aspect = width / height;
  const camera = projection === 'orthographic' ? new THREE.OrthographicCamera() : new THREE.PerspectiveCamera(32, aspect);
  const direction = vec(dir).normalize();
  if (Math.abs(direction.y) > .99) camera.up.set(0,0,-1);
  camera.position.copy(center).addScaledVector(direction, radius * 4);
  camera.lookAt(center); camera.updateMatrixWorld(true);
  const inverse = camera.quaternion.clone().invert();
  const local = points.map(p => p.clone().sub(center).applyQuaternion(inverse));
  const b = new THREE.Box3().setFromPoints(local);
  const offset = new THREE.Vector3((b.min.x+b.max.x)/2, (b.min.y+b.max.y)/2, 0).applyQuaternion(camera.quaternion);
  camera.position.add(offset);
  const halfHeight = Math.max((b.max.y-b.min.y)/2, (b.max.x-b.min.x)/(2*aspect), radius*.01) / occupancy;
  if (camera.isOrthographicCamera) {
    Object.assign(camera, { left:-halfHeight*aspect, right:halfHeight*aspect, top:halfHeight, bottom:-halfHeight });
  } else {
    const ty = Math.tan(camera.fov * Math.PI/360) * occupancy, tx = ty * aspect;
    const mx=(b.min.x+b.max.x)/2, my=(b.min.y+b.max.y)/2;
    const distance = local.reduce((d,p) => Math.max(d, Math.max(Math.abs(p.x-mx)/tx,Math.abs(p.y-my)/ty)+p.z),0);
    camera.position.copy(center).add(offset).addScaledVector(direction,distance+radius*.01);
  }
  camera.near = radius*.001; camera.far = radius*100; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  return { camera, bounds, framing: framingOf(points,camera) };
}
function framingOf(points,camera){
  const ndc=new THREE.Box3().setFromPoints(points.map(p=>p.clone().project(camera)));
  const clipped=ndc.min.x < -1 || ndc.min.y < -1 || ndc.max.x > 1 || ndc.max.y > 1 || ndc.min.z < -1 || ndc.max.z > 1;
  return {ndcMin:ndc.min.toArray(),ndcMax:ndc.max.toArray(),occupancy:Math.max(ndc.max.x-ndc.min.x,ndc.max.y-ndc.min.y)/2,clipped};
}

async function load({ json }) {
  const start = performance.now();
  if (root) { mixer.stopAllAction(); mixer.uncacheRoot(root); scene.remove(root); dispose(root); }
  sourceJSON=json;
  root=await new THREE.ObjectLoader().parseAsync(JSON.parse(json));
  hydrateScene(root); scene.add(root); mixer=new THREE.AnimationMixer(root); pose();
  const names=[];root.traverse(o=>{if(o.name)names.push(o.name);});
  return {stats:inspect(root),rig:assetInfo(root),names:[...new Set(names)],uploadMs:performance.now()-start};
}

async function capture(options = {}) {
  const start = performance.now();
  const { width = 800, height = 800, pass = 'material', focus, clip = '', time = 0, preset = 'studio', exposure = 1, skeleton = false } = options;
  if (![width,height].every(n => Number.isInteger(n) && n>=64 && n<=4096)) throw new Error('Image dimensions must be 64..4096');
  if (!['material','clay','normal','wire','silhouette'].includes(pass)) throw new Error(`Unknown pass ${pass}`);
  pose(clip,time);
  const look=findSceneLook(root), subject=focus||look?.subject;
  const target = subject ? root.getObjectByName(subject) : root;
  if (!target) throw new Error(`Unknown focus object ${focus}`);
  renderer.setSize(width,height,false);
  const points=pointsOf(target);let state=options.cameraState;
  if(options.view==='hero'&&!state){
    if(!look)throw new Error('Hero view requires an authored scene');
    const hero=root.getObjectByName(look.camera);if(!hero?.isPerspectiveCamera)throw new Error('Missing authored camera');
    const clone=hero.clone();clone.position.copy(hero.getWorldPosition(new THREE.Vector3()));clone.quaternion.copy(hero.getWorldQuaternion(new THREE.Quaternion()));clone.aspect=width/height;clone.updateProjectionMatrix();
    const box=new THREE.Box3().setFromPoints(points);state={width,height,camera:clone.toJSON(),lightingBounds:{min:box.min.toArray(),max:box.max.toArray()}};
  }
  const {camera,bounds,framing} = cameraFor(points, {...options,cameraState:state});
  lighting.setPreset(preset); lighting.setExposure(exposure); lighting.fit(bounds);
  scene.getObjectByName('PreviewLighting').visible=!look;
  if(look){scene.background=new THREE.Color(look.background);scene.fog=new THREE.Fog(look.background,look.fog.near,look.fog.far);}else scene.fog=null;
  const originalBackground=scene.background, originalFog=scene.fog, materials=[], visibility=[];
  let helper;
  try {
    if (pass !== 'material') {
      scene.fog=null;
      if (look) {
        root.traverse(o=>{if(o.userData.environment){visibility.push([o,o.visible]);o.visible=false;}});
        scene.background=new THREE.Color(0x262b31);
        scene.getObjectByName('PreviewLighting').visible=true;
        const authored=root.getObjectByName('AuthoredSceneLights');if(authored){visibility.push([authored,authored.visible]);authored.visible=false;}
      }
      root.traverse(o => {
        if (!o.isMesh) return;
        const mat = pass==='normal' ? new THREE.MeshNormalMaterial() : pass==='silhouette' ? new THREE.MeshBasicMaterial({color:0x000000}) : new THREE.MeshStandardMaterial({color:0xb5aaa0,roughness:.85,wireframe:pass==='wire'});
        const source=Array.isArray(o.material)?o.material[0]:o.material;
        mat.side=source.side; materials.push([o,o.material,mat]); o.material=mat;
      });
      if(pass==='silhouette') scene.background=new THREE.Color(0xffffff);
    }
    if(skeleton) { helper=new THREE.SkeletonHelper(root); helper.material.depthTest=false; scene.add(helper); }
    await renderer.compileAsync(scene,camera);
    lookRenderer.render(camera,pass==='material'?look:null); renderer.getContext().finish();
    const png=renderer.domElement.toDataURL('image/png').split(',')[1];
    const imageMs=performance.now()-start;
    return { png, imageMs, framing, cameraState:{width,height,camera:camera.toJSON(),lightingBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}}, pass, view:options.view||'threequarter', pose:{clip:poseName,time:poseTime}, focus:focus||null, authoredScene:!!look, bloom:pass==='material'?(look?.bloom||null):null, framingScope:subject||'complete asset', drawCalls:renderer.info.render.calls, triangles:renderer.info.render.triangles };
  } finally {
    materials.forEach(([o,original,temporary]) => {o.material=original; temporary.dispose();});
    scene.background=originalBackground;scene.fog=originalFog;
    visibility.forEach(([object,visible])=>{object.visible=visible;});
    if(helper){scene.remove(helper);helper.dispose();}
  }
}

/** Pixel-space checks under locked camera/light; not a likeness or geometry-distance metric. */
async function compare({reference,candidate,referenceMask,candidateMask}) {
  const decode=async png=>{const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();return image;};
  const images=await Promise.all([reference,candidate,referenceMask,candidateMask].map(decode));
  const width=images[0].width,height=images[0].height;
  if(images.some(image=>image.width!==width||image.height!==height))throw new Error('Comparison image dimensions differ');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  const data=images.map(image=>{context.clearRect(0,0,width,height);context.drawImage(image,0,0);return context.getImageData(0,0,width,height).data;});
  let union=0,intersection=0,error=0,squared=0;
  for(let i=0;i<data[0].length;i+=4){
    const a=data[2][i]+data[2][i+1]+data[2][i+2]<384,b=data[3][i]+data[3][i+1]+data[3][i+2]<384;
    if(a&&b)intersection++;
    if(a||b){union++;for(let k=0;k<3;k++){const difference=(data[0][i+k]-data[1][i+k])/255;error+=Math.abs(difference);squared+=difference*difference;}}
  }
  if(!union)throw new Error('Comparison has no silhouette foreground');
  return {width,height,foregroundPixels:union,silhouetteIoU:intersection/union,meanAbsoluteRgbError:error/(3*union),rgbRMSE:Math.sqrt(squared/(3*union)),scope:'Union of thresholded silhouette foreground, level-zero rendered sRGB pixels'};
}

async function sheet({tiles,columns=3,cellSize=360,title='Local modeling study'}) {
  if(!Array.isArray(tiles)||!tiles.length||tiles.length>32||!Number.isInteger(columns)||columns<1||columns>8||!Number.isInteger(cellSize)||cellSize<64||cellSize>800)throw new Error('Invalid contact sheet');
  const canvas=document.createElement('canvas'),labelHeight=48,header=64;
  canvas.width=columns*cellSize;canvas.height=header+Math.ceil(tiles.length/columns)*(cellSize+labelHeight);
  const context=canvas.getContext('2d');context.fillStyle='#f3f1ed';context.fillRect(0,0,canvas.width,canvas.height);
  context.fillStyle='#222';context.font='22px sans-serif';context.fillText(String(title),18,40,canvas.width-36);
  for(let i=0;i<tiles.length;i++){
    const image=new Image();image.src='data:image/png;base64,'+tiles[i].png;await image.decode();
    const x=(i%columns)*cellSize,y=header+Math.floor(i/columns)*(cellSize+labelHeight);
    const scale=Math.min(cellSize/image.width,cellSize/image.height);
    context.drawImage(image,x+(cellSize-image.width*scale)/2,y+(cellSize-image.height*scale)/2,image.width*scale,image.height*scale);
    context.fillStyle='#222';context.font='16px sans-serif';context.fillText(String(tiles[i].label),x+12,y+cellSize+29,cellSize-24);
  }
  return canvas.toDataURL('image/png').split(',')[1];
}
const gl=renderer.getContext(), debug=gl.getExtension('WEBGL_debug_renderer_info');
window.stage = { load, capture, sheet, compare, ready: true,
  capabilities: { three:THREE.REVISION, webgl2:true, renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER), maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE) },
  async exportGLB() {
    const clean=hydrateScene(await new THREE.ObjectLoader().parseAsync(JSON.parse(sourceJSON)));
    const bytes=new Uint8Array(await exportOwnedObjectGLB(clean)); let text='';
    for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return btoa(text);
  },
};
