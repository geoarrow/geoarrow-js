// src/io/wkb/header.ts
// cf. geoarrow-rs: wkb crate, src/reader/geometry.rs
import { WkbType, Dimension } from "./types.js";

const EWKB_Z = 0x80000000;
const EWKB_M = 0x40000000;
const EWKB_SRID = 0x20000000;

export type WkbHeader = {
  type: WkbType;
  dimension: Dimension;
  srid: number | null;
  headerSize: number;
  littleEndian: boolean;
};

export function readHeader(view: DataView, offset: number): WkbHeader {
  const byteOrder = view.getUint8(offset);
  const littleEndian = byteOrder === 1;
  const rawType = view.getUint32(offset + 1, littleEndian);

  let headerSize = 5;
  let srid: number | null = null;

  const hasEwkbZ = (rawType & EWKB_Z) !== 0;
  const hasEwkbM = (rawType & EWKB_M) !== 0;
  const hasEwkbSrid = (rawType & EWKB_SRID) !== 0;

  if (hasEwkbSrid) {
    if (offset + 9 > view.byteLength) {
      throw new Error(
        `Truncated EWKB: SRID flag set but only ${view.byteLength - offset} bytes available (need 9)`,
      );
    }
    srid = view.getInt32(offset + 5, littleEndian);
    headerSize = 9;
  }

  const baseType = rawType & 0x0fffffff;

  let type: WkbType;
  let dimension: Dimension;

  if (baseType > 3000) {
    type = (baseType - 3000) as WkbType;
    dimension = Dimension.XYZM;
  } else if (baseType > 2000) {
    type = (baseType - 2000) as WkbType;
    dimension = Dimension.XYM;
  } else if (baseType > 1000) {
    type = (baseType - 1000) as WkbType;
    dimension = Dimension.XYZ;
  } else {
    type = baseType as WkbType;
    if (hasEwkbZ && hasEwkbM) {
      dimension = Dimension.XYZM;
    } else if (hasEwkbZ) {
      dimension = Dimension.XYZ;
    } else if (hasEwkbM) {
      dimension = Dimension.XYM;
    } else {
      dimension = Dimension.XY;
    }
  }

  return { type, dimension, srid, headerSize, littleEndian };
}

export function writeHeader(
  view: DataView,
  offset: number,
  type: WkbType,
  dim: Dimension,
): number {
  view.setUint8(offset, 1);

  let typeCode: number = type;
  switch (dim) {
    case Dimension.XYZ:
      typeCode += 1000;
      break;
    case Dimension.XYM:
      typeCode += 2000;
      break;
    case Dimension.XYZM:
      typeCode += 3000;
      break;
  }

  view.setUint32(offset + 1, typeCode, true);
  return 5;
}
