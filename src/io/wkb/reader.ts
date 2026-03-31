// src/io/wkb/reader.ts
// cf. geoarrow-rs: rust/geoarrow-array/src/cast.rs (from_wkb)
import {
  makeData,
  Field,
  FixedSizeList,
  Float64,
  List,
  Binary,
} from "apache-arrow";
import type { Data } from "apache-arrow";
import { WkbType, Dimension, coordSize, coordFieldName } from "./types.js";
import { readHeader } from "./header.js";
import {
  addGeometryCapacity,
  emptyCapacity,
  type Capacity,
  type PointCapacity,
  type LineStringCapacity,
  type PolygonCapacity,
  type MultiPointCapacity,
  type MultiLineStringCapacity,
  type MultiPolygonCapacity,
} from "./capacity.js";
import type { GeoArrowData, WKBData } from "../../data.js";

type ScanResult = {
  type: WkbType;
  dimension: Dimension;
  capacity: Capacity;
  nullBitmap: Uint8Array | null;
  nullCount: number;
};

/**
 * Parse an Arrow Binary array of WKB geometries into a GeoArrow array.
 * Auto-detects geometry type and coordinate dimensions from WKB headers.
 */
export function parseWkb(data: WKBData): GeoArrowData {
  const scan = scanWkb(data);
  return fillWkb(data, scan) as GeoArrowData;
}

/** Pass 1: scan all geometries, detect type/dim, accumulate capacity */
function scanWkb(data: WKBData): ScanResult {
  const values = data.values;
  const valueOffsets = data.valueOffsets;

  let detectedType: WkbType | null = null;
  let detectedDim: Dimension | null = null;
  let nullCount = 0;

  // Build null bitmap
  const bitmapBytes = Math.ceil(data.length / 8);
  const nullBitmap = new Uint8Array(bitmapBytes);
  let hasNulls = false;

  // Detect type from first non-null geometry
  for (let i = 0; i < data.length; i++) {
    if (!data.getValid(i)) {
      hasNulls = true;
      nullCount++;
      continue;
    }
    // Set valid bit
    nullBitmap[i >> 3] |= 1 << (i & 7);

    const start = valueOffsets[i];
    const buf = values.buffer;
    const view = new DataView(buf, values.byteOffset + start);
    const header = readHeader(view, 0);

    if (detectedType === null) {
      detectedType = header.type;
      detectedDim = header.dimension;
    } else if (header.type !== detectedType) {
      throw new Error(
        `Mixed geometry types in WKB batch: expected ${WkbType[detectedType]} but found ${WkbType[header.type]} at index ${i}`,
      );
    } else if (header.dimension !== detectedDim) {
      throw new Error(
        `Mixed dimensions in WKB batch: expected ${Dimension[detectedDim!]} but found ${Dimension[header.dimension]} at index ${i}`,
      );
    }
  }

  if (detectedType === null) {
    throw new Error(
      "Cannot infer geometry type: all entries are null. Filter nulls before calling parseWkb.",
    );
  }

  // Accumulate capacity
  const capacity = emptyCapacity(detectedType);
  for (let i = 0; i < data.length; i++) {
    if (!data.getValid(i)) continue;
    const start = valueOffsets[i];
    const buf = values.buffer;
    const view = new DataView(buf, values.byteOffset + start);
    addGeometryCapacity(view, 0, detectedDim!, capacity, detectedType);
  }

  return {
    type: detectedType,
    dimension: detectedDim!,
    capacity,
    nullBitmap: hasNulls ? nullBitmap : null,
    nullCount,
  };
}

