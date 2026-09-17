import * as THREE from 'three';
import { defineModel, group, material, mesh, box, cylinder, torus, sphere } from '../src/lib/modeling.js';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { faceRegionSelection } from '../src/lib/geometry-sculpt.js';
import {
  deformationHandle, bendVertices, twistVertices, taperVertices, deformGeometry,
} from '../src/lib/geometry-deform.js';

function organicGeometry(mode) {
  let geometry = new THREE.CylinderGeometry(.115, .145, .96, 28, 36, false);
  geometry.computeVertexNormals();
  if (mode === 'baseline') return geometry;
  const all = new Float32Array(geometry.getAttribute('position').count).fill(1);
  const handle = deformationHandle({ origin: [0, 0, 0], range: [-.44, .44] });
  const edited = deformGeometry(
    geometry,
    taperVertices(all, { handle, factor: -.44 }),
    bendVertices(all, { handle, angle: 76 }),
    twistVertices(all, { handle, angle: 38 }),
  );
  geometry.dispose();
  return edited;
}

function organicExample(materials, mode) {
  const root = group(`Creature tendril / ${mode}`, [], { position: [-.43, -.02, 0], rotation: [1, -7, -2] });
  root.add(mesh(organicGeometry(mode), { name: 'Editable tendril', material: materials.organic }));
  root.add(
    sphere({ name: 'Tendril root bulb', radius: .17, segments: 20, scale: [1.1, .72, 1], position: [0, -.48, 0], material: materials.organicDark }),
    torus({ name: 'Root datum', radius: .155, tube: .005, segments: 64, rotation: [90, 0, 0], position: [0, -.425, 0], material: materials.gauge }),
  );
  root.userData.geometryDeformStudy = {
    subject: 'organic creature tendril', mode,
    intent: 'change a straight primary form into a tapered, bent and twisted silhouette from one reusable axial handle',
  };
  return root;
}

function mechanicalGeometry(mode) {
  let geometry = new THREE.BoxGeometry(.25, .90, .15, 4, 30, 3);
  geometry.computeVertexNormals();
  defineFaceRegions(geometry, {
    'bracket.flex': ({ centroid }) => centroid.y > -.39,
  }, { clone: false });
  if (mode === 'baseline') return geometry;
  const selection = faceRegionSelection(geometry, 'bracket.flex');
  const handle = deformationHandle({ origin: [0, -.03, 0], rotation: [0, 0, -7], range: [-.36, .39] });
  const edited = deformGeometry(
    geometry,
    bendVertices(selection, { handle, angle: -58 }),
    twistVertices(selection, { handle, angle: -32 }),
    taperVertices(selection, { handle, factor: -.16 }),
  );
  geometry.dispose();
  return edited;
}

function mechanicalExample(materials, mode) {
  const root = group(`Service bracket / ${mode}`, [], { position: [.43, -.04, 0], rotation: [0, 8, 2] });
  root.add(mesh(mechanicalGeometry(mode), { name: 'Editable service bracket', material: materials.panel }));
  root.add(
    box({ name: 'Bracket foot', size: [.34, .10, .24], radius: .025, segments: 3, position: [0, -.50, 0], material: materials.frame }),
    cylinder({ name: 'Foot fastener left', radius: .020, height: .018, segments: 14, rotation: [90, 0, 0], position: [-.105, -.50, .126], material: materials.dark }),
    cylinder({ name: 'Foot fastener right', radius: .020, height: .018, segments: 14, rotation: [90, 0, 0], position: [.105, -.50, .126], material: materials.dark }),
    torus({ name: 'Flex start datum', radius: .135, tube: .004, segments: 56, rotation: [90, 0, 0], position: [0, -.36, 0], material: materials.gauge }),
  );
  root.userData.geometryDeformStudy = {
    subject: 'hard-surface service bracket', mode,
    intent: 'bend and twist one semantic flex region while retaining an independently authored mounting foot',
  };
  return root;
}

export default defineModel({
  id: 'geometry-deform-study',
  title: 'Workflow lab / local deformation handles',
  description: 'Reuse one geometry-local axial handle to bend, twist and taper ordinary indexed BufferGeometry without topology changes.',
  parameters: {
    organic: { type: 'boolean', default: true },
    mechanical: { type: 'boolean', default: true },
    mode: { type: 'select', options: ['baseline', 'deformed'], default: 'deformed' },
  },
  build(p) {
    const materials = {
      organic: material('#8a9b72', { roughness: .66 }),
      organicDark: material('#526047', { roughness: .72 }),
      panel: material('#6f7d86', { roughness: .40, metalness: .28 }),
      frame: material('#c5c0ad', { roughness: .38, metalness: .32 }),
      dark: material('#22292c', { roughness: .46, metalness: .28 }),
      gauge: material('#d7a748', { roughness: .28, emissive: '#3d2a08', emissiveIntensity: .18 }),
    };
    const children = [];
    if (p.organic) children.push(organicExample(materials, p.mode));
    if (p.mechanical) children.push(mechanicalExample(materials, p.mode));
    if (!children.length) children.push(sphere({ radius: .02, material: materials.frame }));
    const root = group('Local deformation handle workflow', children);
    root.userData.workflow = {
      sequence: 'indexed mesh -> reusable local +Y handle -> independent selection -> bend/twist/taper -> render/export',
      coordinateSpace: 'geometry-local meters; handle rotations use XYZ degrees',
      purpose: 'broad primary-form edits without chains of hand-authored vertex pulls',
      mode: p.mode,
    };
    return root;
  },
});
