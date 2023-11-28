import * as arrow from "apache-arrow";

export function rehydrateType<T extends arrow.DataType>(type: T): T {
  // TODO: type is a class and will get lost when structured cloned. We'll have
  // to implement a JSON type representation
  return type;
}

export function rehydrateData<T extends arrow.DataType>(
  data: arrow.Data<T>,
): arrow.Data<T> {
  const children = data.children.map((childData) => rehydrateData(childData));
  const dictionary = data.dictionary
    ? rehydrateVector(data.dictionary)
    : undefined;

  return new arrow.Data(
    rehydrateType(data.type),
    data.offset,
    data.length,
    // @ts-expect-error
    data._nullCount,
    data.buffers,
    children,
    dictionary,
  );
}

export function rehydrateVector<T extends arrow.DataType>(
  vector: arrow.Vector<T>,
): arrow.Vector<T> {
  return new arrow.Vector(vector.data.map((data) => rehydrateData(data)));
}
