import { describe, expect, it } from "vitest";
import { RefMultiPoint, RefPoint } from "./fixtures.js";

describe("MultiPointTrait (via RefMultiPoint)", () => {
  it("reports count and per-index points", () => {
    const mp = new RefMultiPoint(
      [new RefPoint([0, 0], "XY"), new RefPoint([1, 2], "XY")],
      "XY",
    );
    expect(mp.geometryType).toBe("MultiPoint");
    expect(mp.dim()).toBe("XY");
    expect(mp.numPoints()).toBe(2);
    expect(mp.point(1).coord()!.x()).toBe(1);
    expect(mp.point(1).coord()!.y()).toBe(2);
  });
});
