# `@geoarrow/builder` Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `@geoarrow/builder` package — six homogeneous geometry builders and their capacity classes — so that PR 3 (`@geoarrow/wkb`) has a target to push parsed WKB rows into.

**Architecture:** Two-pass design. Pass 1 walks the input iterable with a capacity class to count exact coord / offset / geometry totals. Pass 2 hands the capacity to a builder's `withCapacity` constructor and pushes each row. Builders internally compose three helpers (`BitmapBuilder`, `OffsetsBuilder`, `CoordBufferBuilder`) and return Arrow `Data<T>` from `finish()`. Capacity and builder mirror each other down to the error messages; tests verify the mirror.

**Tech Stack:** TypeScript 6, `apache-arrow` ^17/^18, `tsc --build` composite project references, pnpm 10 workspaces, vitest 4, biome 2.

**Spec:** [dev-docs/specs/2026-04-13-builder-package-design.md](../specs/2026-04-13-builder-package-design.md)

**Conventions you need to know before starting:**

- Biome is configured with `useImportType: { style: "separatedType" }` — you must write `import type { Foo } from "..."` when importing types, and keep value imports separate. See [biome.json](../../biome.json).
- Every leaf package uses `tsc --build tsconfig.build.json` (composite project refs). The root [tsconfig.json](../../tsconfig.json) lists each package's `tsconfig.build.json` under `references`. When you add a new package, you must add it here.
- Every leaf package is ESM-only: `"type": "module"`, single `./dist/index.js` export. No dual-bundle, no tsup.
- Tests live in `packages/<pkg>/tests/` and import from `../src/index.js` (relative) or from other workspace packages via `@geoarrow/...`. Vitest is the runner.
- After any change to a package, run `pnpm -F @geoarrow/<name> test` and `pnpm typecheck` (from repo root) before committing.

---

## Task 1: Rename `@geoarrow/geo-interface` types to add `Interface` suffix

**Why:** PR 1 shipped types as `Point`, `LineString`, etc., which collide with `@geoarrow/schema`'s Arrow type aliases of the same name. Every builder file imports from both packages. Rename the structural interfaces to `PointInterface`, `LineStringInterface`, etc. See spec Prep step 1.

**Files:**
- Modify: `packages/geo-interface/src/interface.ts`
- Modify: `packages/geo-interface/src/index.ts`
- Modify: `packages/geo-interface/src/iter.ts`
- Modify: `packages/geo-interface/tests/fixtures.ts`
- Modify: every file under `packages/geo-interface/tests/` that references a renamed type

**Type renames (complete list):**

| Old | New |
| --- | --- |
| `Coord` | `CoordInterface` |
| `Point` | `PointInterface` |
| `LineString` | `LineStringInterface` |
| `Polygon` | `PolygonInterface` |
| `MultiPoint` | `MultiPointInterface` |
| `MultiLineString` | `MultiLineStringInterface` |
| `MultiPolygon` | `MultiPolygonInterface` |
| `GeometryCollection` | `GeometryCollectionInterface` |
| `Geometry` | `GeometryInterface` |

`Dimension` and `sizeOf` keep their current names (no collision).

- [ ] **Step 1.1: Rename types in `packages/geo-interface/src/interface.ts`**

Open the file. For each `export interface <Name>` declaration and every internal cross-reference (e.g. `coord(): Coord | null` → `coord(): CoordInterface | null`), rename to the `*Interface` form using the table above. Also rename the `Geometry` discriminated union at the bottom of the file to `GeometryInterface`, and update its member types to the new names.

The final shape of each rename: `export interface Point` → `export interface PointInterface`, `Coord | null` → `CoordInterface | null`, etc. Preserve every JSDoc comment verbatim.

- [ ] **Step 1.2: Update `packages/geo-interface/src/index.ts`**

Replace the barrel with the renamed types:

```ts
export type {
  CoordInterface,
  Dimension,
  GeometryCollectionInterface,
  GeometryInterface,
  LineStringInterface,
  MultiLineStringInterface,
  MultiPointInterface,
  MultiPolygonInterface,
  PointInterface,
  PolygonInterface,
} from "./interface.js";
export { sizeOf } from "./interface.js";
export {
  iterCoords,
  iterGeometries,
  iterInteriors,
  iterLineStrings,
  iterPoints,
  iterPolygons,
} from "./iter.js";
```

- [ ] **Step 1.3: Update `packages/geo-interface/src/iter.ts`**

Replace the type imports at the top with the renamed versions, and update every function signature:

```ts
import type {
  CoordInterface,
  GeometryCollectionInterface,
  GeometryInterface,
  LineStringInterface,
  MultiLineStringInterface,
  MultiPointInterface,
  MultiPolygonInterface,
  PointInterface,
  PolygonInterface,
} from "./interface.js";

export function* iterCoords(
  ls: LineStringInterface,
): IterableIterator<CoordInterface> {
  const n = ls.numCoords();
  for (let i = 0; i < n; i++) yield ls.coord(i);
}

export function* iterInteriors(
  p: PolygonInterface,
): IterableIterator<LineStringInterface> {
  const n = p.numInteriors();
  for (let i = 0; i < n; i++) yield p.interior(i);
}

export function* iterPoints(
  mp: MultiPointInterface,
): IterableIterator<PointInterface> {
  const n = mp.numPoints();
  for (let i = 0; i < n; i++) yield mp.point(i);
}

export function* iterLineStrings(
  mls: MultiLineStringInterface,
): IterableIterator<LineStringInterface> {
  const n = mls.numLineStrings();
  for (let i = 0; i < n; i++) yield mls.lineString(i);
}

export function* iterPolygons(
  mp: MultiPolygonInterface,
): IterableIterator<PolygonInterface> {
  const n = mp.numPolygons();
  for (let i = 0; i < n; i++) yield mp.polygon(i);
}

export function* iterGeometries(
  gc: GeometryCollectionInterface,
): IterableIterator<GeometryInterface> {
  const n = gc.numGeometries();
  for (let i = 0; i < n; i++) yield gc.geometry(i);
}
```

- [ ] **Step 1.4: Update `packages/geo-interface/tests/fixtures.ts`**

Update the type imports and each class's `implements` clause:

```ts
import type {
  CoordInterface,
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

export class RefCoord implements CoordInterface { /* body unchanged */ }
export class RefPoint implements PointInterface {
  // body unchanged, but coord(): CoordInterface | null
}
export class RefLineString implements LineStringInterface {
  // body unchanged, but coord(i): CoordInterface
}
export class RefPolygon implements PolygonInterface {
  // body unchanged, but exterior(): LineStringInterface | null, interior(i): LineStringInterface
}
export class RefMultiPoint implements MultiPointInterface {
  // body unchanged, but point(i): PointInterface
}
export class RefMultiLineString implements MultiLineStringInterface {
  // body unchanged, but lineString(i): LineStringInterface
}
export class RefMultiPolygon implements MultiPolygonInterface {
  // body unchanged, but polygon(i): PolygonInterface
}
export class RefGeometryCollection implements GeometryCollectionInterface {
  // body unchanged, but _geometries: readonly GeometryInterface[], geometry(i): GeometryInterface
}
```

Keep every field type, constructor parameter, and method body identical — only the type-annotation names change.

- [ ] **Step 1.5: Find and rename every other type reference under `packages/geo-interface/tests/`**

Run this grep to find every remaining bare-name reference. None should remain after the rename:

```bash
pnpm biome check packages/geo-interface 2>&1 | head -60
```

Also grep for direct type usage in the existing test files:

Use the Grep tool with pattern `\\b(Coord|Point|LineString|Polygon|MultiPoint|MultiLineString|MultiPolygon|GeometryCollection|Geometry)\\b` in `packages/geo-interface/tests/` and inspect each hit. Many will be references to the `Ref*` fixture classes, which do NOT rename — only type annotations like `const p: Point` or `Array<Point>` need to become `PointInterface` / etc. The vast majority of test files only reference the `Ref*` classes, but `narrowing.test.ts` is likely to use the bare type names in type-level assertions and needs careful inspection.

- [ ] **Step 1.6: Run geo-interface tests**

```bash
pnpm -F @geoarrow/geo-interface test
```

Expected: all tests pass. If any fail with a "cannot find name X" TypeScript error, find the missed rename and fix it.

- [ ] **Step 1.7: Typecheck from repo root**

```bash
pnpm typecheck
```

Expected: clean exit. The root typecheck builds every package's tsconfig.build.json; any cross-package reference drift will surface here.

- [ ] **Step 1.8: Commit**

```bash
git add packages/geo-interface
git commit -m "refactor(geo-interface): rename structural types with Interface suffix

Rename Point → PointInterface, LineString → LineStringInterface,
etc., to eliminate the name collision with @geoarrow/schema's Arrow
type aliases. Prep step 1 for the @geoarrow/builder package."
```

---

## Task 2: Promote `Coord` / `InterleavedCoord` / `SeparatedCoord` to the `@geoarrow/schema` barrel

**Why:** `CoordBufferBuilder.finish()` returns `Data<InterleavedCoord>`, so the type must be importable from `@geoarrow/schema`'s package root. Currently it is defined in `type.ts` but not re-exported. See spec Prep step 2.

**Files:**
- Modify: `packages/schema/src/index.ts`

- [ ] **Step 2.1: Add three type exports**

In [packages/schema/src/index.ts](../../packages/schema/src/index.ts), extend the existing `export type { ... } from "./type.js";` block to include `Coord`, `InterleavedCoord`, and `SeparatedCoord`. The relevant section becomes:

```ts
export type {
  Coord,
  GeoArrowType,
  InterleavedCoord,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
  SeparatedCoord,
} from "./type.js";
```

Leave everything else in `index.ts` alone.

- [ ] **Step 2.2: Typecheck schema**

```bash
pnpm -F @geoarrow/schema typecheck
```

Expected: clean exit.

- [ ] **Step 2.3: Run schema tests**

```bash
pnpm -F @geoarrow/schema test
```

Expected: pass. No behavior changed, only exports added.

- [ ] **Step 2.4: Commit**

```bash
git add packages/schema/src/index.ts
git commit -m "feat(schema): re-export Coord / InterleavedCoord / SeparatedCoord

Promote the three coordinate-level type aliases from type.ts into
the package barrel so @geoarrow/builder can import
Data<InterleavedCoord> from @geoarrow/schema directly. Prep step 2
for the @geoarrow/builder package."
```

---

## Task 3: Create `@geoarrow/test-fixtures` private workspace package

**Why:** The `Ref*` fixture classes need to be consumable from both `@geoarrow/geo-interface`'s own tests and `@geoarrow/builder`'s tests, without shipping them in any public tarball. A private workspace package is the cleanest pattern. See spec Prep step 3.

**Files:**
- Create: `packages/test-fixtures/package.json`
- Create: `packages/test-fixtures/tsconfig.json`
- Create: `packages/test-fixtures/tsconfig.build.json`
- Create: `packages/test-fixtures/src/index.ts`
- Modify: `packages/geo-interface/package.json` (add devDependency)
- Delete: `packages/geo-interface/tests/fixtures.ts`
- Modify: every test file under `packages/geo-interface/tests/` that imports from `./fixtures.js`
- Modify: `tsconfig.json` (add project reference)

- [ ] **Step 3.1: Create the package directory and `package.json`**

```bash
mkdir -p packages/test-fixtures/src
```

Write [packages/test-fixtures/package.json](../../packages/test-fixtures/package.json):

```json
{
  "name": "@geoarrow/test-fixtures",
  "version": "0.0.0",
  "private": true,
  "description": "Reference implementations of @geoarrow/geo-interface types for use as test fixtures across workspace packages. Never published.",
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
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@geoarrow/geo-interface": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^6.0.2"
  },
  "volta": {
    "extends": "../../package.json"
  }
}
```

Note: `"private": true` is the critical bit — pnpm publish will refuse to publish this package. No `peerDependencies`, no `apache-arrow`, because the fixtures are pure TypeScript that implement the PR 1 interfaces.

- [ ] **Step 3.2: Create `packages/test-fixtures/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3.3: Create `packages/test-fixtures/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"],
  "references": [
    { "path": "../geo-interface/tsconfig.build.json" }
  ]
}
```

The `references` entry makes tsc build geo-interface before test-fixtures.

- [ ] **Step 3.4: Create `packages/test-fixtures/src/index.ts`**

Move the content of the old [packages/geo-interface/tests/fixtures.ts](../../packages/geo-interface/tests/fixtures.ts) into this new file, rewriting the import to pull from `@geoarrow/geo-interface` (the package, not a relative path) and using the renamed `*Interface` types from Task 1:

```ts
import type {
  CoordInterface,
  Dimension,
  GeometryCollectionInterface,
  GeometryInterface,
  LineStringInterface,
  MultiLineStringInterface,
  MultiPointInterface,
  MultiPolygonInterface,
  PointInterface,
  PolygonInterface,
} from "@geoarrow/geo-interface";

