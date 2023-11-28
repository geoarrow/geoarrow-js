import * as arrow from "apache-arrow";

/**
 * Get all transferable objects from this `Data` or `Vector`
 */
export function getTransferables<T extends arrow.DataType>(
  input: arrow.Data<T> | arrow.Vector<T>,
): ArrayBuffer[] {
  // Check if `input` is an arrow.Vector
  if ("data" in input) {
    return input.data.flatMap((data) => getTransferables(data));
  }

  const arrayBuffers: ArrayBuffer[] = [];

  // Handle children
  for (const childData of input.children) {
    arrayBuffers.push(...getTransferables(childData));
  }

  // Handle dictionary
  if (input.dictionary !== undefined) {
    arrayBuffers.push(...getTransferables(input.dictionary));
  }

  // We don't use a loop over these four to ensure accurate typing (well, typing
  // doesn't seem to work on `DATA` and `TYPE`.)
  if (input.buffers[arrow.BufferType.OFFSET] !== undefined) {
    arrayBuffers.push(input.buffers[arrow.BufferType.OFFSET].buffer);
  }
  if (input.buffers[arrow.BufferType.DATA] !== undefined) {
    arrayBuffers.push(input.buffers[arrow.BufferType.DATA].buffer);
  }
  if (input.buffers[arrow.BufferType.VALIDITY] !== undefined) {
    arrayBuffers.push(input.buffers[arrow.BufferType.VALIDITY].buffer);
  }
  if (input.buffers[arrow.BufferType.TYPE] !== undefined) {
    arrayBuffers.push(input.buffers[arrow.BufferType.TYPE].buffer);
  }

  return arrayBuffers;
}
