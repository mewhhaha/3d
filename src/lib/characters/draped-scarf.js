import { THREE, group } from '../modeling.js';
import { stage } from './core.js';
import { projectMesh, clearSurface } from './surface-fitting.js';
import { drapeRibbon, sumFields, foldWaves, fadeEdges } from './fabric.js';

/** Compose a cloth wrap from folds, draping and garment clearance. */
export function scarf({ color = '#81705b', folds = sumFields(foldWaves({ count: 4, amplitude: .0028, skew: 2 }), fadeEdges(foldWaves({ count: 9, amplitude: .0012, skew: -1 }))) } = {}) {
  return stage('woven-scarf', ctx => {
    const mat = ctx.material('cloth', color), neck = ctx.anchor('neck');
    const shirt = ctx.parts.find(p => p.object.name === 'FieldShirt')?.object;
    const clear = clearSurface(shirt ? projectMesh(shirt) : ctx.frontAt, {clearance:.009});
    const wrap = drapeRibbon({ name: 'ScarfWrap', material: mat, folds,
      conform: p => p[2] > neck.z + .025 ? clear(p) : p,
      path(u) {
        const a = 2 * Math.PI * u, front = Math.max(0, Math.cos(a));
        return [.069 * Math.sin(a), neck.y + .009 - .027 * front + .003 * Math.sin(2 * a), .010 + .070 * Math.cos(a)];
      },
      width: u => .063 + .022 * Math.max(0, Math.cos(2 * Math.PI * u)),
    });
    const guide = new THREE.CatmullRomCurve3([
      [-.029, neck.y - .008, .088], [-.041, neck.y - .070, .117],
      [-.018, neck.y - .150, ctx.frontAt(-.018, neck.y - .150) + .032],
      [-.024, neck.y - .184, ctx.frontAt(-.024, neck.y - .184) + .032],
    ].map(p => new THREE.Vector3(...p)));
    const tail = drapeRibbon({ name: 'ScarfTail', path: u => guide.getPoint(u).toArray(),
      width: u => .074 * (1 - .25 * u), across: [1, 0, 0], material: mat,
      folds: sumFields(fadeEdges(foldWaves({ count: 3, amplitude: .003, skew: .3 })), foldWaves({ count: 7, amplitude: .0006 })),
      segments: 64, conform: clear,
    });
    ctx.add(group('WovenScarf', [wrap, tail]), 'Chest');
  });
}
