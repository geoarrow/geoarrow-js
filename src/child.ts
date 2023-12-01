/**
 * Strongly typed accessors for children, since arrow.Data.children[] is untyped
 */

import { Data } from "apache-arrow/data";
import { Vector } from "apache-arrow/vector";
import { Float } from "apache-arrow/type";
import {
  LineStringData,
  MultiLineStringData,
  MultiPointData,
  MultiPolygonData,
  PointData,
  PolygonData,
} from "./data";
import {
  LineStringVector,
  MultiLineStringVector,
  MultiPointVector,
  MultiPolygonVector,
  PointVector,
  PolygonVector,
} from "./vector";

export function getPointChild(input: PointData): Data<Float>;
export function getPointChild(input: PointVector): Vector<Float>;

export function getPointChild(
  input: PointData | PointVector,
): Data<Float> | Vector<Float> {
  if ("data" in input) {
    return input.getChildAt(0)!;
  }

  return input.children[0] as Data<Float>;
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
