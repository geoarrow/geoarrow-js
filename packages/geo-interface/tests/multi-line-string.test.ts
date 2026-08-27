import { RefLineString, RefMultiLineString } from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";

describe("MultiLineStringTrait (via RefMultiLineString)", () => {
  it("reports count and per-index line strings", () => {
    const a = new RefLineString(
      [
        [0, 0],
        [1, 1],
      ],
      "XY",
    );
    const b = new RefLineString(
      [
        [10, 10],
        [20, 20],
        [30, 30],
      ],
      "XY",
    );
    const mls = new RefMultiLineString([a, b], "XY");
    expect(mls.geometryType).toBe("MultiLineString");
    expect(mls.dim()).toBe("XY");
    expect(mls.numLineStrings()).toBe(2);
    expect(mls.lineString(0).numCoords()).toBe(2);
    expect(mls.lineString(1).numCoords()).toBe(3);
  });
});
