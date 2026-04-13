# Monorepo Reshape (PR A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the single-package `@geoarrow/geoarrow-js` repo into a pnpm workspace with five independently-published packages (`@geoarrow/geo-interface`, `@geoarrow/schema`, `@geoarrow/worker`, `@geoarrow/algorithm`, and the existing `@geoarrow/geoarrow-js` name retired) so that PR 2 can land `@geoarrow/builder` cleanly as a new sibling package.

**Architecture:** pnpm workspaces with `packages/*`. Each package is a TypeScript leaf built by tsup (ESM + CJS + d.ts). The `algorithm` package keeps its existing `worker-build.mjs` esbuild script for the standalone earcut worker bundle. Root-level `biome.json` and `vitest.config.ts` cover every package. TypeScript project references wire the packages together so cross-package types resolve without a build. Dependencies split: `apache-arrow` is a peer dep of every package; `@math.gl/polygon`, `proj4`, and `threads` move into `@geoarrow/algorithm`.

**Tech Stack:** pnpm workspaces, TypeScript, tsup, esbuild, vitest, biome, Node 20.

**Relation to PR 2:** This is a prerequisite PR for PR 2. No logic changes land here — only file moves, config, and import-path updates. All existing tests must pass after every task.

## Rename-only diff discipline (READ FIRST)

The git diff for this PR must be as clean as possible: **most moved files should appear as pure renames in `git status` / `git diff`, with no content changes beyond the import-path edits the plan explicitly calls for.** A reviewer should be able to verify the reshape by reading `git log --stat` and seeing a wall of `R100` / `R98` rename markers, then reading the small handful of edits to import lines.

To preserve this property, every step that moves a file MUST follow these rules:

1. **Use `git mv` for moves**, never `mv` + `git add`. `git mv` records the rename atomically; plain `mv` plus `git add` works in most cases but is more fragile.
2. **Use the Edit tool (not Write) for any edits to a moved file.** Write replaces the entire file content, which changes line endings, trailing whitespace, and anything else the plan didn't intend. Edit only touches the lines specified.
3. **Do NOT run `pnpm check:fix` (or `biome check --write`, or any auto-formatter) over moved files in this PR.** Biome's `organizeImports` action will reorder imports in the moved files, and those reorderings will show up as additional diff lines that defeat the "pure rename" property. Run `pnpm check` (read-only) only — if it reports format/lint issues that are *not* about the imports we explicitly updated, leave them alone and address them in a follow-up commit at the very end of Task 6 (or, preferably, defer to a separate post-reshape PR).
4. **Do not touch lines unrelated to the move.** No drive-by formatting, no `import` reorganization beyond what the explicit Edit instructions demand, no whitespace cleanup, no comment edits.
5. **After each task's commit, run `git show --stat HEAD` and verify** that moved files appear with `R<NN>` markers (rename with NN% similarity) rather than as `D` (delete) plus `A` (add). Git's default rename detection uses 50% similarity; our moves should comfortably exceed 90% for pure moves and 70% for files with a few import-line edits.

