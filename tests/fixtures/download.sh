#!/usr/bin/env bash
# Downloads WKB test fixtures from geoarrow-data
set -euo pipefail

DEST="tests/fixtures/geoarrow-data"
REPO="https://raw.githubusercontent.com/geoarrow/geoarrow-data/main"

mkdir -p "$DEST"

for geom in point linestring polygon multipoint multilinestring multipolygon; do
  for suffix in "" "-z"; do
    name="example_${geom}${suffix}_wkb.arrows"
    url="${REPO}/example/files/${name}"
    if [ ! -f "$DEST/$name" ]; then
      echo "Downloading $name..."
      curl -fsSL "$url" -o "$DEST/$name" 2>/dev/null || echo "  (not found, skipping)"
    fi
  done
done

echo "Done. Fixtures in $DEST/"
