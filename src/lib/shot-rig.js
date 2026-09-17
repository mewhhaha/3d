import * as THREE from 'three';

const finiteVector = (value, label) => {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) throw new Error(`${label} must contain three finite numbers`);
  return new THREE.Vector3(...value);
};
const finitePositive = (value, label) => {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be positive`);
  return value;
};
const finiteNonNegative = (value, label) => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be nonnegative`);
  return value;
};

function boundsOf(subject) {
  if (subject instanceof THREE.Box3) {
    if (subject.isEmpty()) throw new Error('Shot bounds must not be empty');
    return subject.clone();
  }
  if (!subject?.isObject3D) throw new Error('Shot subject must be an Object3D or Box3');
  subject.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(subject, true);
  if (bounds.isEmpty()) throw new Error('Shot subject has no visible bounds');
  return bounds;
}
function cornersOf(bounds) {
  const { min, max } = bounds;
  return [
    [min.x,min.y,min.z],[max.x,min.y,min.z],[min.x,max.y,min.z],[max.x,max.y,min.z],
    [min.x,min.y,max.z],[max.x,min.y,max.z],[min.x,max.y,max.z],[max.x,max.y,max.z],
  ].map(point => new THREE.Vector3(...point));
}
function colorHex(value, label) {
  try { return `#${new THREE.Color(value).getHexString()}`; }
  catch { throw new Error(`${label} must be a valid Three.js color`); }
}

/**
 * Fit a perspective camera around one authored subject without baking subject-specific coordinates.
 * `direction` points from the target toward the camera. `occupancy` is the maximum fraction of the
 * horizontal/vertical NDC half-extent used by the subject bounds.
 */
export function framedPerspectiveCamera(subject, {
  name = 'HeroCamera',
  direction = [0.75, 0.35, 2],
  target,
  fov = 35,
  aspect = 1,
  occupancy = 0.82,
  near,
  far,
} = {}) {
  if (typeof name !== 'string' || !name.trim()) throw new Error('Camera name is required');
  if (!Number.isFinite(fov) || fov <= 0 || fov >= 120) throw new Error('Camera fov must be between 0 and 120 degrees');
  finitePositive(aspect, 'Camera aspect');
  if (!Number.isFinite(occupancy) || occupancy <= 0.1 || occupancy >= 0.98) throw new Error('Camera occupancy must be between .1 and .98');
  const viewDirection = finiteVector(direction, 'Camera direction');
  if (viewDirection.lengthSq() < 1e-12) throw new Error('Camera direction must be nonzero');
  viewDirection.normalize();
  const bounds = boundsOf(subject);
  const center = bounds.getCenter(new THREE.Vector3());
  const aim = target === undefined ? center : finiteVector(target, 'Camera target');
  const probe = new THREE.PerspectiveCamera(fov, aspect, 0.01, 1000);
  probe.position.copy(aim).add(viewDirection);
  probe.lookAt(aim);
  probe.updateMatrixWorld(true);
  const inverse = probe.quaternion.clone().invert();
  const local = cornersOf(bounds).map(point => point.sub(aim).applyQuaternion(inverse));
  const tanY = Math.tan(THREE.MathUtils.degToRad(fov) / 2) * occupancy;
  const tanX = tanY * aspect;
  let distance = Math.max(...local.map(point => point.z + Math.max(Math.abs(point.x) / tanX, Math.abs(point.y) / tanY)));
  const radius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, 1e-4);
  distance = Math.max(distance + radius * 0.01 + 1e-4, radius * 0.05);
  const depths = local.map(point => distance - point.z);
  const autoNear = Math.max(1e-4, Math.min(...depths) * 0.5);
  const autoFar = Math.max(autoNear * 2, Math.max(...depths) * 1.5);
  const resolvedNear = near === undefined ? autoNear : finitePositive(near, 'Camera near');
  const resolvedFar = far === undefined ? autoFar : finitePositive(far, 'Camera far');
  if (resolvedFar <= resolvedNear) throw new Error('Camera far must be greater than near');
  const camera = new THREE.PerspectiveCamera(fov, aspect, resolvedNear, resolvedFar);
  camera.name = name;
  camera.position.copy(aim).addScaledVector(viewDirection, distance);
  camera.lookAt(aim);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  camera.userData.lookAt = aim.toArray();
  camera.userData.shotFraming = {
    schema: 1,
    direction: viewDirection.toArray(),
    target: aim.toArray(),
    occupancy,
    fov,
    aspect,
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  };
  return camera;
}

/** Bounds-based screen-space diagnostic for authored cameras. */
export function inspectShotFraming(camera, subject) {
  if (!camera?.isCamera) throw new Error('inspectShotFraming needs a camera');
  const bounds = boundsOf(subject);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix?.();
  const points = cornersOf(bounds).map(point => point.project(camera));
  const ndc = new THREE.Box3().setFromPoints(points);
  const clipped = ndc.min.x < -1 || ndc.min.y < -1 || ndc.min.z < -1 || ndc.max.x > 1 || ndc.max.y > 1 || ndc.max.z > 1;
  return {
    ndcMin: ndc.min.toArray(),
    ndcMax: ndc.max.toArray(),
    occupancy: Math.max(ndc.max.x - ndc.min.x, ndc.max.y - ndc.min.y) / 2,
    clipped,
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  };
}

