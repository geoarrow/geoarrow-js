import { describe, expectTypeOf, it } from "vitest";
import type {
  Dimension,
  Geometry,
  GeometryCollection,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
} from "../src/index.js";
import { sizeOf } from "../src/index.js";

describe("Geometry narrowing", () => {
  it("narrows to Point on 'Point'", () => {
    const g = {} as Geometry;
    if (g.geometryType === "Point") {
      expectTypeOf(g).toMatchTypeOf<Point>();
    }
  });

  it("narrows to LineString on 'LineString'", () => {
    const g = {} as Geometry;
    if (g.geometryType === "LineString") {
      expectTypeOf(g).toMatchTypeOf<LineString>();
    }
  });

  it("narrows to Polygon on 'Polygon'", () => {
    const g = {} as Geometry;
    if (g.geometryType === "Polygon") {
      expectTypeOf(g).toMatchTypeOf<Polygon>();
    }
  });

  it("narrows to MultiPoint on 'MultiPoint'", () => {
    const g = {} as Geometry;
    if (g.geometryType === "MultiPoint") {
      expectTypeOf(g).toMatchTypeOf<MultiPoint>();
    }
  });

  it("narrows to MultiLineString on 'MultiLineString'", () => {
    const g = {} as Geometry;
    if (g.geometryType === "MultiLineString") {
      expectTypeOf(g).toMatchTypeOf<MultiLineString>();
    }
  });

  it("narrows to MultiPolygon on 'MultiPolygon'", () => {
    const g = {} as Geometry;
    if (g.geometryType === "MultiPolygon") {
      expectTypeOf(g).toMatchTypeOf<MultiPolygon>();
    }
  });

  it("narrows to GeometryCollection on 'GeometryCollection'", () => {
    const g = {} as Geometry;
    if (g.geometryType === "GeometryCollection") {
      expectTypeOf(g).toMatchTypeOf<GeometryCollection>();
    }
  });
});

describe("Geometry union membership", () => {
  it("each concrete  is assignable to Geometry", () => {
    expectTypeOf<Point>().toMatchTypeOf<Geometry>();
    expectTypeOf<LineString>().toMatchTypeOf<Geometry>();
    expectTypeOf<Polygon>().toMatchTypeOf<Geometry>();
    expectTypeOf<MultiPoint>().toMatchTypeOf<Geometry>();
    expectTypeOf<MultiLineString>().toMatchTypeOf<Geometry>();
    expectTypeOf<MultiPolygon>().toMatchTypeOf<Geometry>();
    expectTypeOf<GeometryCollection>().toMatchTypeOf<Geometry>();
  });
});

describe("Dimension and sizeOf type contract", () => {
  it("sizeOf accepts a Dimension literal", () => {
    expectTypeOf(sizeOf).parameter(0).toEqualTypeOf<Dimension>();
    expectTypeOf(sizeOf).returns.toBeNumber();
  });
});
