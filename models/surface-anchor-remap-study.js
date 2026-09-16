import * as THREE from 'three';
import { defineModel, group, material, mesh, sphere, cylinder, box, torus } from '../src/lib/modeling.js';
import { profileSweepGeometry } from '../src/lib/profile-sweep.js';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { solidifyGeometry, remapSolidifyAnchor } from '../src/lib/surface-thickness.js';
import { bindSurfaceAnchor, attachSurfaceAnchor, resolveSurfaceAnchor } from '../src/lib/surface-mount.js';

function leafSheet(curl = 0) {
  return profileSweepGeometry({
    path: [
      [0, -.23, 0],
      [-.018, -.12, .018 + curl * .012],
      [.014, 0, .030 + curl * .045],
      [-.010, .13, .020 + curl * .090],
      [.004, .25, curl * .145],
    ],
    profile: [[-.075,0],[-.038,.018],[0,.027],[.038,.018],[.075,0]],
    closedProfile: false,
    segments: 34,
    up: [1,0,0],
    scale: t => [.66 + .36 * Math.sin(Math.PI * t), .84 + .16 * Math.sin(Math.PI * t)],
    tilt: t => -5 + 10 * t,
    faceRegions: {
      'leaf.bud-zone': meta => meta.kind === 'side' && meta.pathMid > .62 && meta.pathMid < .82 && meta.profileMid > .30 && meta.profileMid < .70,
    },
  });
}

function panelSheet(arch = 0) {
  const geometry = new THREE.PlaneGeometry(.36, .31, 8, 7);
  const p = geometry.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, .012 * Math.cos(y * 9) + arch * (.075 * (1 - (x / .18) ** 2) + .025 * y));
  }
  p.needsUpdate = true;
  geometry.computeVertexNormals();
  defineFaceRegions(geometry, {
    'panel.service-zone': ({ centroid }) => centroid.x > .025 && centroid.y > -.09 && centroid.y < .10,
  }, { clone: false });
  return geometry;
}

function bud(materials, mat, name) {
  return group(name, [
    cylinder({ name: `${name} stem`, radius: .007, height: .042, segments: 12, rotation: [90,0,0], position: [0,0,.022], material: materials.dark }),
    sphere({ name: `${name} bulb`, radius: .022, segments: 16, position: [0,0,.055], scale: [.8,1.12,.8], material: mat }),
  ]);
}

function undersidePod(materials, mat, name) {
  return group(name, [
    torus({ name: `${name} collar`, radius: .018, tube: .0045, segments: 20, rotation: [90,0,0], position: [0,0,.006], material: materials.dark }),
    sphere({ name: `${name} pod`, radius: .014, segments: 14, position: [0,0,.018], scale: [1,.75,1], material: mat }),
  ]);
}

function sensor(materials, mat, name) {
  return group(name, [
    box({ name: `${name} body`, size: [.064,.048,.022], radius: .006, segments: 2, position: [0,0,.014], material: materials.metal }),
    cylinder({ name: `${name} lens`, radius: .014, height: .018, segments: 16, rotation: [90,0,0], position: [0,0,.035], material: mat }),
  ]);
}

function latch(materials, mat, name) {
  return group(name, [
    box({ name: `${name} base`, size: [.052,.034,.014], radius: .004, segments: 2, position: [0,0,.008], material: materials.dark }),
    cylinder({ name: `${name} pin`, radius: .009, height: .025, segments: 12, rotation: [90,0,0], position: [0,0,.026], material: mat }),
  ]);
}

function marker(pose, mat, name) {
  const result = sphere({ name, radius: .008, segments: 12, material: mat });
  result.position.copy(pose.frame.origin);
  result.updateMatrix();
  return result;
}

function organicExample(materials) {
  const bindSheet = leafSheet(0);
  const sourceAnchor = bindSurfaceAnchor(bindSheet, {
    near: [.005,.145,.08], regionNames: ['leaf.bud-zone'], tangentHint: [1,0,0], offset: .009,
    local: { rotation: [0,0,7] },
  });
  const editedSheet = leafSheet(2.7);
  const shell = solidifyGeometry(editedSheet, { thickness: .020, offset: -.15, rim: 'smooth', regionPrefix: 'leaf.shell' });
  const outerAnchor = remapSolidifyAnchor(shell, sourceAnchor, { surface: 'outer' });
  const innerAnchor = remapSolidifyAnchor(shell, sourceAnchor, { surface: 'inner' });
  const outerPose = resolveSurfaceAnchor(shell, outerAnchor);
  const innerPose = resolveSurfaceAnchor(shell, innerAnchor);

  const root = group('Organic solidify anchor remap', [], { position: [-.34,.16,0], rotation: [0,-10,0] });
  root.add(mesh(shell, { name: 'Curled thick leaf', material: materials.leaf }));
  const outer = bud(materials, materials.outer, 'Outer remapped bud');
  attachSurfaceAnchor(outer, shell, outerAnchor); root.add(outer);
  const inner = undersidePod(materials, materials.inner, 'Inner remapped pod');
  attachSurfaceAnchor(inner, shell, innerAnchor); root.add(inner);
  root.add(marker(outerPose, materials.outer, 'Outer exact anchor point'));
  root.add(marker(innerPose, materials.inner, 'Inner exact anchor point'));
  root.userData.anchorRemap = {
    sourceTriangle: sourceAnchor.triangleIndex,
    outerTriangle: outerAnchor.triangleIndex,
    innerTriangle: innerAnchor.triangleIndex,
    throughThicknessDistance: outerPose.frame.origin.distanceTo(innerPose.frame.origin),
    sourceTopology: sourceAnchor.topologySignature,
    shellTopology: outerAnchor.topologySignature,
  };
  bindSheet.dispose(); editedSheet.dispose();
  return root;
}