/** Pass 2: allocate and fill arrays based on scan results */
function fillWkb(data: WKBData, scan: ScanResult): Data {
  switch (scan.type) {
    case WkbType.Point:
      return fillPoints(data, scan);
    case WkbType.LineString:
      return fillLineStrings(data, scan);
    case WkbType.Polygon:
      return fillPolygons(data, scan);
    case WkbType.MultiPoint:
      return fillMultiPoints(data, scan);
    case WkbType.MultiLineString:
      return fillMultiLineStrings(data, scan);
    case WkbType.MultiPolygon:
      return fillMultiPolygons(data, scan);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Read n float64 coordinate values from a DataView into a target array */
function readCoords(
  view: DataView,
  byteOffset: number,
  littleEndian: boolean,
  target: Float64Array,
  targetOffset: number,
  count: number,
): number {
  for (let i = 0; i < count; i++) {
    target[targetOffset + i] = view.getFloat64(
      byteOffset + i * 8,
      littleEndian,
    );
  }
  return count * 8;
}

/** Build the nested Arrow FixedSizeList(Float64) for coordinates */
function makeCoordData(coords: Float64Array, dim: Dimension) {
  const floatData = makeData({ type: new Float64(), data: coords });
  return makeData({
    type: new FixedSizeList(
      coordSize(dim),
      new Field(coordFieldName(dim), new Float64(), false),
    ),
    child: floatData,
  });
}

/** Wrap a child Data in a List with given offsets and optional nulls */
function makeListData(
  fieldName: string,
  child: Data,
  offsets: Int32Array,
  length: number,
  nullBitmap: Uint8Array | null,
  nullCount: number,
) {
  return makeData({
    type: new List(new Field(fieldName, child.type, false)),
    valueOffsets: offsets,
    child,
    length,
    nullBitmap,
    nullCount,
  });
}

// ── Fill functions ───────────────────────────────────────────────────

function fillPoints(data: WKBData, scan: ScanResult): Data {
  const cs = coordSize(scan.dimension);
  // Allocate for ALL entries (including nulls) so FixedSizeList child length = length * listSize
  const coords = new Float64Array(data.length * cs);
  const values = data.values;
  const valueOffsets = data.valueOffsets;

  let coordIdx = 0;
  for (let i = 0; i < data.length; i++) {
    if (!data.getValid(i)) {
      coordIdx += cs; // null slot stays zero-filled
      continue;
    }
    const start = valueOffsets[i];
    const view = new DataView(values.buffer, values.byteOffset + start);
    const header = readHeader(view, 0);
    readCoords(
      view,
      header.headerSize,
      header.littleEndian,
      coords,
      coordIdx,
      cs,
    );
    coordIdx += cs;
  }

  const floatData = makeData({ type: new Float64(), data: coords });
  return makeData({
    type: new FixedSizeList(
      cs,
      new Field(coordFieldName(scan.dimension), new Float64(), false),
    ),
    child: floatData,
    length: data.length,
    nullBitmap: scan.nullBitmap,
    nullCount: scan.nullCount,
  });
}

function fillLineStrings(data: WKBData, scan: ScanResult): Data {
  const cap = scan.capacity as LineStringCapacity;
  const cs = coordSize(scan.dimension);
  const coords = new Float64Array(cap.coordCapacity * cs);
  const geomOffsets = new Int32Array(data.length + 1);
  const values = data.values;
  const valueOffsets = data.valueOffsets;

  let coordOffset = 0;
  for (let i = 0; i < data.length; i++) {
    if (!data.getValid(i)) {
      geomOffsets[i + 1] = coordOffset;
      continue;
    }
    const start = valueOffsets[i];
    const view = new DataView(values.buffer, values.byteOffset + start);
    const header = readHeader(view, 0);
    const numPoints = view.getUint32(header.headerSize, header.littleEndian);
    readCoords(
      view,
      header.headerSize + 4,
      header.littleEndian,
      coords,
      coordOffset * cs,
      numPoints * cs,
    );
    coordOffset += numPoints;
    geomOffsets[i + 1] = coordOffset;
  }

  const coordData = makeCoordData(coords, scan.dimension);
  return makeListData(
    "vertices",
    coordData,
    geomOffsets,
    data.length,
    scan.nullBitmap,
    scan.nullCount,
  );
}

function fillPolygons(data: WKBData, scan: ScanResult): Data {
  const cap = scan.capacity as PolygonCapacity;
  const cs = coordSize(scan.dimension);
  const coords = new Float64Array(cap.coordCapacity * cs);
  const ringOffsets = new Int32Array(cap.ringCapacity + 1);
  const geomOffsets = new Int32Array(data.length + 1);
  const values = data.values;
  const valueOffsets = data.valueOffsets;

  let coordOffset = 0;
  let ringIndex = 0;

  for (let i = 0; i < data.length; i++) {
    if (!data.getValid(i)) {
      geomOffsets[i + 1] = ringIndex;
      continue;
    }
    const start = valueOffsets[i];
    const view = new DataView(values.buffer, values.byteOffset + start);
    const header = readHeader(view, 0);
    let pos = header.headerSize;
    const numRings = view.getUint32(pos, header.littleEndian);
    pos += 4;

    for (let r = 0; r < numRings; r++) {
      const numPoints = view.getUint32(pos, header.littleEndian);
      pos += 4;
      readCoords(
        view,
        pos,
        header.littleEndian,
        coords,
        coordOffset * cs,
        numPoints * cs,
      );
      pos += numPoints * cs * 8;
      coordOffset += numPoints;
      ringIndex++;
      ringOffsets[ringIndex] = coordOffset;
    }
    geomOffsets[i + 1] = ringIndex;
  }

  const coordData = makeCoordData(coords, scan.dimension);
  const verticesData = makeData({
    type: new List(new Field("vertices", coordData.type, false)),
    valueOffsets: ringOffsets,
    child: coordData,
  });
  return makeListData(
    "rings",
    verticesData,
    geomOffsets,
    data.length,
    scan.nullBitmap,
    scan.nullCount,
  );
}

function fillMultiPoints(data: WKBData, scan: ScanResult): Data {
  const cap = scan.capacity as MultiPointCapacity;
  const cs = coordSize(scan.dimension);
  const coords = new Float64Array(cap.coordCapacity * cs);
  const geomOffsets = new Int32Array(data.length + 1);
  const values = data.values;
  const valueOffsets = data.valueOffsets;

  let coordOffset = 0;
  for (let i = 0; i < data.length; i++) {
    if (!data.getValid(i)) {
      geomOffsets[i + 1] = coordOffset;
      continue;
    }
    const start = valueOffsets[i];
    const view = new DataView(values.buffer, values.byteOffset + start);
    const header = readHeader(view, 0);
    let pos = header.headerSize;
    const numGeoms = view.getUint32(pos, header.littleEndian);
    pos += 4;

    for (let g = 0; g < numGeoms; g++) {
      const subHeader = readHeader(view, pos);
      pos += subHeader.headerSize;
      readCoords(
        view,
        pos,
        subHeader.littleEndian,
        coords,
        coordOffset * cs,
        cs,
      );
      pos += cs * 8;
      coordOffset += 1;
    }
    geomOffsets[i + 1] = coordOffset;
  }

  const coordData = makeCoordData(coords, scan.dimension);
  return makeListData(
    "points",
    coordData,
    geomOffsets,
    data.length,
    scan.nullBitmap,
    scan.nullCount,
  );
}

function fillMultiLineStrings(data: WKBData, scan: ScanResult): Data {
  const cap = scan.capacity as MultiLineStringCapacity;
  const cs = coordSize(scan.dimension);
  const coords = new Float64Array(cap.coordCapacity * cs);
  const ringOffsets = new Int32Array(cap.ringCapacity + 1);
  const geomOffsets = new Int32Array(data.length + 1);
  const values = data.values;
  const valueOffsets = data.valueOffsets;

  let coordOffset = 0;
  let lineIndex = 0;

  for (let i = 0; i < data.length; i++) {
    if (!data.getValid(i)) {
      geomOffsets[i + 1] = lineIndex;
      continue;
    }
    const start = valueOffsets[i];
    const view = new DataView(values.buffer, values.byteOffset + start);
    const header = readHeader(view, 0);
    let pos = header.headerSize;
    const numGeoms = view.getUint32(pos, header.littleEndian);
    pos += 4;

    for (let g = 0; g < numGeoms; g++) {
      const subHeader = readHeader(view, pos);
      pos += subHeader.headerSize;
      const numPoints = view.getUint32(pos, subHeader.littleEndian);
      pos += 4;
      readCoords(
        view,
        pos,
        subHeader.littleEndian,
        coords,
        coordOffset * cs,
        numPoints * cs,
      );
      pos += numPoints * cs * 8;
      coordOffset += numPoints;
      lineIndex++;
      ringOffsets[lineIndex] = coordOffset;
    }
    geomOffsets[i + 1] = lineIndex;
  }

  const coordData = makeCoordData(coords, scan.dimension);
  const verticesData = makeData({
    type: new List(new Field("vertices", coordData.type, false)),
    valueOffsets: ringOffsets,
    child: coordData,
  });
  return makeListData(
    "linestrings",
    verticesData,
    geomOffsets,
    data.length,
    scan.nullBitmap,
    scan.nullCount,
  );
}

function fillMultiPolygons(data: WKBData, scan: ScanResult): Data {
  const cap = scan.capacity as MultiPolygonCapacity;
  const cs = coordSize(scan.dimension);
  const coords = new Float64Array(cap.coordCapacity * cs);
  const ringOffsets = new Int32Array(cap.ringCapacity + 1);
  const polygonOffsets = new Int32Array(cap.polygonCapacity + 1);
  const geomOffsets = new Int32Array(data.length + 1);
  const values = data.values;
  const valueOffsets = data.valueOffsets;

  let coordOffset = 0;
  let ringIndex = 0;
  let polygonIndex = 0;

  for (let i = 0; i < data.length; i++) {
    if (!data.getValid(i)) {
      geomOffsets[i + 1] = polygonIndex;
      continue;
    }
    const start = valueOffsets[i];
    const view = new DataView(values.buffer, values.byteOffset + start);
    const header = readHeader(view, 0);
    let pos = header.headerSize;
    const numPolygons = view.getUint32(pos, header.littleEndian);
    pos += 4;

    for (let p = 0; p < numPolygons; p++) {
      const subHeader = readHeader(view, pos);
      pos += subHeader.headerSize;
      const numRings = view.getUint32(pos, subHeader.littleEndian);
      pos += 4;

      for (let r = 0; r < numRings; r++) {
        const numPoints = view.getUint32(pos, subHeader.littleEndian);
        pos += 4;
        readCoords(
          view,
          pos,
          subHeader.littleEndian,
          coords,
          coordOffset * cs,
          numPoints * cs,
        );
        pos += numPoints * cs * 8;
        coordOffset += numPoints;
        ringIndex++;
        ringOffsets[ringIndex] = coordOffset;
      }
      polygonIndex++;
      polygonOffsets[polygonIndex] = ringIndex;
    }
    geomOffsets[i + 1] = polygonIndex;
  }

  const coordData = makeCoordData(coords, scan.dimension);
  const verticesData = makeData({
    type: new List(new Field("vertices", coordData.type, false)),
    valueOffsets: ringOffsets,
    child: coordData,
  });
  const ringsData = makeData({
    type: new List(new Field("rings", verticesData.type, false)),
    valueOffsets: polygonOffsets,
    child: verticesData,
  });
  return makeListData(
    "polygons",
    ringsData,
    geomOffsets,
    data.length,
    scan.nullBitmap,
    scan.nullCount,
  );
}
