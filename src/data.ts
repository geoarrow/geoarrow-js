import { Data } from "apache-arrow";
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

export type PointData = Data<Point>;
export type LineStringData = Data<LineString>;
export type PolygonData = Data<Polygon>;
export type MultiPointData = Data<MultiPoint>;
export type MultiLineStringData = Data<MultiLineString>;
export type MultiPolygonData = Data<MultiPolygon>;
export type GeoArrowData =
  | PointData
  | LineStringData
  | PolygonData
  | MultiPointData
  | MultiLineStringData
  | MultiPolygonData;

export function isPointData(data: Data): data is PointData {
  return isPoint(data.type);
}

export function isLineStringData(data: Data): data is LineStringData {
  return isLineString(data.type);
}

export function isPolygonData(data: Data): data is PolygonData {
  return isPolygon(data.type);
}

export function isMultiPointData(data: Data): data is MultiPointData {
  return isMultiPoint(data.type);
}

export function isMultiLineStringData(data: Data): data is MultiLineStringData {
  return isMultiLineString(data.type);
}

export function isMultiPolygonData(data: Data): data is MultiPolygonData {
  return isMultiPolygon(data.type);
}
