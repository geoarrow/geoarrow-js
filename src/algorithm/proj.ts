import * as arrow from "apache-arrow";
import proj4 from "proj4";
import { GeoArrowType } from "../type";

/**
 * Reproject using proj4
 */
export function reproject<T extends GeoArrowType>(
  input: arrow.Data<T>,
  fromProjection: string,
  toProjection: string
): arrow.Data<T>;
export function reproject<T extends GeoArrowType>(
  input: arrow.Vector<T>,
  fromProjection: string,
  toProjection: string
): arrow.Vector<T>;

export function reproject<T extends GeoArrowType>(
  input: arrow.Data<T> | arrow.Vector<T>,
  fromProjection: string,
  toProjection: string
): arrow.Data<T> | arrow.Vector<T> {
  const projectionFn = proj4(fromProjection, toProjection);
  if ("data" in input) {
    return new arrow.Vector(
      input.data.map((data) => reprojectData(data, projectionFn))
    );
  }

  return reprojectData(input, projectionFn);
}

/**
 * Reproject a single Data instance
 *
 * @return  {<T>}     [return description]
 */
function reprojectData<T extends GeoArrowType>(
  input: arrow.Data<T>,
  projectionFn: proj4.Converter
): arrow.Data<T> {
  // todo implement on top of mapCoords
}
