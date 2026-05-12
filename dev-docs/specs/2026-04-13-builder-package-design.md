# `@geoarrow/builder` package: design

- **Status:** Draft
- **Date:** 2026-04-13
- **Scope:** PR 2 of the WKB parser roadmap. Defines the `@geoarrow/builder` package: capacity classes, internal helpers, and six homogeneous geometry builders.
- **Supersedes:** the PR 2 sketch in [`2026-04-12-wkb-parser-design.md`](2026-04-12-wkb-parser-design.md). Key revisions captured in this spec are (1) the repo is now a pnpm monorepo, so builders live in their own package; (2) structural interface names in `@geoarrow/geo-interface` will use the `Interface` suffix (`PointInterface`, `LineStringInterface`, etc.), not `Trait` and not the bare names PR 1 actually shipped with — PR 2 bundles a rename prep step; (3) there is no `@geoarrow/geometry` package — `geoarrow.geometry` support is additive to `@geoarrow/schema` and `@geoarrow/builder` in a later PR; (4) this revision reconciles the spec with the actual PR A reshape outcome: builder uses `tsc --build` + ESM-only (not `tsup` dual bundles), and shared test fixtures live in a new private workspace package `@geoarrow/test-fixtures` (not a subpath export on `@geoarrow/geo-interface`).

## Motivation

`@geoarrow/builder` is the second link in the WKB-to-GeoArrow chain. PR 1 shipped `@geoarrow/geo-interface`, the TypeScript port of `geo-traits` — an interface contract describing "any geometry" without implementation. PR 2 ships the consumers: classes that accept geometries through that contract and emit Arrow `Data` in GeoArrow layout.

The two-pass design (walk to count, then push to populate) is the only public allocation path. JavaScript has no growable `TypedArray`, so the builders must know the exact coord count, offset count, and geometry count before allocating a single byte. The capacity classes own the counting pass; the builders own the populating pass. They mirror each other and share every accept-set decision.

This PR has no consumers of its own. It exists to be consumed by PR 3 (`@geoarrow/wkb`) and PR 4 (`geoarrow.geometry` support), plus any future non-WKB input source (GeoJSON, WKT, Arrow IPC recovery) that can adapt to the `@geoarrow/geo-interface` contract.

## Prerequisites

PR A (the repo reshape into a pnpm monorepo) has landed. When PR 2 begins, the working tree contains these four packages:

- `packages/geo-interface/` — `@geoarrow/geo-interface`. The PR 1 interface contract (`CoordInterface`, `PointInterface`, `LineStringInterface`, `PolygonInterface`, `MultiPointInterface`, `MultiLineStringInterface`, `MultiPolygonInterface`, `GeometryInterface`, `Dimension`, `sizeOf`). Reference fixture classes currently live at [packages/geo-interface/tests/fixtures.ts](../../packages/geo-interface/tests/fixtures.ts); PR 2 moves them out to `@geoarrow/test-fixtures` (see below).
- `packages/schema/` — `@geoarrow/schema`. Exports the GeoArrow type aliases (`Point`, `LineString`, `Polygon`, `MultiPoint`, `MultiLineString`, `MultiPolygon`), `Data<T>` aliases (`PointData`, `LineStringData`, etc.), and the `isX` type guards. `type.ts` also defines `Coord`, `InterleavedCoord`, and `SeparatedCoord`, but [packages/schema/src/index.ts](../../packages/schema/src/index.ts) does not currently re-export them.
- `packages/worker/` — `@geoarrow/worker`. Depends on `@geoarrow/schema` only.
- `packages/algorithm/` — `@geoarrow/algorithm`. Depends on `@geoarrow/schema` and `@geoarrow/worker`.

`packages/builder/` does not exist yet — creating it is PR 2's job.

### Prep steps PR 2 bundles

Three small prep steps land in PR 2 alongside the new builder package. None is its own PR because all three are tightly coupled to the builder work.

