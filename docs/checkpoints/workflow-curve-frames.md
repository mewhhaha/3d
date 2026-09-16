# Transported curve-frame workflow checkpoint

Base remote revision: `b95320bacf135eb3379762d33057a718ff853129`.
Capability: reusable rotation-minimizing local frames for sweeps, offset routes and repeated attachments along authored 3D curves.

## Problem

Curve-dependent modeling was fragmented. `sweep()` and the cyber cable loom each called Three.js `computeFrenetFrames()` directly, while recipes wanting repeated clamps, scales, collars, straps or guide-bound modules had no public pose representation. Authors could not provide a meaningful starting normal or an explicit roll field without rebuilding frame logic in the recipe.

That made a common operation — “keep this authored cross-section/detail oriented while it follows a 3D guide” — harder than authoring the guide itself.

## Accepted change

- Added `src/lib/curve-frame.js` with `transportedFrames()`, `curveTransforms()`, `offsetCurvePoints()` and `attachToCurve()`.
- A transported frame exposes origin, tangent, normal, binormal and quaternion. Local +X is the transported normal, +Y the binormal and +Z the route tangent.
- Authors may seed the frame with `up`, add constant or functional `tilt` in degrees, and generate local normal/binormal/tangent offsets in meters without hidden parenting.
- Closed curves explicitly share the endpoint position/tangent, then distribute the residual start/end normal mismatch around the loop before authored tilt is applied; an asymmetric-loop regression checks an exact frame seam.
- Migrated generic `sweep()` and cyber `cableLoom()` to the same helper. A regression assertion preserves the pinned Three.js r186 default frame direction so the cable bundle does not reorder simply because the helper became public.
- Added `curve-frame-study` with an organic tapered horn/tendril and a mechanical paired-rail harness. Both are driven by inflected 3D paths but use the same frame field for different authoring tasks.

## Research influence

Hanson & Ma's 1995 technical report motivates parallel-transport frames specifically for ribbons/tubes and highlights Frenet ambiguity near vanishing curvature. Blender's current curve-normal documentation separates minimum-twist normals from user-authored tilt. The pinned Three.js implementation already contains a Hanson/Ma-style discrete transport and closed-loop correction, so this pass exposes and extends that construction vocabulary rather than adding a second curve engine.

See `docs/research/curve-frames.md` for source URLs, exact observations and limits.

## Local evidence

- `npm run doctor` — Chromium 144, WebGL2 and SwiftShader available.
- `node --test tests/curve-frame.test.js tests/surfaces.test.js tests/cyber-mechanics.test.js` — **17/17 passed** after the accepted compatibility seed direction and closed-seam regression.
- `npm run build` — passed with **18 recipes**.
- Combined `curve-frame-study` — **15,444 triangles**, nine material/clay/wire renders, GLB **0 errors / 0 warnings**.
- Organic-only fixture — **9,120 triangles**, four renders, GLB **0 errors / 0 warnings**.
- Mechanical-only fixture — **6,324 triangles**, four renders, GLB **0 errors / 0 warnings**.
- A broader `npm test` attempt reached test **76** with no failures before the bounded 120-second command timeout. This is **not** recorded as a full-suite pass.

## Visual inspection

The horn/tendril collars stay perpendicular to a guide that bends through multiple planes, with a deliberate progressive roll layered over that transport. No sudden 180-degree frame flip is visible around the inflected middle section.

The mechanical fixture derives two separated rails from one route and keeps repeated rectangular clamps spanning those rails as the harness turns out of plane. The side view was inspected specifically because a front-only render could hide orientation errors.

## Limitations / next workflow target

This is sampled curve framing, not a generalized curve editor, collision solver, ribbon self-intersection solver or topology operation. Extremely sharp turns still require enough samples. `tilt` is currently a constant or function rather than a sparse editable tilt curve, and attachments are sampled at the same segmentation as the frame field.

A useful next workflow target is a small **guide/profile sweep builder** that accepts independently editable cross-sections (including non-circular ribbon/strap profiles), uses these transported frames, and keeps section shape separate from path shape and representation resolution. That would serve hair cards, straps, horns, cables and hard-surface trim without adding another reference-specific system.
