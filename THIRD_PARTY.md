# Anatomical template provenance

`reference-explorer` uses graphical assets from MakeHuman, not a newly hand-sculpted or scanned human. The CC0 anatomical template supplies connected body/face/hand topology, UV coordinates, target displacements, landmark helpers and weight paint. Our compilation, clothing, hair, accessories, compact rig binding and scene setup are in this repository.

Source: https://github.com/makehumancommunity/makehuman
Pinned revision: `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`.
Asset license: CC0-1.0. See https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.ASSETS.md and https://static.makehumancommunity.org/makehuman/faq/are_makehuman_files_free.html .

Copyright notices in the assets identify Manuel Bastioni, Data Collection AB, Joel Palmius and Jonas Hauquier. We use only graphical assets. MakeHuman application code is separately licensed and is not incorporated.

`scripts/prepare-anatomy.py` lists every used source path and SHA-256 checksum. It downloads from the immutable commit on the first build, verifies each file, caches it in ignored `vendor-src/`, and compiles ignored `src/generated/human-data.js`. Generated assets are bundled into the static site; the browser makes no requests to third-party servers. Subsequent offline builds can use the verified cache. Native/template source data and generated review renders are not committed as large binaries.

The reference artwork is generated concept art supplied in this conversation. It guides design, not a claim of measured likeness. The model has authored approximations rather than automatic reconstruction, photogrammetry, or image-projected clothing textures.
