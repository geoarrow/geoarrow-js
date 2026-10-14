import { isPointData } from "@geoarrow/schema";
import { RefMultiPoint, RefPoint } from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import { PointCapacity } from "../src/capacity/point.js";
import { PointBuilder } from "../src/point.js";

describe("PointBuilder", () => {
  it("happy path, XY", () => {
    const points = [
      new RefPoint([1, 2], "XY"),
      new RefPoint([3, 4], "XY"),
      new RefPoint([5, 6], "XY"),
    ];
    const cap = PointCapacity.fromPoints(points);
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    for (const p of points) b.pushPoint(p);
    const data = b.finish();
    expect(data.length).toBe(3);
    expect(data.nullCount).toBe(0);
    expect(Array.from(data.children[0].values as Float64Array)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("happy path, XYZ", () => {
    const points = [
      new RefPoint([1, 2, 3], "XYZ"),
      new RefPoint([4, 5, 6], "XYZ"),
    ];
    const cap = PointCapacity.fromPoints(points);
    const b = PointBuilder.withCapacity({ dim: "XYZ" }, cap);
    for (const p of points) b.pushPoint(p);
    const data = b.finish();
    expect(data.length).toBe(2);
    expect(Array.from(data.children[0].values as Float64Array)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("null rows allocate the bitmap with Arrow 1=valid convention", () => {
    const cap = new PointCapacity();
    cap.addPoint(new RefPoint([1, 2], "XY"));
    cap.addPoint(null);
    cap.addPoint(new RefPoint([5, 6], "XY"));
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushPoint(new RefPoint([1, 2], "XY"));
    b.pushPoint(null);
    b.pushPoint(new RefPoint([5, 6], "XY"));
    const data = b.finish();
    expect(data.nullBitmap).toBeInstanceOf(Uint8Array);
    expect((data.nullBitmap![0] >> 0) & 1).toBe(1);
    expect((data.nullBitmap![0] >> 1) & 1).toBe(0);
    expect((data.nullBitmap![0] >> 2) & 1).toBe(1);
  });

  it("empty point (coord() === null) is valid with NaN ordinates", () => {
    const cap = new PointCapacity();
    cap.addPoint(new RefPoint([1, 2], "XY"));
    cap.addPoint(new RefPoint(null, "XY"));
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushPoint(new RefPoint([1, 2], "XY"));
    b.pushPoint(new RefPoint(null, "XY"));
    const data = b.finish();
    expect(data.nullCount).toBe(0);
    const values = data.children[0].values as Float64Array;
    expect(values[0]).toBe(1);
    expect(values[1]).toBe(2);
    expect(Number.isNaN(values[2])).toBe(true);
    expect(Number.isNaN(values[3])).toBe(true);
  });

  it("pushGeometry accepts Point directly", () => {
    const cap = new PointCapacity();
    cap.addGeometry(new RefPoint([1, 2], "XY"));
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(new RefPoint([1, 2], "XY"));
    const data = b.finish();
    expect(data.length).toBe(1);
  });

  it("pushGeometry unwraps a one-item MultiPoint", () => {
    const cap = new PointCapacity();
    cap.addGeometry(new RefMultiPoint([new RefPoint([1, 2], "XY")], "XY"));
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(new RefMultiPoint([new RefPoint([1, 2], "XY")], "XY"));
    const data = b.finish();
    expect(Array.from(data.children[0].values as Float64Array)).toEqual([1, 2]);
  });

  it("pushGeometry accepts an empty MultiPoint as an empty Point", () => {
    const cap = new PointCapacity();
    cap.addGeometry(new RefMultiPoint([], "XY"));
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(new RefMultiPoint([], "XY"));
    const data = b.finish();
    expect(data.length).toBe(1);
    expect(data.nullCount).toBe(0);
    const values = data.children[0].values as Float64Array;
    expect(Number.isNaN(values[0])).toBe(true);
    expect(Number.isNaN(values[1])).toBe(true);
  });

  it("pushGeometry throws on MultiPoint with 2+ children", () => {
    const cap = new PointCapacity();
    // Capacity walk should throw on the same input — verify both sides
    const mp = new RefMultiPoint(
      [new RefPoint([1, 2], "XY"), new RefPoint([3, 4], "XY")],
      "XY",
    );
    expect(() => cap.addGeometry(mp)).toThrowError(
      /PointCapacity\.addGeometry: MultiPoint with 2 items/,
    );
    // (Builder never sees this input because the walk rejects first, but
    // verify the builder's own defense here.)
    cap.addPoint(new RefPoint([0, 0], "XY")); // size for 1 row to keep withCapacity happy
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    expect(() => b.pushGeometry(mp)).toThrowError(
      /PointBuilder\.pushGeometry: MultiPoint with 2 items/,
    );
  });

  it("pushGeometry throws on wrong type", () => {
    const cap = new PointCapacity();
    cap.addPoint(null);
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    expect(() =>
      b.pushGeometry({
        geometryType: "LineString",
        dim: () => "XY",
        numCoords: () => 0,
        coord: () => {
          throw new Error("unreachable");
        },
      } as any),
    ).toThrowError(
      /PointBuilder\.pushGeometry: expected Point, got LineString/,
    );
  });

  it("coord dimension mismatch throws from CoordBufferBuilder", () => {
    const cap = new PointCapacity();
    cap.addPoint(null);
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    expect(() => b.pushPoint(new RefPoint([1, 2, 3], "XYZ"))).toThrowError(
      /coord dimension mismatch/,
    );
  });

  it("round trips through isPointData type guard", () => {
    const cap = new PointCapacity();
    cap.addPoint(new RefPoint([1, 2], "XY"));
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushPoint(new RefPoint([1, 2], "XY"));
    const data = b.finish();
    expect(isPointData(data)).toBe(true);
  });
});
