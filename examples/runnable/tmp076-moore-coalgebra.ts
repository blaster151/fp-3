import type { RunnableExample } from "./types";
import type { Moore } from "../../src/coalgebra/Coalgebra";

declare function require(id: string): any;

type CoalgebraModule = {
  readonly isCoalgebraHom: <O, Sigma, X, Y>(
    M: Moore<O, Sigma, X>,
    N: Moore<O, Sigma, Y>,
    h: (x: X) => Y,
  ) => boolean;
};

const { isCoalgebraHom } = require("../../src/coalgebra/Coalgebra") as CoalgebraModule;

type Signal = 0 | 1;

type TurnstileState = "Locked" | "Unlocked";
type DoorState = "Closed" | "Open";

const turnstileMachine: Moore<string, Signal, TurnstileState> = {
  carrier: ["Locked", "Unlocked"],
  out: (state) => (state === "Locked" ? "🚫 stay" : "✅ walk"),
  step: (state, signal) => {
    if (signal === 0) return "Unlocked"; // coin
    return state === "Unlocked" ? "Locked" : "Locked"; // push
  },
};

const doorMachine: Moore<string, Signal, DoorState> = {
  carrier: ["Closed", "Open"],
  out: (state) => (state === "Closed" ? "🚫 stay" : "✅ walk"),
  step: (state, signal) => {
    if (signal === 0) return "Open";
    return "Closed";
  },
};

const hom: (state: TurnstileState) => DoorState = (state) => (state === "Locked" ? "Closed" : "Open");

function simulate<X>(machine: Moore<string, Signal, X>, start: X, inputs: readonly Signal[]): { states: X[]; outputs: string[] } {
  const states: X[] = [start];
  const outputs: string[] = [machine.out(start)];
  let current = start;
  for (const input of inputs) {
    current = machine.step(current, input);
    states.push(current);
    outputs.push(machine.out(current));
  }
  return { states, outputs };
}

function describeRun<X>(label: string, run: { states: readonly X[]; outputs: readonly string[] }): string[] {
  const stateTrace = `${label} states: ${run.states.join(" → ")}`;
  const outputTrace = `${label} outputs: ${run.outputs.join(", ")}`;
  return [stateTrace, outputTrace];
}

export const stageTmp076MooreCoalgebra: RunnableExample = {
  id: "tmp076",
  title: "Moore coalgebra homomorphism sampler",
  outlineReference: 76,
  summary: "Compare two turnstile-style Moore machines and verify a coalgebra homomorphism collapsing their states.",
  run: async () => {
    const inputs: readonly Signal[] = [0, 1, 1, 0, 1];
    const turnstile = simulate(turnstileMachine, "Locked", inputs);
    const door = simulate(doorMachine, hom("Locked"), inputs);

    return {
      logs: [
        "== Moore coalgebra homomorphism ==",
        `Input sequence: ${inputs.join(", ")}`,
        ...describeRun("Turnstile", turnstile),
        ...describeRun("Door", door),
        `Homomorphism valid? ${isCoalgebraHom(turnstileMachine, doorMachine, hom)}`,
      ],
    };
  },
};
