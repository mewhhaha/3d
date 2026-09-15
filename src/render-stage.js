import * as THREE from 'three';
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

function cameraFor(points, { view = 'threequarter', width = 800, height = 800, occupancy = .82, projection = 'orthographic' } = {}) {
  if (!(occupancy > .1 && occupancy < .98)) throw new Error('occupancy must be between .1 and .98');
  if (!['orthographic','perspective'].includes(projection)) throw new Error('Unknown projection');
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
  const ndc = new THREE.Box3().setFromPoints(points.map(p => p.clone().project(camera)));
  return { camera, bounds, framing: { ndcMin:ndc.min.toArray(), ndcMax:ndc.max.toArray(), occupancy:Math.max(ndc.max.x-ndc.min.x,ndc.max.y-ndc.min.y)/2 } };
}

async function load({ json }) {
  const start = performance.now();
  if (root) { mixer.stopAllAction(); mixer.uncacheRoot(root); scene.remove(root); dispose(root); }
  sourceJSON=json;
  root=await new THREE.ObjectLoader().parseAsync(JSON.parse(json));
  scene.add(root); mixer=new THREE.AnimationMixer(root); pose();
  const names=[];root.traverse(o=>{if(o.name)names.push(o.name);});
  return {stats:inspect(root),rig:assetInfo(root),names:[...new Set(names)],uploadMs:performance.now()-start};
}

async function capture(options = {}) {
  const start = performance.now();
  const { width = 800, height = 800, pass = 'material', focus, clip = '', time = 0, preset = 'studio', exposure = 1, skeleton = false } = options;
  if (![width,height].every(n => Number.isInteger(n) && n>=64 && n<=4096)) throw new Error('Image dimensions must be 64..4096');
  if (!['material','clay','normal','wire','silhouette'].includes(pass)) throw new Error(`Unknown pass ${pass}`);
  pose(clip,time);
  const target = focus ? root.getObjectByName(focus) : root;
  if (!target) throw new Error(`Unknown focus object ${focus}`);
  renderer.setSize(width,height,false);
  const {camera,bounds,framing} = cameraFor(pointsOf(target), options);
  lighting.setPreset(preset); lighting.setExposure(exposure); lighting.fit(bounds);
  const originalBackground=scene.background, materials=[];
  let helper;
  try {
    if (pass !== 'material') {
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
    renderer.render(scene,camera); renderer.getContext().finish();
    const png=renderer.domElement.toDataURL('image/png').split(',')[1];
    const imageMs=performance.now()-start;
    return { png, imageMs, framing, pass, view:options.view||'threequarter', pose:{clip:poseName,time:poseTime}, focus:focus||null, drawCalls:renderer.info.render.calls, triangles:renderer.info.render.triangles };
  } finally {
    materials.forEach(([o,original,temporary]) => {o.material=original; temporary.dispose();});
    scene.background=originalBackground;
    if(helper){scene.remove(helper);helper.dispose();}
  }
}

const gl=renderer.getContext(), debug=gl.getExtension('WEBGL_debug_renderer_info');
window.stage = { load, capture, ready: true,
  capabilities: { three:THREE.REVISION, webgl2:true, renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER), maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE) },
  async exportGLB() {
    const clean=await new THREE.ObjectLoader().parseAsync(JSON.parse(sourceJSON));
    const bytes=new Uint8Array(await exportOwnedObjectGLB(clean)); let text='';
    for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return btoa(text);
  },
};
