import * as THREE from 'three';
import { defineModel, group, material, mesh, sphere, cylinder, box, torus } from '../src/lib/modeling.js';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import {
  radialSelection, facingSelection, faceRegionSelection,
  intersectSelections, invertSelection,
  pullVertices, inflateVertices, smoothVertices, sculptGeometry,
} from '../src/lib/geometry-sculpt.js';

function organicBody(edited) {
  let geometry = new THREE.SphereGeometry(.25, 36, 24);
  geometry.scale(.78, 1.08, .90);
  geometry.computeVertexNormals();
  defineFaceRegions(geometry, {
    'creature.forehead': ({ centroid, normal }) => centroid.y > -.015 && centroid.z > .045 && normal.z > .15,
  }, { clone: false });
  if (!edited) return geometry;
  const forehead = faceRegionSelection(geometry, 'creature.forehead');
  const crest = intersectSelections(
    forehead,
    radialSelection({ center:[0,.115,.175], radius:[.155,.19,.13] }),
    facingSelection([0,0,1], { minDot:.08 }),
  );
  const crown = intersectSelections(
    forehead,
    radialSelection({ center:[0,.205,.08], radius:[.12,.115,.16] }),
  );
  const result = sculptGeometry(geometry,
    inflateVertices(crest, .060),
    pullVertices(crest, [0,.018,.018]),
    inflateVertices(crown, .025),
    smoothVertices(crest, { strength:.17, iterations:2, preserveBoundary:true }),
  );
  geometry.dispose();
  return result;
}

function organicExample(materials, edited) {
  const head = organicBody(edited);
  const root = group(edited ? 'Sculpted creature primary form' : 'Baseline creature primary form', [], {
    position:[-.43,.01,0], rotation:[-3,-8,0],
  });
  root.add(mesh(head, { name:'Editable creature shell', material:materials.organic }));
  root.add(
    sphere({ name:'Left eye marker', radius:.025, segments:14, position:[-.072,.065,.205], material:materials.dark }),
    sphere({ name:'Right eye marker', radius:.025, segments:14, position:[.072,.065,.205], material:materials.dark }),
    cylinder({ name:'Muzzle bridge', radius:.025, top:.017, bottom:.032, height:.080, segments:16, rotation:[90,0,0], position:[0,-.03,.215], material:materials.organicDark }),
  );
  root.userData.geometrySculptStudy = {
    subject:'stylized creature head shell', edited,
    operation:'named forehead ∩ local radial falloff ∩ facing -> inflate/pull/smooth',
    topology:'unchanged indexed sphere topology',
  };
  return root;
}

function servicePanel(edited) {
  let geometry = new THREE.PlaneGeometry(.40, .34, 24, 20);
  geometry.computeVertexNormals();
  defineFaceRegions(geometry, {
    'panel.service': ({ centroid }) => Math.abs(centroid.x) < .16 && Math.abs(centroid.y) < .13,
  }, { clone:false });
  if (!edited) return geometry;
  const service = faceRegionSelection(geometry, 'panel.service');
  const outer = intersectSelections(service, radialSelection({ center:[.035,.015,0], radius:[.135,.115,.10] }));
  const inner = intersectSelections(service, radialSelection({ center:[.035,.015,0], radius:[.072,.058,.10] }));
  const ring = intersectSelections(outer, invertSelection(inner));
  const result = sculptGeometry(geometry,
    pullVertices(ring, [0,0,.050]),
    pullVertices(inner, [0,0,-.020]),
    smoothVertices(outer, { strength:.16, iterations:2, preserveBoundary:true }),
  );
  geometry.dispose();
  return result;
}

function mechanicalExample(materials, edited) {
  const panel = servicePanel(edited);
  const root = group(edited ? 'Sculpted service panel' : 'Baseline service panel', [], {
    position:[.43,-.015,0], rotation:[2,9,-2],
  });
  root.add(mesh(panel, { name:'Editable service plate', material:materials.panel }));
  const bars = [
    {size:[.43,.022,.026],position:[0,.181,-.012]}, {size:[.43,.022,.026],position:[0,-.181,-.012]},
    {size:[.022,.34,.026],position:[-.211,0,-.012]}, {size:[.022,.34,.026],position:[.211,0,-.012]},
  ];
  root.add(...bars.map((spec,i)=>box({name:`Frame rail ${i+1}`,...spec,radius:.004,segments:2,material:materials.frame})));
  for (const [i,[x,y]] of [[-.175,-.145],[.175,-.145],[-.175,.145],[.175,.145]].entries()) {
    root.add(cylinder({name:`Fastener ${i+1}`,radius:.010,height:.014,segments:12,rotation:[90,0,0],position:[x,y,.012],material:materials.dark}));
  }
  root.add(torus({ name:'Service boss readout', radius:.083, tube:.0045, segments:32, rotation:[0,0,0], position:[.035,.015,edited ? .045 : .020], material:materials.cyan }));
  root.userData.geometrySculptStudy = {
    subject:'hard-surface service panel', edited,
    operation:'named service region ∩ radial ring -> raised boss + recessed center + smoothing',
    topology:'unchanged indexed plane topology',
  };
  return root;
}

export default defineModel({
  id:'geometry-sculpt-study',
  title:'Workflow lab / composable BufferGeometry sculpt masks',
  description:'Topology-preserving local brush edits on ordinary indexed BufferGeometry using reusable radial, facing and named-region selection masks.',
  parameters:{
    organic:{type:'boolean',default:true},
    mechanical:{type:'boolean',default:true},
    edited:{type:'boolean',default:true},
  },
  build(p) {
    const materials = {
      organic:material('#7e9879',{roughness:.62}),
      organicDark:material('#526a52',{roughness:.68}),
      panel:material('#69757c',{roughness:.38,metalness:.35}),
      frame:material('#c6c7bd',{roughness:.42,metalness:.28}),
      dark:material('#222a2e',{roughness:.46,metalness:.28}),
      cyan:material('#56d7d1',{roughness:.25,emissive:'#0c4a4a',emissiveIntensity:.25}),
    };
    const children=[];
    if (p.organic) children.push(organicExample(materials,p.edited));
    if (p.mechanical) children.push(mechanicalExample(materials,p.edited));
    if (!children.length) children.push(sphere({radius:.02,material:materials.frame}));
    const root=group('Geometry sculpt workflow',children);
    root.userData.workflow={
      sequence:'defineFaceRegions -> compose point-domain selections -> sculptGeometry -> render/export',
      coordinateSpace:'geometry-local meters',
      purpose:'make local primary-form edits on ordinary indexed geometry without changing topology or rewriting UV/custom attributes',
    };
    return root;
  },
});
