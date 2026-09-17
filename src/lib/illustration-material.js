import * as THREE from 'three';

const vector=(p,label)=>{
  if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))throw new Error(`${label} needs three finite values`);
  return new THREE.Vector3(...p);
};
/** Portable PBR base plus explicit optional WebGL two-tone look. glTF exports the PBR
 * fallback and the intent metadata; external viewers need their own matching shader. */
export function twoToneMaterial({color='#efc9b3',shadow='#b78082',direction=[-.6,.8,1],threshold=.15,softness=.04}={}){
  const d=vector(direction,'light direction');if(d.lengthSq()<1e-20)throw new Error('Light direction cannot be zero');
  if(!Number.isFinite(threshold)||threshold< -1||threshold>1||!Number.isFinite(softness)||softness<=0||softness>1)throw new Error('Invalid two-tone threshold');
  const m=new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0});
  const lit=new THREE.Color(color),shade=new THREE.Color(shadow);
  m.userData.twoTone={schema:1,direction:d.normalize().toArray(),threshold,softness,tint:shade.toArray().map((v,i)=>v/Math.max(lit.toArray()[i],.001)),export:'standard PBR fallback; custom two-tone shader is not glTF'};
  hydrateTwoTone(m);return m;
}
export function hydrateTwoTone(material){
  const s=material.userData?.twoTone;if(!s)return material;
  if(!material.isMeshStandardMaterial||s.schema!==1)throw new Error('Unsupported two-tone material');
  if(vector(s.direction,'stored light direction').lengthSq()<1e-20||!vector(s.tint,'stored shadow tint').toArray().every(v=>v>=0)||!Number.isFinite(s.threshold)||s.threshold< -1||s.threshold>1||!Number.isFinite(s.softness)||s.softness<=0||s.softness>1)throw new Error('Invalid two-tone metadata');
  material.onBeforeCompile=shader=>{
    shader.uniforms.illustrationDirection={value:new THREE.Vector3(...s.direction)};
    shader.uniforms.illustrationTint={value:new THREE.Vector3(...s.tint)};
    shader.uniforms.illustrationThreshold={value:s.threshold};shader.uniforms.illustrationSoftness={value:s.softness};
    const token='#include <opaque_fragment>';if(!shader.fragmentShader.includes(token))throw new Error('Two-tone shader requires the locked r186 opaque fragment hook');
    shader.fragmentShader=`uniform vec3 illustrationDirection;\nuniform vec3 illustrationTint;\nuniform float illustrationThreshold;\nuniform float illustrationSoftness;\n`+shader.fragmentShader.replace(token,`
      vec3 keyDirection = normalize((viewMatrix * vec4(illustrationDirection, 0.0)).xyz);
      float inkLight = smoothstep(illustrationThreshold-illustrationSoftness, illustrationThreshold+illustrationSoftness, dot(normal,keyDirection));
      outgoingLight = diffuseColor.rgb * mix(illustrationTint, vec3(1.0), inkLight) + totalEmissiveRadiance;
      ${token}`);
  };
  material.customProgramCacheKey=()=>`workshop-two-tone-v1`;
  material.needsUpdate=true;return material;
}
