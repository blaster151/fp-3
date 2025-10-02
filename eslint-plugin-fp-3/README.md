# eslint-plugin-fp-3

This local ESLint plugin exposes the rules that power our custom lint setup.
At the moment the plugin ships a single rule, `no-json-stringify-on-json`, and
is loaded from the repo's root `.eslintrc.cjs` under the `fp-3/no-json-stringify-on-json`
name.

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
