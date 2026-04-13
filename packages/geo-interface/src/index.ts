export type {
  Coord,
  Dimension,
  Geometry,
  GeometryCollection,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
} from "./interface.js";
export { sizeOf } from "./interface.js";
export {
  iterCoords,
  iterGeometries,
  iterInteriors,
  iterLineStrings,
  iterPoints,
  iterPolygons,
} from "./iter.js";
