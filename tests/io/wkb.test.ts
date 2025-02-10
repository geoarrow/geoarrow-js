import { makeData, Binary } from "apache-arrow";
import { describe, expect, it } from "vitest";
import { parseTestCases } from "./parse-test-cases";
import { fetchFile } from "@loaders.gl/core";
import { parseWkb, WKBType } from "../../src/io/wkb";
import { isLineStringData, isPolygonData, isPointData } from "../../src/data";

//Test cases from Loaders.gl https://github.com/visgl/loaders.gl
const WKB_2D_TEST_CASES =
  "https://raw.githubusercontent.com/visgl/loaders.gl/d74df445180408fd772567ca6a6bbb8d42aa50be/modules/gis/test/data/wkt/wkb-testdata2d.json";

describe("parse point wkb", (t) => {
  it("should parse point wkb as valid geoarrow", async () => {
    const response = await fetchFile(WKB_2D_TEST_CASES);
    const testCases = parseTestCases(await response.json());
    const linePointTypes = ["point"];
    const testCasesPoint = Object.fromEntries(
      Object.entries(testCases).filter(([key, val]) =>
        linePointTypes.includes(key),
      ),
    );

    for (const [title, testCase] of Object.entries(testCasesPoint)) {
      const data = new Uint8Array(testCase.wkb);
      const offsets = new Uint32Array([0, data.length]);
      const polygonData = makeData({
        type: new Binary(),
        data: data,
        valueOffsets: offsets,
      });
      const parsedPointData = parseWkb(polygonData, WKBType.Point, 2);
      expect(isPointData(parsedPointData)).toBe(true);
    }
  });
});

describe("parse linestring wkb", (t) => {
  it("should parse linestring wkb as valid geoarrow", async () => {
    const response = await fetchFile(WKB_2D_TEST_CASES);
    const testCases = parseTestCases(await response.json());
    const lineStringTypes = ["lineString"];
    const testCasesLineString = Object.fromEntries(
      Object.entries(testCases).filter(([key, val]) =>
        lineStringTypes.includes(key),
      ),
    );

    for (const [title, testCase] of Object.entries(testCasesLineString)) {
      const data = new Uint8Array(testCase.wkb);
      const offsets = new Uint32Array([0, data.length]);
      const polygonData = makeData({
        type: new Binary(),
        data: data,
        valueOffsets: offsets,
      });
      const parsedLineStringData = parseWkb(polygonData, WKBType.LineString, 2);
      expect(isLineStringData(parsedLineStringData)).toBe(true);
    }
  });
});

describe("parse polygon wkb", (t) => {
  it("should parse polygon wkb as valid geoarrow", async () => {
    const response = await fetchFile(WKB_2D_TEST_CASES);
    const testCases = parseTestCases(await response.json());
    const polygonTypes = [
      "polygon",
      "polygonWithOneInteriorRing",
      "polygonWithTwoInteriorRings",
    ];
    const testCasesPolygon = Object.fromEntries(
      Object.entries(testCases).filter(([key, val]) =>
        polygonTypes.includes(key),
      ),
    );

    for (const [title, testCase] of Object.entries(testCasesPolygon)) {
      const data = new Uint8Array(testCase.wkb);
      const offsets = new Uint32Array([0, data.length]);
      const polygonData = makeData({
        type: new Binary(),
        data: data,
        valueOffsets: offsets,
      });
      const parsedPolygonData = parseWkb(polygonData, WKBType.Polygon, 2);
      expect(isPolygonData(parsedPolygonData)).toBe(true);
    }
  });
});
