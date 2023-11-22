import * as arrow from "apache-arrow";
import {
  LineStringVector,
  MultiLineStringVector,
  MultiPolygonVector,
  PolygonVector,
} from "../vector";
import {
  LineStringData,
  MultiLineStringData,
  MultiPolygonData,
  PolygonData,
} from "../data";
import { getMultiPolygonChild, getPolygonChild } from "../child";

/**
 * Get the exterior of a PolygonVector or PolygonData
 */
export function getPolygonExterior(input: PolygonVector): LineStringVector;
export function getPolygonExterior(input: PolygonData): LineStringData;

export function getPolygonExterior(
  input: PolygonVector | PolygonData,
): LineStringVector | LineStringData {
  if ("data" in input) {
    return new arrow.Vector(input.data.map((data) => getPolygonExterior(data)));
  }

  return getPolygonChild(input);
}

/**
 * Get the exterior of a MultiPolygonVector or MultiPolygonData
 */
export function getMultiPolygonExterior(
  input: MultiPolygonVector,
): MultiLineStringVector;
export function getMultiPolygonExterior(
  input: MultiPolygonData,
): MultiLineStringData;

export function getMultiPolygonExterior(
  input: MultiPolygonVector | MultiPolygonData,
): MultiLineStringVector | MultiLineStringData {
  if ("data" in input) {
    return new arrow.Vector(
      input.data.map((data) => getMultiPolygonExterior(data)),
    );
  }

  return getMultiPolygonChild(input);
}
