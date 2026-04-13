// src/io/wkb/corpus.test.ts
// Round-trip tests against geoarrow-data fixtures
import { describe, test, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import { tableFromIPC } from "apache-arrow";
import type { Data, Binary } from "apache-arrow";
import { parseWkb } from "./reader";
import { toWkb } from "./writer";

const FIXTURES_DIR = resolve(
  __dirname,
  "../../../tests/fixtures/geoarrow-data",
);

function loadFixture(name: string): Data<Binary> | null {
  const path = resolve(FIXTURES_DIR, name);
  if (!existsSync(path)) return null;
  const buf = readFileSync(path);
  const table = tableFromIPC(buf);
  // WKB column is named "geometry"
  const col = table.getChild("geometry");
  if (!col) return null;
  return col.data[0] as Data<Binary>;
}

const geomTypes = [
  "point",
  "linestring",
  "polygon",
  "multipoint",
  "multilinestring",
  "multipolygon",
];

const fixturesExist =
  existsSync(FIXTURES_DIR) &&
  readdirSync(FIXTURES_DIR).some((f) => f.endsWith(".arrows"));

describe.skipIf(!fixturesExist)("corpus round-trip", () => {
  for (const geom of geomTypes) {
    for (const suffix of ["", "-z"]) {
      const filename = `example_${geom}${suffix}_wkb.arrows`;

      test(`${filename}`, () => {
        const data = loadFixture(filename);
        expect(data).not.toBeNull();

        // Parse WKB -> GeoArrow
        const geoarrow = parseWkb(data!);
        expect(geoarrow.length).toBeGreaterThan(0);

        // GeoArrow -> WKB
        const wkbOut = toWkb(geoarrow);
        expect(wkbOut.length).toBe(geoarrow.length);

        // WKB -> GeoArrow again
        const geoarrow2 = parseWkb(wkbOut);
        expect(geoarrow2.length).toBe(geoarrow.length);
        expect(geoarrow2.type.toString()).toBe(geoarrow.type.toString());

        // Compare coordinate buffers
        let d1: any = geoarrow;
        let d2: any = geoarrow2;
        while (d1.children?.length) {
          d1 = d1.children[0];
          d2 = d2.children[0];
        }
        const c1 = Array.from(d1.values as Float64Array);
        const c2 = Array.from(d2.values as Float64Array);
        expect(c2).toEqual(c1);
      });
    }
  }
});
