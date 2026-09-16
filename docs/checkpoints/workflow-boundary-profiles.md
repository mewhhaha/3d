# Surface-boundary profile workflow checkpoint

Base remote revision: `54aa1c40e693bd43f0b031ea9857ce937d5afd19`.
Implementation revision: `27c2a7be9f021ddcec5c652241adb263e1b95ff2`.
Capability: turn ordered open boundaries of an indexed surface into reusable local profile guides for additive edge trim without changing the authored source surface.

## Accepted change

- Added `surfaceBoundaryLoops()` to extract consistently wound manifold boundary loops with source positions and normals.
- Added `boundaryProfileGeometry()` / `boundaryProfile()` to sweep an independently authored closed 2D profile in the boundary-local outward/normal plane while leaving the source geometry untouched.
- Added `roundBoundaryProfile()` as a convenience preset; custom profiles remain ordinary `[x,y]` construction data.
- Preserved boundary winding, including opposite outward framing for hole loops.
- Generated trim owns new indexed topology and UVs. It does not claim source UV/weight transfer or bevel semantics.

The bounded scope was chosen deliberately. Blender's bevel documentation exposes face/edge selection, width, segments, overlap controls, and corner/intersection behavior. Rather than ship a misleading partial arbitrary-edge bevel, this pass implements the smaller reusable surface-boundary construction primitive that is safe to compose now.

## Two independent examples

`models/boundary-profile-study.js` uses the same API on an organic guide-swept crest and a separately deformed mechanical service panel. The organic case adds a rounded gold boundary bead. The hard-surface case adds an offset cyan rectangular perimeter gasket. `studies/boundary-profiles.json` compares plain and trimmed cases under locked cameras.

## Local evidence

- `node --test tests/surface-boundary-profile.test.js tests/surface-thickness.test.js tests/profile-sweep.test.js tests/curve-frame.test.js` — **21/21 passed**.
- `node --test --test-name-pattern='boundary-profile-study|gallery has model recipes' tests/models.test.js` — **2/2 passed**.
- `npm run build` — passed with **21 recipes**.
- `npm run study -- studies/boundary-profiles.json renders/run13-boundary-study` — **passed**, two cases and 24 locked-camera images; the study runner correctly leaves `visualAcceptance` as `not-assessed`.
- Plain fixture: **1,244 triangles**. Trimmed fixture: **2,224 triangles**. Both study GLBs validated with **0 errors / 0 warnings**.
- Material and wire inspection confirmed actual perimeter geometry rather than a normal-only highlight. Unit tests verify the source position array remains unchanged.

A full repository-wide `npm test` was not rerun for this small follow-up. On the preceding main revision, GitHub's build job and independent Blender job both completed successfully; the overall Pages workflow failed only at `actions/configure-pages`, so deployment remains separate from model validation.

## Research

See `docs/research/surface-boundary-profiles.md`. Written Blender documentation motivated keeping edge selection/order separate from 2D profile data and also made clear why arbitrary bevel intersection policy is outside this helper's claim. Three.js documentation keeps crease-normal shading distinct from physical topology.

## Limitations / next workflow target

V1 requires indexed triangles with consistently wound manifold open boundaries and samples existing boundary vertices rather than smoothing/resampling the route. The trim is an independently owned object and can intersect the source or itself; there is no collision or merge step. It does not transfer skin weights, arbitrary custom attributes, or semantic tags.

The next general workflow priority is topology-aware attribute transfer/projection after construction changes. A bounded first version should transfer selected continuous vertex data by closest-triangle barycentric projection, explicitly reject discontinuous semantics it cannot preserve, and exercise the operation on both an organic and a hard-surface fixture.
