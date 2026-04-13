// Produces the standalone earcut web-worker bundles that consumers can load
// directly via `new Worker(url)` or import as text (e.g. via an esbuild
// loader: { ".worker.js": "text", ".worker.min.js": "text" }).
import esbuild from "esbuild";

const common = {
  entryPoints: ["./src/worker-bundle/earcut.ts"],
  bundle: true,
  target: ["esnext"],
  format: "esm",
};

await Promise.all([
  esbuild.build({
    ...common,
    outfile: "dist/earcut.worker.js",
    minify: false,
  }),
  esbuild.build({
    ...common,
    outfile: "dist/earcut.worker.min.js",
    minify: true,
  }),
]);
