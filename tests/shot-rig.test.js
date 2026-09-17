import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { framedPerspectiveCamera, inspectShotFraming, punctualLight, punctualLightRig, authoredShot } from '../src/lib/shot-rig.js';
import { hydrateScene, findSceneLook } from '../src/lib/scene-look.js';

function subjectGeometry(scale = 1) {
  const material = new THREE.MeshStandardMaterial();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2 * scale, .8 * scale, .55 * scale), material);
  body.name = 'Body';
  body.position.set(.18 * scale, .42 * scale, -.08 * scale);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(.32 * scale, 16, 10), material);
  crown.position.set(-.24 * scale, .9 * scale, .12 * scale);
  const root = new THREE.Group();
  root.name = 'Subject';
  root.add(body, crown);
  return root;
}
function dispose(root) {
  const geometries = new Set(), materials = new Set();
  root.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.material) (Array.isArray(node.material) ? node.material : [node.material]).forEach(value => materials.add(value));
  });
  geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose());
}

test('framed perspective camera fits materially different subject scales without subject-specific coordinates', () => {
  const small = subjectGeometry(.45), large = subjectGeometry(2.1);
  const options = { direction: [.8, .35, 1.6], aspect: 16 / 9, fov: 38, occupancy: .76 };
  const a = framedPerspectiveCamera(small, options), b = framedPerspectiveCamera(large, options);
  const fa = inspectShotFraming(a, small), fb = inspectShotFraming(b, large);
  assert.equal(fa.clipped, false); assert.equal(fb.clipped, false);
  assert.ok(fa.occupancy <= .761 && fa.occupancy > .45, `small occupancy ${fa.occupancy}`);
  assert.ok(fb.occupancy <= .761 && fb.occupancy > .45, `large occupancy ${fb.occupancy}`);
  const da = a.position.distanceTo(new THREE.Vector3(...a.userData.lookAt));
  const db = b.position.distanceTo(new THREE.Vector3(...b.userData.lookAt));
  assert.ok(Math.abs(db / da - 2.1 / .45) < .03, `distance ratio ${db / da}`);
  assert.deepEqual(a.userData.shotFraming.direction, b.userData.shotFraming.direction);
  dispose(small); dispose(large);
});

test('punctual light aligns Three.js targets with the portable local -Z light direction', () => {
  for (const type of ['directional', 'spot']) {
    const light = punctualLight({ type, name: `${type} test`, position: [2, 3, 4], target: [.1, .7, -.2], intensity: 2, angle: 36, penumbra: .25 });
    light.updateMatrixWorld(true);
    const from = light.getWorldPosition(new THREE.Vector3());
    const target = light.target.getWorldPosition(new THREE.Vector3());
    const targetDirection = target.sub(from).normalize();
    const portableDirection = new THREE.Vector3(0, 0, -1).transformDirection(light.matrixWorld);
    assert.ok(targetDirection.distanceTo(portableDirection) < 1e-7);
    assert.equal(light.target.userData.lightTarget, true);
  }
  const point = punctualLight({ type: 'point', position: [1, 2, 3], intensity: 4, decay: 2 });
  assert.ok(point.isPointLight);
  assert.equal(point.userData.punctual.target, null);
});

test('bounds-relative light rig reuses one layout across different subject scales', () => {
  const small = subjectGeometry(.5), large = subjectGeometry(2);
  const definitions = [
    { name: 'Key', type: 'directional', offset: [-2, 3, 4], intensity: 2.2 },
    { name: 'Fill', type: 'point', offset: [2, 1, 2], intensity: 3, decay: 2 },
    { name: 'Rim', type: 'spot', offset: [1, 2, -3], intensity: 5, angle: 42, penumbra: .5, decay: 2 },
  ];
  const a = punctualLightRig(small, { lights: definitions });
  const b = punctualLightRig(large, { lights: definitions });
  assert.equal(a.children.length, 3); assert.equal(b.children.length, 3);
  assert.ok(Math.abs(b.userData.shotLighting.scale / a.userData.shotLighting.scale - 4) < .02);
  assert.deepEqual(a.userData.shotLighting.lights.map(light => light.offset), b.userData.shotLighting.lights.map(light => light.offset));
  assert.equal(a.name, 'AuthoredSceneLights');
  dispose(small); dispose(large);
});

test('authored shot metadata survives Object3D serialization and light targets hydrate explicitly', async () => {
  const subject = subjectGeometry(1); subject.name = 'Shot subject';
  const camera = framedPerspectiveCamera(subject, { name: 'HeroCamera', aspect: 1, occupancy: .72 });
  const lights = punctualLightRig(subject, { lights: [
    { name: 'Key', type: 'directional', offset: [-2, 3, 4], intensity: 2 },
    { name: 'Practical', type: 'point', offset: [1, .4, 1.2], intensity: 2, decay: 2 },
  ] });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(3, .04, 3), new THREE.MeshStandardMaterial()); floor.name = 'Floor';
  const scene = authoredShot({ subject, camera, lights, environment: [floor], background: '#182028', fog: { near: 8, far: 16 } });
  const look = findSceneLook(scene);
  assert.equal(look.subject, 'Shot subject'); assert.equal(look.camera, 'HeroCamera');
  assert.equal(floor.userData.environment, true);
  const restored = hydrateScene(await new THREE.ObjectLoader().parseAsync(scene.toJSON()));
  const restoredKey = restored.getObjectByName('Key');
  assert.ok(restoredKey.isDirectionalLight);
  assert.equal(restoredKey.target.userData.lightTarget, true);
  assert.equal(findSceneLook(restored).background, '#182028');
  dispose(scene); dispose(restored);
});

test('shot helpers reject ambiguous or non-portable inputs explicitly', () => {
  const subject = subjectGeometry(1);
  assert.throws(() => framedPerspectiveCamera(subject, { direction: [0, 0, 0] }), /nonzero/);
  assert.throws(() => framedPerspectiveCamera(subject, { occupancy: 1 }), /occupancy/);
  assert.throws(() => punctualLight({ type: 'area' }), /Unsupported/);
  assert.throws(() => punctualLight({ type: 'spot', angle: 120 }), /Spot angle/);
  assert.throws(() => punctualLightRig(subject, { lights: [] }), /at least one/);
  dispose(subject);
});