If a step accidentally produces a non-rename diff (e.g., the file's similarity drops below the rename threshold because too many lines changed), stop and investigate. Either the edits exceeded what the plan called for, or the file was rewritten with Write instead of Edit.

---

## File structure (after this PR lands)

```
/
├── package.json              # private meta-package "geoarrow-monorepo"
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── biome.json                # unchanged, stays at root
├── tsconfig.base.json        # shared compiler options
├── tsconfig.json             # project refs to each package
├── vitest.config.ts          # workspace-aware runner
├── dev-docs/
├── packages/
│   ├── geo-interface/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   ├── src/
│   │   │   ├── index.ts       # from src/geo-interface/index.ts
│   │   │   └── iter.ts        # from src/geo-interface/iter.ts
│   │   └── tests/
│   │       ├── fixtures.ts    # from tests/geo-interface/fixtures.ts
│   │       ├── coord.test.ts
│   │       ├── dimension.test.ts
│   │       ├── geometry-collection.test.ts
│   │       ├── iter.test.ts
│   │       ├── line-string.test.ts
│   │       ├── multi-line-string.test.ts
│   │       ├── multi-point.test.ts
│   │       ├── multi-polygon.test.ts
│   │       ├── narrowing.test.ts
│   │       ├── point.test.ts
│   │       └── polygon.test.ts
│   ├── schema/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── src/
│   │       ├── index.ts       # new: barrel
│   │       ├── type.ts        # from src/type.ts
│   │       ├── data.ts        # from src/data.ts
│   │       ├── vector.ts      # from src/vector.ts
│   │       ├── child.ts       # from src/child.ts
│   │       └── constants.ts   # from src/constants.ts
│   ├── worker/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   ├── src/
│   │   │   ├── index.ts       # from src/worker/index.ts
│   │   │   ├── hard-clone.ts  # from src/worker/hard-clone.ts
│   │   │   ├── rehydrate.ts   # from src/worker/rehydrate.ts
│   │   │   └── transferable.ts # from src/worker/transferable.ts
│   │   └── tests/
│   │       ├── transfer.test.ts    # from tests/worker/transfer.test.ts
│   │       └── owned-clone.test.ts # from tests/algorithm/owned-clone.test.ts (misfiled — tests hardClone)
│   └── algorithm/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       ├── worker-build.mjs   # from root
│       ├── src/
│       │   ├── index.ts       # from src/algorithm/index.ts
│       │   ├── area.ts
│       │   ├── coords.ts
│       │   ├── earcut.ts
│       │   ├── exterior.ts
│       │   ├── proj.ts
│       │   ├── total-bounds.ts
│       │   ├── winding.ts
│       │   ├── utils/
│       │   │   ├── assert.ts
│       │   │   └── polygon.ts
│       │   └── worker-bundle/
│       │       └── earcut.ts  # from src/worker-bundle/earcut.ts
│       └── tests/
│           ├── proj.test.ts        # from tests/algorithm/proj.test.ts
│           └── util/
│               └── point.ts        # from tests/util/point.ts
```

**Files deleted at the end of the reshape:**

- `src/` (entire tree — all content moved)
- `tests/` (entire tree — all content moved)
- `rollup.config.js` (replaced by per-package `tsup.config.ts`)
- `worker-build.mjs` (moved into `packages/algorithm/`)
- `tsconfig.docs.json`, `typedoc.json` (docs build is deferred; no consumer today)
- `src/index.ts` (the package-root barrel; no longer exists because there is no root package)

**Root `package.json` after reshape:**

```json
{
  "name": "geoarrow-monorepo",
  "version": "0.4.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.25.0",
  "scripts": {
    "build": "pnpm -r --filter=\"./packages/**\" build",
    "check": "biome check .",
    "check:fix": "biome check --write .",
    "clean": "pnpm -r --filter=\"./packages/**\" exec rimraf dist",
    "test": "vitest run",
    "typecheck": "tsc --build"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.4.11",
    "@types/node": "^20.9.3",
    "rimraf": "^5.0.5",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  },
  "volta": {
    "node": "20.9.0"
  }
}
```

**Shared version:** All packages start at `0.4.0` (bumping from current `0.3.3` because the reshape is breaking for import paths). Release-please is deferred.

---

## Task 1: Workspace scaffold

**Goal:** Convert the root package into a pnpm workspace meta-package. Create `packages/` as an empty directory. Preserve existing `src/` and `tests/` intact — no file moves in this task.

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `packages/.gitkeep`
- Modify: `package.json` (root)
- Modify: `tsconfig.json` (root)
- Delete: `rollup.config.js`, `worker-build.mjs` (move worker-build.mjs to `packages/algorithm/` later — keep at root for now so tests still build until Task 5)

- [ ] **Step 1.1: Create `pnpm-workspace.yaml`**

File: `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 1.2: Create `tsconfig.base.json` with shared compiler options**

File: `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "strictNullChecks": true,
    "lib": ["es2020", "dom"],
    "skipLibCheck": true
  }
}
```

- [ ] **Step 1.3: Replace root `tsconfig.json` with project-reference root**

File: `tsconfig.json`

```json
{
  "files": [],
  "references": []
}
```

(References will be appended in each package task.)

- [ ] **Step 1.4: Create root `vitest.config.ts` that discovers every package's tests**

File: `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*"],
  },
});
```

Note: vitest workspace discovery uses each package's own `vitest.config.ts` when present; packages without one run in the root config.

- [ ] **Step 1.5: Rewrite root `package.json` as private meta-package**

Replace the entire file with:

```json
{
  "name": "geoarrow-monorepo",
  "version": "0.4.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.25.0",
  "scripts": {
    "build": "pnpm -r --filter=\"./packages/**\" build",
    "check": "biome check .",
    "check:fix": "biome check --write .",
    "clean": "pnpm -r --filter=\"./packages/**\" exec rimraf dist",
    "test": "vitest run",
    "typecheck": "tsc --build"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.4.11",
    "@types/node": "^20.9.3",
    "rimraf": "^5.0.5",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  },
  "volta": {
    "node": "20.9.0"
  }
}
```

Note: `dependencies`, `peerDependencies`, `publishConfig`, `files`, `exports`, the build scripts for rollup/worker-build, and the old devDeps for rollup plugins are all removed from the root. The `apache-arrow` peer dep moves into each leaf package. `@math.gl/polygon`, `proj4`, `@types/proj4`, `threads` move into `@geoarrow/algorithm`. `esbuild`, `gh-pages`, `ts-node`, `typedoc` are removed entirely (no consumer during the reshape).

- [ ] **Step 1.6: Create empty `packages/` directory with a placeholder**

```bash
mkdir -p packages && touch packages/.gitkeep
```

- [ ] **Step 1.7: Delete obsolete root build artifacts**

```bash
rm rollup.config.js
rm tsconfig.docs.json
rm typedoc.json
```

**Do not delete `worker-build.mjs` yet** — Task 5 moves it into `packages/algorithm/`. Leaving it at the root for Tasks 1–4 means the repo is in a transient state where the root-level esbuild script points at files that will move, but nothing tries to run it during those tasks so it doesn't matter.

- [ ] **Step 1.8: Install with the new layout**

```bash
pnpm install
```

Expected: installs cleanly. The old `src/` and `tests/` still exist, so the old test commands won't work until files move in the next tasks, but pnpm doesn't care.

- [ ] **Step 1.9: Verify typecheck runs (no-op, no packages yet)**

```bash
pnpm typecheck
```

Expected: succeeds immediately (zero references in root `tsconfig.json`).

- [ ] **Step 1.10: Commit**

```bash
git add pnpm-workspace.yaml tsconfig.base.json tsconfig.json vitest.config.ts packages/.gitkeep package.json pnpm-lock.yaml
git rm rollup.config.js tsconfig.docs.json typedoc.json
git commit -m "$(cat <<'EOF'
chore: scaffold pnpm workspace for monorepo reshape

Set up pnpm-workspace.yaml, tsconfig.base.json with shared compiler
options, vitest workspace config, and rewrite the root package.json
as a private meta-package. Remove rollup/typedoc root configuration;
per-package tsup will replace it in subsequent tasks. src/ and tests/
remain in place and will be moved into packages/ in follow-up tasks.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create `@geoarrow/geo-interface`

**Goal:** Move PR 1 contents from `src/geo-interface/` and `tests/geo-interface/` into a new leaf package at `packages/geo-interface/`. This package has zero internal dependencies — only apache-arrow — so it is the easiest to move first and gives us a template for subsequent tasks.

**Files:**
- Create: `packages/geo-interface/package.json`
- Create: `packages/geo-interface/tsconfig.json`
- Create: `packages/geo-interface/tsup.config.ts`
- Move: `src/geo-interface/index.ts` → `packages/geo-interface/src/index.ts`
- Move: `src/geo-interface/iter.ts` → `packages/geo-interface/src/iter.ts`
- Move: all of `tests/geo-interface/*` → `packages/geo-interface/tests/`
- Modify: `tsconfig.json` (add reference)

- [ ] **Step 2.1: Create package directories**

```bash
mkdir -p packages/geo-interface/src packages/geo-interface/tests
```

- [ ] **Step 2.2: Create `packages/geo-interface/package.json`**

```json
{
  "name": "@geoarrow/geo-interface",
  "version": "0.4.0",
  "description": "TypeScript interfaces for GeoArrow geometries — port of the Rust geo-traits crate.",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./tests/fixtures": {
      "types": "./tests/fixtures.ts",
      "default": "./tests/fixtures.ts"
    }
  },
  "files": ["dist/", "src/", "tests/fixtures.ts"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --build"
  },
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/geoarrow/geoarrow-js.git",
    "directory": "packages/geo-interface"
  },
  "author": "Kyle Barron <kylebarron2@gmail.com>",
  "license": "MIT"
}
```

