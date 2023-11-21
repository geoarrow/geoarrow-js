import * as arrow from "apache-arrow";
import { PolygonData } from "../data";
import { PolygonVector } from "../vector";
import { makeMathGlPolygon } from "./utils/polygon";
import { WINDING as _WINDING } from "@math.gl/polygon";

export enum Winding {
  CLOCKWISE = _WINDING.CLOCKWISE,
  COUNTER_CLOCKWISE = _WINDING.COUNTER_CLOCKWISE,
}

/**
 * Compute the winding direction of the polygon input.
 *
 * The result is a boolean Data or Vector, where `true` means **Clockwise**
 * winding order and `false` means **Counter Clockwise** winding order.
 */
export function windingDirection(input: PolygonData): arrow.Data<arrow.Bool>;
export function windingDirection(
  input: PolygonVector
): arrow.Vector<arrow.Bool>;

export function windingDirection(
  input: PolygonData | PolygonVector
): arrow.Data<arrow.Bool> | arrow.Vector<arrow.Bool> {
  if ("data" in input) {
    return new arrow.Vector(
      input.data.map((polygonData) => windingDirection(polygonData))
    );
  }

  let builder = new arrow.BoolBuilder({
    type: new arrow.Bool(),
    nullValues: [null],
  });
  // Force-allocate once for length of buffer
  builder.set(input.length - 1, null);

  for (let geomIndex = 0; geomIndex < input.length; geomIndex++) {
    if (!input.getValid(geomIndex)) {
      builder.setValid(geomIndex, false);
      continue;
    }

    let polygon = makeMathGlPolygon(input, geomIndex);
    let winding = polygon.getWindingDirection();
    builder.set(geomIndex, winding === Winding.CLOCKWISE);
  }

  return builder.finish().flush();
}

/**
 * **Mutate** the existing Polygon data or vector with the desired winding
 */
export function modifyWindingDirection(
  input: PolygonData,
  winding: Winding
): void;
export function modifyWindingDirection(
  input: PolygonVector,
  winding: Winding
): void;

export function modifyWindingDirection(
  input: PolygonData | PolygonVector,
  winding: Winding
): void {
  if ("data" in input) {
    input.data.forEach((polygonData) =>
      modifyWindingDirection(polygonData, winding)
    );
    return;
  }

  for (let geomIndex = 0; geomIndex < input.length; geomIndex++) {
    // This polygon is a reference onto the PolygonData, so mutating it will
    // mutate the PolygonData
    let polygon = makeMathGlPolygon(input, geomIndex);
    polygon.modifyWindingDirection(winding);
  }
}
