/**
 * Pure checkout validation logic — kept out of the page component so the
 * rules can be unit-tested and reasoned about in isolation.
 *
 * Payment-method aware: cash on delivery must never require card details,
 * otherwise "Place order" fails with an error the user can never see (the
 * card inputs aren't rendered for COD).
 */

export const STEP_FIELDS: Record<number, string[]> = {
  0: ["fullName", "email", "phone"],
  1: ["address", "city", "postalCode"],
  2: ["cardNumber", "cardExpiry", "cardCvc"],
};

/** Per-field validators — shared by blur validation and the step guard. */
export const FIELD_VALIDATORS: Record<string, (value: string) => string | undefined> = {
  fullName: (v) => (v.trim() ? undefined : "Full name is required"),
  email: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? undefined : "Enter a valid email"),
  phone: (v) => (/^\+?[\d\s()-]{7,}$/.test(v.trim()) ? undefined : "Enter a valid phone number"),
  address: (v) => (v.trim() ? undefined : "Street address is required"),
  city: (v) => (v.trim() ? undefined : "City is required"),
  postalCode: (v) => (/^[\w\s-]{3,10}$/.test(v.trim()) ? undefined : "Enter a valid postal code"),
  cardNumber: (v) =>
    /^\d{16}$/.test(v.replace(/\s/g, "")) ? undefined : "Card number must be 16 digits",
  cardExpiry: (v) =>
    /^(0[1-9]|1[0-2])\/\d{2}$/.test(v) ? undefined : "Expiry must be in MM/YY",
  cardCvc: (v) => (/^\d{3,4}$/.test(v) ? undefined : "3–4 digits"),
};

/**
 * The fields a step actually requires for the given payment method.
 * Step 2 (payment) only demands card details when a card is the method.
 */
export function fieldsForStep(step: number, payment: string): string[] {
  if (step === 2 && payment !== "card") return [];
  return STEP_FIELDS[step] ?? [];
}

/** Validate a set of fields; returns a field → message map (empty = valid). */
export function validateFields(
  fields: string[],
  values: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const message = FIELD_VALIDATORS[field]?.(values[field] ?? "");
    if (message) errors[field] = message;
  }
  return errors;
}
