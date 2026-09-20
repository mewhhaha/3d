# Explicit body heading instead of accumulated countertwists

Accessed 2026-09-20. Primary written source:
https://threejs.org/docs/pages/Quaternion.html — Three.js Quaternion documentation.

Read the documented quaternion multiplication, setFromEuler, angleTo and
normalization contracts. Multiplying orientations composes them; repeating a
"small" heading edit at multiple spine joints does not express one absolute
body direction. The existing r186 `skeletonPose.orientWorld` already provides
that operation with the imported ancestor transforms handled explicitly.

Adaptation: use the existing absolute orientation operation on the pelvis and
rib sections, a shared heading, an independently lowered head, and newly solved
side-hanging arm targets. Avoid preserving outdated hand pins that dragged the
arms across the new body. No quaternion-library change or new algorithm is
attributed to the documentation.

The aesthetic direction is the USER'S correction, not a conclusion from this
technical reference or an anatomy score. Earlier pose names are retained for
comparison but should not steer further iterations toward exaggerated twist.
The Blender posing introduction URL returned 402 and supplied no reviewed
instructional content. No video or generated picture was used.

Examples/results: identical stock/tailored Xbot geometry in the revised standing
clip, fixed-camera material/clay/wire/silhouette comparisons, old versus new
measured body heading and arm direction, complete skin/GLB roundtrips. Exact
commands and limitations are in the upright-pose checkpoint.
