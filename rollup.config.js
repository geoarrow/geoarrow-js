import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const input = "./src/index.ts";
const sourcemap = true;

export default [
  {
    input,
    output: {
      file: "dist/geoarrow.es.mjs",
      format: "es",
      sourcemap,
    },
    plugins: [typescript()],
  },
  {
    input,
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
    plugins: [dts()],
  },
  {
    input,
    output: {
      file: "dist/geoarrow.cjs",
      format: "cjs",
      sourcemap,
    },
    plugins: [typescript()],
  },
  {
    input,
    output: {
      file: "dist/geoarrow.umd.js",
      format: "umd",
      name: "geoarrow",
      sourcemap,
    },
    plugins: [typescript(), terser()],
  },
];
