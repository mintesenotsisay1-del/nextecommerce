import type { ShippingDetails } from "@/lib/types";
import { SAVED_ADDRESS_KEY } from "@/lib/checkout/identity";

/** Delivery details saved on the account page and reused at checkout. */
export type SavedAddress = Omit<ShippingDetails, "email">;

export const DEFAULT_COUNTRY = "United States";

export const EMPTY_SAVED_ADDRESS: SavedAddress = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  country: DEFAULT_COUNTRY,
};

export type ProfileAddressRow = {
  full_name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

type AddressInput = Partial<
  Record<keyof SavedAddress, string | null | undefined>
> &
  ProfileAddressRow;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/** Normalizes form, profile-row, or storage values into one shape. */
export function normalizeSavedAddress(value: AddressInput | null | undefined): SavedAddress {
  const row = value ?? {};

  return {
    fullName: text(row.fullName ?? row.full_name),
    phone: text(row.phone),
    address: text(row.address),
    city: text(row.city),
    postalCode: text(row.postalCode ?? row.postal_code),
    country: text(row.country) || DEFAULT_COUNTRY,
  };
}

export function hasSavedAddress(address: SavedAddress | null | undefined) {
  if (!address) return false;
  return Boolean(
    address.fullName ||
      address.phone ||
      address.address ||
      address.city ||
      address.postalCode
  );
}

/** Maps a Supabase profiles row to saved delivery details, if any exist. */
export function savedAddressFromProfile(
  row: ProfileAddressRow | null | undefined
): SavedAddress | null {
  if (!row) return null;
  const address = normalizeSavedAddress(row);
  return hasSavedAddress(address) ? address : null;
}

export function readLocalSavedAddress(): SavedAddress | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SAVED_ADDRESS_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const address = normalizeSavedAddress(parsed as AddressInput);
    return hasSavedAddress(address) ? address : null;
  } catch {
    return null;
  }
}

export function writeLocalSavedAddress(address: SavedAddress) {
  try {
    window.localStorage.setItem(SAVED_ADDRESS_KEY, JSON.stringify(address));
    return true;
  } catch {
    return false;
  }
}
