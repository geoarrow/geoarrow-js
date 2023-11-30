import * as arrow from "apache-arrow";
import { hardClone } from "./hard-clone";

/**
 * Prepare a `Data` or `Vector` for a `postMessage` or `structuredClone`.
 */
export function preparePostMessage<T extends arrow.DataType>(
  input: arrow.Data<T>,
): [arrow.Data<T>, ArrayBuffer[]];
export function preparePostMessage<T extends arrow.DataType>(
  input: arrow.Vector<T>,
): [arrow.Vector<T>, ArrayBuffer[]];

export function preparePostMessage<T extends arrow.DataType>(
  input: arrow.Data<T> | arrow.Vector<T>,
): [arrow.Data<T> | arrow.Vector<T>, ArrayBuffer[]] {
  // Check if `input` is an arrow.Vector
  if ("data" in input) {
    const postMessageDatas: arrow.Data<T>[] = [];
    const transferArrayBuffers: ArrayBuffer[] = [];
    for (const data of input.data) {
      const [postMessageData, arrayBuffers] = preparePostMessage(data);
      postMessageDatas.push(postMessageData);
      transferArrayBuffers.push(...arrayBuffers);
    }
    const vector = new arrow.Vector(postMessageDatas);
    assignTypeIdOnType(vector.type);
    return [vector, transferArrayBuffers];
  }

  // Force clone into non-shared backing ArrayBuffers
  // Note: this only clones if necessary.
  input = hardClone(input);

  const transferArrayBuffers: ArrayBuffer[] = [];

  // Handle children
  for (let childIdx = 0; childIdx < input.children.length; childIdx++) {
    const childData = input.children[childIdx];
    const [postMessageData, arrayBuffers] = preparePostMessage(childData);
    input.children[childIdx] = postMessageData;
    transferArrayBuffers.push(...arrayBuffers);
  }

  // Handle dictionary
  if (input.dictionary !== undefined) {
    const [postMessageVector, arrayBuffers] = preparePostMessage(
      input.dictionary,
    );
    input.dictionary = postMessageVector;
    transferArrayBuffers.push(...arrayBuffers);
  }

  // Get references to the underlying buffers.

  // We don't use a loop over these four to ensure accurate typing (well, typing
  // doesn't seem to work on `DATA` and `TYPE`.)
  if (input.buffers[arrow.BufferType.OFFSET] !== undefined) {
    transferArrayBuffers.push(input.buffers[arrow.BufferType.OFFSET].buffer);
  }
  if (input.buffers[arrow.BufferType.DATA] !== undefined) {
    transferArrayBuffers.push(input.buffers[arrow.BufferType.DATA].buffer);
  }
  if (input.buffers[arrow.BufferType.VALIDITY] !== undefined) {
    transferArrayBuffers.push(input.buffers[arrow.BufferType.VALIDITY].buffer);
  }
  if (input.buffers[arrow.BufferType.TYPE] !== undefined) {
    transferArrayBuffers.push(input.buffers[arrow.BufferType.TYPE].buffer);
  }

  assignTypeIdOnType(input.type);

  return [input, transferArrayBuffers];
}

function assignTypeIdOnType<T extends arrow.Type>(
  type: arrow.DataType<T>,
): void {
  // @ts-expect-error __type does not exist
  type.__type = type.typeId;

  if (type.children && type.children.length > 0) {
    for (const child of type.children) {
      assignTypeIdOnType(child.type);
    }
  }
}
