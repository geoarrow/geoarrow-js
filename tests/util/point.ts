import * as arrow from "apache-arrow";
import { PointData } from "../../src/data";

export function testPointData(): PointData {
  const values = new Float64Array([1, 2, 3, 4, 5, 6]);
  const coordType = new arrow.Float(arrow.Precision.DOUBLE);
  const coordData = arrow.makeData({
    type: coordType,
    data: values,
  });

  const pointType = new arrow.FixedSizeList(
    2,
    new arrow.Field("xy", coordType, false),
  );
  return arrow.makeData({
    type: pointType,
    child: coordData,
  });
}
