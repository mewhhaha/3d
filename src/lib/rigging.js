import { THREE } from './modeling.js';
const vec = a => new THREE.Vector3(...a);
export function skeleton(spec) {
  if (!Array.isArray(spec) || !spec.length || spec.length > 256) throw new Error('Skeleton needs 1..256 joints');
  const bones = [], byName = {}, indices = {};
  for (const joint of spec) {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(joint.name) || byName[joint.name] || !Array.isArray(joint.position) || joint.position.length !== 3 || !joint.position.every(Number.isFinite)) throw new Error('Invalid/duplicate joint');
    const bone = new THREE.Bone(); bone.name = joint.name;
    bone.position.copy(vec(joint.position));
    if (joint.parent) {
      const parent = byName[joint.parent];
      if (!parent) throw new Error('Parents must precede children');
      const p = spec[indices[joint.parent]].position;
      bone.position.sub(vec(p)); parent.add(bone);
    }
    indices[joint.name] = bones.length; byName[joint.name] = bone; bones.push(bone);
  }
  const roots = bones.filter(b => !b.parent);
  if (roots.length !== 1) throw new Error('Exactly one root joint is required');
  roots[0].updateMatrixWorld(true);
  const rig = new THREE.Skeleton(bones); rig.calculateInverses();
  return { root: roots[0], skeleton: rig, bones: byName, indices };
}

// Mesh geometry must already be in bind/model space; explicit weights avoid nearest-bone accidents.
export function skin(geometry, material, rig, weights, name = 'Skin') {
  const p = geometry.attributes.position, indices = [], values = [];
  for (let i = 0; i < p.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(p, i), raw = weights(point, i);
    const merged = new Map();
    for (const [bone, weight] of raw) {
      if (!Object.hasOwn(rig.indices, bone) || !Number.isFinite(weight) || weight < 0) throw new Error('Invalid skin influence');
      merged.set(bone, (merged.get(bone) || 0) + weight);
    }
    const list = [...merged].filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
    if (!list.length || list.length > 4) throw new Error('Each vertex needs one to four positive influences');
    const sum = list.reduce((n, [, w]) => n + w, 0);
    if (!Number.isFinite(sum)) throw new Error('Skin influence sum must be finite');
    for (let k = 0; k < 4; k++) { indices.push(k < list.length ? rig.indices[list[k][0]] : 0); values.push(k < list.length ? list[k][1] / sum : 0); }
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(values, 4));
  const result = new THREE.SkinnedMesh(geometry, material); result.name = name;
  result.bind(rig.skeleton, new THREE.Matrix4()); result.castShadow = result.receiveShadow = true;
  return result;
}
export function skinnedPart(part, rig, weights) {
  part.updateMatrix(); part.geometry.applyMatrix4(part.matrix);
  return skin(part.geometry, part.material, rig, weights, part.name);
}
export function jointBlend(a, b, axis, center, width) {
  if (!['x', 'y', 'z'].includes(axis) || !(width > 0)) throw new Error('Invalid blend zone');
  return p => {
    const t = THREE.MathUtils.smoothstep(p[axis], center - width / 2, center + width / 2);
    return [[a, 1 - t], [b, t]];
  };
}
export function rotationTrack(bone, keys) {
  const times = [], values = [];
  for (const [time, degrees] of keys) {
    if (!Number.isFinite(time) || time < 0 || (times.length && time <= times.at(-1)) || degrees.length !== 3 || !degrees.every(Number.isFinite)) throw new Error('Invalid rotation keys');
    times.push(time);
    values.push(...new THREE.Quaternion().setFromEuler(new THREE.Euler(...degrees.map(THREE.MathUtils.degToRad))));
  }
  return new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times, values);
}
export function clip(name, tracks) {
  const c = new THREE.AnimationClip(name, -1, tracks);
  if (!c.validate() || c.duration <= 0) throw new Error('Invalid animation clip');
  return c;
}
export function morphTarget(mesh, name, deform) {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) throw new Error('Invalid morph name');
  const g = mesh.geometry, p = g.attributes.position, delta = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(p, i), d = deform(point, i);
    if (!d || ![d.x, d.y, d.z].every(Number.isFinite)) throw new Error('Morph must return a finite delta');
    delta.set(d.toArray(), i * 3);
  }
  const attr = new THREE.Float32BufferAttribute(delta, 3); attr.name = name;
  g.morphTargetsRelative = true; (g.morphAttributes.position ||= []).push(attr); mesh.updateMorphTargets(); return mesh;
}
export function assetInfo(root) {
  let skinnedMeshes = 0, uvMeshes = 0, morphTargets = 0; const bones = new Set(), textures = new Set(), clips = new Set();
  root.traverse(n => {
    for (const c of n.animations || []) clips.add(c);
    if (!n.isMesh) return;
    const count = n.geometry.attributes.position.count, uv = n.geometry.attributes.uv;
    if (uv) { if (uv.count !== count || !uv.array.every(Number.isFinite)) throw new Error(`Invalid UVs: ${n.name}`); uvMeshes++; }
    morphTargets += n.geometry.morphAttributes.position?.length || 0;
    for (const m of Array.isArray(n.material) ? n.material : [n.material]) for (const t of Object.values(m)) if (t?.isTexture) textures.add(t);
    if (!n.isSkinnedMesh) return;
    skinnedMeshes++; n.skeleton.bones.forEach(b => bones.add(b));
    const ix = n.geometry.attributes.skinIndex, w = n.geometry.attributes.skinWeight;
    if (!ix || !w || ix.count !== count || w.count !== count || ix.itemSize !== 4 || w.itemSize !== 4) throw new Error('Missing skin attributes');
    for (let i = 0; i < count; i++) {
      let sum = 0;
      for (let j = 0; j < 4; j++) {
        const index = ix.array[i * 4 + j], weight = w.array[i * 4 + j];
        if (!Number.isInteger(index) || index < 0 || index >= n.skeleton.bones.length || !Number.isFinite(weight) || weight < 0) throw new Error('Invalid skin values');
        sum += weight;
      }
      if (Math.abs(sum - 1) > 1e-5) throw new Error('Weights do not sum to one');
    }
  });
  return { bones: bones.size, skinnedMeshes, uvMeshes, textures: textures.size, morphTargets, animations: [...clips].map(c => ({ name: c.name, duration: c.duration })) };
}
