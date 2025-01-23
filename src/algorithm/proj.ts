import { Data, Vector } from "apache-arrow";
import proj4 from "proj4";
import { GeoArrowType } from "../type";
import { mapCoords } from "./coords";

/**
 * Reproject using proj4
 */
export function reproject<T extends GeoArrowType>(
  input: Data<T>,
  fromProjection: string,
  toProjection: string,
): Data<T>;
export function reproject<T extends GeoArrowType>(
  input: Vector<T>,
  fromProjection: string,
  toProjection: string,
): Vector<T>;

export function reproject<T extends GeoArrowType>(
  input: Data<T> | Vector<T>,
  fromProjection: string,
  toProjection: string,
): Data<T> | Vector<T> {
  const projectionFn = proj4(fromProjection, toProjection);
  // Check if an Vector
  if ("data" in input) {
    return new Vector(
      input.data.map((data) => reprojectData(data, projectionFn)),
    );
  }

  return reprojectData(input, projectionFn);
}

/**
 * Reproject a single Data instance
 */
function reprojectData<T extends GeoArrowType>(
  input: Data<T>,
  projectionFn: proj4.Converter,
): Data<T> {
  // Avoid extra object creation
  const stack = [0, 0];
  const callback = (x: number, y: number) => {
    stack[0] = x;
    stack[1] = y;
    return projectionFn.forward(stack) as [number, number];
  };

  // @ts-expect-error I have a mismatch between generic T extends GeoArrowType
  // and concrete GeoArrowData typing
  return mapCoords(input, callback);
}
