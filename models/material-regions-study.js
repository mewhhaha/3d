import * as THREE from 'three';
import { defineModel, group, material, mesh, box, torus } from '../src/lib/modeling.js';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { assignFaceMaterials } from '../src/lib/material-regions.js';

function regionMesh(source, definitions, assignments, materials, mode, options) {
  source.clearGroups();
  const semantic = defineFaceRegions(source, definitions, { clone: false });
  const geometry = mode === 'assigned'
    ? assignFaceMaterials(semantic, assignments, { defaultMaterial: 0 })
    : semantic;
  if (geometry !== semantic) semantic.dispose();
  return mesh(geometry, { ...options, material: mode === 'assigned' ? materials : materials[0] });
}

function organicExample(materials, mode) {
  const shell = new THREE.SphereGeometry(1, 38, 26);
  shell.scale(.36, .31, .30);
  shell.computeVertexNormals();
  const form = regionMesh(shell, {
    'creature.crown': ({ centroid }) => centroid.y > .15,
    'creature.muzzle': ({ centroid }) => centroid.y > -.105 && centroid.y < .075 && centroid.z > .245 && Math.abs(centroid.x) < .22,
  }, {
    'creature.crown': 1,
    'creature.muzzle': 2,
  }, materials, mode, { name: 'Creature semantic material shell' });
  const root = group(`Creature semantic regions / ${mode}`, [
    form,
    torus({ name: 'Scale datum', radius: .08, tube: .008, segments: 32, position: [0, -.39, 0], rotation: [90, 0, 0], material: materials[3] }),
  ], { position: [-.47, .02, 0], rotation: [0, -8, 0] });
  root.userData.materialRegionStudy = {
    subject: 'stylized organic creature shell',
    semanticRegions: ['creature.crown', 'creature.muzzle'],
    intent: 'reuse authored face semantics as hard material boundaries without changing indexed topology',
  };
  return root;
}

function mechanicalExample(materials, mode) {
  const panel = new THREE.BoxGeometry(.68, .42, .28, 12, 10, 4);
  panel.computeVertexNormals();
  const form = regionMesh(panel, {
    'panel.service': ({ centroid, normal }) => normal.z > .9 && Math.abs(centroid.x) < .23 && centroid.y > -.12 && centroid.y < .085,
    'panel.header': ({ centroid, normal }) => normal.z > .9 && Math.abs(centroid.x) < .27 && centroid.y > .125,
  }, {
    'panel.service': 1,
    'panel.header': 2,
  }, materials, mode, { name: 'Service panel semantic materials' });
  const root = group(`Service panel semantic regions / ${mode}`, [
    form,
    box({ name: 'Rigid mounting foot', size: [.76, .07, .34], radius: .018, segments: 3, position: [0, -.245, 0], material: materials[3] }),
  ], { position: [.47, .0, 0], rotation: [0, 9, 0] });
  root.userData.materialRegionStudy = {
    subject: 'hard-surface service panel',
    semanticRegions: ['panel.service', 'panel.header'],
    intent: 'one semantic face definition drives reusable material slots instead of hand-authored draw ranges',
  };
  return root;
}

export default defineModel({
  id: 'material-regions-study',
  title: 'Workflow lab / semantic material regions',
  description: 'Map named face regions onto Three.js material slots while preserving indexed topology and authoring semantics.',
  parameters: {
    organic: { type: 'boolean', default: true },
    mechanical: { type: 'boolean', default: true },
    mode: { type: 'select', options: ['baseline', 'assigned'], default: 'assigned' },
  },
  build(p) {
    const organicMaterials = [
      material('#8c907b', { roughness: .64 }),
      material('#c47d55', { roughness: .48 }),
      material('#658a87', { roughness: .52 }),
      material('#252b2d', { roughness: .48, metalness: .18 }),
    ];
    const mechanicalMaterials = [
      material('#7c8990', { roughness: .40, metalness: .25 }),
      material('#4d7781', { roughness: .38, metalness: .24 }),
      material('#c6b58d', { roughness: .36, metalness: .28 }),
      material('#272e31', { roughness: .45, metalness: .30 }),
    ];
    const children = [];
    if (p.organic) children.push(organicExample(organicMaterials, p.mode));
    if (p.mechanical) children.push(mechanicalExample(mechanicalMaterials, p.mode));
    if (!children.length) children.push(torus({ radius: .03, tube: .006, material: organicMaterials[3] }));
    const root = group('Semantic material region workflow', children);
    root.userData.workflow = {
      sequence: 'indexed geometry -> named semantic face regions -> material slot assignment -> ordinary multi-material mesh -> render/export',
      topology: 'face order, indices, positions, UVs, named regions, and topology-valid anchors remain unchanged',
      ownership: 'material slot arrays stay on the Mesh; semantic face metadata stays on BufferGeometry',
      mode: p.mode,
    };
    return root;
  },
});
