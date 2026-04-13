import type { CoordTrait, Dimension, PointTrait } from "../../src/geo-interface/index.js";

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
