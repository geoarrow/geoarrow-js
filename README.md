# `geoarrow-js`

A minimal TypeScript implementation of [GeoArrow](https://geoarrow.org/) building on top of [Arrow JS](https://arrow.apache.org/docs/js/index.html).

It complements the work-in-progress [`geoarrow-wasm`](https://github.com/geoarrow/geoarrow-rs/tree/main/js), which will provide Rust-based operations on GeoArrow memory.

## Features

- Performant spatial operations.
- Rich static typing of geometry arrays.
- Tree shakeable.
- Utilities for sharing Arrow data across Web Workers (not specific to GeoArrow)

## Spatial operations

Only spatial operations that are implemented on binary representations of geometry will be added to this repo.

This means that `geoarrow-js` will not, say, use algorithms from [Turf](https://turfjs.org/), because that would require conversions to and from GeoJSON for the operation.

### Implemented algorithms:

Refer to the [`algorithm` namespace](https://geoarrow.github.io/geoarrow-js/modules/algorithm.html) in the docs.

- Polygon area and signed area (via [`@math.gl/polygon`](https://github.com/visgl/math.gl))
- Polygon winding order (via [`@math.gl/polygon`](https://github.com/visgl/math.gl))
- Polygon triangulation (via [`@math.gl/polygon`](https://github.com/visgl/math.gl), a fork of [`earcut`](https://github.com/mapbox/earcut).)
- Coordinate reprojection (via [`proj4`](https://github.com/proj4js/proj4js))
- Total bounds (the bounding box of an array of geometries).

## Web Worker utilities

Refer to the [`worker` namespace](https://geoarrow.github.io/geoarrow-js/modules/worker.html). Note that due to limitations in Arrow JS (as of v14) you **must** use `preparePostMessage` before a call to `structuredClone` or `postMessage`, to ensure it can correctly be rehydrated on the worker.

```ts
import * as arrow from "apache-arrow";
import {
  preparePostMessage,
  rehydrateVector,
} from "@geoarrow/geoarrow-js/worker";

const originalVector = arrow.makeVector(new Int32Array([1, 2, 3]));
const [preparedVector, arrayBuffers] = preparePostMessage(originalVector);

// Here we use structuredClone to simulate a postMessage but on the main thread
const receivedVector = structuredClone(preparedVector, {
  transfer: arrayBuffers,
});
const rehydratedVector = rehydrateVector(receivedVector);
```

## Ecosystem

`geoarrow-js` is designed to be used seamlessly with WebAssembly-based GeoArrow operations, such as those in the JavaScript bindings of the Rust GeoArrow implementation, and with rendering libraries, such as [deck.gl](https://deck.gl/), with the help of [`@geoarrow/deck.gl-layers`](https://github.com/geoarrow/deck.gl-layers).

For more background on my plans for GeoArrow ecosystem in JS and WebAssembly, refer to [this thread](https://github.com/geoarrow/geoarrow-rs/issues/283).