export class RefCoord implements CoordInterface {
  constructor(
    private readonly _values: readonly number[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  x(): number {
    return this._values[0];
  }
  y(): number {
    return this._values[1];
  }
  nth(n: number): number {
    return this._values[n];
  }
}

export class RefPoint implements PointInterface {
  readonly geometryType = "Point" as const;
  constructor(
    private readonly _values: readonly number[] | null,
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  coord(): CoordInterface | null {
    return this._values === null ? null : new RefCoord(this._values, this._dim);
  }
}

export class RefLineString implements LineStringInterface {
  readonly geometryType = "LineString" as const;
  constructor(
    private readonly _coords: readonly (readonly number[])[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  numCoords(): number {
    return this._coords.length;
  }
  coord(i: number): CoordInterface {
    return new RefCoord(this._coords[i], this._dim);
  }
}

export class RefPolygon implements PolygonInterface {
  readonly geometryType = "Polygon" as const;
  constructor(
    private readonly _exterior: RefLineString | null,
    private readonly _interiors: readonly RefLineString[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  exterior(): LineStringInterface | null {
    return this._exterior;
  }
  numInteriors(): number {
    return this._interiors.length;
  }
  interior(i: number): LineStringInterface {
    return this._interiors[i];
  }
}

export class RefMultiPoint implements MultiPointInterface {
  readonly geometryType = "MultiPoint" as const;
  constructor(
    private readonly _points: readonly RefPoint[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  numPoints(): number {
    return this._points.length;
  }
  point(i: number): PointInterface {
    return this._points[i];
  }
}

export class RefMultiLineString implements MultiLineStringInterface {
  readonly geometryType = "MultiLineString" as const;
  constructor(
    private readonly _lineStrings: readonly RefLineString[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  numLineStrings(): number {
    return this._lineStrings.length;
  }
  lineString(i: number): LineStringInterface {
    return this._lineStrings[i];
  }
}

export class RefMultiPolygon implements MultiPolygonInterface {
  readonly geometryType = "MultiPolygon" as const;
  constructor(
    private readonly _polygons: readonly RefPolygon[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  numPolygons(): number {
    return this._polygons.length;
  }
  polygon(i: number): PolygonInterface {
    return this._polygons[i];
  }
}

export class RefGeometryCollection implements GeometryCollectionInterface {
  readonly geometryType = "GeometryCollection" as const;
  constructor(
    private readonly _geometries: readonly GeometryInterface[],
    private readonly _dim: Dimension,
  ) {}
  dim(): Dimension {
    return this._dim;
  }
  numGeometries(): number {
    return this._geometries.length;
  }
  geometry(i: number): GeometryInterface {
    return this._geometries[i];
  }
}
```

- [ ] **Step 3.5: Add `@geoarrow/test-fixtures` to the root `tsconfig.json`**

Edit the `references` array in [tsconfig.json](../../tsconfig.json) to include the new package. Keep the array alphabetically ordered:

```json
"references": [
  { "path": "packages/algorithm/tsconfig.build.json" },
  { "path": "packages/geo-interface/tsconfig.build.json" },
  { "path": "packages/schema/tsconfig.build.json" },
  { "path": "packages/test-fixtures/tsconfig.build.json" },
  { "path": "packages/worker/tsconfig.build.json" }
]
```

- [ ] **Step 3.6: Add `@geoarrow/test-fixtures` as a devDependency of `@geoarrow/geo-interface`**

Edit [packages/geo-interface/package.json](../../packages/geo-interface/package.json) `devDependencies`:

```json
"devDependencies": {
  "@geoarrow/test-fixtures": "workspace:*",
  "typescript": "^6.0.2",
  "vitest": "^4.0.18"
}
```

- [ ] **Step 3.7: Install to link the new workspace package**

```bash
pnpm install
```

Expected: pnpm adds the workspace symlink. No new registry downloads for test-fixtures. If the install fails complaining about a cycle (test-fixtures depends on geo-interface and geo-interface dev-depends on test-fixtures), verify `@geoarrow/test-fixtures` is in `devDependencies` (not `dependencies`) of geo-interface — dev-dep cycles are allowed.

- [ ] **Step 3.8: Rewrite every geo-interface test file's fixture import**

For each file under `packages/geo-interface/tests/*.test.ts`, replace:

```ts
import { RefLineString, RefMultiLineString } from "./fixtures.js";
```

with:

```ts
import { RefLineString, RefMultiLineString } from "@geoarrow/test-fixtures";
```

Preserve the set of imported names per file. Use the Grep tool with pattern `from "./fixtures.js"` to find every occurrence.

- [ ] **Step 3.9: Delete the old fixtures file**

```bash
rm packages/geo-interface/tests/fixtures.ts
```

- [ ] **Step 3.10: Run geo-interface tests**

```bash
pnpm -F @geoarrow/geo-interface test
```

Expected: pass. If a test file still references `./fixtures.js`, you missed one in step 3.8.

- [ ] **Step 3.11: Typecheck from repo root**

```bash
pnpm typecheck
```

Expected: clean exit. This verifies the new test-fixtures project builds in the composite graph.

- [ ] **Step 3.12: Commit**

```bash
git add packages/test-fixtures packages/geo-interface tsconfig.json pnpm-lock.yaml
git commit -m "feat(test-fixtures): extract Ref* classes into private workspace package

Move RefPoint, RefLineString, RefPolygon, RefMultiPoint,
RefMultiLineString, RefMultiPolygon, RefGeometryCollection, and
RefCoord from packages/geo-interface/tests/fixtures.ts into a new
private workspace package @geoarrow/test-fixtures. Rewrite
geo-interface's own tests to import from the package. The package
is marked private and never publishes to npm. Prep step 3 for the
@geoarrow/builder package."
```

---

## Task 4: Scaffold `@geoarrow/builder`

**Why:** Set up the empty package so the rest of the plan can add files incrementally with each task's TDD cycle producing a commit against a package that already builds.

**Files:**
- Create: `packages/builder/package.json`
- Create: `packages/builder/tsconfig.json`
- Create: `packages/builder/tsconfig.build.json`
- Create: `packages/builder/src/index.ts`
- Modify: `tsconfig.json` (add project reference)

Note: no `vitest.config.ts` — the other workspace packages use vitest defaults and auto-discover tests under `tests/**/*.test.ts`. Match that convention.

- [ ] **Step 4.1: Create the directory tree**

```bash
mkdir -p packages/builder/src/internal packages/builder/src/capacity packages/builder/tests/internal packages/builder/tests/capacity
```

- [ ] **Step 4.2: Write `packages/builder/package.json`**

```json
{
  "name": "@geoarrow/builder",
  "version": "0.4.0-beta.0",
  "description": "Two-pass builders for GeoArrow homogeneous geometry types. Walk with a capacity class, then push through a builder to emit Arrow Data<T>.",
  "keywords": [
    "geoarrow",
    "arrow",
    "apache-arrow",
    "builder",
    "geospatial",
    "typescript"
  ],
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
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm build"
  },
  "author": "Kyle Barron <kylebarron2@gmail.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/geoarrow/geoarrow-js.git",
    "directory": "packages/builder"
  },
  "peerDependencies": {
    "apache-arrow": ">=15"
  },
  "dependencies": {
    "@geoarrow/geo-interface": "workspace:*",
    "@geoarrow/schema": "workspace:*"
  },
  "devDependencies": {
    "@geoarrow/test-fixtures": "workspace:*",
    "apache-arrow": ">=15",
    "typescript": "^6.0.2",
    "vitest": "^4.0.18"
  },
  "volta": {
    "extends": "../../package.json"
  }
}
```

- [ ] **Step 4.3: Write `packages/builder/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4.4: Write `packages/builder/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"],
  "references": [
    { "path": "../geo-interface/tsconfig.build.json" },
    { "path": "../schema/tsconfig.build.json" }
  ]
}
```

- [ ] **Step 4.5: Write an empty `packages/builder/src/index.ts` barrel**

```ts
export {};
```

The barrel will be filled in by each builder task. Biome will complain if the file is literally empty; `export {};` is the standard "this is a valid ES module with no exports" placeholder.

- [ ] **Step 4.6: Register the new package in the root `tsconfig.json`**

Add `{ "path": "packages/builder/tsconfig.build.json" }` to the `references` array (keep alphabetical):

```json
"references": [
  { "path": "packages/algorithm/tsconfig.build.json" },
  { "path": "packages/builder/tsconfig.build.json" },
  { "path": "packages/geo-interface/tsconfig.build.json" },
  { "path": "packages/schema/tsconfig.build.json" },
  { "path": "packages/test-fixtures/tsconfig.build.json" },
  { "path": "packages/worker/tsconfig.build.json" }
]
```

- [ ] **Step 4.7: Install to pick up the new workspace package**

```bash
pnpm install
```

Expected: pnpm adds symlinks for the new package. No registry downloads.

- [ ] **Step 4.8: Build the empty package**

```bash
pnpm -F @geoarrow/builder build
```

Expected: clean exit. `dist/index.js` and `dist/index.d.ts` both exist and are effectively empty.

- [ ] **Step 4.9: Run the (empty) test suite**

```bash
pnpm -F @geoarrow/builder test
```

Expected: vitest reports "No test files found" (exit code non-zero but the CLI will be explicit). This is fine — it tells you the test directory exists and the config is wired. If vitest errors with a config problem instead, fix the config first.

- [ ] **Step 4.10: Typecheck from repo root**

```bash
pnpm typecheck
```

Expected: clean exit across all packages including the new empty builder.

- [ ] **Step 4.11: Commit**

```bash
git add packages/builder tsconfig.json pnpm-lock.yaml
git commit -m "feat(builder): scaffold @geoarrow/builder package

Empty package with package.json, tsconfig, vitest config, and a
placeholder barrel. Subsequent tasks fill in the internal helpers
and the six geometry builders."
```

---

## Task 5: `BitmapBuilder` — lazy validity bitmap

**Why:** Arrow encodes nullability as a packed `Uint8Array`. `BitmapBuilder` starts with `buf === null` and only allocates on the first null, back-filling the preceding valid bits. See spec §Internal helpers → BitmapBuilder.

**Files:**
- Create: `packages/builder/src/internal/bitmap.ts`
- Create: `packages/builder/tests/internal/bitmap.test.ts`

- [ ] **Step 5.1: Write the failing test file**

Create `packages/builder/tests/internal/bitmap.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BitmapBuilder } from "../../src/internal/bitmap.js";

describe("BitmapBuilder", () => {
  it("returns undefined when no null has been appended", () => {
    const b = new BitmapBuilder(16);
    b.appendValid();
    b.appendValid();
    b.appendValid();
    expect(b.finish()).toBeUndefined();
  });

  it("allocates lazily on first null and back-fills prior valids", () => {
    const b = new BitmapBuilder(16);
    b.appendValid(); // idx 0
    b.appendValid(); // idx 1
    b.appendValid(); // idx 2
    b.appendValid(); // idx 3
    b.appendValid(); // idx 4
    b.appendNull(); // idx 5 - triggers allocation
    const buf = b.finish();
    expect(buf).toBeInstanceOf(Uint8Array);
    // byte 0 should have bits 0..4 set (valid) and bit 5 clear (null)
    // 0b0001_1111 = 0x1f
    expect(buf![0]).toBe(0x1f);
  });

  it("treats first-append-is-null correctly", () => {
    const b = new BitmapBuilder(8);
    b.appendNull();
    const buf = b.finish();
    expect(buf).toBeInstanceOf(Uint8Array);
    expect(buf![0] & 1).toBe(0);
  });

  it("allocates exactly once across many nulls", () => {
    const b = new BitmapBuilder(32);
    b.appendValid();
    b.appendNull();
    const firstBuf = b.finish();
    b.appendNull();
    b.appendNull();
    b.appendValid();
    const secondBuf = b.finish();
    expect(secondBuf).toBe(firstBuf); // same underlying buffer reference
  });

  it("respects Arrow's 1=valid / 0=null bit convention", () => {
    const b = new BitmapBuilder(8);
    b.appendValid();
    b.appendNull();
    b.appendValid();
    const buf = b.finish();
    expect(buf).toBeDefined();
    expect((buf![0] >> 0) & 1).toBe(1); // valid
    expect((buf![0] >> 1) & 1).toBe(0); // null
    expect((buf![0] >> 2) & 1).toBe(1); // valid
  });

  it("sizes the buffer based on capacity", () => {
    const b = new BitmapBuilder(17); // ceil(17/8) = 3 bytes
    b.appendNull();
    const buf = b.finish();
    expect(buf).toBeDefined();
    expect(buf!.length).toBe(3);
  });
});
```

- [ ] **Step 5.2: Run the test and verify it fails**

```bash
pnpm -F @geoarrow/builder test tests/internal/bitmap.test.ts
```

Expected: FAIL with a module-resolution error ("Cannot find module '../../src/internal/bitmap.js'" or similar).

- [ ] **Step 5.3: Write the implementation**

Create `packages/builder/src/internal/bitmap.ts`:

```ts
/**
 * Packed Arrow validity bitmap builder.
 *
 * Lazy: starts with `buf === null` and only allocates on the first null
 * append, back-filling the preceding positions as valid. For the common
 * all-valid case, `finish()` returns `undefined`, which is semantically
 * equivalent to a fully-set bitmap but one allocation smaller.
 *
 * Uses Arrow's standard bit convention: `1 = valid`, `0 = null`.
 */
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
    this.length++;
  }

  finish(): Uint8Array | undefined {
    return this.buf ?? undefined;
  }
}
```

- [ ] **Step 5.4: Run the test and verify it passes**

```bash
pnpm -F @geoarrow/builder test tests/internal/bitmap.test.ts
```

Expected: all six tests PASS.

- [ ] **Step 5.5: Typecheck**

```bash
pnpm -F @geoarrow/builder typecheck
```

Expected: clean exit.

- [ ] **Step 5.6: Commit**

```bash
git add packages/builder/src/internal/bitmap.ts packages/builder/tests/internal/bitmap.test.ts
git commit -m "feat(builder): add BitmapBuilder internal helper

Lazy Arrow validity bitmap. Starts with no buffer, allocates on
first null and back-fills prior valids. Returns undefined from
finish() when all rows were valid."
```

---

## Task 6: `OffsetsBuilder` — pre-sized Int32 running-sum offsets

**Why:** Every `List` level in GeoArrow layout needs an `Int32Array` offsets buffer of length `n + 1`, where `offsets[0] = 0` and each subsequent entry is a running sum of child counts. See spec §Internal helpers → OffsetsBuilder.

**Files:**
- Create: `packages/builder/src/internal/offsets.ts`
- Create: `packages/builder/tests/internal/offsets.test.ts`

- [ ] **Step 6.1: Write the failing test file**

Create `packages/builder/tests/internal/offsets.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { OffsetsBuilder } from "../../src/internal/offsets.js";

describe("OffsetsBuilder", () => {
  it("finish() returns an Int32Array of length capacity + 1", () => {
    const b = new OffsetsBuilder(4);
    b.appendLength(0);
    b.appendLength(0);
    b.appendLength(0);
    b.appendLength(0);
    const out = b.finish();
    expect(out).toBeInstanceOf(Int32Array);
    expect(out.length).toBe(5);
  });

  it("buf[0] is always 0", () => {
    const b = new OffsetsBuilder(1);
    b.appendLength(3);
    const out = b.finish();
    expect(out[0]).toBe(0);
  });

  it("computes a running sum from per-row lengths", () => {
    const b = new OffsetsBuilder(4);
    b.appendLength(2); // row 0 has 2 children
    b.appendLength(3); // row 1 has 3 children
    b.appendLength(0); // row 2 is empty
    b.appendLength(1); // row 3 has 1 child
    const out = b.finish();
    expect(Array.from(out)).toEqual([0, 2, 5, 5, 6]);
  });

  it("allows appending zero-length rows", () => {
    const b = new OffsetsBuilder(3);
    b.appendLength(0);
    b.appendLength(0);
    b.appendLength(0);
    const out = b.finish();
    expect(Array.from(out)).toEqual([0, 0, 0, 0]);
  });

  it("allows capacity of zero (empty column)", () => {
    const b = new OffsetsBuilder(0);
    const out = b.finish();
    expect(out.length).toBe(1);
    expect(out[0]).toBe(0);
  });
});
```

- [ ] **Step 6.2: Run the test and verify it fails**

```bash
pnpm -F @geoarrow/builder test tests/internal/offsets.test.ts
```

Expected: FAIL with a module-resolution error.

- [ ] **Step 6.3: Write the implementation**

Create `packages/builder/src/internal/offsets.ts`:

```ts
/**
 * Pre-sized Int32 running-sum offsets buffer for Arrow List levels.
 *
 * The buffer is always `capacity + 1` long, with `buf[0] = 0` and each
 * subsequent entry the running sum of per-row child counts. Callers push
 * the *delta* (child count) per row, not the absolute offset.
 */
export class OffsetsBuilder {
  private readonly buf: Int32Array;
  private pos = 1;

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

- [ ] **Step 6.4: Run the test and verify it passes**

```bash
pnpm -F @geoarrow/builder test tests/internal/offsets.test.ts
```

Expected: all five tests PASS.

- [ ] **Step 6.5: Typecheck**

```bash
pnpm -F @geoarrow/builder typecheck
```

Expected: clean exit.

- [ ] **Step 6.6: Commit**

```bash
git add packages/builder/src/internal/offsets.ts packages/builder/tests/internal/offsets.test.ts
git commit -m "feat(builder): add OffsetsBuilder internal helper

Pre-sized Int32 running-sum offsets buffer for Arrow List levels.
Callers push per-row deltas; the helper maintains the running sum."
```

---

## Task 7: `CoordBufferBuilder` — interleaved coord buffer

**Why:** Holds a single pre-sized `Float64Array` and appends coords one at a time. Returns a `Data<InterleavedCoord>` from `finish()` so geometry builders only see Arrow `Data`, not the raw typed array. See spec §Internal helpers → CoordBufferBuilder.

**Note on `pushEmpty`:** The spec acknowledges that an empty Point (a valid Point with `coord() === null`) needs representation in the Arrow layout as a coordinate slot filled with `NaN`. `PointBuilder` also needs to write a placeholder coord for null Points so the buffer `pos` stays aligned with the validity bitmap. The cleanest way to serve both is `CoordBufferBuilder.pushEmpty()`, which writes `NaN` for each ordinate and advances `pos` / `coordCount`. This is a minor extension beyond the spec's code sketch but matches the spec's "empty point" test requirement.

**Files:**
- Create: `packages/builder/src/internal/coord.ts`
- Create: `packages/builder/tests/internal/coord.test.ts`

- [ ] **Step 7.1: Write the failing test file**

Create `packages/builder/tests/internal/coord.test.ts`:

```ts
import { FixedSizeList, Float, type Data } from "apache-arrow";
import { RefCoord } from "@geoarrow/test-fixtures";
import type { InterleavedCoord } from "@geoarrow/schema";
import { describe, expect, it } from "vitest";
import { CoordBufferBuilder } from "../../src/internal/coord.js";

describe("CoordBufferBuilder", () => {
  it("pushes XY coords into the expected slots", () => {
    const b = new CoordBufferBuilder(3, "XY");
    b.pushCoord(new RefCoord([1, 2], "XY"));
    b.pushCoord(new RefCoord([3, 4], "XY"));
    b.pushCoord(new RefCoord([5, 6], "XY"));
    const data = b.finish();
    const values = data.children[0].values as Float64Array;
    expect(Array.from(values)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("pushes XYZ coords into the expected slots", () => {
    const b = new CoordBufferBuilder(2, "XYZ");
    b.pushCoord(new RefCoord([1, 2, 3], "XYZ"));
    b.pushCoord(new RefCoord([4, 5, 6], "XYZ"));
    const data = b.finish();
    const values = data.children[0].values as Float64Array;
    expect(Array.from(values)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("throws on dimension mismatch in pushCoord", () => {
    const b = new CoordBufferBuilder(1, "XY");
    expect(() => b.pushCoord(new RefCoord([1, 2, 3], "XYZ"))).toThrowError(
      /coord dimension mismatch/,
    );
  });

  it("pushEmpty writes NaN for each ordinate", () => {
    const b = new CoordBufferBuilder(2, "XY");
    b.pushCoord(new RefCoord([1, 2], "XY"));
    b.pushEmpty();
    const data = b.finish();
    const values = data.children[0].values as Float64Array;
    expect(values[0]).toBe(1);
    expect(values[1]).toBe(2);
    expect(Number.isNaN(values[2])).toBe(true);
    expect(Number.isNaN(values[3])).toBe(true);
  });

  it("finish() returns a Data<FixedSizeList> with listSize matching the dimension", () => {
    const b = new CoordBufferBuilder(2, "XYZ");
    b.pushCoord(new RefCoord([1, 2, 3], "XYZ"));
    b.pushCoord(new RefCoord([4, 5, 6], "XYZ"));
    const data: Data<InterleavedCoord> = b.finish();
    expect(data.type).toBeInstanceOf(FixedSizeList);
    expect((data.type as FixedSizeList<Float>).listSize).toBe(3);
    expect(data.length).toBe(2);
  });

  it("finish() wraps a Float64 child data of length coordCount * sizeOf(dim)", () => {
    const b = new CoordBufferBuilder(4, "XY");
    b.pushCoord(new RefCoord([1, 2], "XY"));
    b.pushCoord(new RefCoord([3, 4], "XY"));
    b.pushCoord(new RefCoord([5, 6], "XY"));
    b.pushCoord(new RefCoord([7, 8], "XY"));
    const data = b.finish();
    expect(data.children.length).toBe(1);
    expect(data.children[0].length).toBe(8);
  });
});
```

- [ ] **Step 7.2: Run the test and verify it fails**

```bash
pnpm -F @geoarrow/builder test tests/internal/coord.test.ts
```

Expected: FAIL with module-resolution error.

- [ ] **Step 7.3: Write the implementation**

Create `packages/builder/src/internal/coord.ts`:

```ts
import {
  type Data,
  type Float,
  Field,
  FixedSizeList,
  Float64,
  makeData,
} from "apache-arrow";
import {
  type CoordInterface,
  type Dimension,
  sizeOf,
} from "@geoarrow/geo-interface";
import type { InterleavedCoord } from "@geoarrow/schema";

export type CoordType = "interleaved";

/**
 * Pre-sized interleaved coordinate buffer.
 *
 * Holds a single Float64Array big enough for `capacity * sizeOf(dim)`
 * ordinates. `pushCoord` appends a full coordinate; `pushEmpty` writes
 * NaN for each ordinate (used by PointBuilder for null/empty points).
 *
 * `finish()` returns an Arrow `Data<InterleavedCoord>` (FixedSizeList<Float>
 * over a Float64 child). Geometry builders never see the underlying
 * typed array — they only see the Arrow `Data`, which they pass as a
 * child to their own `makeData` call.
 */
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

  pushEmpty(): void {
    const size = sizeOf(this.dim);
    for (let i = 0; i < size; i++) {
      this.buf[this.pos + i] = Number.NaN;
    }
    this.pos += size;
    this.coordCount++;
  }

  finish(): Data<InterleavedCoord> {
    const size = sizeOf(this.dim);
    const childType = new Float64();
    const listType = new FixedSizeList<Float>(
      size,
      new Field<Float>("xy", childType, false),
    );
    const childData = makeData({
      type: childType,
      length: this.coordCount * size,
      nullCount: 0,
      data: this.buf,
    });
    return makeData({
      type: listType,
      length: this.coordCount,
      nullCount: 0,
      child: childData,
    }) as Data<InterleavedCoord>;
  }
}
```

- [ ] **Step 7.4: Run the test and verify it passes**

```bash
pnpm -F @geoarrow/builder test tests/internal/coord.test.ts
```

Expected: all six tests PASS.

If the apache-arrow generic parameters fail to narrow (`FixedSizeList<Float>` / `Data<InterleavedCoord>` cast), read `packages/schema/src/type.ts`'s `InterleavedCoord` definition and see the comment there explaining why the child type has to be `arrow.Float` (not `Float64`) in the type — the runtime instance is `Float64` but the declared type is widened to `Float`. If vitest still complains, the `as Data<InterleavedCoord>` cast at the bottom should silence it.

- [ ] **Step 7.5: Typecheck**

```bash
pnpm -F @geoarrow/builder typecheck
```

Expected: clean exit.

- [ ] **Step 7.6: Commit**

```bash
git add packages/builder/src/internal/coord.ts packages/builder/tests/internal/coord.test.ts
git commit -m "feat(builder): add CoordBufferBuilder internal helper

Pre-sized interleaved Float64Array with pushCoord and pushEmpty
(NaN-padding for empty/null points). finish() returns a
Data<InterleavedCoord> so geometry builders never see the raw
typed array — key encapsulation for the separated-coord extension."
```

---

## Task 8: `PointCapacity` + `PointBuilder`

**Why:** PointBuilder is the simplest homogeneous builder — no offsets level, since `PointData = Data<FixedSizeList<Float>>` has no nested list. See spec §Capacity API → PointCapacity and §Builder API.

**Null / empty / valid Point encoding in GeoArrow:**
- Null row: validity bitmap bit = 0, coord slot written as NaN padding (via `pushEmpty`).
- Empty row (valid Point with `coord() === null`): validity bit = 1, coord slot written as NaN. Per the GeoArrow spec, empty points use NaN ordinates.
- Normal row: validity bit = 1, coord slot written as the actual coordinate.

**`pushGeometry` accept-set:** `Point`, `MultiPoint` with zero or one child. `MultiPoint` with zero children → empty Point (NaN padding, valid). `MultiPoint` with one child → unwrap and push. Two or more → throw.

**Files:**
- Create: `packages/builder/src/capacity/point.ts`
- Create: `packages/builder/src/point.ts`
- Create: `packages/builder/tests/capacity/point.test.ts`
- Create: `packages/builder/tests/point.test.ts`
- Modify: `packages/builder/src/index.ts`

- [ ] **Step 8.1: Write the PointCapacity test file**

Create `packages/builder/tests/capacity/point.test.ts`:

```ts
import { RefMultiPoint, RefPoint } from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import { PointCapacity } from "../../src/capacity/point.js";

describe("PointCapacity", () => {
  it("addPoint increments geomCapacity", () => {
    const c = new PointCapacity();
    c.addPoint(new RefPoint([1, 2], "XY"));
    c.addPoint(new RefPoint([3, 4], "XY"));
    c.addPoint(new RefPoint(null, "XY"));
    c.addPoint(null);
    expect(c.geomCapacity).toBe(4);
  });

  it("fromPoints walks an iterable", () => {
    const c = PointCapacity.fromPoints([
      new RefPoint([1, 2], "XY"),
      new RefPoint([3, 4], "XY"),
      null,
    ]);
    expect(c.geomCapacity).toBe(3);
  });

  it("addGeometry accepts Point", () => {
    const c = new PointCapacity();
    c.addGeometry(new RefPoint([1, 2], "XY"));
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry accepts null", () => {
    const c = new PointCapacity();
    c.addGeometry(null);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry accepts zero-item MultiPoint as empty Point", () => {
    const c = new PointCapacity();
    c.addGeometry(new RefMultiPoint([], "XY"));
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry accepts one-item MultiPoint as single Point", () => {
    const c = new PointCapacity();
    c.addGeometry(new RefMultiPoint([new RefPoint([1, 2], "XY")], "XY"));
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry throws on MultiPoint with 2+ children", () => {
    const c = new PointCapacity();
    const mp = new RefMultiPoint(
      [new RefPoint([1, 2], "XY"), new RefPoint([3, 4], "XY")],
      "XY",
    );
    expect(() => c.addGeometry(mp)).toThrowError(
      /PointCapacity\.addGeometry: MultiPoint with 2 items/,
    );
  });

  it("addGeometry throws on wrong geometry type", () => {
    const c = new PointCapacity();
    expect(() =>
      c.addGeometry({
        geometryType: "LineString",
        dim: () => "XY",
        numCoords: () => 0,
        coord: () => {
          throw new Error("unreachable");
        },
      } as any),
    ).toThrowError(/PointCapacity\.addGeometry: expected Point, got LineString/);
  });
});
```

- [ ] **Step 8.2: Run the failing test**

```bash
pnpm -F @geoarrow/builder test tests/capacity/point.test.ts
```

Expected: FAIL with module-resolution error.

- [ ] **Step 8.3: Write the PointCapacity implementation**

Create `packages/builder/src/capacity/point.ts`:

```ts
import type {
  GeometryInterface,
  MultiPointInterface,
  PointInterface,
} from "@geoarrow/geo-interface";

/**
 * Counting-pass capacity for PointBuilder.
 *
 * PointData is a FixedSizeList<Float> with no list level, so there is
 * only one counter: the number of Point rows. Each null, empty Point,
 * and valid Point occupies exactly one coord slot.
 */
export class PointCapacity {
  geomCapacity = 0;

  addPoint(_value: PointInterface | null): void {
    this.geomCapacity++;
  }

  addGeometry(value: GeometryInterface | null): void {
    if (value === null) {
      this.geomCapacity++;
      return;
    }
    switch (value.geometryType) {
      case "Point":
        this.addPoint(value);
        return;
      case "MultiPoint": {
        const mp: MultiPointInterface = value;
        const n = mp.numPoints();
        if (n === 0 || n === 1) {
          this.geomCapacity++;
        } else {
          throw new Error(
            `PointCapacity.addGeometry: MultiPoint with ${n} items cannot be unwrapped into a single Point`,
          );
        }
        return;
      }
      default:
        throw new Error(
          `PointCapacity.addGeometry: expected Point, got ${value.geometryType}`,
        );
    }
  }

  static fromPoints(
    iter: Iterable<PointInterface | null>,
  ): PointCapacity {
    const cap = new PointCapacity();
    for (const p of iter) cap.addPoint(p);
    return cap;
  }

  static fromGeometries(
    iter: Iterable<GeometryInterface | null>,
  ): PointCapacity {
    const cap = new PointCapacity();
    for (const g of iter) cap.addGeometry(g);
    return cap;
  }
}
```

- [ ] **Step 8.4: Run the capacity tests — expect pass**

```bash
pnpm -F @geoarrow/builder test tests/capacity/point.test.ts
```

Expected: all eight tests PASS.

- [ ] **Step 8.5: Write the PointBuilder test file**

Create `packages/builder/tests/point.test.ts`:

```ts
import { isPointData } from "@geoarrow/schema";
import { RefMultiPoint, RefPoint } from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import { PointCapacity } from "../src/capacity/point.js";
import { PointBuilder } from "../src/point.js";

describe("PointBuilder", () => {
  it("happy path, XY", () => {
    const points = [
      new RefPoint([1, 2], "XY"),
      new RefPoint([3, 4], "XY"),
      new RefPoint([5, 6], "XY"),
    ];
    const cap = PointCapacity.fromPoints(points);
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    for (const p of points) b.pushPoint(p);
    const data = b.finish();
    expect(data.length).toBe(3);
    expect(data.nullBitmap).toBeUndefined();
    expect(Array.from(data.children[0].values as Float64Array)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("happy path, XYZ", () => {
    const points = [
      new RefPoint([1, 2, 3], "XYZ"),
      new RefPoint([4, 5, 6], "XYZ"),
    ];
    const cap = PointCapacity.fromPoints(points);
    const b = PointBuilder.withCapacity({ dim: "XYZ" }, cap);
    for (const p of points) b.pushPoint(p);
    const data = b.finish();
    expect(data.length).toBe(2);
    expect(Array.from(data.children[0].values as Float64Array)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("null rows allocate the bitmap with Arrow 1=valid convention", () => {
    const cap = new PointCapacity();
    cap.addPoint(new RefPoint([1, 2], "XY"));
    cap.addPoint(null);
    cap.addPoint(new RefPoint([5, 6], "XY"));
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushPoint(new RefPoint([1, 2], "XY"));
    b.pushPoint(null);
    b.pushPoint(new RefPoint([5, 6], "XY"));
    const data = b.finish();
    expect(data.nullBitmap).toBeInstanceOf(Uint8Array);
    expect((data.nullBitmap![0] >> 0) & 1).toBe(1);
    expect((data.nullBitmap![0] >> 1) & 1).toBe(0);
    expect((data.nullBitmap![0] >> 2) & 1).toBe(1);
  });

  it("empty point (coord() === null) is valid with NaN ordinates", () => {
    const cap = new PointCapacity();
    cap.addPoint(new RefPoint([1, 2], "XY"));
    cap.addPoint(new RefPoint(null, "XY"));
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushPoint(new RefPoint([1, 2], "XY"));
    b.pushPoint(new RefPoint(null, "XY"));
    const data = b.finish();
    expect(data.nullBitmap).toBeUndefined();
    const values = data.children[0].values as Float64Array;
    expect(values[0]).toBe(1);
    expect(values[1]).toBe(2);
    expect(Number.isNaN(values[2])).toBe(true);
    expect(Number.isNaN(values[3])).toBe(true);
  });

  it("pushGeometry accepts Point directly", () => {
    const cap = new PointCapacity();
    cap.addGeometry(new RefPoint([1, 2], "XY"));
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(new RefPoint([1, 2], "XY"));
    const data = b.finish();
    expect(data.length).toBe(1);
  });

  it("pushGeometry unwraps a one-item MultiPoint", () => {
    const cap = new PointCapacity();
    cap.addGeometry(new RefMultiPoint([new RefPoint([1, 2], "XY")], "XY"));
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(new RefMultiPoint([new RefPoint([1, 2], "XY")], "XY"));
    const data = b.finish();
    expect(Array.from(data.children[0].values as Float64Array)).toEqual([
      1, 2,
    ]);
  });

  it("pushGeometry accepts an empty MultiPoint as an empty Point", () => {
    const cap = new PointCapacity();
    cap.addGeometry(new RefMultiPoint([], "XY"));
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(new RefMultiPoint([], "XY"));
    const data = b.finish();
    expect(data.length).toBe(1);
    expect(data.nullBitmap).toBeUndefined();
    const values = data.children[0].values as Float64Array;
    expect(Number.isNaN(values[0])).toBe(true);
    expect(Number.isNaN(values[1])).toBe(true);
  });

  it("pushGeometry throws on MultiPoint with 2+ children", () => {
    const cap = new PointCapacity();
    // Capacity walk should throw on the same input — verify both sides
    const mp = new RefMultiPoint(
      [new RefPoint([1, 2], "XY"), new RefPoint([3, 4], "XY")],
      "XY",
    );
    expect(() => cap.addGeometry(mp)).toThrowError(
      /PointCapacity\.addGeometry: MultiPoint with 2 items/,
    );
    // (Builder never sees this input because the walk rejects first, but
    // verify the builder's own defense here.)
    cap.addPoint(new RefPoint([0, 0], "XY")); // size for 1 row to keep withCapacity happy
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    expect(() => b.pushGeometry(mp)).toThrowError(
      /PointBuilder\.pushGeometry: MultiPoint with 2 items/,
    );
  });

  it("pushGeometry throws on wrong type", () => {
    const cap = new PointCapacity();
    cap.addPoint(null);
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    expect(() =>
      b.pushGeometry({
        geometryType: "LineString",
        dim: () => "XY",
        numCoords: () => 0,
        coord: () => {
          throw new Error("unreachable");
        },
      } as any),
    ).toThrowError(
      /PointBuilder\.pushGeometry: expected Point, got LineString/,
    );
  });

  it("coord dimension mismatch throws from CoordBufferBuilder", () => {
    const cap = new PointCapacity();
    cap.addPoint(null);
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    expect(() => b.pushPoint(new RefPoint([1, 2, 3], "XYZ"))).toThrowError(
      /coord dimension mismatch/,
    );
  });

  it("round trips through isPointData type guard", () => {
    const cap = new PointCapacity();
    cap.addPoint(new RefPoint([1, 2], "XY"));
    const b = PointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushPoint(new RefPoint([1, 2], "XY"));
    const data = b.finish();
    expect(isPointData(data)).toBe(true);
  });
});
```

- [ ] **Step 8.6: Run the builder test file — expect fail**

```bash
pnpm -F @geoarrow/builder test tests/point.test.ts
```

Expected: FAIL with module-resolution error.

- [ ] **Step 8.7: Write the PointBuilder implementation**

Create `packages/builder/src/point.ts`:

```ts
import type { Data } from "apache-arrow";
import type {
  Dimension,
  GeometryInterface,
  MultiPointInterface,
  PointInterface,
} from "@geoarrow/geo-interface";
import type { Point, PointData } from "@geoarrow/schema";
import { BitmapBuilder } from "./internal/bitmap.js";
import { CoordBufferBuilder } from "./internal/coord.js";
import type { PointCapacity } from "./capacity/point.js";

export interface PointBuilderOptions {
  dim: Dimension;
}

/**
 * Two-pass builder for a GeoArrow Point column.
 *
 * PointData is a FixedSizeList<Float> — no list level. The coord buffer
 * has one slot per row; null and empty Points both occupy a slot with
 * NaN padding (the validity bitmap distinguishes them).
 */
export class PointBuilder {
  private readonly coords: CoordBufferBuilder;
  private readonly validity: BitmapBuilder;
  readonly dim: Dimension;

  private constructor(opts: PointBuilderOptions, capacity: PointCapacity) {
    this.dim = opts.dim;
    this.coords = new CoordBufferBuilder(capacity.geomCapacity, opts.dim);
    this.validity = new BitmapBuilder(capacity.geomCapacity);
  }

  static withCapacity(
    opts: PointBuilderOptions,
    capacity: PointCapacity,
  ): PointBuilder {
    return new PointBuilder(opts, capacity);
  }

  pushPoint(value: PointInterface | null): void {
    if (value === null) {
      this.coords.pushEmpty();
      this.validity.appendNull();
      return;
    }
    const coord = value.coord();
    if (coord === null) {
      this.coords.pushEmpty();
      this.validity.appendValid();
      return;
    }
    this.coords.pushCoord(coord);
    this.validity.appendValid();
  }

  pushGeometry(value: GeometryInterface | null): void {
    if (value === null) {
      this.pushPoint(null);
      return;
    }
    switch (value.geometryType) {
      case "Point":
        this.pushPoint(value);
        return;
      case "MultiPoint": {
        const mp: MultiPointInterface = value;
        const n = mp.numPoints();
        if (n === 0) {
          this.coords.pushEmpty();
          this.validity.appendValid();
        } else if (n === 1) {
          this.pushPoint(mp.point(0));
        } else {
          throw new Error(
            `PointBuilder.pushGeometry: MultiPoint with ${n} items cannot be unwrapped into a single Point`,
          );
        }
        return;
      }
      default:
        throw new Error(
          `PointBuilder.pushGeometry: expected Point, got ${value.geometryType}`,
        );
    }
  }

  finish(): PointData {
    const coordData = this.coords.finish();
    const nullBitmap = this.validity.finish();
    // PointData = Data<Point> = Data<FixedSizeList<Float>>, which is
    // structurally identical to the CoordBufferBuilder's output — we
    // just need to attach the validity bitmap.
    return {
      ...coordData,
      nullBitmap,
    } as Data<Point> as PointData;
  }
}
```

**Note on `finish()`:** The spec says `PointBuilder.finish()` returns the coord Data wrapped as PointData. `CoordBufferBuilder.finish()` already produces a `Data<FixedSizeList<Float>>`, which is exactly what `PointData = Data<Point> = Data<FixedSizeList<Float>>` is. The only thing we need to add is the validity bitmap — apache-arrow `Data` instances are plain objects, so a shallow spread with an overridden `nullBitmap` is legal. If the spread pattern triggers a TypeScript friction, use `makeData` to rebuild the Data explicitly.

- [ ] **Step 8.8: Run the builder tests — expect pass**

```bash
pnpm -F @geoarrow/builder test tests/point.test.ts
```

Expected: all twelve tests PASS. If the `finish()` spread approach produces a TS or runtime error, fall back to:

```ts
import { makeData } from "apache-arrow";
// ...
finish(): PointData {
  const coordData = this.coords.finish();
  const nullBitmap = this.validity.finish();
  return makeData({
    type: coordData.type,
    length: coordData.length,
    nullBitmap,
    child: coordData.children[0],
  }) as PointData;
}
```

- [ ] **Step 8.9: Update the barrel**

Edit `packages/builder/src/index.ts`:

```ts
export { PointCapacity } from "./capacity/point.js";
export { PointBuilder, type PointBuilderOptions } from "./point.js";
```

- [ ] **Step 8.10: Typecheck from repo root**

```bash
pnpm typecheck
```

Expected: clean exit.

- [ ] **Step 8.11: Commit**

```bash
git add packages/builder
git commit -m "feat(builder): add PointCapacity and PointBuilder

First geometry builder. PointData has no offset level, so the
builder only composes CoordBufferBuilder and BitmapBuilder. Nulls
and empty Points both occupy a coord slot with NaN padding; the
validity bitmap distinguishes them."
```

---

## Task 9: `LineStringCapacity` + `LineStringBuilder`

**Why:** The canonical builder shape — a single `OffsetsBuilder` level (geoms → coords) plus a `CoordBufferBuilder` and a `BitmapBuilder`. This is the pattern every subsequent homogeneous-list builder reuses. See spec §Builder API → Canonical example.

**`pushGeometry` accept-set:** `LineString`; `MultiLineString` with zero or one child. Zero → empty (valid) LineString; one → unwrap; 2+ → throw.

**Files:**
- Create: `packages/builder/src/capacity/linestring.ts`
- Create: `packages/builder/src/linestring.ts`
- Create: `packages/builder/tests/capacity/linestring.test.ts`
- Create: `packages/builder/tests/linestring.test.ts`
- Modify: `packages/builder/src/index.ts`

- [ ] **Step 9.1: Write the LineStringCapacity test file**

Create `packages/builder/tests/capacity/linestring.test.ts`:

```ts
import {
  RefLineString,
  RefMultiLineString,
  RefPoint,
} from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import { LineStringCapacity } from "../../src/capacity/linestring.js";

describe("LineStringCapacity", () => {
  it("addLineString sums coord counts and increments geom count", () => {
    const c = new LineStringCapacity();
    c.addLineString(
      new RefLineString(
        [
          [1, 2],
          [3, 4],
        ],
        "XY",
      ),
    );
    c.addLineString(
      new RefLineString(
        [
          [5, 6],
          [7, 8],
          [9, 10],
        ],
        "XY",
      ),
    );
    expect(c.coordCapacity).toBe(5);
    expect(c.geomCapacity).toBe(2);
  });

  it("addLineString(null) increments geomCapacity only", () => {
    const c = new LineStringCapacity();
    c.addLineString(null);
    expect(c.coordCapacity).toBe(0);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry accepts LineString", () => {
    const c = new LineStringCapacity();
    c.addGeometry(
      new RefLineString(
        [
          [1, 2],
          [3, 4],
        ],
        "XY",
      ),
    );
    expect(c.coordCapacity).toBe(2);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry unwraps a one-item MultiLineString", () => {
    const c = new LineStringCapacity();
    const ls = new RefLineString(
      [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
      "XY",
    );
    c.addGeometry(new RefMultiLineString([ls], "XY"));
    expect(c.coordCapacity).toBe(3);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry accepts zero-item MultiLineString as empty LineString", () => {
    const c = new LineStringCapacity();
    c.addGeometry(new RefMultiLineString([], "XY"));
    expect(c.coordCapacity).toBe(0);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry throws on MultiLineString with 2+ children", () => {
    const c = new LineStringCapacity();
    const ls1 = new RefLineString(
      [
        [1, 2],
        [3, 4],
      ],
      "XY",
    );
    const ls2 = new RefLineString(
      [
        [5, 6],
        [7, 8],
      ],
      "XY",
    );
    expect(() =>
      c.addGeometry(new RefMultiLineString([ls1, ls2], "XY")),
    ).toThrowError(
      /LineStringCapacity\.addGeometry: MultiLineString with 2 items/,
    );
  });

  it("addGeometry throws on wrong geometry type", () => {
    const c = new LineStringCapacity();
    expect(() => c.addGeometry(new RefPoint([1, 2], "XY"))).toThrowError(
      /LineStringCapacity\.addGeometry: expected LineString, got Point/,
    );
  });

  it("fromLineStrings walks an iterable", () => {
    const c = LineStringCapacity.fromLineStrings([
      new RefLineString(
        [
          [0, 0],
          [1, 1],
        ],
        "XY",
      ),
      null,
      new RefLineString(
        [
          [2, 2],
          [3, 3],
          [4, 4],
        ],
        "XY",
      ),
    ]);
    expect(c.coordCapacity).toBe(5);
    expect(c.geomCapacity).toBe(3);
  });
});
```

- [ ] **Step 9.2: Run the failing test**

```bash
pnpm -F @geoarrow/builder test tests/capacity/linestring.test.ts
```

Expected: FAIL.

- [ ] **Step 9.3: Write the LineStringCapacity implementation**

Create `packages/builder/src/capacity/linestring.ts`:

```ts
import type {
  GeometryInterface,
  LineStringInterface,
  MultiLineStringInterface,
} from "@geoarrow/geo-interface";

/**
 * Counting-pass capacity for LineStringBuilder.
 *
 * Accumulates total coord count (for the Float64Array) and total geom
 * count (for the geom offsets buffer + validity bitmap). Mirrors
 * LineStringBuilder.pushGeometry's accept-set exactly.
 */
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

- [ ] **Step 9.4: Run the capacity tests — expect pass**

```bash
pnpm -F @geoarrow/builder test tests/capacity/linestring.test.ts
```

Expected: all eight tests PASS.

- [ ] **Step 9.5: Write the LineStringBuilder test file**

Create `packages/builder/tests/linestring.test.ts`:

```ts
import { isLineStringData } from "@geoarrow/schema";
import {
  RefLineString,
  RefMultiLineString,
  RefPoint,
} from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import { LineStringCapacity } from "../src/capacity/linestring.js";
import { LineStringBuilder } from "../src/linestring.js";

describe("LineStringBuilder", () => {
  it("happy path, XY", () => {
    const lines = [
      new RefLineString(
        [
          [1, 2],
          [3, 4],
        ],
        "XY",
      ),
      new RefLineString(
        [
          [5, 6],
          [7, 8],
          [9, 10],
        ],
        "XY",
      ),
    ];
    const cap = LineStringCapacity.fromLineStrings(lines);
    const b = LineStringBuilder.withCapacity({ dim: "XY" }, cap);
    for (const ls of lines) b.pushLineString(ls);
    const data = b.finish();
    expect(data.length).toBe(2);
    expect(Array.from(data.valueOffsets)).toEqual([0, 2, 5]);
    expect(data.nullBitmap).toBeUndefined();
    expect(
      Array.from(data.children[0].children[0].values as Float64Array),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("happy path, XYZ", () => {
    const ls = new RefLineString(
      [
        [1, 2, 3],
        [4, 5, 6],
      ],
      "XYZ",
    );
    const cap = LineStringCapacity.fromLineStrings([ls]);
    const b = LineStringBuilder.withCapacity({ dim: "XYZ" }, cap);
    b.pushLineString(ls);
    const data = b.finish();
    expect(data.length).toBe(1);
    expect(
      Array.from(data.children[0].children[0].values as Float64Array),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("null rows allocate the bitmap", () => {
    const cap = new LineStringCapacity();
    cap.addLineString(new RefLineString([[1, 2]], "XY"));
    cap.addLineString(null);
    cap.addLineString(new RefLineString([[5, 6]], "XY"));
    const b = LineStringBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushLineString(new RefLineString([[1, 2]], "XY"));
    b.pushLineString(null);
    b.pushLineString(new RefLineString([[5, 6]], "XY"));
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1, 1, 2]);
    expect(data.nullBitmap).toBeInstanceOf(Uint8Array);
    expect((data.nullBitmap![0] >> 0) & 1).toBe(1);
    expect((data.nullBitmap![0] >> 1) & 1).toBe(0);
    expect((data.nullBitmap![0] >> 2) & 1).toBe(1);
  });

  it("empty line string (numCoords === 0) is a valid row with offset delta zero", () => {
    const cap = new LineStringCapacity();
    cap.addLineString(new RefLineString([[1, 2]], "XY"));
    cap.addLineString(new RefLineString([], "XY"));
    const b = LineStringBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushLineString(new RefLineString([[1, 2]], "XY"));
    b.pushLineString(new RefLineString([], "XY"));
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1, 1]);
    expect(data.nullBitmap).toBeUndefined();
  });

  it("pushGeometry accepts LineString directly", () => {
    const cap = new LineStringCapacity();
    cap.addGeometry(
      new RefLineString(
        [
          [1, 2],
          [3, 4],
        ],
        "XY",
      ),
    );
    const b = LineStringBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(
      new RefLineString(
        [
          [1, 2],
          [3, 4],
        ],
        "XY",
      ),
    );
    const data = b.finish();
    expect(data.length).toBe(1);
    expect(Array.from(data.valueOffsets)).toEqual([0, 2]);
  });

  it("pushGeometry unwraps a one-item MultiLineString", () => {
    const ls = new RefLineString(
      [
        [1, 2],
        [3, 4],
      ],
      "XY",
    );
    const cap = new LineStringCapacity();
    cap.addGeometry(new RefMultiLineString([ls], "XY"));
    const b = LineStringBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(new RefMultiLineString([ls], "XY"));
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 2]);
  });

  it("pushGeometry accepts an empty MultiLineString as an empty LineString", () => {
    const cap = new LineStringCapacity();
    cap.addGeometry(new RefMultiLineString([], "XY"));
    const b = LineStringBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(new RefMultiLineString([], "XY"));
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 0]);
    expect(data.nullBitmap).toBeUndefined();
  });

  it("pushGeometry throws on MultiLineString with 2+ children", () => {
    const cap = new LineStringCapacity();
    cap.addLineString(null);
    const b = LineStringBuilder.withCapacity({ dim: "XY" }, cap);
    const mls = new RefMultiLineString(
      [
        new RefLineString([[1, 2]], "XY"),
        new RefLineString([[3, 4]], "XY"),
      ],
      "XY",
    );
    expect(() => b.pushGeometry(mls)).toThrowError(
      /LineStringBuilder\.pushGeometry: MultiLineString with 2 items/,
    );
  });

  it("pushGeometry throws on wrong type", () => {
    const cap = new LineStringCapacity();
    cap.addLineString(null);
    const b = LineStringBuilder.withCapacity({ dim: "XY" }, cap);
    expect(() => b.pushGeometry(new RefPoint([1, 2], "XY"))).toThrowError(
      /LineStringBuilder\.pushGeometry: expected LineString, got Point/,
    );
  });

  it("coord dimension mismatch throws from CoordBufferBuilder", () => {
    const cap = new LineStringCapacity();
    cap.addLineString(new RefLineString([[1, 2]], "XY"));
    const b = LineStringBuilder.withCapacity({ dim: "XY" }, cap);
    expect(() =>
      b.pushLineString(new RefLineString([[1, 2, 3]], "XYZ")),
    ).toThrowError(/coord dimension mismatch/);
  });

  it("round trips through isLineStringData type guard", () => {
    const ls = new RefLineString(
      [
        [1, 2],
        [3, 4],
      ],
      "XY",
    );
    const cap = LineStringCapacity.fromLineStrings([ls]);
    const b = LineStringBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushLineString(ls);
    const data = b.finish();
    expect(isLineStringData(data)).toBe(true);
  });
});
```

- [ ] **Step 9.6: Run the builder test — expect fail**

```bash
pnpm -F @geoarrow/builder test tests/linestring.test.ts
```

Expected: FAIL with module-resolution error.

- [ ] **Step 9.7: Write the LineStringBuilder implementation**

Create `packages/builder/src/linestring.ts`:

```ts
import { Field, List, makeData } from "apache-arrow";
import type {
  Dimension,
  GeometryInterface,
  LineStringInterface,
  MultiLineStringInterface,
} from "@geoarrow/geo-interface";
import type { LineString, LineStringData } from "@geoarrow/schema";
import { BitmapBuilder } from "./internal/bitmap.js";
import { CoordBufferBuilder } from "./internal/coord.js";
import { OffsetsBuilder } from "./internal/offsets.js";
import type { LineStringCapacity } from "./capacity/linestring.js";

export interface LineStringBuilderOptions {
  dim: Dimension;
}

/**
 * Two-pass builder for a GeoArrow LineString column.
 *
 * LineString layout is List<Coord>: one offsets level over a Coord
 * child. This is the canonical pattern — PolygonBuilder adds another
 * offsets level on top, MultiLineStringBuilder adds one at the outside,
 * and MultiPolygonBuilder adds two.
 */
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
    const listType = new List<LineString["TChild"]>(
      new Field("item", coordData.type, false),
    );
    return makeData({
      type: listType,
      length,
      nullBitmap,
      valueOffsets,
      child: coordData,
    }) as LineStringData;
  }
}
```

- [ ] **Step 9.8: Run the builder tests — expect pass**

```bash
pnpm -F @geoarrow/builder test tests/linestring.test.ts
```

Expected: all eleven tests PASS.

- [ ] **Step 9.9: Update the barrel**

Edit `packages/builder/src/index.ts` — append:

```ts
export { LineStringCapacity } from "./capacity/linestring.js";
export {
  LineStringBuilder,
  type LineStringBuilderOptions,
} from "./linestring.js";
```

- [ ] **Step 9.10: Typecheck**

```bash
pnpm typecheck
```

Expected: clean exit.

- [ ] **Step 9.11: Commit**

```bash
git add packages/builder
git commit -m "feat(builder): add LineStringCapacity and LineStringBuilder

The canonical one-offsets-level builder. Composes
CoordBufferBuilder, one OffsetsBuilder for geoms-to-coords, and a
BitmapBuilder. pushGeometry unwraps single-item MultiLineStrings."
```

---

## Task 10: `MultiPointCapacity` + `MultiPointBuilder`

**Why:** MultiPoint is structurally identical to LineString at the Arrow level — `MultiPoint = List<Coord>` — but the push path iterates `multiPoint.point(i).coord()` and has to cope with empty Points (point with `coord() === null`). See spec §Builder shape variations.

**Key differences from LineStringBuilder:**
- `addMultiPoint` / `pushMultiPoint` iterate via `mp.point(i)` and then `pt.coord()`.
- Each inner Point may be empty (`coord() === null`); empty inner Points are written as NaN via `CoordBufferBuilder.pushEmpty()`, and still count as one coord slot (the outer offset advances by `numPoints()`, not by "non-empty points").
- `pushGeometry` accepts `Point` (promoted to a 1-item multi) instead of unwrapping multis.

**Files:**
- Create: `packages/builder/src/capacity/multipoint.ts`
- Create: `packages/builder/src/multipoint.ts`
- Create: `packages/builder/tests/capacity/multipoint.test.ts`
- Create: `packages/builder/tests/multipoint.test.ts`
- Modify: `packages/builder/src/index.ts`

- [ ] **Step 10.1: Write the MultiPointCapacity test file**

Create `packages/builder/tests/capacity/multipoint.test.ts`:

```ts
import {
  RefLineString,
  RefMultiPoint,
  RefPoint,
} from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import { MultiPointCapacity } from "../../src/capacity/multipoint.js";

describe("MultiPointCapacity", () => {
  it("addMultiPoint sums point counts and increments geom count", () => {
    const c = new MultiPointCapacity();
    c.addMultiPoint(
      new RefMultiPoint(
        [new RefPoint([1, 2], "XY"), new RefPoint([3, 4], "XY")],
        "XY",
      ),
    );
    c.addMultiPoint(new RefMultiPoint([new RefPoint([5, 6], "XY")], "XY"));
    expect(c.coordCapacity).toBe(3);
    expect(c.geomCapacity).toBe(2);
  });

  it("addMultiPoint(null) increments geomCapacity only", () => {
    const c = new MultiPointCapacity();
    c.addMultiPoint(null);
    expect(c.coordCapacity).toBe(0);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry accepts MultiPoint", () => {
    const c = new MultiPointCapacity();
    c.addGeometry(
      new RefMultiPoint(
        [new RefPoint([1, 2], "XY"), new RefPoint([3, 4], "XY")],
        "XY",
      ),
    );
    expect(c.coordCapacity).toBe(2);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry promotes a single Point to a 1-item MultiPoint", () => {
    const c = new MultiPointCapacity();
    c.addGeometry(new RefPoint([1, 2], "XY"));
    expect(c.coordCapacity).toBe(1);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry counts an empty Point (coord === null) as a 1-slot multipoint", () => {
    const c = new MultiPointCapacity();
    c.addGeometry(new RefPoint(null, "XY"));
    expect(c.coordCapacity).toBe(1);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry throws on wrong geometry type", () => {
    const c = new MultiPointCapacity();
    expect(() =>
      c.addGeometry(new RefLineString([[1, 2]], "XY")),
    ).toThrowError(
      /MultiPointCapacity\.addGeometry: expected MultiPoint, got LineString/,
    );
  });

  it("fromMultiPoints walks an iterable", () => {
    const c = MultiPointCapacity.fromMultiPoints([
      new RefMultiPoint([new RefPoint([1, 2], "XY")], "XY"),
      null,
      new RefMultiPoint(
        [new RefPoint([3, 4], "XY"), new RefPoint([5, 6], "XY")],
        "XY",
      ),
    ]);
    expect(c.coordCapacity).toBe(3);
    expect(c.geomCapacity).toBe(3);
  });
});
```

- [ ] **Step 10.2: Run, expect fail**

```bash
pnpm -F @geoarrow/builder test tests/capacity/multipoint.test.ts
```

- [ ] **Step 10.3: Write the MultiPointCapacity implementation**

Create `packages/builder/src/capacity/multipoint.ts`:

```ts
import type {
  GeometryInterface,
  MultiPointInterface,
  PointInterface,
} from "@geoarrow/geo-interface";

/**
 * Counting-pass capacity for MultiPointBuilder.
 *
 * coordCapacity counts every inner Point (including empty Points)
 * because each occupies one slot in the Float64Array. geomCapacity
 * counts the outer MultiPoint rows.
 */
export class MultiPointCapacity {
  coordCapacity = 0;
  geomCapacity = 0;

  addMultiPoint(value: MultiPointInterface | null): void {
    this.geomCapacity++;
    if (value !== null) {
      this.coordCapacity += value.numPoints();
    }
  }

  addGeometry(value: GeometryInterface | null): void {
    if (value === null) {
      this.geomCapacity++;
      return;
    }
    switch (value.geometryType) {
      case "MultiPoint":
        this.addMultiPoint(value);
        return;
      case "Point": {
        const _p: PointInterface = value;
        // A single Point promotes to a 1-item MultiPoint, regardless of
        // whether the Point is empty. Either way it's one coord slot.
        this.geomCapacity++;
        this.coordCapacity += 1;
        return;
      }
      default:
        throw new Error(
          `MultiPointCapacity.addGeometry: expected MultiPoint, got ${value.geometryType}`,
        );
    }
  }

  static fromMultiPoints(
    iter: Iterable<MultiPointInterface | null>,
  ): MultiPointCapacity {
    const cap = new MultiPointCapacity();
    for (const mp of iter) cap.addMultiPoint(mp);
    return cap;
  }

  static fromGeometries(
    iter: Iterable<GeometryInterface | null>,
  ): MultiPointCapacity {
    const cap = new MultiPointCapacity();
    for (const g of iter) cap.addGeometry(g);
    return cap;
  }
}
```

- [ ] **Step 10.4: Run, expect pass**

```bash
pnpm -F @geoarrow/builder test tests/capacity/multipoint.test.ts
```

- [ ] **Step 10.5: Write the MultiPointBuilder test file**

Create `packages/builder/tests/multipoint.test.ts`:

```ts
import { isMultiPointData } from "@geoarrow/schema";
import {
  RefLineString,
  RefMultiPoint,
  RefPoint,
} from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import { MultiPointCapacity } from "../src/capacity/multipoint.js";
import { MultiPointBuilder } from "../src/multipoint.js";

describe("MultiPointBuilder", () => {
  it("happy path, XY", () => {
    const mp1 = new RefMultiPoint(
      [new RefPoint([1, 2], "XY"), new RefPoint([3, 4], "XY")],
      "XY",
    );
    const mp2 = new RefMultiPoint([new RefPoint([5, 6], "XY")], "XY");
    const cap = MultiPointCapacity.fromMultiPoints([mp1, mp2]);
    const b = MultiPointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushMultiPoint(mp1);
    b.pushMultiPoint(mp2);
    const data = b.finish();
    expect(data.length).toBe(2);
    expect(Array.from(data.valueOffsets)).toEqual([0, 2, 3]);
    expect(
      Array.from(data.children[0].children[0].values as Float64Array),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("happy path, XYZ", () => {
    const mp = new RefMultiPoint([new RefPoint([1, 2, 3], "XYZ")], "XYZ");
    const cap = MultiPointCapacity.fromMultiPoints([mp]);
    const b = MultiPointBuilder.withCapacity({ dim: "XYZ" }, cap);
    b.pushMultiPoint(mp);
    const data = b.finish();
    expect(
      Array.from(data.children[0].children[0].values as Float64Array),
    ).toEqual([1, 2, 3]);
  });

  it("null row: geom offset delta zero and bitmap bit 0", () => {
    const cap = new MultiPointCapacity();
    cap.addMultiPoint(new RefMultiPoint([new RefPoint([1, 2], "XY")], "XY"));
    cap.addMultiPoint(null);
    const b = MultiPointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushMultiPoint(new RefMultiPoint([new RefPoint([1, 2], "XY")], "XY"));
    b.pushMultiPoint(null);
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1, 1]);
    expect(data.nullBitmap).toBeInstanceOf(Uint8Array);
    expect((data.nullBitmap![0] >> 0) & 1).toBe(1);
    expect((data.nullBitmap![0] >> 1) & 1).toBe(0);
  });

  it("empty multipoint (numPoints === 0) is a valid row with delta zero", () => {
    const cap = new MultiPointCapacity();
    cap.addMultiPoint(new RefMultiPoint([], "XY"));
    const b = MultiPointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushMultiPoint(new RefMultiPoint([], "XY"));
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 0]);
    expect(data.nullBitmap).toBeUndefined();
  });

  it("inner empty Point (coord === null) writes NaN padding and advances offset", () => {
    const mp = new RefMultiPoint(
      [new RefPoint([1, 2], "XY"), new RefPoint(null, "XY")],
      "XY",
    );
    const cap = MultiPointCapacity.fromMultiPoints([mp]);
    const b = MultiPointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushMultiPoint(mp);
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 2]);
    const values = data.children[0].children[0].values as Float64Array;
    expect(values[0]).toBe(1);
    expect(values[1]).toBe(2);
    expect(Number.isNaN(values[2])).toBe(true);
    expect(Number.isNaN(values[3])).toBe(true);
  });

  it("pushGeometry accepts MultiPoint directly", () => {
    const mp = new RefMultiPoint([new RefPoint([1, 2], "XY")], "XY");
    const cap = new MultiPointCapacity();
    cap.addGeometry(mp);
    const b = MultiPointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(mp);
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1]);
  });

  it("pushGeometry promotes a Point into a 1-item MultiPoint", () => {
    const cap = new MultiPointCapacity();
    cap.addGeometry(new RefPoint([1, 2], "XY"));
    const b = MultiPointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(new RefPoint([1, 2], "XY"));
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1]);
    expect(
      Array.from(data.children[0].children[0].values as Float64Array),
    ).toEqual([1, 2]);
  });

  it("pushGeometry promotes an empty Point as a 1-slot MultiPoint with NaN", () => {
    const cap = new MultiPointCapacity();
    cap.addGeometry(new RefPoint(null, "XY"));
    const b = MultiPointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(new RefPoint(null, "XY"));
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1]);
    const values = data.children[0].children[0].values as Float64Array;
    expect(Number.isNaN(values[0])).toBe(true);
    expect(Number.isNaN(values[1])).toBe(true);
  });

  it("pushGeometry throws on wrong type", () => {
    const cap = new MultiPointCapacity();
    cap.addMultiPoint(null);
    const b = MultiPointBuilder.withCapacity({ dim: "XY" }, cap);
    expect(() =>
      b.pushGeometry(new RefLineString([[1, 2]], "XY")),
    ).toThrowError(
      /MultiPointBuilder\.pushGeometry: expected MultiPoint, got LineString/,
    );
  });

  it("round trips through isMultiPointData type guard", () => {
    const mp = new RefMultiPoint([new RefPoint([1, 2], "XY")], "XY");
    const cap = MultiPointCapacity.fromMultiPoints([mp]);
    const b = MultiPointBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushMultiPoint(mp);
    const data = b.finish();
    expect(isMultiPointData(data)).toBe(true);
  });
});
```

- [ ] **Step 10.6: Run, expect fail**

```bash
pnpm -F @geoarrow/builder test tests/multipoint.test.ts
```

- [ ] **Step 10.7: Write the MultiPointBuilder implementation**

Create `packages/builder/src/multipoint.ts`:

```ts
import { Field, List, makeData } from "apache-arrow";
import type {
  Dimension,
  GeometryInterface,
  MultiPointInterface,
  PointInterface,
} from "@geoarrow/geo-interface";
import type { MultiPoint, MultiPointData } from "@geoarrow/schema";
import { BitmapBuilder } from "./internal/bitmap.js";
import { CoordBufferBuilder } from "./internal/coord.js";
import { OffsetsBuilder } from "./internal/offsets.js";
import type { MultiPointCapacity } from "./capacity/multipoint.js";

export interface MultiPointBuilderOptions {
  dim: Dimension;
}

/**
 * Two-pass builder for a GeoArrow MultiPoint column.
 *
 * Structurally identical to LineStringBuilder at the Arrow level
 * (List<Coord>), but the push path iterates `mp.point(i).coord()`
 * and handles empty inner Points by writing NaN padding.
 */
export class MultiPointBuilder {
  private readonly coords: CoordBufferBuilder;
  private readonly geomOffsets: OffsetsBuilder;
  private readonly validity: BitmapBuilder;
  readonly dim: Dimension;

  private constructor(
    opts: MultiPointBuilderOptions,
    capacity: MultiPointCapacity,
  ) {
    this.dim = opts.dim;
    this.coords = new CoordBufferBuilder(capacity.coordCapacity, opts.dim);
    this.geomOffsets = new OffsetsBuilder(capacity.geomCapacity);
    this.validity = new BitmapBuilder(capacity.geomCapacity);
  }

  static withCapacity(
    opts: MultiPointBuilderOptions,
    capacity: MultiPointCapacity,
  ): MultiPointBuilder {
    return new MultiPointBuilder(opts, capacity);
  }

  pushMultiPoint(value: MultiPointInterface | null): void {
    if (value === null) {
      this.geomOffsets.appendLength(0);
      this.validity.appendNull();
      return;
    }
    const n = value.numPoints();
    for (let i = 0; i < n; i++) {
      const pt = value.point(i);
      const coord = pt.coord();
      if (coord === null) {
        this.coords.pushEmpty();
      } else {
        this.coords.pushCoord(coord);
      }
    }
    this.geomOffsets.appendLength(n);
    this.validity.appendValid();
  }

  pushGeometry(value: GeometryInterface | null): void {
    if (value === null) {
      this.pushMultiPoint(null);
      return;
    }
    switch (value.geometryType) {
      case "MultiPoint":
        this.pushMultiPoint(value);
        return;
      case "Point": {
        const pt: PointInterface = value;
        const coord = pt.coord();
        if (coord === null) {
          this.coords.pushEmpty();
        } else {
          this.coords.pushCoord(coord);
        }
        this.geomOffsets.appendLength(1);
        this.validity.appendValid();
        return;
      }
      default:
        throw new Error(
          `MultiPointBuilder.pushGeometry: expected MultiPoint, got ${value.geometryType}`,
        );
    }
  }

  finish(): MultiPointData {
    const coordData = this.coords.finish();
    const valueOffsets = this.geomOffsets.finish();
    const nullBitmap = this.validity.finish();
    const length = valueOffsets.length - 1;
    const listType = new List<MultiPoint["TChild"]>(
      new Field("item", coordData.type, false),
    );
    return makeData({
      type: listType,
      length,
      nullBitmap,
      valueOffsets,
      child: coordData,
    }) as MultiPointData;
  }
}
```

- [ ] **Step 10.8: Run, expect pass**

```bash
pnpm -F @geoarrow/builder test tests/multipoint.test.ts
```

- [ ] **Step 10.9: Update the barrel**

Append to `packages/builder/src/index.ts`:

```ts
export { MultiPointCapacity } from "./capacity/multipoint.js";
export {
  MultiPointBuilder,
  type MultiPointBuilderOptions,
} from "./multipoint.js";
```

- [ ] **Step 10.10: Typecheck and commit**

```bash
pnpm typecheck
git add packages/builder
git commit -m "feat(builder): add MultiPointCapacity and MultiPointBuilder

Structurally identical to LineStringBuilder at the Arrow level.
Iterates mp.point(i).coord() on the push path, writing NaN
padding for inner empty Points. pushGeometry promotes single
Points into 1-item multipoints."
```

---

## Task 11: `PolygonCapacity` + `PolygonBuilder`

**Why:** Polygon = `List<List<Coord>>`: two offsets levels (ring → coords, geom → rings). PolygonBuilder composes `CoordBufferBuilder`, 2 `OffsetsBuilder` instances, and a `BitmapBuilder`. See spec §Builder shape variations.

**Polygon layout rules:**
- An empty polygon has `exterior() === null` and `numInteriors() === 0`. In Arrow layout, this is a valid row with geom offset delta 0 (no rings).
- A non-empty polygon has one exterior ring plus zero or more interior rings. The ring offset advances for each ring (exterior + interiors), and the geom offset advances by `1 + numInteriors()`.

**`pushGeometry` accept-set:** `Polygon`; `MultiPolygon` with zero (→ empty polygon) or one (→ unwrap) child.

**Files:**
- Create: `packages/builder/src/capacity/polygon.ts`
- Create: `packages/builder/src/polygon.ts`
- Create: `packages/builder/tests/capacity/polygon.test.ts`
- Create: `packages/builder/tests/polygon.test.ts`
- Modify: `packages/builder/src/index.ts`

- [ ] **Step 11.1: Write the PolygonCapacity test file**

Create `packages/builder/tests/capacity/polygon.test.ts`:

```ts
import {
  RefLineString,
  RefMultiPolygon,
  RefPoint,
  RefPolygon,
} from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import { PolygonCapacity } from "../../src/capacity/polygon.js";

function square(): RefLineString {
  return new RefLineString(
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
    "XY",
  );
}

function triangle(): RefLineString {
  return new RefLineString(
    [
      [0, 0],
      [2, 0],
      [1, 1],
      [0, 0],
    ],
    "XY",
  );
}

describe("PolygonCapacity", () => {
  it("addPolygon sums rings and coords for exterior + interiors", () => {
    const c = new PolygonCapacity();
    c.addPolygon(new RefPolygon(square(), [], "XY")); // 1 ring, 5 coords
    c.addPolygon(new RefPolygon(square(), [triangle()], "XY")); // 2 rings, 9 coords
    expect(c.coordCapacity).toBe(14);
    expect(c.ringCapacity).toBe(3);
    expect(c.geomCapacity).toBe(2);
  });

  it("addPolygon(null) increments geomCapacity only", () => {
    const c = new PolygonCapacity();
    c.addPolygon(null);
    expect(c.coordCapacity).toBe(0);
    expect(c.ringCapacity).toBe(0);
    expect(c.geomCapacity).toBe(1);
  });

  it("addPolygon with exterior === null is an empty polygon (no rings)", () => {
    const c = new PolygonCapacity();
    c.addPolygon(new RefPolygon(null, [], "XY"));
    expect(c.coordCapacity).toBe(0);
    expect(c.ringCapacity).toBe(0);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry accepts Polygon", () => {
    const c = new PolygonCapacity();
    c.addGeometry(new RefPolygon(square(), [], "XY"));
    expect(c.coordCapacity).toBe(5);
    expect(c.ringCapacity).toBe(1);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry unwraps a one-item MultiPolygon", () => {
    const c = new PolygonCapacity();
    c.addGeometry(
      new RefMultiPolygon([new RefPolygon(square(), [], "XY")], "XY"),
    );
    expect(c.coordCapacity).toBe(5);
    expect(c.ringCapacity).toBe(1);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry accepts zero-item MultiPolygon as empty Polygon", () => {
    const c = new PolygonCapacity();
    c.addGeometry(new RefMultiPolygon([], "XY"));
    expect(c.coordCapacity).toBe(0);
    expect(c.ringCapacity).toBe(0);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry throws on MultiPolygon with 2+ children", () => {
    const c = new PolygonCapacity();
    const mp = new RefMultiPolygon(
      [
        new RefPolygon(square(), [], "XY"),
        new RefPolygon(square(), [], "XY"),
      ],
      "XY",
    );
    expect(() => c.addGeometry(mp)).toThrowError(
      /PolygonCapacity\.addGeometry: MultiPolygon with 2 items/,
    );
  });

  it("addGeometry throws on wrong type", () => {
    const c = new PolygonCapacity();
    expect(() => c.addGeometry(new RefPoint([1, 2], "XY"))).toThrowError(
      /PolygonCapacity\.addGeometry: expected Polygon, got Point/,
    );
  });
});
```

- [ ] **Step 11.2: Run, expect fail**

```bash
pnpm -F @geoarrow/builder test tests/capacity/polygon.test.ts
```

- [ ] **Step 11.3: Write the PolygonCapacity implementation**

Create `packages/builder/src/capacity/polygon.ts`:

```ts
import type {
  GeometryInterface,
  MultiPolygonInterface,
  PolygonInterface,
} from "@geoarrow/geo-interface";

/**
 * Counting-pass capacity for PolygonBuilder.
 *
 * Three counters: total coord count across all rings, total ring
 * count (exterior + interiors), and total geom count.
 */
export class PolygonCapacity {
  coordCapacity = 0;
  ringCapacity = 0;
  geomCapacity = 0;

  addPolygon(value: PolygonInterface | null): void {
    this.geomCapacity++;
    if (value === null) return;
    const ext = value.exterior();
    if (ext === null) return; // empty polygon
    this.ringCapacity += 1 + value.numInteriors();
    this.coordCapacity += ext.numCoords();
    const nI = value.numInteriors();
    for (let i = 0; i < nI; i++) {
      this.coordCapacity += value.interior(i).numCoords();
    }
  }

  addGeometry(value: GeometryInterface | null): void {
    if (value === null) {
      this.geomCapacity++;
      return;
    }
    switch (value.geometryType) {
      case "Polygon":
        this.addPolygon(value);
        return;
      case "MultiPolygon": {
        const mp: MultiPolygonInterface = value;
        const n = mp.numPolygons();
        if (n === 0) {
          this.geomCapacity++;
        } else if (n === 1) {
          this.addPolygon(mp.polygon(0));
        } else {
          throw new Error(
            `PolygonCapacity.addGeometry: MultiPolygon with ${n} items cannot be unwrapped into a single Polygon`,
          );
        }
        return;
      }
      default:
        throw new Error(
          `PolygonCapacity.addGeometry: expected Polygon, got ${value.geometryType}`,
        );
    }
  }

  static fromPolygons(
    iter: Iterable<PolygonInterface | null>,
  ): PolygonCapacity {
    const cap = new PolygonCapacity();
    for (const p of iter) cap.addPolygon(p);
    return cap;
  }

  static fromGeometries(
    iter: Iterable<GeometryInterface | null>,
  ): PolygonCapacity {
    const cap = new PolygonCapacity();
    for (const g of iter) cap.addGeometry(g);
    return cap;
  }
}
```

- [ ] **Step 11.4: Run, expect pass**

```bash
pnpm -F @geoarrow/builder test tests/capacity/polygon.test.ts
```

- [ ] **Step 11.5: Write the PolygonBuilder test file**

Create `packages/builder/tests/polygon.test.ts`:

```ts
import { isPolygonData } from "@geoarrow/schema";
import {
  RefLineString,
  RefMultiPolygon,
  RefPoint,
  RefPolygon,
} from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import { PolygonCapacity } from "../src/capacity/polygon.js";
import { PolygonBuilder } from "../src/polygon.js";

function square(): RefLineString {
  return new RefLineString(
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
    "XY",
  );
}

function hole(): RefLineString {
  return new RefLineString(
    [
      [0.2, 0.2],
      [0.4, 0.2],
      [0.4, 0.4],
      [0.2, 0.4],
      [0.2, 0.2],
    ],
    "XY",
  );
}

describe("PolygonBuilder", () => {
  it("happy path, XY, exterior only", () => {
    const poly = new RefPolygon(square(), [], "XY");
    const cap = PolygonCapacity.fromPolygons([poly]);
    const b = PolygonBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushPolygon(poly);
    const data = b.finish();
    expect(data.length).toBe(1);
    expect(Array.from(data.valueOffsets)).toEqual([0, 1]);
    expect(
      Array.from(data.children[0].valueOffsets as Int32Array),
    ).toEqual([0, 5]);
    expect(
      Array.from(data.children[0].children[0].children[0].values as Float64Array),
    ).toEqual([0, 0, 1, 0, 1, 1, 0, 1, 0, 0]);
  });

  it("happy path, polygon with a hole", () => {
    const poly = new RefPolygon(square(), [hole()], "XY");
    const cap = PolygonCapacity.fromPolygons([poly]);
    const b = PolygonBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushPolygon(poly);
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 2]);
    expect(Array.from(data.children[0].valueOffsets as Int32Array)).toEqual([
      0, 5, 10,
    ]);
  });

  it("happy path, XYZ", () => {
    const ring = new RefLineString(
      [
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0],
        [0, 0, 0],
      ],
      "XYZ",
    );
    const poly = new RefPolygon(ring, [], "XYZ");
    const cap = PolygonCapacity.fromPolygons([poly]);
    const b = PolygonBuilder.withCapacity({ dim: "XYZ" }, cap);
    b.pushPolygon(poly);
    const data = b.finish();
    expect(
      Array.from(data.children[0].children[0].children[0].values as Float64Array),
    ).toEqual([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0]);
  });

  it("null row has geom delta zero and sets bitmap bit", () => {
    const cap = new PolygonCapacity();
    cap.addPolygon(new RefPolygon(square(), [], "XY"));
    cap.addPolygon(null);
    const b = PolygonBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushPolygon(new RefPolygon(square(), [], "XY"));
    b.pushPolygon(null);
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1, 1]);
    expect(data.nullBitmap).toBeInstanceOf(Uint8Array);
    expect((data.nullBitmap![0] >> 1) & 1).toBe(0);
  });

  it("empty polygon (exterior === null) is valid with zero rings", () => {
    const cap = new PolygonCapacity();
    cap.addPolygon(new RefPolygon(null, [], "XY"));
    const b = PolygonBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushPolygon(new RefPolygon(null, [], "XY"));
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 0]);
    expect(data.nullBitmap).toBeUndefined();
  });

  it("pushGeometry accepts Polygon directly", () => {
    const poly = new RefPolygon(square(), [], "XY");
    const cap = new PolygonCapacity();
    cap.addGeometry(poly);
    const b = PolygonBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(poly);
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1]);
  });

  it("pushGeometry unwraps a one-item MultiPolygon", () => {
    const poly = new RefPolygon(square(), [], "XY");
    const cap = new PolygonCapacity();
    cap.addGeometry(new RefMultiPolygon([poly], "XY"));
    const b = PolygonBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(new RefMultiPolygon([poly], "XY"));
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1]);
  });

  it("pushGeometry accepts an empty MultiPolygon as an empty Polygon", () => {
    const cap = new PolygonCapacity();
    cap.addGeometry(new RefMultiPolygon([], "XY"));
    const b = PolygonBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(new RefMultiPolygon([], "XY"));
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 0]);
    expect(data.nullBitmap).toBeUndefined();
  });

  it("pushGeometry throws on MultiPolygon with 2+ children", () => {
    const cap = new PolygonCapacity();
    cap.addPolygon(null);
    const b = PolygonBuilder.withCapacity({ dim: "XY" }, cap);
    const mp = new RefMultiPolygon(
      [
        new RefPolygon(square(), [], "XY"),
        new RefPolygon(square(), [], "XY"),
      ],
      "XY",
    );
    expect(() => b.pushGeometry(mp)).toThrowError(
      /PolygonBuilder\.pushGeometry: MultiPolygon with 2 items/,
    );
  });

  it("pushGeometry throws on wrong type", () => {
    const cap = new PolygonCapacity();
    cap.addPolygon(null);
    const b = PolygonBuilder.withCapacity({ dim: "XY" }, cap);
    expect(() => b.pushGeometry(new RefPoint([1, 2], "XY"))).toThrowError(
      /PolygonBuilder\.pushGeometry: expected Polygon, got Point/,
    );
  });

  it("round trips through isPolygonData type guard", () => {
    const poly = new RefPolygon(square(), [], "XY");
    const cap = PolygonCapacity.fromPolygons([poly]);
    const b = PolygonBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushPolygon(poly);
    const data = b.finish();
    expect(isPolygonData(data)).toBe(true);
  });
});
```

- [ ] **Step 11.6: Run, expect fail**

```bash
pnpm -F @geoarrow/builder test tests/polygon.test.ts
```

- [ ] **Step 11.7: Write the PolygonBuilder implementation**

Create `packages/builder/src/polygon.ts`:

```ts
import { Field, List, makeData } from "apache-arrow";
import type {
  Dimension,
  GeometryInterface,
  LineStringInterface,
  MultiPolygonInterface,
  PolygonInterface,
} from "@geoarrow/geo-interface";
import type { Polygon, PolygonData } from "@geoarrow/schema";
import { BitmapBuilder } from "./internal/bitmap.js";
import { CoordBufferBuilder } from "./internal/coord.js";
import { OffsetsBuilder } from "./internal/offsets.js";
import type { PolygonCapacity } from "./capacity/polygon.js";

export interface PolygonBuilderOptions {
  dim: Dimension;
}

/**
 * Two-pass builder for a GeoArrow Polygon column.
 *
 * Polygon layout is List<List<Coord>>: two offsets levels. ringOffsets
 * runs over coords; geomOffsets runs over rings.
 */
export class PolygonBuilder {
  private readonly coords: CoordBufferBuilder;
  private readonly ringOffsets: OffsetsBuilder;
  private readonly geomOffsets: OffsetsBuilder;
  private readonly validity: BitmapBuilder;
  readonly dim: Dimension;

  private constructor(
    opts: PolygonBuilderOptions,
    capacity: PolygonCapacity,
  ) {
    this.dim = opts.dim;
    this.coords = new CoordBufferBuilder(capacity.coordCapacity, opts.dim);
    this.ringOffsets = new OffsetsBuilder(capacity.ringCapacity);
    this.geomOffsets = new OffsetsBuilder(capacity.geomCapacity);
    this.validity = new BitmapBuilder(capacity.geomCapacity);
  }

  static withCapacity(
    opts: PolygonBuilderOptions,
    capacity: PolygonCapacity,
  ): PolygonBuilder {
    return new PolygonBuilder(opts, capacity);
  }

  pushPolygon(value: PolygonInterface | null): void {
    if (value === null) {
      this.geomOffsets.appendLength(0);
      this.validity.appendNull();
      return;
    }
    const ext = value.exterior();
    if (ext === null) {
      // empty polygon: valid row, zero rings
      this.geomOffsets.appendLength(0);
      this.validity.appendValid();
      return;
    }
    this.pushRing(ext);
    const nI = value.numInteriors();
    for (let i = 0; i < nI; i++) {
      this.pushRing(value.interior(i));
    }
    this.geomOffsets.appendLength(1 + nI);
    this.validity.appendValid();
  }

  private pushRing(ring: LineStringInterface): void {
    const n = ring.numCoords();
    for (let i = 0; i < n; i++) {
      this.coords.pushCoord(ring.coord(i));
    }
    this.ringOffsets.appendLength(n);
  }

  pushGeometry(value: GeometryInterface | null): void {
    if (value === null) {
      this.pushPolygon(null);
      return;
    }
    switch (value.geometryType) {
      case "Polygon":
        this.pushPolygon(value);
        return;
      case "MultiPolygon": {
        const mp: MultiPolygonInterface = value;
        const n = mp.numPolygons();
        if (n === 0) {
          this.geomOffsets.appendLength(0);
          this.validity.appendValid();
        } else if (n === 1) {
          this.pushPolygon(mp.polygon(0));
        } else {
          throw new Error(
            `PolygonBuilder.pushGeometry: MultiPolygon with ${n} items cannot be unwrapped into a single Polygon`,
          );
        }
        return;
      }
      default:
        throw new Error(
          `PolygonBuilder.pushGeometry: expected Polygon, got ${value.geometryType}`,
        );
    }
  }

  finish(): PolygonData {
    const coordData = this.coords.finish();
    const ringOffsets = this.ringOffsets.finish();
    const geomOffsets = this.geomOffsets.finish();
    const nullBitmap = this.validity.finish();

    const ringType = new List(new Field("item", coordData.type, false));
    const ringData = makeData({
      type: ringType,
      length: ringOffsets.length - 1,
      nullCount: 0,
      valueOffsets: ringOffsets,
      child: coordData,
    });

    const geomType = new List<Polygon["TChild"]>(
      new Field("item", ringType, false),
    );
    return makeData({
      type: geomType,
      length: geomOffsets.length - 1,
      nullBitmap,
      valueOffsets: geomOffsets,
      child: ringData,
    }) as PolygonData;
  }
}
```

- [ ] **Step 11.8: Run, expect pass**

```bash
pnpm -F @geoarrow/builder test tests/polygon.test.ts
```

- [ ] **Step 11.9: Update barrel, typecheck, commit**

Append to `packages/builder/src/index.ts`:

```ts
export { PolygonCapacity } from "./capacity/polygon.js";
export {
  PolygonBuilder,
  type PolygonBuilderOptions,
} from "./polygon.js";
```

```bash
pnpm typecheck
git add packages/builder
git commit -m "feat(builder): add PolygonCapacity and PolygonBuilder

Two offsets levels: ringOffsets over coords, geomOffsets over
rings. Empty polygons (exterior === null) are encoded as valid
rows with zero rings. pushGeometry unwraps single-item
MultiPolygons."
```

---

## Task 12: `MultiLineStringCapacity` + `MultiLineStringBuilder`

**Why:** `MultiLineString = List<List<Coord>>`: two offsets levels, structurally identical to Polygon at the Arrow level. The push path iterates `mls.lineString(i).coord(j)` and counts total line strings under `ringCapacity` (per the spec's naming convention — see spec §Capacity field matrix).

**`pushGeometry` accept-set:** `MultiLineString`; `LineString` (wrapped into a 1-item multi).

**Files:**
- Create: `packages/builder/src/capacity/multilinestring.ts`
- Create: `packages/builder/src/multilinestring.ts`
- Create: `packages/builder/tests/capacity/multilinestring.test.ts`
- Create: `packages/builder/tests/multilinestring.test.ts`
- Modify: `packages/builder/src/index.ts`

- [ ] **Step 12.1: Write the MultiLineStringCapacity test file**

Create `packages/builder/tests/capacity/multilinestring.test.ts`:

```ts
import {
  RefLineString,
  RefMultiLineString,
  RefPoint,
} from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import { MultiLineStringCapacity } from "../../src/capacity/multilinestring.js";

describe("MultiLineStringCapacity", () => {
  it("addMultiLineString sums nested line strings and coords", () => {
    const c = new MultiLineStringCapacity();
    c.addMultiLineString(
      new RefMultiLineString(
        [
          new RefLineString(
            [
              [1, 2],
              [3, 4],
            ],
            "XY",
          ),
          new RefLineString(
            [
              [5, 6],
              [7, 8],
              [9, 10],
            ],
            "XY",
          ),
        ],
        "XY",
      ),
    );
    expect(c.coordCapacity).toBe(5);
    expect(c.ringCapacity).toBe(2);
    expect(c.geomCapacity).toBe(1);
  });

  it("addMultiLineString(null) increments geomCapacity only", () => {
    const c = new MultiLineStringCapacity();
    c.addMultiLineString(null);
    expect(c.coordCapacity).toBe(0);
    expect(c.ringCapacity).toBe(0);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry accepts MultiLineString", () => {
    const c = new MultiLineStringCapacity();
    c.addGeometry(
      new RefMultiLineString(
        [new RefLineString([[1, 2]], "XY")],
        "XY",
      ),
    );
    expect(c.coordCapacity).toBe(1);
    expect(c.ringCapacity).toBe(1);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry promotes a LineString into a 1-item multi", () => {
    const c = new MultiLineStringCapacity();
    c.addGeometry(
      new RefLineString(
        [
          [1, 2],
          [3, 4],
        ],
        "XY",
      ),
    );
    expect(c.coordCapacity).toBe(2);
    expect(c.ringCapacity).toBe(1);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry throws on wrong type", () => {
    const c = new MultiLineStringCapacity();
    expect(() => c.addGeometry(new RefPoint([1, 2], "XY"))).toThrowError(
      /MultiLineStringCapacity\.addGeometry: expected MultiLineString, got Point/,
    );
  });
});
```

- [ ] **Step 12.2: Run, expect fail**

```bash
pnpm -F @geoarrow/builder test tests/capacity/multilinestring.test.ts
```

- [ ] **Step 12.3: Write the MultiLineStringCapacity implementation**

Create `packages/builder/src/capacity/multilinestring.ts`:

```ts
import type {
  GeometryInterface,
  LineStringInterface,
  MultiLineStringInterface,
} from "@geoarrow/geo-interface";

/**
 * Counting-pass capacity for MultiLineStringBuilder.
 *
 * Reuses the `ringCapacity` name for the linestring-offset level —
 * slightly misleading since multi-line-strings have no rings, but
 * matches the Rust naming and keeps the capacity field layout uniform
 * with PolygonCapacity.
 */
export class MultiLineStringCapacity {
  coordCapacity = 0;
  ringCapacity = 0;
  geomCapacity = 0;

  addMultiLineString(value: MultiLineStringInterface | null): void {
    this.geomCapacity++;
    if (value === null) return;
    const n = value.numLineStrings();
    this.ringCapacity += n;
    for (let i = 0; i < n; i++) {
      this.coordCapacity += value.lineString(i).numCoords();
    }
  }

  addGeometry(value: GeometryInterface | null): void {
    if (value === null) {
      this.geomCapacity++;
      return;
    }
    switch (value.geometryType) {
      case "MultiLineString":
        this.addMultiLineString(value);
        return;
      case "LineString": {
        const ls: LineStringInterface = value;
        this.geomCapacity++;
        this.ringCapacity += 1;
        this.coordCapacity += ls.numCoords();
        return;
      }
      default:
        throw new Error(
          `MultiLineStringCapacity.addGeometry: expected MultiLineString, got ${value.geometryType}`,
        );
    }
  }

  static fromMultiLineStrings(
    iter: Iterable<MultiLineStringInterface | null>,
  ): MultiLineStringCapacity {
    const cap = new MultiLineStringCapacity();
    for (const mls of iter) cap.addMultiLineString(mls);
    return cap;
  }

  static fromGeometries(
    iter: Iterable<GeometryInterface | null>,
  ): MultiLineStringCapacity {
    const cap = new MultiLineStringCapacity();
    for (const g of iter) cap.addGeometry(g);
    return cap;
  }
}
```

- [ ] **Step 12.4: Run, expect pass**

```bash
pnpm -F @geoarrow/builder test tests/capacity/multilinestring.test.ts
```

- [ ] **Step 12.5: Write the MultiLineStringBuilder test file**

Create `packages/builder/tests/multilinestring.test.ts`:

```ts
import { isMultiLineStringData } from "@geoarrow/schema";
import {
  RefLineString,
  RefMultiLineString,
  RefPoint,
} from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import { MultiLineStringCapacity } from "../src/capacity/multilinestring.js";
import { MultiLineStringBuilder } from "../src/multilinestring.js";

describe("MultiLineStringBuilder", () => {
  it("happy path, XY", () => {
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
    const cap = MultiLineStringCapacity.fromMultiLineStrings([mls]);
    const b = MultiLineStringBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushMultiLineString(mls);
    const data = b.finish();
    expect(data.length).toBe(1);
    expect(Array.from(data.valueOffsets)).toEqual([0, 2]);
    expect(
      Array.from(data.children[0].valueOffsets as Int32Array),
    ).toEqual([0, 2, 5]);
    expect(
      Array.from(
        data.children[0].children[0].children[0].values as Float64Array,
      ),
    ).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("happy path, XYZ", () => {
    const mls = new RefMultiLineString(
      [
        new RefLineString(
          [
            [1, 2, 3],
            [4, 5, 6],
          ],
          "XYZ",
        ),
      ],
      "XYZ",
    );
    const cap = MultiLineStringCapacity.fromMultiLineStrings([mls]);
    const b = MultiLineStringBuilder.withCapacity({ dim: "XYZ" }, cap);
    b.pushMultiLineString(mls);
    const data = b.finish();
    expect(
      Array.from(
        data.children[0].children[0].children[0].values as Float64Array,
      ),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("null row", () => {
    const cap = new MultiLineStringCapacity();
    cap.addMultiLineString(
      new RefMultiLineString([new RefLineString([[1, 2]], "XY")], "XY"),
    );
    cap.addMultiLineString(null);
    const b = MultiLineStringBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushMultiLineString(
      new RefMultiLineString([new RefLineString([[1, 2]], "XY")], "XY"),
    );
    b.pushMultiLineString(null);
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1, 1]);
    expect(data.nullBitmap).toBeInstanceOf(Uint8Array);
    expect((data.nullBitmap![0] >> 1) & 1).toBe(0);
  });

  it("empty multi (numLineStrings === 0) is a valid row with zero children", () => {
    const cap = new MultiLineStringCapacity();
    cap.addMultiLineString(new RefMultiLineString([], "XY"));
    const b = MultiLineStringBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushMultiLineString(new RefMultiLineString([], "XY"));
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 0]);
    expect(data.nullBitmap).toBeUndefined();
  });

  it("pushGeometry accepts MultiLineString directly", () => {
    const mls = new RefMultiLineString(
      [new RefLineString([[1, 2]], "XY")],
      "XY",
    );
    const cap = new MultiLineStringCapacity();
    cap.addGeometry(mls);
    const b = MultiLineStringBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(mls);
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1]);
  });

  it("pushGeometry promotes a LineString into a 1-item multi", () => {
    const ls = new RefLineString(
      [
        [1, 2],
        [3, 4],
      ],
      "XY",
    );
    const cap = new MultiLineStringCapacity();
    cap.addGeometry(ls);
    const b = MultiLineStringBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(ls);
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1]);
    expect(
      Array.from(data.children[0].valueOffsets as Int32Array),
    ).toEqual([0, 2]);
  });

  it("pushGeometry throws on wrong type", () => {
    const cap = new MultiLineStringCapacity();
    cap.addMultiLineString(null);
    const b = MultiLineStringBuilder.withCapacity({ dim: "XY" }, cap);
    expect(() => b.pushGeometry(new RefPoint([1, 2], "XY"))).toThrowError(
      /MultiLineStringBuilder\.pushGeometry: expected MultiLineString, got Point/,
    );
  });

  it("round trips through isMultiLineStringData type guard", () => {
    const mls = new RefMultiLineString(
      [new RefLineString([[1, 2]], "XY")],
      "XY",
    );
    const cap = MultiLineStringCapacity.fromMultiLineStrings([mls]);
    const b = MultiLineStringBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushMultiLineString(mls);
    const data = b.finish();
    expect(isMultiLineStringData(data)).toBe(true);
  });
});
```

- [ ] **Step 12.6: Run, expect fail**

```bash
pnpm -F @geoarrow/builder test tests/multilinestring.test.ts
```

- [ ] **Step 12.7: Write the MultiLineStringBuilder implementation**

Create `packages/builder/src/multilinestring.ts`:

```ts
import { Field, List, makeData } from "apache-arrow";
import type {
  Dimension,
  GeometryInterface,
  LineStringInterface,
  MultiLineStringInterface,
} from "@geoarrow/geo-interface";
import type {
  MultiLineString,
  MultiLineStringData,
} from "@geoarrow/schema";
import { BitmapBuilder } from "./internal/bitmap.js";
import { CoordBufferBuilder } from "./internal/coord.js";
import { OffsetsBuilder } from "./internal/offsets.js";
import type { MultiLineStringCapacity } from "./capacity/multilinestring.js";

export interface MultiLineStringBuilderOptions {
  dim: Dimension;
}

/**
 * Two-pass builder for a GeoArrow MultiLineString column.
 *
 * Layout is List<List<Coord>>, structurally identical to Polygon at the
 * Arrow level. The difference is the push path: iterates
 * `mls.lineString(i).coord(j)` instead of exterior + interiors.
 */
export class MultiLineStringBuilder {
  private readonly coords: CoordBufferBuilder;
  private readonly ringOffsets: OffsetsBuilder;
  private readonly geomOffsets: OffsetsBuilder;
  private readonly validity: BitmapBuilder;
  readonly dim: Dimension;

  private constructor(
    opts: MultiLineStringBuilderOptions,
    capacity: MultiLineStringCapacity,
  ) {
    this.dim = opts.dim;
    this.coords = new CoordBufferBuilder(capacity.coordCapacity, opts.dim);
    this.ringOffsets = new OffsetsBuilder(capacity.ringCapacity);
    this.geomOffsets = new OffsetsBuilder(capacity.geomCapacity);
    this.validity = new BitmapBuilder(capacity.geomCapacity);
  }

  static withCapacity(
    opts: MultiLineStringBuilderOptions,
    capacity: MultiLineStringCapacity,
  ): MultiLineStringBuilder {
    return new MultiLineStringBuilder(opts, capacity);
  }

  pushMultiLineString(value: MultiLineStringInterface | null): void {
    if (value === null) {
      this.geomOffsets.appendLength(0);
      this.validity.appendNull();
      return;
    }
    const n = value.numLineStrings();
    for (let i = 0; i < n; i++) {
      this.pushInnerLineString(value.lineString(i));
    }
    this.geomOffsets.appendLength(n);
    this.validity.appendValid();
  }

  private pushInnerLineString(ls: LineStringInterface): void {
    const n = ls.numCoords();
    for (let i = 0; i < n; i++) {
      this.coords.pushCoord(ls.coord(i));
    }
    this.ringOffsets.appendLength(n);
  }

  pushGeometry(value: GeometryInterface | null): void {
    if (value === null) {
      this.pushMultiLineString(null);
      return;
    }
    switch (value.geometryType) {
      case "MultiLineString":
        this.pushMultiLineString(value);
        return;
      case "LineString": {
        this.pushInnerLineString(value);
        this.geomOffsets.appendLength(1);
        this.validity.appendValid();
        return;
      }
      default:
        throw new Error(
          `MultiLineStringBuilder.pushGeometry: expected MultiLineString, got ${value.geometryType}`,
        );
    }
  }

  finish(): MultiLineStringData {
    const coordData = this.coords.finish();
    const ringOffsets = this.ringOffsets.finish();
    const geomOffsets = this.geomOffsets.finish();
    const nullBitmap = this.validity.finish();

    const innerType = new List(new Field("item", coordData.type, false));
    const innerData = makeData({
      type: innerType,
      length: ringOffsets.length - 1,
      nullCount: 0,
      valueOffsets: ringOffsets,
      child: coordData,
    });

    const geomType = new List<MultiLineString["TChild"]>(
      new Field("item", innerType, false),
    );
    return makeData({
      type: geomType,
      length: geomOffsets.length - 1,
      nullBitmap,
      valueOffsets: geomOffsets,
      child: innerData,
    }) as MultiLineStringData;
  }
}
```

- [ ] **Step 12.8: Run, expect pass**

```bash
pnpm -F @geoarrow/builder test tests/multilinestring.test.ts
```

- [ ] **Step 12.9: Update barrel, typecheck, commit**

Append to `packages/builder/src/index.ts`:

```ts
export { MultiLineStringCapacity } from "./capacity/multilinestring.js";
export {
  MultiLineStringBuilder,
  type MultiLineStringBuilderOptions,
} from "./multilinestring.js";
```

```bash
pnpm typecheck
git add packages/builder
git commit -m "feat(builder): add MultiLineStringCapacity and MultiLineStringBuilder

Structurally identical to PolygonBuilder at the Arrow level.
Iterates mls.lineString(i).coord(j) on the push path.
pushGeometry promotes single LineStrings into 1-item multis."
```

---

## Task 13: `MultiPolygonCapacity` + `MultiPolygonBuilder`

**Why:** `MultiPolygon = List<List<List<Coord>>>`: three offsets levels (ring → coords, polygon → rings, geom → polygons). The deepest homogeneous builder. See spec §Builder shape variations.

**`pushGeometry` accept-set:** `MultiPolygon`; `Polygon` (wrapped into a 1-item multi).

**Files:**
- Create: `packages/builder/src/capacity/multipolygon.ts`
- Create: `packages/builder/src/multipolygon.ts`
- Create: `packages/builder/tests/capacity/multipolygon.test.ts`
- Create: `packages/builder/tests/multipolygon.test.ts`
- Modify: `packages/builder/src/index.ts`

- [ ] **Step 13.1: Write the MultiPolygonCapacity test file**

Create `packages/builder/tests/capacity/multipolygon.test.ts`:

```ts
import {
  RefLineString,
  RefMultiPolygon,
  RefPoint,
  RefPolygon,
} from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import { MultiPolygonCapacity } from "../../src/capacity/multipolygon.js";

function square(): RefLineString {
  return new RefLineString(
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
    "XY",
  );
}

describe("MultiPolygonCapacity", () => {
  it("addMultiPolygon sums polygons, rings, and coords", () => {
    const c = new MultiPolygonCapacity();
    c.addMultiPolygon(
      new RefMultiPolygon(
        [
          new RefPolygon(square(), [], "XY"),
          new RefPolygon(square(), [square()], "XY"),
        ],
        "XY",
      ),
    );
    expect(c.coordCapacity).toBe(15); // 5 + 5 + 5
    expect(c.ringCapacity).toBe(3); // 1 + 2
    expect(c.polygonCapacity).toBe(2);
    expect(c.geomCapacity).toBe(1);
  });

  it("addMultiPolygon(null) increments geomCapacity only", () => {
    const c = new MultiPolygonCapacity();
    c.addMultiPolygon(null);
    expect(c.coordCapacity).toBe(0);
    expect(c.ringCapacity).toBe(0);
    expect(c.polygonCapacity).toBe(0);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry accepts MultiPolygon", () => {
    const c = new MultiPolygonCapacity();
    c.addGeometry(
      new RefMultiPolygon([new RefPolygon(square(), [], "XY")], "XY"),
    );
    expect(c.coordCapacity).toBe(5);
    expect(c.ringCapacity).toBe(1);
    expect(c.polygonCapacity).toBe(1);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry promotes a Polygon into a 1-item multi", () => {
    const c = new MultiPolygonCapacity();
    c.addGeometry(new RefPolygon(square(), [], "XY"));
    expect(c.coordCapacity).toBe(5);
    expect(c.ringCapacity).toBe(1);
    expect(c.polygonCapacity).toBe(1);
    expect(c.geomCapacity).toBe(1);
  });

  it("addGeometry throws on wrong type", () => {
    const c = new MultiPolygonCapacity();
    expect(() => c.addGeometry(new RefPoint([1, 2], "XY"))).toThrowError(
      /MultiPolygonCapacity\.addGeometry: expected MultiPolygon, got Point/,
    );
  });
});
```

- [ ] **Step 13.2: Run, expect fail**

```bash
pnpm -F @geoarrow/builder test tests/capacity/multipolygon.test.ts
```

- [ ] **Step 13.3: Write the MultiPolygonCapacity implementation**

Create `packages/builder/src/capacity/multipolygon.ts`:

```ts
import type {
  GeometryInterface,
  MultiPolygonInterface,
  PolygonInterface,
} from "@geoarrow/geo-interface";

/**
 * Counting-pass capacity for MultiPolygonBuilder.
 *
 * Four counters: total coord count, ring count (exterior + interiors
 * summed across every polygon), polygon count, and outer geom count.
 */
export class MultiPolygonCapacity {
  coordCapacity = 0;
  ringCapacity = 0;
  polygonCapacity = 0;
  geomCapacity = 0;

  addMultiPolygon(value: MultiPolygonInterface | null): void {
    this.geomCapacity++;
    if (value === null) return;
    const nP = value.numPolygons();
    this.polygonCapacity += nP;
    for (let i = 0; i < nP; i++) {
      this.addPolygonInner(value.polygon(i));
    }
  }

  private addPolygonInner(poly: PolygonInterface): void {
    const ext = poly.exterior();
    if (ext === null) return; // empty polygon — 0 rings
    this.ringCapacity += 1 + poly.numInteriors();
    this.coordCapacity += ext.numCoords();
    const nI = poly.numInteriors();
    for (let i = 0; i < nI; i++) {
      this.coordCapacity += poly.interior(i).numCoords();
    }
  }

  addGeometry(value: GeometryInterface | null): void {
    if (value === null) {
      this.geomCapacity++;
      return;
    }
    switch (value.geometryType) {
      case "MultiPolygon":
        this.addMultiPolygon(value);
        return;
      case "Polygon": {
        this.geomCapacity++;
        this.polygonCapacity++;
        this.addPolygonInner(value);
        return;
      }
      default:
        throw new Error(
          `MultiPolygonCapacity.addGeometry: expected MultiPolygon, got ${value.geometryType}`,
        );
    }
  }

  static fromMultiPolygons(
    iter: Iterable<MultiPolygonInterface | null>,
  ): MultiPolygonCapacity {
    const cap = new MultiPolygonCapacity();
    for (const mp of iter) cap.addMultiPolygon(mp);
    return cap;
  }

  static fromGeometries(
    iter: Iterable<GeometryInterface | null>,
  ): MultiPolygonCapacity {
    const cap = new MultiPolygonCapacity();
    for (const g of iter) cap.addGeometry(g);
    return cap;
  }
}
```

- [ ] **Step 13.4: Run, expect pass**

```bash
pnpm -F @geoarrow/builder test tests/capacity/multipolygon.test.ts
```

- [ ] **Step 13.5: Write the MultiPolygonBuilder test file**

Create `packages/builder/tests/multipolygon.test.ts`:

```ts
import { isMultiPolygonData } from "@geoarrow/schema";
import {
  RefLineString,
  RefMultiPolygon,
  RefPoint,
  RefPolygon,
} from "@geoarrow/test-fixtures";
import { describe, expect, it } from "vitest";
import { MultiPolygonCapacity } from "../src/capacity/multipolygon.js";
import { MultiPolygonBuilder } from "../src/multipolygon.js";

function square(): RefLineString {
  return new RefLineString(
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
    "XY",
  );
}

describe("MultiPolygonBuilder", () => {
  it("happy path, XY, multi with one polygon with a hole", () => {
    const mp = new RefMultiPolygon(
      [new RefPolygon(square(), [square()], "XY")],
      "XY",
    );
    const cap = MultiPolygonCapacity.fromMultiPolygons([mp]);
    const b = MultiPolygonBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushMultiPolygon(mp);
    const data = b.finish();
    expect(data.length).toBe(1);
    expect(Array.from(data.valueOffsets)).toEqual([0, 1]);
    expect(
      Array.from(data.children[0].valueOffsets as Int32Array),
    ).toEqual([0, 2]);
    expect(
      Array.from(
        data.children[0].children[0].valueOffsets as Int32Array,
      ),
    ).toEqual([0, 5, 10]);
  });

  it("happy path, multi with two polygons", () => {
    const mp = new RefMultiPolygon(
      [
        new RefPolygon(square(), [], "XY"),
        new RefPolygon(square(), [], "XY"),
      ],
      "XY",
    );
    const cap = MultiPolygonCapacity.fromMultiPolygons([mp]);
    const b = MultiPolygonBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushMultiPolygon(mp);
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 2]);
    expect(
      Array.from(data.children[0].valueOffsets as Int32Array),
    ).toEqual([0, 1, 2]);
  });

  it("happy path, XYZ", () => {
    const ring = new RefLineString(
      [
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0],
        [0, 0, 0],
      ],
      "XYZ",
    );
    const mp = new RefMultiPolygon(
      [new RefPolygon(ring, [], "XYZ")],
      "XYZ",
    );
    const cap = MultiPolygonCapacity.fromMultiPolygons([mp]);
    const b = MultiPolygonBuilder.withCapacity({ dim: "XYZ" }, cap);
    b.pushMultiPolygon(mp);
    const data = b.finish();
    expect(
      Array.from(
        data.children[0].children[0].children[0].children[0]
          .values as Float64Array,
      ),
    ).toEqual([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0]);
  });

  it("null row", () => {
    const cap = new MultiPolygonCapacity();
    cap.addMultiPolygon(
      new RefMultiPolygon([new RefPolygon(square(), [], "XY")], "XY"),
    );
    cap.addMultiPolygon(null);
    const b = MultiPolygonBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushMultiPolygon(
      new RefMultiPolygon([new RefPolygon(square(), [], "XY")], "XY"),
    );
    b.pushMultiPolygon(null);
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1, 1]);
    expect(data.nullBitmap).toBeInstanceOf(Uint8Array);
    expect((data.nullBitmap![0] >> 1) & 1).toBe(0);
  });

  it("pushGeometry accepts MultiPolygon directly", () => {
    const mp = new RefMultiPolygon(
      [new RefPolygon(square(), [], "XY")],
      "XY",
    );
    const cap = new MultiPolygonCapacity();
    cap.addGeometry(mp);
    const b = MultiPolygonBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(mp);
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1]);
  });

  it("pushGeometry promotes a Polygon into a 1-item multi", () => {
    const poly = new RefPolygon(square(), [], "XY");
    const cap = new MultiPolygonCapacity();
    cap.addGeometry(poly);
    const b = MultiPolygonBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushGeometry(poly);
    const data = b.finish();
    expect(Array.from(data.valueOffsets)).toEqual([0, 1]);
    expect(
      Array.from(data.children[0].valueOffsets as Int32Array),
    ).toEqual([0, 1]);
  });

  it("pushGeometry throws on wrong type", () => {
    const cap = new MultiPolygonCapacity();
    cap.addMultiPolygon(null);
    const b = MultiPolygonBuilder.withCapacity({ dim: "XY" }, cap);
    expect(() => b.pushGeometry(new RefPoint([1, 2], "XY"))).toThrowError(
      /MultiPolygonBuilder\.pushGeometry: expected MultiPolygon, got Point/,
    );
  });

  it("round trips through isMultiPolygonData type guard", () => {
    const mp = new RefMultiPolygon(
      [new RefPolygon(square(), [], "XY")],
      "XY",
    );
    const cap = MultiPolygonCapacity.fromMultiPolygons([mp]);
    const b = MultiPolygonBuilder.withCapacity({ dim: "XY" }, cap);
    b.pushMultiPolygon(mp);
    const data = b.finish();
    expect(isMultiPolygonData(data)).toBe(true);
  });
});
```

- [ ] **Step 13.6: Run, expect fail**

```bash
pnpm -F @geoarrow/builder test tests/multipolygon.test.ts
```

- [ ] **Step 13.7: Write the MultiPolygonBuilder implementation**

Create `packages/builder/src/multipolygon.ts`:

```ts
import { Field, List, makeData } from "apache-arrow";
import type {
  Dimension,
  GeometryInterface,
  LineStringInterface,
  MultiPolygonInterface,
  PolygonInterface,
} from "@geoarrow/geo-interface";
import type { MultiPolygon, MultiPolygonData } from "@geoarrow/schema";
import { BitmapBuilder } from "./internal/bitmap.js";
import { CoordBufferBuilder } from "./internal/coord.js";
import { OffsetsBuilder } from "./internal/offsets.js";
import type { MultiPolygonCapacity } from "./capacity/multipolygon.js";

export interface MultiPolygonBuilderOptions {
  dim: Dimension;
}

/**
 * Two-pass builder for a GeoArrow MultiPolygon column.
 *
 * Layout is List<List<List<Coord>>>: three offsets levels.
 * ringOffsets runs over coords, polygonOffsets runs over rings,
 * geomOffsets runs over polygons.
 */
export class MultiPolygonBuilder {
  private readonly coords: CoordBufferBuilder;
  private readonly ringOffsets: OffsetsBuilder;
  private readonly polygonOffsets: OffsetsBuilder;
  private readonly geomOffsets: OffsetsBuilder;
  private readonly validity: BitmapBuilder;
  readonly dim: Dimension;

  private constructor(
    opts: MultiPolygonBuilderOptions,
    capacity: MultiPolygonCapacity,
  ) {
    this.dim = opts.dim;
    this.coords = new CoordBufferBuilder(capacity.coordCapacity, opts.dim);
    this.ringOffsets = new OffsetsBuilder(capacity.ringCapacity);
    this.polygonOffsets = new OffsetsBuilder(capacity.polygonCapacity);
    this.geomOffsets = new OffsetsBuilder(capacity.geomCapacity);
    this.validity = new BitmapBuilder(capacity.geomCapacity);
  }

  static withCapacity(
    opts: MultiPolygonBuilderOptions,
    capacity: MultiPolygonCapacity,
  ): MultiPolygonBuilder {
    return new MultiPolygonBuilder(opts, capacity);
  }

  pushMultiPolygon(value: MultiPolygonInterface | null): void {
    if (value === null) {
      this.geomOffsets.appendLength(0);
      this.validity.appendNull();
      return;
    }
    const n = value.numPolygons();
    for (let i = 0; i < n; i++) {
      this.pushInnerPolygon(value.polygon(i));
    }
    this.geomOffsets.appendLength(n);
    this.validity.appendValid();
  }

  private pushInnerPolygon(poly: PolygonInterface): void {
    const ext = poly.exterior();
    if (ext === null) {
      // empty polygon: 0 rings
      this.polygonOffsets.appendLength(0);
      return;
    }
    this.pushRing(ext);
    const nI = poly.numInteriors();
    for (let i = 0; i < nI; i++) {
      this.pushRing(poly.interior(i));
    }
    this.polygonOffsets.appendLength(1 + nI);
  }

  private pushRing(ring: LineStringInterface): void {
    const n = ring.numCoords();
    for (let i = 0; i < n; i++) {
      this.coords.pushCoord(ring.coord(i));
    }
    this.ringOffsets.appendLength(n);
  }

  pushGeometry(value: GeometryInterface | null): void {
    if (value === null) {
      this.pushMultiPolygon(null);
      return;
    }
    switch (value.geometryType) {
      case "MultiPolygon":
        this.pushMultiPolygon(value);
        return;
      case "Polygon": {
        this.pushInnerPolygon(value);
        this.geomOffsets.appendLength(1);
        this.validity.appendValid();
        return;
      }
      default:
        throw new Error(
          `MultiPolygonBuilder.pushGeometry: expected MultiPolygon, got ${value.geometryType}`,
        );
    }
  }

  finish(): MultiPolygonData {
    const coordData = this.coords.finish();
    const ringOffsets = this.ringOffsets.finish();
    const polygonOffsets = this.polygonOffsets.finish();
    const geomOffsets = this.geomOffsets.finish();
    const nullBitmap = this.validity.finish();

    const ringType = new List(new Field("item", coordData.type, false));
    const ringData = makeData({
      type: ringType,
      length: ringOffsets.length - 1,
      nullCount: 0,
      valueOffsets: ringOffsets,
      child: coordData,
    });

    const polygonType = new List(new Field("item", ringType, false));
    const polygonData = makeData({
      type: polygonType,
      length: polygonOffsets.length - 1,
      nullCount: 0,
      valueOffsets: polygonOffsets,
      child: ringData,
    });

    const geomType = new List<MultiPolygon["TChild"]>(
      new Field("item", polygonType, false),
    );
    return makeData({
      type: geomType,
      length: geomOffsets.length - 1,
      nullBitmap,
      valueOffsets: geomOffsets,
      child: polygonData,
    }) as MultiPolygonData;
  }
}
```

- [ ] **Step 13.8: Run, expect pass**

```bash
pnpm -F @geoarrow/builder test tests/multipolygon.test.ts
```

- [ ] **Step 13.9: Update barrel, typecheck, run full test suite, commit**

Append to `packages/builder/src/index.ts`:

```ts
export { MultiPolygonCapacity } from "./capacity/multipolygon.js";
export {
  MultiPolygonBuilder,
  type MultiPolygonBuilderOptions,
} from "./multipolygon.js";
```

Verify the whole package is green end-to-end before committing the final builder:

```bash
pnpm -F @geoarrow/builder test
pnpm typecheck
pnpm -F @geoarrow/builder build
```

Expected: every test passes, typecheck clean, build produces a `dist/index.js` + `dist/index.d.ts` exposing all six capacities, all six builders, and their `*Options` types.

```bash
git add packages/builder
git commit -m "feat(builder): add MultiPolygonCapacity and MultiPolygonBuilder

Three offsets levels: ringOffsets, polygonOffsets, geomOffsets.
Completes the six homogeneous GeoArrow builders. pushGeometry
promotes single Polygons into 1-item multis."
```

---

## Final verification

After Task 13 commits, run one more end-to-end pass to catch any cross-package regression from the rename in Task 1:

- [ ] **Final step 1: Full monorepo test**

```bash
pnpm -r test
```

Expected: every package's tests pass. No residual references to the old PR 1 type names remain anywhere.

- [ ] **Final step 2: Full monorepo typecheck**

```bash
pnpm typecheck
```

Expected: clean exit.

- [ ] **Final step 3: Full monorepo build**

```bash
pnpm build
```

Expected: every package builds, including the new `@geoarrow/builder` and `@geoarrow/test-fixtures` packages. `packages/builder/dist/index.js` contains every public export.

- [ ] **Final step 4: Biome check**

```bash
pnpm check
```

Expected: clean. If biome finds unused imports or style issues in the new builder files, run `pnpm check:fix` and verify the fixes don't break tests before amending the relevant commit (or adding a small follow-up cleanup commit).
