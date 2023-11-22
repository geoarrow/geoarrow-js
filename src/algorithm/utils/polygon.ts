import { PolygonData } from "../../data";
import { Polygon } from "@math.gl/polygon";
import {
  getLineStringChild,
  getPointChild,
  getPolygonChild,
} from "../../child";

export function makeMathGlPolygon(
  data: PolygonData,
  geomIndex: number,
): Polygon {
  const geomOffsets = data.valueOffsets;
  const ringsData = getPolygonChild(data);
  const ringOffsets = ringsData.valueOffsets;

  const pointData = getLineStringChild(ringsData);
  const dim = pointData.type.listSize;
  const flatCoordData = getPointChild(pointData);

  const ringBegin = geomOffsets[geomIndex];
  const ringEnd = geomOffsets[geomIndex + 1];

  const coordsBegin = ringOffsets[ringBegin];
  const coordsEnd = ringOffsets[ringEnd];

  const slicedFlatCoords = flatCoordData.values.subarray(
    coordsBegin * dim,
    coordsEnd * dim,
  );
  return new Polygon(slicedFlatCoords, {
    size: dim,
    isClosed: true,
  });
}
