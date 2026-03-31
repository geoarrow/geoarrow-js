// src/io/wkb/writer.ts
// cf. geoarrow-rs: wkb crate, src/writer/
import { makeData, Binary, DataType } from "apache-arrow";
import type { Data, List, FixedSizeList } from "apache-arrow";
import { WkbType, Dimension, coordSize } from "./types.js";
import { writeHeader } from "./header.js";
import {
  isPoint,
  isLineString,
  isPolygon,
  isMultiPoint,
  isMultiLineString,
  isMultiPolygon,
} from "../../type.js";
import type { GeoArrowData, WKBData } from "../../data.js";

/**
 * Encode a GeoArrow array to ISO WKB (little-endian, no SRID).
 */
export function toWkb(data: GeoArrowData): WKBData {
  const { type, dim } = detectType(data);
  const geomSizes = computeWkbSizes(data, type, dim);
  const totalBytes = geomSizes.reduce((a, b) => a + b, 0);

  const wkbBuf = new Uint8Array(totalBytes);
  const view = new DataView(wkbBuf.buffer);
  const valueOffsets = new Int32Array(data.length + 1);

  let byteOffset = 0;
  for (let i = 0; i < data.length; i++) {
    if (data.nullCount > 0 && !data.getValid(i)) {
      valueOffsets[i + 1] = byteOffset;
      continue;
    }
    byteOffset = writeGeometry(view, byteOffset, data, i, type, dim);
    valueOffsets[i + 1] = byteOffset;
  }

  // Build null bitmap if needed
  let nullBitmap: Uint8Array | null = null;
  if (data.nullCount > 0) {
    const bitmapBytes = Math.ceil(data.length / 8);
    nullBitmap = new Uint8Array(bitmapBytes);
    for (let i = 0; i < data.length; i++) {
      if (data.getValid(i)) {
        nullBitmap[i >> 3] |= 1 << (i & 7);
      }
    }
  }

  return makeData({
    type: new Binary(),
    data: wkbBuf,
    valueOffsets,
    nullBitmap,
    nullCount: data.nullCount,
  });
}

function detectType(data: GeoArrowData): { type: WkbType; dim: Dimension } {
  // isPoint is unambiguous (FixedSizeList)
  if (isPoint(data.type)) {
    return {
      type: WkbType.Point,
      dim: listSizeToDim((data.type as FixedSizeList).listSize),
    };
  }

  // For List types, use child field names to disambiguate since
  // isLineString/isMultiPoint and isPolygon/isMultiLineString are structurally identical.
  if (DataType.isList(data.type)) {
    const childName = (data.type as List).children[0].name;
    switch (childName) {
      case "vertices":
        return { type: WkbType.LineString, dim: nestedDim(data, 1) };
      case "points":
        return { type: WkbType.MultiPoint, dim: nestedDim(data, 1) };
      case "rings":
        return { type: WkbType.Polygon, dim: nestedDim(data, 2) };
      case "linestrings":
        return { type: WkbType.MultiLineString, dim: nestedDim(data, 2) };
      case "polygons":
        return { type: WkbType.MultiPolygon, dim: nestedDim(data, 3) };
    }

    // Fallback: MultiPolygon is unambiguous (3 nesting levels)
    if (isMultiPolygon(data.type)) {
      return { type: WkbType.MultiPolygon, dim: nestedDim(data, 3) };
    }
    // List<List<Coord>> is ambiguous (Polygon vs MultiLineString)
    // List<Coord> is ambiguous (LineString vs MultiPoint)
    // Throw instead of guessing wrong — caller must use canonical GeoArrow field names
    if (isMultiLineString(data.type) || isPolygon(data.type)) {
      throw new Error(
        `Ambiguous GeoArrow type: List<List<Coord>> could be Polygon or MultiLineString. ` +
          `Use canonical field name "rings" (Polygon) or "linestrings" (MultiLineString). ` +
          `Got child field name "${(data.type as List).children[0].name}".`,
      );
    }
    if (isLineString(data.type) || isMultiPoint(data.type)) {
      throw new Error(
        `Ambiguous GeoArrow type: List<Coord> could be LineString or MultiPoint. ` +
          `Use canonical field name "vertices" (LineString) or "points" (MultiPoint). ` +
          `Got child field name "${(data.type as List).children[0].name}".`,
      );
    }
  }

  throw new Error("Unsupported GeoArrow type for WKB encoding");
}

