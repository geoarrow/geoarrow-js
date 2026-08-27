import {
  RefGeometryCollection,
  RefLineString,
  RefMultiLineString,
  RefMultiPoint,
  RefMultiPolygon,
  RefPoint,
  RefPolygon,
} from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import {
  iterCoords,
  iterGeometries,
  iterInteriors,
  iterLineStrings,
  iterPoints,
  iterPolygons,
} from "../src/index.js";

describe("iterCoords", () => {
  it("yields coords in order", () => {
    const ls = new RefLineString(
      [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
      "XY",
    );
    const xs = [...iterCoords(ls)].map((c) => c.x());
    expect(xs).toEqual([1, 3, 5]);
  });

  it("yields nothing for empty line string", () => {
    const ls = new RefLineString([], "XY");
    expect([...iterCoords(ls)]).toHaveLength(0);
  });
});

describe("iterInteriors", () => {
  it("yields only interior rings, not the exterior", () => {
    const shell = new RefLineString(
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
      "XY",
    );
    const hole1 = new RefLineString(
      [
        [1, 1],
        [2, 1],
        [2, 2],
        [1, 2],
        [1, 1],
      ],
      "XY",
    );
    const hole2 = new RefLineString(
      [
        [5, 5],
        [6, 5],
        [6, 6],
        [5, 6],
        [5, 5],
      ],
      "XY",
    );
    const p = new RefPolygon(shell, [hole1, hole2], "XY");
    const firstCoords = [...iterInteriors(p)].map((ring) => ring.coord(0).x());
    expect(firstCoords).toEqual([1, 5]);
  });
});

describe("iterPoints", () => {
  it("yields all points in a multipoint", () => {
    const mp = new RefMultiPoint(
      [new RefPoint([1, 1], "XY"), new RefPoint([2, 2], "XY")],
      "XY",
    );
    const xs = [...iterPoints(mp)].map((p) => p.coord()!.x());
    expect(xs).toEqual([1, 2]);
  });
});

describe("iterLineStrings", () => {
  it("yields all line strings in a multilinestring", () => {
    const mls = new RefMultiLineString(
      [
        new RefLineString(
          [
            [0, 0],
            [1, 1],
          ],
          "XY",
        ),
        new RefLineString(
          [
            [2, 2],
            [3, 3],
            [4, 4],
          ],
          "XY",
        ),
      ],
      "XY",
    );
    const counts = [...iterLineStrings(mls)].map((ls) => ls.numCoords());
    expect(counts).toEqual([2, 3]);
  });
});

describe("iterPolygons", () => {
  it("yields all polygons in a multipolygon", () => {
    const a = new RefPolygon(
      new RefLineString(
        [
          [0, 0],
          [1, 0],
          [0, 1],
          [0, 0],
        ],
        "XY",
      ),
      [],
      "XY",
    );
    const b = new RefPolygon(
      new RefLineString(
        [
          [10, 10],
          [20, 10],
          [20, 20],
          [10, 20],
          [10, 10],
        ],
        "XY",
      ),
      [],
      "XY",
    );
    const mp = new RefMultiPolygon([a, b], "XY");
    const counts = [...iterPolygons(mp)].map((p) => p.exterior()!.numCoords());
    expect(counts).toEqual([4, 5]);
  });
});

describe("iterGeometries", () => {
  it("yields heterogeneous children from a collection", () => {
    const gc = new RefGeometryCollection(
      [
        new RefPoint([0, 0], "XY"),
        new RefLineString(
          [
            [1, 1],
            [2, 2],
          ],
          "XY",
        ),
      ],
      "XY",
    );
    const types = [...iterGeometries(gc)].map((g) => g.geometryType);
    expect(types).toEqual(["Point", "LineString"]);
  });
});