**1. Rename `@geoarrow/geo-interface` types to add the `Interface` suffix.** PR 1 shipped the structural interfaces under the bare names `Point`, `LineString`, `Polygon`, `MultiPoint`, `MultiLineString`, `MultiPolygon`, `GeometryCollection`, `Geometry`, `Coord`. These names collide with `@geoarrow/schema`'s Arrow type aliases (`Point = FixedSizeList<Float>`, `LineString = List<Coord>`, etc.), which makes any file that imports from both packages — every builder file does — ambiguous. The rename turns them into `PointInterface`, `LineStringInterface`, `PolygonInterface`, `MultiPointInterface`, `MultiLineStringInterface`, `MultiPolygonInterface`, `GeometryCollectionInterface`, `GeometryInterface`, `CoordInterface`. `Dimension` and `sizeOf` keep their current names (no collision). This is a breaking change to a `0.4.0-beta.0` package with no downstream consumers; the cost is tiny compared to the cost of living with the name collision in every package that consumes both. Touched files: [packages/geo-interface/src/interface.ts](../../packages/geo-interface/src/interface.ts), [packages/geo-interface/src/index.ts](../../packages/geo-interface/src/index.ts), [packages/geo-interface/src/iter.ts](../../packages/geo-interface/src/iter.ts) (signatures reference the renamed types), [packages/geo-interface/tests/fixtures.ts](../../packages/geo-interface/tests/fixtures.ts), and every PR 1 test file in [packages/geo-interface/tests/](../../packages/geo-interface/tests/).

