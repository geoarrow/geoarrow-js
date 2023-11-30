import * as arrow from "apache-arrow";

type PostMessageDataType = {
  __type: arrow.Type;
};
type PostMessageField = {
  type: PostMessageDataType;
  name: string;
  nullable: boolean;
  metadata: Map<string, string>;
};

export function rehydrateType<T extends arrow.Type>(
  type: arrow.DataType<T> & { __type: T },
): arrow.DataType<T> {
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
  // @ts-expect-error
  const type = rehydrateType(field.type);
  return new arrow.Field(field.name, type, field.nullable, field.metadata);
}

export function rehydrateData<T extends arrow.DataType>(
  data: arrow.Data<T>,
): arrow.Data<T> {
  const children = data.children.map((childData) => rehydrateData(childData));
  const dictionary = data.dictionary
    ? rehydrateVector(data.dictionary)
    : undefined;

  // @ts-expect-error
  return new arrow.Data(
    // @ts-expect-error
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
