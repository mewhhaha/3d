import { normalizeTangentFrames } from './tangent-frame.js';
import { THREE, buildModel, dispose } from './modeling.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// Convert only export-owned images. The live material graph remains untouched.
function prepareImages(root) {
  const converted = new Map();
  root.traverse(node => {
    if (!node.isMesh) return;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      for (const [slot, texture] of Object.entries(material)) {
        if (!texture?.isDataTexture) continue;
        if (!converted.has(texture)) {
          const { data, width, height } = texture.image;
          if (!(data instanceof Uint8Array) || data.length !== width * height * 4) throw new Error('GLB bridge expects RGBA8 data textures');
          const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
          canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
          const result = new THREE.CanvasTexture(canvas);
          for (const key of ['name', 'colorSpace', 'flipY', 'wrapS', 'wrapT', 'magFilter', 'minFilter', 'generateMipmaps', 'premultiplyAlpha', 'channel', 'rotation', 'matrixAutoUpdate']) result[key] = texture[key];
          result.offset.copy(texture.offset); result.repeat.copy(texture.repeat); result.center.copy(texture.center); result.matrix.copy(texture.matrix);
          converted.set(texture, result);
        }
        material[slot] = converted.get(texture);
      }
    }
  });
  return [...converted.keys()];
}
export async function exportAssetGLB(definition, values) {
  const root = buildModel(definition, values), scene = new THREE.Scene();
  scene.name = definition.title; scene.add(root);
  const clips = new Set(); root.traverse(n => (n.animations || []).forEach(c => clips.add(c)));
  let originals = [];
  try {
    root.traverse(node => { if (node.isMesh) normalizeTangentFrames(node.geometry); });
    originals = prepareImages(root);
    return await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true, trs: true, animations: [...clips] });
  } finally { originals.forEach(t => t.dispose()); dispose(root); }
}
