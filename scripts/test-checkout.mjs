/**
 * Checkout validation regression tests.
 *
 * Run with:  npm run test:checkout
 *
 * Guards the bug where "Cash on delivery" silently failed: the step guard
 * required card fields that were never rendered, so "Place order" did
 * nothing and showed no error.
 */
import { fieldsForStep, validateFields } from "../lib/checkout/validation.ts";

const results = [];
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(
    `${ok ? "PASS" : "FAIL"}  ${name}` +
      (ok ? "" : `\n      got:  ${JSON.stringify(actual)}\n      want: ${JSON.stringify(expected)}`)
  );
};

const validate = (step, payment, values) =>
  validateFields(fieldsForStep(step, payment), values);

// ── Payment step ───────────────────────────────────────────────────────────
check("COD requires no fields", fieldsForStep(2, "cod"), []);
check("COD order can be placed with empty card", validate(2, "cod", {}), {});
check("COD ignores leftover card input", validate(2, "cod", { cardNumber: "4242424242424242" }), {});
check("card requires three fields", fieldsForStep(2, "card"), ["cardNumber", "cardExpiry", "cardCvc"]);
check(
  "empty card is flagged",
  Object.keys(validate(2, "card", {})).sort(),
  ["cardCvc", "cardExpiry", "cardNumber"]
);
check(
  "valid card passes",
  validate(2, "card", {
    cardNumber: "4242 4242 4242 4242",
    cardExpiry: "12/29",
    cardCvc: "123",
  }),
  {}
);

// ── Contact & shipping steps are unchanged ─────────────────────────────────
check("contact is required", Object.keys(validate(0, "card", {})).sort(), ["email", "fullName", "phone"]);
check("shipping is required", Object.keys(validate(1, "card", {})).sort(), ["address", "city", "postalCode"]);
check(
  "valid contact passes",
  validate(0, "card", { fullName: "Rachel Woods", email: "r@example.com", phone: "+1 555 234 5567" }),
  {}
);

console.log(results.join("\n"));

const failed = results.filter((r) => r.startsWith("FAIL")).length;
if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${results.length} checks passed`);
