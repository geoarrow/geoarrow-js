import type { InterleavedCoord } from "@geoarrow/schema";
import { RefCoord } from "@geoarrow/test-fixtures";
import type { Data, Float } from "apache-arrow";
import { FixedSizeList } from "apache-arrow";
import { describe, expect, it } from "vitest";
import { CoordBufferBuilder } from "../../src/internal/coord.js";

describe("CoordBufferBuilder", () => {
  it("pushes XY coords into the expected slots", () => {
    const b = new CoordBufferBuilder(3, "XY");
    b.pushCoord(new RefCoord([1, 2], "XY"));
    b.pushCoord(new RefCoord([3, 4], "XY"));
    b.pushCoord(new RefCoord([5, 6], "XY"));
    const data = b.finish();
    const values = data.children[0].values as Float64Array;
    expect(Array.from(values)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("pushes XYZ coords into the expected slots", () => {
    const b = new CoordBufferBuilder(2, "XYZ");
    b.pushCoord(new RefCoord([1, 2, 3], "XYZ"));
    b.pushCoord(new RefCoord([4, 5, 6], "XYZ"));
    const data = b.finish();
    const values = data.children[0].values as Float64Array;
    expect(Array.from(values)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("throws on dimension mismatch in pushCoord", () => {
    const b = new CoordBufferBuilder(1, "XY");
    expect(() => b.pushCoord(new RefCoord([1, 2, 3], "XYZ"))).toThrowError(
      /coord dimension mismatch/,
    );
  });

  it("pushEmpty writes NaN for each ordinate", () => {
    const b = new CoordBufferBuilder(2, "XY");
    b.pushCoord(new RefCoord([1, 2], "XY"));
    b.pushEmpty();
    const data = b.finish();
    const values = data.children[0].values as Float64Array;
    expect(values[0]).toBe(1);
    expect(values[1]).toBe(2);
    expect(Number.isNaN(values[2])).toBe(true);
    expect(Number.isNaN(values[3])).toBe(true);
  });

  it("finish() returns a Data<FixedSizeList> with listSize matching the dimension", () => {
    const b = new CoordBufferBuilder(2, "XYZ");
    b.pushCoord(new RefCoord([1, 2, 3], "XYZ"));
    b.pushCoord(new RefCoord([4, 5, 6], "XYZ"));
    const data: Data<InterleavedCoord> = b.finish();
    expect(data.type).toBeInstanceOf(FixedSizeList);
    expect((data.type as FixedSizeList<Float>).listSize).toBe(3);
    expect(data.length).toBe(2);
  });

  it("finish() wraps a Float64 child data of length coordCount * sizeOf(dim)", () => {
    const b = new CoordBufferBuilder(4, "XY");
    b.pushCoord(new RefCoord([1, 2], "XY"));
    b.pushCoord(new RefCoord([3, 4], "XY"));
    b.pushCoord(new RefCoord([5, 6], "XY"));
    b.pushCoord(new RefCoord([7, 8], "XY"));
    const data = b.finish();
    expect(data.children.length).toBe(1);
    expect(data.children[0].length).toBe(8);
  });
});