/** Create one exportable glTF-compatible punctual light. */
export function punctualLight({
  type = 'directional',
  name = 'PunctualLight',
  color = '#ffffff',
  intensity = 1,
  position = [0, 1, 1],
  target = [0, 0, 0],
  distance = 0,
  decay = 2,
  angle = 45,
  penumbra = 0,
  castShadow = false,
} = {}) {
  if (!['directional', 'point', 'spot'].includes(type)) throw new Error(`Unsupported punctual light type: ${type}`);
  if (typeof name !== 'string' || !name.trim()) throw new Error('Light name is required');
  finiteNonNegative(intensity, 'Light intensity');
  const at = finiteVector(position, 'Light position');
  const aim = finiteVector(target, 'Light target');
  const tint = colorHex(color, 'Light color');
  let light;
  if (type === 'directional') {
    light = new THREE.DirectionalLight(tint, intensity);
  } else if (type === 'point') {
    light = new THREE.PointLight(tint, intensity, finiteNonNegative(distance, 'Light distance'), finitePositive(decay, 'Light decay'));
  } else {
    if (!Number.isFinite(angle) || angle <= 0 || angle > 90) throw new Error('Spot angle must be in (0, 90] degrees');
    if (!Number.isFinite(penumbra) || penumbra < 0 || penumbra > 1) throw new Error('Spot penumbra must be in [0, 1]');
    light = new THREE.SpotLight(tint, intensity, finiteNonNegative(distance, 'Light distance'), THREE.MathUtils.degToRad(angle), penumbra, finitePositive(decay, 'Light decay'));
  }
  light.name = name;
  light.position.copy(at);
  light.castShadow = !!castShadow;
  if (type !== 'point') {
    if (at.distanceToSquared(aim) < 1e-12) throw new Error('Aimed light position must differ from target');
    light.lookAt(aim);
    const targetNode = new THREE.Object3D();
    targetNode.name = `${name} target`;
    targetNode.position.set(0, 0, -1);
    targetNode.userData.lightTarget = true;
    light.add(targetNode);
    light.target = targetNode;
  }
  light.userData.punctual = {
    schema: 1,
    type,
    position: at.toArray(),
    target: type === 'point' ? null : aim.toArray(),
    color: tint,
    intensity,
  };
  return light;
}

/**
 * Place independently configurable punctual lights around a subject using bounds-relative offsets.
 * Offsets are measured in `scale` units; the default scale is the subject bounding-sphere radius.
 */
export function punctualLightRig(subject, {
  name = 'AuthoredSceneLights',
  target,
  scale,
  lights = [],
} = {}) {
  if (typeof name !== 'string' || !name.trim()) throw new Error('Light rig name is required');
  if (!Array.isArray(lights) || !lights.length) throw new Error('Light rig needs at least one light');
  const bounds = boundsOf(subject);
  const center = bounds.getCenter(new THREE.Vector3());
  const aim = target === undefined ? center : finiteVector(target, 'Light rig target');
  const defaultScale = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, 1e-4);
  const resolvedScale = scale === undefined ? defaultScale : finitePositive(scale, 'Light rig scale');
  const rig = new THREE.Group();
  rig.name = name;
  const authored = [];
  for (const definition of lights) {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) throw new Error('Light definition must be an object');
    const offset = finiteVector(definition.offset ?? [0, 1, 1], 'Light offset');
    const position = aim.clone().addScaledVector(offset, resolvedScale).toArray();
    const { offset: ignored, ...spec } = definition;
    const light = punctualLight({ ...spec, position, target: aim.toArray() });
    authored.push({ name: light.name, type: light.userData.punctual.type, offset: offset.toArray() });
    rig.add(light);
  }
  rig.userData.shotLighting = { schema: 1, target: aim.toArray(), scale: resolvedScale, lights: authored };
  return rig;
}

/** Assemble an exportable subject, camera and punctual rig with the metadata consumed by render-stage hero views. */
export function authoredShot({
  name = 'AuthoredShot',
  subject,
  camera,
  lights,
  environment = [],
  background = '#20252a',
  fog = { near: 20, far: 40 },
  bloom,
  depthOfField,
} = {}) {
  if (!subject?.isObject3D || !subject.name) throw new Error('authoredShot needs a named subject Object3D');
  if (!camera?.isPerspectiveCamera || !camera.name) throw new Error('authoredShot needs a named perspective camera');
  if (!lights?.isObject3D) throw new Error('authoredShot needs an authored light rig');
  if (!fog || !Number.isFinite(fog.near) || !Number.isFinite(fog.far) || fog.near < 0 || fog.far <= fog.near) throw new Error('Shot fog needs finite near < far');
  const env = (Array.isArray(environment) ? environment : [environment]).flat(Infinity).filter(Boolean);
  if (env.some(item => !item?.isObject3D)) throw new Error('Shot environment must contain Object3D values');
  env.forEach(item => { item.userData.environment = true; });
  const root = new THREE.Group();
  root.name = name;
  root.add(subject, ...env, lights, camera);
  const recipe = {
    schema: 1,
    subject: subject.name,
    camera: camera.name,
    background: colorHex(background, 'Shot background'),
    fog: { near: fog.near, far: fog.far },
    lighting: 'authored',
  };
  if (bloom !== undefined) recipe.bloom = structuredClone(bloom);
  if (depthOfField !== undefined) recipe.depthOfField = structuredClone(depthOfField);
  root.userData.sceneRecipe = recipe;
  return root;
}
