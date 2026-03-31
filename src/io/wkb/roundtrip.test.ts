// src/io/wkb/roundtrip.test.ts
import { describe, test, expect } from "vitest";
import { makeData, Binary } from "apache-arrow";
import { parseWkb } from "./reader";
import { toWkb } from "./writer";

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function makeWkbData(...hexStrings: string[]) {
  const buffers = hexStrings.map(hexToUint8Array);
  const totalLen = buffers.reduce((s, b) => s + b.length, 0);
  const wkb = new Uint8Array(totalLen);
  const valueOffsets = new Int32Array(hexStrings.length + 1);
  let offset = 0;
  for (let i = 0; i < buffers.length; i++) {
    wkb.set(buffers[i], offset);
    offset += buffers[i].length;
    valueOffsets[i + 1] = offset;
  }
  return makeData({
    type: new Binary(),
    data: wkb,
    valueOffsets,
  });
}

/** Extract WKB hex for geometry at index i from a WKBData */
function extractWkbHex(
  data: ReturnType<typeof makeWkbData>,
  i: number,
): string {
  const start = data.valueOffsets[i];
  const end = data.valueOffsets[i + 1];
  const bytes = new Uint8Array(
    data.values.buffer,
    data.values.byteOffset + start,
    end - start,
  );
  return uint8ArrayToHex(bytes);
}

// All fixtures: ISO WKB little-endian (Shapely output)
const fixtures: Record<string, string[]> = {
  point: [
    "0101000000000000000000F03F0000000000000040",
    "010100000000000000000008400000000000001040",
  ],
  linestring: [
    "01020000000300000000000000000000000000000000000000000000000000F03F000000000000F03F00000000000000400000000000000000",
  ],
  polygon: [
    "010300000001000000050000000000000000000000000000000000000000000000000024400000000000000000000000000000244000000000000024400000000000000000000000000000244000000000000000000000000000000000",
  ],
  multipoint: [
    "0104000000020000000101000000000000000000F03F000000000000004001010000000000000000000840000000000000104" +
      "0",
  ],
  multilinestring: [
    "01050000000200000001020000000200000000000000000000000000000000000000000000000000F03F000000000000F03F0102000000020000000000000000000040000000000000004000000000000008400000000000000840",
  ],
  multipolygon: [
    "0106000000020000000103000000010000000500000000000000000000000000000000000000000000000000F03F0000000000000000000000000000F03F000000000000F03F0000000000000000000000000000F03F000000000000000000000000000000000103000000010000000500000000000000000000400000000000000040000000000000084000000000000000400000000000000840000000000000084000000000000000400000000000000840000000000000004000000000000000" +
      "40",
  ],
};

// 3D fixtures: ISO WKB little-endian (type 1001+/1002+)
const fixtures3d: Record<string, string[]> = {
  "point-3d": [
    // python3 -c "from shapely import Point; print(Point(1,2,3).wkb.hex())"
    // ISO WKB type 1001 (XYZ Point)
    "01e9030000000000000000f03f00000000000000400000000000000840",
  ],
  "linestring-3d": [
    // python3 -c "from shapely import LineString; print(LineString([(0,0,10),(1,1,20)]).wkb.hex())"
    // ISO WKB type 1002 (XYZ LineString)
    "01ea030000020000000000000000000000000000000000000000000000" +
      "0000244000000000000000000000000000" +
      "00f03f000000000000f03f0000000000003440",
  ],
};

describe("round-trip 3D: parseWkb(toWkb(geoarrow)) preserves structure", () => {
  for (const [name, hexes] of Object.entries(fixtures3d)) {
    test(name, () => {
      const input = makeWkbData(...hexes);
      const geoarrow1 = parseWkb(input);
      const wkb = toWkb(geoarrow1);
      const geoarrow2 = parseWkb(wkb);

      expect(geoarrow2.type.toString()).toBe(geoarrow1.type.toString());
      expect(geoarrow2.length).toBe(geoarrow1.length);

      let d1 = geoarrow1 as any;
      let d2 = geoarrow2 as any;
      while (d1.children?.length) {
        d1 = d1.children[0];
        d2 = d2.children[0];
      }
      expect(Array.from(d1.values as Float64Array)).toEqual(
        Array.from(d2.values as Float64Array),
      );
    });
  }
});

describe("round-trip: toWkb(parseWkb(wkb)) === wkb", () => {
  for (const [name, hexes] of Object.entries(fixtures)) {
    test(name, () => {
      const input = makeWkbData(...hexes);
      const geoarrow = parseWkb(input);
      const output = toWkb(geoarrow);

      expect(output.length).toBe(input.length);
      for (let i = 0; i < input.length; i++) {
        const inputHex = extractWkbHex(input, i);
        const outputHex = extractWkbHex(output, i);
        expect(outputHex).toBe(inputHex.toLowerCase());
      }
    });
  }
});

describe("round-trip: parseWkb(toWkb(geoarrow)) preserves structure", () => {
  for (const [name, hexes] of Object.entries(fixtures)) {
    test(name, () => {
      const input = makeWkbData(...hexes);
      const geoarrow1 = parseWkb(input);
      const wkb = toWkb(geoarrow1);
      const geoarrow2 = parseWkb(wkb);

      // Same type
      expect(geoarrow2.type.toString()).toBe(geoarrow1.type.toString());
      // Same length
      expect(geoarrow2.length).toBe(geoarrow1.length);

      // Same coordinate values
      let d1 = geoarrow1 as any;
      let d2 = geoarrow2 as any;
      while (d1.children?.length) {
        d1 = d1.children[0];
        d2 = d2.children[0];
      }
      expect(Array.from(d1.values as Float64Array)).toEqual(
        Array.from(d2.values as Float64Array),
      );
    });
  }
});
