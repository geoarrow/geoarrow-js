import { RefMultiPoint, RefPoint } from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import { PointCapacity } from "../../src/capacity/point.js";

describe("PointCapacity", () => {
  it("addPoint increments geomCapacity", () => {
    const c = new PointCapacity();
    c.addPoint(new RefPoint([1, 2], "XY"));
    c.addPoint(new RefPoint([3, 4], "XY"));
    c.addPoint(new RefPoint(null, "XY"));
    c.addPoint(null);
    expect(c.geomCapacity).toBe(4);
  });

  it("fromPoints walks an iterable", () => {
    const c = PointCapacity.fromPoints([
      new RefPoint([1, 2], "XY"),
      new RefPoint([3, 4], "XY"),
      null,
    ]);
    expect(c.geomCapacity).toBe(3);
  });

  it("addGeometry accepts Point", () => {
    const c = new PointCapacity();
    c.addGeometry(new RefPoint([1, 2], "XY"));
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry accepts null", () => {
    const c = new PointCapacity();
    c.addGeometry(null);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry accepts zero-item MultiPoint as empty Point", () => {
    const c = new PointCapacity();
    c.addGeometry(new RefMultiPoint([], "XY"));
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry accepts one-item MultiPoint as single Point", () => {
    const c = new PointCapacity();
    c.addGeometry(new RefMultiPoint([new RefPoint([1, 2], "XY")], "XY"));
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry throws on MultiPoint with 2+ children", () => {
    const c = new PointCapacity();
    const mp = new RefMultiPoint(
      [new RefPoint([1, 2], "XY"), new RefPoint([3, 4], "XY")],
      "XY",
    );
    expect(() => c.addGeometry(mp)).toThrowError(
      /PointCapacity\.addGeometry: MultiPoint with 2 items/,
    );
  });

  it("addGeometry throws on wrong geometry type", () => {
    const c = new PointCapacity();
    expect(() =>
      c.addGeometry({
        geometryType: "LineString",
        dim: () => "XY",
        numCoords: () => 0,
        coord: () => {
          throw new Error("unreachable");
        },
      } as any),
    ).toThrowError(
      /PointCapacity\.addGeometry: expected Point, got LineString/,
    );
  });
});
