import type {
  Dimension,
  GeometryInterface,
  MultiPointInterface,
  PointInterface,
} from "@geoarrow/geo-interface";
import type { PointData } from "@geoarrow/schema";
import type { Data, Float } from "apache-arrow";
import { makeData } from "apache-arrow";
import type { PointCapacity } from "./capacity/point.js";
import { BitmapBuilder } from "./internal/bitmap.js";
import { CoordBufferBuilder } from "./internal/coord.js";

export interface PointBuilderOptions {
  dim: Dimension;
}

/**
 * Two-pass builder for a GeoArrow Point column.
 *
 * PointData is a FixedSizeList<Float> — no list level. The coord buffer
 * has one slot per row; null and empty Points both occupy a slot with
 * NaN padding (the validity bitmap distinguishes them).
 */
export class PointBuilder {
  private readonly coords: CoordBufferBuilder;
  private readonly validity: BitmapBuilder;
  readonly dim: Dimension;

  private constructor(opts: PointBuilderOptions, capacity: PointCapacity) {
    this.dim = opts.dim;
    this.coords = new CoordBufferBuilder(capacity.geomCapacity, opts.dim);
    this.validity = new BitmapBuilder(capacity.geomCapacity);
  }

  static withCapacity(
    opts: PointBuilderOptions,
    capacity: PointCapacity,
  ): PointBuilder {
    return new PointBuilder(opts, capacity);
  }

  pushPoint(value: PointInterface | null): void {
    if (value === null) {
      this.coords.pushEmpty();
      this.validity.appendNull();
      return;
    }
    const coord = value.coord();
    if (coord === null) {
      this.coords.pushEmpty();
      this.validity.appendValid();
      return;
    }
    this.coords.pushCoord(coord);
    this.validity.appendValid();
  }

  pushGeometry(value: GeometryInterface | null): void {
    if (value === null) {
      this.pushPoint(null);
      return;
    }
    switch (value.geometryType) {
      case "Point":
        this.pushPoint(value);
        return;
      case "MultiPoint": {
        const mp: MultiPointInterface = value;
        const n = mp.numPoints();
        if (n === 0) {
          this.coords.pushEmpty();
          this.validity.appendValid();
        } else if (n === 1) {
          this.pushPoint(mp.point(0));
        } else {
          throw new Error(
            `PointBuilder.pushGeometry: MultiPoint with ${n} items cannot be unwrapped into a single Point`,
          );
        }
        return;
      }
      default:
        throw new Error(
          `PointBuilder.pushGeometry: expected Point, got ${value.geometryType}`,
        );
    }
  }

  finish(): PointData {
    const coordData = this.coords.finish();
    const nullBitmap = this.validity.finish();
    // PointData = Data<Point> = Data<FixedSizeList<Float>>, structurally
    // identical to CoordBufferBuilder's output. Rebuild via makeData so
    // we attach the validity bitmap cleanly without relying on shallow
    // spread of an Arrow Data instance. When no validity buffer exists,
    // pass nullCount: 0 explicitly so the resulting Data reports zero
    // nulls regardless of how apache-arrow normalizes a missing bitmap.
    if (nullBitmap === undefined) {
      return makeData({
        type: coordData.type,
        length: coordData.length,
        nullCount: 0,
        child: coordData.children[0] as Data<Float>,
      }) as PointData;
    }
    return makeData({
      type: coordData.type,
      length: coordData.length,
      nullBitmap,
      child: coordData.children[0] as Data<Float>,
    }) as PointData;
  }
}
