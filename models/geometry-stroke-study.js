import * as THREE from 'three';
import { defineModel, group, material, mesh, sphere, cylinder, box } from '../src/lib/modeling.js';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import {
  pathSelection, framedSelection, symmetrySelection, facingSelection, faceRegionSelection,
  intersectSelections, pullVertices, inflateVertices, smoothVertices, sculptGeometry,
} from '../src/lib/geometry-sculpt.js';

const FACIAL_RIDGE_PATH = Object.freeze({
  points: Object.freeze([
    Object.freeze([.045, .105, .000]),
    Object.freeze([.080, .060, .008]),
    Object.freeze([.108, .005, .002]),
    Object.freeze([.132, -.062, -.030]),
  ]),
  radius: Object.freeze([.034, .039, .044, .050]),
});

const PANEL_SEAM = Object.freeze({
  points: Object.freeze([
    Object.freeze([-.165, -.085, 0]),
    Object.freeze([-.055, -.085, 0]),
    Object.freeze([-.055, .055, 0]),
    Object.freeze([.115, .055, 0]),
    Object.freeze([.115, .125, 0]),
  ]),
  radius: .027,
});

function creatureGeometry(edited) {
  let geometry = new THREE.SphereGeometry(.255, 40, 28);
  geometry.scale(.82, 1.02, .91);
  geometry.computeVertexNormals();
  defineFaceRegions(geometry, {
    'creature.face': ({ centroid, normal }) => centroid.z > .035 && centroid.y > -.14 && normal.z > .12,
  }, { clone: false });
  if (!edited) return geometry;

  const authoredRidge = pathSelection({ ...FACIAL_RIDGE_PATH, falloff: 'smooth' });
  const bilateralRidge = framedSelection(
    symmetrySelection(authoredRidge, 'x'),
    { origin: [0, .005, .198], rotation: [0, 0, -8] },
  );
  const selection = intersectSelections(
    faceRegionSelection(geometry, 'creature.face'),
    bilateralRidge,
    facingSelection([0, 0, 1], { minDot: .08 }),
  );
  const result = sculptGeometry(geometry,
    inflateVertices(selection, .044),
    pullVertices(selection, [0, .006, .008]),
    smoothVertices(selection, { strength: .12, iterations: 1, preserveBoundary: true }),
  );
  geometry.dispose();
  return result;
}

function creatureExample(materials, edited) {
  const geometry = creatureGeometry(edited);
  const root = group(edited ? 'Path-sculpted creature facial ridge' : 'Baseline creature facial ridge', [], {
    position: [-.43, .015, 0], rotation: [-3, -8, 0],
  });
  root.add(mesh(geometry, { name: 'Editable creature shell', material: materials.organic }));
  root.add(
    sphere({ name: 'Left eye marker', radius: .021, segments: 14, position: [-.066, .036, .217], material: materials.eye }),
    sphere({ name: 'Right eye marker', radius: .021, segments: 14, position: [.066, .036, .217], material: materials.eye }),
    cylinder({ name: 'Muzzle marker', radius: .021, top: .014, bottom: .026, height: .064, segments: 14, rotation: [90,0,0], position: [0,-.045,.214], material: materials.organicDark }),
  );
  root.userData.geometryStrokeStudy = {
    subject: 'stylized creature head', edited,
    authoredData: 'one facial-ridge polyline in a reusable local frame',
    selection: 'named face ∩ path falloff ∩ local X symmetry ∩ facing',
    topology: 'unchanged indexed sphere topology',
  };
  return root;
}

function panelGeometry(edited) {
  let geometry = new THREE.PlaneGeometry(.46, .38, 34, 28);
  geometry.computeVertexNormals();
  defineFaceRegions(geometry, {
    'panel.service': ({ centroid }) => Math.abs(centroid.x) < .19 && Math.abs(centroid.y) < .155,
  }, { clone: false });
  if (!edited) return geometry;

  const seam = framedSelection(
    pathSelection({ ...PANEL_SEAM, falloff: 'smooth' }),
    { origin: [.018, -.006, 0], rotation: [0, 0, 14] },
  );
  const selection = intersectSelections(faceRegionSelection(geometry, 'panel.service'), seam);
  const result = sculptGeometry(geometry,
    pullVertices(selection, [0, 0, -.038]),
    smoothVertices(selection, { strength: .10, iterations: 1, preserveBoundary: true }),
  );
  geometry.dispose();
  return result;
}

function panelExample(materials, edited) {
  const geometry = panelGeometry(edited);
  const root = group(edited ? 'Path-sculpted service seam' : 'Baseline service seam', [], {
    position: [.43, -.02, 0], rotation: [2, 10, -2],
  });
  root.add(mesh(geometry, { name: 'Editable service plate', material: materials.panel }));
  const bars = [
    {size:[.49,.020,.027], position:[0,.201,-.014]}, {size:[.49,.020,.027],position:[0,-.201,-.014]},
    {size:[.020,.38,.027], position:[-.241,0,-.014]}, {size:[.020,.38,.027],position:[.241,0,-.014]},
  ];
  root.add(...bars.map((spec, index) => box({ name:`Frame rail ${index+1}`, ...spec, radius:.004, segments:2, material:materials.frame })));
  for (const [index,[x,y]] of [[-.205,-.17],[.205,-.17],[-.205,.17],[.205,.17]].entries()) {
    root.add(cylinder({ name:`Fastener ${index+1}`, radius:.009, height:.015, segments:12, rotation:[90,0,0], position:[x,y,.010], material:materials.dark }));
  }
  root.userData.geometryStrokeStudy = {
    subject: 'hard-surface service panel', edited,
    authoredData: 'one routed seam polyline placed by a local frame',
    selection: 'named service region ∩ framed path falloff',
    topology: 'unchanged indexed plane topology',
  };
  return root;
}

export default defineModel({
  id: 'geometry-stroke-study',
  title: 'Workflow lab / reusable path sculpt selections',
  description: 'Topology-preserving grooves and ridges driven by reusable geometry-local polylines, local frames and bilateral symmetry.',
  parameters: {
    organic: { type:'boolean', default:true },
    mechanical: { type:'boolean', default:true },
    edited: { type:'boolean', default:true },
  },
  build(p) {
    const materials = {
      organic: material('#859c79', { roughness:.62 }),
      organicDark: material('#53664e', { roughness:.68 }),
      eye: material('#222a2d', { roughness:.32, metalness:.12 }),
      panel: material('#687881', { roughness:.38, metalness:.34 }),
      frame: material('#c7c8be', { roughness:.42, metalness:.28 }),
      dark: material('#242a2e', { roughness:.44, metalness:.38 }),
    };
    const children = [];
    if (p.organic) children.push(creatureExample(materials, p.edited));
    if (p.mechanical) children.push(panelExample(materials, p.edited));
    if (!children.length) children.push(sphere({ radius:.02, material:materials.frame }));
    const root = group('Geometry path sculpt workflow', children);
    root.userData.workflow = {
      sequence: 'author polyline once -> place in local frame -> optionally mirror -> combine semantic/orientation masks -> sculptGeometry',
      coordinateSpace: 'geometry-local meters; selection-frame rotations in degrees',
      purpose: 'make grooves, ridges and folds reusable construction data instead of chains of hand-positioned radial masks',
    };
    return root;
  },
});
