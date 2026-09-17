import * as THREE from 'three';
import { chartTexture } from './chart-textures.js';

const byteTexture = (texture, label) => {
  if (!texture?.isDataTexture) throw new Error(`${label} must be a Three.js DataTexture`);
  const { data, width, height } = texture.image ?? {};
  if (!(data instanceof Uint8Array) || !Number.isInteger(width) || !Number.isInteger(height) || data.length !== width * height * 4) {
    throw new Error(`${label} must contain RGBA8 pixel data`);
  }
  if (texture.format !== THREE.RGBAFormat || texture.type !== THREE.UnsignedByteType) throw new Error(`${label} must use RGBA unsigned-byte storage`);
  if (texture.colorSpace !== THREE.NoColorSpace) throw new Error(`${label} must be linear non-color data`);
  return { texture, data, width, height };
};

function scalar(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${label} must be from 0 through 1`);
  return value;
}

/** Rasterize a single 0..1 scalar field in semantic chart-local coordinates. */
export function chartScalarTexture(geometry, {
  size = 256,
  background = 0,
  name = 'Semantic chart scalar',
  layers,
} = {}) {
  const base = scalar(background, 'chartScalarTexture background');
  if (!Array.isArray(layers) || !layers.length) throw new Error('chartScalarTexture needs at least one layer');
  const mapped = layers.map((layer, index) => {
    if (!layer || typeof layer !== 'object' || Array.isArray(layer)) throw new Error(`chartScalarTexture layer ${index} must be an object`);
    if (Object.hasOwn(layer, 'color')) throw new Error(`chartScalarTexture layer ${index} uses value, not color`);
    const value = scalar(layer.value ?? 1, `chartScalarTexture layer ${index} value`);
    const { value: _value, ...rest } = layer;
    return { ...rest, color: [value, value, value, 1] };
  });
  const texture = chartTexture(geometry, {
    size,
    background: [base, base, base, 1],
    colorSpace: 'linear',
    name,
    layers: mapped,
  });
  texture.userData.chartScalarTexture = {
    version: 1,
    background: base,
    layers: mapped.map((layer, index) => ({
      chart: layer.chart,
      shape: layer.shape ?? 'fill',
      value: layers[index].value ?? 1,
      opacity: layer.opacity ?? 1,
    })),
  };
  return texture;
}

/** Pack independent linear scalar textures into the glTF/Three metallic-roughness convention: G=roughness, B=metalness. */
export function packMetallicRoughness(roughnessTexture, metalnessTexture, { name = 'Packed metallic-roughness' } = {}) {
  if (typeof name !== 'string' || !name.trim()) throw new Error('packMetallicRoughness name must be a non-empty string');
  const roughness = byteTexture(roughnessTexture, 'roughness texture');
  const metalness = byteTexture(metalnessTexture, 'metalness texture');
  if (roughness.width !== metalness.width || roughness.height !== metalness.height) throw new Error('roughness and metalness textures must have matching dimensions');
  const sameScalar = (a, b) => Math.abs(a - b) <= 1e-12;
  const sameVec2 = (a, b) => sameScalar(a.x, b.x) && sameScalar(a.y, b.y);
  const compatible = roughness.texture.flipY === metalness.texture.flipY
    && roughness.texture.wrapS === metalness.texture.wrapS && roughness.texture.wrapT === metalness.texture.wrapT
    && roughness.texture.magFilter === metalness.texture.magFilter && roughness.texture.minFilter === metalness.texture.minFilter
    && roughness.texture.generateMipmaps === metalness.texture.generateMipmaps
    && sameVec2(roughness.texture.offset, metalness.texture.offset)
    && sameVec2(roughness.texture.repeat, metalness.texture.repeat)
    && sameVec2(roughness.texture.center, metalness.texture.center)
    && sameScalar(roughness.texture.rotation, metalness.texture.rotation);
  if (!compatible) throw new Error('roughness and metalness textures must use matching UV transform and sampler state');

  const data = new Uint8Array(roughness.width * roughness.height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = roughness.data[i + 1];
    data[i + 2] = metalness.data[i + 2];
    data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, roughness.width, roughness.height, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.name = name;
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = roughness.texture.wrapS; texture.wrapT = roughness.texture.wrapT;
  texture.magFilter = roughness.texture.magFilter; texture.minFilter = roughness.texture.minFilter;
  texture.generateMipmaps = roughness.texture.generateMipmaps;
  texture.flipY = roughness.texture.flipY;
  texture.offset.copy(roughness.texture.offset); texture.repeat.copy(roughness.texture.repeat); texture.center.copy(roughness.texture.center);
  texture.rotation = roughness.texture.rotation; texture.matrixAutoUpdate = roughness.texture.matrixAutoUpdate; texture.matrix.copy(roughness.texture.matrix);
  texture.needsUpdate = true;
  texture.userData.chartPbr = {
    version: 1,
    encoding: 'gltf-metallic-roughness',
    channels: { roughness: 'g', metalness: 'b', red: 'neutral-1' },
    roughness: roughness.texture.name || null,
    metalness: metalness.texture.name || null,
  };
  return texture;
}
