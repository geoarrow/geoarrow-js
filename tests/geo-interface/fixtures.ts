import type {
  CoordTrait,
  Dimension,
  LineStringTrait,
  PointTrait,
  PolygonTrait,
} from "../../src/geo-interface/index.js";

export class RefCoord implements CoordTrait {
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

export class RefPoint implements PointTrait {
  readonly geometryType = "Point" as const;
  constructor(
    private readonly _values: readonly number[] | null,
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  coord(): CoordTrait | null {
    return this._values === null ? null : new RefCoord(this._values, this._dim);
  }
}

export class RefLineString implements LineStringTrait {
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
  coord(i: number): CoordTrait {
    return new RefCoord(this._coords[i], this._dim);
  }
}

export class RefPolygon implements PolygonTrait {
  readonly geometryType = "Polygon" as const;
  constructor(
    private readonly _exterior: RefLineString | null,
    private readonly _interiors: readonly RefLineString[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  exterior(): LineStringTrait | null {
    return this._exterior;
  }
  numInteriors(): number {
    return this._interiors.length;
  }
  interior(i: number): LineStringTrait {
    return this._interiors[i];
  }
}
