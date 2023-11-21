import * as arrow from "apache-arrow";
import { GeoArrowType } from "../type";

export function mutateCoords<T extends GeoArrowType>(
  input: arrow.Data<T>,
  callback: (coord: number[]) => number[]
): void {}

export function mapCoords<T extends GeoArrowType>(
  input: arrow.Data<T>,
  callback: (coord: number[]) => number[]
): arrow.Data<T> {}
