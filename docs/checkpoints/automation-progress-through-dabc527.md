# Automated refinement progress

## 2026-09-19 — shared rib pose and plane-constrained far arm

Verified base **a0283a772394605e56159e04ad89ce81b4c6964d**. Pushed reusable solver
checkpoint **43d052c9ea8e1013a98f5a2d040dab3576bf65a2** during this run; the
containing scene commit completes the integration. Existing defaults remain.

`twoLinkPose({jointPlane})` constrains the middle joint without stretching.
Optional `gestureStyle: poised` fits the rib section to both shoulder sockets,
re-solves the far arm, and preserves near-arm/head/leg/foot placement. It is an
explicit uncertain pose interpretation, not recovered anatomy. `panelStyle:
swept` extends/narrows the proximal thigh shells at unchanged resolution. The
same solver is exercised on an unrelated service boom. Existing pigment/PBR/
two-tone looks remain separate; no new shader or normal bake.

Final local doctor, **25/25 expanded tests**, targeted model **1/1**, and
**44-recipe build** passed. Review: **8 cases / 42 images / 3 GLBs with zero
errors and warnings**. **638,388 scene triangles**, unchanged. Computational
fingerprint `a2c418ac8e72c35342583b01a876f4b8806089d1d8c286f7310071745b91fcce`
(248 files). No complete full-suite run this pass.

Rejected the outflung elbow, unreachable plane, excessive thigh overlap and an
isolated shoulder move that crossed the old rib cage. The final shared-rib fit
makes the arm visible, but the rib/neck inclination remains aggressive in side
view. Whole-image likeness is still poor. Keep this as an explicit candidate,
not a new default or a claim of anatomical correctness.

[API](two-link-plane.md) · [research](research/joint-plane-and-pelvic-overlap.md) ·
[checks, failures and limitations](checkpoints/2026-09-19-prism-balance.md).
Evidence: `renders/balance-review/`; CI artifact `poised-body-review`.
Base component CI and Pages deployment succeeded; its combined form job was
cancelled at the last hand stage. New-commit CI is pending at checkpoint.

Next: verify rib/neck inclination with a simple humanoid mass blockout; do not
cover the remaining form errors with decorative geometry.

Previous entries are preserved verbatim, with their relative links intact, in
[the journal through a0283a7](automation-progress-through-a0283a7.md).
