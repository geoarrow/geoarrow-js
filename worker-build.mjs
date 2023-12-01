// worker-build.mjs
import esbuild from "esbuild";

esbuild.build({
  entryPoints: ["./src/worker-bundle/earcut.ts"],
  outfile: "dist/earcut-worker.js",
  bundle: true,
  minify: false,
  target: ["esnext"],
  format: "esm",
});

esbuild.build({
  entryPoints: ["./src/worker-bundle/earcut.ts"],
  outfile: "dist/earcut-worker.min.js",
  bundle: true,
  minify: true,
  target: ["esnext"],
  format: "esm",
});
