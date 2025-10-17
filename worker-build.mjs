// worker-build.mjs
import esbuild from "esbuild";

// dist/earcut.worker.js was added to be easier for esbuild to consume, as it
// allows loading as text via:
// ```
// loader: {
//   ".worker.js": "text",
//   ".worker.min.js": "text",
// },
// ```
// We keep dist/earcut-worker.js for backwards compatibility.
for (const outfile of ["dist/earcut-worker.js", "dist/earcut.worker.js"]) {
  esbuild.build({
    entryPoints: ["./src/worker-bundle/earcut.ts"],
    outfile,
    bundle: true,
    minify: false,
    target: ["esnext"],
    format: "esm",
  });
}

// Likewise, earcut-worker.min.js is for backwards compatibility.
for (const outfile of [
  "dist/earcut-worker.min.js",
  "dist/earcut.worker.min.js",
]) {
  esbuild.build({
    entryPoints: ["./src/worker-bundle/earcut.ts"],
    outfile,
    bundle: true,
    minify: true,
    target: ["esnext"],
    format: "esm",
  });
}
