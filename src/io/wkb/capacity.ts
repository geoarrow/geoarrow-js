// src/io/wkb/capacity.ts
// cf. geoarrow-rs: rust/geoarrow-array/src/capacity/
import { WkbType, Dimension, coordSize } from "./types.js";
import { readHeader } from "./header.js";

export type PointCapacity = { geomCapacity: number };
export type LineStringCapacity = {
  coordCapacity: number;
  geomCapacity: number;
};
export type PolygonCapacity = {
  coordCapacity: number;
  ringCapacity: number;
  geomCapacity: number;
};
export type MultiPointCapacity = {
  coordCapacity: number;
  partCapacity: number;
  geomCapacity: number;
};
export type MultiLineStringCapacity = {
  coordCapacity: number;
  ringCapacity: number;
  partCapacity: number;
  geomCapacity: number;
};
export type MultiPolygonCapacity = {
  coordCapacity: number;
  ringCapacity: number;
  polygonCapacity: number;
  geomCapacity: number;
};

export type Capacity =
  | PointCapacity
  | LineStringCapacity
  | PolygonCapacity
  | MultiPointCapacity
  | MultiLineStringCapacity
  | MultiPolygonCapacity;

/** Throw if pos + needed bytes exceeds buffer */
function checkBounds(
  view: DataView,
  pos: number,
  needed: number,
  label: string,
): void {
  if (pos + needed > view.byteLength) {
    throw new Error(
      `Truncated WKB: ${label} requires ${needed} bytes at offset ${pos}, but buffer is ${view.byteLength} bytes`,
    );
  }
}

/**
 * Scan a single WKB geometry and return the number of bytes consumed
 * plus accumulated capacity counts. Does not parse coordinate values.
 */
export function addGeometryCapacity(
  view: DataView,
  offset: number,
  dim: Dimension,
  capacity: Capacity,
  expectedType: WkbType,
): number {
  const header = readHeader(view, offset);
  let pos = offset + header.headerSize;
  const cs = coordSize(dim);

  switch (expectedType) {
    case WkbType.Point: {
      const cap = capacity as PointCapacity;
      cap.geomCapacity += 1;
      checkBounds(view, pos, cs * 8, "Point coordinates");
      pos += cs * 8;
      break;
    }
    case WkbType.LineString: {
      const cap = capacity as LineStringCapacity;
      cap.geomCapacity += 1;
      checkBounds(view, pos, 4, "LineString numPoints");
      const numPoints = view.getUint32(pos, header.littleEndian);
      pos += 4;
      checkBounds(
        view,
        pos,
        numPoints * cs * 8,
        `LineString ${numPoints} coordinates`,
      );
      cap.coordCapacity += numPoints;
      pos += numPoints * cs * 8;
      break;
    }
    case WkbType.Polygon: {
      const cap = capacity as PolygonCapacity;
      cap.geomCapacity += 1;
      checkBounds(view, pos, 4, "Polygon numRings");
      const numRings = view.getUint32(pos, header.littleEndian);
      pos += 4;
      for (let r = 0; r < numRings; r++) {
        cap.ringCapacity += 1;
        checkBounds(view, pos, 4, `Polygon ring ${r} numPoints`);
        const numPoints = view.getUint32(pos, header.littleEndian);
        pos += 4;
        checkBounds(
          view,
          pos,
          numPoints * cs * 8,
          `Polygon ring ${r} coordinates`,
        );
        cap.coordCapacity += numPoints;
        pos += numPoints * cs * 8;
      }
      break;
    }
    case WkbType.MultiPoint: {
      const cap = capacity as MultiPointCapacity;
      cap.geomCapacity += 1;
      checkBounds(view, pos, 4, "MultiPoint numGeometries");
      const numGeoms = view.getUint32(pos, header.littleEndian);
      pos += 4;
      cap.partCapacity += numGeoms;
      for (let g = 0; g < numGeoms; g++) {
        const subHeader = readHeader(view, pos);
        pos += subHeader.headerSize;
        checkBounds(view, pos, cs * 8, `MultiPoint sub-geometry ${g}`);
        cap.coordCapacity += 1;
        pos += cs * 8;
      }
      break;
    }
    case WkbType.MultiLineString: {
      const cap = capacity as MultiLineStringCapacity;
      cap.geomCapacity += 1;
      checkBounds(view, pos, 4, "MultiLineString numGeometries");
      const numGeoms = view.getUint32(pos, header.littleEndian);
      pos += 4;
      cap.partCapacity += numGeoms;
      for (let g = 0; g < numGeoms; g++) {
        const subHeader = readHeader(view, pos);
        pos += subHeader.headerSize;
        checkBounds(
          view,
          pos,
          4,
          `MultiLineString sub-geometry ${g} numPoints`,
        );
        const numPoints = view.getUint32(pos, subHeader.littleEndian);
        pos += 4;
        checkBounds(
          view,
          pos,
          numPoints * cs * 8,
          `MultiLineString sub-geometry ${g} coordinates`,
        );
        cap.ringCapacity += 1;
        cap.coordCapacity += numPoints;
        pos += numPoints * cs * 8;
      }
      break;
    }
    case WkbType.MultiPolygon: {
      const cap = capacity as MultiPolygonCapacity;
      cap.geomCapacity += 1;
      checkBounds(view, pos, 4, "MultiPolygon numGeometries");
      const numGeoms = view.getUint32(pos, header.littleEndian);
      pos += 4;
      cap.polygonCapacity += numGeoms;
      for (let g = 0; g < numGeoms; g++) {
        const subHeader = readHeader(view, pos);
        pos += subHeader.headerSize;
        checkBounds(view, pos, 4, `MultiPolygon polygon ${g} numRings`);
        const numRings = view.getUint32(pos, subHeader.littleEndian);
        pos += 4;
        for (let r = 0; r < numRings; r++) {
          cap.ringCapacity += 1;
          checkBounds(
            view,
            pos,
            4,
            `MultiPolygon polygon ${g} ring ${r} numPoints`,
          );
          const numPoints = view.getUint32(pos, subHeader.littleEndian);
          pos += 4;
          checkBounds(
            view,
            pos,
            numPoints * cs * 8,
            `MultiPolygon polygon ${g} ring ${r} coordinates`,
          );
          cap.coordCapacity += numPoints;
          pos += numPoints * cs * 8;
        }
      }
      break;
    }
  }

  return pos - offset; // bytes consumed
}

/** Create a zero-initialized capacity for the given geometry type */
export function emptyCapacity(type: WkbType): Capacity {
  switch (type) {
    case WkbType.Point:
      return { geomCapacity: 0 };
    case WkbType.LineString:
      return { coordCapacity: 0, geomCapacity: 0 };
    case WkbType.Polygon:
      return { coordCapacity: 0, ringCapacity: 0, geomCapacity: 0 };
    case WkbType.MultiPoint:
      return { coordCapacity: 0, partCapacity: 0, geomCapacity: 0 };
    case WkbType.MultiLineString:
      return {
        coordCapacity: 0,
        ringCapacity: 0,
        partCapacity: 0,
        geomCapacity: 0,
      };
    case WkbType.MultiPolygon:
      return {
        coordCapacity: 0,
        ringCapacity: 0,
        polygonCapacity: 0,
        geomCapacity: 0,
      };
  }
}
