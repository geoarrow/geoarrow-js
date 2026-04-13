import type {
  Coord,
  Dimension,
  Geometry,
  GeometryCollection,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
} from "../src/index.js";

export class RefCoord implements Coord {
  constructor(
    private readonly _values: readonly number[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  x(): number {
    return this._values[0];
  }
  y(): number {
    return this._values[1];
  }
  nth(n: number): number {
    return this._values[n];
  }
}

export class RefPoint implements Point {
  readonly geometryType = "Point" as const;
  constructor(
    private readonly _values: readonly number[] | null,
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  coord(): Coord | null {
    return this._values === null ? null : new RefCoord(this._values, this._dim);
  }
}

export class RefLineString implements LineString {
  readonly geometryType = "LineString" as const;
  constructor(
    private readonly _coords: readonly (readonly number[])[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  numCoords(): number {
    return this._coords.length;
  }
  coord(i: number): Coord {
    return new RefCoord(this._coords[i], this._dim);
  }
}

export class RefPolygon implements Polygon {
  readonly geometryType = "Polygon" as const;
  constructor(
    private readonly _exterior: RefLineString | null,
    private readonly _interiors: readonly RefLineString[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  exterior(): LineString | null {
    return this._exterior;
  }
  numInteriors(): number {
    return this._interiors.length;
  }
  interior(i: number): LineString {
    return this._interiors[i];
  }
}

export class RefMultiPoint implements MultiPoint {
  readonly geometryType = "MultiPoint" as const;
  constructor(
    private readonly _points: readonly RefPoint[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  numPoints(): number {
    return this._points.length;
  }
  point(i: number): Point {
    return this._points[i];
  }
}

export class RefMultiLineString implements MultiLineString {
  readonly geometryType = "MultiLineString" as const;
  constructor(
    private readonly _lineStrings: readonly RefLineString[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  numLineStrings(): number {
    return this._lineStrings.length;
  }
  lineString(i: number): LineString {
    return this._lineStrings[i];
  }
}

export class RefMultiPolygon implements MultiPolygon {
  readonly geometryType = "MultiPolygon" as const;
  constructor(
    private readonly _polygons: readonly RefPolygon[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  numPolygons(): number {
    return this._polygons.length;
  }
  polygon(i: number): Polygon {
    return this._polygons[i];
  }
}

export class RefGeometryCollection implements GeometryCollection {
  readonly geometryType = "GeometryCollection" as const;
  constructor(
    private readonly _geometries: readonly Geometry[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  numGeometries(): number {
    return this._geometries.length;
  }
  geometry(i: number): Geometry {
    return this._geometries[i];
  }
}
