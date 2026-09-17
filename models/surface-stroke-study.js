import * as THREE from 'three';
import { defineModel, group, material, mesh, sphere, box } from '../src/lib/modeling.js';
import { composeGeometries } from '../src/lib/geometry-composition.js';
import {
  pathSelection,
  faceRegionSelection, intersectSelections,
  pullVertices, inflateVertices, smoothVertices, sculptGeometry,
} from '../src/lib/geometry-sculpt.js';
import { projectSurfacePath, surfacePathSelection } from '../src/lib/surface-stroke.js';

const ORGANIC_STROKE = Object.freeze([
  Object.freeze([-.16, .09, .255]),
  Object.freeze([-.08, .145, .285]),
  Object.freeze([.015, .16, .30]),
  Object.freeze([.11, .125, .275]),
  Object.freeze([.17, .065, .245]),
]);

const PANEL_STROKE = Object.freeze([
  Object.freeze([-.19, -.08, .012]),
  Object.freeze([-.08, -.08, .012]),
  Object.freeze([-.08, .065, .012]),
  Object.freeze([.14, .065, .012]),
]);

function organicGeometry(mode) {
  let geometry = new THREE.SphereGeometry(.27, 44, 30);
  geometry.scale(.92, 1.08, .86);
  geometry.computeVertexNormals();
  if (mode === 'baseline') return geometry;
  const selection = mode === 'surface'
    ? surfacePathSelection(
      geometry,
      projectSurfacePath(geometry, { points: ORGANIC_STROKE, sampleSpacing: .025, maxDistance: .14 }),
      { radius: .065, falloff: 'smooth' },
    )
    : pathSelection({ points: ORGANIC_STROKE, radius: .065, falloff: 'smooth' });
  const result = sculptGeometry(geometry,
    inflateVertices(selection, .045),
    smoothVertices(selection, { strength: .10, iterations: 1, preserveBoundary: true }),
  );
  geometry.dispose();
  return result;
}

function organicExample(materials, mode) {
  const root = group(`Organic curved-surface stroke / ${mode}`, [], { position: [-.43, .01, 0], rotation: [-2, -9, 0] });
  root.add(mesh(organicGeometry(mode), { name: 'Creature brow shell', material: materials.organic }));
  root.add(
    sphere({ name: 'Left eye', radius: .022, segments: 14, position: [-.074, .018, .226], material: materials.eye }),
    sphere({ name: 'Right eye', radius: .022, segments: 14, position: [.074, .018, .226], material: materials.eye }),
  );
  root.userData.surfaceStrokeStudy = {
    subject: 'organic curved creature brow', mode,
    intent: 'one authored off-surface path is projected before edge-geodesic selection',
  };
  return root;
}

function layeredPanelGeometry(mode) {
  const front = new THREE.PlaneGeometry(.48, .38, 34, 28);
  front.computeVertexNormals();
  const back = new THREE.PlaneGeometry(.52, .42, 34, 28);
  back.computeVertexNormals();
  let geometry = composeGeometries([
    { name: 'front', geometry: front, position: [0, 0, 0] },
    { name: 'back', geometry: back, position: [0, 0, -.038], materialOffset: 1 },
  ]);
  front.dispose(); back.dispose();
  if (mode === 'baseline') return geometry;

  let selection;
  if (mode === 'surface') {
    const projected = projectSurfacePath(geometry, {
      points: PANEL_STROKE,
      sampleSpacing: .018,
      maxDistance: .035,
      regionNames: 'part.front',
    });
    selection = surfacePathSelection(geometry, projected, {
      radius: .045,
      falloff: 'smooth',
      regionNames: 'part.front',
    });
  } else {
    selection = pathSelection({ points: PANEL_STROKE, radius: .052, falloff: 'smooth' });
  }
  selection = intersectSelections(selection, mode === 'surface' ? faceRegionSelection(geometry, 'part.front') : (() => 1));
  const result = sculptGeometry(geometry,
    pullVertices(selection, [0, 0, -.028]),
    smoothVertices(selection, { strength: .08, iterations: 1, preserveBoundary: true }),
  );
  geometry.dispose();
  return result;
}

function mechanicalExample(materials, mode) {
  const geometry = layeredPanelGeometry(mode);
  const root = group(`Layered service panel / ${mode}`, [], { position: [.43, -.02, 0], rotation: [2, 9, -2] });
  root.add(mesh(geometry, { name: 'Front and backing sheets', material: [materials.panel, materials.back] }));
  root.add(
    box({ name:'Top frame', size:[.54,.018,.028], position:[0,.214,-.018], radius:.004, segments:2, material:materials.frame }),
    box({ name:'Bottom frame', size:[.54,.018,.028], position:[0,-.214,-.018], radius:.004, segments:2, material:materials.frame }),
  );
  root.userData.surfaceStrokeStudy = {
    subject: 'hard-surface double-layer service panel', mode,
    intent: mode === 'surface'
      ? 'project only to front part and propagate by edge distance so nearby backing remains untouched'
      : 'ordinary Euclidean path can influence both nearby layers',
  };
  return root;
}

export default defineModel({
  id: 'surface-stroke-study',
  title: 'Workflow lab / projected surface strokes',
  description: 'Project reusable authored strokes to a support surface, then build topology-aware edge-distance sculpt masks that avoid nearby-layer bleed.',
  parameters: {
    organic: { type:'boolean', default:true },
    mechanical: { type:'boolean', default:true },
    mode: { type:'select', options:['baseline','euclidean','surface'], default:'surface' },
  },
  build(p) {
    const materials = {
      organic: material('#879c79', { roughness:.62 }),
      eye: material('#202629', { roughness:.32, metalness:.12 }),
      panel: material('#728791', { roughness:.38, metalness:.30 }),
      back: material('#3a444b', { roughness:.54, metalness:.22 }),
      frame: material('#c8c9c1', { roughness:.42, metalness:.24 }),
    };
    const children = [];
    if (p.organic) children.push(organicExample(materials, p.mode));
    if (p.mechanical) children.push(mechanicalExample(materials, p.mode));
    if (!children.length) children.push(sphere({ radius:.02, material:materials.frame }));
    const root = group('Projected surface stroke workflow', children);
    root.userData.workflow = {
      sequence: 'author local polyline -> resample/project to named support -> edge-distance point mask -> topology-preserving sculpt',
      distinction: 'projected path ownership and surface propagation are separate from the sculpt effect',
    };
    return root;
  },
});
