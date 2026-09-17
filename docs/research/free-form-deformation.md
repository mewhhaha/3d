# Research note — sparse free-form deformation cages

Accessed 2026-09-17. These notes record only techniques used to make an implementation decision for the repository's ordinary `BufferGeometry` authoring layer.

## Thomas W. Sederberg and Scott R. Parry — “Free-Form Deformation of Solid Geometric Models”

- Source: https://doi.org/10.1145/15922.15903 ; author-hosted/public scan also indexed at https://people.eecs.berkeley.edu/~sequin/CS285/PAPERS/Sederberg_Parry.pdf
- Publication: SIGGRAPH 1986, published 1986-08-31.
- Observation: the paper treats deformation as a warp of the space containing an object rather than as edits tied to the object's own primitives. Its original construction uses a trivariate tensor-product Bernstein basis over a regular lattice of control points and is intended to support intuitive global or local deformation.
- Repository adaptation: `deformationLattice()` keeps the regular undeformed cage implicit and stores only sparse control-point **offsets** plus a local frame, box ranges and 2..8 control-point resolution per axis. `latticeVertices()` evaluates the equivalent Bernstein displacement field only for points inside that authored box and blends it through the existing independent point selection.
- Test/example: a 2x2x2 cage with one edited corner must move the box center by exactly one eighth of that corner offset; a rotated cage must rotate the deformation field with its local frame. The workflow fixture then uses a 3x3x3 cage on an organic mass and an unrelated hard-surface shell without changing either source topology.
- Result: focused tests verify the Bernstein weights, frame behavior, bounded outside behavior, topology/UV/custom-attribute/face-region ownership, and JSON-safe construction data. The locked-camera study demonstrates broad asymmetric edits on both subjects with unchanged triangle/vertex counts.
- Limitation: v1 is deliberately much smaller than the paper. It does not implement arbitrary parallelepiped bases, derivative-continuity stitching between cages, extended FFD, inverse fitting, exact volume preservation or analytic normal transformation. It uses a regular handle-local box and recomputes triangle normals afterward.

## Blender Manual — Lattice and Lattice Modifier, 4.5 LTS

- Sources: https://docs.blender.org/manual/en/4.5/animation/lattice.html and https://docs.blender.org/manual/en/4.5/modeling/modifiers/deform/lattice.html
- Documentation state: Blender 4.5 LTS manual; localized 4.5 pages indexed by the web source were updated in August 2026.
- Observation: Blender describes a lattice as a non-rendering 3D grid used as a deformation cage. The modifier documentation emphasizes broad smooth edits of dense objects, independent lattice/object editing, optional vertex-group influence, and preservation of texture coordinates. Lattice data exposes per-axis control-point counts and interpolation choices.
- Repository adaptation: keep cage construction data independent from mesh topology and reuse the existing selection layer as the influence mask instead of creating another vertex-group system. Because repository recipes are code-first and should stay compact, the base regular grid is generated implicitly and only edited control points are serialized.
- Test/example: the mechanical fixture deforms only its shell geometry while a separately authored mounting foot remains rigid; the organic fixture uses the same API on a different closed mass. GLB export contains evaluated meshes, not a runtime lattice object.
- Result: the cage remains a pre-export authoring operation, so the existing render/export/validation loop needs no new runtime or Blender dependency.
- Limitation: this is not Blender Lattice compatibility. V1 exposes Bernstein interpolation only, not Blender's Linear/Cardinal/Catmull-Rom/B-Spline axis modes, Outside mode, modifier stack, parenting, or editable Blender lattice datablocks.
