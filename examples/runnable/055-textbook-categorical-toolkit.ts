import type { RunnableExample } from "./types";

declare function require(id: string): any;

type Morph = { readonly src: unknown; readonly dst: unknown };

type FiniteCategory<Obj, Arr> = {
  readonly objects: ReadonlyArray<Obj>;
  readonly arrows: ReadonlyArray<Arr>;
  readonly id: (object: Obj) => Arr;
  readonly compose: (g: Arr, f: Arr) => Arr;
  readonly src: (arrow: Arr) => Obj;
  readonly dst: (arrow: Arr) => Obj;
  readonly eq: (a: Arr, b: Arr) => boolean;
};

type SliceObject<Obj, Arr> = { readonly domain: Obj; readonly arrowToAnchor: Arr };

type SliceArrow<Obj, Arr> = {
  readonly src: SliceObject<Obj, Arr>;
  readonly dst: SliceObject<Obj, Arr>;
  readonly mediating: Arr;
};

type SliceToolkit<Obj, Arr> = {
  readonly category: FiniteCategory<SliceObject<Obj, Arr>, SliceArrow<Obj, Arr>>;
  readonly projection: (object: SliceObject<Obj, Arr>) => Obj;
  readonly anchor: Obj;
};

type CosliceObject<Obj, Arr> = { readonly codomain: Obj; readonly arrowFromAnchor: Arr };

type CosliceArrow<Obj, Arr> = {
  readonly src: CosliceObject<Obj, Arr>;
  readonly dst: CosliceObject<Obj, Arr>;
  readonly mediating: Arr;
};

type CosliceToolkit<Obj, Arr> = {
  readonly category: FiniteCategory<CosliceObject<Obj, Arr>, CosliceArrow<Obj, Arr>>;
  readonly inclusion: (object: CosliceObject<Obj, Arr>) => Obj;
  readonly anchor: Obj;
};

type Functor<XO, XA, YO, YA> = {
  readonly F0: (object: XO) => YO;
  readonly F1: (arrow: XA) => YA;
};

type ProductToolkit<Obj, Arr, DObj, DArr> = {
  readonly category: FiniteCategory<readonly [Obj, DObj], {
    readonly src: readonly [Obj, DObj];
    readonly dst: readonly [Obj, DObj];
    readonly cf: Arr;
    readonly dg: DArr;
  }>;
  readonly pi1: Functor<readonly [Obj, DObj], {
    readonly src: readonly [Obj, DObj];
    readonly dst: readonly [Obj, DObj];
    readonly cf: Arr;
    readonly dg: DArr;
  }, Obj, Arr>;
  readonly pi2: Functor<readonly [Obj, DObj], {
    readonly src: readonly [Obj, DObj];
    readonly dst: readonly [Obj, DObj];
    readonly cf: Arr;
    readonly dg: DArr;
  }, DObj, DArr>;
  readonly pairing: <XO, XA>(
    F: Functor<XO, XA, Obj, Arr>,
    G: Functor<XO, XA, DObj, DArr>,
  ) => Functor<XO, XA, readonly [Obj, DObj], {
    readonly src: readonly [Obj, DObj];
    readonly dst: readonly [Obj, DObj];
    readonly cf: Arr;
    readonly dg: DArr;
  }>;
};

type PullbackData<Obj, Arr> = {
  readonly apex: Obj;
  readonly toDomain: Arr;
  readonly toAnchor: Arr;
};

type PullbackCalculator<Obj, Arr> = {
  readonly pullback: (f: Arr, h: Arr) => PullbackData<Obj, Arr>;
  readonly factorCone: (
    target: PullbackData<Obj, Arr>,
    cone: PullbackData<Obj, Arr>,
  ) => { readonly factored: boolean; readonly mediator?: Arr; readonly reason?: string };
  readonly certify: (
    f: Arr,
    h: Arr,
    candidate: PullbackData<Obj, Arr>,
  ) => { readonly valid: boolean; readonly reason?: string; readonly conesChecked: ReadonlyArray<PullbackData<Obj, Arr>> };
  readonly induce: (j: Arr, pf: PullbackData<Obj, Arr>, pg: PullbackData<Obj, Arr>) => Arr;
  readonly comparison: (
    f: Arr,
    h: Arr,
    left: PullbackData<Obj, Arr>,
    right: PullbackData<Obj, Arr>
  ) => {
    readonly leftToRight: Arr;
    readonly rightToLeft: Arr;
  };
  readonly transportPullback: (
    f: Arr,
    h: Arr,
    source: PullbackData<Obj, Arr>,
    iso: { readonly forward: Arr; readonly inverse: Arr },
    candidate: PullbackData<Obj, Arr>,
  ) => PullbackData<Obj, Arr>;
};

