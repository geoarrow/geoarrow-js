import {
  DataType,
  Null,
  Int,
  Float,
  Binary,
  Utf8,
  Bool,
  Decimal,
  Date_,
  Time,
  Timestamp,
  Interval,
  List,
  Struct,
  Union,
  FixedSizeBinary,
  FixedSizeList,
  Map_,
  Duration,
} from "apache-arrow/type";
import { BufferType, Type } from "apache-arrow/enum";
import { Data } from "apache-arrow/data";
import { Vector } from "apache-arrow/vector";
import { Field } from "apache-arrow/schema";
import type { Buffers } from "apache-arrow/data";
import { Polygon, isPolygon } from "../type";
import { PolygonData } from "../data";

// Typedefs that include only the information kept from a structuredClone
type PostMessageDataType = Pick<DataType, "children" | "typeId">;
type PostMessageField = Pick<Field, "name" | "nullable" | "metadata"> & {
  type: PostMessageDataType;
};
type PostMessageData<T extends DataType> = Pick<
  Data<T>,
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
> & {
  type: PostMessageDataType;
};
type PostMessageVector<T extends DataType> = Pick<
  Vector,
  "data" | "length" | "stride" | "numChildren"
> & { type: PostMessageDataType };

function rehydrateType<T extends Type>(type: PostMessageDataType): DataType<T> {
  switch (type.typeId) {
    case Type.Null:
      return new Null() as DataType<T>;
    case Type.Int:
      // @ts-expect-error
      return new Int(type.isSigned, type.bitWidth);
    case Type.Float:
      // @ts-expect-error
      return new Float(type.precision);
    case Type.Binary:
      // @ts-expect-error
      return new Binary();
    case Type.Utf8:
      // @ts-expect-error
      return new Utf8();
    case Type.Bool:
      // @ts-expect-error
      return new Bool();
    case Type.Decimal:
      // @ts-expect-error
      return new Decimal(type.scale, type.precision, type.bitWidth);
    case Type.Date:
      // @ts-expect-error
      return new Date_(type.unit);
    // return new Date
    case Type.Time:
      // @ts-expect-error
      return new Time(type.unit, type.bitWidth);
    case Type.Timestamp:
      // @ts-expect-error
      return new Timestamp(type.unit, type.timezone);
    case Type.Interval:
      // @ts-expect-error
      return new Interval(type.unit);
    case Type.List: {
      const children = type.children.map(rehydrateField);
      if (children.length > 1) throw new Error("expected 1 field");
      // @ts-expect-error
      return new List(children[0]);
    }
    case Type.Struct: {
      const children = type.children.map(rehydrateField);
      // @ts-expect-error
      return new Struct(children);
    }
    case Type.Union: {
      const children = type.children.map(rehydrateField);
      // @ts-expect-error
      return new Union(type.mode, type.typeIds, children);
    }
    case Type.FixedSizeBinary:
      // @ts-expect-error
      return new FixedSizeBinary(type.byteWidth);
    case Type.FixedSizeList: {
      const children = type.children.map(rehydrateField);
      if (children.length > 1) throw new Error("expected 1 field");
      // @ts-expect-error
      return new FixedSizeList(type.listSize, children[0]);
    }
    case Type.Map: {
      const children = type.children.map(rehydrateField);
      if (children.length > 1) throw new Error("expected 1 field");
      const entries = children[0];
      // @ts-expect-error
      return new Map_(entries, type.keysSorted);
    }
    case Type.Duration:
      // @ts-expect-error
      return new Duration(type.unit);
    default:
      throw new Error(`unknown type ${type}`);
  }
}

function rehydrateField(field: PostMessageField): Field {
  const type = rehydrateType(field.type);
  return new Field(field.name, type, field.nullable, field.metadata);
}

/**
 * Rehydrate a `Data` object that has been `structuredClone`'d or
 * `postMessage`'d. The `Data` **must** have been prepared with
 * `preparePostMessage` to be accurately recreated.
 */
export function rehydrateData<T extends DataType>(
  data: PostMessageData<T>,
): Data<T> {
  const children = data.children.map((childData) => rehydrateData(childData));
  const dictionary = data.dictionary
    ? rehydrateVector(data.dictionary)
    : undefined;

  // data.buffers is a getter, so we need to recreate Buffers from the
  // attributes on data
  const buffers: Buffers<T> = {
    [BufferType.OFFSET]: data.valueOffsets,
    [BufferType.DATA]: data.values,
    [BufferType.VALIDITY]: data.nullBitmap,
    [BufferType.TYPE]: data.typeIds,
  };

  // @ts-expect-error
  return new Data(
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
export function rehydrateVector<T extends DataType>(
  vector: PostMessageVector<T>,
): Vector<T> {
  return new Vector(vector.data.map((data) => rehydrateData(data)));
}

export function rehydratePolygonData(
  data: PostMessageData<Polygon>,
): PolygonData {
  if (!isPolygon(data.type)) {
    throw new Error("Expected PolygonData");
  }

  // @ts-expect-error
  // For now, we allow this, even though we never fully recreate the prototypes
  // on the JS side.
  return data;
}
