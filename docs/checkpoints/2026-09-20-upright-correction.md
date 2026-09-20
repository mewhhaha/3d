# Correct the pose interpretation, not the triangle count

Base main **1a5175e3605304e0b1ab1bc908793ee98f550378**, recovered locked tree
**63c225440d3c2230278cc193ec35d31547741c1d** verified exactly. Connected GitHub
confirmed the base imported-model workflow and Pages run completed successfully.
The containing commit is the implementation revision.

## User direction and diagnosis

The user rejected the awkward stance with one shoulder behind the other and
clarified: stand upright, pelvis pushed out, arms at the sides, head down.
Previous `xbotStance` + `xbotPoised` layers accumulated world rotations through
several spine bones. On the tailored `silhouette` pose the chest/pelvis horizontal
heading differed by **32.9566 degrees**, the upper-chest up axis tilted **21.7685
degrees**, and the shoulders differed in height by **0.10024 m**. Fixed old wrist
targets compounded the far-arm displacement. These are explanatory measurements,
not reference-derived anatomy or a confidence score.

Added `upright` on the SAME actual imported Xbot, built from rest through existing
`hold`, `orientWorld`, root-slide and two-link solve operations. One body heading
replaces the accumulated yaw twist. Lumbar pitch/roll retains a small pelvis
shift relative to the ribs; the upper chest stays upright. Neck/head pitch is
downward, independent of torso heading. Each wrist is derived from its own posed
shoulder with gravity-aligned drop, measured reach and small lateral/front
clearances. This intentionally releases the old hand pins. Ankle targets remain
fixed; foot yaw is explicitly updated to match the milder body heading.

No new general skeleton API was necessary. Body form, source geometry, topology,
weights, UVs, inverse binds, materials and existing pose definitions are unchanged.
The old clips remain comparisons, not the accepted target. The original mannequin,
detailed android, camera, lights and target annotations are untouched. No new
triangles, textures, shaders, normal maps or changes to imported asset provenance.

## Actual checks

- `npm run doctor`: Three.js r186, Chromium 144.0.7559.96, WebGL2 / SwiftShader,
  virtual display; passed.
- `node --test tests/refit-skin-bind.test.js tests/skeleton-pins.test.js tests/skeleton-pose.test.js tests/local-render.test.js tests/humanoid-mannequin.test.js tests/humanoid-shot.test.js tests/humanoid-support.test.js tests/two-link-pose.test.js tests/export-skin-roots.test.js`: **40/40 passed**, no skips/failures.
- `npm run build`: **45 recipes**, passed.
- `npm run test:render`: **LOCAL_RENDER_OK**; 20-view/pass actual Chromium
  regression, freshness and pose/export isolation. The unrelated old hand still
  reports **six warnings**, not suppressed or transferred to this model.
- `node scripts/review-upright.mjs renders/upright-final`: **6 cases / 26 images /
  3 GLBs**, each with **zero validation errors and warnings**. Complete 28,374-
  vertex reimport for all five clips on stock and tailored bodies; maximum
  position error **8.70e-8 m**. Bind/posed-preview tailored GLBs are byte-identical.
- Final review fingerprint:
  **2d3681ffc5aa97d68dc4b7d99957784f89f03c846c8ee191222f50c9e8627bc0**.
- Both forms remain **49,112 triangles / 67 bones / 2 skins / 2 materials**.
  The review checks preserved geometry/weights/inverse binds, unchanged limb
  lengths and ankle target positions, upright chest and side-hanging arm intent.
- Tailored result: upper chest/pelvis heading difference **0 degrees**; shoulder
  height discrepancy **2.86e-7 m**; shoulder depth difference **.14446 m** instead
  of **.26851 m** (a three-quarter viewpoint still has natural depth). The arms'
  root-to-wrist directions are **8.19 degrees from vertical** rather than the
  previous **13.07 / 31.94 degrees**. Head-forward Y is **-.32528**, downward.
  These tests protect the user's stated intent, not exact visual likeness.
- Prior baseline hero is byte-identical to the saved published image:
  `af6d3c1384d6fa846263c96fb42e143b4e56411ccde15a3491950609324606dc`.

- Existing imported and bind-form reviews completed on the final source: **9 cases /
  43 images / 4 GLBs** and **11 cases / 48 images / 3 GLBs**, respectively, all
  zero validation errors/warnings. The rerun completion markers and exit 0 were
  recorded in `renders/checks/review-rerun.log` and `reviews.exit`.
- `timeout 180 npm test` did not complete before its bound. The retained log
  ends after **193 passing subtests**, without a reported failure. No completed
  full-suite pass or captured full-suite exit code is claimed.

## Visual review and rejected attempts

Opened the actual final material image, silhouette, and front/three-quarter/side/
back clay comparisons. The shoulder/chest line is no longer a dramatic twist;
the arms hang beside the body and the head is lowered. The rig remains a
segmented/faceless stock-derived construction. The far hand is partly occluded
in the hero view and some limb/shell contacts still need refinement. Do not call
this an exact likeness, contact-safe or dynamically balanced pose.

The first upright trial placed the wrists too far back against the thighs.
It was rejected; revised targets add small forward/lateral clearance without
turning the arms into a gesture. Heading trials -25/-35/-45 were compared under
one camera; retained -30 as a moderate whole-body view, not opposing rib/pelvis
yaw. Trials and first source are preserved in the local evidence folder.

The supplied reference reupload was visually available; encoding SHA-256
`8c4d3c151bfc2b1edc784391660e5c2f693b436a4ebbff5218c7198d3ac2c88f` differs from
the historical original-file hash. No raster enters Git or CI.
[Research note](../research/upright-pose-orientation.md) records actual Three.js
orientation documentation and the unavailable Blender page, not inferred videos.

The first attempt to rerun the old stock review was interrupted by the outer
execution bound during Chromium startup; the partial images/report and failure
log remain in `standing-stock-attempt1`. It was not relabeled successful.

## Publication and next step

The existing imported-model CI gains a bounded review step, not another agent or
render service. It publishes only images/reports. Final-commit CI and deployment
are pending at this source checkpoint. See [standing-pose guide](../standing-pose.md).

Keep the next pass anchored to this simpler user-directed stance. Resolve any
remaining arm/hip contact and the amount/direction of pelvis push before returning
to costume work; do not reintroduce a countertwist merely to expose a silhouette.
