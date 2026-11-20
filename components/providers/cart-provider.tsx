"use client";

import * as React from "react";
import type { CartLine, Product } from "@/lib/types";
import { useHydratedJson } from "@/lib/hooks/use-hydrated-json";

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, size: string, quantity?: number) => void;
  removeLine: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  /** Re-add removed lines (undo) — merges by key, never duplicates. */
  restoreLines: (lines: CartLine[]) => void;
};

const CartContext = React.createContext<CartContextValue | null>(null);
const STORAGE_KEY = "sole-stone-cart-v1";

const FREE_SHIPPING_THRESHOLD = 250;

export function freeShippingThreshold() {
  return FREE_SHIPPING_THRESHOLD;
}

function lineKey(productId: string, size: string) {
  return `${productId}::${size}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines, hydrated] = useHydratedJson<CartLine[]>(STORAGE_KEY, []);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // storage full/blocked — non-fatal
    }
  }, [lines, hydrated]);

  const addItem = React.useCallback(
    (product: Product, size: string, quantity = 1) => {
      setLines((prev) => {
        const key = lineKey(product.id, size);
        const existing = prev.find((l) => l.key === key);
        const stock = product.sizes.find((s) => s.size === size)?.stock ?? 0;
        const maxQty = Math.max(1, stock);
        if (existing) {
          return prev.map((l) =>
            l.key === key
              ? { ...l, quantity: Math.min(l.quantity + quantity, maxQty) }
              : l
          );
        }
        return [
          ...prev,
          {
            key,
            productId: product.id,
            slug: product.slug,
            name: product.name,
            brand: product.brand,
            image: product.images[0],
            size,
            price: product.price,
            quantity: Math.min(quantity, maxQty),
          },
        ];
      });
      setIsOpen(true);
    },
    [setLines]
  );

  const removeLine = React.useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, [setLines]);

  const setQuantity = React.useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, quantity } : l))
    );
  }, [setLines]);

  const clear = React.useCallback(() => setLines([]), [setLines]);

  const restoreLines = React.useCallback(
    (incoming: CartLine[]) => {
      setLines((prev) => {
        const merged = new Map(prev.map((l) => [l.key, l]));
        for (const line of incoming) {
          if (!merged.has(line.key)) merged.set(line.key, line);
        }
        return [...merged.values()];
      });
    },
    [setLines]
  );

  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  const value = React.useMemo(
    () => ({
      lines,
      count,
      subtotal,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      removeLine,
      setQuantity,
      clear,
      restoreLines,
    }),
    [
      lines,
      count,
      subtotal,
      isOpen,
      addItem,
      removeLine,
      setQuantity,
      clear,
      restoreLines,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
