/**
 * Packed Arrow validity bitmap builder.
 *
 * Lazy: starts with `buf === null` and only allocates on the first null
 * append, back-filling the preceding positions as valid. For the common
 * all-valid case, `finish()` returns `undefined`, which is semantically
 * equivalent to a fully-set bitmap but one allocation smaller.
 *
 * Uses Arrow's standard bit convention: `1 = valid`, `0 = null`.
 */
export class BitmapBuilder {
  private buf: Uint8Array | null = null;
  private length = 0;

  constructor(private readonly capacity: number) {}

  appendValid(): void {
    if (this.buf !== null) {
      this.buf[this.length >> 3] |= 1 << (this.length & 7);
    }
    this.length++;
  }

  appendNull(): void {
    if (this.buf === null) {
      this.buf = new Uint8Array(Math.ceil(this.capacity / 8));
      for (let i = 0; i < this.length; i++) {
        this.buf[i >> 3] |= 1 << (i & 7);
      }
    }
    this.length++;
  }

  finish(): Uint8Array | undefined {
    return this.buf ?? undefined;
  }
}
