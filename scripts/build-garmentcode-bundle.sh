#!/usr/bin/env bash
# Packs the parts of GarmentCode (MIT) needed to generate patterns in the
# browser into public/garmentcode/garmentcode.zip. Only .py and .yaml files:
# no SMPL bodies (non-commercial license), no Maya/Warp simulation code.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="https://github.com/maria-korosteleva/GarmentCode.git"
COMMIT="d449629979028123a5c4dc9e732a2ec19b7fce31"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone --quiet "$REPO" "$TMP/gc"
git -C "$TMP/gc" checkout --quiet "$COMMIT"
cd "$TMP/gc"
OUT="$ROOT/public/garmentcode/garmentcode.zip"
rm -f "$OUT"
{
  echo LICENSE
  find pygarment/__init__.py pygarment/data_config.py pygarment/garmentcode pygarment/pattern \
       assets/garment_programs assets/design_params \
       assets/bodies/body_params.py assets/bodies/mean_all.yaml \
       assets/bodies/mean_female.yaml assets/bodies/mean_male.yaml \
       -type f \( -name '*.py' -o -name '*.yaml' \)
} | sort | zip -q -X "$OUT" -@
echo "GarmentCode @ $COMMIT -> $OUT ($(du -h "$OUT" | cut -f1))"
