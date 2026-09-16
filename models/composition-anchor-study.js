import * as THREE from 'three';
import { defineModel, group, material, mesh, sphere, cylinder, box, torus } from '../src/lib/modeling.js';
import { profileSweepGeometry } from '../src/lib/profile-sweep.js';
import { solidifyGeometry } from '../src/lib/surface-thickness.js';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { composeGeometries, remapCompositionAnchor } from '../src/lib/geometry-composition.js';
import { bindSurfaceAnchor, attachSurfaceAnchor, resolveSurfaceAnchor } from '../src/lib/surface-mount.js';

function leafShell() {
  const sheet = profileSweepGeometry({
    path: [[0,-.28,0],[.018,-.14,.022],[-.012,.02,.052],[.014,.18,.030],[0,.31,0]],
    profile: [[-.072,0],[-.036,.018],[0,.027],[.036,.018],[.072,0]],
    closedProfile: false,
    segments: 38,
    up: [1,0,0],
    scale: t => [.52 + .48 * Math.sin(Math.PI * t) ** .8, .82 + .18 * Math.sin(Math.PI * t)],
    tilt: t => -7 + 14 * t,
    faceRegions: {
      'leaf.tip': meta => meta.kind === 'side' && meta.pathMid > .70,
    },
  });
  const shell = solidifyGeometry(sheet, {
    thickness: .014,
    offset: -.2,
    rim: 'smooth',
    preserveRegions: true,
    regionPrefix: 'leaf.shell',
  });
  sheet.dispose();
  return shell;
}

function flower(materials, color, name) {
  return group(name, [
    cylinder({ name: `${name} stem`, radius: .0065, height: .042, segments: 12, rotation: [90,0,0], position: [0,0,.022], material: materials.dark }),
    sphere({ name: `${name} bulb`, radius: .021, segments: 14, position: [0,0,.054], scale: [.82,1.12,.82], material: color }),
    torus({ name: `${name} collar`, radius: .015, tube: .0035, segments: 18, rotation: [90,0,0], position: [0,0,.011], material: materials.dark }),
  ]);
}

function organicExample(materials) {
  const leaf = leafShell();
  const sourceAnchor = bindSurfaceAnchor(leaf, {
    near: [.004,.245,.08],
    regionNames: ['leaf.tip', 'leaf.shell.outer'],
    regionMatch: 'all',
    tangentHint: [1,0,0],
    offset: .010,
    local: { rotation: [0,0,5] },
  });
  const parts = [
    { name:'left', geometry:leaf, position:[-.14,-.02,-.015], rotation:[7,-18,25], scale:.92 },
    { name:'center', geometry:leaf, position:[0,.025,.02], rotation:[-6,5,-3], scale:1.08 },
    { name:'right', geometry:leaf, position:[.145,-.025,-.01], rotation:[10,22,-27], scale:.90 },
  ];
  const composed = composeGeometries(parts);
  const colors = [materials.cyan, materials.gold, materials.orange];
  const root = group('Organic composition anchor remap', [], { position:[-.49,.02,0], rotation:[2,-8,2] });
  root.add(mesh(composed, { name:'Composed repeated leaf cluster', material:materials.leaf }));
  const diagnostics = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const anchor = remapCompositionAnchor(composed, sourceAnchor, { part:part.name });
    const pose = resolveSurfaceAnchor(composed, anchor);
    const bud = flower(materials, colors[i], `${part.name} exact remapped bud`);
    attachSurfaceAnchor(bud, composed, anchor);
    root.add(bud);
    diagnostics.push({ part:part.name, sourceTriangle:sourceAnchor.triangleIndex, targetTriangle:anchor.triangleIndex, origin:pose.frame.origin.toArray() });
  }
  root.userData.compositionAnchor = {
    subject:'three repeated leaf shells',
    intent:'one source-local bud anchor remapped by explicit part identity after transformed composition',
    anchors:diagnostics,
  };
  leaf.dispose();
  return root;
}

function panelShell() {
  const g = new THREE.PlaneGeometry(.38,.34,7,7);
  const p = g.getAttribute('position');
  for (let i=0;i<p.count;i++) {
    const x=p.getX(i), y=p.getY(i);
    p.setZ(i, .026*Math.cos(x*8.2)-.013*Math.cos(y*9.5)+.018*x);
  }
  p.needsUpdate=true; g.computeVertexNormals();
  defineFaceRegions(g, {
    'panel.service': ({centroid}) => centroid.x > .015 && centroid.y > -.10,
  }, { clone:false });
  return solidifyGeometry(g, { thickness:.025, offset:-.35, rim:'sharp', preserveRegions:true, regionPrefix:'panel.shell' });
}

function rail() {
  return profileSweepGeometry({
    path:[[-.15,-.15,.055],[-.08,-.04,.085],[.01,.08,.10],[.10,.18,.088],[.17,.26,.060]],
    profile:[[-.024,-.013],[.024,-.013],[.024,.013],[-.024,.013]],
    closedProfile:true,
    segments:32,
    up:[0,1,0],
    faceRegions:{
      'rail.terminal': meta => meta.kind === 'side' && meta.pathMid > .72,
    },
    regionPrefix:'rail.sweep',
  });
}

