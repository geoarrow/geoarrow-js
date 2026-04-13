import type {
  CoordInterface,
  Dimension,
  GeometryCollectionInterface,
  GeometryInterface,
  LineStringInterface,
  MultiLineStringInterface,
  MultiPointInterface,
  MultiPolygonInterface,
  PointInterface,
  PolygonInterface,
} from "../../src/geo-interface/index.js";

export class RefCoord implements CoordInterface {
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

export class RefPoint implements PointInterface {
  readonly geometryType = "Point" as const;
  constructor(
    private readonly _values: readonly number[] | null,
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  coord(): CoordInterface | null {
    return this._values === null ? null : new RefCoord(this._values, this._dim);
  }
}

export class RefLineString implements LineStringInterface {
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
  coord(i: number): CoordInterface {
    return new RefCoord(this._coords[i], this._dim);
  }
}

export class RefPolygon implements PolygonInterface {
  readonly geometryType = "Polygon" as const;
  constructor(
    private readonly _exterior: RefLineString | null,
    private readonly _interiors: readonly RefLineString[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  exterior(): LineStringInterface | null {
    return this._exterior;
  }
  numInteriors(): number {
    return this._interiors.length;
  }
  interior(i: number): LineStringInterface {
    return this._interiors[i];
  }
}

export class RefMultiPoint implements MultiPointInterface {
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
  point(i: number): PointInterface {
    return this._points[i];
  }
}

export class RefMultiLineString implements MultiLineStringInterface {
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
  lineString(i: number): LineStringInterface {
    return this._lineStrings[i];
  }
}

export class RefMultiPolygon implements MultiPolygonInterface {
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
  polygon(i: number): PolygonInterface {
    return this._polygons[i];
  }
}

export class RefGeometryCollection implements GeometryCollectionInterface {
  readonly geometryType = "GeometryCollection" as const;
  constructor(
    private readonly _geometries: readonly GeometryInterface[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  numGeometries(): number {
    return this._geometries.length;
  }
  geometry(i: number): GeometryInterface {
    return this._geometries[i];
  }
}
