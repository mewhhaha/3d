import { THREE } from '../modeling.js';
/** Sample a connected surface radially; guides follow actual anatomy, not an ellipsoid. */
export function radialSurface(surface, { centerZ = 0, minY = -Infinity, step = .006 } = {}) {
  if (!Number.isFinite(centerZ) || !Number.isFinite(step) || step <= 0) throw new RangeError('Invalid radial sampler');
  const bins = new Map();
  for (const face of surface.faces) for (let i=1;i<face.ids.length-1;i++) {
    const triangle = [face.ids[0],face.ids[i],face.ids[i+1]].map(j=>new THREE.Vector3(...surface.points[j]));
    const low=Math.min(...triangle.map(p=>p.y)), high=Math.max(...triangle.map(p=>p.y));
    if(high<minY)continue;
    for(let y=Math.floor(low/step);y<=Math.floor(high/step);y++){if(!bins.has(y))bins.set(y,[]);bins.get(y).push(triangle);}
  }
  const cache=new Map(),hit=new THREE.Vector3();
  return (angle,y,padding=0) => {
    if(![angle,y,padding].every(Number.isFinite))throw new RangeError('Non-finite surface sample');
    const key=`${angle.toFixed(6)},${y.toFixed(6)}`;
    const direction=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
    let distance=cache.get(key);
    if(distance===undefined){
      const ray=new THREE.Ray(new THREE.Vector3(0,y,centerZ),direction);distance=-Infinity;
      for(const [a,b,c]of bins.get(Math.floor(y/step))||[])if(ray.intersectTriangle(a,b,c,false,hit))distance=Math.max(distance,hit.distanceTo(ray.origin));
      if(!Number.isFinite(distance))throw new Error(`No radial surface at height ${y}`);
      cache.set(key,distance);
    }
    return new THREE.Vector3(0,y,centerZ).addScaledVector(direction,distance+padding).toArray();
  };
}
