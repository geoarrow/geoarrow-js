import type {
  Coord,
  Geometry,
  GeometryCollection,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
} from "./interface.js";

/**
 * Yields every coordinate of a line string in order.
 *
 * Equivalent to a `for` loop over `ls.coord(i)` for `i < ls.numCoords()`.
 * Yields nothing for an empty line string.
 */
export function* iterCoords(ls: LineString): IterableIterator<Coord> {
  const n = ls.numCoords();
  for (let i = 0; i < n; i++) yield ls.coord(i);
}

/**
 * Yields every interior ring (hole) of a polygon in order.
 *
 * The exterior ring is not included. Use `polygon.exterior()` for that.
 * Yields nothing for a polygon with no holes (or an empty polygon).
 */
export function* iterInteriors(p: Polygon): IterableIterator<LineString> {
  const n = p.numInteriors();
  for (let i = 0; i < n; i++) yield p.interior(i);
}

/**
 * Yields every point of a multi-point in order.
 */
export function* iterPoints(mp: MultiPoint): IterableIterator<Point> {
  const n = mp.numPoints();
  for (let i = 0; i < n; i++) yield mp.point(i);
}

/**
 * Yields every line string of a multi-line-string in order.
 */
export function* iterLineStrings(
  mls: MultiLineString,
): IterableIterator<LineString> {
  const n = mls.numLineStrings();
  for (let i = 0; i < n; i++) yield mls.lineString(i);
}

/**
 * Yields every polygon of a multi-polygon in order.
 */
export function* iterPolygons(mp: MultiPolygon): IterableIterator<Polygon> {
  const n = mp.numPolygons();
  for (let i = 0; i < n; i++) yield mp.polygon(i);
}

/**
 * Yields every child geometry of a geometry collection in order.
 *
 * Children may be of any concrete geometry type, including nested collections.
 */
export function* iterGeometries(
  gc: GeometryCollection,
): IterableIterator<Geometry> {
  const n = gc.numGeometries();
  for (let i = 0; i < n; i++) yield gc.geometry(i);
}
