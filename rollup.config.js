import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const input = "./src/index.ts";
const sourcemap = true;
const external = ["apache-arrow"];

export default [
  {
    input,
    output: {
      file: "dist/geoarrow.es.mjs",
      format: "es",
      sourcemap,
    },
    plugins: [typescript()],
    external,
  },
  {
    input,
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
    plugins: [dts()],
    external,
  },
  {
    input,
    output: {
      file: "dist/geoarrow.cjs",
      format: "cjs",
      sourcemap,
    },
    plugins: [typescript()],
    external,
  },
  {
    input,
    output: {
      file: "dist/geoarrow.umd.js",
      format: "umd",
      name: "@geoarrow/geoarrow-js",
      sourcemap,
    },
    plugins: [typescript(), terser()],
    external,
  },
];
