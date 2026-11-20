import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { CartProvider } from "@/components/providers/cart-provider";
import { WishlistProvider } from "@/components/providers/wishlist-provider";
import { RecentlyViewedProvider } from "@/components/providers/recently-viewed-provider";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { MobileTabBar } from "@/components/storefront/mobile-tab-bar";
import { getAllProducts } from "@/lib/data/products";
import "./globals.css";
import { cn } from "@/lib/utils";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Sole & Stone — Premium Footwear",
    template: "%s · Sole & Stone",
  },
  description:
    "Sole & Stone is a modern footwear boutique — sneakers, running shoes, boots, dress and heels. Filter by brand, colour, size and price with instant search, a live cart drawer and a fast mobile-first experience.",
  keywords: ["sneakers", "shoes", "footwear store", "ecommerce", "Next.js", "Supabase"],
  openGraph: {
    title: "Sole & Stone — Premium Footwear",
    description: "Sneakers, runners, boots, dress shoes & heels.",
    images: ["/img/products/am1-orange-white.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#fafaf9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const wishlistAliases = getAllProducts().map(({ id, slug }) => ({ id, slug }));

  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", nunitoSans.variable, "font-sans")}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background font-sans font-bold">
        <CartProvider>
          <WishlistProvider productAliases={wishlistAliases}>
            <RecentlyViewedProvider>
              <SiteHeader />
              <main className="flex-1 pb-20 md:pb-0">{children}</main>
              <SiteFooter />
              <CartDrawer />
              <MobileTabBar />
              <Toaster position="bottom-center" richColors expand />
            </RecentlyViewedProvider>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
