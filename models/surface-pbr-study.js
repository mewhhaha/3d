import * as THREE from 'three';
import { defineModel, group, material, mesh, box, torus } from '../src/lib/modeling.js';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { assignFaceMaterials } from '../src/lib/material-regions.js';
import { projectFaceRegionUVs } from '../src/lib/uv-charts.js';
import { packUvCharts } from '../src/lib/uv-atlas.js';
import { chartTexture } from '../src/lib/chart-textures.js';
import { chartScalarTexture, packMetallicRoughness } from '../src/lib/chart-pbr.js';

function chartedGeometry(source, region, predicate, chart) {
  source.clearGroups();
  const semantic = defineFaceRegions(source, { [region]: predicate }, { clone: false });
  const grouped = assignFaceMaterials(semantic, { [region]: 1 }, { defaultMaterial: 0 });
  const projected = projectFaceRegionUVs(grouped, [{ region, ...chart }]);
  const packed = packUvCharts(projected, { margin: .03, rotate: true, density: 'preserve' });
  semantic.dispose(); grouped.dispose(); projected.dispose();
  return packed;
}

function organicExample(mode) {
  const source = new THREE.SphereGeometry(1, 48, 32);
  source.scale(.39, .34, .31); source.computeVertexNormals();
  const geometry = chartedGeometry(
    source,
    'creature.cheek',
    ({ centroid, normal }) => centroid.z > .20 && centroid.y > -.16 && centroid.y < .13 && centroid.x > -.25 && centroid.x < .15 && normal.z > .52,
    { frame: { uAxis: [1, 0, 0], vAxis: [0, 1, 0] }, atlas: [.12, .12, .72, .66], padding: .04 },
  );
  const baseColor = chartTexture(geometry, {
    size: 256,
    background: '#ffffff',
    name: 'Creature cheek color',
    layers: [
      { chart: 'creature.cheek', shape: 'fill', color: '#c8a287' },
      { chart: 'creature.cheek', shape: 'ellipse', center: [.46, .50], radius: [.26, .20], rotation: -18, color: '#b95e56' },
      { chart: 'creature.cheek', shape: 'line', from: [.18, .30], to: [.76, .66], width: .045, color: '#6f4d48', opacity: .7 },
    ],
  });
  let orm = null;
  if (mode === 'pbr') {
    const rough = chartScalarTexture(geometry, {
      size: 256,
      background: .78,
      name: 'Creature cheek roughness',
      layers: [
        { chart: 'creature.cheek', shape: 'fill', value: .68 },
        { chart: 'creature.cheek', shape: 'ellipse', center: [.46, .50], radius: [.26, .20], rotation: -18, value: .30 },
        { chart: 'creature.cheek', shape: 'line', from: [.18, .30], to: [.76, .66], width: .045, value: .46 },
      ],
    });
    const metal = chartScalarTexture(geometry, {
      size: 256,
      background: 0,
      name: 'Creature cheek metalness',
      layers: [{ chart: 'creature.cheek', shape: 'fill', value: 0 }],
    });
    orm = packMetallicRoughness(rough, metal, { name: 'Creature cheek metallic-roughness' });
    rough.dispose(); metal.dispose();
  }
  const materials = [
    material('#7f8d7d', { roughness: .72 }),
    material('#ffffff', {
      map: baseColor,
      roughness: mode === 'pbr' ? 1 : .68,
      metalness: 0,
      roughnessMap: orm,
      metalnessMap: orm,
    }),
    material('#2c3132', { roughness: .38, metalness: .18 }),
  ];
  const form = mesh(geometry, { name: 'Creature cheek material study', material: materials });
  form.userData.pbrDetail = {
    subject: 'organic glossy marking over matte skin-like shell',
    mode,
    map: baseColor.userData.chartTexture,
    packed: orm?.userData.chartPbr ?? null,
  };
  const root = group(`Organic semantic PBR / ${mode}`, [
    form,
    torus({ name: 'Organic scale datum', radius: .075, tube: .007, segments: 30, position: [0, -.425, 0], rotation: [90, 0, 0], material: materials[2] }),
  ], { position: [-.48, .015, 0], rotation: [0, -7, 0] });
  root.userData.subject = 'curved creature shell with chart-local base-color and roughness fields';
  return root;
}

