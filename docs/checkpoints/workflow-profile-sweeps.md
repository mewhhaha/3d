# Profile sweep workflow checkpoint

Base remote revision: `f594913942a863239c93469b606e09209ef89205`.
Implementation revision: `69e562bbf6d08c358566e2ea49b5f03c92c83923`.
Capability: reusable open/closed 2D cross-sections swept along transported 3D guide frames with independent taper, local section offset, roll and path tessellation.

## Problem

The previous curve-frame pass solved stable orientation, but geometry built on those frames was still mostly circular `sweep()` tubes, paired offset routes or repeated attachments. A strap, hair card, leaf-like ribbon or profiled trim still needed a custom patch or multiple child objects. Cross-section shape was not a first-class authoring input.

## Accepted change

- Added `src/lib/profile-sweep.js` with `profileSweepGeometry()` and `profileSweep()`.
- `path` accepts a Three.js curve or ordinary XYZ guide points. `profile` is authored independently in the transported normal/binormal plane in meters.
- Open profiles create ribbon/card surfaces. Closed profiles create non-circular tubes and optionally triangulated end caps; closed guide loops disable caps and reuse the exact transported-frame seam.
- `scale` may be a scalar, anisotropic `[x,y]`, or a function of normalized path position. `offset` may likewise be a local XY pair or field, letting repeated trims/details reuse one section without baking placement into profile coordinates.
- `tilt` stays in the existing transported-frame stage. `segments` controls path representation without changing the authored section.
- The helper emits ordinary indexed `BufferGeometry` with UVs, normals and bounds. It constructs new topology; it does not claim transfer of pre-existing UVs, weights or high/low correspondence.
- Added `profile-sweep-study` with two unrelated fixtures: an organic open crest/ribbon and a hard-surface capped service strap plus an independently offset trim rail.

## Research influence

Blender's curve geometry documentation separates a spline from cross-section/bevel geometry, taper/radius and tangent-axis tilt. Three.js r186 `ExtrudeGeometry` establishes that a 2D shape can follow a 3D path, but its path extrusion does not expose this repository's transported-frame `up`, functional tilt or per-station anisotropic scale/offset vocabulary. The implementation therefore consumes the existing `curve-frame.js` field rather than introducing another framing engine.

See `docs/research/profile-sweeps.md` for source URLs, exact observations and limitations.

## Local evidence

- `npm run doctor` — Chromium 144, WebGL2 and SwiftShader available.
- `node --test tests/profile-sweep.test.js tests/curve-frame.test.js tests/surfaces.test.js` — **19/19 passed**.
- `node --test --test-name-pattern='profile-sweep-study|gallery has model recipes' tests/models.test.js` — **2/2 passed**, including deterministic default/parameter-limit builds for the new recipe.
- `npm run build` — passed with **19 recipes**.
- Combined profile-sweep fixture — **4,744 triangles**, 12 material/clay/wire/silhouette renders; GLB validator **0 errors / 0 warnings**.
- Organic-only fixture — **2,016 triangles**, six material/wire renders; GLB validator **0 errors / 0 warnings**.
- Mechanical-only fixture — **2,728 triangles**, six material/wire renders; GLB validator **0 errors / 0 warnings**.
- A broader command that also included the full `tests/models.test.js` matrix exceeded the bounded local timeout after beginning recipe checks; it is **not** recorded as a full-suite pass.

## Visual inspection / rejected intermediate

The first combined render placed both fixtures on top of each other, which made the organic ribbon nearly unreadable. The fixtures were separated spatially rather than changing the renderer or camera. The first mechanical trim profile was also centered inside the strap and therefore visually buried. Instead of moving its profile points by hand, the API gained the reusable local `offset` field; the accepted three-quarter and side renders show the cyan trim staying coherently raised while the guide bends and twists.

The organic side view was inspected because it exposes the progressive ribbon roll clearly; the mechanical side view shows the capped non-circular strap and raised trim maintaining their relationship out of the frontal plane. Wire views confirm that path tessellation follows the guide while profile topology remains independent.

## Limitations / next workflow target

This is not a generalized curve modifier stack. Profiles do not yet support holes, self-intersection repair, bevel/round-over generation, crease-normal control or per-section material groups. Open ribbons are single surfaces and need a double-sided material when both sides must render. Closed sweeps can still self-intersect on tight guides, and triangulated caps do not prove global watertightness.

A useful next workflow target is **profile edge semantics and thickness**: reusable crease/sharp-edge handling plus optional solidification for open ribbons/straps, preserving explicit UV ownership. That would make hair cards, leaves, cloth trims and mechanical bands useful without forcing authors to choose between a single infinitely thin sheet and a fully closed hand-authored section.
