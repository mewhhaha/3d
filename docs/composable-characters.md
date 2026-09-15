# Composable character authoring

The anatomical rebuild is `models/reference-explorer.js`. The older `field-explorer` and `rigged-explorer` remain for comparison. This changes the anatomical foundation rather than merely adding polygons to the old approximation.

## A recipe composes operations

```js
import {
  composeCharacter, anatomy, portrait, wear, fieldShirt, cargoTrousers,
  hikingBoots, fingerlessGloves, scarf, tiedBun, equip, utilityBelt,
  backpack, animate, idle, walk, wave,
} from '../src/lib/characters.js';

return composeCharacter({ height: 1.72, quality: 'studio' },
  anatomy({ build: 'athletic', skin: '#b98168' }),
  portrait({ eyes: '#655131' }),
  wear(fieldShirt(), cargoTrousers(), hikingBoots(), fingerlessGloves(), scarf()),
  tiedBun({ looseness: 0.7 }),
  equip(utilityBelt(), backpack()),
  animate(idle(), walk(), wave()),
);
```

Use this body in a `defineModel(...).build` function. Components can be omitted. `anatomy()` must precede components that depend on surfaces or landmarks. `wear(...)` and `equip(...)` accept arrays and false/null entries for conditional components. Outputs remain ordinary Three.js objects.

`height` means anatomical stature before hair and accessories, not the final bounding-box height. The source basis is 1.72 m. Draft uses the source cage; studio/fine subdivide the connected quad surface before splitting UV seams. Fine increases strand count and texture resolution, not the accuracy of the reference match.

## Reusable relationships

`anatomy()` supplies connected body/face/hand topology, UVs, landmarks and source skin weights. It compiles pinned CC0 MakeHuman graphical assets, not MakeHuman application code. Exact provenance and checksums are in `THIRD_PARTY.md` and `scripts/prepare-anatomy.py`.

`fitSurface(ctx, options)` selects a region of that surface, offsets it for garment ease, composes geometric fold displacement, transfers UVs/weights, and suppresses covered body faces. It is not a cloth simulator or arbitrary-mesh wrapping solver. `ctx.frontAt(x,y,side)` now uses barycentric triangle projection, not discontinuous nearest-vertex sampling. Non-surface helper geometry is excluded.

`portrait()` places eyes and brows from landmarks; the face, ears and hands come from the anatomical foundation. `tiedBun()` composes scalp coverage, strand groups, a bun and loose locks. Garments and accessories share materials within one build, while separate builds own their resources. Tiled texture scales differ for skin, cloth and leather.

`animate()` takes clip builders. `idle()` only adds a breathing track when a component supplies that morph, so removing the shirt does not leave an invalid animation target. Surface garments inherit body weights; many small rigid details still use semantic bone attachments.

## Extending the vocabulary

`stage(name, run)` and `fitSurface` are extension points. A reusable garment function encapsulates selection, fitting, material and attachment rules; the recipe only chooses meaningful options.

```js
import { stage, fitSurface, compressionFolds } from '../src/lib/characters.js';
export function fittedSleeves({ color = '#555747' } = {}) {
  return stage('fitted-sleeves', ctx => {
    const elbow = ctx.anchor('l-elbow');
    fitSurface(ctx, {
      name: 'FittedSleeves', color, ease: 0.012,
      select: (point, face) => face.ids.some(index =>
        ctx.body.weights[index].some(([bone, weight]) =>
          /UpperArm|Forearm/.test(bone) && weight > 0.5)),
      folds: compressionFolds({ at: elbow.y, width: 0.08, depth: 0.002 }),
    });
  });
}
```

This is one adult anatomical archetype plus a component vocabulary, not a universal human/creature generator. New proportions need fitting and deformation review. Internal component implementations still contain measurements; shared topology, landmarks, fitting, UVs and weights keep those measurements out of each recipe.

## Lighting and review

The viewer has Studio, Soft daylight and Rim/silhouette presets plus exposure. Key/fill/rim lights and shadows fit model bounds and stay outside the exportable root. Face, Hand and Boots buttons provide close-ups. Browser hooks include `studio.frameDetail('face')`, `studio.setLighting('dramatic')`, `studio.lightingInfo()` and the existing UV/material/animation controls.

`npm run review:reference` captures full-body views, detail views, alternate lighting and a posed frame, then validates the GLB. Review images are actual Three.js renders, never generated concept art. `scripts/blender_reference.py` checks real imported bone deformation, UVs, textures, actions and morphs, saves a packed .blend with three area lights and a camera, reopens it, and renders in CPU Cycles. CI default native files are also copied into the published model folder; browser parameter edits only change the live GLB export.

## Pain points found through renders

The first pass exposed stepped projection artifacts on collars/straps, kinked hair curves, oversized skin/fabric noise and a canvas that grew with the inspector. The shared projector, continuous hair envelope, material scale and desktop layout were corrected instead of adding per-recipe coordinate patches.

Remaining limitations include source-face likeness, cloth silhouettes, cut boundaries, hair clump shape, surface wear and deformation of rigid clothing details. Procedural noise and triangle count do not reproduce all the reference's wrinkles or strand flow. Materials use tiled PBR maps and inherited UVs, not reference-projected textures or a uniquely baked atlas. The walk is an illustrative in-place cycle, not contact-solved motion.

GLB contains triangulated geometry, UVs, weights, morphs and clips. Native Blender files contain editable imported meshes, armatures, actions and packed maps, but not a reconstruction of JS operations as Blender modifiers. Tests do not establish photorealism, watertightness, collision-free cloth or a production facial rig.
