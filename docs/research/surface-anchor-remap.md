# Surface-anchor remap through owned topology changes

Accessed 2026-09-17. Project dependency: Three.js r186 (`0.186.0`). This note records only the points used for the bounded anchor-remap implementation; it is not a substitute for the source material.

## Blender 4.5 LTS — Extrude Mesh node

Source: https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/mesh/operations/extrude_mesh.html (Blender Foundation, 4.5 LTS manual; publication date not stated).

Observation: the node exposes generated **Top** and **Side** selections and documents explicit propagation rules. In face mode, new faces/corners copy values from corresponding extruded faces/corners rather than rediscovering those relationships geometrically after the operation.

Repository adaptation: when `solidifyGeometry()` already owns the source-face and source-corner relationship, anchor remapping should consume that exact construction provenance. The generic `remapSurfaceAnchor()` therefore takes an explicit target triangle plus a target-corner → source-corner permutation. `remapSolidifyAnchor()` supplies the known outer identity permutation and inner reversed-winding permutation.

Test/example/result: a source anchor on a guide-swept leaf maps from source face 213 to outer face 213 and inner face 485 after solidification; a panel anchor maps from source face 60 to outer face 60 and inner face 172. Unit tests verify barycentric and tangent-weight permutation on the reversed inner winding.

Limitation: Blender's node has broader attribute-domain propagation and extrusion modes. This repository change remaps only one rigid surface anchor; it does not claim general Geometry Nodes attribute propagation.

## Blender 4.5 LTS — Solidify modifier

Source: https://docs.blender.org/manual/en/4.5/modeling/modifiers/generate/solidify.html (Blender Foundation, 4.5 LTS manual; publication date not stated).

Observation: Solidify distinguishes generated shell/rim geometry, positions the result using an offset relative to the original surface normal, and explicitly describes the simple algorithm as an extrusion-like construction. The manual also warns that thickness is approximate on general topology.

Repository adaptation: `remapSolidifyAnchor()` exposes only the two source-face copies that have exact one-to-one face provenance: `surface: 'outer' | 'inner'`. Rim faces are intentionally excluded because a source face can contribute zero or multiple boundary edges, so there is no single unambiguous face-level anchor target without additional edge/corner intent.

Test/example/result: the accepted visual fixture remaps the same pre-solidify authored support point to both sides of a 20 mm organic shell and a 30 mm mechanical shell. The measured outer/inner anchor-origin separations are about 0.01991 m and 0.02987 m respectively; the difference from nominal thickness reflects vertex-normal offset geometry rather than an even-thickness guarantee.

Limitation: this implementation remains the repository's simple vertex-normal shell and inherits its self-intersection/even-thickness limitations. Anchor remap does not improve the shell solver itself.

## Three.js r186 — Triangle and BufferGeometry

Sources: https://threejs.org/docs/pages/Triangle.html and https://threejs.org/docs/pages/BufferGeometry.html (Three.js documentation; publication dates not stated).

Observation: `Triangle` defines barycentric coordinates with respect to its three ordered corners. `BufferGeometry.index` defines each indexed triangle through three ordered vertex indices.

Repository adaptation: reversing a target face's winding changes the corner order, so an anchor's barycentric coordinates and affine tangent weights must be permuted with those corners. The new remap helper performs that permutation explicitly instead of treating the weights as an unordered triple. Persistent anchors also record an indexed-topology signature that excludes positions but covers vertex/index counts and the complete index ordering, so same-topology form edits remain valid while a topology constructor's output requires an explicit remap.

Test/example/result: the dedicated generic-remap test reverses quad triangle winding and verifies that both barycentric weights and tangent weights follow the corner permutation. Existing same-topology deformation tests continue to pass because position edits do not affect the topology signature.

Limitation: the topology signature is a deterministic pair of 32-bit accumulators, intended as a practical authoring guard rather than a cryptographic identity or exported asset identifier.
