import { describe, expect, it } from "vitest";
import { OffsetsBuilder } from "../../src/internal/offsets.js";

describe("OffsetsBuilder", () => {
  it("finish() returns an Int32Array of length capacity + 1", () => {
    const b = new OffsetsBuilder(4);
    b.appendLength(0);
    b.appendLength(0);
    b.appendLength(0);
    b.appendLength(0);
    const out = b.finish();
    expect(out).toBeInstanceOf(Int32Array);
    expect(out.length).toBe(5);
  });

  it("buf[0] is always 0", () => {
    const b = new OffsetsBuilder(1);
    b.appendLength(3);
    const out = b.finish();
    expect(out[0]).toBe(0);
  });

  it("computes a running sum from per-row lengths", () => {
    const b = new OffsetsBuilder(4);
    b.appendLength(2); // row 0 has 2 children
    b.appendLength(3); // row 1 has 3 children
    b.appendLength(0); // row 2 is empty
    b.appendLength(1); // row 3 has 1 child
    const out = b.finish();
    expect(Array.from(out)).toEqual([0, 2, 5, 5, 6]);
  });

  it("allows appending zero-length rows", () => {
    const b = new OffsetsBuilder(3);
    b.appendLength(0);
    b.appendLength(0);
    b.appendLength(0);
    const out = b.finish();
    expect(Array.from(out)).toEqual([0, 0, 0, 0]);
  });

  it("allows capacity of zero (empty column)", () => {
    const b = new OffsetsBuilder(0);
    const out = b.finish();
    expect(out.length).toBe(1);
    expect(out[0]).toBe(0);
  });
});
