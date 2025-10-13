import type { Arrow, Path } from "../../diagram";
import {
  allCommute,
  allCommuteTweaked,
  commutes,
  commutesTweaked,
  composePath,
  id,
  isIdentity,
  paste,
} from "../../diagram";
import type { RunnableExample } from "./types";

const formatResults = (label: string, values: ReadonlyArray<unknown>): string =>
  `${label} → ${JSON.stringify(values)}`;

const asPath = <A, B>(...arrows: ReadonlyArray<Arrow<A, B>>): Path<A, B> =>
  arrows as unknown as Path<A, B>;

export const stage045DiagramCommutativityVerificationDrills: RunnableExample = {
  id: "045",
  title: "Diagram commutativity verification drills",
  outlineReference: 45,
  summary:
    "Check triangle associativity, identity neutrality, pasted rectangles, and tweaked commutativity helpers on concrete samples.",
  async run() {
    const triangleSection = (() => {
      const g: Arrow<number, number> = (x: number) => x + 1;
      const h: Arrow<number, number> = (x: number) => x * 2;
      const j: Arrow<number, number> = (x: number) => x - 3;

      const left = asPath(g, h, j);
      const right = asPath(g, (x: number) => j(h(x)));
      const sample = [0, 1, 2, 5];

      const commute = commutes(left, right, sample);
      const compositeValues = sample.map((value) => composePath(left)(value));

      return [
        "== Triangle associativity ==",
        `Paths commute on sample → ${commute ? "yes" : "no"}`,
        formatResults("Composite values", compositeValues),
      ];
    })();

    const identitySection = (() => {
      const f: Arrow<string, string> = (s: string) => s.toUpperCase();
      const one = id<string>();
      const sample = ["a", "Ab", "xyz"];

      return [
        "== Identity neutrality ==",
        `Identity path recognised → ${isIdentity(asPath(one), sample) ? "yes" : "no"}`,
        `1 ∘ f equals f → ${commutes(asPath(f, one), asPath(f), sample) ? "yes" : "no"}`,
        `f ∘ 1 equals f → ${commutes(asPath(one, f), asPath(f), sample) ? "yes" : "no"}`,
      ];
    })();

    const pastedSection = (() => {
      const f: Arrow<number, number> = (x: number) => x + 1;
      const g: Arrow<number, number> = (x: number) => x * 2;
      const j: Arrow<number, number> = (x: number) => (x + 1) * 2;

      const h: Arrow<number, number> = (x: number) => x - 1;
      const k: Arrow<number, number> = (x: number) => x * 3;
      const l: Arrow<number, number> = (x: number) => (x - 1) * 3;

      const squareLeft: ReadonlyArray<Path<number, number>> = [
        asPath(f, g),
        asPath(j),
      ];
      const squareRight: ReadonlyArray<Path<number, number>> = [
        asPath(h, k),
        asPath(l),
      ];

      const rect1 = paste(squareLeft[0]!, squareRight[0]!);
      const rect2 = paste(squareLeft[1]!, squareRight[1]!);
      const sample = [0, 3];

      return [
        "== Pasted commuting rectangles ==",
        `Left square commutes → ${allCommute(squareLeft, sample) ? "yes" : "no"}`,
        `Right square commutes → ${allCommute(squareRight, sample) ? "yes" : "no"}`,
        `Pasted rectangle commutes → ${commutes(rect1, rect2, sample) ? "yes" : "no"}`,
      ];
    })();

    const tweakedSection = (() => {
      const e: Arrow<number, number> = () => 0;
      const f: Arrow<number, number> = (a: number) => a + 1;
      const g: Arrow<number, number> = () => 1;
      const sampleFork = [0, 1, 2];
      const sampleParallel = [3, 4];

      return [
        "== Tweaked commutativity ==",
        `Parallel arrows tolerated → ${commutesTweaked(asPath(f), asPath(g), sampleParallel) ? "yes" : "no"}`,
        `Fork commutes under tweak → ${commutesTweaked(asPath(f, e), asPath(g, e), sampleFork) ? "yes" : "no"}`,
        `Mismatch detected → ${
          commutesTweaked(asPath(f, () => 2), asPath(g, e), sampleFork)
            ? "no"
            : "yes"
        }`,
      ];
    })();

    const familySection = (() => {
      const e: Arrow<number, number> = () => 0;
      const f: Arrow<number, number> = (a: number) => a + 1;
      const g: Arrow<number, number> = () => 1;

      const family: ReadonlyArray<Path<number, number>> = [
        asPath(f),
        asPath(g),
        asPath(f, e),
        asPath(g, e),
      ];

      return [
        "== Tweaked family commutativity ==",
        `Family commutes → ${allCommuteTweaked(family, [0, 1, 2]) ? "yes" : "no"}`,
      ];
    })();

    return {
      logs: [
        ...triangleSection,
        ...identitySection,
        ...pastedSection,
        ...tweakedSection,
        ...familySection,
      ],
    };
  },
};
