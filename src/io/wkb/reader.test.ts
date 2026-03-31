// src/io/wkb/reader.test.ts
import { describe, test, expect } from "vitest";
import { makeData, Binary, Data, List, FixedSizeList } from "apache-arrow";
import { parseWkb } from "./reader";

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

/** Walk nested List children to get offset array at a given depth */
function getOffsets(data: Data, level: number): Int32Array {
  let d: Data = data;
  for (let i = 0; i < level; i++) {
    d = (d as Data<List>).children[0];
  }
  return (d as Data<List>).valueOffsets;
}

/** Extract flat coordinate values from the deepest Float64 buffer */
function getCoordValues(data: Data): Float64Array {
  let d: Data = data;
  while (d.children?.length) {
    d = d.children[0];
  }
  return d.values as Float64Array;
}

// Generated via: python3 -c "from shapely import Point; print(Point(1,2).wkb.hex())"
const POINT_2D = "0101000000000000000000F03F0000000000000040";
// python3 -c "from shapely import Point; print(Point(3,4).wkb.hex())"
const POINT_2D_B = "010100000000000000000008400000000000001040";
// python3 -c "from shapely.geometry import Point; print(Point(1,2,3).wkb.hex())"
const POINT_3D = "01E9030000000000000000F03F00000000000000400000000000000840";

// python3 -c "from shapely import LineString; print(LineString([(0,0),(1,1),(2,0)]).wkb.hex())"
const LINESTRING_2D =
  "010200000003000000000000000000000000000000000000000000000000" +
  "00F03F000000000000F03F00000000000000400000000000000000";
// python3 -c "from shapely import LineString; print(LineString([(0,0,10),(1,1,20),(2,0,30)]).wkb.hex())"
const LINESTRING_3D =
  "01EA03000003000000000000000000000000000000000000000000000000" +
  "002440000000000000F03F000000000000F03F0000000000003440" +
  "000000000000004000000000000000000000000000003E40";

describe("parseWkb Point", () => {
  test("single 2D point", () => {
    const data = makeWkbData(POINT_2D);
    const result = parseWkb(data);
    expect(result.length).toBe(1);

    // FixedSizeList(2) with Float64
    expect((result.type as FixedSizeList).listSize).toBe(2);

    const coords = getCoordValues(result);
    expect(Array.from(coords)).toEqual([1, 2]);
  });

  test("batch of 2D points", () => {
    const data = makeWkbData(POINT_2D, POINT_2D_B);
    const result = parseWkb(data);
    expect(result.length).toBe(2);

    const coords = getCoordValues(result);
    expect(Array.from(coords)).toEqual([1, 2, 3, 4]);
  });

  test("3D point", () => {
    const data = makeWkbData(POINT_3D);
    const result = parseWkb(data);
    expect(result.length).toBe(1);
    expect((result.type as FixedSizeList).listSize).toBe(3);

    const coords = getCoordValues(result);
    expect(Array.from(coords)).toEqual([1, 2, 3]);
  });

  test("null entry in batch", () => {
    // Create binary data with a null at index 1
    const buf = hexToUint8Array(POINT_2D);
    const buf2 = hexToUint8Array(POINT_2D_B);
    const wkb = new Uint8Array(buf.length + buf2.length);
    wkb.set(buf, 0);
    wkb.set(buf2, buf.length);

    const nullBitmap = new Uint8Array([0b101]); // index 0 and 2 valid, index 1 null
    const valueOffsets = new Int32Array([
      0,
      buf.length,
      buf.length,
      buf.length + buf2.length,
    ]);
    const data = makeData({
      type: new Binary(),
      data: wkb,
      valueOffsets,
      nullBitmap,
      nullCount: 1,
    });

    const result = parseWkb(data);
    expect(result.length).toBe(3);
    expect(result.nullCount).toBe(1);

    // Index 0 and 2 are valid
    expect(result.getValid(0)).toBe(true);
    expect(result.getValid(1)).toBe(false);
    expect(result.getValid(2)).toBe(true);
  });
});

describe("parseWkb LineString", () => {
  test("single 2D linestring", () => {
    const data = makeWkbData(LINESTRING_2D);
    const result = parseWkb(data);
    expect(result.length).toBe(1);

    const offsets = (result as Data<List>).valueOffsets;
    expect(Array.from(offsets)).toEqual([0, 3]);

    const coords = getCoordValues(result);
    expect(Array.from(coords)).toEqual([0, 0, 1, 1, 2, 0]);
  });

  test("3D linestring", () => {
    const data = makeWkbData(LINESTRING_3D);
    const result = parseWkb(data);
    expect(result.length).toBe(1);

    const coords = getCoordValues(result);
    expect(Array.from(coords)).toEqual([0, 0, 10, 1, 1, 20, 2, 0, 30]);
  });

  test("batch of 2D linestrings", () => {
    const data = makeWkbData(LINESTRING_2D, LINESTRING_2D);
    const result = parseWkb(data);
    expect(result.length).toBe(2);

    const offsets = (result as Data<List>).valueOffsets;
    expect(Array.from(offsets)).toEqual([0, 3, 6]);
  });
});

