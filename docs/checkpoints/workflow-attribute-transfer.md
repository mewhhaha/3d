# Closest-surface attribute transfer workflow checkpoint

Base remote revision: `ffad033702a9ed891ddf3fd2ec24989dcfea8a7d`.
Implementation revision: `dbed8a20528b540436923d143448ac0f97385ce0`.
Capability: transfer explicitly selected continuous point-domain vertex data onto newly constructed topology by closest-triangle barycentric projection, while rejecting semantics that need a different mapping contract.

## Accepted change

- Added `transferSurfaceAttributes(source, target, { attributes, maxDistance })` in `src/lib/attribute-transfer.js`.
- The source is an indexed triangle surface. Every target vertex finds its closest source-triangle point and interpolates the named Float32 vertex values using barycentric coordinates.
- Inputs remain unchanged; the helper clones the target and records projection diagnostics including source triangle count, target vertex count and observed mean/maximum source distance.
- `maxDistance` is an explicit authoring guard and fails the operation when a target point is too far from the source.
- V1 deliberately rejects UVs, normals, tangents, skin indices/weights, normalized/discrete buffers and target overwrite. Those semantics require corner-, direction-, discrete- or rig-aware transfer rather than generic float interpolation.
- Search is intentionally brute-force in this first correctness-oriented version; no performance claim is made for large production meshes.

## Two independent examples

`models/attribute-transfer-study.js` exercises two different topology changes under one API:

- an organic guide-swept leaf/crest is solidified, then its continuous green-to-gold source color is projected onto the generated shell;
- an independently deformed hard-surface service panel generates a separate perimeter-profile object, then its cyan-to-coral source field is projected onto that additive trim.

`studies/attribute-transfer.json` compares the identical geometry with transfer disabled/enabled under locked front, three-quarter and side cameras. Both cases remain **2,320 triangles / 3,045 vertices** and their silhouettes compare at **IoU 1.0** in all three views; the visible change is the transferred continuous field rather than geometry replacement.

## Local evidence

- `npm run doctor` — passed: Three.js **r186**, Chromium **144.0.7559.96**, WebGL2, SwiftShader.
- `node --test tests/attribute-transfer.test.js tests/surface-thickness.test.js tests/surface-boundary-profile.test.js tests/profile-sweep.test.js` — **20/20 passed**.
- `node --test --test-name-pattern='attribute-transfer-study|gallery has model recipes' tests/models.test.js` — **2/2 passed**.
- `npm run build` — passed with **22 recipes**.
- `npm run study -- studies/attribute-transfer.json renders/run14-attribute-transfer-final` — **passed**, 2 cases / 24 locked-camera images; `visualAcceptance` remains `not-assessed` by design.
- Plain and transferred GLBs both validate with **0 errors / 0 warnings**. Validator informational messages only note unused UV attributes.
- The transferred case keeps the same mesh/vertex/triangle counts and dimensions as the plain case; the study reports silhouette IoU **1.0** for front, three-quarter and side comparisons.
- A full repository-wide `npm test` was not run to completion in this bounded pass, so no repository-wide suite claim is made.

## Visual inspection

The organic shell changes from a uniform green material to a smooth source-derived green-to-gold field without changing the solidified leaf silhouette. On the hard-surface fixture, the independently owned perimeter trim inherits the deformed panel's cyan-to-coral field around the perimeter while the neutral panel geometry stays unchanged. Material, clay, wire and silhouette passes plus the side view were inspected; the comparison demonstrates data transfer across new topology rather than a visual-only shader trick.

## Research

See `docs/research/attribute-transfer.md`. Blender's Sample Nearest Surface documentation motivated closest-surface interpolation, the Data Transfer modifier motivated separating data selection from the mapping and bounding bad matches, and the Attributes documentation motivated refusing domain/discrete semantics that a continuous point-domain interpolation cannot preserve. The implementation uses Three.js r186 `Triangle.closestPointToPoint()` and `Triangle.getBarycoord()` already present in the locked dependency rather than adding a package.

## Limitations / next workflow target

V1 is O(target vertices × source triangles). Nearby folds, stacked surfaces or unrelated parts can produce a geometrically closest but semantically wrong match because there is no BVH, source-group restriction, normal-facing filter or projection direction. The operation does not transfer UV islands, split normals/tangents, skinning, morphs, face/edge/corner attributes, discrete labels or semantic ownership. Arbitrary custom attributes also require separate exporter support if they must survive GLTF handoff.

The next general workflow priority is to keep this mapping contract but add a reusable spatial query layer (BVH or comparable triangle index) plus optional source-part/group and normal-facing constraints. Acceptance should prove identical transfer values to the brute-force baseline on small fixtures, then measure the crossover on a larger but bounded organic surface and mechanical assembly before adopting it by default.
