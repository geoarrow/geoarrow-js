import * as arrow from "apache-arrow";

export type InterleavedCoord = arrow.FixedSizeList<arrow.Float64>;
export type SeparatedCoord = arrow.Struct<{
  x: arrow.Float64;
  y: arrow.Float64;
}>;
// TODO: support separated coords
export type Coord = InterleavedCoord; // | SeparatedCoord;
export type Point = Coord;
export type LineString = arrow.List<Coord>;
export type Polygon = arrow.List<arrow.List<Coord>>;
export type MultiPoint = arrow.List<Coord>;
export type MultiLineString = arrow.List<arrow.List<Coord>>;
export type MultiPolygon = arrow.List<arrow.List<arrow.List<Coord>>>;

/** Check that the given type is a Point data type */
export function isPoint(type: arrow.DataType): type is Point {
  if (arrow.DataType.isFixedSizeList(type)) {
    // Check list size
    if (![2, 3, 4].includes(type.listSize)) {
      return false;
    }

    // Check child of FixedSizeList is floating type
    if (!arrow.DataType.isFloat(type.children[0])) {
      return false;
    }

    return true;
  }

  if (arrow.DataType.isStruct(type)) {
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

    if (!type.children.every((field) => arrow.DataType.isFloat(field))) {
      return false;
    }

    return true;
  }

  return false;
}

export function isLineString(type: arrow.DataType): type is LineString {
  // Check the outer type is a List
  if (!arrow.DataType.isList(type)) {
    return false;
  }

  // Check the child is a point type
  if (!isPoint(type.children[0].type)) {
    return false;
  }

  return true;
}

export function isPolygon(type: arrow.DataType): type is Polygon {
  // Check the outer vector is a List
  if (!arrow.DataType.isList(type)) {
    return false;
  }

  // Check the child is a linestring vector
  if (!isLineString(type.children[0].type)) {
    return false;
  }

  return true;
}

export function isMultiPoint(type: arrow.DataType): type is MultiPoint {
  // Check the outer vector is a List
  if (!arrow.DataType.isList(type)) {
    return false;
  }

  // Check the child is a point vector
  if (!isPoint(type.children[0].type)) {
    return false;
  }

  return true;
}

export function isMultiLineString(
  type: arrow.DataType
): type is MultiLineString {
  // Check the outer vector is a List
  if (!arrow.DataType.isList(type)) {
    return false;
  }

  // Check the child is a linestring vector
  if (!isLineString(type.children[0].type)) {
    return false;
  }

  return true;
}

export function isMultiPolygon(type: arrow.DataType): type is MultiPolygon {
  // Check the outer vector is a List
  if (!arrow.DataType.isList(type)) {
    return false;
  }

  // Check the child is a polygon vector
  if (!isPolygon(type.children[0].type)) {
    return false;
  }

  return true;
}
