import { THREE, group } from './modeling.js';
import { humanoid } from './anatomy.js';
import { skeleton, skin, clip, rotationTrack, morphTarget } from './rigging.js';

// Explicit semantic binding for our authored explorer, not automatic arbitrary-human rigging.
export function riggedExplorer(parameters = {}) {
  const source = humanoid(parameters); source.updateMatrixWorld(true);
  const inverse = source.matrixWorld.clone().invert();
  const world = p => new THREE.Vector3(...p).applyMatrix4(source.matrixWorld).toArray();
  const joints = [
    { name: 'Root', position: [0, 0, 0] }, { name: 'Hips', parent: 'Root', position: world([0, .95, 0]) },
    { name: 'Spine', parent: 'Hips', position: world([0, 1.10, 0]) }, { name: 'Chest', parent: 'Spine', position: world([0, 1.30, 0]) },
    { name: 'Neck', parent: 'Chest', position: world([0, 1.44, 0]) }, { name: 'Head', parent: 'Neck', position: world([0, 1.50, .008]) },
  ];
  for (const [sign, side] of [[1, 'L'], [-1, 'R']]) {
    const joint = (name, parent, position) => joints.push({ name: `${side}_${name}`, parent: parent.includes('_') ? parent : `${side}_${parent}`, position: world(position) });
    joints.push({ name: `${side}_UpperArm`, parent: 'Chest', position: world([sign * .18, 1.36, 0]) });
    joint('Forearm', 'UpperArm', [sign * .268, 1.13, .007]);
    joint('Hand', 'Forearm', [sign * .296, .953, .02]);
    joints.push({ name: `${side}_Thigh`, parent: 'Hips', position: world([sign * .08, .92, 0]) });
    joint('Shin', 'Thigh', [sign * .096, .56, .005]);
    joint('Foot', 'Shin', [sign * .092, .13, .015]);
    for (let finger = 0; finger < 5; finger++) {
      const x = finger === 0 ? .278 : .280 + (finger - 1) * .013;
      const length = [0, .048, .059, .055, .041][finger];
      joint(`Finger${finger}`, 'Hand', [sign * x, finger === 0 ? .929 : .895, .027]);
      joint(`Finger${finger}Tip`, `Finger${finger}`, [sign * (finger === 0 ? .257 : x), finger === 0 ? .907 : .895 - length * .55, .035]);
    }
  }
  const rig = skeleton(joints), result = group('Rigged field explorer', [rig.root]);
  const geometries = new Set(); let counter = 0;
  const blend = (a, b, y, width) => point => {
    const p = point.clone().applyMatrix4(inverse), t = THREE.MathUtils.smoothstep(p.y, y - width / 2, y + width / 2);
    return [[a, 1 - t], [b, t]];
  };
  source.traverse(part => {
    if (!part.isMesh) return;
    const geometry = part.geometry.clone().applyMatrix4(part.matrixWorld); geometries.add(part.geometry);
    geometry.computeBoundingBox();
    const center = geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(inverse);
    const side = center.x >= 0 ? 'L' : 'R', name = part.name;
    let head = false;
    for (let parent = part.parent; parent && parent !== source; parent = parent.parent) if (parent.name === 'Head') head = true;
    let weights = () => [['Chest', 1]], meshName = `${name.replace(/[^A-Za-z0-9_]/g, '_')}_${counter++}`;
    if (head) weights = () => [['Head', 1]];
    else if (name === 'Neck') weights = blend('Chest', 'Head', 1.46, .08);
    else if (name === 'Tailored field jacket' || name === 'Backpack strap' || name === 'Jacket button') weights = blend('Hips', 'Chest', 1.17, .35);
    else if (name === 'Trousers') weights = blend(`${side}_Shin`, `${side}_Thigh`, .56, .14);
    else if (name === 'Rolled sleeve' || name === 'Forearm' || name === 'Sleeve cuff') {
      weights = blend(`${side}_Forearm`, `${side}_UpperArm`, 1.13, .10);
      if (name === 'Forearm') meshName = `${side}_ForearmMesh`;
    } else if (name === 'Palm') weights = () => [[`${side}_Hand`, 1]];
    else if (name.startsWith('Finger ') || name === 'Thumb') {
      const finger = name === 'Thumb' ? 0 : Number(name.split(' ')[1]);
      const centerY = finger === 0 ? .907 : .895 - [0, .048, .059, .055, .041][finger] * .55;
      weights = blend(`${side}_Finger${finger}Tip`, `${side}_Finger${finger}`, centerY, .018);
    } else if (name === 'Boot upper' || name === 'Sole') weights = () => [[`${side}_Foot`, 1]];
    else if (name === 'Boot shaft' || name === 'Boot lace') weights = blend(`${side}_Foot`, `${side}_Shin`, .17, .09);
    else if (name === 'Cargo pocket') weights = () => [[`${side}_Thigh`, 1]];
    else if (name === 'Waist belt' || name.startsWith('Buckle')) weights = () => [['Hips', 1]];
    if (name === 'Tailored field jacket') meshName = 'ExplorerJacket';
    const skinned = skin(geometry, part.material, rig, weights, meshName);
    skinned.frustumCulled = false;
    if (name === 'Tailored field jacket') morphTarget(skinned, 'Breath', p => new THREE.Vector3(p.x * .012, 0, p.z * .035));
    result.add(skinned);
  });
  geometries.forEach(g => g.dispose());
  const wave = [rotationTrack('L_UpperArm', [[0, [0, 0, 0]], [.5, [0, 0, 95]], [2, [0, 0, 95]], [2.5, [0, 0, 0]]]),
    rotationTrack('L_Forearm', [[0, [0, 0, 0]], [.5, [0, 0, 75]], [1, [20, 0, 75]], [1.5, [-20, 0, 75]], [2, [20, 0, 75]], [2.5, [0, 0, 0]]])];
  const walk = [];
  for (const [sign, side] of [[1, 'L'], [-1, 'R']]) {
    walk.push(rotationTrack(`${side}_Thigh`, [[0, [sign * 20, 0, 0]], [.6, [-sign * 20, 0, 0]], [1.2, [sign * 20, 0, 0]]]),
      rotationTrack(`${side}_UpperArm`, [[0, [-sign * 12, 0, 0]], [.6, [sign * 12, 0, 0]], [1.2, [-sign * 12, 0, 0]]]),
      rotationTrack(`${side}_Shin`, [[0, [sign === 1 ? -8 : -28, 0, 0]], [.6, [sign === 1 ? -28 : -8, 0, 0]], [1.2, [sign === 1 ? -8 : -28, 0, 0]]]));
  }
  const grasp = [];
  for (const side of ['L', 'R']) for (let finger = 0; finger < 5; finger++) {
    for (const suffix of ['', 'Tip']) grasp.push(rotationTrack(`${side}_Finger${finger}${suffix}`, [[0, [0, 0, 0]], [1, [-55, 0, 0]], [2, [0, 0, 0]]]));
  }
  result.animations = [clip('Idle', [rotationTrack('Head', [[0, [0, -3, 0]], [2, [0, 3, 0]], [4, [0, -3, 0]]]),
    new THREE.NumberKeyframeTrack('ExplorerJacket.morphTargetInfluences[0]', [0, 2, 4], [0, 1, 0])]), clip('Walk', walk), clip('Wave', wave), clip('Grasp', grasp)];
  return result;
}