**2. Promote `Coord`, `InterleavedCoord`, and `SeparatedCoord` to the `@geoarrow/schema` barrel.** They are defined at [packages/schema/src/type.ts:7](../../packages/schema/src/type.ts#L7) but not re-exported from [packages/schema/src/index.ts](../../packages/schema/src/index.ts). `CoordBufferBuilder.finish()` returns `Data<InterleavedCoord>`, so the type needs to be importable from the package root. The change is additive: add three `export type` entries to the schema barrel, no runtime code touched. Note that `@geoarrow/schema` already has a `Coord` type alias (`Coord = InterleavedCoord` for now) — this promotion does not collide with `@geoarrow/geo-interface`'s (now-renamed) `CoordInterface`.

**3. Create `@geoarrow/test-fixtures` — a private workspace package for shared test fixtures.** New `packages/test-fixtures/` with `"private": true` in its `package.json` so it never publishes to npm. Contains the reference implementation classes from PR 1 (`RefCoord`, `RefPoint`, `RefLineString`, `RefPolygon`, `RefMultiPoint`, `RefMultiLineString`, `RefMultiPolygon`, `RefGeometryCollection`) moved out of [packages/geo-interface/tests/fixtures.ts](../../packages/geo-interface/tests/fixtures.ts) into `packages/test-fixtures/src/`. These classes implement the (renamed) `*Interface` types from step 1. `@geoarrow/geo-interface`'s own tests are updated to import from `@geoarrow/test-fixtures` instead of the relative path. Both `@geoarrow/geo-interface` and `@geoarrow/builder` list `@geoarrow/test-fixtures` under `devDependencies` with `workspace:*`. Nothing ships in either public tarball.

The PR 1 interface contract PR 2 consumes (after the rename in prep step 1): `CoordInterface`, `PointInterface`, `LineStringInterface`, `PolygonInterface`, `MultiPointInterface`, `MultiLineStringInterface`, `MultiPolygonInterface`, `GeometryInterface`, `Dimension`, `sizeOf`. The `@geoarrow/schema` types PR 2 consumes: `Point`, `LineString`, `Polygon`, `MultiPoint`, `MultiLineString`, `MultiPolygon` type aliases, their `Data<T>` siblings, and — after prep step 2 — `InterleavedCoord`.

## Package layout

```
packages/builder/
├── package.json              # "@geoarrow/builder"
├── tsconfig.json
├── tsconfig.build.json
├── src/
│   ├── index.ts              # barrel: re-export every public builder and capacity
│   ├── internal/
│   │   ├── bitmap.ts         # BitmapBuilder
│   │   ├── offsets.ts        # OffsetsBuilder
│   │   └── coord.ts          # CoordBufferBuilder
│   ├── point.ts              # PointBuilder
│   ├── linestring.ts         # LineStringBuilder
│   ├── polygon.ts            # PolygonBuilder
│   ├── multipoint.ts         # MultiPointBuilder
│   ├── multilinestring.ts    # MultiLineStringBuilder
│   ├── multipolygon.ts       # MultiPolygonBuilder
│   └── capacity/
│       ├── point.ts          # PointCapacity
│       ├── linestring.ts     # LineStringCapacity
│       ├── polygon.ts        # PolygonCapacity
│       ├── multipoint.ts     # MultiPointCapacity
│       ├── multilinestring.ts # MultiLineStringCapacity
│       └── multipolygon.ts   # MultiPolygonCapacity
└── tests/
    ├── point.test.ts
    ├── linestring.test.ts
    ├── polygon.test.ts
    ├── multipoint.test.ts
    ├── multilinestring.test.ts
    ├── multipolygon.test.ts
    └── internal/
        ├── bitmap.test.ts
        ├── offsets.test.ts
        └── coord.test.ts
```

### `package.json`

```json
{
  "name": "@geoarrow/builder",
  "version": "<workspace-synced>",
  "type": "module",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "sideEffects": false,
  "files": ["dist"],
  "scripts": {
    "build": "tsc --build tsconfig.build.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@geoarrow/geo-interface": "workspace:*",
    "@geoarrow/schema": "workspace:*",
    "apache-arrow": "^17 || ^18"
  },
  "devDependencies": {
    "@geoarrow/test-fixtures": "workspace:*"
  }
}
```

Builder matches the other workspace packages: ESM-only, `tsc --build tsconfig.build.json` as the build, vitest as the test runner. No dual ESM/CJS bundle, no bundler step — the other leaf packages already ship this way and builder has no reason to differ. No worker plumbing, so no rollup.

### Files organized per-type, not consolidated

PR 1 consolidated the seven interfaces into a single `index.ts` because each interface was ~10 lines and they cross-referenced heavily. Builders are not tiny — each is 150–300 lines in the Rust port — and they do not import each other: `LineStringBuilder` does not call `MultiLineStringBuilder`, it only reads the `MultiLineStringInterface` when `pushGeometry` unwraps a single-item multi. Per-type files keep each builder small enough to hold in context, match the Rust source layout (`geoarrow-array/src/builder/linestring.rs`, etc.), and give each PR reviewer a clean diff.

Capacity classes live under `src/capacity/` inside the same package because every consumer uses a capacity and a builder together — the capacity exists to size the builder — and a shared package avoids the `../../` traversals a sibling package would require.

## Internal helpers

Three helpers, all under `src/internal/`, all used by every geometry builder.

### `BitmapBuilder` — lazy validity bitmap

Arrow encodes nullability as a packed `Uint8Array` of `ceil(length / 8)` bytes, stored on `Data.nullBitmap`, where bit `i` is 1 iff row `i` is valid. apache-arrow does not expose a public helper for constructing this buffer, so we hand-roll.

The all-valid case is the common one — DuckDB geometry columns are almost always non-nullable, test fixtures rarely contain nulls, and an Arrow `Data` with `nullBitmap: undefined` is semantically equivalent to one with a fully-set bitmap but one allocation smaller. `BitmapBuilder` is therefore **lazy**: it starts with `buf === null`, and only allocates when the first null is appended. On allocation, it back-fills the preceding positions as valid (bit = 1).

```ts
// packages/builder/src/internal/bitmap.ts
export class BitmapBuilder {
  private buf: Uint8Array | null = null;
  private length = 0;

  constructor(private readonly capacity: number) {}

  appendValid(): void {
    if (this.buf !== null) {
      this.buf[this.length >> 3] |= 1 << (this.length & 7);
    }
    this.length++;
  }

  appendNull(): void {
    if (this.buf === null) {
      this.buf = new Uint8Array(Math.ceil(this.capacity / 8));
      for (let i = 0; i < this.length; i++) {
        this.buf[i >> 3] |= 1 << (i & 7);
      }
    }
    this.length++; // bit already 0 from allocation
  }

  finish(): Uint8Array | undefined {
    return this.buf ?? undefined;
  }
}
```

**Bit convention:** Arrow's standard — `1 = valid`, `0 = null`. The buffer is zero-initialized on allocation, so "no writes needed on null" is the natural path.

### `OffsetsBuilder` — pre-sized Int32 running-sum offsets

Every `List` level in GeoArrow layout needs an offsets buffer: an `Int32Array` of length `n + 1`, where `offsets[0] = 0` and `offsets[i]` is the exclusive end of row `i - 1` / the inclusive start of row `i`. LineStringBuilder has one offsets level (geoms → coords). PolygonBuilder has two. MultiPolygonBuilder has three.

```ts
// packages/builder/src/internal/offsets.ts
export class OffsetsBuilder {
  private readonly buf: Int32Array;
  private pos = 1; // buf[0] is always 0

  constructor(capacity: number) {
    this.buf = new Int32Array(capacity + 1);
  }

  appendLength(n: number): void {
    this.buf[this.pos] = this.buf[this.pos - 1] + n;
    this.pos++;
  }

  finish(): Int32Array {
    return this.buf;
  }
}
```

`capacity` is the number of entries at this nesting level — e.g. for `LineStringBuilder`, `capacity === capacity.geomCapacity`. The buffer is sized `capacity + 1` because offsets always carry a trailing sentinel equal to the total count of children.

The `appendLength(n)` API takes the *delta* (how many child items this row has), not the absolute offset — matches Rust's `OffsetsBuilder::try_push_usize` semantics and keeps the running-sum arithmetic inside the helper.

### `CoordBufferBuilder` — interleaved coord buffer with extensibility hook

Holds a single pre-sized `Float64Array` and appends one coordinate at a time. M1 is interleaved-only: for XY, coord `i` occupies indices `[2i, 2i+1]`; for XYZ, `[3i, 3i+1, 3i+2]`.

```ts
// packages/builder/src/internal/coord.ts
import { makeData } from "apache-arrow";
import {
  type CoordInterface,
  type Dimension,
  sizeOf,
} from "@geoarrow/geo-interface";
import type { InterleavedCoord } from "@geoarrow/schema";

export type CoordType = "interleaved";

export class CoordBufferBuilder {
  private readonly buf: Float64Array;
  private pos = 0;
  private coordCount = 0;

  constructor(
    capacity: number,
    readonly dim: Dimension,
    readonly coordType: CoordType = "interleaved",
  ) {
    this.buf = new Float64Array(capacity * sizeOf(dim));
  }

  pushCoord(coord: CoordInterface): void {
    if (coord.dim() !== this.dim) {
      throw new Error(
        `coord dimension mismatch: builder is ${this.dim}, got ${coord.dim()}`,
      );
    }
    const size = sizeOf(this.dim);
    for (let i = 0; i < size; i++) {
      this.buf[this.pos + i] = coord.nth(i);
    }
    this.pos += size;
    this.coordCount++;
  }

  finish(): Data<InterleavedCoord> {
    // Construct the FixedSizeList<Float64> Data that Arrow expects as the
    // coordinate child. Exact type construction elided here; see implementation.
    return makeData({
      type: /* FixedSizeList<Float64> with listSize = sizeOf(this.dim) */,
      length: this.coordCount,
      child: makeData({
        type: /* Float64 */,
        length: this.coordCount * sizeOf(this.dim),
        data: this.buf,
      }),
    }) as Data<InterleavedCoord>;
  }
}
```

**Returning `Data<InterleavedCoord>` from `finish()`, not a raw `Float64Array`.** The geometry builders never see the underlying typed array — they only see an Arrow `Data` at the coord level that they can pass as a child to their own `makeData` call. This is the key encapsulation for the separated-coord extension: adding separated support later means adding a `"separated"` case to `CoordType`, a branch in `pushCoord`, and an alternate `finish()` that returns `Data<SeparatedCoord>`. None of `LineStringBuilder`, `PolygonBuilder`, etc. need to change.

**Dimension mismatch throws on push.** This is the only runtime dimension check — once a coord is in the buffer, it is the right dimension.

## Builder API

Six builders, one per homogeneous GeoArrow type. All follow the same shape: private constructor taking `{ dim }` options and a capacity, a single `withCapacity` static entry point, one typed `push<Type>(value | null)` method, a permissive `pushGeometry(value | null)`, and a `finish()` that consumes the builder and returns `<Type>Data`.

### Canonical example: `LineStringBuilder`

```ts
// packages/builder/src/linestring.ts
import { List, makeData } from "apache-arrow";
import type {
  GeometryInterface,
  LineStringInterface,
  MultiLineStringInterface,
  Dimension,
} from "@geoarrow/geo-interface";
import type { LineString, LineStringData } from "@geoarrow/schema";
import { BitmapBuilder } from "./internal/bitmap.js";
import { CoordBufferBuilder } from "./internal/coord.js";
import { OffsetsBuilder } from "./internal/offsets.js";
import { LineStringCapacity } from "./capacity/linestring.js";

export interface LineStringBuilderOptions {
  dim: Dimension;
  // coordType?: CoordType;  // future — interleaved only in M1
}

export class LineStringBuilder {
  private readonly coords: CoordBufferBuilder;
  private readonly geomOffsets: OffsetsBuilder;
  private readonly validity: BitmapBuilder;
  readonly dim: Dimension;

  private constructor(
    opts: LineStringBuilderOptions,
    capacity: LineStringCapacity,
  ) {
    this.dim = opts.dim;
    this.coords = new CoordBufferBuilder(capacity.coordCapacity, opts.dim);
    this.geomOffsets = new OffsetsBuilder(capacity.geomCapacity);
    this.validity = new BitmapBuilder(capacity.geomCapacity);
  }

  static withCapacity(
    opts: LineStringBuilderOptions,
    capacity: LineStringCapacity,
  ): LineStringBuilder {
    return new LineStringBuilder(opts, capacity);
  }

  pushLineString(value: LineStringInterface | null): void {
    if (value === null) {
      this.geomOffsets.appendLength(0);
      this.validity.appendNull();
      return;
    }
    const n = value.numCoords();
    for (let i = 0; i < n; i++) {
      this.coords.pushCoord(value.coord(i));
    }
    this.geomOffsets.appendLength(n);
    this.validity.appendValid();
  }

  pushGeometry(value: GeometryInterface | null): void {
    if (value === null) {
      this.pushLineString(null);
      return;
    }
    switch (value.geometryType) {
      case "LineString":
        this.pushLineString(value);
        return;
      case "MultiLineString": {
        const mls: MultiLineStringInterface = value;
        const n = mls.numLineStrings();
        if (n === 0) {
          this.geomOffsets.appendLength(0);
          this.validity.appendValid();
        } else if (n === 1) {
          this.pushLineString(mls.lineString(0));
        } else {
          throw new Error(
            `LineStringBuilder.pushGeometry: MultiLineString with ${n} items cannot be unwrapped into a single LineString`,
          );
        }
        return;
      }
      default:
        throw new Error(
          `LineStringBuilder.pushGeometry: expected LineString, got ${value.geometryType}`,
        );
    }
  }

  finish(): LineStringData {
    const coordData = this.coords.finish();
    const valueOffsets = this.geomOffsets.finish();
    const nullBitmap = this.validity.finish();
    const length = valueOffsets.length - 1;
    return makeData({
      type: new List<LineString["TChild"]>(/* coordData.type wrapped in a Field */),
      length,
      nullBitmap,
      valueOffsets,
      child: coordData,
    }) as LineStringData;
  }
}
```

### Key API decisions

**Private constructor, single `withCapacity` entry point.** The public path is exactly one: compute a capacity, hand it to `withCapacity`, push until done, call `finish()`. No default-constructible / zero-capacity `new LineStringBuilder()` path, because there is no growable typed array to back it. The private constructor is compile-time enforcement of the two-pass discipline.

**Typed push + permissive `pushGeometry`, both nullable.** `pushLineString(value | null)` is the fast path for callers that know the type. `pushGeometry(value | null)` narrows on `geometryType` and dispatches, mirroring Rust's `push_geometry`. Both take `| null`; null flows through `pushGeometry` to `pushLineString` without any extra branch. PR 3's `WkbParser` will iterate over `WkbView | null` and call `pushGeometry` per row, which works because the WKB view types implement `GeometryInterface` with the correct `geometryType` discriminant.

**Permissive unwrap of single-item multis.** `LineStringBuilder.pushGeometry` accepts a `MultiLineStringInterface` and unwraps it when it contains zero or one children. Zero → append an empty (valid) LineString; one → recurse into `pushLineString(mls.lineString(0))`; two or more → throw. This matches the Rust builder's behavior exactly. The purpose is PR 3 interoperability: WKB data that is semantically a single line string but arrived encoded as a one-item MultiLineString (common in DuckDB output) is accepted silently. The capacity walk must make the identical decision (see Capacity API below).

The same unwrap applies to each type's `pushGeometry`:

| Builder                  | Accepts via `pushGeometry`                                    |
| ------------------------ | ------------------------------------------------------------- |
| `PointBuilder`           | `Point`; `MultiPoint` with zero or one child                  |
| `LineStringBuilder`      | `LineString`; `MultiLineString` with zero or one child        |
| `PolygonBuilder`         | `Polygon`; `MultiPolygon` with zero or one child              |
| `MultiPointBuilder`      | `MultiPoint`; `Point` (wrapped into a 1-item multi)           |
| `MultiLineStringBuilder` | `MultiLineString`; `LineString` (wrapped into a 1-item multi) |
| `MultiPolygonBuilder`    | `MultiPolygon`; `Polygon` (wrapped into a 1-item multi)       |

Multi builders promote singles to 1-item multis. Single builders unwrap 1-item (or empty) multis. Anything else throws with a descriptive message naming both the builder and the offending `geometryType`.

**`finish()` returns the `@geoarrow/schema` `Data<T>` alias directly.** No builder wrapper class. The geoarrow-js convention is to pass raw Arrow `Data<T>` through public APIs, and `LineStringData = Data<LineString>` is a type alias, not a runtime wrapper. Builders match that convention.

**Builder shape variations per type:**

| Builder                  | Internal helpers                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PointBuilder`           | `CoordBufferBuilder`, `BitmapBuilder` (no offsets — coord count == geom count, `finish()` returns the coord `Data` wrapped as `PointData`)                                                  |
| `LineStringBuilder`      | `CoordBufferBuilder`, 1× `OffsetsBuilder` (geom), `BitmapBuilder`                                                                                                                           |
| `MultiPointBuilder`      | `CoordBufferBuilder`, 1× `OffsetsBuilder` (geom), `BitmapBuilder` — structurally identical to `LineStringBuilder` at the Arrow level, but iterates `point(i).coord()` instead of `coord(i)` |
| `PolygonBuilder`         | `CoordBufferBuilder`, 2× `OffsetsBuilder` (ring, geom), `BitmapBuilder`                                                                                                                     |
| `MultiLineStringBuilder` | `CoordBufferBuilder`, 2× `OffsetsBuilder` (linestring, geom), `BitmapBuilder`                                                                                                               |
| `MultiPolygonBuilder`    | `CoordBufferBuilder`, 3× `OffsetsBuilder` (ring, polygon, geom), `BitmapBuilder`                                                                                                            |

Each builder's `finish()` constructs the nested `List` `Data` from the inside out: coord → (ring →) (inner-list →) geom, wiring the offsets and the next level's `Data` as child at each step.

## Capacity API

Six classes, one per builder, each under `src/capacity/`. Every capacity class has the same shape: public number fields for each counter, `add<Type>(value | null)` methods per typed input, `addGeometry(value | null)` for the permissive path, and `from<Type>s` / `fromGeometries` static constructors that run the walk.

### Canonical example: `LineStringCapacity`

```ts
// packages/builder/src/capacity/linestring.ts
import type {
  GeometryInterface,
  LineStringInterface,
  MultiLineStringInterface,
} from "@geoarrow/geo-interface";

export class LineStringCapacity {
  coordCapacity = 0;
  geomCapacity = 0;

  addLineString(value: LineStringInterface | null): void {
    this.geomCapacity++;
    if (value !== null) {
      this.coordCapacity += value.numCoords();
    }
  }

  addGeometry(value: GeometryInterface | null): void {
    if (value === null) {
      this.geomCapacity++;
      return;
    }
    switch (value.geometryType) {
      case "LineString":
        this.addLineString(value);
        return;
      case "MultiLineString": {
        const mls: MultiLineStringInterface = value;
        const n = mls.numLineStrings();
        this.geomCapacity++;
        if (n === 0) {
          // empty LineString — no coords
        } else if (n === 1) {
          this.coordCapacity += mls.lineString(0).numCoords();
        } else {
          throw new Error(
            `LineStringCapacity.addGeometry: MultiLineString with ${n} items cannot be unwrapped into a single LineString`,
          );
        }
        return;
      }
      default:
        throw new Error(
          `LineStringCapacity.addGeometry: expected LineString, got ${value.geometryType}`,
        );
    }
  }

  static fromLineStrings(
    iter: Iterable<LineStringInterface | null>,
  ): LineStringCapacity {
    const cap = new LineStringCapacity();
    for (const ls of iter) cap.addLineString(ls);
    return cap;
  }

  static fromGeometries(
    iter: Iterable<GeometryInterface | null>,
  ): LineStringCapacity {
    const cap = new LineStringCapacity();
    for (const g of iter) cap.addGeometry(g);
    return cap;
  }
}
```

### Capacity field matrix

| Capacity                  | Fields                                                             | Offsets sized from                                                        |
| ------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `PointCapacity`           | `geomCapacity`                                                     | — (no offset level — `PointData` is a `FixedSizeList<Float64>` directly)  |
| `LineStringCapacity`      | `coordCapacity`, `geomCapacity`                                    | geom offsets ← `geomCapacity`                                             |
| `MultiPointCapacity`      | `coordCapacity`, `geomCapacity`                                    | geom offsets ← `geomCapacity`                                             |
| `PolygonCapacity`         | `coordCapacity`, `ringCapacity`, `geomCapacity`                    | ring offsets ← `ringCapacity`, geom offsets ← `geomCapacity`              |
| `MultiLineStringCapacity` | `coordCapacity`, `ringCapacity`, `geomCapacity`                    | linestring offsets ← `ringCapacity`, geom offsets ← `geomCapacity`        |
| `MultiPolygonCapacity`    | `coordCapacity`, `ringCapacity`, `polygonCapacity`, `geomCapacity` | ring ← `ringCapacity`, polygon ← `polygonCapacity`, geom ← `geomCapacity` |

Note that `MultiLineStringCapacity` reuses the name `ringCapacity` for the linestring offset level. This matches the Rust naming (`ring_capacity` refers to "one level below the outer geometry offset, one level above coords") — it is slightly misleading for multi-line-strings because they have no rings, but the consistency across capacity types is worth more than the local accuracy.

### Public mutable fields

Every counter is a public mutable number field. The builder reads them once in its private constructor and never again. A private field with getters would force either awkward `getCoordCapacity()` methods or ceremonial getter syntax for no semantic gain. The counters are not an invariant to protect — they are a scratch counter that the builder consumes immediately after construction.

### Mirroring discipline

Every capacity class's `addGeometry` accept-set is identical to its builder's `pushGeometry` accept-set, down to the error messages. This is a hard invariant. Violating it means the capacity walk undercounts or overcounts, and the builder either overflows a pre-sized `Float64Array` or leaves trailing garbage. Tests cover both sides of every rejection and every accepted-but-unwrapped case (see Testing below).

The mirroring requirement is why capacity and builder live in the same package and in adjacent files.

## Error handling

All runtime errors throw plain `Error` instances with descriptive messages. No custom error class. The existing geoarrow-js codebase uses plain `Error` throughout, and no consumer has asked for `instanceof`-discrimination. If that changes, wrapping existing call sites in a `BuilderError` subclass is a trivial follow-up.

Error messages always name:

1. The class and method that threw (`LineStringBuilder.pushGeometry: ...`).
2. What was expected (`expected LineString`).
3. What was received (`got Point` or `got MultiLineString with 3 items`).

## Testing

One test file per geometry builder under `packages/builder/tests/`, plus one per internal helper under `packages/builder/tests/internal/`. vitest as the runner (existing project standard).

### Test fixtures

PR 1's reference implementation classes (`RefCoord`, `RefPoint`, `RefLineString`, `RefPolygon`, `RefMultiPoint`, `RefMultiLineString`, `RefMultiPolygon`, `RefGeometryCollection`) live in the private workspace package `@geoarrow/test-fixtures` (see Prerequisites → Prep steps). Builder tests import them via a plain package import:

```ts
import { RefLineString, RefCoord } from "@geoarrow/test-fixtures";
```

`@geoarrow/test-fixtures` is `"private": true` and never publishes to npm, so its contents are a pnpm-workspace-only concern. Both `@geoarrow/geo-interface`'s tests and `@geoarrow/builder`'s tests consume the same fixture definitions, which is what makes the mirroring discipline (capacity-walk decisions vs. builder-push decisions) easy to verify against a shared source of truth.

These fixtures drive every builder test. They cost ~100 lines to define and cover every shape the builders accept, including empty geometries and all dimensions.

### Per-builder coverage matrix

Every builder test file (e.g. `linestring.test.ts`) covers the following cases:

1. **Happy path, XY.** Multiple rows with varied coord counts, typed push, assert `data.length`, `data.valueOffsets`, `data.children[0].values` (the raw `Float64Array`), and `data.nullBitmap === undefined`.
2. **Happy path, XYZ.** Same as above with 3-ordinate coords.
3. **Null rows.** Interleaved valid/null/valid pattern; assert the validity bitmap is allocated, and the bit pattern matches Arrow's `1 = valid` convention.
4. **Empty geometry (distinct from null).** Line string with `numCoords() === 0`, polygon with `exterior() === null`, point with `coord() === null`, etc. Assert the row is valid (`nullBitmap` stays undefined, or the bit is set) and the offsets advance with delta zero.
5. **`pushGeometry` typed accept.** Push the builder's own type through `pushGeometry`; should succeed with identical output to `push<Type>`.
6. **`pushGeometry` permissive unwrap accept.** Push a one-item `Multi<Type>` through `LineStringBuilder.pushGeometry` (or a `Point` through `MultiPointBuilder.pushGeometry`); should succeed.
7. **`pushGeometry` empty-multi accept.** Push a zero-item `Multi<Type>` through a single-type builder; should append an empty (valid) row.
8. **`pushGeometry` too-many reject.** Push a 2+-item `Multi<Type>` through a single-type builder; should throw with a message naming the class and the item count.
9. **`pushGeometry` wrong-type reject.** Push a `Point` through `LineStringBuilder.pushGeometry`; should throw.
10. **Coord dimension mismatch.** Construct an XY builder, push a coord claiming XYZ; should throw from `CoordBufferBuilder`.
11. **Capacity/builder mirror.** For each accepted input in cases 5–7 and each rejected input in cases 8–9, assert that the capacity class makes the identical decision with the identical error message. This is the mirroring invariant.
12. **Round trip through schema type guard.** Pass the finished `Data` through the existing `isLineStringData` / `isPolygonData` / etc. guards from `@geoarrow/schema`; should return true.

### Internal helper coverage

- **`bitmap.test.ts`** — allocation is lazy (no null → `finish()` returns `undefined`); first null at position 0 → bit 0 is 0 and the buffer exists; first null at position 5 → bits 0–4 are 1, bit 5 is 0; allocation happens exactly once across many nulls; capacity controls allocated size.
- **`offsets.test.ts`** — running sum correctness; `finish()` returns an `Int32Array` at exactly `capacity + 1`; the buffer starts with 0 at index 0; `appendLength` with zero is allowed (row with no children).
- **`coord.test.ts`** — XY push, XYZ push, dimension mismatch throws from `pushCoord`, `finish()` returns a `Data<InterleavedCoord>` with correct `type.listSize` and the underlying `Float64Array` at the expected offsets.

No type-level tests in this PR. PR 1 covered `GeometryInterface` narrowing with `expectTypeOf`; PR 2 is purely runtime.

## Out of scope for PR 2

- **`GeometryBuilder` / `GeometryCapacity` / `geoarrow.geometry` support.** Deferred to PR 4, landing as additive changes to `@geoarrow/schema` and `@geoarrow/builder`.
- **`GeometryCollectionInterface` handling.** PR 1 defines the interface; PR 2 builders do not consume it. Passing a `GeometryCollectionInterface` to any `pushGeometry` throws. `GeometryCollection` handling is part of PR 4.
- **Separated coord layout.** M1 is interleaved only. `CoordBufferBuilder` is designed to extend non-breakingly.
- **Growable / zero-capacity path.** `withCapacity` is the only public constructor. No `new LineStringBuilder()` + `reserve()` + growing typed arrays.
- **`extend_from_iter` bulk helpers.** Callers run their own `for (const g of iter) b.pushGeometry(g)` loop. Adding a helper later is a one-line addition if there is demand.
- **XYM and XYZM dimensions.** `Dimension` in `@geoarrow/geo-interface` is `"XY" | "XYZ"` in M1. Extending the union later forces exhaustive `switch` re-checks in the builders, which is the desired failure mode.
- **A WKB parser.** PR 3.
- **Moving `CoordBufferBuilder` into `@geoarrow/schema`.** The coord buffer builder is a builder-only concern for now; if a future consumer (e.g. a cast operation in a separate package) needs it, moving it into `@geoarrow/schema` is non-breaking.
- **Benchmarks.** The two-pass design has clear worst-case behavior (O(n) walk + O(n) push, with zero reallocations). Benchmarks come with PR 3 where real-world WKB throughput matters.

## Open questions

None at time of writing. All structural decisions are locked in above.
