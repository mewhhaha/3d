import { defineModel } from '../src/lib/modeling.js';
import {
  composeCharacter, anatomy, portrait, wear, fieldShirt, cargoTrousers,
  hikingBoots, fingerlessGloves, scarf, tiedBun, equip, utilityBelt, backpack,
  animate, idle, walk, wave,
} from '../src/lib/characters.js';
export default defineModel({
  id: 'reference-explorer', title: 'Explorer / anatomical rebuild',
  description: 'A reference-guided adult explorer composed from an anatomical CC0 base, fitted garments, strand hair, equipment, skin weights and animation. An approximation, not a scan or a photoreal likeness.',
  parameters: {
    quality: { type:'select', options:['draft','studio','fine'], default:'studio', label:'Detail' },
    height: { type:'number', min:1.55, max:1.9, step:.01, default:1.72, label:'Body stature (m)' },
    shirt: { type:'color', default:'#555747', label:'Field shirt' },
    trousers: { type:'color', default:'#655f50', label:'Cargo trousers' },
    backpack: { type:'boolean', default:true, label:'Backpack' },
    hair: { type:'number', min:0, max:1, step:.1, default:.65, label:'Loose hair' },
  },
  build: p => composeCharacter({ name:'ReferenceExplorer', height:p.height, quality:p.quality },
    anatomy({ build:'athletic', skin:'#b98168' }),
    portrait({ eyes:'#655131' }),
    wear(fieldShirt({ color:p.shirt, fit:'relaxed' }), cargoTrousers({ color:p.trousers }), hikingBoots(), fingerlessGloves(), scarf()),
    tiedBun({ looseness:p.hair }),
    equip(utilityBelt(), p.backpack && backpack()),
    animate(idle(), walk(), wave()),
  ),
});
