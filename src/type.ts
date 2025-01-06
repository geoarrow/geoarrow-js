import {
  type Struct,
  type Float,
  type List,
  type FixedSizeList,
  DataType,
} from "apache-arrow";

// Note: this apparently has to be arrow.Float and not arrow.Float64 to ensure
// that recreating a data instance with arrow.makeData type checks using the
// input's data type.
export type InterleavedCoord = FixedSizeList<Float>;
export type SeparatedCoord = Struct<{
  x: Float;
  y: Float;
}>;
// TODO: support separated coords
export type Coord = InterleavedCoord; // | SeparatedCoord;
export type Point = Coord;
export type LineString = List<Coord>;
export type Polygon = List<List<Coord>>;
export type MultiPoint = List<Coord>;
export type MultiLineString = List<List<Coord>>;
export type MultiPolygon = List<List<List<Coord>>>;
export type GeoArrowType =
  | Point
  | LineString
  | Polygon
  | MultiPoint
  | MultiLineString
  | MultiPolygon;

/** Check that the given type is a Point data type */
export function isPoint(type: DataType): type is Point {
  if (DataType.isFixedSizeList(type)) {
    // Check list size
    if (![2, 3, 4].includes(type.listSize)) {
      return false;
    }

    // Check child of FixedSizeList is floating type
    if (!DataType.isFloat(type.children[0])) {
      return false;
    }

    return true;
  }

  if (DataType.isStruct(type)) {
    // Check number of children
    if (![2, 3, 4].includes(type.children.length)) {
      return false;
    }

    // Check that children have correct field names
    if (
      !type.children.every((field) => ["x", "y", "z", "m"].includes(field.name))
    ) {
      return false;
    }

    if (!type.children.every((field) => DataType.isFloat(field))) {
      return false;
    }

    return true;
  }

  return false;
}

export function isLineString(type: DataType): type is LineString {
  // Check the outer type is a List
  if (!DataType.isList(type)) {
    return false;
  }

  // Check the child is a point type
  if (!isPoint(type.children[0].type)) {
    return false;
  }

  return true;
}

export function isPolygon(type: DataType): type is Polygon {
  // Check the outer vector is a List
  if (!DataType.isList(type)) {
    return false;
  }

  // Check the child is a linestring vector
  if (!isLineString(type.children[0].type)) {
    return false;
  }

  return true;
}

export function isMultiPoint(type: DataType): type is MultiPoint {
  // Check the outer vector is a List
  if (!DataType.isList(type)) {
    return false;
  }

  // Check the child is a point vector
  if (!isPoint(type.children[0].type)) {
    return false;
  }

  return true;
}

export function isMultiLineString(type: DataType): type is MultiLineString {
  // Check the outer vector is a List
  if (!DataType.isList(type)) {
    return false;
  }

  // Check the child is a linestring vector
  if (!isLineString(type.children[0].type)) {
    return false;
  }

  return true;
}

export function isMultiPolygon(type: DataType): type is MultiPolygon {
  // Check the outer vector is a List
  if (!DataType.isList(type)) {
    return false;
  }

  // Check the child is a polygon vector
  if (!isPolygon(type.children[0].type)) {
    return false;
  }

  return true;
}
