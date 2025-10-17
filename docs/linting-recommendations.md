# Custom linting recommendations

## Current plugin surface
Our `eslint-plugin-fp-3` package already enforces guardrails like banning `JSON.stringify` over values typed as `Json`, steering contributors toward canonical serialization helpers instead.【F:eslint-plugin-fp-3/index.js†L1-L7】【F:eslint-plugin-fp-3/rules/no-json-stringify-on-json.js†L1-L63】

## Recommended project-specific rules
To help both maintainers and adopters honour the oracle-first methodology and registry discipline described in our guidelines, we can grow the plugin with the following rules:

### 1. `oracle-result-shape`
Flag exported oracle functions whose return type does not expose `holds`, `details`, and (when applicable) `pending`/analysis payloads. This keeps every truth predicate aligned with the witness-carrying contracts already used by `checkRelativeMonadLaws` and its peers.【F:algebra-oracles.ts†L21-L105】 The rule now lives in the plugin and is enforced as an **error**.

### 2. `registry-path-convention`
Require that any object literal property named `registryPath` is a dot-delimited string that starts with the subsystem prefix (for example, `relativeMonad.`). The relative-monad catalogues depend on this naming convention to stay in sync with the documentation index, so lint feedback will prevent drift.【F:relative/relative-laws.ts†L7-L80】 Implemented as an **error** rule.

### 3. `registry-satisfies-record`
Ensure exported registries are annotated with a `satisfies Record<string, Descriptor>` clause (or equivalent) to lock their structure. Our relative-law registries already use this pattern, and enforcing it would guarantee typed, immutable catalogues for every subsystem adopters create.【F:relative/relative-laws.ts†L710-L749】 Implemented as a **warning** so downstream adopters can migrate gradually.

### 4. `law-registry-registration`
Warn when modules that define `Lawful` suites fail to invoke `registerLawful` from `src/laws/registry.ts`. This keeps the executable law surface discoverable and avoids silently skipping integrations that the runtime expects to enumerate.【F:src/laws/registry.ts†L1-L25】 The linter surfaces the condition as a **warning**, complementing our manual pack checks.

Each rule captures an invariant we already uphold manually. Automating them will shorten review cycles and give downstream adopters immediate feedback when they add new oracles, registries, or law suites.


## Tooling compatibility
Projects that rely on framework-managed lint commands (for example, `next lint`) can continue to run the legacy `.eslintrc.cjs` on ESLint 8 while the new `eslint.config.js` mirrors the same parser and plugin wiring for ESLint 9. Because both entry points resolve to the shared plugin configuration, Next.js builds do not trip over the flat-config migration and automatically pick up the custom rules once their ESLint version advances.
