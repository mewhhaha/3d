import * as THREE from 'three';
import { defineModel, group, material, mesh, box, torus } from '../src/lib/modeling.js';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { assignFaceMaterials } from '../src/lib/material-regions.js';
import { projectFaceRegionUVs } from '../src/lib/uv-charts.js';
import { packUvCharts, inspectUvCharts } from '../src/lib/uv-atlas.js';
import { chartTexture } from '../src/lib/chart-textures.js';

function chartedGeometry(source, regions, charts) {
  source.clearGroups();
  const semantic = defineFaceRegions(source, regions, { clone: false });
  const grouped = assignFaceMaterials(
    semantic,
    Object.fromEntries(Object.keys(regions).map(region => [region, 1])),
    { defaultMaterial: 0 },
  );
  const projected = projectFaceRegionUVs(grouped, charts);
  const packed = packUvCharts(projected, { margin: .025, rotate: true, density: 'equalize' });
  semantic.dispose(); grouped.dispose(); projected.dispose();
  return packed;
}

function organicLayers(detailed) {
  const layers = [
    { chart: 'creature.facePatch', shape: 'fill', color: '#cfb49d' },
    { chart: 'creature.crownPatch', shape: 'fill', color: '#82977d' },
  ];
  if (detailed) layers.push(
    { chart: 'creature.facePatch', shape: 'ellipse', center: [.34, .57], radius: [.16, .23], rotation: -12, color: '#c85f56' },
    { chart: 'creature.facePatch', shape: 'ellipse', center: [.68, .49], radius: [.09, .14], rotation: 18, color: '#397d78' },
    { chart: 'creature.facePatch', shape: 'line', from: [.18, .25], to: [.82, .31], width: .055, color: '#57453e' },
    { chart: 'creature.crownPatch', shape: 'line', from: [.14, .72], to: [.86, .28], width: .11, color: '#d6a34e' },
    { chart: 'creature.crownPatch', shape: 'line', from: [.18, .90], to: [.55, .58], width: .045, color: '#395c54' },
  );
  return layers;
}

function mechanicalLayers(detailed) {
  const layers = [
    { chart: 'panel.service', shape: 'fill', color: '#d9ddda' },
    { chart: 'panel.header', shape: 'fill', color: '#38434a' },
  ];
  if (detailed) layers.push(
    { chart: 'panel.service', shape: 'rect', center: [.50, .52], size: [.70, .56], color: '#59656a' },
    { chart: 'panel.service', shape: 'rect', center: [.50, .52], size: [.50, .34], color: '#d9ddda' },
    { chart: 'panel.service', shape: 'line', from: [.28, .33], to: [.70, .71], width: .09, color: '#e0a33b' },
    { chart: 'panel.service', shape: 'line', from: [.34, .30], to: [.76, .68], width: .025, color: '#222a2d' },
    { chart: 'panel.header', shape: 'rect', center: [.30, .5], size: [.18, .38], color: '#d85f50' },
    { chart: 'panel.header', shape: 'line', from: [.48, .5], to: [.86, .5], width: .08, color: '#c7d0cc' },
  );
  return layers;
}

function organicExample(detailed) {
  const shell = new THREE.SphereGeometry(1, 44, 30);
  shell.scale(.38, .32, .30);
  shell.computeVertexNormals();
  const geometry = chartedGeometry(shell, {
    'creature.facePatch': ({ centroid, normal }) => centroid.z > .205 && centroid.y > -.13 && centroid.y < .15 && Math.abs(centroid.x) < .24 && normal.z > .5,
    'creature.crownPatch': ({ centroid, normal }) => centroid.z > .08 && centroid.y > .19 && centroid.x > -.18 && centroid.x < .11 && normal.y > .35,
  }, [
    { region: 'creature.facePatch', frame: { uAxis: [1, 0, 0], vAxis: [0, 1, 0] }, atlas: [.08, .08, .60, .46], padding: .035 },
    { region: 'creature.crownPatch', frame: { uAxis: [1, 0, 0], vAxis: [0, 0, -1] }, atlas: [.34, .22, .84, .68], padding: .035 },
  ]);
  const texture = chartTexture(geometry, {
    size: 256,
    background: '#ffffff',
    name: `Creature chart detail / ${detailed ? 'marked' : 'plain'}`,
    layers: organicLayers(detailed),
  });
  const materials = [
    material('#8c9485', { roughness: .66 }),
    material('#ffffff', { roughness: .50, map: texture }),
    material('#252b2e', { roughness: .45, metalness: .12 }),
  ];
  const form = mesh(geometry, { name: 'Creature shell', material: materials });
  const report = inspectUvCharts(geometry);
  form.userData.surfaceDetail = { subject: 'organic marking', detailed, chartCount: report.chartCount, overlapPairCount: report.overlapPairCount, texture: texture.userData.chartTexture };
  const root = group(`Creature semantic surface detail / ${detailed ? 'detailed' : 'plain'}`, [
    form,
    torus({ name: 'Scale datum', radius: .075, tube: .007, segments: 30, position: [0, -.405, 0], rotation: [90, 0, 0], material: materials[2] }),
  ], { position: [-.48, .01, 0], rotation: [0, -8, 0] });
  root.userData.subject = 'curved creature shell with chart-local asymmetric markings';
  return root;
}