function listSizeToDim(size: number): Dimension {
  switch (size) {
    case 2:
      return Dimension.XY;
    case 3:
      return Dimension.XYZ;
    case 4:
      return Dimension.XYZM;
    default:
      throw new Error(`Unexpected FixedSizeList size: ${size}`);
  }
}

/** Walk n List levels down to the FixedSizeList and read its listSize */
function nestedDim(data: Data, levels: number): Dimension {
  let d: Data = data;
  for (let i = 0; i < levels; i++) {
    d = (d as Data<List>).children[0];
  }
  return listSizeToDim((d.type as FixedSizeList).listSize);
}

/** Pre-compute WKB byte size for each geometry in the batch */
function computeWkbSizes(
  data: GeoArrowData,
  type: WkbType,
  dim: Dimension,
): number[] {
  const cs = coordSize(dim);
  const sizes: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (data.nullCount > 0 && !data.getValid(i)) {
      sizes.push(0);
      continue;
    }

    let size = 5; // header
    switch (type) {
      case WkbType.Point:
        size += cs * 8;
        break;
      case WkbType.LineString: {
        const d = data as Data<List>;
        const numPoints = d.valueOffsets[i + 1] - d.valueOffsets[i];
        size += 4 + numPoints * cs * 8;
        break;
      }
      case WkbType.Polygon: {
        const d = data as Data<List>;
        const ringStart = d.valueOffsets[i];
        const ringEnd = d.valueOffsets[i + 1];
        size += 4; // numRings
        const ringChild = d.children[0] as Data<List>;
        for (let r = ringStart; r < ringEnd; r++) {
          const numPoints =
            ringChild.valueOffsets[r + 1] - ringChild.valueOffsets[r];
          size += 4 + numPoints * cs * 8;
        }
        break;
      }
      case WkbType.MultiPoint: {
        const d = data as Data<List>;
        const numPoints = d.valueOffsets[i + 1] - d.valueOffsets[i];
        size += 4 + numPoints * (5 + cs * 8); // each point has header
        break;
      }
      case WkbType.MultiLineString: {
        const d = data as Data<List>;
        const partStart = d.valueOffsets[i];
        const partEnd = d.valueOffsets[i + 1];
        size += 4; // numGeometries
        const lineChild = d.children[0] as Data<List>;
        for (let p = partStart; p < partEnd; p++) {
          const numPoints =
            lineChild.valueOffsets[p + 1] - lineChild.valueOffsets[p];
          size += 5 + 4 + numPoints * cs * 8; // header + numPoints + coords
        }
        break;
      }
      case WkbType.MultiPolygon: {
        const d = data as Data<List>;
        const polyStart = d.valueOffsets[i];
        const polyEnd = d.valueOffsets[i + 1];
        size += 4; // numGeometries
        const polyChild = d.children[0] as Data<List>;
        const ringChild = polyChild.children[0] as Data<List>;
        for (let p = polyStart; p < polyEnd; p++) {
          size += 5 + 4; // polygon header + numRings
          const ringStart = polyChild.valueOffsets[p];
          const ringEnd = polyChild.valueOffsets[p + 1];
          for (let r = ringStart; r < ringEnd; r++) {
            const numPoints =
              ringChild.valueOffsets[r + 1] - ringChild.valueOffsets[r];
            size += 4 + numPoints * cs * 8;
          }
        }
        break;
      }
    }
    sizes.push(size);
  }
  return sizes;
}