The `./tests/fixtures` export is what `@geoarrow/builder` will import from in PR 2. Exposing a raw `.ts` file via an export works for workspace consumers (vitest reads it directly with its TS transformer); external consumers who want to use fixtures would need to import from the published `tests/fixtures.ts` and run it through their own TS build.

Note: no `dependencies` block. `apache-arrow` is not used inside `@geoarrow/geo-interface` at all — confirmed by inspecting `src/geo-interface/index.ts` and `src/geo-interface/iter.ts`, which only define interfaces and iterator generators over those interfaces. PR 1 shipped with zero external runtime deps and stays that way.

- [ ] **Step 2.3: Create `packages/geo-interface/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/.tsbuildinfo"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 2.4: Create `packages/geo-interface/tsup.config.ts`**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2020",
});
```

- [ ] **Step 2.5: Move source files with `git mv`**

```bash
git mv src/geo-interface/index.ts packages/geo-interface/src/index.ts
git mv src/geo-interface/iter.ts packages/geo-interface/src/iter.ts
rmdir src/geo-interface
```

- [ ] **Step 2.6: Move test files with `git mv`**

```bash
git mv tests/geo-interface/fixtures.ts packages/geo-interface/tests/fixtures.ts
git mv tests/geo-interface/coord.test.ts packages/geo-interface/tests/coord.test.ts
git mv tests/geo-interface/dimension.test.ts packages/geo-interface/tests/dimension.test.ts
git mv tests/geo-interface/geometry-collection.test.ts packages/geo-interface/tests/geometry-collection.test.ts
git mv tests/geo-interface/iter.test.ts packages/geo-interface/tests/iter.test.ts
git mv tests/geo-interface/line-string.test.ts packages/geo-interface/tests/line-string.test.ts
git mv tests/geo-interface/multi-line-string.test.ts packages/geo-interface/tests/multi-line-string.test.ts
git mv tests/geo-interface/multi-point.test.ts packages/geo-interface/tests/multi-point.test.ts
git mv tests/geo-interface/multi-polygon.test.ts packages/geo-interface/tests/multi-polygon.test.ts
git mv tests/geo-interface/narrowing.test.ts packages/geo-interface/tests/narrowing.test.ts
git mv tests/geo-interface/point.test.ts packages/geo-interface/tests/point.test.ts
git mv tests/geo-interface/polygon.test.ts packages/geo-interface/tests/polygon.test.ts
rmdir tests/geo-interface
```

- [ ] **Step 2.7: Update test imports from `../../src/geo-interface/*` to `../src/*`**

Every moved test file references `../../src/geo-interface/index.js` or `../../src/geo-interface/iter.js` or similar. After the move, the relative path from `packages/geo-interface/tests/point.test.ts` to `packages/geo-interface/src/index.ts` is `../src/index.js`.

Use the Edit tool to update each test file. For `fixtures.ts`, the path is `../src/index.js` (was `../../src/geo-interface/index.js`). For every `*.test.ts`, replace:

```
from "../../src/geo-interface/index.js"
```
with:
```
from "../src/index.js"
```

And:

```
from "../../src/geo-interface/iter.js"
```
with:
```
from "../src/iter.js"
```

Also verify `fixtures.ts` internal imports — it references `../../src/geo-interface/index.js` for the interface types. Update to `../src/index.js`.

Apply these updates to all 12 files in `packages/geo-interface/tests/`.

- [ ] **Step 2.8: Create `packages/geo-interface/src/index.ts` re-export unchanged**

The file was moved by `git mv` in Step 2.5 and already has the correct content. No additional edits needed — verify with:

```bash
head -5 packages/geo-interface/src/index.ts
```

Expected: first lines match the PR 1 header (dimension types, interface definitions, etc.).

- [ ] **Step 2.9: Add project reference to root `tsconfig.json`**

Update root `tsconfig.json` to:

```json
{
  "files": [],
  "references": [
    { "path": "./packages/geo-interface" }
  ]
}
```

- [ ] **Step 2.10: Install dependencies (registers new workspace package)**

```bash
pnpm install
```

Expected: installs successfully and creates a workspace symlink for `@geoarrow/geo-interface`.

- [ ] **Step 2.11: Typecheck the package**

```bash
pnpm --filter @geoarrow/geo-interface typecheck
```

Expected: succeeds with zero errors.

- [ ] **Step 2.12: Run the package tests**

```bash
pnpm --filter @geoarrow/geo-interface exec vitest run
```

Expected: all 11 test files (`coord`, `dimension`, `geometry-collection`, `iter`, `line-string`, `multi-line-string`, `multi-point`, `multi-polygon`, `narrowing`, `point`, `polygon`) run and pass. `fixtures.ts` is not a test file — it's a support module imported by the tests.

- [ ] **Step 2.13: Build the package with tsup**

```bash
pnpm --filter @geoarrow/geo-interface build
```

Expected: `packages/geo-interface/dist/` contains `index.js` (ESM), `index.cjs`, `index.d.ts`, and sourcemaps.

- [ ] **Step 2.14: Commit**

