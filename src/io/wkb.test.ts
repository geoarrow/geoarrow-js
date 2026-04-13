import { describe, test, expect } from "vitest";
import { makeData, Binary, Data, List } from "apache-arrow";
import { parseWkb, WKBType } from "./wkb";

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
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

/** Extract offset arrays from nested List data for structural assertions */
function getOffsets(data: Data<List>, level: number): Int32Array {
  let d: Data = data;
  for (let i = 0; i < level; i++) {
    d = (d as Data<List>).children[0];
  }
  return (d as Data<List>).valueOffsets;
}

function getCoords(data: Data<List>, dim: number): number[][] {
  let d: Data = data;
  // walk: geom -> polygon -> ring -> vertex (FixedSizeList) -> Float64
  while (d.children?.length) {
    d = d.children[0];
  }
  const flat = d.values as Float64Array;
  const coords: number[][] = [];
  for (let i = 0; i < flat.length; i += dim) {
    coords.push(Array.from(flat.slice(i, i + dim)));
  }
  return coords;
}

// Generated via shapely:
// MultiPolygon([box(0,0,1,1), box(2,2,3,3)]).wkb_hex
const TWO_SQUARES_HEX =
  "01060000000200000001030000000100000005000000000000000000F03F0000000000000000000000000000F03F000000000000F03F0000000000000000000000000000F03F00000000000000000000000000000000000000000000F03F0000000000000000010300000001000000050000000000000000000840000000000000004000000000000008400000000000000840000000000000004000000000000008400000000000000040000000000000004000000000000008400000000000000040";

// MultiPolygon([box(0,0,1,1)]).wkb_hex
const SINGLE_POLYGON_HEX =
  "01060000000100000001030000000100000005000000000000000000F03F0000000000000000000000000000F03F000000000000F03F0000000000000000000000000000F03F00000000000000000000000000000000000000000000F03F0000000000000000";

// MultiPolygon([Polygon(box(0,0,10,10).exterior, [box(2,2,4,4).exterior])]).wkb_hex
const WITH_HOLE_HEX =
  "010600000001000000010300000002000000050000000000000000002440000000000000000000000000000024400000000000002440000000000000000000000000000024400000000000000000000000000000000000000000000024400000000000000000050000000000000000001040000000000000004000000000000010400000000000001040000000000000004000000000000010400000000000000040000000000000004000000000000010400000000000000040";

describe("parseWkb MultiPolygon", () => {
  test("two squares: structure and coordinates", () => {
    const wkbData = makeWkbData(TWO_SQUARES_HEX);
    const result = parseWkb(wkbData, WKBType.MultiPolygon, 2) as Data<List>;
    expect(result.length).toBe(1);

    // geom offsets: 1 multipolygon containing 2 polygons
    const geomOffsets = result.valueOffsets;
    expect(Array.from(geomOffsets)).toEqual([0, 2]);

    // polygon offsets: 2 polygons, each with 1 ring
    const polyOffsets = getOffsets(result, 1);
    expect(Array.from(polyOffsets)).toEqual([0, 1, 2]);

    // ring offsets: 2 rings, each with 5 coords (closed box)
    const ringOffsets = getOffsets(result, 2);
    expect(Array.from(ringOffsets)).toEqual([0, 5, 10]);

    // verify coordinate values
    const coords = getCoords(result, 2);
    expect(coords.length).toBe(10);
    // first polygon starts at (1,0) - shapely box winding
    expect(coords[0]).toEqual([1, 0]);
    // second polygon starts at (3,2)
    expect(coords[5]).toEqual([3, 2]);
  });

  test("single polygon in multipolygon", () => {
    const wkbData = makeWkbData(SINGLE_POLYGON_HEX);
    const result = parseWkb(wkbData, WKBType.MultiPolygon, 2) as Data<List>;
    expect(result.length).toBe(1);

    const geomOffsets = result.valueOffsets;
    expect(Array.from(geomOffsets)).toEqual([0, 1]);

    const polyOffsets = getOffsets(result, 1);
    expect(Array.from(polyOffsets)).toEqual([0, 1]);

    const ringOffsets = getOffsets(result, 2);
    expect(Array.from(ringOffsets)).toEqual([0, 5]);

    expect(getCoords(result, 2).length).toBe(5);
  });

  test("polygon with hole: 2 rings", () => {
    const wkbData = makeWkbData(WITH_HOLE_HEX);
    const result = parseWkb(wkbData, WKBType.MultiPolygon, 2) as Data<List>;
    expect(result.length).toBe(1);

    // 1 multipolygon -> 1 polygon -> 2 rings (outer + hole)
    const geomOffsets = result.valueOffsets;
    expect(Array.from(geomOffsets)).toEqual([0, 1]);

    const polyOffsets = getOffsets(result, 1);
    expect(Array.from(polyOffsets)).toEqual([0, 2]);

    const ringOffsets = getOffsets(result, 2);
    expect(Array.from(ringOffsets)).toEqual([0, 5, 10]);

    const coords = getCoords(result, 2);
    expect(coords.length).toBe(10);
    // outer ring starts at (10,0), hole starts at (4,2)
    expect(coords[0]).toEqual([10, 0]);
    expect(coords[5]).toEqual([4, 2]);
  });

  test("batch of multiple multipolygon features", () => {
    const wkbData = makeWkbData(TWO_SQUARES_HEX, SINGLE_POLYGON_HEX);
    const result = parseWkb(wkbData, WKBType.MultiPolygon, 2) as Data<List>;
    expect(result.length).toBe(2);

    // feature 0 has 2 polygons, feature 1 has 1 polygon
    const geomOffsets = result.valueOffsets;
    expect(Array.from(geomOffsets)).toEqual([0, 2, 3]);

    // 3 polygons total, each with 1 ring
    const polyOffsets = getOffsets(result, 1);
    expect(Array.from(polyOffsets)).toEqual([0, 1, 2, 3]);

    // 3 rings, each with 5 coords
    const ringOffsets = getOffsets(result, 2);
    expect(Array.from(ringOffsets)).toEqual([0, 5, 10, 15]);

    expect(getCoords(result, 2).length).toBe(15);
  });
});
