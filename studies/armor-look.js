import {material} from '../src/lib/modeling.js';
import {indexedColorTexture} from '../src/lib/indexed-texture.js';
import swatches from './data/armor-study-swatches.json' with {type:'json'};
export function armorLook(textured=false) {
 const shell=material('#ede9df',{roughness:.58,metalness:.06});shell.name='Blockout enamel';
 const dark=material('#182124',{roughness:.7,metalness:.08});dark.name='Flexible graphite';
 if(textured){shell.color.set('#ffffff');shell.map=indexedColorTexture(swatches.swatches.enamel);dark.color.set('#ffffff');dark.map=indexedColorTexture(swatches.swatches.rubber);}
 return {shell,dark,edge:material('#38474b',{roughness:.4,metalness:.5}),orange:material('#f36332',{roughness:.48,metalness:.03})};
}
