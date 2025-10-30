import { lens as profunctorLens } from "../../allTS";
import type { Lens } from "../../allTS";
import { Result } from "./structures";

export type { Lens } from "../../allTS";

export type Store<Position, Value> = {
  readonly pos: Position;
  readonly peek: (position: Position) => Value;
};

export function storeExtract<Position, Value>(store: Store<Position, Value>): Value {
  return store.peek(store.pos);
}

export function storeExtend<Position, Value, ResultValue>(
  store: Store<Position, Value>,
  mapper: (cursor: Store<Position, Value>) => ResultValue,
): Store<Position, ResultValue> {
  return {
    pos: store.pos,
    peek: (position) => mapper({ pos: position, peek: store.peek }),
  };
}

export function storeFromArray<Value>(
  values: ReadonlyArray<Value>,
  focusIndex: number,
): Store<number, Value> {
  if (values.length === 0) {
    throw new Error("Cannot build a Store from an empty collection");
  }
  const clamp = (index: number): number => {
    if (index < 0) {
      return 0;
    }
    if (index >= values.length) {
      return values.length - 1;
    }
    return index;
  };
  return {
    pos: clamp(focusIndex),
    peek: (index) => values[clamp(index)]!,
  };
}

export function collectStore<Value>(length: number): (store: Store<number, Value>) => ReadonlyArray<Value> {
  return (store) => Array.from({ length }, (_, index) => store.peek(index));
}

export function collectStoreFromPositions<Position, Value>(
  positions: ReadonlyArray<Position>,
): (store: Store<Position, Value>) => ReadonlyArray<Value> {
  return (store) => positions.map((position) => store.peek(position));
}

export function makeLens<Source, Focus>(
  get: (source: Source) => Focus,
  set: (focus: Focus, source: Source) => Source,
): Lens<Source, Focus> {
  return profunctorLens(get, set);
}

export function focusStore<Source, Focus, Value>(
  lens: Lens<Source, Focus>,
  store: Store<Source, Value>,
): Store<Focus, Value> {
  return {
    pos: lens.get(store.pos),
    peek: (focus) => store.peek(lens.set(focus)(store.pos)),
  };
}

export function focusValueStore<Position, Source, Focus>(
  lens: Lens<Source, Focus>,
  store: Store<Position, Source>,
): Store<Position, Focus> {
  return {
    pos: store.pos,
    peek: (position) => lens.get(store.peek(position)),
  };
}

export function extendStoreWithLens<Position, Source, Focus>(
  lens: Lens<Source, Focus>,
  transform: (focused: Store<Position, Focus>, cursor: Store<Position, Source>) => Focus,
): (store: Store<Position, Source>) => Store<Position, Source> {
  return (store) =>
    storeExtend(store, (cursor) => {
      const focused: Store<Position, Focus> = {
        pos: cursor.pos,
        peek: (position) => lens.get(cursor.peek(position)),
      };
      const updatedFocus = transform(focused, cursor);
      const current = cursor.peek(cursor.pos);
      return lens.set(updatedFocus)(current);
    });
}

export function sequenceStoreResult<E, Position, Value>(
  store: Store<Position, Result<E, Value>>,
  positions: ReadonlyArray<Position>,
): Result<E, ReadonlyArray<Value>> {
  const collected = positions.map((position) => store.peek(position));
  for (const entry of collected) {
    if (entry.kind === "err") {
      return entry;
    }
  }
  const values = collected.map((entry) => (entry as { readonly kind: "ok"; readonly value: Value }).value);
  return Result.ok(values);
}
