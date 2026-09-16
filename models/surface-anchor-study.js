import * as THREE from 'three';
import { defineModel, group, material, mesh, sphere, cylinder, box } from '../src/lib/modeling.js';
import { profileSweepGeometry } from '../src/lib/profile-sweep.js';
import { solidifyGeometry } from '../src/lib/surface-thickness.js';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import {
  surfaceMount, bindSurfaceAnchor, resolveSurfaceAnchor, resolveSurfaceMount,
  attachSurfaceAnchor, attachSurfaceMount,
} from '../src/lib/surface-mount.js';

function leafSupport(curl) {
  const path = [
    [0,-.21,0],
    [-.012,-.10,.018 + curl*.01],
    [.018,.02,.032 + curl*.04],
    [-.010,.14,.022 + curl*.085],
    [.006,.25,curl*.13],
  ];
  const profile = [[-.07,0],[-.035,.018],[0,.027],[.035,.018],[.07,0]];
  const sheet = profileSweepGeometry({
    path, profile, closedProfile:false, segments:36, up:[1,0,0],
    scale:t=>[.68+.34*Math.sin(Math.PI*t), .82+.18*Math.sin(Math.PI*t)],
    tilt:t=>-4+8*t,
    faceRegions:{
      'leaf.mount':meta=>meta.kind==='side' && meta.pathMid>.58 && meta.pathMid<.86 && meta.profileMid>.24 && meta.profileMid<.76,
    },
  });
  const shell = solidifyGeometry(sheet,{thickness:.012,offset:-.2,rim:'smooth',preserveRegions:true,regionPrefix:'leaf.shell'});
  sheet.dispose();
  return shell;
}

function panelSupport(arch) {
  const g = new THREE.PlaneGeometry(.36,.32,8,7);
  const p = g.getAttribute('position');
  for (let i=0;i<p.count;i++) {
    const x=p.getX(i), y=p.getY(i);
    const z=.018*Math.cos(y*8.5) + arch*(.075*(1-(x/.18)**2) + .035*y);
    p.setZ(i,z);
  }
  p.needsUpdate=true; g.computeVertexNormals();
  defineFaceRegions(g,{
    'panel.service':({centroid})=>centroid.x>.015 && centroid.y>-.085 && centroid.y<.12,
  },{clone:false});
  const shell=solidifyGeometry(g,{thickness:.022,offset:-.35,rim:'sharp',preserveRegions:true,regionPrefix:'panel.shell'});
  g.dispose();
  return shell;
}

function bud(materials, accent, name) {
  return group(name,[
    cylinder({name:`${name} stem`,radius:.008,height:.045,segments:12,rotation:[90,0,0],position:[0,0,.023],material:materials.stem}),
    sphere({name:`${name} head`,radius:.023,segments:16,position:[0,0,.060],scale:[.82,1.12,.82],material:accent}),
  ]);
}

function sensor(materials, accent, name) {
  return group(name,[
    box({name:`${name} body`,size:[.065,.048,.022],radius:.006,segments:2,position:[0,0,.013],material:materials.sensor}),
    cylinder({name:`${name} lens`,radius:.014,height:.018,segments:16,rotation:[90,0,0],position:[0,0,.034],material:accent}),
  ]);
}

const LEAF_MOUNT = surfaceMount({
  near:[0,.12,.16], regionNames:['leaf.mount','leaf.shell.outer'], regionMatch:'all',
  tangentHint:[1,0,0], offset:.010, local:{position:[.006,0,0],rotation:[0,0,8]},
});
const PANEL_MOUNT = surfaceMount({
  near:[.09,.015,.16], regionNames:['panel.service','panel.shell.outer'], regionMatch:'all',
  tangentHint:[0,1,0], offset:.012, local:{position:[.012,-.006,0],rotation:[0,0,-18],scale:.92},
});

function marker(pose, colorMaterial, label) {
  const dot=sphere({name:label,radius:.009,segments:12,material:colorMaterial});
  dot.position.copy(pose.frame.origin);
  dot.updateMatrix();
  return dot;
}

