import { RefCoord } from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";

describe("CoordTrait (via RefCoord)", () => {
  it("XY coord reports dim, x, y, and nth", () => {
    const c = new RefCoord([1.5, 2.5], "XY");
    expect(c.dim()).toBe("XY");
    expect(c.x()).toBe(1.5);
    expect(c.y()).toBe(2.5);
    expect(c.nth(0)).toBe(1.5);
    expect(c.nth(1)).toBe(2.5);
  });

  it("XYZ coord exposes x, y, z via nth and accessors", () => {
    const c = new RefCoord([1, 2, 3], "XYZ");
    expect(c.dim()).toBe("XYZ");
    expect(c.x()).toBe(1);
    expect(c.y()).toBe(2);
    expect(c.nth(0)).toBe(1);
    expect(c.nth(1)).toBe(2);
    expect(c.nth(2)).toBe(3);
  });
});
