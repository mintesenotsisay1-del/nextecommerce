"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Info, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function SignupForm({ next = "/account" }: { next?: string }) {
  const router = useRouter();
  const { settings } = useSiteSettings();
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const isCheckout = safeNext.startsWith("/checkout");
  const loginHref = isCheckout
    ? `/auth/login?next=${encodeURIComponent(safeNext)}`
    : "/auth/login";
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [accept, setAccept] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accept) {
      toast.error("Please accept the terms first");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.info("Demo mode", {
        description: "Connect Supabase (README) to create real accounts. The storefront already works.",
      });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Couldn’t create the account", { description: error.message });
      return;
    }
    if (data.session) {
      toast.success(`Welcome to ${settings.companyName}!`);
      router.push(safeNext);
      router.refresh();
    } else {
      toast.success("Check your inbox", {
        description: "We sent a confirmation link — verify to activate your account.",
      });
    }
  }

  return (
    <>
      <div>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase sm:text-[11px]">
          {isCheckout ? "Secure checkout" : "Join the inner circle"}
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {isCheckout ? "Create an account to check out" : "Create account"}
        </h1>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {isCheckout
            ? "Your bag is saved. Create an account to keep delivery details private and track this order."
            : "Order tracking, wishlist sync and 48h early access to drops."}
        </p>
      </div>

      {!isSupabaseConfigured() && (
        <Alert className="mt-4 rounded-xl">
          <Info aria-hidden />
          <AlertTitle>Demo mode is on</AlertTitle>
          <AlertDescription>
            Supabase credentials aren’t set yet — see{" "}
            <code className="rounded bg-muted px-1">README.md</code>. The store works fully without
            them.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-5">
        <GoogleAuthButton next={safeNext} />
        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-medium tracking-[0.16em] whitespace-nowrap text-muted-foreground uppercase">
            or continue with email
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3.5 sm:gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Full name</Label>
          <div className="relative">
            <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl pl-9"
              placeholder="Rachel Woods"
              autoComplete="name"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl pl-9"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl pr-10 pl-9"
              placeholder="8+ characters"
              autoComplete="new-password"
            />
            <button
              type="button"
              aria-label={showPw ? "Hide password" : "Show password"}
              onClick={() => setShowPw((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={accept}
            onChange={(e) => setAccept(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-black"
          />
          <span className="leading-relaxed">
            I agree to the <span className="underline underline-offset-2">Terms</span> and{" "}
            <span className="underline underline-offset-2">Privacy Policy</span> of this demo store.
          </span>
        </label>

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="mt-1 h-11 w-full rounded-full"
        >
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <Separator className="my-6" />
      <p className="text-center text-sm text-muted-foreground">
        Already a member?{" "}
        <Link href={loginHref} className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
