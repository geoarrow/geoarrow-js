export type Dimension = "XY" | "XYZ";

export function sizeOf(dim: Dimension): number {
  switch (dim) {
    case "XY":
      return 2;
    case "XYZ":
      return 3;
  }
}

export interface CoordTrait {
  dim(): Dimension;
  x(): number;
  y(): number;
  nth(n: number): number;
}

export interface PointTrait {
  readonly geometryType: "Point";
  dim(): Dimension;
  coord(): CoordTrait | null;
}

export interface LineStringTrait {
  readonly geometryType: "LineString";
  dim(): Dimension;
  numCoords(): number;
  coord(i: number): CoordTrait;
}

export interface PolygonTrait {
  readonly geometryType: "Polygon";
  dim(): Dimension;
  numInteriors(): number;
  exterior(): LineStringTrait | null;
  interior(i: number): LineStringTrait;
}

export interface MultiPointTrait {
  readonly geometryType: "MultiPoint";
  dim(): Dimension;
  numPoints(): number;
  point(i: number): PointTrait;
}

export interface MultiLineStringTrait {
  readonly geometryType: "MultiLineString";
  dim(): Dimension;
  numLineStrings(): number;
  lineString(i: number): LineStringTrait;
}
