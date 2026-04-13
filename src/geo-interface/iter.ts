import type {
	CoordInterface,
	GeometryCollectionInterface,
	GeometryInterface,
	LineStringInterface,
	MultiLineStringInterface,
	MultiPointInterface,
	MultiPolygonInterface,
	PointInterface,
	PolygonInterface,
} from "./index.js";

export function* iterCoords(
	ls: LineStringInterface,
): IterableIterator<CoordInterface> {
	const n = ls.numCoords();
	for (let i = 0; i < n; i++) yield ls.coord(i);
}

export function* iterInteriors(
	p: PolygonInterface,
): IterableIterator<LineStringInterface> {
	const n = p.numInteriors();
	for (let i = 0; i < n; i++) yield p.interior(i);
}

export function* iterPoints(
	mp: MultiPointInterface,
): IterableIterator<PointInterface> {
	const n = mp.numPoints();
	for (let i = 0; i < n; i++) yield mp.point(i);
}

export function* iterLineStrings(
	mls: MultiLineStringInterface,
): IterableIterator<LineStringInterface> {
	const n = mls.numLineStrings();
	for (let i = 0; i < n; i++) yield mls.lineString(i);
}

export function* iterPolygons(
	mp: MultiPolygonInterface,
): IterableIterator<PolygonInterface> {
	const n = mp.numPolygons();
	for (let i = 0; i < n; i++) yield mp.polygon(i);
}

export function* iterGeometries(
	gc: GeometryCollectionInterface,
): IterableIterator<GeometryInterface> {
	const n = gc.numGeometries();
	for (let i = 0; i < n; i++) yield gc.geometry(i);
}
