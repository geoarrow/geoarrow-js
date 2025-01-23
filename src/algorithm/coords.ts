import { Data, makeData } from "apache-arrow";
import {
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
} from "../type";
import {
  GeoArrowData,
  LineStringData,
  MultiLineStringData,
  MultiPointData,
  MultiPolygonData,
  PointData,
  PolygonData,
  isLineStringData,
  isMultiLineStringData,
  isMultiPointData,
  isMultiPolygonData,
  isPointData,
  isPolygonData,
} from "../data";
import {
  getLineStringChild,
  getMultiPolygonChild,
  getPointChild,
  getPolygonChild,
} from "../child";
import { assert, assertFalse } from "./utils/assert";

// For now, simplify our lives by focusing on 2D
type MapCoordsCallback = (x: number, y: number) => [number, number];

export function mapCoords(
  input: PointData,
  callback: MapCoordsCallback,
): PointData;
export function mapCoords(
  input: LineStringData,
  callback: MapCoordsCallback,
): LineStringData;
export function mapCoords(
  input: PolygonData,
  callback: MapCoordsCallback,
): PolygonData;
export function mapCoords(
  input: MultiPointData,
  callback: MapCoordsCallback,
): MultiPointData;
export function mapCoords(
  input: MultiLineStringData,
  callback: MapCoordsCallback,
): MultiLineStringData;
export function mapCoords(
  input: MultiPolygonData,
  callback: MapCoordsCallback,
): MultiPolygonData;

// TODO: ideally I could use <T extends GeoArrowType> here...
export function mapCoords(
  input: GeoArrowData,
  callback: MapCoordsCallback,
): GeoArrowData {
  if (isPointData(input)) {
    return mapCoords0(input, callback);
  }
  if (isLineStringData(input)) {
    return mapCoords1(input, callback);
  }
  if (isPolygonData(input)) {
    return mapCoords2(input, callback);
  }
  if (isMultiPointData(input)) {
    return mapCoords1(input, callback);
  }
  if (isMultiLineStringData(input)) {
    return mapCoords2(input, callback);
  }
  if (isMultiPolygonData(input)) {
    return mapCoords3(input, callback);
  }

  assertFalse();
}

export function mapCoords0<T extends Point>(
  input: Data<T>,
  callback: MapCoordsCallback,
): Data<T> {
  assert(input.type.listSize === 2, "expected 2D");
  const coordsData = getPointChild(input);
  const flatCoords = coordsData.values;

  const outputCoords = new Float64Array(flatCoords.length);
  for (let coordIdx = 0; coordIdx < input.length; coordIdx++) {
    const x = flatCoords[coordIdx * 2];
    const y = flatCoords[coordIdx * 2 + 1];
    const [newX, newY] = callback(x, y);
    outputCoords[coordIdx * 2] = newX;
    outputCoords[coordIdx * 2 + 1] = newY;
  }

  const newCoordsData = makeData({
    type: coordsData.type,
    length: coordsData.length,
    nullCount: coordsData.nullCount,
    nullBitmap: coordsData.nullBitmap,
    data: outputCoords,
  });

  return makeData({
    type: input.type,
    length: input.length,
    nullCount: input.nullCount,
    nullBitmap: input.nullBitmap,
    child: newCoordsData,
  });
}

/**
 * NOTE: the callback must be infallible as this does not take geometry validity
 * into effect for operating on coords
 */
export function mapCoords1<T extends LineString | MultiPoint>(
  input: Data<T>,
  callback: MapCoordsCallback,
): Data<T> {
  const pointData = getLineStringChild(input);
  const newPointData = mapCoords0(pointData, callback);

  return makeData({
    type: input.type,
    length: input.length,
    nullCount: input.nullCount,
    nullBitmap: input.nullBitmap,
    child: newPointData,
    valueOffsets: input.valueOffsets,
  });
}

/**
 * NOTE: the callback must be infallible as this does not take geometry validity
 * into effect for operating on coords
 */
export function mapCoords2<T extends Polygon | MultiLineString>(
  input: Data<T>,
  callback: MapCoordsCallback,
): Data<T> {
  const linestringData = getPolygonChild(input);
  const newLinestringData = mapCoords1(linestringData, callback);

  return makeData({
    type: input.type,
    length: input.length,
    nullCount: input.nullCount,
    nullBitmap: input.nullBitmap,
    child: newLinestringData,
    valueOffsets: input.valueOffsets,
  });
}

/**
 * NOTE: the callback must be infallible as this does not take geometry validity
 * into effect for operating on coords
 */
export function mapCoords3<T extends MultiPolygon>(
  input: Data<T>,
  callback: MapCoordsCallback,
): Data<T> {
  const polygonData = getMultiPolygonChild(input);
  const newPolygonData = mapCoords2(polygonData, callback);

  return makeData({
    type: input.type,
    length: input.length,
    nullCount: input.nullCount,
    nullBitmap: input.nullBitmap,
    child: newPolygonData,
    valueOffsets: input.valueOffsets,
  });
}