```bash
git add packages/geo-interface/ tsconfig.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore: move geo-interface into @geoarrow/geo-interface package

Move src/geo-interface/ and tests/geo-interface/ into
packages/geo-interface/, wire up per-package tsconfig/tsup/package.json,
and add the workspace reference to the root tsconfig. Test imports
updated from ../../src/geo-interface/* to ../src/*. No logic changes.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create `@geoarrow/schema`

**Goal:** Move the Arrow type aliases, `Data<T>` aliases, `Vector<T>` aliases, `child.ts` accessors, and `constants.ts` from the root `src/` into a new `@geoarrow/schema` package. This package depends only on `apache-arrow`. After this task, any file that currently imports from `../type`, `../data`, `../vector`, `../child`, or `../constants` within `src/worker/` or `src/algorithm/` will need to temporarily break — we fix those imports in Tasks 4 and 5.

**Transient state warning:** At the end of Task 3, the repo is in a state where `src/worker/rehydrate.ts`, every file in `src/algorithm/`, and both `tests/algorithm/*.test.ts` files import from now-nonexistent relative paths like `../data`. The root no longer has a `tsconfig.json` that includes `src/`, so `pnpm typecheck` at the root will not typecheck those orphaned files — they are only typechecked when a package task moves them. `pnpm --filter @geoarrow/schema typecheck` passes, and that is the gate we run at the end of this task. Tasks 4 and 5 move the broken files and fix their imports.

**Files:**
- Create: `packages/schema/package.json`
- Create: `packages/schema/tsconfig.json`
- Create: `packages/schema/tsup.config.ts`
- Create: `packages/schema/src/index.ts`
- Move: `src/type.ts` → `packages/schema/src/type.ts`
- Move: `src/data.ts` → `packages/schema/src/data.ts`
- Move: `src/vector.ts` → `packages/schema/src/vector.ts`
- Move: `src/child.ts` → `packages/schema/src/child.ts`
- Move: `src/constants.ts` → `packages/schema/src/constants.ts`
- Modify: `tsconfig.json` (add reference)

- [ ] **Step 3.1: Create package directories**

```bash
mkdir -p packages/schema/src
```

- [ ] **Step 3.2: Create `packages/schema/package.json`**

```json
{
  "name": "@geoarrow/schema",
  "version": "0.4.0",
  "description": "Arrow type aliases, Data wrappers, and typed child accessors for GeoArrow.",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist/", "src/"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --build"
  },
  "peerDependencies": {
    "apache-arrow": ">=15"
  },
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/geoarrow/geoarrow-js.git",
    "directory": "packages/schema"
  },
  "author": "Kyle Barron <kylebarron2@gmail.com>",
  "license": "MIT"
}
```

- [ ] **Step 3.3: Create `packages/schema/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/.tsbuildinfo"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3.4: Create `packages/schema/tsup.config.ts`**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2020",
  external: ["apache-arrow"],
});
```

- [ ] **Step 3.5: Move source files with `git mv`**

```bash
git mv src/type.ts packages/schema/src/type.ts
git mv src/data.ts packages/schema/src/data.ts
git mv src/vector.ts packages/schema/src/vector.ts
git mv src/child.ts packages/schema/src/child.ts
git mv src/constants.ts packages/schema/src/constants.ts
```

- [ ] **Step 3.6: Create `packages/schema/src/index.ts` barrel**

File: `packages/schema/src/index.ts`

```ts
export * from "./type.js";
export * from "./data.js";
export * from "./vector.js";
export * from "./child.js";
export * from "./constants.js";
```

- [ ] **Step 3.7: Verify moved files' internal imports still resolve**

The moved files reference each other by relative path. Run:

```bash
grep -rn "from \"\\./" packages/schema/src/
```

Expected: all internal imports use `./type`, `./data`, `./vector`, `./child`, `./constants` — these still resolve because the files are now in the same directory.

Note: `data.ts` imports from `./type`, `child.ts` imports from `./data` and `./vector`, `vector.ts` imports from `./type`. These remain correct.

- [ ] **Step 3.8: Add `apache-arrow` to the package and install**

Add apache-arrow as a dev dependency (for typechecking/tests) while keeping it a peer dependency:

Update `packages/schema/package.json` `devDependencies` block:

```json
"devDependencies": {
  "apache-arrow": "^15"
}
```

Then:

```bash
pnpm install
```

Expected: installs `apache-arrow` into the schema workspace.

- [ ] **Step 3.9: Add project reference to root `tsconfig.json`**

Update root `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./packages/geo-interface" },
    { "path": "./packages/schema" }
  ]
}
```

- [ ] **Step 3.10: Typecheck the package**

```bash
pnpm --filter @geoarrow/schema typecheck
```

Expected: succeeds with zero errors. (This package has no tests of its own yet; tests for schema-level functionality live in the packages that exercise schema.)

- [ ] **Step 3.11: Build the package**

```bash
pnpm --filter @geoarrow/schema build
```

Expected: `packages/schema/dist/index.js`, `index.cjs`, `index.d.ts` produced.

- [ ] **Step 3.12: Commit**

```bash
git add packages/schema/ tsconfig.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore: move schema types into @geoarrow/schema package

Move src/type.ts, src/data.ts, src/vector.ts, src/child.ts, and
src/constants.ts into packages/schema/. The new package exports all
symbols via src/index.ts and depends on apache-arrow as a peer dep.

Leaves src/worker/ and src/algorithm/ with broken imports to ../data,
../type, ../vector, ../child, ../constants — these are fixed in
Tasks 4 and 5 when those files move into their own packages.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create `@geoarrow/worker`

**Goal:** Move `src/worker/*.ts` and `tests/worker/*.test.ts` into `packages/worker/`, fixing the imports that currently point at `../data`/`../type` (now `@geoarrow/schema`).

**Files:**
- Create: `packages/worker/package.json`
- Create: `packages/worker/tsconfig.json`
- Create: `packages/worker/tsup.config.ts`
- Move: `src/worker/index.ts` → `packages/worker/src/index.ts`
- Move: `src/worker/hard-clone.ts` → `packages/worker/src/hard-clone.ts`
- Move: `src/worker/rehydrate.ts` → `packages/worker/src/rehydrate.ts`
- Move: `src/worker/transferable.ts` → `packages/worker/src/transferable.ts`
- Move: `tests/worker/transfer.test.ts` → `packages/worker/tests/transfer.test.ts`
- Move: `tests/algorithm/owned-clone.test.ts` → `packages/worker/tests/owned-clone.test.ts` (misfiled — this test exercises `hardClone` and `isShared` from `src/worker/hard-clone`, not any algorithm function)
- Modify: `tsconfig.json` (add reference)

- [ ] **Step 4.1: Create package directories**

```bash
mkdir -p packages/worker/src packages/worker/tests
```

- [ ] **Step 4.2: Create `packages/worker/package.json`**

```json
{
  "name": "@geoarrow/worker",
  "version": "0.4.0",
  "description": "Primitives for shipping GeoArrow Data across postMessage boundaries: hard clone, rehydrate, transferable marshaling.",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist/", "src/"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --build"
  },
  "dependencies": {
    "@geoarrow/schema": "workspace:*"
  },
  "peerDependencies": {
    "apache-arrow": ">=15"
  },
  "devDependencies": {
    "apache-arrow": "^15"
  },
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/geoarrow/geoarrow-js.git",
    "directory": "packages/worker"
  },
  "author": "Kyle Barron <kylebarron2@gmail.com>",
  "license": "MIT"
}
```

- [ ] **Step 4.3: Create `packages/worker/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../schema" }
  ]
}
```

- [ ] **Step 4.4: Create `packages/worker/tsup.config.ts`**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2020",
  external: ["apache-arrow", "@geoarrow/schema"],
});
```

- [ ] **Step 4.5: Move source files with `git mv`**

```bash
git mv src/worker/index.ts packages/worker/src/index.ts
git mv src/worker/hard-clone.ts packages/worker/src/hard-clone.ts
git mv src/worker/rehydrate.ts packages/worker/src/rehydrate.ts
git mv src/worker/transferable.ts packages/worker/src/transferable.ts
rmdir src/worker
```

- [ ] **Step 4.6: Update imports in `packages/worker/src/rehydrate.ts`**

The file currently contains:

```ts
import type { PolygonData } from "../data";
import type { Polygon } from "../type";
import { isPolygon } from "../type";
```

Change to:

```ts
import type { PolygonData, Polygon } from "@geoarrow/schema";
import { isPolygon } from "@geoarrow/schema";
```

(Consolidate the type-only and value import into two lines since `Polygon` and `PolygonData` are type-only and `isPolygon` is a value import. Biome's `useImportType` with `separatedType` style will enforce this.)

- [ ] **Step 4.7: Verify `hard-clone.ts` and `transferable.ts` imports**

`hard-clone.ts` only imports from `apache-arrow` — no changes needed.

`transferable.ts` imports from `./hard-clone` — no changes needed.

`index.ts` re-exports from local files — no changes needed.

Confirm with:

```bash
grep -n "^import" packages/worker/src/*.ts
```

Expected: only `apache-arrow` and relative `./` imports, plus the `@geoarrow/schema` imports added in Step 4.6.

- [ ] **Step 4.8: Move test files with `git mv`**

```bash
git mv tests/worker/transfer.test.ts packages/worker/tests/transfer.test.ts
rmdir tests/worker
git mv tests/algorithm/owned-clone.test.ts packages/worker/tests/owned-clone.test.ts
```

(`tests/algorithm/` is not removed yet — Task 5 will move the remaining `proj.test.ts` and then `rmdir` the directory.)

- [ ] **Step 4.9: Update test imports**

**`packages/worker/tests/transfer.test.ts`** currently contains:

```ts
import { preparePostMessage, rehydrateData } from "../../src/worker";
```

The import resolves to `src/worker/index.ts` (the barrel). After the move, rewrite as:

```ts
import { preparePostMessage, rehydrateData } from "../src/index.js";
```

**`packages/worker/tests/owned-clone.test.ts`** currently contains:

```ts
import { hardClone, isShared } from "../../src/worker/hard-clone";
```

Rewrite as:

```ts
import { hardClone, isShared } from "../src/hard-clone.js";
```

- [ ] **Step 4.10: Add project reference to root `tsconfig.json`**

Update root `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./packages/geo-interface" },
    { "path": "./packages/schema" },
    { "path": "./packages/worker" }
  ]
}
```

- [ ] **Step 4.11: Install dependencies**

```bash
pnpm install
```

Expected: installs cleanly, links `@geoarrow/schema` into `packages/worker/node_modules/`.

- [ ] **Step 4.12: Typecheck the package**

```bash
pnpm --filter @geoarrow/worker typecheck
```

Expected: succeeds with zero errors.

- [ ] **Step 4.13: Run the package tests**

```bash
pnpm --filter @geoarrow/worker exec vitest run
```

Expected: `transfer.test.ts` runs and passes.

- [ ] **Step 4.14: Build the package**

```bash
pnpm --filter @geoarrow/worker build
```

Expected: `packages/worker/dist/index.js`, `index.cjs`, `index.d.ts` produced.

- [ ] **Step 4.15: Commit**

```bash
git add packages/worker/ tsconfig.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore: move worker primitives into @geoarrow/worker package

Move src/worker/, tests/worker/transfer.test.ts, and
tests/algorithm/owned-clone.test.ts (which tests hardClone, not any
algorithm) into packages/worker/. Update imports in rehydrate.ts
from ../data and ../type to @geoarrow/schema, and add the workspace
dependency and reference.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Create `@geoarrow/algorithm`

**Goal:** Move `src/algorithm/*`, `src/worker-bundle/earcut.ts`, `worker-build.mjs`, and `tests/algorithm/*` into `packages/algorithm/`. This is the last and largest source move. After this task, `src/` and `tests/` are empty and will be deleted in Task 6.

**Files:**
- Create: `packages/algorithm/package.json`
- Create: `packages/algorithm/tsconfig.json`
- Create: `packages/algorithm/tsup.config.ts`
- Move: all of `src/algorithm/*` → `packages/algorithm/src/`
- Move: `src/worker-bundle/earcut.ts` → `packages/algorithm/src/worker-bundle/earcut.ts`
- Move: `worker-build.mjs` → `packages/algorithm/worker-build.mjs`
- Move: `tests/algorithm/proj.test.ts` → `packages/algorithm/tests/proj.test.ts` (the only algorithm test left after Task 4 rehoused `owned-clone.test.ts`)
- Move: `tests/util/point.ts` → `packages/algorithm/tests/util/point.ts` (only `proj.test.ts` uses it)
- Modify: `tsconfig.json` (add reference)

- [ ] **Step 5.1: Create package directories**

```bash
mkdir -p packages/algorithm/src/utils packages/algorithm/src/worker-bundle packages/algorithm/tests/util
```

- [ ] **Step 5.2: Create `packages/algorithm/package.json`**

```json
{
  "name": "@geoarrow/algorithm",
  "version": "0.4.0",
  "description": "Algorithms over GeoArrow data: area, coordinate reprojection, earcut tessellation, bounds, winding.",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./earcut.worker.js": "./dist/earcut.worker.js",
    "./earcut.worker.min.js": "./dist/earcut.worker.min.js"
  },
  "files": ["dist/", "src/"],
  "scripts": {
    "build:tsup": "tsup",
    "build:workers": "node ./worker-build.mjs",
    "build": "pnpm build:tsup && pnpm build:workers",
    "typecheck": "tsc --build"
  },
  "dependencies": {
    "@geoarrow/schema": "workspace:*",
    "@geoarrow/worker": "workspace:*",
    "@math.gl/polygon": "^4.0.0",
    "proj4": "^2.9.2",
    "threads": "^1.7.0"
  },
  "peerDependencies": {
    "apache-arrow": ">=15"
  },
  "devDependencies": {
    "@types/proj4": "^2",
    "apache-arrow": "^15",
    "esbuild": "^0.19.8"
  },
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/geoarrow/geoarrow-js.git",
    "directory": "packages/algorithm"
  },
  "author": "Kyle Barron <kylebarron2@gmail.com>",
  "license": "MIT"
}
```

Note: algorithm declares `@geoarrow/worker` as a dependency even though no current source file imports from it. The spec for the monorepo reshape sets this direction (worker is a primitive layer, algorithm sits on top) so that a future refactor moving the earcut worker dispatch logic to use `hardClone`/`rehydrate` from `@geoarrow/worker` has no package.json churn. If biome's unused-dep lint flags this, silence it via a comment in `package.json` — but the current biome config does not include a `noUnusedDependencies` rule, so no action is needed.

- [ ] **Step 5.3: Create `packages/algorithm/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../schema" },
    { "path": "../worker" }
  ]
}
```

- [ ] **Step 5.4: Create `packages/algorithm/tsup.config.ts`**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2020",
  external: [
    "apache-arrow",
    "@geoarrow/schema",
    "@geoarrow/worker",
    "@math.gl/polygon",
    "proj4",
    "threads",
  ],
});
```

- [ ] **Step 5.5: Move algorithm source files with `git mv`**

```bash
git mv src/algorithm/index.ts packages/algorithm/src/index.ts
git mv src/algorithm/area.ts packages/algorithm/src/area.ts
git mv src/algorithm/coords.ts packages/algorithm/src/coords.ts
git mv src/algorithm/earcut.ts packages/algorithm/src/earcut.ts
git mv src/algorithm/exterior.ts packages/algorithm/src/exterior.ts
git mv src/algorithm/proj.ts packages/algorithm/src/proj.ts
git mv src/algorithm/total-bounds.ts packages/algorithm/src/total-bounds.ts
git mv src/algorithm/winding.ts packages/algorithm/src/winding.ts
git mv src/algorithm/utils/assert.ts packages/algorithm/src/utils/assert.ts
git mv src/algorithm/utils/polygon.ts packages/algorithm/src/utils/polygon.ts
rmdir src/algorithm/utils src/algorithm
```

- [ ] **Step 5.6: Move worker-bundle entry point**

```bash
git mv src/worker-bundle/earcut.ts packages/algorithm/src/worker-bundle/earcut.ts
rmdir src/worker-bundle
```

- [ ] **Step 5.7: Move `worker-build.mjs`**

```bash
git mv worker-build.mjs packages/algorithm/worker-build.mjs
```

- [ ] **Step 5.8: Update `worker-build.mjs` entry point paths**

The file currently references `./src/worker-bundle/earcut.ts` and writes outputs to `dist/...`. After the move, paths relative to `packages/algorithm/worker-build.mjs` are:
- Entry: `./src/worker-bundle/earcut.ts` (unchanged — still relative to the package root)
- Outputs: `./dist/earcut-worker.js`, `./dist/earcut.worker.js`, `./dist/earcut-worker.min.js`, `./dist/earcut.worker.min.js` (unchanged — still relative to the package root)

Verify the file content is correct as-is:

```bash
cat packages/algorithm/worker-build.mjs
```

Expected: entry point is `./src/worker-bundle/earcut.ts`, outputs land in `./dist/...`. No edits needed because the paths are relative to the script's directory (which was the repo root before and is now the package root).

- [ ] **Step 5.9: Update imports in every algorithm source file**

Each file in `packages/algorithm/src/` currently imports from relative paths like `../child`, `../data`, `../type`, `../vector`, `../constants.js`. These all become `@geoarrow/schema` imports.

Run through each file and rewrite the imports. The exact changes:

**`packages/algorithm/src/area.ts`**

Change:
```ts
import type { PolygonData } from "../data";
import type { PolygonVector } from "../vector";
```
To:
```ts
import type { PolygonData, PolygonVector } from "@geoarrow/schema";
```

**`packages/algorithm/src/coords.ts`**

Change:
```ts
} from "../child";
```
and
```ts
} from "../data";
```
and
```ts
} from "../type";
```
To a single import block:
```ts
} from "@geoarrow/schema";
```

(You'll have two import groups: one for types, one for the child accessor values. Consolidate each into one `@geoarrow/schema` import per style — keep type-only imports in `import type` blocks per the biome `separatedType` rule.)

**`packages/algorithm/src/earcut.ts`**

Change:
```ts
import { getLineStringChild, getPointChild, getPolygonChild } from "../child";
import type { PolygonData } from "../data";
import type { PolygonVector } from "../vector";
```
To:
```ts
import {
  getLineStringChild,
  getPointChild,
  getPolygonChild,
} from "@geoarrow/schema";
import type { PolygonData, PolygonVector } from "@geoarrow/schema";
```

**`packages/algorithm/src/exterior.ts`**

Change:
```ts
import { getMultiPolygonChild, getPolygonChild } from "../child";
...
} from "../data";
...
} from "../vector";
```
To `@geoarrow/schema` imports (one `import { ... }` for values, one `import type { ... }` for types).

**`packages/algorithm/src/proj.ts`**

Change:
```ts
import type { GeoArrowType } from "../type";
```
To:
```ts
import type { GeoArrowType } from "@geoarrow/schema";
```

**`packages/algorithm/src/winding.ts`**

Change:
```ts
import type { PolygonData } from "../data";
import type { PolygonVector } from "../vector";
```
To:
```ts
import type { PolygonData, PolygonVector } from "@geoarrow/schema";
```

**`packages/algorithm/src/total-bounds.ts`**

Change:
```ts
} from "../child.js";
import { EXTENSION_NAME } from "../constants.js";
import type { PointData } from "../data.js";
...
} from "../vector.js";
```
To:
```ts
} from "@geoarrow/schema";
import { EXTENSION_NAME } from "@geoarrow/schema";
import type { PointData } from "@geoarrow/schema";
...
} from "@geoarrow/schema";
```

Consolidate into one `import { ... }` and one `import type { ... }` from `@geoarrow/schema`.

**`packages/algorithm/src/utils/polygon.ts`**

Change:
```ts
} from "../../child";
import type { PolygonData } from "../../data";
```
To:
```ts
} from "@geoarrow/schema";
import type { PolygonData } from "@geoarrow/schema";
```

**`packages/algorithm/src/index.ts`**

This is the package barrel that previously re-exported `./algorithm/*`. It should now re-export the local files. Read the file first to see exactly what it exports, then update any relative paths. The paths `./area.js`, `./coords.js`, etc. should still be correct because the files are now siblings.

- [ ] **Step 5.10: Update `packages/algorithm/src/worker-bundle/earcut.ts` imports**

The file currently contains:

```ts
import type { TransferDescriptor } from "threads";
import { expose, Transfer } from "threads/worker";
import { earcut } from "../algorithm/earcut";
import type { PolygonData } from "../data";
```

After the move, the relative path `../algorithm/earcut` needs to become `../earcut.js` (because `earcut.ts` is now a sibling of the `worker-bundle/` directory within `packages/algorithm/src/`), and `../data` needs to become `@geoarrow/schema`. Rewrite as:

```ts
import type { TransferDescriptor } from "threads";
import { expose, Transfer } from "threads/worker";
import { earcut } from "../earcut.js";
import type { PolygonData } from "@geoarrow/schema";
```

- [ ] **Step 5.11: Move test files**

```bash
git mv tests/algorithm/proj.test.ts packages/algorithm/tests/proj.test.ts
rmdir tests/algorithm
git mv tests/util/point.ts packages/algorithm/tests/util/point.ts
rmdir tests/util tests
```

(`tests/algorithm/owned-clone.test.ts` was already moved to `packages/worker/tests/` in Task 4.)

- [ ] **Step 5.12: Update test imports**

**`packages/algorithm/tests/proj.test.ts`** currently contains:

```ts
import { reproject } from "../../src/algorithm";
import { testPointData } from "../util/point";
```

Rewrite as:

```ts
import { reproject } from "../src/index.js";
import { testPointData } from "./util/point.js";
```

**`packages/algorithm/tests/util/point.ts`** currently contains:

```ts
import type { PointData } from "../../src/data";
```

Rewrite as:

```ts
import type { PointData } from "@geoarrow/schema";
```

- [ ] **Step 5.13: Add project reference to root `tsconfig.json`**

Update root `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./packages/geo-interface" },
    { "path": "./packages/schema" },
    { "path": "./packages/worker" },
    { "path": "./packages/algorithm" }
  ]
}
```

- [ ] **Step 5.14: Install dependencies**

```bash
pnpm install
```

Expected: installs `@math.gl/polygon`, `proj4`, `@types/proj4`, `threads`, `esbuild` into the algorithm workspace.

- [ ] **Step 5.15: Typecheck the package**

```bash
pnpm --filter @geoarrow/algorithm typecheck
```

Expected: succeeds with zero errors.

- [ ] **Step 5.16: Run the package tests**

```bash
pnpm --filter @geoarrow/algorithm exec vitest run
```

Expected: `proj.test.ts` runs and passes.

- [ ] **Step 5.17: Build the tsup bundle**

```bash
pnpm --filter @geoarrow/algorithm build:tsup
```

Expected: `packages/algorithm/dist/index.js`, `index.cjs`, `index.d.ts` produced.

- [ ] **Step 5.18: Build the earcut worker bundle**

```bash
pnpm --filter @geoarrow/algorithm build:workers
```

Expected: `packages/algorithm/dist/earcut.worker.js`, `earcut.worker.min.js`, `earcut-worker.js`, `earcut-worker.min.js` produced.

- [ ] **Step 5.19: Commit**

```bash
git add packages/algorithm/ tsconfig.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore: move algorithms into @geoarrow/algorithm package

Move src/algorithm/, src/worker-bundle/, worker-build.mjs, and
tests/algorithm/ (plus tests/util/point.ts) into packages/algorithm/.
Update all imports that previously pointed at ../child, ../data,
../type, ../vector, ../constants to use @geoarrow/schema. The earcut
worker bundle continues to build via esbuild (worker-build.mjs) and
the main entry builds via tsup.

After this task, src/ and tests/ are empty and will be removed in
Task 6.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Root cleanup

**Goal:** Remove the now-empty `src/` and `tests/` trees, delete `src/index.ts` (no longer a package), drop the `threads` / `proj4` / `@math.gl/polygon` / `apache-arrow` / `esbuild` dependencies from the root (they live in `@geoarrow/algorithm` now), and update `.gitignore` / README to reflect the new layout.

**Files:**
- Delete: `src/` (recursive)
- Delete: `tests/` (recursive)
- Delete: `packages/.gitkeep`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `package.json` (root) — remove deps that moved
- Modify: `CHANGELOG.md`

- [ ] **Step 6.1: Verify `src/` and `tests/` are empty**

```bash
find src tests -type f 2>/dev/null
```

Expected: no output. If any files remain, investigate and move them to the appropriate package before proceeding. The only file that should still exist at the root is `src/index.ts`, which was the old package-root barrel — it is no longer needed since no root package exists.

```bash
cat src/index.ts
```

Expected: re-exports `./algorithm`, `./child.js`, `./data.js`, `./geo-interface`, `./type.js`, `./vector.js`, `./worker`. This file can be deleted because every consumer now imports from a specific `@geoarrow/*` package.

- [ ] **Step 6.2: Remove `src/` and `tests/`**

```bash
git rm src/index.ts
rmdir src
```

If `rmdir src` fails because other empty directories remain, use:

```bash
find src -type d -empty -delete
find tests -type d -empty -delete 2>/dev/null || true
```

- [ ] **Step 6.3: Remove the `packages/.gitkeep` placeholder**

```bash
git rm packages/.gitkeep
```

Now that real packages exist, the placeholder is redundant.

- [ ] **Step 6.4: Update root `.gitignore`**

Read the existing `.gitignore`:

```bash
cat .gitignore
```

Add entries for per-package build outputs if not already present:

```
packages/*/dist/
packages/*/node_modules/
packages/*/*.tsbuildinfo
```

Keep existing entries (`node_modules/`, `dist/`, etc.) — they still apply at the root.

- [ ] **Step 6.5: Update root `README.md`**

The README currently documents a single-package install (`npm install @geoarrow/geoarrow-js`). Update the install section to list the five new packages and their purposes:

```markdown
## Packages

