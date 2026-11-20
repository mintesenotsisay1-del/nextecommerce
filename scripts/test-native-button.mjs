/**
 * Base UI `nativeButton` decision tests.
 *
 * Run with:  npm run test:base-ui
 *
 * Base UI checks the *rendered DOM element* against the `nativeButton` prop
 * and warns in both directions:
 *   - nativeButton=true  + a non-<button> element → "expected a native <button>"
 *   - nativeButton=false + a <button> element     → "expected a non-<button>"
 * So the flag must be derived from what the render prop actually produces.
 */
import React from "react";
import { rendersNativeButton } from "../lib/utils.ts";

/** Stand-in for our <Button> component (a custom component). */
function Button() {
  return null;
}

const cases = [
  ["no render prop", undefined, true],
  ["native <button>", React.createElement("button"), true],
  ["anchor <a> (Next.js Link)", React.createElement("a", { href: "/x" }), false],
  ["<span>", React.createElement("span"), false],
  ["custom component (our Button)", React.createElement(Button), true],
  [
    "our Button rendering a Link",
    React.createElement(Button, { render: React.createElement("a", { href: "/x" }) }),
    false,
  ],
];

const results = [];
for (const [name, render, expected] of cases) {
  const actual = rendersNativeButton(render);
  const ok = actual === expected;
  results.push(
    `${ok ? "PASS" : "FAIL"}  ${name} → nativeButton=${actual ? "true" : "false"}` +
      (ok ? "" : `  (expected ${expected ? "true" : "false"})`)
  );
}

console.log(results.join("\n"));

const failed = results.filter((r) => r.startsWith("FAIL")).length;
if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${results.length} checks passed`);
