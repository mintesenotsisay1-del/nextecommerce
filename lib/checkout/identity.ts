/**
 * Local checkout identity.
 *
 * Checkout data kept in localStorage is only safe to reuse for the account
 * that created it. These helpers track the owner of that data and wipe the
 * draft, saved address and local orders whenever the signed-in account
 * changes (or after sign-out).
 */

export const CHECKOUT_DRAFT_KEY = "sole-stone-checkout-draft-v1";
export const CHECKOUT_OWNER_KEY = "sole-stone-checkout-owner-v1";
export const SAVED_ADDRESS_KEY = "sole-stone-saved-address-v1";
export const LOCAL_ORDERS_KEY = "sole-stone-orders-v1";
export const LAST_ORDER_COOKIE = "sole-stone-last-order";

/** Demo mode has no account, so device-local details belong to a guest. */
export const GUEST_IDENTITY = "guest";

export function checkoutIdentityForUser(userId: string) {
  return `user:${userId}`;
}

export function readCheckoutOwner(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(CHECKOUT_OWNER_KEY);
  } catch {
    return null;
  }
}

export function writeCheckoutOwner(owner: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(CHECKOUT_OWNER_KEY, owner);
  } catch {
    /* storage blocked — checkout still works for this visit */
  }
}

function removeLocalIdentityData() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(CHECKOUT_DRAFT_KEY);
    window.localStorage.removeItem(SAVED_ADDRESS_KEY);
    window.localStorage.removeItem(LOCAL_ORDERS_KEY);
  } catch {
    /* storage blocked — nothing else to clear */
  }

  if (typeof document !== "undefined") {
    document.cookie = `${LAST_ORDER_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

/**
 * Wipes every locally stored checkout identity cache and its owner marker.
 * Called on sign-out and whenever checkout is opened without a session.
 */
export function clearCheckoutIdentity() {
  removeLocalIdentityData();

  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CHECKOUT_OWNER_KEY);
  } catch {
    /* storage blocked */
  }
}

/**
 * Binds local checkout data to `owner`. If the previous owner was different
 * (including a missing marker), draft/address/order data is deleted before the
 * new owner is recorded. Returns true when the owner changed so callers can
 * reset in-memory state too.
 */
export function reconcileCheckoutIdentity(owner: string) {
  if (typeof window === "undefined") return false;

  const previous = readCheckoutOwner();
  if (previous === owner) return false;

  removeLocalIdentityData();
  writeCheckoutOwner(owner);
  return true;
}
