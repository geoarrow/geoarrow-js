export type Dimension = "XY" | "XYZ";

export function sizeOf(dim: Dimension): number {
	switch (dim) {
		case "XY":
			return 2;
		case "XYZ":
			return 3;
	}
}

export interface CoordInterface {
	dim(): Dimension;
	x(): number;
	y(): number;
	nth(n: number): number;
}

export interface PointInterface {
	readonly geometryType: "Point";
	dim(): Dimension;
	coord(): CoordInterface | null;
}

export interface LineStringInterface {
	readonly geometryType: "LineString";
	dim(): Dimension;
	numCoords(): number;
	coord(i: number): CoordInterface;
}

export interface PolygonInterface {
	readonly geometryType: "Polygon";
	dim(): Dimension;
	numInteriors(): number;
	exterior(): LineStringInterface | null;
	interior(i: number): LineStringInterface;
}

export interface MultiPointInterface {
	readonly geometryType: "MultiPoint";
	dim(): Dimension;
	numPoints(): number;
	point(i: number): PointInterface;
}

export interface MultiLineStringInterface {
	readonly geometryType: "MultiLineString";
	dim(): Dimension;
	numLineStrings(): number;
	lineString(i: number): LineStringInterface;
}

export interface MultiPolygonInterface {
	readonly geometryType: "MultiPolygon";
	dim(): Dimension;
	numPolygons(): number;
	polygon(i: number): PolygonInterface;
}

export interface GeometryCollectionInterface {
	readonly geometryType: "GeometryCollection";
	dim(): Dimension;
	numGeometries(): number;
	geometry(i: number): GeometryInterface;
}

export type GeometryInterface =
	| PointInterface
	| LineStringInterface
	| PolygonInterface
	| MultiPointInterface
	| MultiLineStringInterface
	| MultiPolygonInterface
	| GeometryCollectionInterface;

export * from "./iter.js";
