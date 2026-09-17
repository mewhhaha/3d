# Sparse free-form deformation lattice

Use `deformationLattice()` plus `latticeVertices()` when an ordinary indexed `BufferGeometry` already has useful topology but a single bend axis or centerline is the wrong abstraction for the primary-form change. The lattice makes a broad asymmetric volume edit while the existing selection layer still answers where influence applies.

```js
import {
  deformationHandle, deformationLattice, latticeVertices, deformGeometry,
} from '../src/lib/geometry-deform.js';

const handle = deformationHandle({
  origin: [0, 0.05, 0],
  rotation: [0, 0, -6],
  range: [-0.25, 0.25],
});
const cage = deformationLattice({
  handle,
  xRange: [-0.4, 0.4],
  zRange: [-0.25, 0.25],
  resolution: [3, 3, 3],
  edits: [
    { point: [0, 2, 1], offset: [-0.07, 0.06, 0.00] },
    { point: [1, 2, 2], offset: [ 0.01, 0.04, 0.08] },
    { point: [2, 1, 1], offset: [ 0.06, 0.00, 0.00] },
  ],
});
const shaped = deformGeometry(source, latticeVertices(selection, { lattice: cage }));
```

## Construction contract

The undeformed cage is an implicit regular grid in a handle-local box. `deformationHandle()` owns translation, XYZ-degree rotation, positive scale and the local Y interval; `xRange` and `zRange` complete the box. `resolution` is bounded to 2..8 control points per axis. Recipes serialize only sparse `{ point:[i,j,k], offset:[x,y,z] }` edits, so the abstraction does not hide either a mesh-sized vertex table or a full regular cage table behind a wrapper.

For each selected source point inside the box, the helper normalizes its local U/V/W position and evaluates the trivariate Bernstein displacement field implied by the control-point resolution. A 2x2x2 cage is trilinear; higher resolutions raise the per-axis degree and let control edits act more locally. Points outside the authored box are identity in this bounded first version. Fractional sculpt/face-region/path selections blend the current point toward the full lattice result independently of the cage math.

This is a space warp of **existing** geometry. Use `curveVertices()` when an editable centerline directly expresses the design; use sculpt masks/brushes for surface-local pushes and grooves; use a profile/sweep constructor when new topology should actually be generated.

## Ownership and export

`latticeVertices()` is an operation for the existing `deformGeometry()` pipeline. The output remains ordinary indexed `BufferGeometry`: topology, UVs, ordinary custom attributes and topology-valid named face regions stay owned by the clone. Normals and bounds are rebuilt, and existing tangents are rebuilt when UV ownership permits it. Skin attributes and morph targets remain rejected because this stage does not own a rig or morph refit.

The cage is repository construction data, not an exported runtime modifier. GLB receives the evaluated mesh, so the local Chromium/Three.js render loop, Khronos glTF validation and downstream Blender import need no lattice-specific runtime dependency.

`models/geometry-lattice-study.js` and `studies/geometry-lattice.json` exercise the same API on two materially different subjects: a closed asymmetric organic mass and a hard-surface service shell whose mounting foot stays independently authored.

## Limitations

V1 is a compact regular-box Bernstein FFD, not Blender Lattice compatibility or a physical solver. It does not implement B-spline/Cardinal/Catmull-Rom lattice interpolation, arbitrary parallelepiped bases, editable cage visualization, Outside mode, derivative-continuity stitching between cages, inverse fitting, exact volume preservation, collision/self-intersection prevention, or analytic normal transformation. Hard transitions can occur if an edited cage meets unchanged geometry at the box boundary without an appropriate soft selection or unchanged boundary controls. Strong edits remain tessellation-dependent at silhouette/shading level even though topology itself is preserved.
