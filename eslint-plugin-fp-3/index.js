"use strict";

module.exports = {
  rules: {
    "no-json-stringify-on-json": require("./rules/no-json-stringify-on-json"),
    "oracle-result-shape": require("./rules/oracle-result-shape"),
    "registry-path-convention": require("./rules/registry-path-convention"),
    "registry-satisfies-record": require("./rules/registry-satisfies-record"),
    "law-registry-registration": require("./rules/law-registry-registration"),
  },
  configs: {
    recommended: {
      plugins: ["fp-3"],
      rules: {
        "fp-3/no-json-stringify-on-json": "error",
        "fp-3/oracle-result-shape": "error",
        "fp-3/registry-path-convention": "error",
        "fp-3/registry-satisfies-record": "warn",
        "fp-3/law-registry-registration": "warn",
      },
    },
  },
};
