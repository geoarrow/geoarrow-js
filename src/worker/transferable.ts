import { Data, Vector, BufferType, type DataType } from "apache-arrow";
import { hardClone } from "./hard-clone";

/**
 * Prepare a `Data` or `Vector` for a `postMessage` or `structuredClone`.
 */
export function preparePostMessage<T extends DataType>(
  input: Data<T>,
  forceClone?: boolean,
): [Data<T>, ArrayBuffer[]];
export function preparePostMessage<T extends DataType>(
  input: Vector<T>,
  forceClone?: boolean,
): [Vector<T>, ArrayBuffer[]];

export function preparePostMessage<T extends DataType>(
  input: Data<T> | Vector<T>,
  forceClone: boolean = false,
): [Data<T> | Vector<T>, ArrayBuffer[]] {
  // Check if `input` is an arrow.Vector
  if ("data" in input) {
    const postMessageDatas: Data<T>[] = [];
    const transferArrayBuffers: ArrayBuffer[] = [];
    for (const data of input.data) {
      const [postMessageData, arrayBuffers] = preparePostMessage(data);
      postMessageDatas.push(postMessageData);
      transferArrayBuffers.push(...arrayBuffers);
    }
    const vector = new Vector(postMessageDatas);
    return [vector, transferArrayBuffers];
  }

  // Force clone into non-shared backing ArrayBuffers
  // Note: this only clones if necessary, unless forceClone is `true`.
  input = hardClone(input, forceClone);

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
  if (input.buffers[BufferType.OFFSET] !== undefined) {
    transferArrayBuffers.push(input.buffers[BufferType.OFFSET].buffer);
  }

  if (input.buffers[BufferType.DATA] !== undefined) {
    transferArrayBuffers.push(input.buffers[BufferType.DATA].buffer);
  }
  if (input.buffers[BufferType.VALIDITY] !== undefined) {
    transferArrayBuffers.push(input.buffers[BufferType.VALIDITY].buffer);
  }
  if (input.buffers[BufferType.TYPE] !== undefined) {
    transferArrayBuffers.push(input.buffers[BufferType.TYPE].buffer);
  }

  return [input, transferArrayBuffers];
}