type ReindexingFunctor<Obj, Arr> = {
  readonly F0: (object: SliceObject<Obj, Arr>) => SliceObject<Obj, Arr>;
  readonly F1: (arrow: SliceArrow<Obj, Arr>) => SliceArrow<Obj, Arr>;
};

type SmallCategory<Obj, Arr extends Morph> = {
  readonly objects: ReadonlySet<Obj>;
  readonly arrows: ReadonlySet<Arr>;
  readonly id: (object: Obj) => Arr;
  readonly compose: (g: Arr, f: Arr) => Arr;
  readonly src: (arrow: Arr) => Obj;
  readonly dst: (arrow: Arr) => Obj;
};

type SubcategoryToolkit<Obj, Arr extends Morph> = {
  readonly make: (seedObjects: Iterable<Obj>, seedArrows: Iterable<Arr>) => SmallCategory<Obj, Arr>;
  readonly full: (seedObjects: Iterable<Obj>) => SmallCategory<Obj, Arr>;
  readonly isFull: (candidate: SmallCategory<Obj, Arr>) => boolean;
};

type TextbookToolkit<Obj, Arr extends Morph> = {
  readonly base: FiniteCategory<Obj, Arr>;
  readonly dual: () => FiniteCategory<Obj, Arr>;
  readonly sliceAt: (anchor: Obj) => SliceToolkit<Obj, Arr>;
  readonly cosliceFrom: (anchor: Obj) => CosliceToolkit<Obj, Arr>;
  readonly productWith: <DObj, DArr>(category: FiniteCategory<DObj, DArr>) => ProductToolkit<Obj, Arr, DObj, DArr>;
  readonly reindexAlong?: (h: Arr, sourceAnchor: Obj, targetAnchor: Obj) => ReindexingFunctor<Obj, Arr>;
  readonly subcategoryTools?: SubcategoryToolkit<Obj, Arr>;
};

type TextbookToolkitModule = {
  readonly makeTextbookToolkit: <Obj, Arr extends Morph>(
    base: FiniteCategory<Obj, Arr>,
    options?: {
      readonly pullbacks?: PullbackCalculator<Obj, Arr>;
      readonly asSmallCategory?: SmallCategory<Obj, Arr>;
    },
  ) => TextbookToolkit<Obj, Arr>;
};

type PullbackModule = {
  readonly makeFinitePullbackCalculator: <Obj, Arr>(base: FiniteCategory<Obj, Arr>) => PullbackCalculator<Obj, Arr>;
};

const { makeTextbookToolkit } = require("../../textbook-toolkit") as TextbookToolkitModule;
const { makeFinitePullbackCalculator } = require("../../pullback") as PullbackModule;

type ToolkitObj = "Task" | "User" | "Project";

interface ToolkitArrow extends Morph {
  readonly name: string;
  readonly src: ToolkitObj;
  readonly dst: ToolkitObj;
}

const objects: ReadonlyArray<ToolkitObj> = ["Task", "User", "Project"];

const idArrow = (object: ToolkitObj): ToolkitArrow => ({
  name: `id_${object}`,
  src: object,
  dst: object,
});

const anchorT: ToolkitArrow = { name: "anchorT", src: "Task", dst: "Project" };
const anchorU: ToolkitArrow = { name: "anchorU", src: "User", dst: "Project" };
const assigned: ToolkitArrow = { name: "assigned", src: "Task", dst: "User" };

const arrows: ReadonlyArray<ToolkitArrow> = [
  idArrow("Task"),
  idArrow("User"),
  idArrow("Project"),
  anchorT,
  anchorU,
  assigned,
];

const eq = (a: ToolkitArrow, b: ToolkitArrow) => a.name === b.name;

const composeToolkit = (g: ToolkitArrow, f: ToolkitArrow): ToolkitArrow => {
  if (f.dst !== g.src) {
    throw new Error("compose: domain/codomain mismatch");
  }
  const key = `${g.name}∘${f.name}`;
  switch (key) {
    case "anchorU∘assigned":
      return anchorT;
    case "id_Task∘assigned":
      return assigned;
    case "anchorT∘id_Task":
      return anchorT;
    case "anchorU∘id_User":
      return anchorU;
    case "id_User∘assigned":
      return assigned;
    case "id_Project∘anchorU":
      return anchorU;
    case "id_Project∘anchorT":
      return anchorT;
    default:
      if (g.name === `id_${g.dst}`) return f;
      if (f.name === `id_${f.src}`) return g;
      throw new Error(`compose: missing case ${key}`);
  }
};

