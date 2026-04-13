// src/io/wkb/writer.test.ts
import { describe, test, expect } from "vitest";
import {
  makeData,
  Binary,
  Field,
  FixedSizeList,
  Float64,
  List,
} from "apache-arrow";
import { toWkb } from "./writer";
import { parseWkb } from "./reader";

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

// Same fixtures as reader tests
const POINT_2D = "0101000000000000000000F03F0000000000000040";
const LINESTRING_2D =
  "010200000003000000000000000000000000000000000000000000000000" +
  "00F03F000000000000F03F00000000000000400000000000000000";

describe("toWkb", () => {
  test("Point 2D: encode manually built GeoArrow", () => {
    const coords = new Float64Array([1, 2]);
    const floatData = makeData({ type: new Float64(), data: coords });
    const pointData = makeData({
      type: new FixedSizeList(2, new Field("xy", new Float64(), false)),
      child: floatData,
    });

    const result = toWkb(pointData);
    expect(result.length).toBe(1);

    const wkbBytes = new Uint8Array(
      result.values.buffer,
      result.values.byteOffset + result.valueOffsets[0],
      result.valueOffsets[1] - result.valueOffsets[0],
    );
    expect(uint8ArrayToHex(wkbBytes)).toBe(POINT_2D.toLowerCase());
  });

  test("LineString 2D: encode manually built GeoArrow", () => {
    const coords = new Float64Array([0, 0, 1, 1, 2, 0]);
    const floatData = makeData({ type: new Float64(), data: coords });
    const verticesData = makeData({
      type: new FixedSizeList(2, new Field("xy", new Float64(), false)),
      child: floatData,
    });
    const lineData = makeData({
      type: new List(new Field("vertices", verticesData.type, false)),
      valueOffsets: new Int32Array([0, 3]),
      child: verticesData,
    });

    const result = toWkb(lineData);
    expect(result.length).toBe(1);

    const wkbBytes = new Uint8Array(
      result.values.buffer,
      result.values.byteOffset + result.valueOffsets[0],
      result.valueOffsets[1] - result.valueOffsets[0],
    );
    expect(uint8ArrayToHex(wkbBytes)).toBe(LINESTRING_2D.toLowerCase());
  });
});
