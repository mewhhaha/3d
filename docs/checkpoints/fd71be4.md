# Workflow checkpoint — owned geometry composition

Base remote revision: `16963a2bfe1625e06a85f6479cc1151e2f36190b`.
Implementation revision: `fd71be4e613d970aff1a3dbee1324e1b4d5bcdbe`.
Capability: merge independently authored indexed-triangle components into one owned topology while retaining inherited named face semantics and exact stable source-part identity.

## Accepted change

`src/lib/geometry-composition.js` adds `composeGeometries(parts, options)`. Each part may supply a meter/degree local transform and material offset. The operation copies compatible point-domain attributes into fresh buffers, offsets indices deterministically, transforms positions/normals, preserves render groups separately, unions inherited named face regions by semantic name, and generates exact `part.<name>` face regions. JSON-safe source ranges (`firstVertex`, `vertexCount`, `firstFace`, `faceCount`) remain on the output for diagnostics.

This replaces an awkward authoring gap: previously separately authored pieces could remain scene children, but downstream mesh-level queries needed either raw material groups as identity or lossy re-identification after a generic merge. A post-composition query can now intersect semantic intent such as `leaf.tip` or `rail.terminal` with exact construction identity such as `part.center` or `part.rail`.

## Research used

See `docs/research/geometry-composition.md`.

- Blender 4.5 Join Geometry documents composition as a geometry operation with attribute/material propagation. Adaptation: make composition a reusable construction stage, but use strict compatible point-attribute schemas rather than Blender's implicit domain/type conversions.
- Three.js r186 BufferGeometry documents `groups` as non-overlapping draw-call/material partitions. Adaptation: keep modeling identity in overlapping named face regions rather than overloading groups.
- Three.js BufferGeometryUtils documents compatible-attribute requirements for `mergeGeometries`/`mergeAttributes`. Adaptation: reject incompatible or ownership-sensitive data instead of silently filling/dropping it, while owning the merge so face provenance remains exact.

## Examples and local evidence

- Organic fixture: three independently swept and solidified leaf components are transformed and composed. Their shared `leaf.tip` semantics union across the result while `part.left`, `part.center`, and `part.right` remain exact. A marker is placed from `leaf.tip ∩ part.center` after composition.
- Mechanical fixture: an independently deformed/solidified service housing and a routed profiled rail are composed. `panel.service`, `rail.terminal`, `part.housing`, and `part.rail` remain separately queryable; a socket is placed from `rail.terminal ∩ part.rail` after composition.
- `npm run doctor` — Three.js r186, Chromium 144.0.7559.96, WebGL2, SwiftShader.
- Focused geometry suite — **33/33 passed** across geometry composition, face regions, profile sweep, solidification, and triangle spatial queries.
- `node --test --test-name-pattern='geometry-composition-study' tests/models.test.js` — **1/1 passed** for metadata/default build/determinism/parameter limits.
- `npm run build` — passed with **27 recipes**.
- `npm run study -- studies/geometry-composition.json renders/run19-geometry-composition` — passed **3 cases / 36 locked-camera renders**. Combined **4,572 triangles / 7,064 vertices**; organic **3,728 / 5,664**; mechanical **844 / 1,400**. All three GLBs validate with **0 errors / 0 warnings**.
- Material, wire, and side views were inspected. The study demonstrates ownership/provenance; it is not an aesthetic acceptance claim for a finished plant or prop.

## Explicit ownership and limitations

Composition does not weld coincident seams, boolean overlapping solids, infer semantic equivalence, or resolve collisions. Inputs must be indexed triangles whose point attributes have identical names, item sizes, typed-array constructors, normalization, and counts. Interleaved attributes, skin weights, morph targets, and tangents are rejected because each needs a dedicated composition contract. Positive scale is required; mirroring remains an explicit geometry operation. Named regions remain repository authoring metadata and are not glTF semantics.

## CI status at checkpoint write

The implementation commit started Local sculpt/render, Pages, and offline authoring-kit workflows. Local and Pages were still running when this checkpoint was written; no final-SHA Pages/native-Blender/deployment success is claimed here.

## Next workflow priority

Build a bounded **surface-aware assembly constraint** on top of stable part/region ownership: attach one owned component to a named region of another, preserve an editable local transform, and re-evaluate deterministically when upstream shape changes. Exercise it on an organic attachment and a hard-surface module rather than introducing a generic scene graph solver.