function mechanicalExample(mode) {
  const source = new THREE.BoxGeometry(.72, .46, .28, 16, 10, 4);
  source.computeVertexNormals();
  const geometry = chartedGeometry(
    source,
    'panel.service',
    ({ centroid, normal }) => normal.z > .9 && Math.abs(centroid.x) < .26 && centroid.y > -.15 && centroid.y < .14,
    { frame: { uAxis: [0, 1, 0], vAxis: [-1, 0, 0] }, atlas: [.16, .16, .78, .72], padding: .04 },
  );
  const baseColor = chartTexture(geometry, {
    size: 256,
    background: '#ffffff',
    name: 'Service panel color',
    layers: [
      { chart: 'panel.service', shape: 'fill', color: '#c4c9c7' },
      { chart: 'panel.service', shape: 'rect', center: [.50, .52], size: [.72, .58], color: '#4f5b60' },
      { chart: 'panel.service', shape: 'rect', center: [.50, .52], size: [.50, .36], color: '#cfd3cf' },
      { chart: 'panel.service', shape: 'line', from: [.26, .30], to: [.74, .72], width: .07, color: '#d79b36' },
    ],
  });
  let orm = null;
  if (mode === 'pbr') {
    const rough = chartScalarTexture(geometry, {
      size: 256,
      background: .58,
      name: 'Service panel roughness',
      layers: [
        { chart: 'panel.service', shape: 'fill', value: .56 },
        { chart: 'panel.service', shape: 'rect', center: [.50, .52], size: [.72, .58], value: .22 },
        { chart: 'panel.service', shape: 'rect', center: [.50, .52], size: [.50, .36], value: .38 },
        { chart: 'panel.service', shape: 'line', from: [.26, .30], to: [.74, .72], width: .07, value: .78 },
      ],
    });
    const metal = chartScalarTexture(geometry, {
      size: 256,
      background: .18,
      name: 'Service panel metalness',
      layers: [
        { chart: 'panel.service', shape: 'fill', value: .16 },
        { chart: 'panel.service', shape: 'rect', center: [.50, .52], size: [.72, .58], value: .92 },
        { chart: 'panel.service', shape: 'rect', center: [.50, .52], size: [.50, .36], value: .12 },
        { chart: 'panel.service', shape: 'line', from: [.26, .30], to: [.74, .72], width: .07, value: .04 },
      ],
    });
    orm = packMetallicRoughness(rough, metal, { name: 'Service panel metallic-roughness' });
    rough.dispose(); metal.dispose();
  }
  const materials = [
    material('#707b80', { roughness: .44, metalness: .34 }),
    material('#ffffff', {
      map: baseColor,
      roughness: mode === 'pbr' ? 1 : .48,
      metalness: mode === 'pbr' ? 1 : .26,
      roughnessMap: orm,
      metalnessMap: orm,
    }),
    material('#242b2e', { roughness: .40, metalness: .36 }),
  ];
  const form = mesh(geometry, { name: 'Mechanical panel material study', material: materials });
  form.userData.pbrDetail = {
    subject: 'painted service panel with exposed polished metal and matte warning stripe',
    mode,
    map: baseColor.userData.chartTexture,
    packed: orm?.userData.chartPbr ?? null,
  };
  const root = group(`Mechanical semantic PBR / ${mode}`, [
    form,
    box({ name: 'Rigid mounting foot', size: [.80, .075, .34], radius: .018, segments: 3, position: [0, -.267, 0], material: materials[2] }),
  ], { position: [.48, 0, 0], rotation: [0, 11, 0] });
  root.userData.subject = 'hard-surface service housing with chart-local metallic and roughness fields';
  return root;
}

export default defineModel({
  id: 'surface-pbr-study',
  title: 'Workflow lab / semantic chart PBR detail',
  description: 'Author chart-local scalar fields and pack them into standard glTF/Three metallic-roughness textures without coupling material response to geometry edits.',
  parameters: {
    organic: { type: 'boolean', default: true },
    mechanical: { type: 'boolean', default: true },
    mode: { type: 'select', options: ['plain', 'pbr'], default: 'pbr' },
  },
  build(p) {
    const children = [];
    if (p.organic) children.push(organicExample(p.mode));
    if (p.mechanical) children.push(mechanicalExample(p.mode));
    if (!children.length) children.push(torus({ radius: .03, tube: .006, material: material('#30373b') }));
    const root = group('Semantic chart PBR workflow', children);
    root.userData.workflow = {
      sequence: 'named face region -> UV chart -> chart-local color/scalar fields -> packed metallic-roughness -> standard PBR material -> GLB',
      coordinates: 'all authored marks stay in chart-local 0..1 space; atlas packing remains separate',
      ownership: 'scalar maps and packed PBR texture are independent assets; material binding stays explicit',
      mode: p.mode,
    };
    return root;
  },
});
