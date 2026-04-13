/**
 * Coordinate dimension tag.
 *
 * - `"XY"` — 2D, two ordinates per coordinate.
 * - `"XYZ"` — 3D with a Z (elevation) ordinate, three ordinates per coordinate.
 *
 * XYM and XYZM may be supported in the future.
 */
export type Dimension = "XY" | "XYZ";

/**
 * Returns the number of ordinates in a single coordinate of the given dimension.
 *
 * @returns `2` for `"XY"`, `3` for `"XYZ"`.
 */
export function sizeOf(dim: Dimension): number {
  switch (dim) {
    case "XY":
      return 2;
    case "XYZ":
      return 3;
  }
}

/**
 * A single coordinate (2D or 3D).
 *
 * Implementations are expected to be lazy: accessors may read from an
 * underlying buffer on demand. Callers must respect {@link Coord.dim}
 * before calling {@link Coord.nth}; out-of-range access via `nth` is a
 * caller bug and is not bounds-checked.
 */
export interface CoordInterface {
  /** Dimension of this coordinate. */
  dim(): Dimension;
  /** First ordinate. Always valid. */
  x(): number;
  /** Second ordinate. Always valid. */
  y(): number;
  /**
   * n-th ordinate by index: `0 = x`, `1 = y`, `2 = z` (`"XYZ"` only).
   * No bounds check — the caller is responsible for respecting `dim()`.
   */
  nth(n: number): number;
}

/**
 * A single point geometry.
 *
 * An empty point (a point with no coordinate) is a distinct state from a
 * point at the origin: `coord()` returns `null` for an empty point.
 */
export interface PointInterface {
  readonly geometryType: "Point";
  /** Dimension of this point's coordinate, if any. */
  dim(): Dimension;
  /** The point's coordinate, or `null` if the point is empty. */
  coord(): CoordInterface | null;
}

/**
 * A line string geometry: an ordered sequence of coordinates.
 *
 * An empty line string has `numCoords() === 0`. Callers must respect
 * `numCoords()` before calling `coord(i)`.
 */
export interface LineStringInterface {
  readonly geometryType: "LineString";
  /** Dimension of every coordinate in this line string. */
  dim(): Dimension;
  /** Number of coordinates in this line string. */
  numCoords(): number;
  /** The i-th coordinate. No bounds check. */
  coord(i: number): CoordInterface;
}

/**
 * A polygon geometry: an exterior ring plus zero or more interior rings (holes).
 *
 * An empty polygon has no exterior ring, and `exterior()` returns `null`.
 * Per the OGC Simple Features spec, an empty polygon also has zero interior
 * rings, so `numInteriors() === 0` for any empty polygon.
 */
export interface PolygonInterface {
  readonly geometryType: "Polygon";
  /** Dimension of every coordinate in this polygon. */
  dim(): Dimension;
  /** Number of interior rings (holes). */
  numInteriors(): number;
  /** The exterior ring, or `null` if the polygon is empty. */
  exterior(): LineStringInterface | null;
  /** The i-th interior ring. No bounds check. */
  interior(i: number): LineStringInterface;
}

/**
 * A multi-point geometry: a collection of points.
 *
 * An empty multi-point has `numPoints() === 0`.
 */
export interface MultiPointInterface {
  readonly geometryType: "MultiPoint";
  /** Dimension of every point in this multi-point. */
  dim(): Dimension;
  /** Number of points. */
  numPoints(): number;
  /** The i-th point. No bounds check. */
  point(i: number): PointInterface;
}

/**
 * A multi-line-string geometry: a collection of line strings.
 *
 * An empty multi-line-string has `numLineStrings() === 0`.
 */
export interface MultiLineStringInterface {
  readonly geometryType: "MultiLineString";
  /** Dimension of every line string in this multi-line-string. */
  dim(): Dimension;
  /** Number of line strings. */
  numLineStrings(): number;
  /** The i-th line string. No bounds check. */
  lineString(i: number): LineStringInterface;
}

/**
 * A multi-polygon geometry: a collection of polygons.
 *
 * An empty multi-polygon has `numPolygons() === 0`.
 */
export interface MultiPolygonInterface {
  readonly geometryType: "MultiPolygon";
  /** Dimension of every polygon in this multi-polygon. */
  dim(): Dimension;
  /** Number of polygons. */
  numPolygons(): number;
  /** The i-th polygon. No bounds check. */
  polygon(i: number): PolygonInterface;
}

/**
 * A heterogeneous collection of geometries.
 *
 * Children may be of any concrete geometry type, and may include nested
 * `GeometryCollection` values.
 */
export interface GeometryCollectionInterface {
  readonly geometryType: "GeometryCollection";
  /** Dimension of this collection. Children are expected to share this dimension. */
  dim(): Dimension;
  /** Number of child geometries. */
  numGeometries(): number;
  /** The i-th child geometry. No bounds check. */
  geometry(i: number): GeometryInterface;
}

/**
 * Discriminated union of every geometry interface.
 *
 * Use the `geometryType` discriminant to narrow to a concrete variant:
 *
 * ```ts
 * function describe(g: Geometry): string {
 *   switch (g.geometryType) {
 *     case "Point":      return "point";
 *     case "LineString": return `${g.numCoords()}-pt line`;
 *     // ...
 *   }
 * }
 * ```
 */
export type GeometryInterface =
  | PointInterface
  | LineStringInterface
  | PolygonInterface
  | MultiPointInterface
  | MultiLineStringInterface
  | MultiPolygonInterface
  | GeometryCollectionInterface;

export * from "./iter.js";
