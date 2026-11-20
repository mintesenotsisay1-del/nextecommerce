import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { loadSiteSettings } from "@/lib/data/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const { companyName } = await loadSiteSettings();

  return {
    title: "Create account",
    description: `Create a ${companyName} account to track orders and get early access to drops.`,
  };
}

export default async function SignupPage({
  searchParams,
}: PageProps<"/auth/signup">) {
  const { next } = await searchParams;
  const { companyName } = await loadSiteSettings();

  return (
    <AuthShell
      imageSrc="/img/products/aj1-low-sbb.jpg"
      imageAlt="Sneakers on a ledge"
      quote="“Members see limited drops 48 hours early. The AF-1 Swoosh Pack sold out before non-members even got the link.”"
      attribution={`— The ${companyName} team`}
    >
      <SignupForm next={typeof next === "string" ? next : "/account"} />
    </AuthShell>
  );
}
