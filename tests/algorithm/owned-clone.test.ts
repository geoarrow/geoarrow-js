import * as arrow from "apache-arrow";
import { describe, expect, it } from "vitest";
import { hardClone, isShared } from "../../src/worker/hard-clone";

describe("hard clone", (t) => {
  it("should hard clone array", () => {
    const vector = arrow.makeVector(new Int32Array([1, 2, 3]));
    const data = vector.data[0];
    expect(isShared(data)).toBeFalsy();

    const cloned = hardClone(data, true);
    expect(isShared(cloned)).toBeFalsy();

    // transfer the values buffer of the first data instance
    structuredClone(data, { transfer: [data.values.buffer] });

    expect(
      data.values.buffer.byteLength,
      "first buffer should have been neutered",
    ).toStrictEqual(0);
    expect(
      cloned.values.buffer.byteLength,
      "cloned buffer should not have been neutered (checks that they're two different backing buffers)",
    ).toBeGreaterThan(0);
  });
});
