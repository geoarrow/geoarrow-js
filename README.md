# `geoarrow-js`

A minimal TypeScript implementation of [GeoArrow](https://geoarrow.org/).

This builds on top of [Arrow JS](https://arrow.apache.org/docs/js/index.html) to provide type definitions for geoarrow `Data` and `Vector` objects, as well as selected geometry operations.

It also complements the work-in-progress `geoarrow-wasm`, which will provide Rust-based operations on GeoArrow memory.

## Spatial operations

Only spatial operations that are implemented on binary representations of geometry will be added to this repo.

This means that `geoarrow-js` will not, say, use algorithms from [Turf](https://turfjs.org/), because that would require conversions to and from GeoJSON for the operation.

### Implemented algorithms:

- Polygon area and signed area (via [`@math.gl/polygon`](https://github.com/visgl/math.gl))
- Polygon winding order (via [`@math.gl/polygon`](https://github.com/visgl/math.gl))
- Polygon triangulation (via [`@math.gl/polygon`](https://github.com/visgl/math.gl), a fork of [`earcut`](https://github.com/mapbox/earcut).)
- Coordinate reprojection (via [`proj4`](https://github.com/proj4js/proj4js))
- Total bounds (the bounding box of an array of geometries).
