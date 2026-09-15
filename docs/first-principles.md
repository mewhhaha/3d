# First-principles component studies

The explorer reference is the design target, not a claim that a complete photoreal character has been rebuilt. New `src/lib/forms/` geometry is procedural: no MakeHuman vertices, scans or image-projected textures. The older anatomical explorer is preserved separately.

## Composition

```js
import { hand, palm, fingers, opposingThumb, skinDetail, forearm, buildHand }
  from '../src/lib/forms/hand.js';
const form = hand(
  palm({ breadth: 1, arch: 0.45 }),
  fingers({ spread: 0.3, curl: 0.1 }),
  opposingThumb({ reach: 1 }),
  skinDetail({ creases: 1, pores: 0.4 }),
);
const model = buildHand(forearm({ length: 0.255 }, form), {
  mode: 'baked', textureSize: 256,
});
```

The compiler derives shared digit centers, connections, skin and bone landmarks. Components describe separate concerns; changing detail representation does not require rewriting anatomy. Underneath, shape and detail also compose:

```js
const detail = layers(
  crease({ from: [0.28, 0.43], to: [0.72, 0.45], depth: 0.00025 }),
  mound({ at: [0, 0.43], radius: [0.16, 0.035], height: 0.00035, wrapU: true }),
  grain({ amplitude: 0.000015, frequency: 28, seed: 3 }),
);
const chart = surface(shapeFunction, { detail, wrapU: true });
const part = surfaceMesh('Digit', chart, {
  mode: 'baked', segments: [20, 28], textureSize: 256,
});
```

The eye study reuses this kernel:

```js
buildEye(eye(
  eyeball({ radius: 0.014 }),
  eyelids({ openness: 1, tilt: 0.05 }),
  iris({ color: '#67553b', pupil: 0.38 }),
), { mode: 'baked' });
```

The eye is an orbital patch, not a face or facial rig. No blink rig, refractive cornea, tear simulation or measured likeness is supplied.

## Render-driven changes

The first hand had a flat palm rim, rectangular thumb transition and pointed fingertips despite passing connectivity tests. `fairJoin()` creates a shared geometric graph while retaining independent UV/material corners, performs locally masked alternating smoothing steps and rebuilds angle-weighted normals. `roundOpening()` rounds the chart-aligned thumb port before the bridge samples it. `roundedTipSampling()` spends more of a fixed triangle budget on the fingertip. The knuckle bridge rises from the palm rather than placing all its boundaries in one plane.

Separate UV charts/materials preserve editable parts. Skin is geometrically joined across them; it is not a single welded Blender object. Five nail plates remain separate. The hand has 17 deformation joints derived from the same paths as geometry, with explicit weight ramps. Grasp and WristFlex are illustrative clips, not contact-correct animation. The thumb does not perform a complete grasp. Smoothing is not retopology or anatomy inference, and extreme poses can pinch or intersect.

## High-to-low contract

- `sculpt`: denser geometry with displacement evaluated on vertices.
- `cage`: reduced base geometry without transferred detail.
- `baked`: the same reduced geometry as cage plus tangent-space normal maps.

Triangle reduction is coarser sampling of corresponding charts, not arbitrary decimation. Silhouette and broad forms stay in the base surface.

For unmodified surfaces, the source normal is evaluated analytically. After hand fairing, the source is the **actual faired high mesh**, sampled through its UV triangles. Each low triangle is rasterized in UV space; its interpolated MikkTSpace frame converts the high normal into texture values:

```
local = [dot(highNormal, tangent), dot(highNormal, bitangent), dot(highNormal, lowNormal)]
RGB = round((local * 0.5 + 0.5) * 255)
```

Maps are linear/Non-Color and embedded in GLB. Iris color is separately tagged sRGB. Each chart owns a texture, avoiding atlas overlap. Cut borders get two texels of padding. Atlas packing and compression are not implemented.

This is **UV-correspondence baking**, not Blender selected-to-active ray baking. It does not accept arbitrary unrelated high/low meshes. A normal map cannot preserve a different outline, parallax, geometric self-shadowing or large displacement. Full-character baking, hair-card conversion and automatic retopology are not implemented here.

## Tests and interpretation

`comparison.json` records revision, actual triangle counts, validator results, GLB hashes, bone/UV/texture counts and normal-map diagnostics. The normal error metric decodes quantized pixels back through their low tangent frames and compares them with high normals **at texel centers**. It measures encoding correctness, not filtered rendering error, all animation poses, visual likeness or anatomical accuracy.

`auditSeams()` checks shared rest positions, connected components, edge incidence and winding at a stated weld tolerance. Nail plates are excluded intentionally. This is not a self-intersection check, production quad-topology guarantee or printability certificate.

Open `/3d/src/anatomy-lab.html` after deployment. The existing gallery also discovers anatomy-hand and anatomy-eye. The lab compares representations, views, poses, skeletons and exports selected GLBs.

```sh
node --test tests/*forms.test.js
npm run build
node scripts/review-anatomy.mjs
blender --background --factory-startup --python-exit-code 1 \
  --python scripts/blender_anatomy.py -- dist/assets/anatomy-hand native-anatomy
```

The independent Anatomy component studies workflow saves anatomy-studies before native verification, then anatomy-blender. Blender checks imported deformation/restoration, UVs, normal textures and actions; packs images, saves/reopens lit scenes and renders them. A written or queued script is not a passed test: inspect actual reports and images.

Before character integration, improve palm-web silhouette, pinching, anatomical asymmetry, nail fit and material variation. Full arms/elbows, whole-body skeletal landmarks, facial loops/expressions, guide-based hair, garment construction and character-wide LOD budgets remain dedicated future studies. They are not silently implemented by naming a function humanoid().
