import * as THREE from 'three';
import { defineModel, group, material, mesh, box, cylinder, torus, sphere } from '../src/lib/modeling.js';
import {
  deformationHandle, deformationLattice, latticeVertices, deformGeometryInParent,
} from '../src/lib/geometry-deform.js';

const all = () => 1;

function placedGeometry(source, placement, lattice, mode) {
  if (mode === 'baseline') return source;
  const edited = deformGeometryInParent(source, placement, latticeVertices(all, { lattice }));
  source.dispose();
  return edited;
}

function placedMesh(source, placement, lattice, mode, options) {
  return mesh(placedGeometry(source, placement, lattice, mode), { ...placement, ...options });
}

function organicExample(materials, mode) {
  const lattice = deformationLattice({
    handle: deformationHandle({ origin: [0, .015, 0], rotation: [4, -7, 5], range: [-.34, .34] }),
    xRange: [-.40, .40], zRange: [-.34, .34], resolution: [3, 3, 3],
    edits: [
      { point: [2, 2, 0], offset: [.085, .040, -.025] },
      { point: [2, 2, 1], offset: [.115, .070, .010] },
      { point: [2, 2, 2], offset: [.075, .045, .060] },
      { point: [1, 2, 2], offset: [.010, .025, .075] },
      { point: [0, 1, 0], offset: [-.040, -.020, -.015] },
      { point: [0, 1, 1], offset: [-.055, -.025, .000] },
      { point: [1, 0, 1], offset: [-.015, -.045, -.010] },
    ],
  });
  const bodyPlacement = { position: [0, .01, 0], rotation: [0, -4, 0], scale: [1, 1, 1] };
  const crestPlacement = { position: [-.03, .20, .245], rotation: [0, 0, -8], scale: [1, .78, 1] };
  const collarPlacement = { position: [0, -.265, -.005], rotation: [90, 0, 0], scale: [1, 1, .86] };
  const body = new THREE.SphereGeometry(1, 38, 28);
  body.scale(.34, .33, .285);
  body.computeVertexNormals();
  const crest = new THREE.TorusGeometry(.205, .028, 8, 48, Math.PI * 1.28);
  crest.rotateZ(-Math.PI * .14);
  crest.computeVertexNormals();
  const collar = new THREE.TorusGeometry(.255, .024, 8, 48);
  collar.computeVertexNormals();
  const root = group(`Layered creature mass / ${mode}`, [
    placedMesh(body, bodyPlacement, lattice, mode, { name: 'Creature skin mass', material: materials.skin }),
    placedMesh(crest, crestPlacement, lattice, mode, { name: 'Independent dorsal crest', material: materials.crest }),
    placedMesh(collar, collarPlacement, lattice, mode, { name: 'Independent collar ring', material: materials.collar }),
    sphere({ name: 'Rigid socket datum', radius: .07, segments: 18, position: [0, -.365, 0], material: materials.dark }),
  ], { position: [-.48, .01, 0], rotation: [0, -5, 0] });
  root.userData.sharedDeformation = {
    subject: 'layered organic creature mass', mode,
    deformedParts: ['Creature skin mass', 'Independent dorsal crest', 'Independent collar ring'],
    rigidParts: ['Rigid socket datum'],
    intent: 'one parent-local cage reshapes separately owned skin, crest, and collar while keeping their materials and object transforms independent',
  };
  return root;
}

