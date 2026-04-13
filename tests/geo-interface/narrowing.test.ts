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
} from "../../src/geo-interface/index.js";
import { sizeOf } from "../../src/geo-interface/index.js";

describe("GeometryInterface narrowing", () => {
	it("narrows to PointInterface on 'Point'", () => {
		const g = {} as GeometryInterface;
		if (g.geometryType === "Point") {
			expectTypeOf(g).toMatchTypeOf<PointInterface>();
		}
	});

	it("narrows to LineStringInterface on 'LineString'", () => {
		const g = {} as GeometryInterface;
		if (g.geometryType === "LineString") {
			expectTypeOf(g).toMatchTypeOf<LineStringInterface>();
		}
	});

	it("narrows to PolygonInterface on 'Polygon'", () => {
		const g = {} as GeometryInterface;
		if (g.geometryType === "Polygon") {
			expectTypeOf(g).toMatchTypeOf<PolygonInterface>();
		}
	});

	it("narrows to MultiPointInterface on 'MultiPoint'", () => {
		const g = {} as GeometryInterface;
		if (g.geometryType === "MultiPoint") {
			expectTypeOf(g).toMatchTypeOf<MultiPointInterface>();
		}
	});

	it("narrows to MultiLineStringInterface on 'MultiLineString'", () => {
		const g = {} as GeometryInterface;
		if (g.geometryType === "MultiLineString") {
			expectTypeOf(g).toMatchTypeOf<MultiLineStringInterface>();
		}
	});

	it("narrows to MultiPolygonInterface on 'MultiPolygon'", () => {
		const g = {} as GeometryInterface;
		if (g.geometryType === "MultiPolygon") {
			expectTypeOf(g).toMatchTypeOf<MultiPolygonInterface>();
		}
	});

	it("narrows to GeometryCollectionInterface on 'GeometryCollection'", () => {
		const g = {} as GeometryInterface;
		if (g.geometryType === "GeometryCollection") {
			expectTypeOf(g).toMatchTypeOf<GeometryCollectionInterface>();
		}
	});
});

describe("GeometryInterface union membership", () => {
	it("each concrete Interface is assignable to GeometryInterface", () => {
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
