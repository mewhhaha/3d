# Surface thickness and crease workflow checkpoint

Base remote revision: `0d36feac751cb2fbd1396898e6c29a2c72c8ccf2`.
Implementation revision: `f8c7538fbe4cb31cd9b2e56e2b6bdce4fa401e4b`.
Capability: add physical shell depth to ordinary indexed triangle surfaces while keeping source shape data separate, then optionally apply an independent angle-based crease-normal finish.

## Problem

The profile-sweep pass made open ribbons, cards and non-circular sections first-class, but open surfaces remained infinitely thin. Authors wanting a leaf edge, hair-card depth, cloth trim or sheet-metal panel still had to redesign the source as a closed cross-section or hand-build side walls. Hard/smooth shading was also easily conflated with the topology operation.

## Accepted change

- Added `src/lib/surface-thickness.js` with `solidifyGeometry()`, mesh-level `solidify()`, and downstream `creaseNormals()`.
- `solidifyGeometry()` accepts a positive scalar or per-source-vertex thickness field. `offset` is authored in `-1..1`: `-1` keeps the authored outer surface fixed, `0` centers the shell, and `+1` keeps the authored inner surface fixed.
- Open boundaries may stay open or gain `sharp` or `smooth` rims. Smooth rims share side vertices around a boundary loop while keeping a UV seam; sharp rims deliberately duplicate edge vertices so the shell/rim normal discontinuity is explicit.
- The operation creates new indexed topology, preserves the source UV chart on outer/inner shell copies, creates rim UVs when source UVs exist, and records topology/attribute ownership in `userData.solidify`.
- Tangents and unsupported custom attributes are recorded as invalidated. Skin weights, morph targets and material groups are rejected rather than silently copied through a topology-changing operation.
- `creaseNormals()` is intentionally a separate shading stage. It uses the pinned Three.js r186 angle-based normal split, deletes stale tangents, and records that indexed topology may become non-indexed.
- Added `surface-thickness-study` with two unrelated fixtures: an organic swept crest/leaf using a smooth rim, and a deformed hard-surface service panel using a sharp rim followed by a 34-degree crease-normal finish.

## Research influence

Blender 4.5 Solidify documents thickness, `-1..1` placement offset, boundary rims and the important limitation that even wall thickness is an approximation; its advanced complex/clamp/material behavior is not claimed here. Blender's Smooth by Angle keeps shading sharpness as a separate operation based on neighboring face angle. Three.js r186 documents indexed vertex sharing, averaged indexed normals, tangent prerequisites and `BufferGeometryUtils.toCreasedNormals()` de-indexing behavior. Those constraints drove explicit topology ownership and the topology-before-shading order.

See `docs/research/surface-thickness.md` for source URLs, actual observations, adaptation and limitations.

## Local evidence

- `npm run doctor` — Chromium 144.0.7559.96, WebGL2 and SwiftShader available.
- `node --test tests/surface-thickness.test.js tests/profile-sweep.test.js tests/curve-frame.test.js tests/surfaces.test.js` — **26/26 passed**.
- `node --test --test-name-pattern='surface-thickness-study|gallery has model recipes' tests/models.test.js` — **2/2 passed**, including deterministic default/parameter-limit checks for the new recipe.
- `npm run build` — passed with **20 recipes**.
- Combined fixture — **3,032 triangles**, material/clay/wire/silhouette renders from front/side/three-quarter; GLB validator **0 errors / 0 warnings**.
- Organic-only fixture — **1,968 triangles**, inspected material/clay side and three-quarter views; GLB validator **0 errors / 0 warnings**.
- Mechanical-only fixture — **1,064 triangles**, inspected material/clay/wire side and three-quarter views; GLB validator **0 errors / 0 warnings**.
- GitHub `Prepare offline authoring kit` for the implementation revision completed **successfully**. The implementation revision's broader Pages workflow was still running when this checkpoint was recorded and is not claimed complete.

## Visual inspection / rejected intermediate

The organic side view shows a real dark green side wall following the swept crest instead of a zero-thickness card, while the broad face stays governed by the original profile sweep. The mechanical wire/side views expose distinct outer, inner and rim surfaces on a source that did not come from the guide-sweep helper, demonstrating reuse across construction domains.

The first hard-surface material choice was too dark to make the folded ridge and shell boundary readable in the neutral renderer. That look-development choice was rejected and only the panel material was lightened; topology, thickness and camera were left unchanged. No cyber-android appearance change is claimed from this pass.

## Limitations / next workflow target

This is deliberately a normal-offset shell, not an exact signed-distance/even-thickness solver. Tight concavities and sharp corners can self-intersect, source normals materially affect the result, and V1 requires indexed triangles with consistently wound manifold boundary loops. It does not transfer material groups, skin weights, morph targets, arbitrary custom attributes, tangents or high/low correspondence. `creaseNormals()` is a shading split, not a bevel or physical edge treatment.

A useful next general workflow target is **boundary-aware bevel / edge treatment or attribute transfer after topology changes**. The former would let thin panels and cards gain actual rounded/chamfered edges; the latter would make solidification safer for richer UV/material/deformation pipelines. Either should be exercised on both an organic and hard-surface fixture before reference-specific polish.
