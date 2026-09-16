# Surface-local attachment workflow checkpoint

Base remote revision: `fdbe44e2f37cc40c282c4ede02fb088399fb8e85`.
Capability: reusable local placement and routed detail on regular parametric surfaces.

## Problem

The repository already had `surfaceFrame()` and `attachToSurface()`, but an attachment could only be placed at `(u,v)` plus a scalar normal offset. Authors could not express tangent-plane slide or an intentional local rotation without adding world-space transform code after attachment. Curved routes also allocated temporary `Object3D` instances merely to read positions.

That made reusable ports, vents, scales, spines, cable inlays and similar secondary forms more awkward than the primary surface itself.

## Accepted change

- Added `surfaceTransform()`: one surface sample now produces a position, quaternion, matrix and differential frame. Local +X follows `du`, +Y follows the chart bitangent and +Z follows the normal.
- Added tangent-plane `slide: [x,y]` in meters, normal `offset`, and local XYZ `rotation` in degrees after frame alignment. No scale or hidden parenting is introduced.
- Reimplemented `attachToSurface()` as the Object3D wrapper around that explicit pose while keeping old calls compatible.
- Added `surfacePath()` for direct chart-authored point routes without allocating temporary scene objects.
- Migrated the cyber limb surface inlay to `surfacePath()`; its support and route expression are unchanged.
- Added `surface-attachment-study` with one organic and one hard-surface fixture so the abstraction is not justified by a single character reference.

## Research influence

Blender's Shrinkwrap documentation keeps surface location, normal-relative clearance and orientation conceptually distinct. Blender's Shrinkwrap Constraint explicitly supports aligning a local object axis to the target normal. Three.js already exposes basis-matrix and local Object3D transform primitives. The implementation combines those ideas for known parametric charts instead of attempting mesh nearest-point projection.

See `docs/research/surface-attachments.md` for exact source notes and limitations.

## Local evidence

- `npm run doctor` — Chromium 144, WebGL2 and SwiftShader available.
- `node --test tests/surface-frame.test.js tests/cyber-portrait.test.js tests/form-design.test.js tests/sculpt-forms.test.js` — **25/25 passed**.
- `npm run build` — passed with **17 recipes**.
- Combined `surface-attachment-study` — **13,296 triangles**, six material/clay renders, GLB **0 errors / 0 warnings**.
- Organic-only fixture — **6,568 triangles**, six material/clay renders, GLB **0 errors / 0 warnings**.
- Mechanical-only fixture — **6,728 triangles**, six material/clay renders, GLB **0 errors / 0 warnings**.
- Cyber integration smoke render completed at **536,904 triangles** after migrating its chart-authored limb inlay path; no reference-specific dimensions or annotations were changed.

## Visual inspection

The organic fixture's spines follow the curved carapace normal instead of requiring per-spine world rotations, while its collars stay flush to the same support. The mechanical fixture's vents retain independent tangent-plane twist on a curved panel, and the cyan service route visibly follows the panel rather than a flat projected spline. Side views were inspected specifically to confirm clearance from the support instead of relying on front-view coincidence.

## Limitations / next workflow target

This is chart-based placement, not mesh shrinkwrap, collision, topology welding or curve parallel transport. A surface must be regular around the sample. The local frame can rotate rapidly on a poorly parameterized chart, and successive samples do not minimize twist along a route.

A useful next general improvement is therefore **transported frames along authored curves** (for straps, hair guides, horns, cables and sweep profiles) or pose-space corrective fields. Either should again be proven on at least one organic and one hard-surface fixture before a reference-specific polish pass.
