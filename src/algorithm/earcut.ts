import { earcut as _earcut } from "@math.gl/polygon";
import { PolygonData } from "../data";
import { PolygonVector } from "../vector";
import { getLineStringChild, getPointChild, getPolygonChild } from "../child";

/**
 * Run earcut on polygon input
 */
export function earcut(input: PolygonData): Uint32Array;
export function earcut(input: PolygonVector): Uint32Array[];

export function earcut(
  input: PolygonData | PolygonVector,
): Uint32Array | Uint32Array[] {
  if ("data" in input) {
    return input.data.map((data) => earcut(data));
  }

  const trianglesResults: number[][] = [];
  let outputSize = 0;
  for (let geomIndex = 0; geomIndex < input.length; geomIndex++) {
    const triangles = earcutSinglePolygon(input, geomIndex);
    trianglesResults.push(triangles);
    outputSize += triangles.length;
  }

  const outputArray = new Uint32Array(outputSize);
  let idx = 0;
  for (const triangles of trianglesResults) {
    for (const value of triangles) {
      outputArray[idx] = value;
      idx += 1;
    }
  }

  return outputArray;
}

function earcutSinglePolygon(data: PolygonData, geomIndex: number): number[] {
  const geomOffsets = data.valueOffsets;
  const rings = getPolygonChild(data);
  const ringOffsets = rings.valueOffsets;

  const coords = getLineStringChild(rings);
  const dim = coords.type.listSize;
  const flatCoords = getPointChild(coords);

  const ringBegin = geomOffsets[geomIndex];
  const ringEnd = geomOffsets[geomIndex + 1];

  const coordsBegin = ringOffsets[ringBegin];
  const coordsEnd = ringOffsets[ringEnd];

  const slicedFlatCoords = flatCoords.values.subarray(
    coordsBegin * dim,
    coordsEnd * dim,
  );

  const initialCoordIndex = ringOffsets[ringBegin];
  const holeIndices = [];
  for (let holeRingIdx = ringBegin + 1; holeRingIdx < ringEnd; holeRingIdx++) {
    holeIndices.push(ringOffsets[holeRingIdx] - initialCoordIndex);
  }
  const triangles = _earcut(slicedFlatCoords, holeIndices, dim);

  for (let i = 0; i < triangles.length; i++) {
    triangles[i] += initialCoordIndex;
  }

  return triangles;
}
