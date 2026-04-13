import { describe, expect, it } from "vitest";
import { RefLineString, RefMultiPolygon, RefPolygon } from "./fixtures.js";

describe("MultiPolygonTrait (via RefMultiPolygon)", () => {
  it("reports count and per-index polygons", () => {
    const triangle = new RefPolygon(
      new RefLineString(
        [
          [0, 0],
          [1, 0],
          [0, 1],
          [0, 0],
        ],
        "XY",
      ),
      [],
      "XY",
    );
    const square = new RefPolygon(
      new RefLineString(
        [
          [10, 10],
          [20, 10],
          [20, 20],
          [10, 20],
          [10, 10],
        ],
        "XY",
      ),
      [],
      "XY",
    );
    const mp = new RefMultiPolygon([triangle, square], "XY");
    expect(mp.geometryType).toBe("MultiPolygon");
    expect(mp.dim()).toBe("XY");
    expect(mp.numPolygons()).toBe(2);
    expect(mp.polygon(0).exterior()!.numCoords()).toBe(4);
    expect(mp.polygon(1).exterior()!.numCoords()).toBe(5);
  });
});