This repo is a pnpm monorepo containing the following packages:

| Package | Purpose |
|---------|---------|
| [`@geoarrow/geo-interface`](./packages/geo-interface) | TypeScript interfaces for GeoArrow geometries (port of Rust `geo-traits`) |
| [`@geoarrow/schema`](./packages/schema) | Arrow type aliases, `Data<T>` wrappers, typed child accessors |
| [`@geoarrow/worker`](./packages/worker) | Primitives for shipping GeoArrow `Data` across `postMessage` boundaries |
| [`@geoarrow/algorithm`](./packages/algorithm) | Algorithms: area, coords, earcut, exterior, proj, total-bounds, winding |

## Development

```sh
pnpm install
pnpm test
pnpm build
pnpm typecheck
```
```

(Keep the rest of the README — motivation, links, license — unchanged where it still applies.)

- [ ] **Step 6.6: Update `CHANGELOG.md`**

Add a new entry at the top for `0.4.0`:

```markdown
## 0.4.0

### Breaking

- **Repo reshape.** `@geoarrow/geoarrow-js` is replaced by a pnpm monorepo
  containing `@geoarrow/geo-interface`, `@geoarrow/schema`, `@geoarrow/worker`,
  and `@geoarrow/algorithm`. Consumers must update their imports from
  `@geoarrow/geoarrow-js` to the specific package they need:
  - `import { ... } from "@geoarrow/schema"` for `type.ts`, `data.ts`, `vector.ts`, `child.ts`, `constants.ts`.
  - `import { ... } from "@geoarrow/algorithm"` for `algorithm/*`.
  - `import { ... } from "@geoarrow/worker"` for `worker/*`.
  - `import { ... } from "@geoarrow/geo-interface"` for the PR 1 geometry interfaces.
