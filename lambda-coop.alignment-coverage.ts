import type {
  LambdaCoopClauseBundle,
  LambdaCoopClauseResidualFallback,
  LambdaCoopKernelEffectKind,
} from "./supervised-stack-lambda-coop";

export type LambdaCoopKernelClauseSkipReason = "missing-argument-witness";

export interface LambdaCoopKernelClauseSkip {
  readonly operation: string;
  readonly reason: LambdaCoopKernelClauseSkipReason;
}

export interface LambdaCoopAlignmentCoverageOperationLink {
  readonly operation: string;
  readonly interpreterCovered: boolean;
  readonly kernelClause?: {
    readonly kind: LambdaCoopKernelEffectKind;
    readonly description?: string;
  };
  readonly kernelClauseSkipped?: LambdaCoopKernelClauseSkip;
  readonly residual?: LambdaCoopClauseResidualFallback;
  readonly notes: ReadonlyArray<string>;
}

export interface LambdaCoopAlignmentCoverageOperationSummary {
  readonly total: number;
  readonly missingInterpreter: number;
  readonly missingKernelClause: number;
  readonly skippedKernelClauses: number;
  readonly residualDefaulted: number;
  readonly residualHandlers: number;
}

export interface LambdaCoopAlignmentCoverageReport {
  readonly interpreterExpectedOperations: number;
  readonly interpreterCoveredOperations: number;
  readonly interpreterMissingOperations: ReadonlyArray<string>;
  readonly kernelTotalClauses: number;
  readonly kernelEvaluatedClauses: number;
  readonly kernelSkippedClauses: ReadonlyArray<LambdaCoopKernelClauseSkip>;
  readonly operations: ReadonlyArray<LambdaCoopAlignmentCoverageOperationLink>;
  readonly operationSummary: LambdaCoopAlignmentCoverageOperationSummary;
}

export interface CollectLambdaCoopAlignmentCoverageIssuesInput {
  readonly expectedInterpreterOperations: ReadonlyArray<string>;
  readonly interpreterOperations: ReadonlyArray<string>;
  readonly kernelTotalClauses: number;
  readonly kernelEvaluatedClauses: number;
  readonly skippedKernelClauses: ReadonlyArray<LambdaCoopKernelClauseSkip>;
  readonly clauseBundles?: ReadonlyArray<LambdaCoopClauseBundle>;
}

const summarizeCoverageOperationLinks = (
  links: ReadonlyArray<LambdaCoopAlignmentCoverageOperationLink>,
): LambdaCoopAlignmentCoverageOperationSummary => {
  const missingInterpreter = links.filter((link) => !link.interpreterCovered).length;
  const missingKernelClause = links.filter((link) => !link.kernelClause).length;
  const skippedKernelClauses = links.filter((link) => link.kernelClauseSkipped).length;
  const residualDefaulted = links.filter((link) => link.residual?.defaulted).length;
  const residualHandlers = links.filter((link) => link.residual?.handlerDescription).length;
  return {
    total: links.length,
    missingInterpreter,
    missingKernelClause,
    skippedKernelClauses,
    residualDefaulted,
    residualHandlers,
  };
};

const buildCoverageOperationLinks = (
  input: CollectLambdaCoopAlignmentCoverageIssuesInput,
): ReadonlyArray<LambdaCoopAlignmentCoverageOperationLink> => {
  const expectedOperations = Array.from(new Set(input.expectedInterpreterOperations)).sort();
  if (expectedOperations.length === 0) {
    return [];
  }
  const interpreterOperationSet = new Set(input.interpreterOperations);
  const clauseLookup = new Map(
    (input.clauseBundles ?? []).map((bundle) => [bundle.operation, bundle]),
  );
  const skippedLookup = new Map(
    input.skippedKernelClauses.map((skip) => [skip.operation, skip]),
  );
  return expectedOperations.map((operation) => {
    const clause = clauseLookup.get(operation);
    const skip = skippedLookup.get(operation);
    const interpreterCovered = interpreterOperationSet.has(operation);
    const notes: string[] = [];
    if (!interpreterCovered) {
      notes.push(`Interpreter did not evaluate ${operation}.`);
    }
    if (!clause) {
      notes.push(`Kernel exposes no clause for ${operation}.`);
    } else if (clause.description) {
      notes.push(`Kernel clause description: ${clause.description}.`);
    }
    if (skip) {
      notes.push(`Kernel skipped ${operation} (${skip.reason}).`);
    }
    if (clause?.residual?.handlerDescription) {
      notes.push(`Residual handler: ${clause.residual.handlerDescription}.`);
    }
    if (clause?.residual?.defaulted) {
      notes.push(`Residual defaulted for ${operation}.`);
    }
    if (clause?.residual?.coverage) {
      const coverage = clause.residual.coverage;
      notes.push(
        `Residual coverage handled=${coverage.handled} unhandled=${coverage.unhandled} sampleLimit=${coverage.sampleLimit}`,
      );
    }
    return {
      operation,
      interpreterCovered,
      ...(clause
        ? {
            kernelClause: {
              kind: clause.kind,
              ...(clause.description ? { description: clause.description } : {}),
            },
          }
        : {}),
      ...(skip ? { kernelClauseSkipped: skip } : {}),
      ...(clause?.residual ? { residual: clause.residual } : {}),
      notes,
    } satisfies LambdaCoopAlignmentCoverageOperationLink;
  });
};

