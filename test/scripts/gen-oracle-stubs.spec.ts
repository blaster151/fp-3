import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { run } from "../../scripts/gen-oracle-stubs";

type TempContext = {
  readonly root: string;
};

const createTempContext = (): TempContext => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gen-oracle-stubs-"));
  return { root };
};

const writeLawsFile = (root: string, content: string): void => {
  fs.writeFileSync(path.join(root, "LAWS.md"), content, "utf-8");
};

const sampleLawsEntry = `## Example Oracle\n\n**Witness Builder:** \`ExampleNamespace.makeWitness\`\n**Check:** \`ExampleNamespace.checkWitness\`\n**Registry Path:** \`example.namespace.witness\``;

describe("gen-oracle-stubs", () => {
  let ctx: TempContext;

  beforeEach(() => {
    ctx = createTempContext();
    writeLawsFile(ctx.root, sampleLawsEntry);
  });

  afterEach(() => {
    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  it("emits pending-aware oracle skeletons", () => {
    const report = run({ dryRun: false, refresh: false, rootDir: ctx.root });
    const stubPath = path.join(
      ctx.root,
      "oracles",
      "example",
      "namespace",
      "witness.ts",
    );

    expect(report.created).toHaveLength(1);
    expect(report.updated).toHaveLength(0);
    expect(report.skipped).toHaveLength(0);
    expect(fs.existsSync(stubPath)).toBe(true);

    const stubContent = fs.readFileSync(stubPath, "utf-8");
    expect(stubContent).not.toContain("throw new Error");
    expect(stubContent).toContain("pending: true");
    expect(stubContent).toContain("return pendingResult as never");
  });

  it("refreshes generated stubs when requested", () => {
    run({ dryRun: false, refresh: false, rootDir: ctx.root });
    const stubPath = path.join(
      ctx.root,
      "oracles",
      "example",
      "namespace",
      "witness.ts",
    );

    const outdated = fs
      .readFileSync(stubPath, "utf-8")
      .replace("pending: true", "pending: true // outdated");
    fs.writeFileSync(stubPath, outdated, "utf-8");

    const refreshReport = run({ dryRun: false, refresh: true, rootDir: ctx.root });
    expect(refreshReport.updated).toHaveLength(1);
    expect(refreshReport.skipped).toHaveLength(0);

    const refreshedContent = fs.readFileSync(stubPath, "utf-8");
    expect(refreshedContent).not.toContain("outdated");
    expect(refreshedContent).toContain("pending: true");
  });
});
