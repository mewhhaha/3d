# Arm study: compose structure, shape, joins and detail

This extends the first-principles hand/eye studies, not the template-derived explorer. The arm and hand geometry is procedural. Dimensions are authored working proportions, not measurements recovered from the generated character image. This is a component study, not a completed realistic character.

## Recipe-level composition

```js
import { arm, upperArm, elbow, buildArm } from '../src/lib/forms/arm.js';
import { hand, palm, fingers, opposingThumb, skinDetail, forearm }
  from '../src/lib/forms/hand.js';

const definition = arm(
  upperArm({ tone: 0.5 }),
  elbow({ definition: 0.5 }),
  forearm({ length: 0.255 }, hand(
    palm({ arch: 0.45 }),
    fingers({ spread: 0.3 }),
    opposingThumb(),
    skinDetail({ creases: 1, pores: 0.4 }),
  )),
);

const high = buildArm(definition, { mode: 'sculpt' });
const low = buildArm(definition, { mode: 'baked', textureSize: 256 });
const comparison = buildArm(definition, { mode: 'cage' });
```

Choose parts and concerns, not lists of mesh vertices. Underneath, `jointChain(link(...))` derives named skeletal landmarks once. `contour()` gives shape-preserving cubic profiles, `radialMass()` adds broad asymmetric forms, and `sectionLoft()` composes them into one continuous shoulder-to-wrist chart. These are smaller reusable operations rather than an opaque `makeHuman()` function.

The hand advertises a wrist port. The arm matches its boundary and replaces its temporary end cap; bone weights are remapped by joint name to one 19-joint skeleton. ElbowFlex and ForearmTurn compose with the hand's Grasp and WristFlex clips. Five nail plates stay separate.

## Geometry before texture

An early render exposed a straight palm rim and a dark wrist seam. The palm now uses a rounded rectangular crown with staggered digit roots. `stitchFrames()` shares the normal at the wrist across separate charts, keeping UVs, vertices and weights unchanged. Baking happens only after this join. The source is the actual high mesh after fairing and frame stitching, not an unrelated noise map.

`sculpt` samples more densely with displacement. `cage` samples the base at lower density. `baked` has exactly the same positions, normals, UVs, tangents and skin weights as cage, plus embedded tangent-space normal textures. Large forms remain geometry. The native rig is shared across representations.

Reduction is corresponding chart resampling, not arbitrary decimation or automatic retopology. Normal maps cannot fix silhouette, collapsed joints, missing volume, geometric shadows or parallax. This implementation has separate chart textures, not an optimized packed atlas or universal LOD generator.

## Measure what survives

`measureBake(lowGeometry, highGeometry, normalTexture)` takes deterministic area-weighted samples at locations independent of the bake's texel centers. It bilinearly filters the RGBA8 texture and decodes the result in the low triangle's tangent frame before comparing against high-mesh normals. The report includes mean, 95th-percentile and worst sampled angular error, both with and without the map. This is rest-pose level-zero sampling, not a photographic-likeness, BRDF, mipmap or animation-quality score.

`scripts/measure-arm.mjs` also asserts exact cage/baked attribute equality and reports triangle counts and geometric edge incidence. An earlier smooth-arm bake made the average error slightly worse from quantization even while reducing its worst errors; tests must report such tradeoffs rather than assume every bake improves every metric.

## Repeatable iteration

The browser previously exhausted tangent-generator scratch memory during repeated high-detail builds. `scripts/prepare-tangents.mjs` derives a generated runtime from checksum-pinned Three.js glue. Only instance initialization changes; the Mikk algorithm and glTF handedness stay unchanged. `computeTangents()` recycles the scratch instance between calls after a memory threshold. A single large call may exceed that threshold. Tests compare the output exactly against the upstream implementation and check that old result buffers survive resets.

```sh
npm run prepare:tangents
node --test tests/*forms.test.js
node scripts/measure-arm.mjs
npm run build
node scripts/review-anatomy.mjs
```

The ordinary npm test/build/dev hooks prepare the tangent runtime automatically. The component workflow saves comparisons before native verification. Native Blender tests check actual finger/elbow deformation and restoration, UVs, Non-Color normal textures, packing, save, reopen and a three-light render. Cite completed reports, not just configured steps.

## Remaining modeling work

The shoulder is a capped study cut, not a torso junction. The palm/webbing and thumb silhouette, muscle transitions and nail fit still require visual refinement. Linear skinning can pinch at the elbow and finger bases. Forearm twist is a deformation approximation, not a two-bone anatomical simulation. Skin is a basic PBR material, not realistic layered skin. First-principles whole-body anatomy, facial loops/expressions and guide-based hair remain separate studies. Nothing here silently replaces the older explorer.
