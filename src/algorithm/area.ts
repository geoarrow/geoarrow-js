import * as arrow from "apache-arrow";
import { PolygonData } from "../data";
import { PolygonVector } from "../vector";
import { makeMathGlPolygon } from "./utils/polygon";

/**
 * Compute the unsigned area of the polygon input.
 */
export function area(input: PolygonData): arrow.Data<arrow.Float>;
export function area(input: PolygonVector): arrow.Vector<arrow.Float>;

export function area(
  input: PolygonData | PolygonVector
): arrow.Data<arrow.Float> | arrow.Vector<arrow.Float> {
  if ("data" in input) {
    return new arrow.Vector(input.data.map((polygonData) => area(polygonData)));
  }

  const result = new Float64Array(input.length);
  for (let geomIndex = 0; geomIndex < input.length; geomIndex++) {
    let polygon = makeMathGlPolygon(input, geomIndex);
    result[geomIndex] = polygon.getArea();
  }

  return arrow.makeData({
    type: new arrow.Float(arrow.Precision.DOUBLE),
    length: input.length,
    nullCount: input.nullCount,
    nullBitmap: input.nullBitmap,
    data: result,
  });
}

/**
 * Compute the signed area of the polygon input.
 */
export function signedArea(input: PolygonData): arrow.Data<arrow.Float>;
export function signedArea(input: PolygonVector): arrow.Vector<arrow.Float>;

export function signedArea(
  input: PolygonData | PolygonVector
): arrow.Data<arrow.Float> | arrow.Vector<arrow.Float> {
  if ("data" in input) {
    return new arrow.Vector(
      input.data.map((polygonData) => signedArea(polygonData))
    );
  }

  const result = new Float64Array(input.length);
  for (let geomIndex = 0; geomIndex < input.length; geomIndex++) {
    let polygon = makeMathGlPolygon(input, geomIndex);
    result[geomIndex] = polygon.getSignedArea();
  }

  return arrow.makeData({
    type: new arrow.Float(arrow.Precision.DOUBLE),
    length: input.length,
    nullCount: input.nullCount,
    nullBitmap: input.nullBitmap,
    data: result,
  });
}
