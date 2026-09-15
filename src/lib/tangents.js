import { computeMikkTSpaceTangents } from 'three/addons/utils/BufferGeometryUtils.js';
import * as runtime from '../generated/mikk-runtime.js';
await runtime.ready;
let resets=0,calls=0,peakBytes=0;
/** Keep the exact Mikk algorithm but recycle its scratch instance between calls. */
export function computeTangents(geometry,{memoryBudget=32*1024*1024}={}) {
  if(!Number.isSafeInteger(memoryBudget)||memoryBudget<1024*1024)throw new Error('Invalid tangent memory budget');
  if(runtime.wasm.memory.buffer.byteLength>memoryBudget){runtime.reset();resets++;}
  // The upstream bridge returns a copied Float32Array, not a live Wasm view.
  const result=computeMikkTSpaceTangents(geometry,runtime,true);
  calls++;peakBytes=Math.max(peakBytes,runtime.wasm.memory.buffer.byteLength);return result;
}
export const tangentRuntimeStats=()=>({calls,resets,peakBytes,currentBytes:runtime.wasm.memory.buffer.byteLength});