// python3 -c "from shapely.geometry import box; print(box(0,0,1,1).wkb.hex())"
const POLYGON_2D =
  "01030000000100000005000000000000000000000000000000000000000000000000" +
  "00F03F0000000000000000000000000000F03F000000000000F03F" +
  "0000000000000000000000000000F03F00000000000000000000000000000000";

// python3 -c "from shapely.geometry import Polygon; print(Polygon([(0,0),(10,0),(10,10),(0,10)], [[(2,2),(4,2),(4,4),(2,4)]]).wkb.hex())"
const POLYGON_WITH_HOLE =
  "010300000002000000050000000000000000000000000000000000000000000000" +
  "000024400000000000000000000000000000244000000000000024400000000000" +
  "000000000000000000244000000000000000000000000000000000050000000000" +
  "000000000040000000000000004000000000000010400000000000000040000000" +
  "000000104000000000000010400000000000000040000000000000104000000000" +
  "00000040000000000000004000000000000000400000000000000040";

// python3 -c "from shapely import MultiPoint; print(MultiPoint([(1,2),(3,4)]).wkb.hex())"
const MULTIPOINT_2D =
  "0104000000020000000101000000000000000000F03F00000000000000400101000000000000000000084000000000000010" +
  "40";

// python3 -c "from shapely import MultiLineString; print(MultiLineString([[(0,0),(1,1)],[(2,2),(3,3)]]).wkb.hex())"
const MULTILINESTRING_2D =
  "010500000002000000010200000002000000000000000000000000000000000000" +
  "00000000000000F03F000000000000F03F010200000002000000000000000000004000000000000000400000000000000840" +
  "0000000000000840";

// python3 -c "from shapely.geometry import MultiPolygon, box; print(MultiPolygon([box(0,0,1,1), box(2,2,3,3)]).wkb.hex())"
const MULTIPOLYGON_2D =
  "01060000000200000001030000000100000005000000000000000000F03F00000000000000000000" +
  "00000000F03F000000000000F03F0000000000000000000000000000F03F000000000000000000" +
  "00000000000000000000000000F03F000000000000000001030000000100000005000000000000" +
  "0000000840000000000000004000000000000008400000000000000840000000000000004000000000000008" +
  "4000000000000000400000000000000040000000000000084000000000000000" +
  "40";

describe("parseWkb Polygon", () => {
  test("simple 2D polygon (box)", () => {
    const data = makeWkbData(POLYGON_2D);
    const result = parseWkb(data);
    expect(result.length).toBe(1);

    const geomOffsets = getOffsets(result, 0);
    expect(Array.from(geomOffsets)).toEqual([0, 1]);

    const ringOffsets = getOffsets(result, 1);
    expect(Array.from(ringOffsets)).toEqual([0, 5]);

    const coords = getCoordValues(result);
    expect(coords.length).toBe(10); // 5 points * 2 dims
  });

  test("polygon with hole", () => {
    const data = makeWkbData(POLYGON_WITH_HOLE);
    const result = parseWkb(data);
    expect(result.length).toBe(1);

    const geomOffsets = getOffsets(result, 0);
    expect(Array.from(geomOffsets)).toEqual([0, 2]); // 2 rings

    const ringOffsets = getOffsets(result, 1);
    expect(Array.from(ringOffsets)).toEqual([0, 5, 10]); // 5 coords each ring
  });
});

describe("parseWkb MultiPoint", () => {
  test("2D multipoint", () => {
    const data = makeWkbData(MULTIPOINT_2D);
    const result = parseWkb(data);
    expect(result.length).toBe(1);

    const offsets = getOffsets(result, 0);
    expect(Array.from(offsets)).toEqual([0, 2]); // 2 points

    const coords = getCoordValues(result);
    expect(Array.from(coords)).toEqual([1, 2, 3, 4]);
  });
});

