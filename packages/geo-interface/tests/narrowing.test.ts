import { describe, expectTypeOf, it } from "vitest";
import type {
  Dimension,
  GeometryCollectionInterface,
  GeometryInterface,
  LineStringInterface,
  MultiLineStringInterface,
  MultiPointInterface,
  MultiPolygonInterface,
  PointInterface,
  PolygonInterface,
} from "../src/index.js";
import { sizeOf } from "../src/index.js";

describe("Geometry narrowing", () => {
  it("narrows to Point on 'Point'", () => {
    const g = {} as GeometryInterface;
    if (g.geometryType === "Point") {
      expectTypeOf(g).toMatchTypeOf<PointInterface>();
    }
  });

  it("narrows to LineString on 'LineString'", () => {
    const g = {} as GeometryInterface;
    if (g.geometryType === "LineString") {
      expectTypeOf(g).toMatchTypeOf<LineStringInterface>();
    }
  });

  it("narrows to Polygon on 'Polygon'", () => {
    const g = {} as GeometryInterface;
    if (g.geometryType === "Polygon") {
      expectTypeOf(g).toMatchTypeOf<PolygonInterface>();
    }
  });

  it("narrows to MultiPoint on 'MultiPoint'", () => {
    const g = {} as GeometryInterface;
    if (g.geometryType === "MultiPoint") {
      expectTypeOf(g).toMatchTypeOf<MultiPointInterface>();
    }
  });

  it("narrows to MultiLineString on 'MultiLineString'", () => {
    const g = {} as GeometryInterface;
    if (g.geometryType === "MultiLineString") {
      expectTypeOf(g).toMatchTypeOf<MultiLineStringInterface>();
    }
  });

  it("narrows to MultiPolygon on 'MultiPolygon'", () => {
    const g = {} as GeometryInterface;
    if (g.geometryType === "MultiPolygon") {
      expectTypeOf(g).toMatchTypeOf<MultiPolygonInterface>();
    }
  });

  it("narrows to GeometryCollection on 'GeometryCollection'", () => {
    const g = {} as GeometryInterface;
    if (g.geometryType === "GeometryCollection") {
      expectTypeOf(g).toMatchTypeOf<GeometryCollectionInterface>();
    }
  });
});

describe("Geometry union membership", () => {
  it("each concrete  is assignable to Geometry", () => {
    expectTypeOf<PointInterface>().toMatchTypeOf<GeometryInterface>();
    expectTypeOf<LineStringInterface>().toMatchTypeOf<GeometryInterface>();
    expectTypeOf<PolygonInterface>().toMatchTypeOf<GeometryInterface>();
    expectTypeOf<MultiPointInterface>().toMatchTypeOf<GeometryInterface>();
    expectTypeOf<MultiLineStringInterface>().toMatchTypeOf<GeometryInterface>();
    expectTypeOf<MultiPolygonInterface>().toMatchTypeOf<GeometryInterface>();
    expectTypeOf<GeometryCollectionInterface>().toMatchTypeOf<GeometryInterface>();
  });
});

describe("Dimension and sizeOf type contract", () => {
  it("sizeOf accepts a Dimension literal", () => {
    expectTypeOf(sizeOf).parameter(0).toEqualTypeOf<Dimension>();
    expectTypeOf(sizeOf).returns.toBeNumber();
  });
});
