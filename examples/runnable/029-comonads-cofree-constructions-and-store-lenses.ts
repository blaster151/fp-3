import type { RunnableExample } from "./types";
import type { Lens, Store } from "./store";
import { collectStore, focusStore, makeLens, storeExtend, storeExtract } from "./store";

type Env<Environment, Value> = readonly [Environment, Value];

type Monoid<Value> = {
  readonly empty: Value;
  readonly concat: (left: Value, right: Value) => Value;
};

type Traced<Carrier, Value> = (carrier: Carrier) => Value;

type Cofree<Value> = {
  readonly head: Value;
  readonly tail: ReadonlyArray<Cofree<Value>>;
};

type CofreeBreadcrumb<Value> = {
  readonly parent: Cofree<Value>;
  readonly left: ReadonlyArray<Cofree<Value>>;
  readonly right: ReadonlyArray<Cofree<Value>>;
};

type CofreeZipper<Value> = {
  readonly focus: Cofree<Value>;
  readonly breadcrumbs: ReadonlyArray<CofreeBreadcrumb<Value>>;
};

function envExtract<Environment, Value>(env: Env<Environment, Value>): Value {
  return env[1];
}

function envAsk<Environment, Value>(env: Env<Environment, Value>): Environment {
  return env[0];
}

function envExtend<Environment, Value, ResultValue>(
  env: Env<Environment, Value>,
  mapper: (cursor: Env<Environment, Value>) => ResultValue,
): Env<Environment, ResultValue> {
  return [env[0], mapper(env)];
}

function tracedExtract<Carrier, Value>(monoid: Monoid<Carrier>, traced: Traced<Carrier, Value>): Value {
  return traced(monoid.empty);
}

function tracedExtend<Carrier, Value, ResultValue>(
  monoid: Monoid<Carrier>,
  traced: Traced<Carrier, Value>,
  mapper: (cursor: Traced<Carrier, Value>) => ResultValue,
): Traced<Carrier, ResultValue> {
  return (carrier) => mapper((shift) => traced(monoid.concat(carrier, shift)));
}

function cofreeExtract<Value>(cofree: Cofree<Value>): Value {
  return cofree.head;
}

function cofreeExtend<Value, ResultValue>(
  cofree: Cofree<Value>,
  mapper: (node: Cofree<Value>) => ResultValue,
): Cofree<ResultValue> {
  return {
    head: mapper(cofree),
    tail: cofree.tail.map((child) => cofreeExtend(child, mapper)),
  };
}

function countNodes<Value>(cofree: Cofree<Value>): number {
  return 1 + cofree.tail.reduce((count, child) => count + countNodes(child), 0);
}

function toZipper<Value>(cofree: Cofree<Value>): CofreeZipper<Value> {
  return { focus: cofree, breadcrumbs: [] };
}

function downFirst<Value>(zipper: CofreeZipper<Value>): CofreeZipper<Value> {
  if (zipper.focus.tail.length === 0) {
    return zipper;
  }
  const [first, ...rest] = zipper.focus.tail as [Cofree<Value>, ...Cofree<Value>[]];
  const crumb: CofreeBreadcrumb<Value> = { parent: zipper.focus, left: [], right: rest };
  return { focus: first, breadcrumbs: [crumb, ...zipper.breadcrumbs] };
}

function downNext<Value>(zipper: CofreeZipper<Value>): CofreeZipper<Value> {
  if (zipper.breadcrumbs.length === 0) {
    return zipper;
  }
  const [crumb, ...rest] = zipper.breadcrumbs as [CofreeBreadcrumb<Value>, ...CofreeBreadcrumb<Value>[]];
  if (crumb.right.length === 0) {
    return zipper;
  }
  const [next, ...nextRight] = crumb.right as [Cofree<Value>, ...Cofree<Value>[]];
  const updatedCrumb: CofreeBreadcrumb<Value> = {
    parent: crumb.parent,
    left: [...crumb.left, zipper.focus],
    right: nextRight,
  };
  return { focus: next, breadcrumbs: [updatedCrumb, ...rest] };
}

function up<Value>(zipper: CofreeZipper<Value>): CofreeZipper<Value> {
  if (zipper.breadcrumbs.length === 0) {
    return zipper;
  }
  const [crumb, ...rest] = zipper.breadcrumbs as [CofreeBreadcrumb<Value>, ...CofreeBreadcrumb<Value>[]];
  const parent: Cofree<Value> = {
    head: crumb.parent.head,
    tail: [...crumb.left, zipper.focus, ...crumb.right],
  };
  return { focus: parent, breadcrumbs: rest };
}

