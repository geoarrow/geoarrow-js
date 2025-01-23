import { Data, Float, makeData, Precision, Vector } from "apache-arrow";
import { PolygonData } from "../data";
import { PolygonVector } from "../vector";
import { makeMathGlPolygon } from "./utils/polygon";

/**
 * Compute the unsigned area of the polygon input.
 */
export function area(input: PolygonData): Data<Float>;
export function area(input: PolygonVector): Vector<Float>;

export function area(
  input: PolygonData | PolygonVector,
): Data<Float> | Vector<Float> {
  if ("data" in input) {
    return new Vector(input.data.map((polygonData) => area(polygonData)));
  }

  const result = new Float64Array(input.length);
  for (let geomIndex = 0; geomIndex < input.length; geomIndex++) {
    let polygon = makeMathGlPolygon(input, geomIndex);
    result[geomIndex] = polygon.getArea();
  }

  return makeData({
    type: new Float(Precision.DOUBLE),
    length: input.length,
    nullCount: input.nullCount,
    nullBitmap: input.nullBitmap,
    data: result,
  });
}

/**
 * Compute the signed area of the polygon input.
 */
export function signedArea(input: PolygonData): Data<Float>;
export function signedArea(input: PolygonVector): Vector<Float>;

export function signedArea(
  input: PolygonData | PolygonVector,
): Data<Float> | Vector<Float> {
  if ("data" in input) {
    return new Vector(input.data.map((polygonData) => signedArea(polygonData)));
  }

  const result = new Float64Array(input.length);
  for (let geomIndex = 0; geomIndex < input.length; geomIndex++) {
    let polygon = makeMathGlPolygon(input, geomIndex);
    result[geomIndex] = polygon.getSignedArea();
  }

  return makeData({
    type: new Float(Precision.DOUBLE),
    length: input.length,
    nullCount: input.nullCount,
    nullBitmap: input.nullBitmap,
    data: result,
  });
}
