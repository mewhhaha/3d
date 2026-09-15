import * as THREE from 'three';
import { refineTriangles } from './shells.js';
import { box, cylinder, mesh, group, material } from '../modeling.js';
const V = a => new THREE.Vector3(...a);
const positive = (n, label) => { if (!Number.isFinite(n) || n <= 0) throw new Error(`${label} must be positive`); return n; };
export function cyberMaterials({ shell = '#dbdac4', glow = 1 } = {}) {
  if (!Number.isFinite(glow) || glow < 0 || glow > 5) throw new Error('glow must be 0..5');
  const named = (name, color, options = {}) => { const m = material(color, options); m.name = name; return m; };
  const neon = (name, color) => named(name, color, { emissive: color, emissiveIntensity: 2.2 * glow, roughness: .3, metalness: .15 });
  return {
    shell: named('Ivory ceramic coating', shell, { roughness: .43, metalness: .12 }),
    dark: named('Graphite structure', '#111f22', { roughness: .35, metalness: .65 }),
    rubber: named('Black joint bellows', '#060c0e', { roughness: .65 }),
    edge: named('Titanium edge', '#42565b', { roughness: .26, metalness: .8 }),
    orange: named('Orange enamel', '#e74e17', { roughness: .3, metalness: .25 }),
    skin: named('Warm porcelain skin', '#deb197', { roughness: .58 }),
    ink: named('Ink detail', '#181c26', { roughness: .75 }),
    pink: neon('Magenta emitter', '#ff2eaf'), cyan: neon('Cyan emitter', '#26efed'),
    lime: neon('Lime emitter', '#aeff65'), amber: neon('Amber emitter', '#ff7c16'),
    white: neon('Warm white emitter', '#fff6bc'),
  };
}
export function ring({ name = 'Ring', radius, width = .004, material: mat, segments = 48 }) {
  return mesh(new THREE.TorusGeometry(positive(radius,'radius'),positive(width,'width'),8,segments), {name, material:mat});
}
export function orient(object, position, direction = [0,0,1]) {
  if (![...position,...direction].every(Number.isFinite) || V(direction).lengthSq() < 1e-15) throw new Error('Invalid attachment frame');
  object.position.fromArray(position);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), V(direction).normalize());
  return object;
}
export function link({ name = 'Link', from, to, radius = .015, endRadius = radius, material: mat, segments = 20 }) {
  const delta = V(to).sub(V(from)), length = delta.length(); positive(length,'link length');
  const object = cylinder({ name, radius, top:endRadius, height:length, segments, material:mat });
  object.position.copy(V(from).add(V(to)).multiplyScalar(.5));
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  return object;
}
/** Beveled contour plate in XY, extruded toward +Z; holes are real through holes. */
export function panel({ name = 'Panel', outline, depth = .006, bevel = .003, bulge = 0, holes = [], material: mat }) {
  if (!Array.isArray(outline) || outline.length < 3 || !outline.every(p=>p.length===2&&p.every(Number.isFinite))) throw new Error('panel requires a finite XY contour');
  positive(depth,'panel depth'); if (![bevel,bulge].every(Number.isFinite)||bevel<0) throw new Error('Invalid panel shape');
  const shape = new THREE.Shape(outline.map(p=>new THREE.Vector2(...p))); shape.closePath();
  for (const { at:[x,y], radius } of holes) { const p = new THREE.Path(); p.absarc(x,y,positive(radius,'hole radius'),0,Math.PI*2,true); shape.holes.push(p); }
  let geometry = new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel*.7,bevelSegments:3,curveSegments:24,steps:1});
  if (bulge) { const original=geometry; geometry=refineTriangles(original,2); original.dispose(); }
  geometry.computeBoundingBox(); const size=geometry.boundingBox.getSize(new THREE.Vector3()),center=geometry.boundingBox.getCenter(new THREE.Vector3());
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++) { const x=(p.getX(i)-center.x)/(size.x*.5), y=(p.getY(i)-center.y)/(size.y*.5); p.setZ(i,p.getZ(i)+bulge*Math.max(0,1-x*x)*Math.max(0,1-y*y)); }
  geometry.computeVertexNormals();
  return mesh(geometry,{name,material:mat});
}
/** Shared contour for a dark structural rim and a slightly inset ivory face. */
export function armorPanel(spec, mats) {
  const root = group(spec.name || 'Armor panel');
  const edge = panel({...spec,name:root.name+' / substrate',depth:(spec.depth||.006)+.002,material:mats.dark});
  const face = panel({...spec,name:root.name+' / ceramic',material:spec.material||mats.shell});
  face.scale.set(.955,.98,1); face.position.z=.004;
  root.add(edge,face); return root;
}
/** Concentric mechanical port; local normal +Z, all layers are geometry. */
export function radialPort({ name='Radial port', radius=.06, color='cyan', detail=1, bolts=6 }, mats) {
  positive(radius,'port radius'); if(!mats[color])throw new Error('Unknown port emitter');
  const g=group(name), s=detail>0?48:24;
  const disk=(r,h,z,mat,label)=>{const o=cylinder({name:name+' / '+label,radius:r,height:h,segments:s,material:mat});o.rotation.x=Math.PI/2;o.position.z=z;g.add(o);};
  disk(radius,.025,0,mats.dark,'housing'); disk(radius*.89,.014,.018,mats.edge,'machined bezel');
  disk(radius*.72,.008,.028,mats.dark,'recess');
  for(const [r,w,z,mat] of [[.79,.025,.031,mats.shell],[.66,.033,.035,mats[color]],[.48,.015,.037,mats.shell],[.39,.055,.038,mats[color]]]) {
    const o=ring({name:name+' / luminous annulus',radius:radius*r,width:radius*w,segments:s,material:mat});o.position.z=z;g.add(o);
  }
  disk(radius*.23,.010,.038,mats.orange,'orange core');disk(radius*.11,.009,.046,mats.dark,'central bore');
  if(detail>0)for(let i=0;i<bolts;i++){
    const a=i/bolts*Math.PI*2; const b=cylinder({name:name+' / captive screw',radius:radius*.035,height:.005,segments:8,material:mats.edge});
    b.rotation.x=Math.PI/2;b.position.set(Math.cos(a)*radius*.94,Math.sin(a)*radius*.94,.017);g.add(b);
  }
  g.scale.z=Math.min(1,radius/.11);
  return g;
}
export function cableCurve(points) {
  if(!Array.isArray(points)||points.length<2||!points.every(p=>p.length===3&&p.every(Number.isFinite)))throw new Error('Cable requires finite 3D route points');
  for(let i=1;i<points.length;i++) if(V(points[i]).distanceToSquared(V(points[i-1]))<1e-12)throw new Error('Cable route has repeated points');
  return new THREE.CatmullRomCurve3(points.map(V),false,'centripetal');
}
/** Arc-length-spaced connectors and clamp frames; routes do not solve collisions. */
export function routedCable({name='Cable',points,radius=.009,material:mat,segments=80,clamps=0,clampMaterial,ends=true}) {
  positive(radius,'cable radius');if(!Number.isInteger(clamps)||clamps<0||clamps>100)throw new Error('Invalid clamp count');
  const curve=cableCurve(points), g=group(name);
  g.add(mesh(new THREE.TubeGeometry(curve,segments,radius,8,false),{name:name+' / jacket',material:mat}));
  const collar=(t,length,r)=>{
    const p=curve.getPointAt(t), d=curve.getTangentAt(t);
    g.add(link({name:name+' / coupling',from:p.clone().addScaledVector(d,-length/2).toArray(),to:p.clone().addScaledVector(d,length/2).toArray(),radius:r,material:clampMaterial||mat,segments:12}));
  };
  for(let i=1;i<=clamps;i++)collar(i/(clamps+1),radius*2.5,radius*1.38);
  if(ends){collar(.015,radius*5,radius*1.8);collar(.985,radius*5,radius*1.8);}
  g.userData.route={points,arcLength:curve.getLength(),clamps};return g;
}
/** Bundle offsets use the route's parallel frame instead of global-axis guesses. */
export function cableLoom({name='Luminous loom',points,colors=['pink','lime','cyan'],radius=.007,spacing=.016,segments=100,clamps=0},mats) {
  const curve=cableCurve(points),frames=curve.computeFrenetFrames(segments,false),g=group(name);
  colors.forEach((color,k)=>{
    if(!mats[color])throw new Error('Unknown loom emitter');
    const route=Array.from({length:segments+1},(_,i)=>curve.getPointAt(i/segments).addScaledVector(frames.normals[i],(k-(colors.length-1)/2)*spacing).toArray());
    g.add(routedCable({name:`${name} / ${color}`,points:route,radius,material:mats[color],segments,clamps,clampMaterial:mats.edge}));
  });return g;
}
export function bellows({name='Bellows',from,to,radius=.024,ribs=8},mats){
 const g=group(name),a=V(from),b=V(to),d=b.clone().sub(a).normalize();
 g.add(link({name:name+' core',from,to,radius:radius*.78,material:mats.rubber}));
 for(let i=0;i<ribs;i++){const r=ring({name:name+' fold',radius:radius*.85,width:radius*.10,material:mats.edge,segments:24});orient(r,a.clone().lerp(b,(i+.5)/ribs).toArray(),d.toArray());g.add(r);}return g;
}
