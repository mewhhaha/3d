# A simple humanoid foundation

Sources read 2026-09-19; no video, account login, asset download or external upload.

**Adobe, Mixamo Common Questions** (updated 2021-09-14):
https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
The written guidance specifies a neutral humanoid with distinguishable body
regions, no large appendages/props, no disconnected parts, and a clean centered
mesh. Observation: the automatic-rigging input is the plain figure, not its full
costume. Adaptation: an original T-pose proxy and shared named skeleton, with
pose and proportion review before armor. This segmented proxy is already rigged
locally; it is **not** a verified input for Mixamo auto-rigging. The general
royalty-free-use text is not treated as permission to republish raw service assets.

**Adobe, Upload and rig 3D characters with Mixamo** (updated 2021-09-14):
https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html
The written workflow identifies wrists/elbows/knees/groin, requires Adobe login,
and describes FBX/OBJ/ZIP inputs; already-rigged upload uses FBX and skeleton
mapping. Adaptation: expose conventional humanoid joints, explicit link lengths
and a clean bind pose. No FBX export, Adobe-side mapping or Mixamo retargeting was
performed. Bone-name similarity alone is not compatibility evidence.

**Khronos, glTF 2.0 specification**, section 3.7.3.2:
https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
Skinning uses joint transforms; transforms of the skinned mesh node are ignored.
This informed an opt-in export graph stage for identity model-space skins.
Initial mannequin exports had 34 nested-skin warnings. After real scene-root
promotion, the same strict validator returns zero warnings; all three pose clips
were reimported and sampled with GLTFLoader. No warning was suppressed.

**Attempted but not read:** Blender Studio Full Body Sculpting page returned 402.
No technique is attributed to its inaccessible instructional content. Previously
linked construction videos remain unreviewed.

Examples/results: slender and broad mannequins at multiple heights, neutral /
contrapposto / lookback poses, exact chain lengths and planted feet, clean bind
export with preview isolation. The pose samples are original artistic blockouts,
not anatomy recovered from the cyber illustration or animation from Mixamo.
