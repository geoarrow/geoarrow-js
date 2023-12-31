import * as arrow from "apache-arrow";
import {
  LineStringVector,
  MultiPolygonVector,
  PointVector,
  PolygonVector,
} from "../vector.js";
import { PointData } from "../data.js";
import {
  getLineStringChild,
  getMultiPolygonChild,
  getPointChild,
  getPolygonChild,
} from "../child.js";
import { EXTENSION_NAME } from "../constants.js";

class Bbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;

  constructor() {
    this.minX = Infinity;
    this.minY = Infinity;
    this.maxX = -Infinity;
    this.maxY = -Infinity;
  }

  updateBbox(other: Bbox) {
    if (other.minX < this.minX) {
      this.minX = other.minX;
    }
    if (other.minY < this.minY) {
      this.minY = other.minY;
    }
    if (other.maxX > this.maxX) {
      this.maxX = other.maxX;
    }
    if (other.maxY > this.maxY) {
      this.maxY = other.maxY;
    }
  }

  updateCoord(x: number, y: number) {
    if (x < this.minX) {
      this.minX = x;
    }
    if (y < this.minY) {
      this.minY = y;
    }
    if (x > this.maxX) {
      this.maxX = x;
    }
    if (y > this.maxY) {
      this.maxY = y;
    }
  }
}

export function totalBounds(vector: arrow.Vector, field: arrow.Field): Bbox {
  switch (field.metadata.get("ARROW:extension:name")) {
    case EXTENSION_NAME.POINT:
      return totalBoundsNest0(vector);
    case EXTENSION_NAME.LINESTRING:
    case EXTENSION_NAME.MULTIPOINT:
      return totalBoundsNest1(vector);
    case EXTENSION_NAME.POLYGON:
    case EXTENSION_NAME.MULTILINESTRING:
      return totalBoundsNest2(vector);
    case EXTENSION_NAME.MULTIPOLYGON:
      return totalBoundsNest3(vector);
    default:
      throw new Error("Unknown ext type name");
  }
}

function coordsBbox(data: PointData): Bbox {
  const coordsData = getPointChild(data);
  const flatCoords = coordsData.values;
  const bbox = new Bbox();

  for (let coordIdx = 0; coordIdx < data.length; coordIdx++) {
    const x = flatCoords[coordIdx * 2];
    const y = flatCoords[coordIdx * 2 + 1];
    bbox.updateCoord(x, y);
  }

  return bbox;
}

function totalBoundsNest0(vector: PointVector): Bbox {
  const bbox = new Bbox();
  for (const data of vector.data) {
    bbox.updateBbox(coordsBbox(data));
  }

  return bbox;
}

function totalBoundsNest1(vector: LineStringVector): Bbox {
  const pointVector = getLineStringChild(vector);
  return totalBoundsNest0(pointVector);
}

function totalBoundsNest2(vector: PolygonVector): Bbox {
  const lineStringVector = getPolygonChild(vector);
  return totalBoundsNest1(lineStringVector);
}

function totalBoundsNest3(vector: MultiPolygonVector): Bbox {
  const polygonVector = getMultiPolygonChild(vector);
  return totalBoundsNest2(polygonVector);
}
