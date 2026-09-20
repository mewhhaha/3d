import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {verifyXbot} from './prepare-xbot.mjs';
/** Local-only loading; downloads are an explicit preparation step. */
export async function loadXbot(){
 const bytes=await readFile(new URL('../vendor-src/mixamo-example/Xbot.glb',import.meta.url));
 const provenance=verifyXbot(bytes);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 gltf.scene.userData.sourceAsset=provenance;return gltf;
}
