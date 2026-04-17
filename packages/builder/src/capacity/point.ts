import type {
  GeometryInterface,
  MultiPointInterface,
  PointInterface,
} from "@geoarrow/geo-interface";

/**
 * Counting-pass capacity for PointBuilder.
 *
 * PointData is a FixedSizeList<Float> with no list level, so there is
 * only one counter: the number of Point rows. Each null, empty Point,
 * and valid Point occupies exactly one coord slot.
 */
export class PointCapacity {
  geomCapacity = 0;

  addPoint(_value: PointInterface | null): void {
    this.geomCapacity++;
  }

  addGeometry(value: GeometryInterface | null): void {
    if (value === null) {
      this.geomCapacity++;
      return;
    }
    switch (value.geometryType) {
      case "Point":
        this.addPoint(value);
        return;
      case "MultiPoint": {
        const mp: MultiPointInterface = value;
        const n = mp.numPoints();
        if (n === 0 || n === 1) {
          this.geomCapacity++;
        } else {
          throw new Error(
            `PointCapacity.addGeometry: MultiPoint with ${n} items cannot be unwrapped into a single Point`,
          );
        }
        return;
      }
      default:
        throw new Error(
          `PointCapacity.addGeometry: expected Point, got ${value.geometryType}`,
        );
    }
  }

  static fromPoints(iter: Iterable<PointInterface | null>): PointCapacity {
    const cap = new PointCapacity();
    for (const p of iter) cap.addPoint(p);
    return cap;
  }

  static fromGeometries(
    iter: Iterable<GeometryInterface | null>,
  ): PointCapacity {
    const cap = new PointCapacity();
    for (const g of iter) cap.addGeometry(g);
    return cap;
  }
}
