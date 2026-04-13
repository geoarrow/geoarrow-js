import { describe, expectTypeOf, it } from "vitest";
import type {
  Dimension,
  GeometryTrait,
  LineStringTrait,
  MultiLineStringTrait,
  MultiPointTrait,
  MultiPolygonTrait,
  PointTrait,
  PolygonTrait,
  GeometryCollectionTrait,
} from "../../src/geo-interface/index.js";
import { sizeOf } from "../../src/geo-interface/index.js";

describe("GeometryTrait narrowing", () => {
  it("narrows to PointTrait on 'Point'", () => {
    const g = {} as GeometryTrait;
    if (g.geometryType === "Point") {
      expectTypeOf(g).toMatchTypeOf<PointTrait>();
    }
  });

  it("narrows to LineStringTrait on 'LineString'", () => {
    const g = {} as GeometryTrait;
    if (g.geometryType === "LineString") {
      expectTypeOf(g).toMatchTypeOf<LineStringTrait>();
    }
  });

  it("narrows to PolygonTrait on 'Polygon'", () => {
    const g = {} as GeometryTrait;
    if (g.geometryType === "Polygon") {
      expectTypeOf(g).toMatchTypeOf<PolygonTrait>();
    }
  });

  it("narrows to MultiPointTrait on 'MultiPoint'", () => {
    const g = {} as GeometryTrait;
    if (g.geometryType === "MultiPoint") {
      expectTypeOf(g).toMatchTypeOf<MultiPointTrait>();
    }
  });

  it("narrows to MultiLineStringTrait on 'MultiLineString'", () => {
    const g = {} as GeometryTrait;
    if (g.geometryType === "MultiLineString") {
      expectTypeOf(g).toMatchTypeOf<MultiLineStringTrait>();
    }
  });

  it("narrows to MultiPolygonTrait on 'MultiPolygon'", () => {
    const g = {} as GeometryTrait;
    if (g.geometryType === "MultiPolygon") {
      expectTypeOf(g).toMatchTypeOf<MultiPolygonTrait>();
    }
  });

  it("narrows to GeometryCollectionTrait on 'GeometryCollection'", () => {
    const g = {} as GeometryTrait;
    if (g.geometryType === "GeometryCollection") {
      expectTypeOf(g).toMatchTypeOf<GeometryCollectionTrait>();
    }
  });
});

describe("GeometryTrait union membership", () => {
  it("each concrete trait is assignable to GeometryTrait", () => {
    expectTypeOf<PointTrait>().toMatchTypeOf<GeometryTrait>();
    expectTypeOf<LineStringTrait>().toMatchTypeOf<GeometryTrait>();
    expectTypeOf<PolygonTrait>().toMatchTypeOf<GeometryTrait>();
    expectTypeOf<MultiPointTrait>().toMatchTypeOf<GeometryTrait>();
    expectTypeOf<MultiLineStringTrait>().toMatchTypeOf<GeometryTrait>();
    expectTypeOf<MultiPolygonTrait>().toMatchTypeOf<GeometryTrait>();
    expectTypeOf<GeometryCollectionTrait>().toMatchTypeOf<GeometryTrait>();
  });
});

describe("Dimension and sizeOf type contract", () => {
  it("sizeOf accepts a Dimension literal", () => {
    expectTypeOf(sizeOf).parameter(0).toEqualTypeOf<Dimension>();
    expectTypeOf(sizeOf).returns.toBeNumber();
  });
});
