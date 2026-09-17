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

## Curve-guided broad deformation

Use `deformationCurve()` plus `curveVertices()` when one circular bend is not enough. The guide is JSON-safe construction data: a small list of control points in **handle-local meters**, an explicit initial `up` vector, Catmull-Rom interpolation type/tension, and a bounded transported-frame sampling resolution. The source mesh still uses handle-local +Y as its authoring axis.

```js
import {
  deformationHandle, deformationCurve,
  taperVertices, twistVertices, curveVertices, deformGeometry,
} from '../src/lib/geometry-deform.js';

const handle = deformationHandle({ range: [-0.45, 0.45] });
const guide = deformationCurve([
  [0, -0.45, 0],
  [0.14, -0.22, 0.02],
  [-0.10, 0.02, 0.09],
  [0.12, 0.25, -0.01],
  [0.04, 0.45, 0.07],
], { up: [1, 0, 0], segments: 128 });

const routed = deformGeometry(source,
  taperVertices(selection, { handle, factor: -0.3 }),
  twistVertices(selection, { handle, angle: 20 }),
  curveVertices(selection, { handle, guide }),
);
```

The guide maps `handle.range[0]..handle.range[1]` to equal-distance positions along the centerline. The current handle-local X/Z cross-section is carried by the repository's rotation-minimizing transported frames. For a straight +Y guide with the default +X `up`, the mapping is position-identical. Points beyond either axial endpoint continue along that endpoint's transported tangent, so a bounded guide does not introduce a positional break.

This is intentionally a deformation of **existing geometry**, not a new sweep constructor. A tube/strap/appendage can retain its UVs, custom attributes, face-region identity and tessellation while its primary flow changes from straight to an S-curve or routed path. `profile-sweep.js` remains the better tool when the desired output should be newly generated from a profile and centerline.

Operation order remains meaningful. Taper or twist before `curveVertices()` changes the source cross-section before it is transported. A later sculpt/relax pass can clean local form without making the centerline part of the brush semantics.

`deformationCurve()` currently uses Three.js `LineCurve3` for two points and `CatmullRomCurve3` for longer guides. Transported frames are sampled at a declared finite `segments` count, then interpolated; this avoids Frenet-frame flips near low curvature but is still a discrete approximation. The guide does not carry per-control-point radius/tilt yet, does not preserve source axial arc length automatically when guide length differs from the handle range, and does not solve collision or self-intersection.

`studies/geometry-curve-deform.json` reuses `models/geometry-deform-study.js` for two materially different checks: an organic appendage follows a non-circular S-guide, and an unrelated service member routes through a 3D hard-surface path while its semantic flex selection and independent mounting foot remain intact.

## Share one deformation field across separately owned parts

`deformGeometry()` interprets every operation handle in that geometry's local coordinates. That is correct for a self-contained mesh, but it is awkward for a layered assembly: evaluating the same lattice separately in the shell-local, trim-local and inset-local spaces does **not** describe one spatial cage.

Use `deformGeometryInParent()` when the field belongs to the assembly instead. Pass the same placement data used by the component object. Operation handles are then evaluated in the component's parent/assembly-local coordinates, while selections remain component-local and the returned positions remain in the component's own local coordinates:

```js
import {
  deformationHandle, deformationLattice, latticeVertices,
  deformGeometryInParent,
} from '../src/lib/geometry-deform.js';

const cage = deformationLattice({
  handle: deformationHandle({ range: [-0.3, 0.3] }),
  xRange: [-0.5, 0.5], zRange: [-0.35, 0.35], resolution: [3, 3, 3],
  edits: [{ point: [2, 2, 1], offset: [0.08, 0.05, 0.02] }],
});
const shellPlacement = { position: [0, 0, 0], rotation: [0, 8, 0], scale: [1, 1, 1] };
const trimPlacement = { position: [0, 0.12, 0.14], rotation: [5, -3, 0], scale: [1, 1, 1] };
const all = () => 1;

const shapedShell = deformGeometryInParent(
  shellGeometry, shellPlacement, latticeVertices(all, { lattice: cage }),
);
const shapedTrim = deformGeometryInParent(
  trimGeometry, trimPlacement, latticeVertices(all, { lattice: cage }),
);

// Keep the same independent object transforms/materials when assembling the result.
root.add(mesh(shapedShell, { ...shellPlacement, material: shellMaterial }));
root.add(mesh(shapedTrim, { ...trimPlacement, material: trimMaterial }));
```

The placement contract matches the modeling helpers: translation in meters, XYZ rotation in degrees, and positive scalar/vector scale. The function conceptually maps each current component-local vertex into the parent space, evaluates the ordinary handle/lattice there, then maps the result back into component-local coordinates before writing the cloned `BufferGeometry`. It therefore does not bake the object transform into the geometry or require a merge.

Selections deliberately stay component-local. A named face region or local radial mask can still choose only the flexible part of one component, while the deformation field itself is shared spatially with neighboring parts. Callers may reuse the same lattice/curve/handle construction data with different per-component selections.

A regression test proves the coordinate contract by comparing two paths: (1) deform two transformed components independently with one parent-space lattice and then compose them, versus (2) compose the undeformed components first and apply the same lattice to the merged parent-space geometry. With whole-component weights their positions agree within floating-point tolerance, while the separate path retains independent geometry buffers and material/object ownership.

`models/geometry-assembly-deform-study.js` and `studies/geometry-assembly-deform.json` exercise this on a layered organic mass (skin, crest and collar) and an unrelated hard-surface housing (shell, rail and service inset). Rigid socket/mounting parts are intentionally excluded, demonstrating that field membership remains an authoring decision rather than an automatic scene-graph effect.

This is a **single parent-space** contract, not a full scene dependency graph. Nested hierarchies require the caller to provide the component transform relative to the chosen deformation parent. The helper does not traverse `Object3D` trees, mutate object transforms, infer which siblings belong to the field, transport rigs/morphs, or export a runtime lattice modifier. Non-uniform positive component scales are supported through the explicit placement transform; zero/reflected scales are rejected.