function mechanicalExample(materials) {
  const bindSheet = panelSheet(0);
  const sourceAnchor = bindSurfaceAnchor(bindSheet, {
    near: [.105,.01,.16], regionNames: ['panel.service-zone'], tangentHint: [0,1,0], offset: .011,
    local: { position: [.006,-.004,0], rotation: [0,0,-16], scale: .9 },
  });
  const editedSheet = panelSheet(2.4);
  const shell = solidifyGeometry(editedSheet, { thickness: .030, offset: -.3, rim: 'sharp', regionPrefix: 'panel.shell' });
  const outerAnchor = remapSolidifyAnchor(shell, sourceAnchor, { surface: 'outer' });
  const innerAnchor = remapSolidifyAnchor(shell, sourceAnchor, { surface: 'inner' });
  const outerPose = resolveSurfaceAnchor(shell, outerAnchor);
  const innerPose = resolveSurfaceAnchor(shell, innerAnchor);

  const root = group('Mechanical solidify anchor remap', [], { position: [.36,-.10,0], rotation: [-4,12,-4] });
  root.add(mesh(shell, { name: 'Arched service shell', material: materials.panel }));
  const outer = sensor(materials, materials.outer, 'Outer remapped sensor');
  attachSurfaceAnchor(outer, shell, outerAnchor); root.add(outer);
  const inner = latch(materials, materials.inner, 'Inner remapped latch');
  attachSurfaceAnchor(inner, shell, innerAnchor); root.add(inner);
  root.add(marker(outerPose, materials.outer, 'Outer panel anchor point'));
  root.add(marker(innerPose, materials.inner, 'Inner panel anchor point'));
  root.userData.anchorRemap = {
    sourceTriangle: sourceAnchor.triangleIndex,
    outerTriangle: outerAnchor.triangleIndex,
    innerTriangle: innerAnchor.triangleIndex,
    throughThicknessDistance: outerPose.frame.origin.distanceTo(innerPose.frame.origin),
    sourceTopology: sourceAnchor.topologySignature,
    shellTopology: outerAnchor.topologySignature,
  };
  bindSheet.dispose(); editedSheet.dispose();
  return root;
}

export default defineModel({
  id: 'surface-anchor-remap-study',
  title: 'Workflow lab / anchor remap through solidify',
  description: 'Bind a barycentric support spot before a topology change, then use solidify-owned face/corner provenance to remap the same authoring intent onto exact outer and inner shell faces.',
  parameters: {
    organic: { type: 'boolean', default: true },
    mechanical: { type: 'boolean', default: true },
  },
  build(p) {
    const materials = {
      leaf: material('#6b826f', { roughness: .58 }),
      panel: material('#59636b', { roughness: .38, metalness: .44 }),
      dark: material('#263139', { roughness: .52, metalness: .2 }),
      metal: material('#c8ced0', { roughness: .32, metalness: .5 }),
      outer: material('#efb35c', { roughness: .28, emissive: '#5d2c07', emissiveIntensity: .22 }),
      inner: material('#59d2d0', { roughness: .28, emissive: '#0d4348', emissiveIntensity: .22 }),
    };
    const children = [];
    if (p.organic) children.push(organicExample(materials));
    if (p.mechanical) children.push(mechanicalExample(materials));
    if (!children.length) children.push(sphere({ radius: .02, material: materials.metal }));
    const root = group('Solidify anchor remap workflow', children);
    root.userData.workflow = {
      sequence: 'bindSurfaceAnchor(source sheet) -> solidifyGeometry(rebuilt sheet) -> remapSolidifyAnchor(shell) -> attachSurfaceAnchor(component)',
      legend: { gold: 'exact outer-face remap', cyan: 'exact inner-face remap' },
    };
    return root;
  },
});
