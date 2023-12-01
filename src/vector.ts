import { Vector } from "apache-arrow/vector";
import {
  Point,
  LineString,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
  isPoint,
  isLineString,
  isPolygon,
  isMultiPoint,
  isMultiLineString,
  isMultiPolygon,
} from "./type";

export type PointVector = Vector<Point>;
export type LineStringVector = Vector<LineString>;
export type PolygonVector = Vector<Polygon>;
export type MultiPointVector = Vector<MultiPoint>;
export type MultiLineStringVector = Vector<MultiLineString>;
export type MultiPolygonVector = Vector<MultiPolygon>;
export type GeoArrowVector =
  | PointVector
  | LineStringVector
  | PolygonVector
  | MultiPointVector
  | MultiLineStringVector
  | MultiPolygonVector;

export function isPointVector(vector: Vector): vector is PointVector {
  return isPoint(vector.type);
}

export function isLineStringVector(vector: Vector): vector is LineStringVector {
  return isLineString(vector.type);
}

export function isPolygonVector(vector: Vector): vector is PolygonVector {
  return isPolygon(vector.type);
}

export function isMultiPointVector(vector: Vector): vector is MultiPointVector {
  return isMultiPoint(vector.type);
}

export function isMultiLineStringVector(
  vector: Vector,
): vector is MultiLineStringVector {
  return isMultiLineString(vector.type);
}

export function isMultiPolygonVector(
  vector: Vector,
): vector is MultiPolygonVector {
  return isMultiPolygon(vector.type);
}
