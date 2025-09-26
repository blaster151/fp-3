import type { SimpleCat } from "./simple-cat";

export const Dual = <Obj, Arr>(C: SimpleCat<Obj, Arr>): SimpleCat<Obj, Arr> => ({
  id: (object) => C.id(object),
  compose: (g, f) => C.compose(f, g),
  src: (arrow) => C.dst(arrow),
  dst: (arrow) => C.src(arrow),
});

export const isInvolutive = <Obj, Arr>(
  C: SimpleCat<Obj, Arr>,
  sampleArrows: ReadonlyArray<Arr>,
  sampleObjects: ReadonlyArray<Obj>,
): boolean => {
  const DD = Dual(Dual(C));
  return sampleObjects.every((object) => {
    const cid = C.id(object);
    const did = DD.id(object);
    return Object.is(C.src(cid), DD.src(did)) && Object.is(C.dst(cid), DD.dst(did));
  }) && sampleArrows.every((arrow) =>
    Object.is(C.src(arrow), DD.src(arrow)) && Object.is(C.dst(arrow), DD.dst(arrow))
  );
};
