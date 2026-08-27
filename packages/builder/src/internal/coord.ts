import type { CoordInterface, Dimension } from "@geoarrow/geo-interface";
import { sizeOf } from "@geoarrow/geo-interface";
import type { InterleavedCoord } from "@geoarrow/schema";
import type { Data, Float } from "apache-arrow";
import { Field, FixedSizeList, Float64, makeData } from "apache-arrow";

export type CoordType = "interleaved";

/**
 * Pre-sized interleaved coordinate buffer.
 *
 * Holds a single Float64Array big enough for `capacity * sizeOf(dim)`
 * ordinates. `pushCoord` appends a full coordinate; `pushEmpty` writes
 * NaN for each ordinate (used by PointBuilder for null/empty points,
 * and by MultiPointBuilder for inner empty Points).
 *
 * `finish()` returns an Arrow `Data<InterleavedCoord>` (FixedSizeList<Float>
 * over a Float64 child). Geometry builders never see the underlying
 * typed array — they only see the Arrow `Data`, which they pass as a
 * child to their own `makeData` call. This encapsulation is the key
 * hook for the future separated-coord extension: adding separated
 * support means adding a `"separated"` case to `CoordType`, a branch
 * in `pushCoord`, and an alternate `finish()` that returns
 * `Data<SeparatedCoord>`. None of the geometry builders need to change.
 *
 * Capacity is fixed at construction. Callers must append no more
 * coordinates than declared. The two-pass design in `@geoarrow/builder`
 * guarantees this when capacity classes and builders are used together
 * as intended.
 */
export class CoordBufferBuilder {
  private readonly buf: Float64Array;
  private pos = 0;
  private coordCount = 0;

  constructor(
    capacity: number,
    readonly dim: Dimension,
    readonly coordType: CoordType = "interleaved",
  ) {
    this.buf = new Float64Array(capacity * sizeOf(dim));
  }

  pushCoord(coord: CoordInterface): void {
    if (coord.dim() !== this.dim) {
      throw new Error(
        `coord dimension mismatch: builder is ${this.dim}, got ${coord.dim()}`,
      );
    }
    const size = sizeOf(this.dim);
    for (let i = 0; i < size; i++) {
      this.buf[this.pos + i] = coord.nth(i);
    }
    this.pos += size;
    this.coordCount++;
  }

  pushEmpty(): void {
    const size = sizeOf(this.dim);
    for (let i = 0; i < size; i++) {
      this.buf[this.pos + i] = Number.NaN;
    }
    this.pos += size;
    this.coordCount++;
  }

  finish(): Data<InterleavedCoord> {
    const size = sizeOf(this.dim);
    const childType = new Float64();
    const listType = new FixedSizeList<Float>(
      size,
      new Field<Float>("xy", childType, false),
    );
    const childData = makeData({
      type: childType,
      length: this.coordCount * size,
      nullCount: 0,
      data: this.buf,
    });
    return makeData({
      type: listType,
      length: this.coordCount,
      nullCount: 0,
      child: childData,
    }) as Data<InterleavedCoord>;
  }
}