- UMD build is dropped.
```

- [ ] **Step 6.7: Root-level full build**

```bash
pnpm build
```

Expected: every package builds successfully — `@geoarrow/geo-interface`, `@geoarrow/schema`, `@geoarrow/worker`, `@geoarrow/algorithm`. The algorithm package produces both the tsup bundle and the worker bundles.

- [ ] **Step 6.8: Root-level full test run**

```bash
pnpm test
```

Expected: every package's tests run. Total: 11 `geo-interface` test files + 2 `worker` test files (`transfer.test.ts`, `owned-clone.test.ts`) + 1 `algorithm` test file (`proj.test.ts`) = 14 test files, all passing. The exact assertion counts match the pre-reshape totals (no test was added or removed).

- [ ] **Step 6.9: Root-level typecheck**

```bash
pnpm typecheck
```

Expected: project references build cleanly in dependency order (`geo-interface` → `schema` → `worker` → `algorithm`).

- [ ] **Step 6.10: Root-level biome check**

```bash
pnpm check
```

Expected: no lint or format errors. If biome complains about the relative import style inside packages (e.g. `./data.js` vs `./data`), apply `pnpm check:fix`.

- [ ] **Step 6.11: Commit**

```bash
git add .gitignore README.md CHANGELOG.md package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore: clean up root after monorepo reshape

