import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { loadSiteSettings } from "@/lib/data/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const { companyName } = await loadSiteSettings();

  return {
    title: "Sign in",
    description: `Sign in to ${companyName} to track orders, wishlist shoes and get early access.`,
  };
}

/** Reads the `next` return path (for example, back to checkout). */
export default async function LoginPage({
  searchParams,
}: PageProps<"/auth/login">) {
  const { next } = await searchParams;

  return (
    <AuthShell
      imageSrc="/img/products/aj1-low-sbb.jpg"
      imageAlt="Sneakers on a ledge"
      quote="“Every anniversary of the store I buy one limited release — this is the only shop I’d trust for it.”"
      attribution="— Ray S., verified member"
    >
      <LoginForm next={typeof next === "string" ? next : "/account"} />
    </AuthShell>
  );
}
