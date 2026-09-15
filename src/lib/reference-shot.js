import * as THREE from 'three';
const finite = (a, n, name) => { if (!Array.isArray(a) || a.length !== n || !a.every(Number.isFinite)) throw new Error(`${name}: expected ${n} finite values`); return a; };
const vector = a => new THREE.Vector3(...finite(a, 3, 'vector'));
/** Explicit, calibrated image plane. Depth is an authored hypothesis, never inferred from one image. */
export function referenceCamera({width=768,height=1376,target=[0,1.06,0],distance=6.7,elevation=8,fov=16.5}={}) {
  if (![width,height,distance,fov,elevation].every(Number.isFinite) || width<=0 || height<=0 || distance<=0 || fov<=0 || fov>=120) throw new Error('Invalid reference camera');
  const a=THREE.MathUtils.degToRad(elevation), c=new THREE.PerspectiveCamera(fov,width/height,.01,100);
  c.name='HeroCamera'; c.position.copy(vector(target)).add(new THREE.Vector3(0,Math.sin(a),Math.cos(a)).multiplyScalar(distance));
  c.lookAt(vector(target)); c.userData.lookAt=[...target]; c.userData.referencePlane={width,height,distance}; c.updateMatrixWorld(true); return c;
}
export function projectPoint(camera, point, {width,height}) {
  finite([width,height],2,'image size'); if(width<=0||height<=0)throw new Error('Invalid image size');
  camera.updateMatrixWorld(true); const p=vector(point), view=p.clone().applyMatrix4(camera.matrixWorldInverse), q=p.project(camera);
  return {pixel:[(q.x+1)*width/2,(1-q.y)*height/2],depth:-view.z,visible:view.z<0&&Math.abs(q.x)<=1&&Math.abs(q.y)<=1&&Math.abs(q.z)<=1};
}
export function liftPoint(camera, pixel, {width,height,distance,depth=0}) {
  finite(pixel,2,'pixel'); if(![width,height,distance,depth].every(Number.isFinite)||width<=0||height<=0||distance-depth<=camera.near)throw new Error('Invalid lifting plane');
  camera.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(pixel[0]/width*2-1,1-pixel[1]/height*2),camera);
  const forward=camera.getWorldDirection(new THREE.Vector3()), origin=camera.getWorldPosition(new THREE.Vector3());
  const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(forward,origin.addScaledVector(forward,distance-depth));
  const p=ray.ray.intersectPlane(plane,new THREE.Vector3()); if(!p)throw new Error('Image ray misses depth plane'); return p.toArray();
}
/** Local -Y follows a limb, +Z follows a projected facing hint; right-handed, with no negative scale. */
export function segmentFrame(start,end,{forward=[0,0,1],referenceLength=1,width=1}={}) {
  const a=vector(start), b=vector(end), y=a.clone().sub(b), length=y.length();
  if(length<1e-8 || !Number.isFinite(referenceLength)||referenceLength<=0 || !Number.isFinite(width)||width<=0)throw new Error('Invalid segment');
  y.normalize(); const z=vector(forward).addScaledVector(y,-vector(forward).dot(y));
  if(z.lengthSq()<1e-10)throw new Error('Facing hint is parallel to segment');
  z.normalize(); const x=new THREE.Vector3().crossVectors(y,z).normalize();
  const quaternion=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
  return {position:a,quaternion,scale:new THREE.Vector3(width,length/referenceLength,width),length};
}
/** Put a source component into a pose without rewriting that component's vertices. Own the component first. */
export function mountSegment(component,start,end,options={}) {
  const frame=segmentFrame(start,end,options), holder=new THREE.Group();holder.name=options.name||component.name+' mount';
  holder.position.copy(frame.position);holder.quaternion.copy(frame.quaternion);
  const scaled=new THREE.Group();scaled.name=holder.name+' fitted length';scaled.scale.copy(frame.scale);scaled.add(component);holder.add(scaled);
  return holder;
}
export function landmarkGuide(camera, annotations, overrides={}) {
  const image=camera.userData.referencePlane;if(!image)throw new Error('Camera needs a reference plane');const points={};
  for(const [name,entry] of Object.entries(annotations)) {
    if(!entry || !Array.isArray(entry.pixel))throw new Error(`Invalid landmark ${name}`);
    points[name]=liftPoint(camera,overrides[name]?.pixel||entry.pixel,{...image,depth:overrides[name]?.depth??entry.depth??0});
  }
  return {camera,points,image,point(name){if(!points[name])throw new Error(`Unknown landmark ${name}`);return [...points[name]];}};
}
/** Evaluate independently located feature points, not anchors lifted from the same target. */
export function landmarkError(camera, actual, targets, image) {
  const entries=Object.entries(targets).filter(([,v])=>v.score!==false);if(!entries.length)throw new Error('No scored landmarks');
  let sum=0,weight=0;const rows=entries.map(([name,t])=>{
    if(!actual[name])throw new Error(`Missing measured landmark ${name}`);finite(t.pixel,2,'target pixel');const p=projectPoint(camera,actual[name],image), error=Math.hypot(p.pixel[0]-t.pixel[0],p.pixel[1]-t.pixel[1]);
    const w=t.weight??1;if(!Number.isFinite(w)||w<=0)throw new Error('Invalid landmark weight');sum+=w*error**2;weight+=w;
    return {name,target:t.pixel,actual:p.pixel,errorPixels:error,weight:w,visible:p.visible};
  });return {rmsPixels:Math.sqrt(sum/weight),maxPixels:Math.max(...rows.map(r=>r.errorPixels)),rows,scope:'Manually annotated screen landmarks; not likeness, topology, or 3D accuracy'};
}
/** Convex envelopes deliberately ignore holes and occlusion; use as a coarse mass diagnostic only. */
export function convexHull(points){
 const p=points.map(v=>[...finite(v,2,'hull point')]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const unique=p.filter((v,i)=>!i||v[0]!==p[i-1][0]||v[1]!==p[i-1][1]);if(unique.length<3)throw new Error('Hull needs three distinct points');
 const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const half=list=>{const h=[];for(const v of list){while(h.length>1&&cross(h.at(-2),h.at(-1),v)<=0)h.pop();h.push(v);}return h.slice(0,-1);};
 const hull=[...half(unique),...half([...unique].reverse())];if(hull.length<3)throw new Error('Degenerate projected hull');return hull;
}
export function polygonArea(p){return Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;}
export function convexOverlap(a,b){
 const aa=convexHull(a),bb=convexHull(b);let output=aa;
 const side=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
 for(let j=0;j<bb.length;j++){
  const a=bb[j],b=bb[(j+1)%bb.length],input=output;output=[];if(!input.length)break;
  for(let i=0;i<input.length;i++){const p=input[i],q=input[(i+1)%input.length],sp=side(a,b,p),sq=side(a,b,q),ip=sp>=-1e-9,iq=sq>=-1e-9;
   if(ip)output.push(p);if(ip!==iq){const t=sp/(sp-sq);output.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}}
 }
 const intersection=polygonArea(output),union=polygonArea(aa)+polygonArea(bb)-intersection;
 return {iou:intersection/union,intersection,union,scope:'Projected convex mass envelopes; ignores concavities, holes, visibility and depth correctness'};
}
