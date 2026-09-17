# Local deformation handles for ordinary BufferGeometry

Use `src/lib/geometry-deform.js` when an ordinary indexed triangle mesh already has the right topology but its **primary silhouette** needs a broad bend, twist or taper. This layer complements `geometry-sculpt.js`: sculpt selections answer *where* influence applies, while a deformation handle describes the local axis/range and the operation describes *how* the form changes.

```js
import { faceRegionSelection } from '../src/lib/geometry-sculpt.js';
import {
  deformationHandle, bendVertices, twistVertices, taperVertices, deformGeometry,
} from '../src/lib/geometry-deform.js';

const handle = deformationHandle({
  origin: [0, -0.18, 0],
  rotation: [0, 0, -8],
  scale: [1, 1, 1],
  range: [-0.35, 0.42],
});
const flex = faceRegionSelection(bracket, 'bracket.flex');
const shaped = deformGeometry(
  bracket,
  taperVertices(flex, { handle, factor: -0.18 }),
  twistVertices(flex, { handle, angle: -30 }),
  bendVertices(flex, { handle, angle: -55 }),
);
```

## Handle contract

`deformationHandle()` is independently editable construction data. Translation is in geometry-local meters, rotation uses repository-standard XYZ degrees, scale must stay positive, and `range: [start, end]` is measured along handle-local **+Y**. V1 fixes the deformation axis to +Y on purpose: rotate the handle instead of adding axis-specific branches to every operation.

Bend maps the handle centerline to a circular arc. Points before `range[0]` remain unchanged; points past `range[1]` continue rigidly along the end tangent, avoiding a positional discontinuity at the end of the bend. Twist rotates X/Z around local +Y and clamps to the total angle after the range. Taper linearly scales the local X/Z cross-section from 1 at the start to `1 + factor` at and after the end; factors must remain above `-1` so the cross-section never collapses or reflects.

Selections are evaluated separately using the ordinary `geometry-sculpt.js` point-domain vocabulary. A zero-weight vertex stays position-identical. Fractional weights blend between the current point and the fully deformed point, making semantic face-region boundaries and soft masks usable without changing topology.

## Sequential composition

Operations are applied in order to the current geometry while reusing whichever handle each operation declares. This is useful for compact hierarchical construction such as taper → twist → bend. It is not a claim that every order is equivalent: changing the sequence intentionally changes the result, just as composing transforms in a different order does.

Use one handle for related broad intent when practical, or several handles when the design genuinely has separate deformation zones. Keep path/radial/semantic selection data independent so later authors can reshape influence without rewriting bend/twist/taper coordinates.

## Ownership and export

`deformGeometry()` clones the source and preserves its index, UVs and ordinary custom attributes. Because topology is unchanged, named face-region metadata stays valid. Vertex normals and bounds are rebuilt; if the source owns tangents, UVs are required and tangents are rebuilt after the deformation.

Skin attributes and morph targets are rejected. Moving rest positions while pretending old rig/morph data is still semantically correct would violate the repository's ownership contract. Apply broad deformation before rig/morph authoring or add a future explicit refit stage that owns those dependencies.

The result is ordinary `BufferGeometry`, so the existing render/export loop and GLB validation need no special runtime modifier support. The authoring handle itself is repository construction data and is not exported as a glTF modifier.

## What this replaces

Before this layer, changing a straight limb-like primitive into a deliberate arc or torsion on ordinary geometry meant chains of `pullVertices()` edits, repeated radial masks, or one-off coordinate loops inside a recipe. The handle makes the primary edit one reusable operation that can be repositioned/rotated/scaled independently of the mesh and can reuse the same semantic selection as later sculpt cleanup.

`models/geometry-deform-study.js` and `studies/geometry-deform.json` provide two regression subjects: a creature tendril uses taper/twist/bend on a closed cylinder, while a hard-surface service bracket uses the same vocabulary on a named flexible region while retaining an independent foot.

## Current limitations

This is a compact analytic deformation layer, not Blender Simple Deform, FFD, a lattice cage, elasticity or collision-aware bending. V1 has one local axis (+Y), no Stretch mode, no per-axis taper locks, no exact volume preservation, and no automatic self-intersection prevention. Strong bends can still fold coarse meshes; the result depends on source tessellation. Fractional selection weights interpolate point positions rather than solving a physically smooth transition. Normals are recomputed from triangles instead of using an analytic deformation Jacobian. Rig/morph refitting and topology-changing remap remain separate explicit stages.