function mechanicalExample(materials, mode) {
  const lattice = deformationLattice({
    handle: deformationHandle({ origin: [0, .005, .005], rotation: [-3, 5, -7], range: [-.23, .23] }),
    xRange: [-.39, .39], zRange: [-.25, .25], resolution: [3, 3, 3],
    edits: [
      { point: [0, 2, 0], offset: [-.055, .055, -.020] },
      { point: [0, 2, 1], offset: [-.070, .075, .005] },
      { point: [0, 2, 2], offset: [-.040, .045, .050] },
      { point: [1, 2, 2], offset: [.010, .050, .070] },
      { point: [2, 2, 2], offset: [.075, .025, .045] },
      { point: [2, 1, 1], offset: [.065, -.010, -.005] },
      { point: [2, 0, 0], offset: [.025, -.035, -.025] },
    ],
  });
  const shellPlacement = { position: [0, .015, 0], rotation: [0, 4, 0], scale: [1, 1, 1] };
  const railPlacement = { position: [0, .13, .13], rotation: [6, -2, 0], scale: [1, 1, 1] };
  const insetPlacement = { position: [.015, .015, .183], rotation: [0, 4, 0], scale: [1, 1, 1] };
  const shell = new THREE.BoxGeometry(.68, .40, .34, 16, 10, 8);
  shell.computeVertexNormals();
  const rail = new THREE.BoxGeometry(.60, .075, .10, 16, 3, 3);
  rail.computeVertexNormals();
  const inset = new THREE.BoxGeometry(.42, .18, .026, 12, 6, 1);
  inset.computeVertexNormals();
  const root = group(`Layered service housing / ${mode}`, [
    placedMesh(shell, shellPlacement, lattice, mode, { name: 'Independent housing shell', material: materials.shell }),
    placedMesh(rail, railPlacement, lattice, mode, { name: 'Independent upper rail', material: materials.rail }),
    placedMesh(inset, insetPlacement, lattice, mode, { name: 'Independent service inset', material: materials.inset }),
    box({ name: 'Rigid mounting foot', size: [.74, .085, .40], radius: .02, segments: 3, position: [0, -.245, 0], material: materials.frame }),
    cylinder({ name: 'Rigid pin left', radius: .023, height: .05, segments: 16, position: [-.24, -.245, .22], rotation: [90, 0, 0], material: materials.dark }),
    cylinder({ name: 'Rigid pin right', radius: .023, height: .05, segments: 16, position: [.24, -.245, .22], rotation: [90, 0, 0], material: materials.dark }),
  ], { position: [.48, .0, 0], rotation: [0, 8, 0] });
  root.userData.sharedDeformation = {
    subject: 'layered hard-surface service housing', mode,
    deformedParts: ['Independent housing shell', 'Independent upper rail', 'Independent service inset'],
    rigidParts: ['Rigid mounting foot', 'Rigid pin left', 'Rigid pin right'],
    intent: 'one assembly-local field keeps shell, rail and inset registered while preserving separate hard-surface ownership',
  };
  return root;
}

export default defineModel({
  id: 'geometry-assembly-deform-study',
  title: 'Workflow lab / shared assembly deformation field',
  description: 'Apply one broad deformation field to separately owned component meshes without merging their geometry, materials, or object transforms.',
  parameters: {
    organic: { type: 'boolean', default: true },
    mechanical: { type: 'boolean', default: true },
    mode: { type: 'select', options: ['baseline', 'shared'], default: 'shared' },
  },
  build(p) {
    const materials = {
      skin: material('#899570', { roughness: .65 }),
      crest: material('#c88555', { roughness: .50 }),
      collar: material('#667d78', { roughness: .55, metalness: .12 }),
      shell: material('#798991', { roughness: .38, metalness: .34 }),
      rail: material('#c7bfa9', { roughness: .34, metalness: .30 }),
      inset: material('#4f7580', { roughness: .42, metalness: .25 }),
      frame: material('#beb7a6', { roughness: .40, metalness: .24 }),
      dark: material('#22292d', { roughness: .48, metalness: .26 }),
    };
    const children = [];
    if (p.organic) children.push(organicExample(materials, p.mode));
    if (p.mechanical) children.push(mechanicalExample(materials, p.mode));
    if (!children.length) children.push(torus({ radius: .03, tube: .006, material: materials.frame }));
    const root = group('Shared assembly deformation workflow', children);
    root.userData.workflow = {
      sequence: 'separate component geometry + object placements -> one parent-local deformation field -> per-component local result -> unchanged object hierarchy -> render/export',
      coordinateSpace: 'field handles are parent/assembly-local meters; each component placement is meters + XYZ degrees + positive scale; selections stay component-local',
      ownership: 'component meshes, materials, names and object transforms remain separate; no geometry merge is required',
      mode: p.mode,
    };
    return root;
  },
});
