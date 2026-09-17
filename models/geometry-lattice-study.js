import * as THREE from 'three';
import { defineModel, group, material, mesh, box, cylinder, torus, sphere } from '../src/lib/modeling.js';
import {
  deformationHandle, deformationLattice, latticeVertices, deformGeometry,
} from '../src/lib/geometry-deform.js';

function allVertices(geometry) {
  return new Float32Array(geometry.getAttribute('position').count).fill(1);
}

function organicGeometry(mode) {
  let geometry = new THREE.SphereGeometry(1, 42, 30);
  geometry.scale(.34, .40, .29);
  geometry.computeVertexNormals();
  if (mode === 'baseline') return geometry;

  const handle = deformationHandle({ origin: [0, .01, 0], rotation: [0, -5, 4], range: [-.41, .41] });
  const lattice = deformationLattice({
    handle, xRange: [-.37, .37], zRange: [-.32, .32], resolution: [3, 3, 3],
    edits: [
      { point: [2, 2, 0], offset: [.10, .035, -.015] },
      { point: [2, 2, 1], offset: [.13, .050, .010] },
      { point: [2, 2, 2], offset: [.08, .025, .020] },
      { point: [0, 1, 0], offset: [-.045, -.020, .000] },
      { point: [0, 1, 1], offset: [-.060, -.025, .010] },
      { point: [1, 1, 2], offset: [.010, .000, .095] },
      { point: [1, 0, 1], offset: [-.020, -.055, -.020] },
    ],
  });
  const edited = deformGeometry(geometry, latticeVertices(allVertices(geometry), { lattice }));
  geometry.dispose();
  return edited;
}

function organicExample(materials, mode) {
  const root = group(`Creature shoulder mass / ${mode}`, [], { position: [-.46, .01, 0], rotation: [0, -5, 0] });
  root.add(mesh(organicGeometry(mode), { name: 'Editable creature shoulder mass', material: materials.organic }));
  root.add(
    sphere({ name: 'Shoulder socket', radius: .105, segments: 20, position: [-.02, -.37, -.005], material: materials.organicDark }),
    torus({ name: 'Organic scale datum', radius: .355, tube: .004, segments: 72, rotation: [90, 0, 0], position: [0, -.39, 0], material: materials.gauge }),
  );
  root.userData.geometryLatticeStudy = {
    subject: 'organic asymmetric creature mass', mode,
    intent: 'push a broad irregular silhouette with sparse edits to an implicit regular deformation cage',
  };
  return root;
}

function mechanicalGeometry(mode) {
  let geometry = new THREE.BoxGeometry(.68, .42, .38, 18, 12, 10);
  geometry.computeVertexNormals();
  if (mode === 'baseline') return geometry;

  const handle = deformationHandle({ origin: [0, .015, 0], rotation: [0, 0, -6], range: [-.23, .23] });
  const lattice = deformationLattice({
    handle, xRange: [-.37, .37], zRange: [-.22, .22], resolution: [3, 3, 3],
    edits: [
      { point: [0, 2, 0], offset: [-.065, .055, -.025] },
      { point: [0, 2, 1], offset: [-.075, .075, .000] },
      { point: [0, 2, 2], offset: [-.050, .055, .045] },
      { point: [1, 2, 2], offset: [.015, .055, .075] },
      { point: [2, 2, 2], offset: [.060, .030, .045] },
      { point: [2, 1, 0], offset: [.055, -.010, -.030] },
      { point: [2, 1, 1], offset: [.070, .000, -.010] },
    ],
  });
  const edited = deformGeometry(geometry, latticeVertices(allVertices(geometry), { lattice }));
  geometry.dispose();
  return edited;
}

function mechanicalExample(materials, mode) {
  const root = group(`Canted service shell / ${mode}`, [], { position: [.47, .005, 0], rotation: [0, 8, 0] });
  root.add(mesh(mechanicalGeometry(mode), { name: 'Editable service shell', material: materials.panel }));
  root.add(
    box({ name: 'Rigid mounting foot', size: [.72, .09, .43], radius: .025, segments: 3, position: [0, -.255, 0], material: materials.frame }),
    cylinder({ name: 'Mount pin left', radius: .025, height: .045, segments: 16, position: [-.24, -.255, .23], rotation: [90, 0, 0], material: materials.dark }),
    cylinder({ name: 'Mount pin right', radius: .025, height: .045, segments: 16, position: [.24, -.255, .23], rotation: [90, 0, 0], material: materials.dark }),
    torus({ name: 'Shell datum', radius: .36, tube: .004, segments: 72, rotation: [90, 0, 0], position: [0, -.205, 0], material: materials.gauge }),
  );
  root.userData.geometryLatticeStudy = {
    subject: 'hard-surface canted service shell', mode,
    intent: 'reshape a broad box-like shell asymmetrically while keeping its mounting foot independently authored',
  };
  return root;
}

export default defineModel({
  id: 'geometry-lattice-study',
  title: 'Workflow lab / sparse free-form deformation lattice',
  description: 'Warp ordinary indexed geometry through a compact local 3D control lattice without changing topology or baking a vertex table into the recipe.',
  parameters: {
    organic: { type: 'boolean', default: true },
    mechanical: { type: 'boolean', default: true },
    mode: { type: 'select', options: ['baseline', 'lattice'], default: 'lattice' },
  },
  build(p) {
    const materials = {
      organic: material('#89966e', { roughness: .66 }),
      organicDark: material('#4a5842', { roughness: .72 }),
      panel: material('#72828b', { roughness: .38, metalness: .34 }),
      frame: material('#c7c0ad', { roughness: .36, metalness: .30 }),
      dark: material('#22292d', { roughness: .44, metalness: .32 }),
      gauge: material('#d9aa45', { roughness: .28, emissive: '#3b2a08', emissiveIntensity: .16 }),
    };
    const children = [];
    if (p.organic) children.push(organicExample(materials, p.mode));
    if (p.mechanical) children.push(mechanicalExample(materials, p.mode));
    if (!children.length) children.push(sphere({ radius: .02, material: materials.frame }));
    const root = group('Sparse free-form deformation lattice workflow', children);
    root.userData.workflow = {
      sequence: 'indexed mesh -> local regular cage bounds -> sparse control-point offsets -> independent selection -> Bernstein volume warp -> render/export',
      coordinateSpace: 'geometry-local meters; cage frame rotations use XYZ degrees',
      purpose: 'broad asymmetric volume changes without chains of pulls or a giant explicit coordinate table',
      mode: p.mode,
    };
    return root;
  },
});
