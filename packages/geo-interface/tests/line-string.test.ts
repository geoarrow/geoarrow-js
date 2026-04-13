import { RefLineString } from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";

describe("LineStringTrait (via RefLineString)", () => {
  it("reports count, dim, and per-index coords", () => {
    const ls = new RefLineString(
      [
        [0, 0],
        [1, 1],
        [2, 4],
      ],
      "XY",
    );
    expect(ls.geometryType).toBe("LineString");
    expect(ls.dim()).toBe("XY");
    expect(ls.numCoords()).toBe(3);
    expect(ls.coord(0).x()).toBe(0);
    expect(ls.coord(0).y()).toBe(0);
    expect(ls.coord(2).x()).toBe(2);
    expect(ls.coord(2).y()).toBe(4);
  });

  it("handles an empty line string (numCoords === 0)", () => {
    const ls = new RefLineString([], "XY");
    expect(ls.numCoords()).toBe(0);
  });
});
