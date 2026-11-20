import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Sole & Stone account to track orders and get early access to drops.",
};

export default async function SignupPage({
  searchParams,
}: PageProps<"/auth/signup">) {
  const { next } = await searchParams;

  return (
    <AuthShell
      imageSrc="/img/products/aj1-low-sbb.jpg"
      imageAlt="Sneakers on a ledge"
      quote="“Members see limited drops 48 hours early. The AF-1 Swoosh Pack sold out before non-members even got the link.”"
      attribution="— The Sole & Stone team"
    >
      <SignupForm next={typeof next === "string" ? next : "/account"} />
    </AuthShell>
  );
}
