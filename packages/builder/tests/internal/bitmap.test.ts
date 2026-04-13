import { describe, expect, it } from "vitest";
import { BitmapBuilder } from "../../src/internal/bitmap.js";

describe("BitmapBuilder", () => {
  it("returns undefined when no null has been appended", () => {
    const b = new BitmapBuilder(16);
    b.appendValid();
    b.appendValid();
    b.appendValid();
    expect(b.finish()).toBeUndefined();
  });

  it("allocates lazily on first null and back-fills prior valids", () => {
    const b = new BitmapBuilder(16);
    b.appendValid(); // idx 0
    b.appendValid(); // idx 1
    b.appendValid(); // idx 2
    b.appendValid(); // idx 3
    b.appendValid(); // idx 4
    b.appendNull(); // idx 5 - triggers allocation
    const buf = b.finish();
    expect(buf).toBeInstanceOf(Uint8Array);
    // byte 0 should have bits 0..4 set (valid) and bit 5 clear (null)
    // 0b0001_1111 = 0x1f
    expect(buf![0]).toBe(0x1f);
  });

  it("treats first-append-is-null correctly", () => {
    const b = new BitmapBuilder(8);
    b.appendNull();
    const buf = b.finish();
    expect(buf).toBeInstanceOf(Uint8Array);
    expect(buf![0] & 1).toBe(0);
  });

  it("allocates exactly once across many nulls", () => {
    const b = new BitmapBuilder(32);
    b.appendValid();
    b.appendNull();
    const firstBuf = b.finish();
    b.appendNull();
    b.appendNull();
    b.appendValid();
    const secondBuf = b.finish();
    expect(secondBuf).toBe(firstBuf); // same underlying buffer reference
  });

  it("respects Arrow's 1=valid / 0=null bit convention", () => {
    const b = new BitmapBuilder(8);
    b.appendValid();
    b.appendNull();
    b.appendValid();
    const buf = b.finish();
    expect(buf).toBeDefined();
    expect((buf![0] >> 0) & 1).toBe(1); // valid
    expect((buf![0] >> 1) & 1).toBe(0); // null
    expect((buf![0] >> 2) & 1).toBe(1); // valid
  });

  it("sizes the buffer based on capacity", () => {
    const b = new BitmapBuilder(17); // ceil(17/8) = 3 bytes
    b.appendNull();
    const buf = b.finish();
    expect(buf).toBeDefined();
    expect(buf!.length).toBe(3);
  });
});