Delete the empty src/ and tests/ trees, remove the packages/.gitkeep
placeholder, drop root dependencies that moved into packages/, and
update README plus CHANGELOG with the new package layout and the
0.4.0 breaking-change entry.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Final verification

**Goal:** End-to-end verification that the reshape is complete and all four packages build, typecheck, test, and lint cleanly from a cold cache.

- [ ] **Step 7.1: Cold-cache clean**

```bash
pnpm clean
rm -rf node_modules packages/*/node_modules packages/*/dist
```

- [ ] **Step 7.2: Fresh install**

```bash
pnpm install
```

Expected: installs successfully. Check that each package has a `node_modules/` with its workspace-linked `@geoarrow/*` dependencies.

```bash
ls -la packages/worker/node_modules/@geoarrow/
```

Expected: `schema -> ../../../schema` (pnpm workspace symlink).

```bash
ls -la packages/algorithm/node_modules/@geoarrow/
```

Expected: `schema -> ../../../schema` and `worker -> ../../../worker`.

- [ ] **Step 7.3: Full typecheck**

```bash
pnpm typecheck
```

Expected: zero errors. TypeScript project references resolve in dependency order. Each package's `dist/.tsbuildinfo` is produced.

- [ ] **Step 7.4: Full build**

```bash
pnpm build
```