const baseCategory: FiniteCategory<ToolkitObj, ToolkitArrow> = {
  objects,
  arrows,
  id: idArrow,
  compose: composeToolkit,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
  eq,
};

const smallCategory: SmallCategory<ToolkitObj, ToolkitArrow> = {
  objects: new Set(objects),
  arrows: new Set(arrows),
  id: idArrow,
  compose: composeToolkit,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
};

const pullbacks = makeFinitePullbackCalculator(baseCategory);
const toolkit = makeTextbookToolkit(baseCategory, {
  pullbacks,
  asSmallCategory: smallCategory,
});

function formatArrow(arrow: ToolkitArrow): string {
  return `${arrow.name}: ${arrow.src} → ${arrow.dst}`;
}

function describeBaseCategory(): readonly string[] {
  return [
    "== Base project category ==",
    `Objects: ${objects.join(", ")}`,
    "Arrows:",
    ...arrows.map((arrow) => `  ${formatArrow(arrow)}`),
  ];
}

function describeSlice(): readonly string[] {
  const slice = toolkit.sliceAt("Project");
  const objectLines = slice.category.objects.map(
    (object) => `  ${object.domain} —${object.arrowToAnchor.name}→ ${slice.anchor}`,
  );
  return [
    "== Slice at Project ==",
    ...objectLines,
  ];
}

function describeCoslice(): readonly string[] {
  const coslice = toolkit.cosliceFrom("User");
  const objectLines = coslice.category.objects.map(
    (object) => `  ${coslice.anchor} —${object.arrowFromAnchor.name}→ ${object.codomain}`,
  );
  return [
    "== Coslice from User ==",
    ...objectLines,
  ];
}

function describeDual(): readonly string[] {
  const dual = toolkit.dual();
  return [
    "== Dual category glimpse ==",
    `Dual source of anchorT: ${dual.src(anchorT)} → ${dual.dst(anchorT)}`,
    `Dual source of assigned: ${dual.src(assigned)} → ${dual.dst(assigned)}`,
  ];
}

function describeProduct(): readonly string[] {
  const product = toolkit.productWith(baseCategory);
  const samplePair: readonly [ToolkitObj, ToolkitObj] = ["Task", "User"];
  const pi1Image = product.pi1.F0(samplePair);
  const pi2Image = product.pi2.F0(samplePair);
  const identity = product.category.id(["Task", "Task"] as const);
  const paired = product.pairing(product.pi1, product.pi2).F1(identity);
  return [
    "== Product with itself ==",
    `π₁(Task, User) = ${pi1Image}`,
    `π₂(Task, User) = ${pi2Image}`,
    `Pairing(id, id) yields cf=${paired.cf.name} dg=${paired.dg.name}`,
  ];
}

function describeReindex(): readonly string[] {
  if (!toolkit.reindexAlong) {
    return [];
  }
  const reindex = toolkit.reindexAlong(anchorU, "User", "Project");
  const slice = toolkit.sliceAt("Project");
  const taskSlice = slice.category.objects.find((object) => object.domain === "Task");
  if (!taskSlice) {
    return [];
  }
  const pulled = reindex.F0(taskSlice);
  return [
    "== Pullback-induced reindexing ==",
    `Task→Project reindexes along anchorU to ${pulled.domain} —${pulled.arrowToAnchor.name}→ ${slice.anchor}`,
  ];
}

function describeSubcategoryTools(): readonly string[] {
  if (!toolkit.subcategoryTools) {
    return [];
  }
  const tools = toolkit.subcategoryTools;
  const generated = tools.make(["Task"], [assigned]);
  const generatedObjects = Array.from(generated.objects).join(", ");
  const generatedArrows = Array.from(generated.arrows).map((arrow) => arrow.name).join(", ");
  const full = tools.full(["Task", "User"]);
  const isFull = tools.isFull(full);
  return [
    "== Subcategory helpers ==",
    `Generated objects: ${generatedObjects}`,
    `Generated arrows: ${generatedArrows}`,
    `Full subcategory on {Task, User} is full? ${isFull ? "yes" : "no"}`,
  ];
}

export const stage055TextbookCategoricalToolkit: RunnableExample = {
  id: "055",
  title: "Textbook categorical toolkit",
  outlineReference: 55,
  summary:
    "Build the project/User/Task category, then inspect slices, coslices, duals, products, reindexing, and subcategory utilities exposed by the textbook toolkit.",
  async run() {
    const sections: ReadonlyArray<readonly string[]> = [
      describeBaseCategory(),
      describeSlice(),
      describeCoslice(),
      describeDual(),
      describeProduct(),
      describeReindex(),
      describeSubcategoryTools(),
    ].filter((section) => section.length > 0);

    const logs = sections.flatMap((section, index, array) =>
      index === array.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
