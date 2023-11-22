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

export type PointData = arrow.Data<Point>;
export type LineStringData = arrow.Data<LineString>;
export type PolygonData = arrow.Data<Polygon>;
export type MultiPointData = arrow.Data<MultiPoint>;
export type MultiLineStringData = arrow.Data<MultiLineString>;
export type MultiPolygonData = arrow.Data<MultiPolygon>;
export type GeoArrowData =
  | PointData
  | LineStringData
  | PolygonData
  | MultiPointData
  | MultiLineStringData
  | MultiPolygonData;

export function isPointData(data: arrow.Data): data is PointData {
  return isPoint(data.type);
}

export function isLineStringData(data: arrow.Data): data is LineStringData {
  return isLineString(data.type);
}

export function isPolygonData(data: arrow.Data): data is PolygonData {
  return isPolygon(data.type);
}

export function isMultiPointData(data: arrow.Data): data is MultiPointData {
  return isMultiPoint(data.type);
}

export function isMultiLineStringData(
  data: arrow.Data,
): data is MultiLineStringData {
  return isMultiLineString(data.type);
}

export function isMultiPolygonData(data: arrow.Data): data is MultiPolygonData {
  return isMultiPolygon(data.type);
}