Expected: every package's `dist/` directory contains `index.js`, `index.cjs`, `index.d.ts` (plus sourcemaps). `packages/algorithm/dist/` additionally contains the four earcut worker bundles.

- [ ] **Step 7.5: Full test run**

```bash
pnpm test
```

Expected: 14 test files pass, matching the pre-reshape totals (11 geo-interface + 2 worker + 1 algorithm).

- [ ] **Step 7.6: Biome check**

```bash
pnpm check
```

Expected: no lint or format errors.

- [ ] **Step 7.7: Verify the final workspace shape**

```bash
ls -la packages/
```

Expected output includes exactly four directories: `algorithm/`, `geo-interface/`, `schema/`, `worker/` — plus a symlink or pnpm-managed files as appropriate. No stray `.gitkeep`.

```bash
find src tests -type f 2>/dev/null
```

Expected: no output — both directories are gone.

- [ ] **Step 7.8: No additional commit**

This task is verification only — no files changed. If every step passed, the reshape is complete. If any step failed, investigate and fix in a new commit (do not amend), then re-run from Step 7.1.

---

## Risks and mitigations

- **Transient breakage in Task 3.** After `schema` moves out but before `worker` and `algorithm` move, files in `src/worker/` and `src/algorithm/` import from now-deleted relative paths. This is acceptable because we do not run root-level typecheck or build between Tasks 3 and 5 — each task only runs its own package's typecheck. Task 6 runs the full root typecheck and will catch any missed import updates.
- **Worker bundle relative paths.** `worker-build.mjs` uses paths relative to its own location (`./src/worker-bundle/earcut.ts`). Moving it into `packages/algorithm/` keeps those paths valid because the script's directory changes in sync with its entry point.
- **vitest workspace discovery.** vitest 2.x supports the `projects` field in the root config. If the version in the Task 1 `devDependencies` block is older, it may not — verify by running `pnpm test` after Task 2 and debug if the geo-interface tests are not discovered.
- **Biome import-style lint.** The biome config enables `useImportType` with `separatedType` style, which requires type-only imports to be in their own `import type` block. When consolidating imports during the moves (Steps 4.6, 5.9, 5.12), keep value imports and type imports in separate blocks.
- **`tests/fixtures` export path.** The `@geoarrow/geo-interface` `package.json` exports `./tests/fixtures` as a raw `.ts` file. This works for workspace consumers using vitest (which has its own TS transform) but would not work for external consumers who only installed the published `dist/`. That is fine for PR 2 (which is a workspace consumer) and the question of publishing the fixtures as a separate entrypoint is deferred.

## Rollback plan

If any task fails in a way that cannot be fixed forward in the same session, `git reset --hard HEAD~N` back to the commit before the failing task and retry. Each task's commit message starts with `chore:` and is easy to identify in `git log`.

No task depends on an external service or publishes anything, so rollback is always local and safe.
