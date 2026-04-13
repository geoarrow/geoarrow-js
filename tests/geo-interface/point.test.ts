import { describe, expect, it } from "vitest";
import { RefPoint } from "./fixtures.js";

describe("PointTrait (via RefPoint)", () => {
  it("non-empty point exposes coord", () => {
    const p = new RefPoint([10, 20], "XY");
    expect(p.geometryType).toBe("Point");
    expect(p.dim()).toBe("XY");
    const c = p.coord();
    expect(c).not.toBeNull();
    expect(c!.x()).toBe(10);
    expect(c!.y()).toBe(20);
  });

  it("empty point returns null from coord()", () => {
    const p = new RefPoint(null, "XY");
    expect(p.geometryType).toBe("Point");
    expect(p.coord()).toBeNull();
  });
});
