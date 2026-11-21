import { NextResponse } from "next/server";
import { getCatalogProducts } from "@/lib/data/storefront-products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const products = await getCatalogProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("[api/products] Failed to load catalog products:", error);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}