function mechanicalExample(detailed) {
  const housing = new THREE.BoxGeometry(.70, .44, .27, 14, 10, 4);
  housing.computeVertexNormals();
  const geometry = chartedGeometry(housing, {
    'panel.service': ({ centroid, normal }) => normal.z > .9 && Math.abs(centroid.x) < .255 && centroid.y > -.145 && centroid.y < .07,
    'panel.header': ({ centroid, normal }) => normal.z > .9 && Math.abs(centroid.x) < .22 && centroid.y > .09 && centroid.y < .19,
  }, [
    { region: 'panel.service', frame: { uAxis: [1, 0, 0], vAxis: [0, 1, 0] }, atlas: [.10, .10, .66, .48], padding: .04 },
    { region: 'panel.header', frame: { uAxis: [0, 1, 0], vAxis: [-1, 0, 0] }, atlas: [.42, .20, .92, .52], padding: .04 },
  ]);
  const texture = chartTexture(geometry, {
    size: 256,
    background: '#ffffff',
    name: `Mechanical chart detail / ${detailed ? 'marked' : 'plain'}`,
    layers: mechanicalLayers(detailed),
  });
  const materials = [
    material('#79868c', { roughness: .42, metalness: .25 }),
    material('#ffffff', { roughness: .38, metalness: .16, map: texture }),
    material('#292f33', { roughness: .43, metalness: .28 }),
  ];
  const form = mesh(geometry, { name: 'Mechanical service housing', material: materials });
  const report = inspectUvCharts(geometry);
  form.userData.surfaceDetail = { subject: 'hard-surface label and trim', detailed, chartCount: report.chartCount, overlapPairCount: report.overlapPairCount, texture: texture.userData.chartTexture };
  const root = group(`Mechanical semantic surface detail / ${detailed ? 'detailed' : 'plain'}`, [
    form,
    box({ name: 'Rigid mounting foot', size: [.78, .07, .33], radius: .018, segments: 3, position: [0, -.255, 0], material: materials[2] }),
  ], { position: [.48, 0, 0], rotation: [0, 10, 0] });
  root.userData.subject = 'hard-surface panel with chart-local warning graphic and header trim';
  return root;
}

export default defineModel({
  id: 'surface-detail-study',
  title: 'Workflow lab / semantic chart surface detail',
  description: 'Rasterize simple procedural markings, labels and trim in semantic chart-local coordinates after atlas packing without changing geometry.',
  parameters: {
    organic: { type: 'boolean', default: true },
    mechanical: { type: 'boolean', default: true },
    mode: { type: 'select', options: ['plain', 'detailed'], default: 'detailed' },
  },
  build(p) {
    const detailed = p.mode === 'detailed';
    const children = [];
    if (p.organic) children.push(organicExample(detailed));
    if (p.mechanical) children.push(mechanicalExample(detailed));
    if (!children.length) children.push(torus({ radius: .03, tube: .006, material: material('#30373b') }));
    const root = group('Semantic chart surface-detail workflow', children);
    root.userData.workflow = {
      sequence: 'named face regions -> chart projection -> atlas packing -> chart-local procedural detail -> standard PBR material -> GLB export',
      coordinates: 'detail primitives use stable 0..1 chart-local coordinates; atlas translation/scale/cardinal rotation remain separate',
      ownership: 'texture generation does not mutate geometry, face regions, material groups, anchors, or chart placement',
      mode: p.mode,
    };
    return root;
  },
});
