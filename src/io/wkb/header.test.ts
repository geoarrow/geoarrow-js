import { describe, test, expect } from "vitest";
import { readHeader, writeHeader } from "./header";
import { WkbType, Dimension } from "./types";

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

describe("readHeader", () => {
  test("ISO WKB Point 2D (LE)", () => {
    const buf = hexToBuffer("0101000000");
    const h = readHeader(new DataView(buf), 0);
    expect(h.type).toBe(WkbType.Point);
    expect(h.dimension).toBe(Dimension.XY);
    expect(h.srid).toBeNull();
    expect(h.headerSize).toBe(5);
    expect(h.littleEndian).toBe(true);
  });

  test("ISO WKB Point 2D (BE)", () => {
    const buf = hexToBuffer("0000000001");
    const h = readHeader(new DataView(buf), 0);
    expect(h.type).toBe(WkbType.Point);
    expect(h.dimension).toBe(Dimension.XY);
    expect(h.littleEndian).toBe(false);
    expect(h.headerSize).toBe(5);
  });

  test("ISO WKB Polygon 3D (type 1003)", () => {
    const buf = hexToBuffer("01EB030000");
    const h = readHeader(new DataView(buf), 0);
    expect(h.type).toBe(WkbType.Polygon);
    expect(h.dimension).toBe(Dimension.XYZ);
    expect(h.headerSize).toBe(5);
  });

  test("ISO WKB MultiPolygon 2D", () => {
    const buf = hexToBuffer("0106000000");
    const h = readHeader(new DataView(buf), 0);
    expect(h.type).toBe(WkbType.MultiPolygon);
    expect(h.dimension).toBe(Dimension.XY);
  });

  test("EWKB Point with SRID", () => {
    const buf = hexToBuffer("0101000020E6100000");
    const h = readHeader(new DataView(buf), 0);
    expect(h.type).toBe(WkbType.Point);
    expect(h.dimension).toBe(Dimension.XY);
    expect(h.srid).toBe(4326);
    expect(h.headerSize).toBe(9);
  });

  test("EWKB Point with Z + SRID", () => {
    const buf = hexToBuffer("01010000A0E6100000");
    const h = readHeader(new DataView(buf), 0);
    expect(h.type).toBe(WkbType.Point);
    expect(h.dimension).toBe(Dimension.XYZ);
    expect(h.srid).toBe(4326);
    expect(h.headerSize).toBe(9);
  });

  test("EWKB Point with Z + M (no SRID)", () => {
    // 0xC0000001 = Z + M flags, base type 1 (Point)
    const buf = hexToBuffer("01010000C0");
    const h = readHeader(new DataView(buf), 0);
    expect(h.type).toBe(WkbType.Point);
    expect(h.dimension).toBe(Dimension.XYZM);
    expect(h.srid).toBeNull();
    expect(h.headerSize).toBe(5);
  });

  test("truncated EWKB with SRID throws", () => {
    // SRID flag set but buffer only 7 bytes (need 9)
    const buf = hexToBuffer("01010000200000");
    expect(() => readHeader(new DataView(buf), 0)).toThrow(/Truncated EWKB/);
  });

  test("header at non-zero offset", () => {
    const buf = hexToBuffer("DEADBEEF" + "0105000000");
    const h = readHeader(new DataView(buf), 4);
    expect(h.type).toBe(WkbType.MultiLineString);
    expect(h.dimension).toBe(Dimension.XY);
  });
});

describe("writeHeader", () => {
  test("writes ISO WKB Point 2D (LE)", () => {
    const buf = new ArrayBuffer(5);
    const view = new DataView(buf);
    const size = writeHeader(view, 0, WkbType.Point, Dimension.XY);
    expect(size).toBe(5);
    expect(new Uint8Array(buf)).toEqual(
      new Uint8Array([0x01, 0x01, 0x00, 0x00, 0x00]),
    );
  });

  test("writes ISO WKB MultiPolygon 3D (LE)", () => {
    const buf = new ArrayBuffer(5);
    const view = new DataView(buf);
    const size = writeHeader(view, 0, WkbType.MultiPolygon, Dimension.XYZ);
    expect(size).toBe(5);
    const typeVal = new DataView(buf).getUint32(1, true);
    expect(typeVal).toBe(1006);
  });

  test("round-trip: read(write(header)) === header", () => {
    for (const type of [
      WkbType.Point,
      WkbType.LineString,
      WkbType.Polygon,
      WkbType.MultiPoint,
      WkbType.MultiLineString,
      WkbType.MultiPolygon,
    ]) {
      for (const dim of [Dimension.XY, Dimension.XYZ, Dimension.XYZM]) {
        const buf = new ArrayBuffer(5);
        const view = new DataView(buf);
        writeHeader(view, 0, type, dim);
        const h = readHeader(view, 0);
        expect(h.type).toBe(type);
        expect(h.dimension).toBe(dim);
      }
    }
  });
});
