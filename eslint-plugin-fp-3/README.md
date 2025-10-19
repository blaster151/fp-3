# eslint-plugin-fp-3

This local ESLint plugin exposes the rules that power our custom lint setup.
The plugin now ships multiple rules and exposes a `recommended` config that
enables them with the severities we rely on in this repository. Load the config
from the repo's root `.eslintrc.cjs` via `extends: ["plugin:fp-3/recommended"]`
or opt into individual rules under the `fp-3/<rule-name>` namespace.

## `no-json-stringify-on-json`

This rule bans calling `JSON.stringify` directly on values that are typed as our
`Json` alias. The intent is to steer code toward our canonical serialisation
helpers so we don't lose deterministic ordering or structural guarantees when
working with JSON-like data.

The rule is implemented in [`rules/no-json-stringify-on-json.js`](rules/no-json-stringify-on-json.js)
and works by asking TypeScript for the static type of the argument passed to
`JSON.stringify`. If the checker can tell that the argument is (or contains)
the `Json` alias, ESLint raises an error with the message "Avoid JSON.stringify
on values of type Json. Use canonicalKey(x) or JSON.stringify(toEJsonCanonical(x))."

### Allowed escape hatches

Two call patterns remain allowed because they route through the canonical
serialisers that stabilise the output:

- `JSON.stringify(toEJsonCanonical(value))`
- `JSON.stringify(toEJson(value))`

You can also bypass the warning entirely by using `canonicalKey(value)`, which
is what the rule's message recommends.

### Why the heuristic typing checks?

The rule leans on a couple of heuristics when it inspects union and alias types:

- It looks for symbols literally named `Json`.
- It matches the `un: JsonF<...>` pattern that our fixed-point encoding uses.
- It digs into union constituents so aliases that eventually expand to `Json`
  are still caught.

This combination keeps the lint reasonably accurate even though the TypeScript
compiler API does not expose alias names in every scenario.

### Extending the plugin

New rules can be added under the `rules/` directory and exported from
[`index.js`](index.js). Once exported, they can be referenced in `.eslintrc.cjs`
under the `fp-3/<rule-name>` namespace.

## `oracle-result-shape`

**Severity:** error in the recommended config.

Ensures exported oracle helpers (functions named `check*`, `analyze*`, or
`test*`) expose the canonical `{ holds: boolean; details: string; … }` shape in
their return types. The rule inspects the TypeScript return type (including
unwrapping `Promise` results) and raises an error if either property is missing
or typed incorrectly.

## `registry-path-convention`

**Severity:** error in the recommended config.

Requires object literals with a `registryPath` property to use a dot-delimited
string literal that starts with a lowercase subsystem prefix (for example,
`relativeMonad.example`). This keeps registry entries aligned with the naming
conventions described in the documentation.

## `registry-satisfies-record`

**Severity:** warning in the recommended config.

Warns when exported registry objects (identifiers containing `registry`) are not
annotated with `satisfies Record<string, Descriptor>` (or an equivalent type
assertion). Enforcing the constraint ensures descriptor maps remain fully typed
and immutable.

## `law-registry-registration`

**Severity:** warning in the recommended config.

Warns when a module exports a `Lawful`-typed constant without also calling
`registerLawful(constant)` in the same file. The heuristic catches unregistered
law suites before they quietly fall out of the runtime registry.

## `no-module-mutable-collections`

**Severity:** error in the recommended config.

Flags module-level `new Map(...)`, `new WeakMap(...)`, or array literal
declarations that are subsequently mutated (for example via `.set`, `.delete`,
or `.push`). Keeping mutable collections out of module scope prevents
accidentally shared state from leaking between examples, tests, or runtime
executions.

## Flat config support

Repositories that rely on ESLint’s flat configuration (including toolchains like Next.js once they move to ESLint 9) can import `eslint.config.js`, which reuses the same parser and plugin instance that `.eslintrc.cjs` references today. This keeps framework builds and local CLI runs aligned on the recommended rule set without forcing adopters to duplicate settings.
