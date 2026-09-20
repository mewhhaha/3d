# Pinned acting edits on the actual imported humanoid

Base main **631e1ecb94b1a10580c386385910b72db26f498c**, exact locked source tree
**176e4e24856def975bc90d8d4ef101a516cd2650**. Read main and actual imported CI
through connected GitHub; recovered the current authoring kit rather than a stale
armor snapshot. Base imported-humanoid CI completed successfully. The containing
commit is this implementation revision.

## Capability and pose

`withPins()` extends the existing skeleton controller with independent two-link
end-frame constraints during an authored body edit. It captures tip positions
and optional orientations, checks retained link lengths, solves branches, and
restores every bone's prior local TRS on failure. It rejects dependent/shared
branches and async edit functions. This is not coupled full-body IK, physical
balance, skin collision or contact-force solving. See [API](../skeleton-pins.md).

The actual Adobe/Mixamo Xbot retains its source mesh, 67 bones, UVs, weights,
inverse binds and materials. New `poised` starts from the unchanged `confident`
pose, shifts the pelvis 5.5 cm toward model -X, adds pelvis/chest counterturn,
adjusts the clavicles, and gives the head a more pronounced tilt. All four hand
and foot frames are pinned while shoulders/elbows/knees follow the edit. Near/far
knee flexion is now **9.9277 / 23.8316 degrees**, not a confidence score. Camera,
lights, source proportions and generic/detailed android recipes remain unchanged.

The same operation drives an unrelated moving-carriage inspection arm, retaining
its probe at a workpiece. Tests also exercise two branches below a rotated .01
parent and the original broad humanoid. No extra mannequin/rig was constructed.

## Actual local checks

- `npm run doctor`: Three.js r186, Chromium 144.0.7559.96, WebGL2/SwiftShader and
  virtual-display fallback; passed.
- `node --test tests/skeleton-pins.test.js tests/skeleton-pose.test.js tests/local-render.test.js tests/humanoid-mannequin.test.js tests/humanoid-shot.test.js tests/humanoid-support.test.js tests/two-link-pose.test.js tests/export-skin-roots.test.js`:
  **34/34 passed**, including five new tests. No tests were relaxed.
- `node --test --test-name-pattern='humanoid-mannequin' tests/models.test.js`:
  **1/1 passed** (default, deterministic bounds, parameter limits).
- `npm run build`: **45 recipes**, passed.
- `npm run test:render`: **LOCAL_RENDER_OK**; actual 20-pass/view regression,
  dependency freshness, pose/export isolation retained. Its unrelated legacy
  hand fixture still reports **six warnings**, not suppressed.
- `node scripts/review-imported-humanoid.mjs renders/poised-final`:
  **9 cases / 43 renders / 4 GLBs**, each with zero errors/warnings. Includes
  previous neutral/confident and new poised poses, fixed cameras, four clay/wire
  viewpoints, silhouette, bind/skeleton and two mechanical-fixture states.
- All three imported previews export byte-identical clean-bind GLBs. Every
  imported geometry attribute and inverse bind is checked against the pinned
  source. Reimport covers **all 28,374 vertices** in all three authored clips,
  maximum position error **3.30e-10 m**. Original rest/idle/walk checks remain.
- Maximum retained endpoint difference **8.45e-9 m**, normalized quaternion
  difference **2.99e-8 radians**. Reimported mechanical probe pin differs by
  **2.05e-8 m / 5.17e-8 radians** across its two clips.
- Each final case has computational fingerprint
  `4ece7099e6ffc3562d20bd88273d834f91029cbe074226a7fe2bf614c88143cc`
  over **266 files**. Scene counts remain **49,112 triangles / 28,374 vertices /
  2 skins / 2 materials**, no new textures or normal bake.
- Previous confident hero PNG is byte-identical to the published checkpoint:
  `420fbd1616f4c12afb652f154f150ece2231cb7ecffc0186f238a65b8bfe8b24`.
- `timeout 180 npm test`: exit **124** after **193 passing subtests**, no
  reported failure before the bound. Not a completed full-suite pass.

## Visual assessment, failures and rejected trials

The new pelvis-to-chest line is more opposed, the near arm is less uniformly
slanted, and the head/shoulder tilt has more attitude. The change remains modest
in the complete figure. Stock rib/waist/head proportions, the far-arm overlap,
and segmented shoulder/waist gaps are still unlike the illustration. Nothing
here validates a confident expression, physical support or exact likeness.
Side and back views were inspected before retaining this candidate. Costume and
shader work remain paused rather than hiding unresolved body relationships.

Five small pose variants were rendered under one camera before retaining the
stronger lateral sweep. The first smaller edit was too weak; the softer shoulder
trial increased the near-elbow bend rather than improving the hang. These
variants and their construction data remain in the evidence archive, not the
working defaults. Original `neutral` and `confident` clips remain available.

An initial angular comparison used `Quaternion.angleTo` on slightly non-unit
quaternions recovered from scaled source matrices. Its spurious angular error
was resolved by normalizing rotations before measuring; the acceptance threshold
was not loosened. Pin snapshots also normalize the captured orientation.
Two attempts hit the tool's outer execution limit during contact-sheet startup,
after rendering/validation. They remain marked failed. A bounded local subprocess
then ran the entire review to **exit 0** with its completion marker. No failed
partial report was relabeled as passed.

The user's original reupload was visually inspected; encoded SHA-256 remains
`8c4d3c151bfc2b1edc784391660e5c2f693b436a4ebbff5218c7198d3ac2c88f`, different
from the historical original-byte hash. No raster or changed annotation enters
source history. Optical-module annotations are not used to score this bare rig.
[Written artist sources](../research/posing-with-held-contacts.md) informed the
opposition, silhouette and shoulder-led arm editing; no video was claimed watched.

## Publish and next step

The existing imported CI reviews the new clip and fixture, including pin tests;
no extra job or permission changes. Final-commit CI is pending at source checkpoint.
Raw/derived third-party meshes stay out of Git/Pages and CI evidence contains only
images/reports. Adobe/Mixamo attribution and restrictions are unchanged.

Evidence: `renders/poised-final/`, trial folders and `renders/session-logs/`.
Next: inspect the plain torso/leg proportion relationship and refine the arm/hand
silhouette using this stable base. Do not turn this pose candidate into a claim
that the old detailed costume has been rebound or that its likeness is solved.