function organicExample(materials) {
  const bindGeometry=leafSupport(0);
  const anchor=bindSurfaceAnchor(bindGeometry,LEAF_MOUNT);
  const edited=leafSupport(3);
  const anchoredPose=resolveSurfaceAnchor(edited,anchor);
  const nearestPose=resolveSurfaceMount(edited,LEAF_MOUNT);
  const root=group('Organic persistent anchor example',[],{position:[-.34,.18,0],rotation:[0,-8,0]});
  root.add(mesh(edited,{name:'Curled leaf support',material:materials.leaf}));
  const persistent=bud(materials,materials.anchor,'Persistent bud'); attachSurfaceAnchor(persistent,edited,anchor); root.add(persistent);
  const nearest=bud(materials,materials.nearest,'Nearest bud'); attachSurfaceMount(nearest,edited,LEAF_MOUNT); root.add(nearest);
  root.add(marker(anchoredPose,materials.anchor,'Persistent leaf anchor point'));
  root.add(marker(nearestPose,materials.nearest,'Nearest leaf point'));
  root.userData.anchorStudy={
    anchorTriangle:anchor.triangleIndex,
    nearestTriangle:nearestPose.hit.triangleIndex,
    separation:anchoredPose.position.distanceTo(nearestPose.position),
    mode:'bind once on open leaf; compare exact barycentric anchor vs nearest re-query on curled rebuild',
  };
  bindGeometry.dispose();
  return root;
}

function mechanicalExample(materials) {
  const bindGeometry=panelSupport(0);
  const anchor=bindSurfaceAnchor(bindGeometry,PANEL_MOUNT);
  const edited=panelSupport(3);
  const anchoredPose=resolveSurfaceAnchor(edited,anchor);
  const nearestPose=resolveSurfaceMount(edited,PANEL_MOUNT);
  const root=group('Mechanical persistent anchor example',[],{position:[.38,-.11,0],rotation:[-3,10,-4]});
  root.add(mesh(edited,{name:'Arched service panel',material:materials.panel}));
  const persistent=sensor(materials,materials.anchor,'Persistent sensor'); attachSurfaceAnchor(persistent,edited,anchor); root.add(persistent);
  const nearest=sensor(materials,materials.nearest,'Nearest sensor'); attachSurfaceMount(nearest,edited,PANEL_MOUNT); root.add(nearest);
  root.add(marker(anchoredPose,materials.anchor,'Persistent panel anchor point'));
  root.add(marker(nearestPose,materials.nearest,'Nearest panel point'));
  root.userData.anchorStudy={
    anchorTriangle:anchor.triangleIndex,
    nearestTriangle:nearestPose.hit.triangleIndex,
    separation:anchoredPose.position.distanceTo(nearestPose.position),
    mode:'bind once on flat panel; compare exact barycentric anchor vs nearest re-query on arched rebuild',
  };
  bindGeometry.dispose();
  return root;
}

export default defineModel({
  id:'surface-anchor-study',
  title:'Workflow lab / persistent surface anchors',
  description:'Bind an exact barycentric spot once, then keep attachments on that authored triangle through same-topology support edits while nearest-surface mounts remain available for search-based placement.',
  parameters:{organic:{type:'boolean',default:true},mechanical:{type:'boolean',default:true}},
  build(p){
    const materials={
      leaf:material('#657f6e',{roughness:.58}), panel:material('#505b64',{roughness:.38,metalness:.48}),
      stem:material('#293b33',{roughness:.54}), sensor:material('#c7ced1',{roughness:.34,metalness:.48}),
      anchor:material('#f1b65f',{roughness:.28,metalness:.08,emissive:'#5c2e08',emissiveIntensity:.28}),
      nearest:material('#5ed5d0',{roughness:.28,metalness:.08,emissive:'#0e4548',emissiveIntensity:.24}),
    };
    const children=[];
    if(p.organic) children.push(organicExample(materials));
    if(p.mechanical) children.push(mechanicalExample(materials));
    if(!children.length) children.push(sphere({radius:.02,material:materials.sensor}));
    const root=group('Persistent surface anchor workflow',children);
    root.userData.workflow={
      persistent:'bindSurfaceAnchor -> resolve/attachSurfaceAnchor',
      search:'surfaceMount -> resolve/attachSurfaceMount',
      colorLegend:{gold:'persistent exact-face anchor',cyan:'nearest-surface re-query'},
    };
    return root;
  },
});
