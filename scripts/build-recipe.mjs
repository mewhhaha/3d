// A fresh worker per recipe avoids stale ESM dependencies and releases geometry after serialization.
import { parentPort, workerData } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { THREE, buildModel, inspect, dispose } from '../src/lib/modeling.js';
import { assetInfo } from '../src/lib/rigging.js';
try {
  const { root, module, values } = workerData, start = performance.now();
  const definition = (await import(pathToFileURL(path.join(root, module)).href)).default;
  const unknown = Object.keys(values).filter(k => !Object.hasOwn(definition.parameters || {},k));
  if(unknown.length) throw new Error(`Unknown parameters: ${unknown.join(', ')}`);
  const object = buildModel(definition,values);
  try {
    // Serialize evaluated attributes, not parametric constructors (e.g. RoundedBoxGeometry).
    // Reconstructing constructor parameters would lose authored displacement and custom topology.
    const geometries=new Map();
    object.traverse(o=>{if(o.isInstancedMesh||o.isBatchedMesh)throw new Error('Local stage requires explicit mesh instances');if(o.isMesh){const original=o.geometry;if(!geometries.has(original))geometries.set(original,new THREE.BufferGeometry().copy(original));o.geometry=geometries.get(original);}});
    geometries.forEach((_,g)=>g.dispose());
    parentPort.postMessage({ json: JSON.stringify(object.toJSON()), info: {
      id:definition.id, parameters:object.userData.parameters, stats:inspect(object), rig:assetInfo(object), buildMs:performance.now()-start,
    }});
  } finally { dispose(object); }
} catch(e) { parentPort.postMessage({error:e.stack||e.message}); }
