export function assert(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(`assertion failed ${message}`);
  }
}

export function assertFalse(message?: string): never {
  throw new Error(`assertion failed ${message}`);
}
