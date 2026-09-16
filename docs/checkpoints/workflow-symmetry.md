# Local symmetry workflow checkpoint

Base remote revision: `ed993389219834dff6d2efaed6b9cd2701497677`.
Capability: reusable bilateral construction/sculpt symmetry in explicit local frames.

## Problem

`mirrorMask()` previously assumed the world X/Y/Z planes through the scene origin. That made a sculpt operation hard to reuse once a subject was offset, nested in an assembly, or needed a rotated bilateral plane. Mirroring final Object3D transforms with a negative scale is also contrary to this repository's modeling rules and can invert winding/tangent handedness.

## Accepted change

- Added `src/lib/symmetry.js` with explicit `symmetryPlane({origin,normal})`, axis shorthands, point/direction reflection, authored-point mirroring and orientation-preserving `mirrorSurface()`.
- Extended the existing sculpt `mirrorMask()` to accept an explicit plane while keeping the old `'x' | 'y' | 'z'` API working. Mirrored mask strengths are still combined with `max`, so a stroke on the symmetry plane is not doubled.
- Added `symmetry-study`, a compact regression model with two unrelated uses: an organic primary-form sculpt around an offset bilateral plane and a mechanical pod using a rotated local plane for shell sculpting and mirrored service-node construction.
- Added durable workflow-first guidance and source notes under `docs/research/local-symmetry.md`.

## Research influence

Blender's Mirror modifier documentation establishes local axes/origin and an alternate mirror object as the mirror-frame concept. Blender's Sculpt Symmetry documentation establishes mirrored brush evaluation as distinct from radial symmetry, tiling and topology symmetrization. The implementation adapts those ideas to explicit code-first construction data; it does not implement bisect/weld, radial symmetry or Blender modifier semantics.

## Evidence

- `npm run doctor` — Chromium, WebGL2 and SwiftShader available.
- `node --test tests/sculpt-forms.test.js` — **9/9 passed**, including legacy axis behavior, arbitrary-origin plane reflection, orientation-preserving mirrored surfaces and unchanged cage/baked geometry guarantees.
- `npm run build` — passed with **16 recipes** after adding the workflow study.
- Combined `symmetry-study` render — **8,352 triangles**, four material/clay images, GLB validation **0 errors / 0 warnings**.
- Organic-only fixture — **3,072 triangles**, six material/clay alternative views, GLB validation **0 errors / 0 warnings**.
- Mechanical-only fixture — **5,280 triangles**, six material/clay alternative views, GLB validation **0 errors / 0 warnings**.

## Limitations / next workflow target

This is construction/selection symmetry, not topology bisect/merge. It does not rename left/right tags, mirror skin weights, solve seam welding, or provide radial/tiling symmetry. A useful next step is to apply the same explicit-frame idea to repeatable surface attachments or pose-space corrective fields, then exercise it on one organic and one hard-surface example before touching another reference-specific detail pass.
