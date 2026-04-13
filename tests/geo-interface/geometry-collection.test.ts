import { describe, expect, it } from "vitest";
import { RefGeometryCollection, RefLineString, RefPoint } from "./fixtures.js";

describe("GeometryCollectionTrait (via RefGeometryCollection)", () => {
  it("reports count and heterogeneous children", () => {
    const gc = new RefGeometryCollection(
      [
        new RefPoint([0, 0], "XY"),
        new RefLineString(
          [
            [1, 1],
            [2, 2],
          ],
          "XY",
        ),
      ],
      "XY",
    );
    expect(gc.geometryType).toBe("GeometryCollection");
    expect(gc.dim()).toBe("XY");
    expect(gc.numGeometries()).toBe(2);
    expect(gc.geometry(0).geometryType).toBe("Point");
    expect(gc.geometry(1).geometryType).toBe("LineString");
  });
});
