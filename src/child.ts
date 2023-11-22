/**
 * Strongly typed accessors for children, since arrow.Data.children[] is untyped
 */

import * as arrow from "apache-arrow";
import {
  LineStringData,
  MultiLineStringData,
  MultiPointData,
  MultiPolygonData,
  PointData,
  PolygonData,
} from "./data.js";
import {
  LineStringVector,
  MultiLineStringVector,
  MultiPointVector,
  MultiPolygonVector,
  PointVector,
  PolygonVector,
} from "./vector.js";

export function getPointChild(input: PointData): arrow.Data<arrow.Float>;
export function getPointChild(input: PointVector): arrow.Vector<arrow.Float>;

export function getPointChild(
  input: PointData | PointVector,
): arrow.Data<arrow.Float> | arrow.Vector<arrow.Float> {
  if ("data" in input) {
    return input.getChildAt(0)!;
  }

  return input.children[0] as arrow.Data<arrow.Float>;
}

export function getLineStringChild(input: LineStringData): PointData;
export function getLineStringChild(input: LineStringVector): PointVector;

export function getLineStringChild(
  input: LineStringData | LineStringVector,
): PointData | PointVector {
  if ("data" in input) {
    return input.getChildAt(0)!;
  }

  return input.children[0] as PointData;
}

export function getPolygonChild(input: PolygonData): LineStringData;
export function getPolygonChild(input: PolygonVector): LineStringVector;

export function getPolygonChild(
  input: PolygonData | PolygonVector,
): LineStringData | LineStringVector {
  if ("data" in input) {
    return input.getChildAt(0)!;
  }

  return input.children[0] as LineStringData;
}

export function getMultiPointChild(input: MultiPointData): PointData;
export function getMultiPointChild(input: MultiPointVector): PointVector;

export function getMultiPointChild(
  input: MultiPointData | MultiPointVector,
): PointData | PointVector {
  if ("data" in input) {
    return input.getChildAt(0)!;
  }

  return input.children[0] as PointData;
}

export function getMultiLineStringChild(
  input: MultiLineStringData,
): LineStringData;
export function getMultiLineStringChild(
  input: MultiLineStringVector,
): LineStringVector;

export function getMultiLineStringChild(
  input: MultiLineStringData | MultiLineStringVector,
): LineStringData | LineStringVector {
  if ("data" in input) {
    return input.getChildAt(0)!;
  }

  return input.children[0] as LineStringData;
}

export function getMultiPolygonChild(input: MultiPolygonData): PolygonData;
export function getMultiPolygonChild(input: MultiPolygonVector): PolygonVector;

export function getMultiPolygonChild(
  input: MultiPolygonData | MultiPolygonVector,
): PolygonData | PolygonVector {
  if ("data" in input) {
    return input.getChildAt(0)!;
  }

  return input.children[0] as PolygonData;
}
