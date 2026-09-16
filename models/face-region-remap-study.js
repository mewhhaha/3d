import * as THREE from 'three';
import { defineModel, group, material, mesh, sphere, cylinder, box } from '../src/lib/modeling.js';
import { profileSweepGeometry } from '../src/lib/profile-sweep.js';
import { solidifyGeometry } from '../src/lib/surface-thickness.js';
import { defineFaceRegions, faceRegionTriangles } from '../src/lib/face-regions.js';
import { triangleSpatialIndex } from '../src/lib/triangle-spatial-index.js';

function subsetGeometry(source, faces, offset = 0.0012) {
  const geometry = source.clone();
  const indices = [];
  for (const face of faces) {
    const base = face * 3;
    indices.push(source.index.getX(base), source.index.getX(base + 1), source.index.getX(base + 2));
  }
  geometry.setIndex(indices);
  geometry.clearGroups();
  geometry.userData = { subsetOf: source.type, faceCount: faces.length };
  if (offset) {
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    for (let i = 0; i < position.count; i++) {
      position.setXYZ(
        i,
        position.getX(i) + normal.getX(i) * offset,
        position.getY(i) + normal.getY(i) * offset,
        position.getZ(i) + normal.getZ(i) * offset,
      );
    }
    position.needsUpdate = true;
  }
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function organicFixture(palette) {
  const path = [[-.42,-.34,-.03],[-.32,-.14,.05],[-.17,.08,.095],[.02,.25,.05],[.22,.34,-.02],[.40,.49,.035]];
  const profile = [[-.055,0],[-.035,.018],[0,.025],[.035,.018],[.055,0]];
  let source = profileSweepGeometry({
    path, profile, closedProfile: false, segments: 54, up: [0,1,0],
    scale: t => [.45 + .75 * Math.sin(Math.PI * t) ** .72, .74 + .34 * Math.sin(Math.PI * t)],
    tilt: t => -13 + 31 * t,
  });
  source = defineFaceRegions(source, {
    'leaf.tip': ({ centroid }) => centroid.y > .265,
    'leaf.base': ({ centroid }) => centroid.y < -.08,
  }, { clone: false });
  const shell = solidifyGeometry(source, {
    thickness: .016, offset: -.4, rim: 'smooth', preserveRegions: true, regionPrefix: 'leaf.shell',
  });
  const tipOuter = faceRegionTriangles(shell, ['leaf.tip', 'leaf.shell.outer'], { match: 'all' });
  const tipRim = faceRegionTriangles(shell, ['leaf.tip', 'leaf.shell.rim'], { match: 'all' });
  const root = group('Organic semantic shell', [], { position: [-.58,.02,0], rotation: [3,-12,7] });
  root.add(mesh(shell, { name: 'Leaf shell', material: palette.leaf }));
  root.add(mesh(subsetGeometry(shell, tipOuter), { name: 'Inherited tip on outer shell', material: palette.tip }));
  root.add(mesh(subsetGeometry(shell, tipRim, .0018), { name: 'Inherited tip on generated rim', material: palette.rim }));

  const query = triangleSpatialIndex(shell, { leafSize: 8 });
  const hit = query.closestPoint(new THREE.Vector3(.31,.39,.10), {
    regionNames: ['leaf.tip', 'leaf.shell.outer'], regionMatch: 'all',
  });
  const budCenter = hit.point.clone().addScaledVector(hit.normal, .018);
  root.add(sphere({ name: 'Bud attached through inherited region', radius: .026, segments: 18, position: budCenter.toArray(), material: palette.bud }));
  root.userData.workflow = {
    subject: 'organic swept leaf',
    sourceRegion: 'leaf.tip',
    derivedRegions: ['leaf.shell.outer','leaf.shell.inner','leaf.shell.rim'],
    tipOuterFaces: tipOuter.length,
    tipRimFaces: tipRim.length,
  };
  source.dispose();
  return root;
}

function foldedPanel() {
  const geometry = new THREE.PlaneGeometry(.68,.46,12,8);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i);
    position.setZ(i, .055 - .15 * Math.abs(x) + .018 * Math.cos(y * 8));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function mechanicalFixture(palette) {
  let source = foldedPanel();
  source = defineFaceRegions(source, {
    'panel.service': ({ centroid }) => centroid.x > .04 && centroid.y > -.12,
    'panel.mount': ({ centroid }) => centroid.y < -.12,
  }, { clone: false });
  const shell = solidifyGeometry(source, {
    thickness: .032, offset: -1, rim: 'sharp', preserveRegions: true, regionPrefix: 'panel.shell',
  });
  const serviceOuter = faceRegionTriangles(shell, ['panel.service','panel.shell.outer'], { match: 'all' });
  const mountRim = faceRegionTriangles(shell, ['panel.mount','panel.shell.rim'], { match: 'all' });
  const root = group('Mechanical semantic shell', [], { position: [.60,-.04,.01], rotation: [-5,17,-5] });
  root.add(mesh(shell, { name: 'Service housing shell', material: palette.panel }));
  root.add(mesh(subsetGeometry(shell, serviceOuter), { name: 'Inherited service region', material: palette.service }));
  root.add(mesh(subsetGeometry(shell, mountRim, .0018), { name: 'Mount-region generated rim', material: palette.rim }));

  const query = triangleSpatialIndex(shell, { leafSize: 8 });
  const hit = query.closestPoint(new THREE.Vector3(.16,.05,.16), {
    regionNames: ['panel.service','panel.shell.outer'], regionMatch: 'all',
  });
  const socketCenter = hit.point.clone().addScaledVector(hit.normal, .028);
  root.add(cylinder({
    name: 'Socket constrained to inherited service region', radius: .035, height: .050, segments: 22,
    rotation: [90,0,0], position: socketCenter.toArray(), material: palette.socket,
  }));
  root.add(box({ name: 'Mount block', size: [.13,.065,.06], radius: .01, segments: 2, position: [-.20,-.19,-.03], material: palette.mount }));
  root.userData.workflow = {
    subject: 'folded mechanical panel',
    sourceRegion: 'panel.service',
    derivedRegions: ['panel.shell.outer','panel.shell.inner','panel.shell.rim'],
    serviceOuterFaces: serviceOuter.length,
    mountRimFaces: mountRim.length,
  };
  source.dispose();
  return root;
}

export default defineModel({
  id: 'face-region-remap-study',
  title: 'Workflow lab / face-region remap through topology',
  description: 'Known face provenance preserves semantic construction regions through solidification while adding queryable outer, inner and rim roles.',
  parameters: {
    organic: { type: 'boolean', default: true },
    mechanical: { type: 'boolean', default: true },
  },
  build(p) {
    const palette = {
      leaf: material('#789b80', { roughness: .55, metalness: .03 }),
      tip: material('#e2bd64', { roughness: .42, metalness: .05 }),
      panel: material('#697a82', { roughness: .38, metalness: .28 }),
      service: material('#68d4d1', { roughness: .32, metalness: .18, emissive: '#0f3a42', emissiveIntensity: .16 }),
      rim: material('#d7785e', { roughness: .34, metalness: .2 }),
      bud: material('#d4809d', { roughness: .42 }),
      socket: material('#e8bc58', { roughness: .25, metalness: .55 }),
      mount: material('#343d44', { roughness: .5, metalness: .45 }),
    };
    const children = [];
    if (p.organic) children.push(organicFixture(palette));
    if (p.mechanical) children.push(mechanicalFixture(palette));
    if (!children.length) children.push(sphere({ radius: .025, material: material('#888888') }));
    const root = group('Face-region topology remap workflow', children);
    root.userData.workflow = { operation: 'remapFaceRegions via solidifyGeometry', semanticDomain: 'face' };
    return root;
  },
});
