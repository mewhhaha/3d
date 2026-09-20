import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Optional third-party evaluation input. Not required by gallery/default recipes.
export const source={
 url:'https://raw.githubusercontent.com/mrdoob/three.js/148ef33ecb6d2502ff796d4554abd1549c95d519/examples/models/gltf/Xbot.glb',
 blob:'3805d73e7c9cecef16f69dd0b0f1ce649f69c653',bytes:2930032,
 attribution:'Adobe/Mixamo Xbot, distributed as the Three.js r186 additive-skinning example. Not an original workshop mesh or a general asset redistribution license.',
 example:'https://threejs.org/examples/webgl_animation_skinning_additive_blending.html',
 terms:'https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html',
};
export function verifyXbot(bytes){
 const blob=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
 if(bytes.length!==source.bytes||blob!==source.blob)throw new Error('Xbot sample does not match the pinned public example');
 return { ...source,sha256:createHash('sha256').update(bytes).digest('hex') };
}
export async function prepareXbot(directory='vendor-src/mixamo-example'){
 await mkdir(directory,{recursive:true});const path=directory+'/Xbot.glb';let bytes;
 try{bytes=await readFile(path);}catch(error){if(error.code!=='ENOENT')throw error;}
 if(!bytes){
  const response=await fetch(source.url,{signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw new Error(`Xbot download failed: ${response.status}`);
  bytes=Buffer.from(await response.arrayBuffer());
 }
 const provenance=verifyXbot(bytes);await writeFile(path,bytes);
 await writeFile(directory+'/source.json',JSON.stringify(provenance,null,2));
 console.log(JSON.stringify(provenance,null,2));return path;
}
if(process.argv[1]===fileURLToPath(import.meta.url))await prepareXbot(process.argv[2]);
