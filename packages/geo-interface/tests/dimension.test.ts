import { describe, expect, it } from "vitest";
import type { Dimension } from "../src/index.js";
import { sizeOf } from "../src/index.js";

describe("sizeOf", () => {
  it("returns 2 for XY", () => {
    expect(sizeOf("XY")).toBe(2);
  });

  it("returns 3 for XYZ", () => {
    expect(sizeOf("XYZ")).toBe(3);
  });

  it("accepts Dimension-typed variable", () => {
    const d: Dimension = "XY";
    expect(sizeOf(d)).toBe(2);
  });
});