describe("parseWkb MultiLineString", () => {
  test("2D multilinestring", () => {
    const data = makeWkbData(MULTILINESTRING_2D);
    const result = parseWkb(data);
    expect(result.length).toBe(1);

    const geomOffsets = getOffsets(result, 0);
    expect(Array.from(geomOffsets)).toEqual([0, 2]); // 2 linestrings

    const lineOffsets = getOffsets(result, 1);
    expect(Array.from(lineOffsets)).toEqual([0, 2, 4]); // 2 points each

    const coords = getCoordValues(result);
    expect(Array.from(coords)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
});

describe("parseWkb MultiPolygon", () => {
  test("two boxes", () => {
    const data = makeWkbData(MULTIPOLYGON_2D);
    const result = parseWkb(data);
    expect(result.length).toBe(1);

    const geomOffsets = getOffsets(result, 0);
    expect(Array.from(geomOffsets)).toEqual([0, 2]); // 2 polygons

    const polyOffsets = getOffsets(result, 1);
    expect(Array.from(polyOffsets)).toEqual([0, 1, 2]); // 1 ring each

    const ringOffsets = getOffsets(result, 2);
    expect(Array.from(ringOffsets)).toEqual([0, 5, 10]); // 5 coords each

    const coords = getCoordValues(result);
    expect(coords.length).toBe(20); // 10 points * 2 dims
  });

  test("mixed geometry types throws", () => {
    expect(() => {
      makeWkbData(POINT_2D, MULTIPOLYGON_2D);
      const data = makeWkbData(POINT_2D, MULTIPOLYGON_2D);
      parseWkb(data);
    }).toThrow(/Mixed geometry types/);
  });
});

test("null entry preserves valid coordinates", () => {
  // Three points: (1,2), null, (3,4)
  const buf = hexToUint8Array(POINT_2D);
  const buf2 = hexToUint8Array(POINT_2D_B);
  const wkb = new Uint8Array(buf.length + buf2.length);
  wkb.set(buf, 0);
  wkb.set(buf2, buf.length);

  const nullBitmap = new Uint8Array([0b101]); // index 0 and 2 valid
  const valueOffsets = new Int32Array([
    0,
    buf.length,
    buf.length,
    buf.length + buf2.length,
  ]);
  const data = makeData({
    type: new Binary(),
    data: wkb,
    valueOffsets,
    nullBitmap,
    nullCount: 1,
  });

  const result = parseWkb(data);
  const coords = getCoordValues(result);
  // 3 entries * 2 dims = 6 values. Null slot is zeros.
  expect(coords.length).toBe(6);
  expect(Array.from(coords)).toEqual([1, 2, 0, 0, 3, 4]);
});

test("all-null batch throws with actionable message", () => {
  const buf = hexToUint8Array(POINT_2D);
  const nullBitmap = new Uint8Array([0b00]); // all null
  const valueOffsets = new Int32Array([0, buf.length]);
  const data = makeData({
    type: new Binary(),
    data: buf,
    valueOffsets,
    nullBitmap,
    nullCount: 1,
  });
  expect(() => parseWkb(data)).toThrow(/Cannot infer geometry type/);
});

describe("parseWkb empty geometries", () => {
  // python3 -c "from shapely import LineString; print(LineString().wkb.hex())"
  test("empty LineString", () => {
    const EMPTY_LS = "010200000000000000";
    const data = makeWkbData(EMPTY_LS);
    const result = parseWkb(data);
    expect(result.length).toBe(1);
    const offsets = getOffsets(result, 0);
    expect(Array.from(offsets)).toEqual([0, 0]);
  });

  // python3 -c "from shapely.geometry import Polygon; print(Polygon().wkb.hex())"
  test("empty Polygon", () => {
    const EMPTY_POLY = "010300000000000000";
    const data = makeWkbData(EMPTY_POLY);
    const result = parseWkb(data);
    expect(result.length).toBe(1);
    const geomOffsets = getOffsets(result, 0);
    expect(Array.from(geomOffsets)).toEqual([0, 0]);
  });

  // python3 -c "from shapely import MultiPolygon; print(MultiPolygon().wkb.hex())"
  test("empty MultiPolygon", () => {
    const EMPTY_MPOLY = "010600000000000000";
    const data = makeWkbData(EMPTY_MPOLY);
    const result = parseWkb(data);
    expect(result.length).toBe(1);
    const geomOffsets = getOffsets(result, 0);
    expect(Array.from(geomOffsets)).toEqual([0, 0]);
  });
});

describe("parseWkb EWKB", () => {
  test("Point with SRID 4326", () => {
    // python3 -c "from shapely import Point; import struct; wkb=Point(1,2).wkb; print((wkb[:1] + struct.pack('<I', 0x20000001) + struct.pack('<i', 4326) + wkb[5:]).hex())"
    const EWKB_POINT_SRID =
      "0101000020E6100000000000000000F03F0000000000000040";
    const data = makeWkbData(EWKB_POINT_SRID);
    const result = parseWkb(data);
    expect(result.length).toBe(1);

    const coords = getCoordValues(result);
    expect(Array.from(coords)).toEqual([1, 2]);
  });
});
