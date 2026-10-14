# WKB → GeoArrow parser: design

- **Status:** Draft
- **Date:** 2026-04-12
- **Scope:** Full roadmap (PRs 1–4). PR 1 (`src/geo-interface/`) is specified in detail; PRs 2–4 are sketched and will each get their own spec before implementation.

## Motivation

DuckDB has become the standard for client-side geometry operations in the browser. A typical user flow is:

1. Run a DuckDB query with the spatial extension.
2. Stream the result over Arrow IPC, batch by batch.
3. Render the result with deck.gl via [@geoarrow/deck.gl-layers](https://github.com/geoarrow/deck.gl-layers).

Step 3 requires the geometry column to be in native GeoArrow format (`geoarrow.point`, `geoarrow.linestring`, etc. — Arrow types with a GeoArrow extension name). But DuckDB exports geometry columns as WKB (`BLOB`). To close that gap today, users must either run WKB → GeoArrow server-side, change their query to explicitly cast to one of DuckDB's native `POINT_2D`/`LINESTRING_2D`/etc. types, or depend on a third-party fork. None of these are satisfying.

**Goal:** the user runs any normal DuckDB query, streams Arrow batches, and deck.gl renders the result — with geoarrow-js parsing WKB columns in between. No query changes required.

This spec describes the parser. Observable notebook examples, POINT_2D native-type rendering, and the broader DuckDB integration story are separate tracks.

## Why this is not one big PR

Past attempts at a WKB parser in geoarrow-js hit review friction because the work was bundled. This spec splits it into four self-contained PRs, each independently reviewable and independently useful:

| PR | Scope | Depends on |
|----|-------|------------|
| **PR 1** | `src/geo-interface/` — TypeScript port of the Rust [`geo-traits`](https://github.com/georust/geo/tree/main/geo-traits) crate. Interfaces only, no implementations. | — |
| **PR 2** | Capacity structs + geometry builders (6 homogeneous types). Consume PR 1 interfaces as input. | PR 1 |
| **PR 3** | WKB view types (lazy, zero-copy over `DataView`) + `WkbParser` stream class. Views implement PR 1 interfaces. | PR 1, PR 2 |
| **PR 4** | `geoarrow.geometry` Arrow extension type + `GeometryBuilder` + deck.gl-layers dispatch path for heterogeneous columns. | PR 1, PR 2 |

PR 1 is the foundation for everything that follows and for any future non-WKB input source (GeoJSON → GeoArrow, raw-coord → GeoArrow, Arrow IPC recovery, etc.). The rest of this document specifies PR 1 in full.

## PR 1 — `src/geo-interface/` (detailed)

### Why this layer exists

The Rust `geoarrow-array` crate consumes geometries through the `geo-traits` crate's trait interfaces. `georust/wkb` implements those traits over raw WKB byte slices, zero-copy. `geo` implements them over its own in-memory types. A builder (e.g. `LineStringBuilder`) accepts any `impl LineStringTrait<T = f64>` and doesn't care where the coordinates came from.

We want the same decoupling in TypeScript:
- Builders accept geometries through a small interface contract.
- WKB view types (PR 3) implement that contract lazily over a `DataView`, never materializing coordinates into a `Float64Array` before the builder consumes them.
- Test fixtures, GeoJSON adapters, and any future input source implement the same contract.

PR 1 ships only the interfaces, the `Dimension` type, iterator helpers, and test fixtures. No parsing, no builders, no Arrow code. It is pure type definitions plus a handful of generator functions.

### Directory layout

```
src/geo-interface/
├── index.ts     // Dimension, sizeOf(), all trait interfaces, GeometryTrait union
└── iter.ts      // iterator helper generator functions
```

Two files. Interfaces cross-reference each other tightly (`LineStringTrait` returns `CoordTrait`, `PolygonTrait` returns `LineStringTrait`, etc.) and are small individually, so consolidation beats per-file modules. `iter.ts` is separate because it's a distinct concern — helpers for consumers, not part of the interface contract — and consumers who only want types shouldn't pull in the iterator code.

### Dimension

```ts
// src/geo-interface/index.ts
export type Dimension = "XY" | "XYZ";

export function sizeOf(dim: Dimension): number {
  switch (dim) {
    case "XY":  return 2;
    case "XYZ": return 3;
  }
}
```

String literal union, not a TS enum. Zero runtime cost, self-describing at runtime, JSON-serializable as-is, idiomatic modern TypeScript. `Dimension` is singular (TS convention).

**M1 supports XY and XYZ only.** XYM and XYZM are deferred. Extending the union later is non-breaking: `type Dimension = "XY" | "XYZ" | "XYM" | "XYZM"` will cause any exhaustive `switch (dim)` to fail type-checking until it handles the new cases, which is the behavior we want.

No `Unknown` variant (the Rust trait has one; we don't need it).

### Interfaces

All seven interfaces live in `index.ts`. They are flat — no base interface, no `extends` chain. Instead, a `GeometryTrait` union type covers "any geometry" and is narrowable by the `geometryType` discriminator.

```ts
export interface CoordTrait {
  dim(): Dimension;
  x(): number;
  y(): number;
  nth(n: number): number;  // 0=x, 1=y, 2=z (XYZ only)
}

export interface PointTrait {
  readonly geometryType: "Point";
  dim(): Dimension;
  coord(): CoordTrait | null;  // null for an empty point
}

export interface LineStringTrait {
  readonly geometryType: "LineString";
  dim(): Dimension;
  numCoords(): number;
  coord(i: number): CoordTrait;
}

export interface PolygonTrait {
  readonly geometryType: "Polygon";
  dim(): Dimension;
  numInteriors(): number;
  exterior(): LineStringTrait | null;  // null for an empty polygon
  interior(i: number): LineStringTrait;
}

export interface MultiPointTrait {
  readonly geometryType: "MultiPoint";
  dim(): Dimension;
  numPoints(): number;
  point(i: number): PointTrait;
}

export interface MultiLineStringTrait {
  readonly geometryType: "MultiLineString";
  dim(): Dimension;
  numLineStrings(): number;
  lineString(i: number): LineStringTrait;
}

export interface MultiPolygonTrait {
  readonly geometryType: "MultiPolygon";
  dim(): Dimension;
  numPolygons(): number;
  polygon(i: number): PolygonTrait;
}

export interface GeometryCollectionTrait {
  readonly geometryType: "GeometryCollection";
  dim(): Dimension;
  numGeometries(): number;
  geometry(i: number): GeometryTrait;
}

export type GeometryTrait =
  | PointTrait
  | LineStringTrait
  | PolygonTrait
  | MultiPointTrait
  | MultiLineStringTrait
  | MultiPolygonTrait
  | GeometryCollectionTrait;
```

### Design decisions and trade-offs

**Flat interfaces, no base `GeometryTrait` interface.** In Rust, per-geometry traits extend `GeometryTrait` because Rust generic functions need a trait bound and the `as_type()` dispatcher is defined on the base. Neither concern applies in TypeScript. Structural narrowing by discriminator works directly on a union type; `switch (g.geometryType)` narrows to the specific interface automatically. Using a union type gives us the shared contract (TS enforces `dim()` and `geometryType` exist across all members when called on the union) **and** automatic narrowing in one. Each interface redeclares `dim()` and `readonly geometryType: "..."` — a few lines of duplication in exchange for a much simpler type graph.

**Method-based interfaces, not data-based.** Every accessor is a method (`numCoords()`, `coord(i)`) rather than a data property (`numCoords: number`, `coords: Float64Array`). This is what allows PR 3's WKB view types to be lazy: `coord(i)` reads the underlying `DataView` at call time instead of materializing a `Float64Array` upfront. For an in-memory reference implementation, the methods are one-line thunks. V8 monomorphizes class method call sites and inlines them — there is no measurable overhead in practice, and class methods are in fact faster than property-valued function callbacks (which would close over `this` and allocate per-instance).

**On per-coord allocation and dispatch overhead.** Upstream geoarrow contributors pointed out that looping over coordinates via `coord(i).x()` / `.nth(n)` pays a dimension (and, for WKB-backed views, endian) branch per ordinate plus an object allocation per `coord(i)` call. C/C++ hoist that cost via `GeoArrowGeometryNode` + `VisitVertices`; Rust hoists it via a specialized `impl Iterator`. The question is whether to add a similar hot-path method to the TS interface. For M1 the answer is **no**: the only in-scope consumer is WKB → GeoArrow, where the intrinsic cost of `DataView.getFloat64` (historically 3–5× slower than typed-array access in V8) dominates the `Coord`-allocation and dispatch delta entirely. On browser-typical payloads (100k–1M vertices) the interface overhead is a small slice of parse+build time, and even smaller once the `DataView` tax is subtracted. Ship the accessor-style interface; once PR 2 and PR 3 land, run a real WKB bench and only add a write-oriented hot-path method if the per-coord loop is ≥20% of end-to-end parse+build time on a 10M-vertex workload.

**Single accessor, no `coord_unchecked` variant.** Rust's `geo-traits` ships both `coord(i) -> Option<Coord>` (safe) and `coord_unchecked(i) -> Coord` (unsafe) because Rust undefined behavior is real. TypeScript has no UB, so one method is enough. The contract is: callers must respect `numCoords()` / `numPoints()` / etc. before calling `coord(i)` / `point(i)`. Out-of-bounds access is a caller bug, not a defined behavior of the interface.

**Only `PointTrait.coord()` and `PolygonTrait.exterior()` return `| null`.** These are the only cases where "empty" is a distinct state from "has zero elements". Empty points have no coordinate at all (not a `(0, 0)` coordinate). Empty polygons have no exterior ring. Every other trait's empty state is encoded as `numX() === 0`.

**No generic type parameter for the coordinate scalar.** Rust parameterizes on `T: CoordNum`. In TypeScript, everything is `number` (float64), so we fix it in the interface. This removes a lot of type parameter noise without losing real functionality.

**No `LineTrait`, `TriangleTrait`, `RectTrait`.** WKB doesn't have these and neither does `geoarrow.geometry`. If a future caller needs them, adding them is non-breaking.

**Naming convention.** Match Rust `geo-traits` names verbatim, except camelCase:
- Count methods: `numCoords`, `numPoints`, `numInteriors`, `numLineStrings`, `numPolygons`, `numGeometries`.
- Single-item accessors: `coord(i)`, `point(i)`, `interior(i)`, `lineString(i)`, `polygon(i)`, `geometry(i)`.
- Polygon accessors: `exterior()` (always singular, returns `LineStringTrait | null`), `interior(i)` + `numInteriors()` for the holes.

### Iterator helpers

Rust `geo-traits` provides default iterator methods (`coords()`, `points()`, `interiors()`, ...) built from the fundamental count/index methods. We don't put these on the interface because every implementor would have to write (or mixin) the iterator body; the reference implementation classes would get much longer. Instead, iteration is a set of standalone helper functions:

```ts
// src/geo-interface/iter.ts
import type {
  CoordTrait, LineStringTrait, PolygonTrait, MultiPointTrait,
  MultiLineStringTrait, MultiPolygonTrait, GeometryCollectionTrait,
  PointTrait, GeometryTrait,
} from "./index";

export function* iterCoords(ls: LineStringTrait): IterableIterator<CoordTrait> {
  const n = ls.numCoords();
  for (let i = 0; i < n; i++) yield ls.coord(i);
}

export function* iterInteriors(p: PolygonTrait): IterableIterator<LineStringTrait> {
  const n = p.numInteriors();
  for (let i = 0; i < n; i++) yield p.interior(i);
}

export function* iterPoints(mp: MultiPointTrait): IterableIterator<PointTrait> {
  const n = mp.numPoints();
  for (let i = 0; i < n; i++) yield mp.point(i);
}

export function* iterLineStrings(
  mls: MultiLineStringTrait,
): IterableIterator<LineStringTrait> {
  const n = mls.numLineStrings();
  for (let i = 0; i < n; i++) yield mls.lineString(i);
}

export function* iterPolygons(mp: MultiPolygonTrait): IterableIterator<PolygonTrait> {
  const n = mp.numPolygons();
  for (let i = 0; i < n; i++) yield mp.polygon(i);
}

export function* iterGeometries(
  gc: GeometryCollectionTrait,
): IterableIterator<GeometryTrait> {
  const n = gc.numGeometries();
  for (let i = 0; i < n; i++) yield gc.geometry(i);
}
```

Call site ergonomics: `for (const c of iterCoords(ls))` instead of `for (const c of ls.coords())`. Slightly more verbose, but strictly optional and the interface stays minimal.

### Testing

PR 1 has no runtime code to test beyond `sizeOf(dim)` and the iterator helpers. The interfaces themselves need a usage story. Ship reference implementations as test fixtures.

```
test/geo-interface/
├── fixtures.ts        // RefPoint, RefLineString, RefPolygon, ... reference classes
├── iter.test.ts       // runtime tests for iterCoords, iterInteriors, etc.
└── narrowing.test.ts  // type-level assertions that switch (g.geometryType) narrows
```

**Reference classes** (`test/geo-interface/fixtures.ts`) — simple classes implementing each interface from plain JS arrays. Example:

```ts
export class RefLineString implements LineStringTrait {
  readonly geometryType = "LineString" as const;
  constructor(
    private readonly _coords: number[][],
    private readonly _dim: Dimension,
  ) {}
  dim() { return this._dim; }
  numCoords() { return this._coords.length; }
  coord(i: number): CoordTrait { return new RefCoord(this._coords[i], this._dim); }
}
```

These classes have three purposes:
1. Drive runtime tests for the iterator helpers in PR 1.
2. Serve as the primary test fixtures for PR 2 (capacity + builders) — tests push reference instances through builders and assert on the resulting Arrow `Data`.
3. Act as the canonical "how to implement these interfaces" example for external users.

**Runtime tests** (`iter.test.ts`) — drive each iterator helper against reference fixtures. Assert coordinate order, element counts, that empty cases iterate zero times.

**Type-level tests** (`narrowing.test.ts`) — use vitest's `expectTypeOf` (or inline `ts-expect-error` probes) to verify:
- `switch (g.geometryType)` narrows a `GeometryTrait` to the specific interface.
- Every specific trait is assignable to `GeometryTrait`.
- `sizeOf("XY")` type-checks; `sizeOf("BOGUS")` does not.

### Out of scope for PR 1

- Any actual parsing (no WKB, GeoJSON, WKT).
- Any Arrow code. `src/geo-interface/` does not import `apache-arrow`.
- Builders, capacity structs.
- XYM, XYZM dimension support.
- `LineTrait`, `TriangleTrait`, `RectTrait`.
- `Dimension.Unknown`.
- `GeometryCollection` is defined at the interface level but will not be consumed by PR 2 builders (collections map to `geoarrow.geometry` in PR 4).

---

## PR 2 — Capacity + builders (sketch)

Port the six homogeneous builders from `rust/geoarrow-array/src/builder/` (Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon). Each owns a `CoordBufferBuilder` plus 0–3 `Int32Array` offset buffers plus a validity bitmap. Each has `pushPoint` / `pushLineString` / etc. typed push methods plus a permissive `pushGeometry(g: GeometryTrait)` that narrows on the discriminant. Each pairs with a `Capacity` discriminated-union type and an `addGeometryCapacity()` walk that mirrors the push path but only counts.

JavaScript has no growable `TypedArray` in the standard library. The builder design handles this by taking an exact capacity up front (from the capacity walk) and allocating once. This matches the Rust two-pass pattern (`Capacity::from_geometries(geoms)` → `Builder::with_capacity(cap)` → `for g in geoms { builder.push_geometry(g) }`), which is the idiomatic path in geoarrow-rs anyway. The Rust builders also support starting from zero capacity and growing, but we skip that path in M1; the two-pass pattern is the primary API.

`CoordBufferBuilder` for M1 is interleaved only (`Float64Array`, XY packed as `[x0, y0, x1, y1, ...]` or XYZ as `[x0, y0, z0, x1, y1, z1, ...]`). Separated-coordinate output is a follow-up.

Tests: reuse PR 1's reference classes. Push reference geometries through builders, assert the output `PointData` / `LineStringData` / etc. match handcrafted Arrow `Data` built via `makeData`.

This PR will get its own spec before implementation.

## PR 3 — WKB view types + `WkbParser` stream class (sketch)

Implement the PR 1 interfaces over a `DataView` for each of the six WKB geometry types (Point / LineString / Polygon / MultiPoint / MultiLineString / MultiPolygon). Views are lazy and zero-copy: the `WkbLineStringView` holds a `{view, byteOffset, dim, byteOrder}` and parses coordinates on demand from the underlying buffer. No allocation per-geometry beyond the view wrapper object itself.

Layer a **stream-aware** `WkbParser` class on top. The parser is stateful and determines the output schema once — either explicitly at construction or by probing the first batch — then locks it. All subsequent batches are parsed against that locked schema, and any incompatibility (e.g., a MultiPoint in a stream locked to Point, or an XYZ geometry in a stream locked to XY) throws a clear error on the offending batch.

Why the stream class matters: if the API were a stateless `parseWkb(data)` function run per-batch independently, batch N might produce `PointData` while batch N+1 produces `MultiPointData` (because batch N happened to contain only single Points), and the resulting stream would have inconsistent schemas that can't be assembled into a Table or passed to deck.gl-layers.

API sketch:

```ts
class WkbParser {
  // Construct with an explicit schema (when the caller knows it)
  static withSchema(options: {
    type: "Point" | "LineString" | "Polygon" | "MultiPoint" | "MultiLineString" | "MultiPolygon";
    dimension: Dimension;
    coordType?: "interleaved";  // M1: interleaved only
    promoteToMulti?: boolean;
  }): WkbParser;

  // Construct by probing the first batch; returns the parser + the first batch's parsed data
  static fromFirstBatch(
    data: arrow.Data<arrow.Binary>,
    options?: { promoteToMulti?: boolean; coordType?: "interleaved" },
  ): { parser: WkbParser; first: PointData | LineStringData | /* ... */ };

  // Parse subsequent batches against the locked schema
  parseBatch(data: arrow.Data<arrow.Binary>): PointData | LineStringData | /* ... */;
}
```

The parser operates on `arrow.Data<arrow.Binary>` (not `Vector`, not `Table`) because deck.gl-layers consumes one `RecordBatch` per layer and the natural unit is the binary column within a batch. A convenience wrapper `parseWkbColumn(batch: RecordBatch, columnName: string): RecordBatch` can live on top of the primitive.

Algorithm per batch: two-pass scan-then-fill. The first walk creates a WKB view per non-null row and feeds each one to the builder's `addGeometryCapacity()`, which counts coords and offsets without reading coordinate bytes. The second walk re-creates the views and calls `pushGeometry()`, which reads coordinates out of the `DataView` and writes them into the pre-sized buffers. Exact allocation, zero reallocation.

`promoteToMulti` handling: if true, the parser constructs a `MultiPointBuilder` / `MultiLineStringBuilder` / `MultiPolygonBuilder` even when the first geometry is a single-part type. Subsequent single-part WKB geometries are wrapped as length-1 multis on push.

ISO WKB, EWKB (PostGIS dialect with optional SRID and Z/M flag bits), little-endian and big-endian per-geometry byte order are all supported. SRID values from EWKB are discarded — CRS lives in Arrow field metadata per the GeoArrow spec, not inline in geometry bytes. No WKB writer.

This PR will get its own spec before implementation.

## PR 4 — `geoarrow.geometry` type + deck.gl-layers dispatch (sketch)

DuckDB's generic `GEOMETRY` column can contain heterogeneous geometry types and dimensions. PR 3 handles the homogeneous case (with optional promotion to Multi). PR 4 handles the truly heterogeneous case.

Scope:
1. Add `geoarrow.geometry` as a first-class type in geoarrow-js: new `GeometryData` and `GeometryVector` wrappers around Arrow `DenseUnion` with the type-code layout specified in the [GeoArrow spec](https://github.com/geoarrow/geoarrow-spec/blob/main/format.md) (base XY = 1–7, Z = 11–17, M = 21–27, ZM = 31–37). Add type guards, tests.
2. Add a `GeometryBuilder` that accepts any `GeometryTrait` via `pushGeometry()` and routes to the appropriate per-type, per-dimension child builder, then assembles a `DenseUnion` on finish.
3. Teach `WkbParser` to target `GeometryBuilder` when configured for heterogeneous output (e.g., `WkbParser.withSchema({ type: "Geometry", ... })` or automatic fallback on mismatched first-pass probe).
4. Add a rendering dispatch path to deck.gl-layers: for a `geoarrow.geometry` column, split the `DenseUnion` into per-type child batches and instantiate one sub-layer per child type.

This PR will get its own spec before implementation.

## Out of scope for the whole roadmap

- **WKB writer.** No `toWkb()`. We parse WKB in, we never emit it. If a caller needs WKB output, they can use Arrow serialization of a GeoArrow column and parse it on the other end, or reach for another library.
- **GeoJSON parser.** PR 1's interfaces make this straightforward to add later as a sibling to PR 3, but it's not part of this roadmap.
- **WKT parser.** Same.
- **XYM / XYZM dimensions.** M1 supports XY and XYZ. Extending to XYM and XYZM is a follow-up; the `Dimension` union and capacity/builder machinery are designed to accept it non-breakingly.
- **`LineTrait`, `TriangleTrait`, `RectTrait`.** Not in WKB, not in `geoarrow.geometry`.
- **Separated coordinate layout.** Builders produce interleaved coordinates only in M1.
- **`CoordBufferBuilder` growable path.** We take exact capacity up front from a two-pass scan; we do not implement Rust's amortized-growth path.

## Open questions

None at time of writing. All locked-in decisions are captured in the "Design decisions" section above.
