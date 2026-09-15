import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const input=await readFile(new URL('node_modules/three/examples/jsm/libs/mikktspace.module.js',root),'utf8');
// This adaptation is intentionally pinned to the reviewed glue, not a fuzzy patch.
const sha=createHash('sha256').update(input).digest('hex');
if(sha!=='f415ebd2f7bbe4ac06439be40d2ca4a11bb17123009bb33582176b1b21a14dac')
  throw new Error('MikkTSpace source changed: review the instance-recycling adapter before updating its checksum');
const begin=input.indexOf('function initialize() {'),end=input.indexOf('export const ready =',begin);
if(begin<0||end<0)throw new Error('Unsupported MikkTSpace module layout');
const replacement=`let compiledModule;
export function reset() {
  if (!compiledModule) throw new Error('Await ready before resetting MikkTSpace');
  wasm = new WebAssembly.Instance(compiledModule, {
    './mikktspace_module_bg.js': { __wbindgen_string_new, __wbindgen_rethrow }
  }).exports;
  cachegetUint8Memory0 = cachegetFloat32Memory0 = cachegetInt32Memory0 = null;
  isReady = true;
}
function initialize() {
  return fetch(wasmDataURI).then(res => res.arrayBuffer())
    .then(buffer => WebAssembly.compile(buffer))
    .then(module => { compiledModule = module; reset(); });
}

`;
await mkdir(new URL('src/generated/',root),{recursive:true});
const output='// Generated from pinned Three.js MIT-licensed MikkTSpace glue. See vendor/three/LICENSE and THIRD_PARTY.md.\n'
  +input.slice(0,begin)+replacement+input.slice(end);
await writeFile(new URL('src/generated/mikk-runtime.js',root),output);
console.log('Prepared bounded tangent runtime from',sha);
