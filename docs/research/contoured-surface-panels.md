# Curved support, independent contour, separate shell thickness

Accessed 2026-09-17.

- Three.js, **ShapeUtils**, https://threejs.org/docs/pages/ShapeUtils.html :
  the primary manual defines 2D contour winding/area and triangulation returning
  triangle indices. Checked against locked r186 `src/extras/ShapeUtils.js`.
  Adaptation: triangulate a concave UV contour, midpoint-refine shared edges in
  that domain, then evaluate the original curved support. The library routine
  does not itself wrap a 3D surface or guarantee a quality triangle mesh.
- Blender **Solidify Modifier**, 4.5 LTS,
  https://docs.blender.org/manual/id/4.5/modeling/modifiers/generate/solidify.html :
  readable English body documents offset, generated rims, nonuniform local-scale
  implications, and limitations of even-thickness approximations. Adaptation:
  reuse this project's `solidifyGeometry` as a separate step, preserving the
  authored outer surface with offset -1. Do not claim a new thickness solver.

Concrete authoring pain: the existing longitudinal `surfaceBand` is useful but
cannot express an arbitrary scalloped chest plate or side-entry hatch notch.
Extruding a flat drawing then bending it by recipe-local offsets makes the
rim, supporting body and mounted details drift apart. A UV contour evaluated
on one support removes that duplication without implementing booleans/remesh.

Tests check the concave area/notch, positive winding, curved support evaluation,
unit normals, independent buffers, fixed rounded-boundary samples across
refinement levels, invalid loops, and closed offset-shell geometric edges.
Examples use an asymmetric ribcage/waist/pelvis assembly and a curved mechanical
hatch. Detailed visual/export results belong to the containing checkpoint and
`renders/torso-review/review.json`, not to these external sources.

Limitations: one simple loop, no holes, no metric fillet, no continuous collision
or global fold detection, no automatic likeness. No inaccessible video content
or downloaded tutorial asset is used.
