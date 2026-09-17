import * as THREE from 'three';
import { defineModel, group, material, mesh, box, torus } from '../src/lib/modeling.js';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { assignFaceMaterials } from '../src/lib/material-regions.js';
import { projectFaceRegionUVs } from '../src/lib/uv-charts.js';
import { inspectUvCharts, packUvCharts } from '../src/lib/uv-atlas.js';

function atlasTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const colors = [
    [206, 92, 76], [82, 151, 126], [82, 118, 181], [210, 165, 74],
  ];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const q = (x >= size / 2 ? 1 : 0) + (y >= size / 2 ? 2 : 0);
    const grid = x % 32 < 2 || y % 32 < 2 || Math.abs(x - y) < 2;
    const [r, g, b] = colors[q];
    const i = (y * size + x) * 4;
    data.set(grid ? [35, 38, 42, 255] : [r, g, b, 255], i);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.name = 'UV atlas diagnostic';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

function chartedFixture(source, definitions, charts, materials, mode, name) {
  source.clearGroups();
  const semantic = defineFaceRegions(source, definitions, { clone: false });
  const assignments = Object.fromEntries(Object.keys(definitions).map(region => [region, 1]));
  const grouped = assignFaceMaterials(semantic, assignments, { defaultMaterial: 0 });
  const projected = projectFaceRegionUVs(grouped, charts);
  const before = inspectUvCharts(projected);
  const geometry = mode === 'packed'
    ? packUvCharts(projected, { margin: .025, rotate: true, density: 'equalize' })
    : projected;
  const after = inspectUvCharts(geometry);
  if (geometry !== projected) projected.dispose();
  grouped.dispose();
  semantic.dispose();
  const object = mesh(geometry, { name, material: materials });
  object.userData.uvAtlas = {
    mode,
    before: {
      overlapPairCount: before.overlapPairCount,
      atlasArea: before.atlasArea,
      charts: before.charts.map(chart => ({ texelDensity: chart.texelDensity, maxAngleErrorDeg: chart.maxAngleErrorDeg, maxAreaStretchRatio: chart.maxAreaStretchRatio })),
    },
    after: {
      overlapPairCount: after.overlapPairCount,
      atlasArea: after.atlasArea,
      charts: after.charts.map(chart => ({ atlas: chart.atlas, texelDensity: chart.texelDensity, maxAngleErrorDeg: chart.maxAngleErrorDeg, maxAreaStretchRatio: chart.maxAreaStretchRatio })),
    },
    pack: geometry.userData.uvCharts.pack ?? null,
  };
  return object;
}

function organicExample(materials, mode) {
  const shell = new THREE.SphereGeometry(1, 44, 30);
  shell.scale(.38, .32, .30);
  shell.computeVertexNormals();
  const form = chartedFixture(shell, {
    'creature.facePatch': ({ centroid, normal }) => centroid.z > .205 && centroid.y > -.13 && centroid.y < .15 && Math.abs(centroid.x) < .24 && normal.z > .5,
    'creature.crownPatch': ({ centroid, normal }) => centroid.z > .08 && centroid.y > .19 && centroid.x > -.18 && centroid.x < .11 && normal.y > .35,
  }, [
    { region: 'creature.facePatch', frame: { uAxis: [1, 0, 0], vAxis: [0, 1, 0] }, atlas: [.08, .08, .60, .46], padding: .035 },
    { region: 'creature.crownPatch', frame: { uAxis: [1, 0, 0], vAxis: [0, 0, -1] }, atlas: [.34, .22, .84, .68], padding: .035 },
  ], materials, mode, 'Creature semantic atlas');
  const root = group(`Creature UV atlas / ${mode}`, [
    form,
    torus({ name: 'Scale datum', radius: .075, tube: .007, segments: 30, position: [0, -.405, 0], rotation: [90, 0, 0], material: materials[2] }),
  ], { position: [-.48, .01, 0], rotation: [0, -8, 0] });
  root.userData.subject = 'curved organic creature shell with face and crown charts';
  return root;
}

function mechanicalExample(materials, mode) {
  const housing = new THREE.BoxGeometry(.70, .44, .27, 14, 10, 4);
  housing.computeVertexNormals();
  const form = chartedFixture(housing, {
    'panel.service': ({ centroid, normal }) => normal.z > .9 && Math.abs(centroid.x) < .255 && centroid.y > -.145 && centroid.y < .07,
    'panel.header': ({ centroid, normal }) => normal.z > .9 && Math.abs(centroid.x) < .22 && centroid.y > .09 && centroid.y < .19,
  }, [
    { region: 'panel.service', frame: { uAxis: [1, 0, 0], vAxis: [0, 1, 0] }, atlas: [.10, .10, .66, .48], padding: .04 },
    { region: 'panel.header', frame: { uAxis: [0, 1, 0], vAxis: [-1, 0, 0] }, atlas: [.42, .20, .92, .52], padding: .04 },
  ], materials, mode, 'Mechanical semantic atlas');
  const root = group(`Mechanical UV atlas / ${mode}`, [
    form,
    box({ name: 'Rigid mounting foot', size: [.78, .07, .33], radius: .018, segments: 3, position: [0, -.255, 0], material: materials[2] }),
  ], { position: [.48, 0, 0], rotation: [0, 10, 0] });
  root.userData.subject = 'hard-surface housing with service and header charts';
  return root;
}

export default defineModel({
  id: 'uv-atlas-study',
  title: 'Workflow lab / semantic UV atlas packing',
  description: 'Inspect semantic UV charts for distortion and overlap, then deterministically pack their authored rectangles without changing geometry.',
  parameters: {
    organic: { type: 'boolean', default: true },
    mechanical: { type: 'boolean', default: true },
    mode: { type: 'select', options: ['unpacked', 'packed'], default: 'packed' },
  },
  build(p) {
    const atlas = atlasTexture();
    const organicMaterials = [
      material('#8d927f', { roughness: .62 }),
      material('#ffffff', { roughness: .48, map: atlas }),
      material('#252b2e', { roughness: .45, metalness: .14 }),
    ];
    const mechanicalMaterials = [
      material('#7e8990', { roughness: .40, metalness: .24 }),
      material('#ffffff', { roughness: .38, metalness: .18, map: atlas.clone() }),
      material('#292f33', { roughness: .43, metalness: .28 }),
    ];
    const children = [];
    if (p.organic) children.push(organicExample(organicMaterials, p.mode));
    if (p.mechanical) children.push(mechanicalExample(mechanicalMaterials, p.mode));
    if (!children.length) children.push(torus({ radius: .03, tube: .006, material: organicMaterials[2] }));
    const root = group('Semantic UV atlas workflow', children);
    root.userData.workflow = {
      sequence: 'named face regions -> explicit chart projection -> chart inspection -> optional equal-density normalization -> deterministic rectangle packing -> render/export',
      placement: 'packing translates, uniformly scales and optionally rotates complete authored islands; chart-internal distortion is unchanged',
      topology: 'same chart-split indexed topology before and after packing',
      mode: p.mode,
    };
    return root;
  },
});