export const collectLambdaCoopAlignmentCoverageIssues = (
  input: CollectLambdaCoopAlignmentCoverageIssuesInput,
): LambdaCoopAlignmentCoverageReport => {
  const interpreterExpectedSet = new Set(input.expectedInterpreterOperations);
  const interpreterOperationSet = new Set(input.interpreterOperations);
  const interpreterMissingOperations: string[] = [];
  for (const operation of interpreterExpectedSet) {
    if (!interpreterOperationSet.has(operation)) {
      interpreterMissingOperations.push(operation);
    }
  }
  interpreterMissingOperations.sort();
  const links = buildCoverageOperationLinks(input);
  return {
    interpreterExpectedOperations: interpreterExpectedSet.size,
    interpreterCoveredOperations: interpreterOperationSet.size,
    interpreterMissingOperations,
    kernelTotalClauses: input.kernelTotalClauses,
    kernelEvaluatedClauses: input.kernelEvaluatedClauses,
    kernelSkippedClauses: input.skippedKernelClauses,
    operations: links,
    operationSummary: summarizeCoverageOperationLinks(links),
  } satisfies LambdaCoopAlignmentCoverageReport;
};

const normalizeStringSet = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  [...values].sort();

const normalizeSkippedClauses = (
  values: ReadonlyArray<LambdaCoopKernelClauseSkip>,
): ReadonlyArray<string> =>
  values.map((skip) => `${skip.operation}|${skip.reason}`).sort();

const normalizeOperationLink = (
  link: LambdaCoopAlignmentCoverageOperationLink,
): string => {
  const residual = link.residual
    ? {
        defaulted: link.residual.defaulted ?? false,
        handler: link.residual.handlerDescription ?? null,
        coverage: link.residual.coverage ?? null,
      }
    : undefined;
  return JSON.stringify({
    operation: link.operation,
    interpreterCovered: link.interpreterCovered,
    kernelClauseKind: link.kernelClause?.kind ?? null,
    kernelClauseDescription: link.kernelClause?.description ?? null,
    kernelClauseSkipped: link.kernelClauseSkipped?.reason ?? null,
    residual,
  });
};

const normalizeOperationLinks = (
  links: ReadonlyArray<LambdaCoopAlignmentCoverageOperationLink>,
): ReadonlyArray<string> => links.map(normalizeOperationLink).sort();

const compareNumberField = (
  label: string,
  recorded: number,
  reconstructed: number,
  issues: string[],
): void => {
  if (recorded !== reconstructed) {
    issues.push(`${label} mismatch between recorded (${recorded}) and reconstructed (${reconstructed}).`);
  }
};

const compareOperationSummaries = (
  recorded: LambdaCoopAlignmentCoverageReport["operationSummary"],
  reconstructed: LambdaCoopAlignmentCoverageReport["operationSummary"],
  issues: string[],
): void => {
  compareNumberField("Operation summary total", recorded.total, reconstructed.total, issues);
  compareNumberField(
    "Operation summary missing interpreter",
    recorded.missingInterpreter,
    reconstructed.missingInterpreter,
    issues,
  );
  compareNumberField(
    "Operation summary missing kernel clauses",
    recorded.missingKernelClause,
    reconstructed.missingKernelClause,
    issues,
  );
  compareNumberField(
    "Operation summary skipped kernel clauses",
    recorded.skippedKernelClauses,
    reconstructed.skippedKernelClauses,
    issues,
  );
  compareNumberField(
    "Operation summary residual defaults",
    recorded.residualDefaulted,
    reconstructed.residualDefaulted,
    issues,
  );
  compareNumberField(
    "Operation summary residual handlers",
    recorded.residualHandlers,
    reconstructed.residualHandlers,
    issues,
  );
};

export const compareLambdaCoopCoverageReports = (
  recorded: LambdaCoopAlignmentCoverageReport,
  reconstructed: LambdaCoopAlignmentCoverageReport,
): ReadonlyArray<string> => {
  const issues: string[] = [];
  compareNumberField(
    "Interpreter expected operations",
    recorded.interpreterExpectedOperations,
    reconstructed.interpreterExpectedOperations,
    issues,
  );
  compareNumberField(
    "Interpreter covered operations",
    recorded.interpreterCoveredOperations,
    reconstructed.interpreterCoveredOperations,
    issues,
  );
  if (
    normalizeStringSet(recorded.interpreterMissingOperations).join("|") !==
    normalizeStringSet(reconstructed.interpreterMissingOperations).join("|")
  ) {
    issues.push(
      "Interpreter missing-operation set mismatch between recorded and reconstructed coverage.",
    );
  }
  compareNumberField(
    "Kernel total clauses",
    recorded.kernelTotalClauses,
    reconstructed.kernelTotalClauses,
    issues,
  );
  compareNumberField(
    "Kernel evaluated clauses",
    recorded.kernelEvaluatedClauses,
    reconstructed.kernelEvaluatedClauses,
    issues,
  );
  if (
    normalizeSkippedClauses(recorded.kernelSkippedClauses).join("|") !==
    normalizeSkippedClauses(reconstructed.kernelSkippedClauses).join("|")
  ) {
    issues.push(
      "Kernel skipped-clause set mismatch between recorded and reconstructed coverage.",
    );
  }
  if (
    normalizeOperationLinks(recorded.operations).join("|") !==
    normalizeOperationLinks(reconstructed.operations).join("|")
  ) {
    issues.push("λ₍coop₎ operation link metadata diverges between recorded and reconstructed coverage.");
  }
  compareOperationSummaries(recorded.operationSummary, reconstructed.operationSummary, issues);
  return issues;
};
