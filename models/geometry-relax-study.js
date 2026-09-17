import * as THREE from 'three';
import { defineModel, group, material, mesh, sphere, box, torus, cylinder } from '../src/lib/modeling.js';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import {
  radialSelection, faceRegionSelection, intersectSelections,
  smoothVertices, relaxVertices, sculptGeometry,
} from '../src/lib/geometry-sculpt.js';

function applyMethod(geometry, selection, method, { smoothStrength = .34, smoothIterations = 6, relaxIterations = 6 } = {}) {
  if (method === 'baseline') return geometry;
  const operation = method === 'smooth'
    ? smoothVertices(selection, { strength: smoothStrength, iterations: smoothIterations, preserveBoundary: true })
    : relaxVertices(selection, { lambda: .5, mu: -.53, iterations: relaxIterations, preserveBoundary: true });
  const edited = sculptGeometry(geometry, operation);
  geometry.dispose();
  return edited;
}

function noisyCreatureShell(method) {
  let geometry = new THREE.SphereGeometry(.255, 40, 28);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index++) {
    const point = new THREE.Vector3().fromBufferAttribute(position, index);
    const normal = point.clone().normalize();
    const noise = .018 * Math.sin(point.x * 92 + point.y * 53)
      + .012 * Math.cos(point.z * 107 - point.x * 47)
      + .006 * Math.sin((point.x + point.z) * 153);
    point.addScaledVector(normal, noise);
    position.setXYZ(index, point.x, point.y, point.z);
  }
  position.needsUpdate = true;
  geometry.scale(.82, 1.06, .94);
  geometry.computeVertexNormals();
  const all = new Float32Array(position.count).fill(1);
  return applyMethod(geometry, all, method, { smoothStrength: .34, smoothIterations: 6, relaxIterations: 10 });
}

function organicExample(materials, method) {
  const shell = noisyCreatureShell(method);
  const root = group(`Creature shell / ${method}`, [], { position: [-.42, .02, 0], rotation: [-3, -10, 0] });
  root.add(mesh(shell, { name: 'Fairing test creature shell', material: materials.organic }));
  root.add(
    sphere({ name: 'Left eye marker', radius: .025, segments: 14, position: [-.071, .050, .223], material: materials.dark }),
    sphere({ name: 'Right eye marker', radius: .025, segments: 14, position: [.071, .050, .223], material: materials.dark }),
    cylinder({ name: 'Muzzle marker', radius: .021, top: .015, bottom: .027, height: .070, segments: 14, rotation: [90, 0, 0], position: [0, -.035, .233], material: materials.organicDark }),
    torus({ name: 'Original-scale gauge', radius: .265, tube: .0022, segments: 72, rotation: [90, 0, 0], position: [0, 0, -.010], material: materials.gauge }),
  );
  root.userData.geometryRelaxStudy = {
    subject: 'noisy stylized creature shell', method,
    intent: 'remove high-frequency surface noise while retaining the authored primary volume',
  };
  return root;
}

function noisyServicePanel(method) {
  let geometry = new THREE.PlaneGeometry(.44, .34, 32, 24);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index), y = position.getY(index);
    const nx = x / .22, ny = y / .17;
    const dome = .030 * Math.max(0, 1 - nx * nx - ny * ny);
    const noise = .008 * Math.sin(x * 108 + y * 43) + .005 * Math.cos(y * 127 - x * 37);
    position.setZ(index, dome + noise);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  defineFaceRegions(geometry, {
    'panel.service': ({ centroid }) => Math.abs(centroid.x) < .175 && Math.abs(centroid.y) < .125,
  }, { clone: false });
  if (method === 'baseline') return geometry;
  const service = intersectSelections(
    faceRegionSelection(geometry, 'panel.service'),
    radialSelection({ center: [0, 0, .02], radius: [.19, .145, .12], falloff: 'smooth' }),
  );
  return applyMethod(geometry, service, method, { smoothStrength: .30, smoothIterations: 7, relaxIterations: 10 });
}

function mechanicalExample(materials, method) {
  const panel = noisyServicePanel(method);
  const root = group(`Cast service cover / ${method}`, [], { position: [.42, -.015, 0], rotation: [2, 10, -2] });
  root.add(mesh(panel, { name: 'Editable cast cover', material: materials.panel }));
  const bars = [
    { size: [.46, .022, .026], position: [0, .182, -.012] }, { size: [.46, .022, .026], position: [0, -.182, -.012] },
    { size: [.022, .34, .026], position: [-.231, 0, -.012] }, { size: [.022, .34, .026], position: [.231, 0, -.012] },
  ];
  root.add(...bars.map((spec, index) => box({ name: `Frame rail ${index + 1}`, ...spec, radius: .004, segments: 2, material: materials.frame })));
  root.add(torus({ name: 'Service datum ring', radius: .105, tube: .0035, segments: 64, position: [0, 0, .044], material: materials.gauge }));
  for (const [index, [x, y]] of [[-.19, -.145], [.19, -.145], [-.19, .145], [.19, .145]].entries()) {
    root.add(cylinder({ name: `Fastener ${index + 1}`, radius: .009, height: .014, segments: 12, rotation: [90, 0, 0], position: [x, y, .012], material: materials.dark }));
  }
  root.userData.geometryRelaxStudy = {
    subject: 'domed hard-surface cast cover', method,
    intent: 'fair one named service region without collapsing its shallow crown or moving the open boundary',
  };
  return root;
}

export default defineModel({
  id: 'geometry-relax-study',
  title: 'Workflow lab / shrink-resistant mesh relaxation',
  description: 'Compare one-way Laplacian smoothing with an alternating positive/negative one-ring fairing pass on organic and hard-surface BufferGeometry.',
  parameters: {
    organic: { type: 'boolean', default: true },
    mechanical: { type: 'boolean', default: true },
    method: { type: 'select', options: ['baseline', 'smooth', 'relax'], default: 'relax' },
  },
  build(p) {
    const materials = {
      organic: material('#879c7a', { roughness: .68 }),
      organicDark: material('#50604c', { roughness: .70 }),
      panel: material('#6c7880', { roughness: .42, metalness: .26 }),
      frame: material('#c7c6b9', { roughness: .40, metalness: .30 }),
      dark: material('#242b2e', { roughness: .48, metalness: .24 }),
      gauge: material('#dfb35d', { roughness: .30, emissive: '#49320d', emissiveIntensity: .18 }),
    };
    const children = [];
    if (p.organic) children.push(organicExample(materials, p.method));
    if (p.mechanical) children.push(mechanicalExample(materials, p.method));
    if (!children.length) children.push(sphere({ radius: .02, material: materials.frame }));
    const root = group('Geometry relaxation workflow', children);
    root.userData.workflow = {
      sequence: 'authored indexed mesh -> point selection -> smoothVertices or relaxVertices -> render/export',
      coordinateSpace: 'geometry-local meters',
      method: p.method,
      purpose: 'remove local surface noise while making shrink behavior an explicit authoring choice',
    };
    return root;
  },
});
