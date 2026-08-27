import { RefLineString, RefPolygon } from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";

describe("PolygonTrait (via RefPolygon)", () => {
  it("polygon with an exterior ring and one hole", () => {
    const shell = new RefLineString(
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
      "XY",
    );
    const hole = new RefLineString(
      [
        [2, 2],
        [4, 2],
        [4, 4],
        [2, 4],
        [2, 2],
      ],
      "XY",
    );
    const p = new RefPolygon(shell, [hole], "XY");
    expect(p.geometryType).toBe("Polygon");
    expect(p.dim()).toBe("XY");
    const ext = p.exterior();
    expect(ext).not.toBeNull();
    expect(ext!.numCoords()).toBe(5);
    expect(p.numInteriors()).toBe(1);
    expect(p.interior(0).numCoords()).toBe(5);
  });

  it("empty polygon returns null from exterior()", () => {
    const p = new RefPolygon(null, [], "XY");
    expect(p.exterior()).toBeNull();
    expect(p.numInteriors()).toBe(0);
  });
});