export const comonadsCofreeConstructionsAndStoreLenses: RunnableExample = {
  id: "029",
  title: "Comonads, cofree constructions, and Store lenses",
  outlineReference: 29,
  summary:
    "Showcases Store/Env/Traced comonads, array-based cofree structures with zipper navigation, and Store×Lens smoothing with a DoCo-style summary pipeline.",
  async run() {
    type Point = { readonly x: number; readonly y: number };

    const gridStore: Store<Point, string> = {
      pos: { x: 0, y: 0 },
      peek: (point) => `(${point.x},${point.y})`,
    };

    const neighbourhood = storeExtend(gridStore, (cursor) => {
      const here = storeExtract(cursor);
      const right = cursor.peek({ x: cursor.pos.x + 1, y: cursor.pos.y });
      const up = cursor.peek({ x: cursor.pos.x, y: cursor.pos.y + 1 });
      return `center ${here} | right ${right} | up ${up}`;
    });

    const storeSection = [
      "== Store comonad ==",
      `Extract at origin → ${storeExtract(gridStore)}`,
      `Extend to compare neighbours → ${storeExtract(neighbourhood)}`,
    ];

    type Locale = { readonly locale: "en" | "fr" };
    const environment: Env<Locale, number> = [{ locale: "en" }, 42];
    const envResult = envExtend(environment, (cursor) => `${envAsk(cursor).locale}:${envExtract(cursor)}`);

    const envSection = [
      "== Env comonad ==",
      `Ask environment → ${envAsk(environment).locale}`,
      `Extend with annotation → ${envExtract(envResult)}`,
    ];

    const sumMonoid: Monoid<number> = { empty: 0, concat: (left, right) => left + right };
    const traced: Traced<number, number> = (offset) => (offset + 3) * 5;
    const tracedPipeline = tracedExtend(sumMonoid, traced, (cursor) => cursor(2) - cursor(-2));

    const tracedSection = [
      "== Traced comonad ==",
      `Extract at empty trace → ${tracedExtract(sumMonoid, traced)}`,
      `Extend with symmetric window → ${tracedPipeline(0)}`,
    ];

    type Labelled = { readonly label: string };
    const labelledTree: Cofree<Labelled> = {
      head: { label: "root" },
      tail: [
        { head: { label: "left" }, tail: [] },
        {
          head: { label: "right" },
          tail: [{ head: { label: "right-child" }, tail: [] }],
        },
      ],
    };

    const sizeAnnotations = cofreeExtend(labelledTree, (node) => ({ label: node.head.label, size: countNodes(node) }));

    const zipper = downFirst(toZipper(labelledTree));
    const rightSibling = downNext(zipper);
    const returnedToRoot = up(rightSibling);

    const cofreeSection = [
      "== Cofree array comonad ==",
      `Root size annotation → label=${sizeAnnotations.head.label}, size=${sizeAnnotations.head.size}`,
      `Left child annotation → label=${sizeAnnotations.tail[0]?.head.label}, size=${sizeAnnotations.tail[0]?.head.size}`,
      `Zipper navigation: root→left→right sibling → focus=${rightSibling.focus.head.label}`,
      `Zipper back to root → focus=${returnedToRoot.focus.head.label}`,
    ];

    const pointLens = makeLens<Point, number>(
      (point) => point.x,
      (focus, point) => ({ ...point, x: focus }),
    );

    const telemetryStore: Store<Point, number> = {
      pos: { x: 2, y: 3 },
      peek: (point) => point.x * 10 + point.y,
    };

    const focused = focusStore(pointLens, telemetryStore);
    const smoothed = storeExtend(focused, (cursor) => {
      const here = storeExtract(cursor);
      const plusOne = cursor.peek(cursor.pos + 1);
      const minusOne = cursor.peek(cursor.pos - 1);
      const average = Math.round((here + plusOne + minusOne) / 3);
      return { here, average };
    });

    const storeProgram = storeExtend(telemetryStore, (cursor) => {
      const here = storeExtract(cursor);
      const right = cursor.peek({ x: cursor.pos.x + 1, y: cursor.pos.y });
      const down = cursor.peek({ x: cursor.pos.x, y: cursor.pos.y - 1 });
      const sum = here + right + down;
      const parity = sum % 2 === 0 ? "even" : "odd";
      return { here, right, down, sum, parity };
    });

    const storeLensSection = [
      "== Store × Lens smoothing ==",
      `Focused extract (x=2) → ${storeExtract(focused)}`,
      `Focused peek at x=5 → ${focused.peek(5)}`,
      `Lens-smoothed average around x=2 → ${JSON.stringify(storeExtract(smoothed))}`,
      `DoCo-style summary → ${JSON.stringify(storeExtract(storeProgram))}`,
    ];

    return {
      logs: [...storeSection, ...envSection, ...tracedSection, ...cofreeSection, ...storeLensSection],
    };
  },
};
