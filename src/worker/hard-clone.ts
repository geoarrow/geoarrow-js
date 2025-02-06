import { Data, DataType, Vector, BufferType } from "apache-arrow";
import type { Buffers } from "apache-arrow/data";

type TypedArray =
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Float32Array
  | Float64Array;

/**
 * Clone an Arrow JS Data or Vector, detaching from an existing ArrayBuffer if
 * it is shared with other.
 *
 * The purpose of this function is to enable transferring a `Data` instance,
 * e.g. to a web worker, without neutering any other data.
 *
 * Any internal buffers that are a slice of a larger `ArrayBuffer` (i.e. where
 * the typed array's `byteOffset` is not `0` and where its `byteLength` does not
 * match its `array.buffer.byteLength`) are copied into new `ArrayBuffers`.
 *
 * If `force` is `true`, always clone internal buffers, even if not shared. If
 * the default, `false`, any internal buffers that are **not** a slice of a
 * larger `ArrayBuffer` will not be copied.
 */
export function hardClone<T extends DataType>(
  input: Data<T>,
  force?: boolean,
): Data<T>;
export function hardClone<T extends DataType>(
  input: Vector<T>,
  force?: boolean,
): Vector<T>;

export function hardClone<T extends DataType>(
  data: Data<T> | Vector<T>,
  force: boolean = false,
): Data<T> | Vector<T> {
  // Check if `data` is an arrow.Vector
  if ("data" in data) {
    return new Vector(data.data.map((data) => hardClone(data, force)));
  }

  // Clone each of the children, recursively
  const clonedChildren: Data[] = [];
  for (const childData of data.children) {
    clonedChildren.push(hardClone(childData, force));
  }

  // Clone the dictionary if there is one
  let clonedDictionary: Vector | undefined = undefined;
  if (data.dictionary !== undefined) {
    clonedDictionary = hardClone(data.dictionary, force);
  }

  // Buffers can have up to four entries. Each of these can be `undefined` for
  // one or more array types.
  //
  // - OFFSET: value offsets for variable size list types
  // - DATA: the underlying data
  // - VALIDITY: the null buffer. This may be empty or undefined if all elements
  //   are non-null/valid.
  // - TYPE: type ids for a union type.
  const clonedBuffers: Buffers<T> = {
    [BufferType.OFFSET]: cloneBuffer(data.buffers[BufferType.OFFSET], force),
    [BufferType.DATA]: cloneBuffer(data.buffers[BufferType.DATA], force),
    [BufferType.VALIDITY]: cloneBuffer(
      data.buffers[BufferType.VALIDITY],
      force,
    ),
    [BufferType.TYPE]: cloneBuffer(data.buffers[BufferType.TYPE], force),
  };

  // Note: the data.offset is passed on so that a sliced Data instance will not
  // be "un-sliced". However keep in mind that this means we're cloning the
  // _original backing buffer_, not only the portion of the Data that was
  // sliced.
  return new Data(
    data.type,
    data.offset,
    data.length,
    // @ts-expect-error _nullCount is protected. We're using it here to mimic
    // `Data.clone`
    data._nullCount,
    clonedBuffers,
    clonedChildren,
    clonedDictionary,
  );
}

/**
 * Test whether an Data instance is a slice of a larger `ArrayBuffer`.
 */
export function isShared<T extends DataType>(
  data: Data<T> | Vector<T>,
): boolean {
  // Loop over arrow.Vector
  if ("data" in data) {
    return data.data.some((data) => isShared(data));
  }

  // Check child data
  for (const childData of data.children) {
    if (isShared(childData)) {
      return true;
    }
  }

  // Check dictionary
  if (data.dictionary !== undefined) {
    if (isShared(data.dictionary)) {
      return true;
    }
  }

  const bufferTypes = [
    BufferType.OFFSET,
    BufferType.DATA,
    BufferType.VALIDITY,
    BufferType.TYPE,
  ];
  for (const bufferType of bufferTypes) {
    if (
      data.buffers[bufferType] !== undefined &&
      isTypedArraySliced(data.buffers[bufferType])
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Returns true if the current typed array is a partial slice on a larger
 * ArrayBuffer
 */
function isTypedArraySliced(arr: TypedArray): boolean {
  return !(arr.byteOffset === 0 && arr.byteLength === arr.buffer.byteLength);
}

/**
 * If a slice of a larger ArrayBuffer, clone to a fresh `ArrayBuffer`.
 *
 * If `force` is `true`, always clone the array, even if not shared.
 */
function cloneBuffer<A extends TypedArray | undefined>(
  arr: A,
  force: boolean,
): A {
  // Not all buffer types are defined for every type of Arrow array. E.g.
  // `arrow.BufferType.TYPE` is only defined for the Union type.
  if (arr === undefined) {
    return arr;
  }

  // The current array is not a part of a larger ArrayBuffer, don't clone it
  if (!force && !isTypedArraySliced(arr)) {
    return arr;
  }

  // Note: TypedArray.slice() **copies** into a new ArrayBuffer

  // @ts-expect-error 'Uint8Array' is assignable to the constraint of type 'A',
  // but 'A' could be instantiated with a different subtype of constraint
  // 'TypedArray'
  // We know from arr.slice that it will always return the same
  return arr.slice();
}
