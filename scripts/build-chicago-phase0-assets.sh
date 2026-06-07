#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 scripts/build-ar-print-assets.py \
  --source "assets/Chicago final1.pdf" \
  --id chicago-final-1 \
  --title "Chicago Final 1" \
  --width-meters 1.524 \
  --height-meters 1.27 \
  --preserve-aspect

python3 scripts/build-ar-print-assets.py \
  --source "assets/Chicago final2.pdf" \
  --id chicago-final-2 \
  --title "Chicago Final 2" \
  --width-meters 0.914 \
  --height-meters 1.524 \
  --preserve-aspect

python3 scripts/build-ar-print-assets.py \
  --source "assets/Chicago final3.pdf" \
  --id chicago-final-3 \
  --title "Chicago Final 3" \
  --width-meters 1.22 \
  --height-meters 1.524 \
  --preserve-aspect
