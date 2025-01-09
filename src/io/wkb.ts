import { makeData, Field, FixedSizeList, Float64, List } from "apache-arrow";
import {
  GeoArrowData,
  LineStringData,
  PointData,
  PolygonData,
  WKBData,
} from "../data";
import { WKBLoader } from "@loaders.gl/wkt";
import type {
  BinaryGeometry,
  BinaryPointGeometry,
  BinaryLineGeometry,
  BinaryPolygonGeometry,
} from "@loaders.gl/schema";
import { assert, assertFalse } from "../algorithm/utils/assert";

export enum WKBType {
  Point,
  LineString,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
}

/**
 * Parse an Arrow array of WKB
 *
 * @return  {[type]}  [return description]
 */
export function parseWkb(
  data: WKBData,
  type: WKBType,
  dim: number,
): GeoArrowData {
  const parsedGeometries: BinaryGeometry[] = [];

  for (const item of iterBinary(data)) {
    if (item === null) {
      throw new Error("Null entries are not currently supported");
    }
    const arrayBuffer = copyViewToArrayBuffer(item);
    const parsed = WKBLoader.parseSync(arrayBuffer, {
      wkb: { shape: "binary-geometry" },
    }) as BinaryGeometry;
    parsedGeometries.push(parsed);
  }

  switch (type) {
    case WKBType.Point:
      return repackPoints(parsedGeometries as BinaryPointGeometry[], dim);

    case WKBType.LineString:
      return repackLineStrings(parsedGeometries as BinaryLineGeometry[], dim);

    case WKBType.Polygon:
      return repackPolygons(parsedGeometries as BinaryPolygonGeometry[], dim);

    default:
      assertFalse("Not yet implemented for this geometry type");
  }
}

function* iterBinary(data: WKBData): IterableIterator<Uint8Array | null> {
  const values = data.values;
  const valueOffsets = data.valueOffsets;
  for (let i = 0; i < data.length; i++) {
    if (!data.getValid(i)) {
      yield null;
    } else {
      const startOffset = valueOffsets[i];
      const endOffset = valueOffsets[i + 1];
      yield values.subarray(startOffset, endOffset);
    }
  }
}

// TODO: update loaders.gl parseWKB to accept Uint8Array, not just ArrayBuffer.
function copyViewToArrayBuffer(view: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(view.byteLength);
  new Uint8Array(buffer).set(view);
  return buffer;
}

function repackPoints(geoms: BinaryPointGeometry[], dim: number): PointData {
  const geomLength = geoms.length;
  const coords = new Float64Array(geomLength * dim);
  let coordOffset = 0;
  for (const geom of geoms) {
    assert(geom.positions.value instanceof Float64Array);
    coords.set(geom.positions.value, coordOffset * dim);
    coordOffset += 1;
  }

  const coordsData = makeData({
    type: new Float64(),
    data: coords,
  });
  return makeData({
    type: new FixedSizeList(
      dim,
      new Field(coordFieldName(dim), new Float64(), false),
    ),
    child: coordsData,
  });
}

type LineStringCapacity = {
  coordCapacty: number;
  geomCapacity: number;
};

function repackLineStrings(
  geoms: BinaryLineGeometry[],
  dim: number,
): LineStringData {
  const capacity = inferLineStringCapacity(geoms);
  const coords = new Float64Array(capacity.coordCapacty * dim);
  const geomOffsets = new Int32Array(capacity.geomCapacity + 1);

  let geomIndex = 0;
  let coordOffset = 0;
  for (const geom of geoms) {
    assert(geom.positions.value instanceof Float64Array);
    const numCoords = geom.positions.value.length / geom.positions.size;
    coords.set(geom.positions.value, coordOffset * dim);
    geomIndex += 1;
    coordOffset += numCoords;

    // Note this is after we've added one
    geomOffsets[geomIndex] = coordOffset;
  }

  const coordsData = makeData({
    type: new Float64(),
    data: coords,
  });
  const verticesData = makeData({
    type: new FixedSizeList(
      dim,
      new Field(coordFieldName(dim), coordsData.type, false),
    ),
    child: coordsData,
  });
  return makeData({
    type: new List(new Field("vertices", verticesData.type, false)),
    valueOffsets: geomOffsets,
    child: verticesData,
  });
}

