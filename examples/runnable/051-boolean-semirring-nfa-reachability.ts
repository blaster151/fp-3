import { RunnableExample } from "./types";

declare function require(id: string): any;

type Fin<T> = { readonly elems: ReadonlyArray<T> };
type Kernel<Q, R> = (state: Q) => Map<R, number>;

type NfaModule = {
  readonly buildStepKernel: <Q, Σ>(
    states: Fin<Q>,
    delta: (state: Q, symbol: Σ) => Iterable<Q>,
  ) => (symbol: Σ) => Kernel<Q, Q>;
  readonly stepNFA: <Q, Σ>(nfa: NFA<Q, Σ>, symbol: Σ, current: Set<Q>) => Set<Q>;
  readonly accepts: <Q, Σ>(nfa: NFA<Q, Σ>, word: ReadonlyArray<Σ>) => boolean;
};

type NFA<Q, Σ> = {
  readonly states: Fin<Q>;
  readonly alphabet: Fin<Σ>;
  readonly step: (symbol: Σ) => Kernel<Q, Q>;
  readonly start: ReadonlyArray<Q>;
  readonly accept: ReadonlySet<Q>;
};

type MarkovCategoryModule = {
  readonly mkFin: <T>(elems: ReadonlyArray<T>) => Fin<T>;
};

const markovCategory = require("../../markov-category") as MarkovCategoryModule;
const nfaModule = require("../../nfa-reachability") as NfaModule;

const { mkFin } = markovCategory;
const { buildStepKernel, stepNFA, accepts } = nfaModule;

type State = "q0" | "q1" | "q2" | "q3";
type Symbol = "a" | "b";

const States = mkFin<State>(["q0", "q1", "q2", "q3"]);
const Alphabet = mkFin<Symbol>(["a", "b"]);

function delta(state: State, symbol: Symbol): ReadonlyArray<State> {
  if (state === "q0" && symbol === "a") return ["q0", "q1"];
  if (state === "q0" && symbol === "b") return ["q0"];
  if (state === "q1" && symbol === "a") return ["q1"];
  if (state === "q1" && symbol === "b") return ["q2"];
  if (state === "q2" && symbol === "a") return ["q1"];
  if (state === "q2" && symbol === "b") return ["q3"];
  if (state === "q3" && symbol === "a") return ["q1"];
  if (state === "q3" && symbol === "b") return ["q3"];
  return [];
}

const stepKernel = buildStepKernel<State, Symbol>(States, delta);

const nfa: NFA<State, Symbol> = {
  states: States,
  alphabet: Alphabet,
  step: stepKernel,
  start: ["q0"],
  accept: new Set<State>(["q3"]),
};

function formatStateSet(states: ReadonlySet<State>): string {
  const members = States.elems.filter((state) => states.has(state));
  return members.length === 0 ? "∅" : members.join(", ");
}

function describeTransition(state: State, symbol: Symbol): string {
  const support = stepKernel(symbol)(state);
  const reachable = States.elems.filter((candidate) => (support.get(candidate) ?? 0) !== 0);
  const payload = reachable.length === 0 ? "∅" : reachable.join(", ");
  return `  δ(${state}, ${symbol}) → { ${payload} }`;
}

type PrefixTrace = { readonly prefix: string; readonly states: ReadonlySet<State> };

function traceWord(word: ReadonlyArray<Symbol>): ReadonlyArray<PrefixTrace> {
  const initial: PrefixTrace = { prefix: "ε", states: new Set<State>(nfa.start) };
  return word.reduce<ReadonlyArray<PrefixTrace>>((acc, symbol) => {
    const previous = acc[acc.length - 1]!;
    const nextStates = stepNFA(nfa, symbol, new Set(previous.states));
    const prefix = previous.prefix === "ε" ? symbol : `${previous.prefix}${symbol}`;
    return [...acc, { prefix, states: nextStates }];
  }, [initial]);
}

function describeWord(word: string): readonly string[] {
  const symbols = word.split("") as Symbol[];
  const trace = traceWord(symbols);
  const acceptance = accepts(nfa, symbols);
  const detailLines = trace.map(({ prefix, states }) => {
    const padded = prefix.padEnd(5, " ");
    return `  ${padded} → { ${formatStateSet(states)} }`;
  });
  return [
    `Word "${word === "" ? "ε" : word}"`,
    ...detailLines,
    `  accepts? → ${acceptance ? "yes" : "no"}`,
  ];
}

function describeLanguage(): readonly string[] {
  const words: ReadonlyArray<string> = ["", "abb", "babb", "ababa", "abba", "aaabb"];
  const sections = words.map((word) => describeWord(word));
  return sections.flatMap((section, index, array) =>
    index === array.length - 1 ? section : [...section, ""],
  );
}

export const stage051BooleanSemirringNFAReachability: RunnableExample = {
  id: "051",
  title: "Boolean-semirring NFA reachability",
  outlineReference: 51,
  summary:
    "Explore an ε-free NFA for strings ending with \"abb\", tracing prefix reachability, Boolean-kernel transitions, and acceptance decisions.",
  async run() {
    const transitionRows = Alphabet.elems.flatMap((symbol) =>
      States.elems.map((state) => describeTransition(state, symbol)),
    );

    const sections: ReadonlyArray<readonly string[]> = [
      ["== ε-free Boolean NFA for (.*abb) =="],
      [
        `States → { ${States.elems.join(", ")} }`,
        `Alphabet → { ${Alphabet.elems.join(", ")} }`,
        `Start set → { ${nfa.start.join(", ")} }`,
        `Accepting set → { ${Array.from(nfa.accept).join(", ")} }`,
      ],
      ["== Transition relation δ(q, σ) ==", ...transitionRows],
      ["== Reachability traces ==", ...describeLanguage()],
    ];

    const logs = sections.flatMap((section, index, array) =>
      index === array.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