/** Write a single geometry to the buffer. Returns new byte offset. */
function writeGeometry(
  view: DataView,
  offset: number,
  data: GeoArrowData,
  index: number,
  type: WkbType,
  dim: Dimension,
): number {
  const cs = coordSize(dim);
  let pos = offset;

  switch (type) {
    case WkbType.Point: {
      pos += writeHeader(view, pos, WkbType.Point, dim);
      const coordData = (data as Data<FixedSizeList>).children[0];
      const coords = coordData.values as Float64Array;
      const start = index * cs;
      for (let c = 0; c < cs; c++) {
        view.setFloat64(pos, coords[start + c], true);
        pos += 8;
      }
      break;
    }
    case WkbType.LineString: {
      pos += writeHeader(view, pos, WkbType.LineString, dim);
      const d = data as Data<List>;
      const coordStart = d.valueOffsets[index];
      const coordEnd = d.valueOffsets[index + 1];
      const numPoints = coordEnd - coordStart;
      view.setUint32(pos, numPoints, true);
      pos += 4;
      const coords = d.children[0].children[0].values as Float64Array;
      for (let c = coordStart * cs; c < coordEnd * cs; c++) {
        view.setFloat64(pos, coords[c], true);
        pos += 8;
      }
      break;
    }
    case WkbType.Polygon: {
      pos += writeHeader(view, pos, WkbType.Polygon, dim);
      const d = data as Data<List>;
      const ringStart = d.valueOffsets[index];
      const ringEnd = d.valueOffsets[index + 1];
      const numRings = ringEnd - ringStart;
      view.setUint32(pos, numRings, true);
      pos += 4;
      const ringChild = d.children[0] as Data<List>;
      const coords = ringChild.children[0].children[0].values as Float64Array;
      for (let r = ringStart; r < ringEnd; r++) {
        const cStart = ringChild.valueOffsets[r];
        const cEnd = ringChild.valueOffsets[r + 1];
        view.setUint32(pos, cEnd - cStart, true);
        pos += 4;
        for (let c = cStart * cs; c < cEnd * cs; c++) {
          view.setFloat64(pos, coords[c], true);
          pos += 8;
        }
      }
      break;
    }
    case WkbType.MultiPoint: {
      pos += writeHeader(view, pos, WkbType.MultiPoint, dim);
      const d = data as Data<List>;
      const ptStart = d.valueOffsets[index];
      const ptEnd = d.valueOffsets[index + 1];
      view.setUint32(pos, ptEnd - ptStart, true);
      pos += 4;
      const coords = d.children[0].children[0].values as Float64Array;
      for (let p = ptStart; p < ptEnd; p++) {
        pos += writeHeader(view, pos, WkbType.Point, dim);
        for (let c = p * cs; c < (p + 1) * cs; c++) {
          view.setFloat64(pos, coords[c], true);
          pos += 8;
        }
      }
      break;
    }
    case WkbType.MultiLineString: {
      pos += writeHeader(view, pos, WkbType.MultiLineString, dim);
      const d = data as Data<List>;
      const partStart = d.valueOffsets[index];
      const partEnd = d.valueOffsets[index + 1];
      view.setUint32(pos, partEnd - partStart, true);
      pos += 4;
      const lineChild = d.children[0] as Data<List>;
      const coords = lineChild.children[0].children[0].values as Float64Array;
      for (let p = partStart; p < partEnd; p++) {
        pos += writeHeader(view, pos, WkbType.LineString, dim);
        const cStart = lineChild.valueOffsets[p];
        const cEnd = lineChild.valueOffsets[p + 1];
        view.setUint32(pos, cEnd - cStart, true);
        pos += 4;
        for (let c = cStart * cs; c < cEnd * cs; c++) {
          view.setFloat64(pos, coords[c], true);
          pos += 8;
        }
      }
      break;
    }
    case WkbType.MultiPolygon: {
      pos += writeHeader(view, pos, WkbType.MultiPolygon, dim);
      const d = data as Data<List>;
      const polyStart = d.valueOffsets[index];
      const polyEnd = d.valueOffsets[index + 1];
      view.setUint32(pos, polyEnd - polyStart, true);
      pos += 4;
      const polyChild = d.children[0] as Data<List>;
      const ringChild = polyChild.children[0] as Data<List>;
      const coords = ringChild.children[0].children[0].values as Float64Array;
      for (let p = polyStart; p < polyEnd; p++) {
        pos += writeHeader(view, pos, WkbType.Polygon, dim);
        const rStart = polyChild.valueOffsets[p];
        const rEnd = polyChild.valueOffsets[p + 1];
        view.setUint32(pos, rEnd - rStart, true);
        pos += 4;
        for (let r = rStart; r < rEnd; r++) {
          const cStart = ringChild.valueOffsets[r];
          const cEnd = ringChild.valueOffsets[r + 1];
          view.setUint32(pos, cEnd - cStart, true);
          pos += 4;
          for (let c = cStart * cs; c < cEnd * cs; c++) {
            view.setFloat64(pos, coords[c], true);
            pos += 8;
          }
        }
      }
      break;
    }
  }
  return pos;
}
