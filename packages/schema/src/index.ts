export {
  getLineStringChild,
  getMultiLineStringChild,
  getMultiPointChild,
  getMultiPolygonChild,
  getPointChild,
  getPolygonChild,
} from "./child.js";
export { EXTENSION_NAME } from "./constants.js";
export type {
  GeoArrowData,
  LineStringData,
  MultiLineStringData,
  MultiPointData,
  MultiPolygonData,
  PointData,
  PolygonData,
} from "./data.js";
export {
  isLineStringData,
  isMultiLineStringData,
  isMultiPointData,
  isMultiPolygonData,
  isPointData,
  isPolygonData,
} from "./data.js";
export type {
  Coord,
  GeoArrowType,
  InterleavedCoord,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
  SeparatedCoord,
} from "./type.js";
export {
  isLineString,
  isMultiLineString,
  isMultiPoint,
  isMultiPolygon,
  isPoint,
  isPolygon,
} from "./type.js";
export type {
  GeoArrowVector,
  LineStringVector,
  MultiLineStringVector,
  MultiPointVector,
  MultiPolygonVector,
  PointVector,
  PolygonVector,
} from "./vector.js";
export {
  isLineStringVector,
  isMultiLineStringVector,
  isMultiPointVector,
  isMultiPolygonVector,
  isPointVector,
  isPolygonVector,
} from "./vector.js";