function sensor(materials, name) {
  return group(name, [
    box({ name:`${name} body`, size:[.060,.046,.022], radius:.005, segments:2, position:[0,0,.014], material:materials.metal }),
    cylinder({ name:`${name} lens`, radius:.013, height:.018, segments:16, rotation:[90,0,0], position:[0,0,.035], material:materials.cyan }),
  ]);
}

function latch(materials, name) {
  return group(name, [
    box({ name:`${name} base`, size:[.050,.034,.014], radius:.004, segments:2, position:[0,0,.008], material:materials.dark }),
    cylinder({ name:`${name} pin`, radius:.0085, height:.024, segments:12, rotation:[90,0,0], position:[0,0,.025], material:materials.orange }),
  ]);
}

function mechanicalExample(materials) {
  const housing = panelShell();
  const railSource = rail();
  const housingAnchor = bindSurfaceAnchor(housing, {
    near:[.11,.04,.16], regionNames:['panel.service','panel.shell.outer'], regionMatch:'all', tangentHint:[0,1,0], offset:.010,
    local:{ rotation:[0,0,-11], scale:.92 },
  });
  const railAnchor = bindSurfaceAnchor(railSource, {
    near:[.145,.225,.10], regionNames:['rail.terminal','rail.sweep.side'], regionMatch:'all', tangentHint:[0,1,0], offset:.009,
    local:{ rotation:[0,0,15], scale:.86 },
  });
  const composed = composeGeometries([
    { name:'housing', geometry:housing, rotation:[-4,-7,-7], scale:[1.03,.96,1.0] },
    { name:'rail', geometry:railSource, position:[.025,.018,.042], rotation:[5,11,4], scale:[.95,1.05,.9] },
  ]);
  const remappedHousing = remapCompositionAnchor(composed, housingAnchor, { part:'housing' });
  const remappedRail = remapCompositionAnchor(composed, railAnchor, { part:'rail' });
  const housingPose = resolveSurfaceAnchor(composed, remappedHousing);
  const railPose = resolveSurfaceAnchor(composed, remappedRail);

  const root = group('Mechanical composition anchor remap', [], { position:[.48,-.06,0], rotation:[1,10,-2] });
  root.add(mesh(composed, { name:'Composed housing and routed rail', material:materials.panel }));
  const serviceSensor = sensor(materials, 'Housing exact remapped sensor');
  attachSurfaceAnchor(serviceSensor, composed, remappedHousing); root.add(serviceSensor);
  const railLatch = latch(materials, 'Rail exact remapped latch');
  attachSurfaceAnchor(railLatch, composed, remappedRail); root.add(railLatch);
  root.userData.compositionAnchor = {
    subject:'service housing plus routed rail',
    intent:'anchors bound independently before composition retain exact source part ownership after transforms',
    anchors:[
      {part:'housing',sourceTriangle:housingAnchor.triangleIndex,targetTriangle:remappedHousing.triangleIndex,origin:housingPose.frame.origin.toArray()},
      {part:'rail',sourceTriangle:railAnchor.triangleIndex,targetTriangle:remappedRail.triangleIndex,origin:railPose.frame.origin.toArray()},
    ],
  };
  housing.dispose(); railSource.dispose();
  return root;
}

export default defineModel({
  id:'composition-anchor-study',
  title:'Workflow lab / persistent anchors through composition',
  description:'Bind surface attachments while parts are independently editable, then remap those exact barycentric anchors into owned transformed composition without nearest-surface rebinding.',
  parameters:{
    organic:{type:'boolean',default:true},
    mechanical:{type:'boolean',default:true},
  },
  build(p) {
    const materials = {
      leaf:material('#6f8a72',{roughness:.58}),
      panel:material('#58636b',{roughness:.38,metalness:.42}),
      dark:material('#253038',{roughness:.50,metalness:.25}),
      metal:material('#c8d0d2',{roughness:.32,metalness:.5}),
      cyan:material('#5fd4d1',{roughness:.28,emissive:'#0f4349',emissiveIntensity:.18}),
      gold:material('#efc766',{roughness:.30,emissive:'#5b3b08',emissiveIntensity:.16}),
      orange:material('#e69250',{roughness:.32,emissive:'#552107',emissiveIntensity:.15}),
    };
    const children=[];
    if (p.organic) children.push(organicExample(materials));
    if (p.mechanical) children.push(mechanicalExample(materials));
    if (!children.length) children.push(sphere({radius:.02,material:materials.metal}));
    const root=group('Composition anchor workflow',children);
    root.userData.workflow={
      sequence:'bindSurfaceAnchor(independent part) -> composeGeometries(transformed parts) -> remapCompositionAnchor(part) -> attachSurfaceAnchor(component)',
      purpose:'preserve exact authored attachment ownership through deterministic geometry composition',
    };
    return root;
  },
});
