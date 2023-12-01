import type { TransferDescriptor } from "threads";
import { expose, Transfer } from "threads/worker";
import { PolygonData } from "../data";
import { earcut } from "../algorithm/earcut";

function earcutWorker(polygonData: PolygonData): TransferDescriptor {
  // NOTE!! Here we don't reconstruct a full arrow.Data instance to save on
  // bundle size! We rely on the fact that nothing in the `earcut` function uses
  // any class methods, which is not an ideal/easy assumption. Ideally we'll
  // have functions in the future to validate geometry `Data` instances and
  // construct Data and Vector instances without bringing in all of Arrow JS.

  // const rehydratedData = rehydratePolygonData(polygonData);
  const earcutTriangles = earcut(polygonData);
  return Transfer(earcutTriangles, [earcutTriangles.buffer]);
}

export type EarcutOnWorker = typeof earcutWorker;

expose(earcutWorker);
