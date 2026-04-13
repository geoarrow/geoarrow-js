// src/io/wkb/types.ts
// cf. geoarrow-rs: rust/geoarrow-array/src/datatypes/dimension.rs

/** OGC Simple Features WKB geometry type codes */
export enum WkbType {
  Point = 1,
  LineString = 2,
  Polygon = 3,
  MultiPoint = 4,
  MultiLineString = 5,
  MultiPolygon = 6,
}

/** Coordinate dimensions (string enum to distinguish XYZ from XYM) */
export enum Dimension {
  XY = "XY",
  XYZ = "XYZ",
  XYM = "XYM",
  XYZM = "XYZM",
}

/** Number of float64 values per coordinate for a given dimension */
export function coordSize(dim: Dimension): number {
  switch (dim) {
    case Dimension.XY:
      return 2;
    case Dimension.XYZ:
    case Dimension.XYM:
      return 3;
    case Dimension.XYZM:
      return 4;
  }
}

/** Arrow field name for coordinate FixedSizeList */
export function coordFieldName(dim: Dimension): string {
  switch (dim) {
    case Dimension.XY:
      return "xy";
    case Dimension.XYZ:
      return "xyz";
    case Dimension.XYM:
      return "xym";
    case Dimension.XYZM:
      return "xyzm";
  }
}
