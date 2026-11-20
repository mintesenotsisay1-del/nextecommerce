"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Info, Lock, Mail } from "lucide-react";
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

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { settings } = useSiteSettings();
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const isCheckout = safeNext.startsWith("/checkout");
  const signupHref = isCheckout
    ? `/auth/signup?next=${encodeURIComponent(safeNext)}`
    : "/auth/signup";
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.info("Demo mode", {
        description:
          "Add your Supabase URL + anon key to .env.local and restart — sign-in goes live instantly.",
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Sign in failed", { description: error.message });
      return;
    }
    toast.success("Welcome back!");
    router.push(safeNext);
    router.refresh();
  }

  return (
    <>
      <div>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase sm:text-[11px]">
          {isCheckout ? "Secure checkout" : "Members area"}
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {isCheckout ? "Sign in to checkout" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {isCheckout
            ? "Your bag is saved. Sign in to use your own delivery details and place the order."
            : "Track orders, heart favourites and get first dibs on limited drops."}
        </p>
      </div>

      {!isSupabaseConfigured() && (
        <Alert className="mt-4 rounded-xl">
          <Info aria-hidden />
          <AlertTitle>Demo mode is on</AlertTitle>
          <AlertDescription>
            Supabase credentials aren’t set yet — see{" "}
            <code className="rounded bg-muted px-1">README.md</code> to connect your project. The rest
            of the store works fully.
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button type="button" className="text-xs text-muted-foreground hover:underline">
              Forgot?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl pr-10 pl-9"
              placeholder="••••••••"
              autoComplete="current-password"
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
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="mt-1 h-11 w-full rounded-full"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <Separator className="my-6" />
      <p className="text-center text-sm text-muted-foreground">
        New to {settings.companyName}?{" "}
        <Link href={signupHref} className="font-medium text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}
