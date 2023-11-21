import * as arrow from "apache-arrow";
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
} from "./type.js";

export type PointVector = arrow.Vector<Point>;
export type LineStringVector = arrow.Vector<LineString>;
export type PolygonVector = arrow.Vector<Polygon>;
export type MultiPointVector = arrow.Vector<MultiPoint>;
export type MultiLineStringVector = arrow.Vector<MultiLineString>;
export type MultiPolygonVector = arrow.Vector<MultiPolygon>;

export function isPointVector(vector: arrow.Vector): vector is PointVector {
  return isPoint(vector.type);
}

export function isLineStringVector(
  vector: arrow.Vector
): vector is LineStringVector {
  return isLineString(vector.type);
}

export function isPolygonVector(vector: arrow.Vector): vector is PolygonVector {
  return isPolygon(vector.type);
}

export function isMultiPointVector(
  vector: arrow.Vector
): vector is MultiPointVector {
  return isMultiPoint(vector.type);
}

export function isMultiLineStringVector(
  vector: arrow.Vector
): vector is MultiLineStringVector {
  return isMultiLineString(vector.type);
}

export function isMultiPolygonVector(
  vector: arrow.Vector
): vector is MultiPolygonVector {
  return isMultiPolygon(vector.type);
}
