import * as arrow from "apache-arrow";
import { describe, expect, it } from "vitest";
import { rehydrateData, preparePostMessage } from "../../src/worker";

describe("transfer", (t) => {
  it("should transfer correctly", () => {
    const vector = arrow.makeVector(new Int32Array([1, 2, 3]));
    const firstValue = vector.get(0);
    const originalData = vector.data[0];
    // console.log("original data", originalData);
    // console.log(originalData.buffers);

    const [preparedData, arrayBuffers] = preparePostMessage(originalData);
    const receivedData = structuredClone(preparedData, {
      transfer: arrayBuffers,
    });
    // console.log("received data");
    // console.log(receivedData);

    const rehydratedData = rehydrateData(receivedData);
    // console.log("rehydrated data");
    // console.log(rehydratedData);

    expect(
      rehydratedData instanceof arrow.Data,
      "rehydrated data should be an instance of arrow.Data",
    ).toBeTruthy();
    expect(
      rehydratedData.type instanceof arrow.DataType,
      "rehydrated data's type should be an instance of arrow.DataType",
    ).toBeTruthy();
    expect(
      originalData.values.buffer.byteLength,
      "original values buffer should have been detached",
    ).toStrictEqual(0);
    expect(
      new arrow.Vector([rehydratedData]).get(0),
      "should match first value",
    ).toStrictEqual(firstValue);
  });
});
