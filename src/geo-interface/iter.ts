import type {
  CoordTrait,
  GeometryCollectionTrait,
  GeometryTrait,
  LineStringTrait,
  MultiLineStringTrait,
  MultiPointTrait,
  MultiPolygonTrait,
  PointTrait,
  PolygonTrait,
} from "./index.js";

export function* iterCoords(ls: LineStringTrait): IterableIterator<CoordTrait> {
  const n = ls.numCoords();
  for (let i = 0; i < n; i++) yield ls.coord(i);
}

export function* iterInteriors(
  p: PolygonTrait,
): IterableIterator<LineStringTrait> {
  const n = p.numInteriors();
  for (let i = 0; i < n; i++) yield p.interior(i);
}

export function* iterPoints(mp: MultiPointTrait): IterableIterator<PointTrait> {
  const n = mp.numPoints();
  for (let i = 0; i < n; i++) yield mp.point(i);
}

export function* iterLineStrings(
  mls: MultiLineStringTrait,
): IterableIterator<LineStringTrait> {
  const n = mls.numLineStrings();
  for (let i = 0; i < n; i++) yield mls.lineString(i);
}

export function* iterPolygons(
  mp: MultiPolygonTrait,
): IterableIterator<PolygonTrait> {
  const n = mp.numPolygons();
  for (let i = 0; i < n; i++) yield mp.polygon(i);
}

export function* iterGeometries(
  gc: GeometryCollectionTrait,
): IterableIterator<GeometryTrait> {
  const n = gc.numGeometries();
  for (let i = 0; i < n; i++) yield gc.geometry(i);
}
