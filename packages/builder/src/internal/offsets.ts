/**
 * Pre-sized Int32 running-sum offsets buffer for Arrow List levels.
 *
 * The buffer is always `capacity + 1` long, with `buf[0] = 0` and each
 * subsequent entry the running sum of per-row child counts. Callers push
 * the *delta* (child count) per row, not the absolute offset.
 *
 * Capacity is fixed at construction. Callers must append exactly `capacity`
 * rows. Appending more will silently write past the end of the buffer;
 * appending fewer will leave trailing zeros. The two-pass design in
 * `@geoarrow/builder` guarantees exact sizing when capacity classes and
 * builders are used together as intended.
 */
export class OffsetsBuilder {
  private readonly buf: Int32Array;
  private pos = 1;

  constructor(capacity: number) {
    this.buf = new Int32Array(capacity + 1);
  }

  appendLength(n: number): void {
    this.buf[this.pos] = this.buf[this.pos - 1] + n;
    this.pos++;
  }

  finish(): Int32Array {
    return this.buf;
  }
}
