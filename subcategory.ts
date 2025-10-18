import type { SimpleCat } from "./simple-cat";

export interface SmallCategory<Obj, Arr> extends SimpleCat<Obj, Arr> {
  readonly objects: ReadonlySet<Obj>;
  readonly arrows: ReadonlySet<Arr>;
}

const addIdentity = <Obj, Arr>(
  C: SmallCategory<Obj, Arr>,
  objects: Set<Obj>,
  arrows: Set<Arr>,
): void => {
  for (const object of objects) {
    const idArrow = C.id(object);
    if (C.arrows.has(idArrow)) {
      arrows.add(idArrow);
    }
  }
};

const validateArrowEndpoints = <Obj, Arr>(
  C: SmallCategory<Obj, Arr>,
  arrow: Arr,
  objects: Set<Obj>,
): void => {
  const src = C.src(arrow);
  const dst = C.dst(arrow);
  if (!C.objects.has(src) || !C.objects.has(dst)) {
    throw new Error("makeSubcategory: arrow endpoints must lie in the ambient objects");
  }
  objects.add(src);
  objects.add(dst);
};

export function makeSubcategory<Obj, Arr>(
  C: SmallCategory<Obj, Arr>,
  seedObjects: Iterable<Obj>,
  seedArrows: Iterable<Arr>,
): SmallCategory<Obj, Arr> {
  const objects = new Set(seedObjects);
  for (const object of objects) {
    if (!C.objects.has(object)) {
      throw new Error("makeSubcategory: seed object is not in the ambient category");
    }
  }
  const arrows = new Set<Arr>();

  for (const arrow of seedArrows) {
    if (!C.arrows.has(arrow)) {
      throw new Error("makeSubcategory: seed arrow is not in the ambient category");
    }
    validateArrowEndpoints(C, arrow, objects);
    arrows.add(arrow);
  }

  addIdentity(C, objects, arrows);

  let changed = true;
  while (changed) {
    changed = false;
    const current = Array.from(arrows);
    for (const f of current) {
      const fDst = C.dst(f);
      for (const g of current) {
        const gSrc = C.src(g);
        if (!Object.is(fDst, gSrc)) {
          continue;
        }
        const composite = C.compose(g, f);
        if (!C.arrows.has(composite)) {
          continue;
        }
        if (!arrows.has(composite)) {
          validateArrowEndpoints(C, composite, objects);
          arrows.add(composite);
          changed = true;
        }
      }
    }
    if (changed) {
      addIdentity(C, objects, arrows);
    }
  }

  return {
    objects,
    arrows,
    id: (obj) => C.id(obj),
    compose: (g, f) => C.compose(g, f),
    src: (arrow) => C.src(arrow),
    dst: (arrow) => C.dst(arrow),
  };
}

export function makeFullSubcategory<Obj, Arr>(
  C: SmallCategory<Obj, Arr>,
  seedObjects: Iterable<Obj>,
): SmallCategory<Obj, Arr> {
  const objects = new Set(seedObjects);
  for (const object of objects) {
    if (!C.objects.has(object)) {
      throw new Error("makeFullSubcategory: seed object is not in the ambient category");
    }
  }
  const arrows = new Set<Arr>();

  for (const arrow of C.arrows) {
    const src = C.src(arrow);
    const dst = C.dst(arrow);
    if (objects.has(src) && objects.has(dst)) {
      arrows.add(arrow);
    }
  }

  addIdentity(C, objects, arrows);

  return {
    objects,
    arrows,
    id: (obj) => C.id(obj),
    compose: (g, f) => C.compose(g, f),
    src: (arrow) => C.src(arrow),
    dst: (arrow) => C.dst(arrow),
  };
}

export function isFullSubcategory<Obj, Arr>(
  S: SmallCategory<Obj, Arr>,
  C: SmallCategory<Obj, Arr>,
): boolean {
  for (const arrow of C.arrows) {
    const src = C.src(arrow);
    const dst = C.dst(arrow);
    if (S.objects.has(src) && S.objects.has(dst) && !S.arrows.has(arrow)) {
      return false;
    }
  }
  return true;
}
