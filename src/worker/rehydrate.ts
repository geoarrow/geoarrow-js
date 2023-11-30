import * as arrow from "apache-arrow";
import type { Buffers } from "apache-arrow/data";

// Typedefs that include only the information kept from a structuredClone
type PostMessageDataType = Pick<arrow.DataType, "children"> & {
  __type: arrow.Type;
};
type PostMessageField = Pick<arrow.Field, "name" | "nullable" | "metadata"> & {
  type: PostMessageDataType;
};
type PostMessageData<T extends arrow.DataType> = Pick<
  arrow.Data<T>,
  | "type"
  | "length"
  | "offset"
  | "stride"
  | "children"
  | "dictionary"
  | "values"
  | "typeIds"
  | "nullBitmap"
  | "valueOffsets"
>;
type PostMessageVector<T extends arrow.DataType> = Pick<
  arrow.Vector,
  "data" | "length" | "stride" | "numChildren"
> & { type: PostMessageDataType };

function rehydrateType<T extends arrow.Type>(
  type: PostMessageDataType,
): arrow.DataType<T> {
  // Note: by default in Arrow JS, the `DataType` is a class with no identifying
  // attribute. Since a `structuredClone` is unable to maintain class
  // information, the result of `structuredClone(new arrow.Utf8())` is an empty
  // object `{}`.
  //
  // To get around this, in `preparePostMessage`, we manually assign the
  // `typeId` (usually a getter) onto `__type`. Then when rehydrating the type,
  // we can match on the `__type`, checking `arrow.Type` values, and
  // reconstitute a full `arrow.DataType` object.
  switch (type.__type) {
    case arrow.Type.Null:
      return new arrow.Null() as arrow.DataType<T>;
    case arrow.Type.Int:
      // @ts-expect-error
      return new arrow.Int(type.isSigned, type.bitWidth);
    case arrow.Type.Float:
      // @ts-expect-error
      return new arrow.Float(type.precision);
    case arrow.Type.Binary:
      // @ts-expect-error
      return new arrow.Binary();
    case arrow.Type.Utf8:
      // @ts-expect-error
      return new arrow.Utf8();
    case arrow.Type.Bool:
      // @ts-expect-error
      return new arrow.Bool();
    case arrow.Type.Decimal:
      // @ts-expect-error
      return new arrow.Decimal(type.scale, type.precision, type.bitWidth);
    case arrow.Type.Date:
      // @ts-expect-error
      return new arrow.Date_(type.unit);
    // return new arrow.Date
    case arrow.Type.Time:
      // @ts-expect-error
      return new arrow.Time(type.unit, type.bitWidth);
    case arrow.Type.Timestamp:
      // @ts-expect-error
      return new arrow.Timestamp(type.unit, type.timezone);
    case arrow.Type.Interval:
      // @ts-expect-error
      return new arrow.Interval(type.unit);
    case arrow.Type.List: {
      const children = type.children.map(rehydrateField);
      if (children.length > 1) throw new Error("expected 1 field");
      // @ts-expect-error
      return new arrow.List(children[0]);
    }
    case arrow.Type.Struct: {
      const children = type.children.map(rehydrateField);
      // @ts-expect-error
      return new arrow.Struct(children);
    }
    case arrow.Type.Union: {
      const children = type.children.map(rehydrateField);
      // @ts-expect-error
      return new arrow.Union(type.mode, type.typeIds, children);
    }
    case arrow.Type.FixedSizeBinary:
      // @ts-expect-error
      return new arrow.FixedSizeBinary(type.byteWidth);
    case arrow.Type.FixedSizeList: {
      const children = type.children.map(rehydrateField);
      if (children.length > 1) throw new Error("expected 1 field");
      // @ts-expect-error
      return new arrow.FixedSizeList(type.listSize, children[0]);
    }
    case arrow.Type.Map: {
      const children = type.children.map(rehydrateField);
      if (children.length > 1) throw new Error("expected 1 field");
      const entries = children[0];
      // @ts-expect-error
      return new arrow.Map_(entries, type.keysSorted);
    }
    case arrow.Type.Duration:
      // @ts-expect-error
      return new arrow.Duration(type.unit);
    default:
      throw new Error(`unknown type ${type}`);
  }
}

function rehydrateField(field: PostMessageField): arrow.Field {
  const type = rehydrateType(field.type);
  return new arrow.Field(field.name, type, field.nullable, field.metadata);
}

/**
 * Rehydrate a `Data` object that has been `structuredClone`'d or
 * `postMessage`'d. The `Data` **must** have been prepared with
 * `preparePostMessage` to be accurately recreated.
 */
export function rehydrateData<T extends arrow.DataType>(
  data: PostMessageData<T>,
): arrow.Data<T> {
  const children = data.children.map((childData) => rehydrateData(childData));
  const dictionary = data.dictionary
    ? rehydrateVector(data.dictionary)
    : undefined;

  // data.buffers is a getter, so we need to recreate Buffers from the
  // attributes on data
  const buffers: Buffers<T> = {
    [arrow.BufferType.OFFSET]: data.valueOffsets,
    [arrow.BufferType.DATA]: data.values,
    [arrow.BufferType.VALIDITY]: data.nullBitmap,
    [arrow.BufferType.TYPE]: data.typeIds,
  };

  // @ts-expect-error
  return new arrow.Data(
    // @ts-expect-error
    rehydrateType(data.type),
    data.offset,
    data.length,
    // @ts-expect-error
    data._nullCount,
    buffers,
    children,
    dictionary,
  );
}

/**
 * Rehydrate a `Vector` object that has been `structuredClone`'d or
 * `postMessage`'d. The `Vector` **must** have been prepared with
 * `preparePostMessage` to be accurately recreated.
 */
export function rehydrateVector<T extends arrow.DataType>(
  vector: PostMessageVector<T>,
): arrow.Vector<T> {
  return new arrow.Vector(vector.data.map((data) => rehydrateData(data)));
}
