import { describe, expect, it } from "vitest";
import { testPointData } from "../util/point";
import { reproject } from "../../src/algorithm";

import proj4 from "proj4";

describe("reproject", (t) => {
  it("should reproject point array", () => {
    const pointData = testPointData();
    const reprojected = reproject(pointData, "EPSG:4326", "EPSG:3857");

    const expected1 = proj4("EPSG:4326", "EPSG:3857", [1, 2]);
    const expected2 = proj4("EPSG:4326", "EPSG:3857", [3, 4]);
    const expected3 = proj4("EPSG:4326", "EPSG:3857", [5, 6]);

    expect(reprojected.children[0].values[0]).toBeCloseTo(expected1[0]);
    expect(reprojected.children[0].values[1]).toBeCloseTo(expected1[1]);
    expect(reprojected.children[0].values[2]).toBeCloseTo(expected2[0]);
    expect(reprojected.children[0].values[3]).toBeCloseTo(expected2[1]);
    expect(reprojected.children[0].values[4]).toBeCloseTo(expected3[0]);
    expect(reprojected.children[0].values[5]).toBeCloseTo(expected3[1]);
  });
});
