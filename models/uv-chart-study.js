import * as THREE from 'three';
import { defineModel, group, material, mesh, box, torus } from '../src/lib/modeling.js';
import { checkerTexture } from '../src/lib/textures.js';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { assignFaceMaterials } from '../src/lib/material-regions.js';
import { projectFaceRegionUVs } from '../src/lib/uv-charts.js';

function chartedMesh(source, definitions, assignments, charts, materials, mode, options) {
  source.clearGroups();
  const semantic = defineFaceRegions(source, definitions, { clone: false });
  const grouped = assignFaceMaterials(semantic, assignments, { defaultMaterial: 0 });
  const geometry = mode === 'charted' ? projectFaceRegionUVs(grouped, charts) : grouped;
  if (geometry !== grouped) grouped.dispose();
  semantic.dispose();
  return mesh(geometry, { ...options, material: materials });
}

function organicExample(materials, mode) {
  const shell = new THREE.SphereGeometry(1, 40, 28);
  shell.scale(.37, .32, .30);
  shell.computeVertexNormals();
  const form = chartedMesh(shell, {
    'creature.facePatch': ({ centroid, normal }) => centroid.z > .205 && centroid.y > -.14 && centroid.y < .17 && Math.abs(centroid.x) < .255 && normal.z > .5,
  }, {
    'creature.facePatch': 1,
  }, [{
    region: 'creature.facePatch',
    frame: { origin: [0, 0, 0], uAxis: [1, 0, 0], vAxis: [0, 1, 0] },
    atlas: [.06, .06, .94, .94], padding: .035,
  }], materials, mode, { name: 'Creature face UV chart' });
  const root = group(`Creature face chart / ${mode}`, [
    form,
    torus({ name: 'Scale datum', radius: .075, tube: .007, segments: 30, position: [0, -.405, 0], rotation: [90, 0, 0], material: materials[2] }),
  ], { position: [-.48, .01, 0], rotation: [0, -8, 0] });
  root.userData.uvChartStudy = {
    subject: 'curved organic creature shell',
    region: 'creature.facePatch',
    projection: 'explicit geometry-local planar X/Y chart',
  };
  return root;
}

function mechanicalExample(materials, mode) {
  const housing = new THREE.BoxGeometry(.70, .44, .27, 14, 10, 4);
  housing.computeVertexNormals();
  const form = chartedMesh(housing, {
    'panel.service': ({ centroid, normal }) => normal.z > .9 && Math.abs(centroid.x) < .255 && centroid.y > -.145 && centroid.y < .11,
  }, {
    'panel.service': 1,
  }, [{
    region: 'panel.service',
    frame: { origin: [0, 0, 0], uAxis: [0, 1, 0], vAxis: [-1, 0, 0] },
    atlas: [.08, .08, .92, .92], padding: .04,
  }], materials, mode, { name: 'Service panel UV chart' });
  const root = group(`Service panel chart / ${mode}`, [
    form,
    box({ name: 'Rigid mounting foot', size: [.78, .07, .33], radius: .018, segments: 3, position: [0, -.255, 0], material: materials[2] }),
  ], { position: [.48, .0, 0], rotation: [0, 10, 0] });
  root.userData.uvChartStudy = {
    subject: 'hard-surface service housing',
    region: 'panel.service',
    projection: 'explicit rotated geometry-local planar chart',
  };
  return root;
}

export default defineModel({
  id: 'uv-chart-study',
  title: 'Workflow lab / semantic UV charts',
  description: 'Project named face regions into controlled UV charts with deterministic seam vertex splitting and provenance.',
  parameters: {
    organic: { type: 'boolean', default: true },
    mechanical: { type: 'boolean', default: true },
    mode: { type: 'select', options: ['baseline', 'charted'], default: 'charted' },
  },
  build(p) {
    const organicChecker = checkerTexture(256, 14);
    const mechanicalChecker = checkerTexture(256, 10);
    const organicMaterials = [
      material('#8d927f', { roughness: .62 }),
      material('#ffffff', { roughness: .47, map: organicChecker }),
      material('#262c2e', { roughness: .45, metalness: .16 }),
    ];
    const mechanicalMaterials = [
      material('#7e8990', { roughness: .40, metalness: .24 }),
      material('#ffffff', { roughness: .38, metalness: .18, map: mechanicalChecker }),
      material('#292f33', { roughness: .43, metalness: .28 }),
    ];
    const children = [];
    if (p.organic) children.push(organicExample(organicMaterials, p.mode));
    if (p.mechanical) children.push(mechanicalExample(mechanicalMaterials, p.mode));
    if (!children.length) children.push(torus({ radius: .03, tube: .006, material: organicMaterials[2] }));
    const root = group('Semantic UV chart workflow', children);
    root.userData.workflow = {
      sequence: 'indexed geometry -> named face region -> material slot -> explicit planar chart -> seam split provenance -> render/export',
      topology: p.mode === 'charted' ? 'face order and 3D corners preserved; only UV-discontinuous vertices may duplicate' : 'source indexed UV topology',
      ownership: 'face semantics remain face-domain metadata; UV charts are derived topology with explicit source provenance',
      mode: p.mode,
    };
    return root;
  },
});