function inferLineStringCapacity(
  geoms: BinaryLineGeometry[],
): LineStringCapacity {
  let capacity: LineStringCapacity = {
    coordCapacty: 0,
    geomCapacity: 0,
  };

  // TODO: check geom.pathIndices to validate that we have a LineString and not
  // a multi line string
  for (const geom of geoms) {
    capacity.geomCapacity += 1;
    capacity.coordCapacty += geom.positions.value.length / geom.positions.size;
  }

  return capacity;
}

type PolygonCapacity = {
  coordCapacty: number;
  /** This is what loaders.gl calls `primitivePolygonIndices` */
  ringCapacity: number;
  geomCapacity: number;
};

function repackPolygons(
  geoms: BinaryPolygonGeometry[],
  dim: number,
): PolygonData {
  const capacity = inferPolygonCapacity(geoms);
  const coords = new Float64Array(capacity.coordCapacty * dim);
  const ringOffsets = new Int32Array(capacity.ringCapacity + 1);
  const geomOffsets = new Int32Array(capacity.geomCapacity + 1);

  let geomIndex = 0;
  let coordOffset = 0;
  let ringOffset = 0;

  for (const geom of geoms) {
    assert(geom.positions.value instanceof Float64Array);
    const numCoords = geom.positions.value.length / geom.positions.size;

    coords.set(geom.positions.value, coordOffset * dim);
    coordOffset += numCoords;

    for (
      let ringIdx = 0;
      ringIdx < geom.primitivePolygonIndices.value.length - 1;
      ringIdx++
    ) {
      ringOffsets[ringOffset + 1] =
        ringOffsets[ringOffset] +
        (geom.primitivePolygonIndices.value[ringIdx + 1] -
          geom.primitivePolygonIndices.value[ringIdx]);
      ringOffset += 1;
    }

    geomOffsets[geomIndex + 1] = ringOffset;
    geomIndex += 1;
  }

  const coordsData = makeData({
    type: new Float64(),
    data: coords,
  });
  const verticesData = makeData({
    type: new FixedSizeList(
      dim,
      new Field(coordFieldName(dim), coordsData.type, false),
    ),
    child: coordsData,
  });

  const ringsData = makeData({
    type: new List(new Field("vertices", verticesData.type, false)),
    valueOffsets: ringOffsets,
    child: verticesData,
  });

  return makeData({
    type: new List(new Field("rings", ringsData.type, false)),
    valueOffsets: geomOffsets,
    child: ringsData,
  });
}

function inferPolygonCapacity(geoms: BinaryPolygonGeometry[]): PolygonCapacity {
  let capacity: PolygonCapacity = {
    coordCapacty: 0,
    ringCapacity: 0,
    geomCapacity: 0,
  };

  // TODO: check geom.polygonIndices to validate that we have a Polygon and not
  // a MultiPolygon
  for (const geom of geoms) {
    capacity.geomCapacity += 1;
    assert(
      geom.primitivePolygonIndices.value.length >= 1,
      "Expected primitivePolygonIndices to always have length at least 1",
    );
    capacity.ringCapacity += geom.primitivePolygonIndices.value.length - 1;
    capacity.coordCapacty += geom.positions.value.length / geom.positions.size;
  }

  return capacity;
}

function coordFieldName(dim: number): "xy" | "xyz" {
  if (dim === 2) {
    return "xy";
  } else if (dim === 3) {
    return "xyz";
  } else {
    assertFalse("expected dimension of 2 or 3");
  }
}
