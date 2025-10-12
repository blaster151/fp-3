import { RunnableExample } from "./types";
import { Result } from "./structures";

/**
 * Stage 009 shows how to compile a tiny arithmetic language into a stack based
 * instruction set and then execute the program inside a `Result` driven virtual
 * machine.  The compiler performs a post-order traversal of the expression tree
 * so that the VM always consumes operands in the correct order, while the
 * interpreter guards against missing variables, stack underflow, and division by
 * zero.
 */

type Expr =
  | { readonly kind: "lit"; readonly value: number }
  | { readonly kind: "var"; readonly name: string }
  | { readonly kind: "neg"; readonly expression: Expr }
  | { readonly kind: "add"; readonly left: Expr; readonly right: Expr }
  | { readonly kind: "mul"; readonly left: Expr; readonly right: Expr }
  | { readonly kind: "div"; readonly numerator: Expr; readonly denominator: Expr };

type Instruction =
  | { readonly kind: "push"; readonly value: number }
  | { readonly kind: "load"; readonly name: string }
  | { readonly kind: "neg" }
  | { readonly kind: "add" }
  | { readonly kind: "mul" }
  | { readonly kind: "div" };

type Environment = Readonly<Record<string, number>>;

type Stack = ReadonlyArray<number>;

function lit(value: number): Expr {
  return { kind: "lit", value };
}

function variable(name: string): Expr {
  return { kind: "var", name };
}

function neg(expression: Expr): Expr {
  return { kind: "neg", expression };
}

function add(left: Expr, right: Expr): Expr {
  return { kind: "add", left, right };
}

function mul(left: Expr, right: Expr): Expr {
  return { kind: "mul", left, right };
}

function div(numerator: Expr, denominator: Expr): Expr {
  return { kind: "div", numerator, denominator };
}

function compile(expr: Expr): ReadonlyArray<Instruction> {
  switch (expr.kind) {
    case "lit":
      return [{ kind: "push", value: expr.value }];
    case "var":
      return [{ kind: "load", name: expr.name }];
    case "neg":
      return [...compile(expr.expression), { kind: "neg" }];
    case "add":
      return [...compile(expr.left), ...compile(expr.right), { kind: "add" }];
    case "mul":
      return [...compile(expr.left), ...compile(expr.right), { kind: "mul" }];
    case "div":
      return [...compile(expr.numerator), ...compile(expr.denominator), { kind: "div" }];
    default: {
      const _exhaustive: never = expr;
      return _exhaustive;
    }
  }
}

function execute(program: ReadonlyArray<Instruction>, environment: Environment): Result<string, number> {
  const initial: Result<string, Stack> = Result.ok([]);

  const finalStack = program.reduce<Result<string, Stack>>((acc, instruction) =>
    Result.chain(acc, (stack) => interpret(instruction, stack, environment)),
  initial);

  return Result.chain(finalStack, (stack) => {
    if (stack.length !== 1) {
      return Result.err(
        stack.length === 0 ? "Program finished with an empty stack." : `Program finished with ${stack.length} stack entries.`,
      );
    }
    return Result.ok(stack[0]!);
  });
}

function interpret(instruction: Instruction, stack: Stack, environment: Environment): Result<string, Stack> {
  switch (instruction.kind) {
    case "push":
      return Result.ok([...stack, instruction.value]);
    case "load": {
      const value = environment[instruction.name];
      if (value === undefined) {
        return Result.err(`Unbound variable '${instruction.name}'.`);
      }
      return Result.ok([...stack, value]);
    }
    case "neg":
      return mapPop(stack, (value) => -value);
    case "add":
      return mapPop2(stack, (left, right) => left + right);
    case "mul":
      return mapPop2(stack, (left, right) => left * right);
    case "div":
      return mapPop2(stack, (left, right) => {
        if (right === 0) {
          return Result.err<string, number>("Division by zero detected by the VM.");
        }
        return Result.ok<string, number>(left / right);
      });
    default: {
      const _exhaustive: never = instruction;
      return Result.err(`Unsupported instruction: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

function mapPop(stack: Stack, mapper: (value: number) => number): Result<string, Stack> {
  if (stack.length === 0) {
    return Result.err("Stack underflow while reading one operand.");
  }
  const prefix = stack.slice(0, stack.length - 1);
  const value = stack[stack.length - 1]!;
  return Result.ok([...prefix, mapper(value)]);
}

function mapPop2(
  stack: Stack,
  mapper: (left: number, right: number) => Result<string, number> | number,
): Result<string, Stack> {
  if (stack.length < 2) {
    return Result.err("Stack underflow while reading two operands.");
  }
  const left = stack[stack.length - 2]!;
  const right = stack[stack.length - 1]!;
  const prefix = stack.slice(0, stack.length - 2);
  const mapped = mapper(left, right);
  const result = typeof mapped === "number" ? Result.ok<string, number>(mapped) : mapped;
  return Result.map(result, (value) => [...prefix, value]);
}

function render(expr: Expr): string {
  switch (expr.kind) {
    case "lit":
      return expr.value.toString();
    case "var":
      return expr.name;
    case "neg":
      return `-( ${render(expr.expression)} )`;
    case "add":
      return `( ${render(expr.left)} + ${render(expr.right)} )`;
    case "mul":
      return `( ${render(expr.left)} * ${render(expr.right)} )`;
    case "div":
      return `( ${render(expr.numerator)} / ${render(expr.denominator)} )`;
    default: {
      const _exhaustive: never = expr;
      return _exhaustive;
    }
  }
}

function formatProgram(program: ReadonlyArray<Instruction>): string {
  return program
    .map((instruction) => {
      switch (instruction.kind) {
        case "push":
          return `PUSH ${instruction.value}`;
        case "load":
          return `LOAD ${instruction.name}`;
        case "neg":
          return "NEG";
        case "add":
          return "ADD";
        case "mul":
          return "MUL";
        case "div":
          return "DIV";
        default: {
          const _exhaustive: never = instruction;
          return JSON.stringify(_exhaustive);
        }
      }
    })
    .join(" → ");
}

function formatResult(result: Result<string, number>): string {
  return result.kind === "ok" ? `✔ ${result.value}` : `✘ ${result.error}`;
}

export const stackMachineCompilation: RunnableExample = {
  id: "009",
  title: "Stack machine compilation of expressions",
  outlineReference: 9,
  summary: "Compile arithmetic expressions into stack machine instructions and execute them with Result-based error reporting.",
  async run() {
    const expression = div(
      add(
        mul(lit(2), variable("income")),
        neg(lit(3)),
      ),
      add(variable("deductions"), lit(1)),
    );

    const program = compile(expression);

    const baselineEnv = { income: 10, deductions: 2 } satisfies Environment;
    const zeroDenominatorEnv = { income: 10, deductions: -1 } satisfies Environment;
    const missingVariableEnv = { income: 10 } satisfies Environment;

    const successfulRun = execute(program, baselineEnv);
    const divisionFailure = execute(program, zeroDenominatorEnv);
    const missingVariableFailure = execute(program, missingVariableEnv);
    const truncatedProgram = execute(program.slice(0, program.length - 1), baselineEnv);

    const logs = [
      "== Expression compilation ==",
      `Expression: ${render(expression)}`,
      `Program: ${formatProgram(program)}`,
      "== Virtual machine runs ==",
      `Baseline environment → ${formatResult(successfulRun)}`,
      `Division guard → ${formatResult(divisionFailure)}`,
      `Unbound variable detection → ${formatResult(missingVariableFailure)}`,
      `Truncated program safety → ${formatResult(truncatedProgram)}`,
    ];

    return { logs };
  },
};
