export type {
  CoordInterface,
  Dimension,
  GeometryCollectionInterface,
  GeometryInterface,
  LineStringInterface,
  MultiLineStringInterface,
  MultiPointInterface,
  MultiPolygonInterface,
  PointInterface,
  PolygonInterface,
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
