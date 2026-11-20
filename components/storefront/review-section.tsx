"use client";

import * as React from "react";
import { Star, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Stars } from "@/components/storefront/product-card";
import { REVIEWS } from "@/lib/data/reviews";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatDate } from "@/lib/format";
import type { Review } from "@/lib/types";
import { cn } from "@/lib/utils";

const LOCAL_KEY = "sole-stone-reviews-v1";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readLocalReviews(): Review[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Review[]) : [];
  } catch {
    return [];
  }
}

function writeLocalReviews(reviews: Review[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(reviews));
  } catch {
    /* ignore */
  }
}

/** Keeps realtime/local additions while the initial Supabase read settles. */
function mergeReviews(...groups: Review[][]): Review[] {
  const byId = new Map<string, Review>();
  for (const group of groups) {
    for (const review of group) {
      if (!byId.has(review.id)) byId.set(review.id, review);
    }
  }
  return [...byId.values()];
}

export function ReviewSection({
  productId,
  fallbackProductId,
  baseRating,
  baseCount,
}: {
  productId: string;
  /** Legacy/local id for reviews written before Supabase became the source. */
  fallbackProductId?: string;
  baseRating: number;
  baseCount: number;
}) {
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [composer, setComposer] = React.useState({ author: "", rating: 5, body: "" });
  const isRemoteProduct = UUID_RE.test(productId);

  React.useEffect(() => {
    let cancelled = false;

    // Load reviews inside a frame callback (subscription-style), keeping the
    // effect body free of synchronous setState.
    const frame = requestAnimationFrame(() => {
      const matches = (review: Review) =>
        review.productId === productId || review.productId === fallbackProductId;
      const local = readLocalReviews().filter(matches);
      setReviews([...local, ...REVIEWS.filter(matches)]);
    });

    const supabase = getSupabaseBrowserClient();
    if (isSupabaseConfigured() && supabase && isRemoteProduct) {
      void supabase
        .from("reviews")
        .select("id,author,rating,body,created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error) {
            console.warn("[reviews] Could not load Supabase reviews:", error.message);
            return;
          }

          const remote: Review[] = (data ?? []).map((row) => ({
            id: row.id,
            productId,
            author: row.author?.trim() || "Verified buyer",
            rating: row.rating,
            body: row.body,
            createdAt: row.created_at,
          }));

          setReviews((current) => mergeReviews(remote, current));
        });
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [productId, fallbackProductId, isRemoteProduct]);

  const list = reviews.length ? reviews : [];
  const avg =
    list.length > 0
      ? list.reduce((sum, r) => sum + r.rating, 0) / list.length
      : baseRating;
  const liveCount = list.filter(
    (review) => review.id.startsWith("local-") || UUID_RE.test(review.id)
  ).length;

  const distribution = [5, 4, 3, 2, 1].map((n) => ({
    star: n,
    count: list.filter((r) => Math.round(r.rating) === n).length,
  }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!composer.body.trim()) return;
    const review: Review = {
      id: `local-${Date.now()}`,
      productId,
      author: composer.author.trim() || "You",
      rating: composer.rating,
      body: composer.body.trim(),
      createdAt: new Date().toISOString(),
    };

    let savedToSupabase = false;
    let localNote = "This pair is not in the Supabase catalogue yet.";
    let saveError: string | null = null;

    const supabase = getSupabaseBrowserClient();
    if (isSupabaseConfigured() && supabase && isRemoteProduct) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("reviews")
          .insert({
            product_id: productId,
            author: review.author,
            rating: review.rating,
            body: review.body,
            user_id: user.id,
          })
          .select("id,created_at")
          .single();

        if (error) {
          saveError = error.message;
        } else {
          savedToSupabase = true;
          const savedReview: Review = {
            ...review,
            id: data?.id ?? review.id,
            createdAt: data?.created_at ?? review.createdAt,
          };
          setReviews((current) => mergeReviews([savedReview], current));
        }
      } else {
        localNote = "Sign in to publish your review for everyone.";
      }
    } else if (isSupabaseConfigured()) {
      localNote = "Demo pairs keep reviews on this device.";
    } else {
      localNote = "Connect Supabase to keep reviews for everyone.";
    }

    if (!savedToSupabase) {
      const all = readLocalReviews();
      writeLocalReviews([review, ...all]);
      setReviews((current) => mergeReviews([review], current));
    }

    setComposer({ author: "", rating: 5, body: "" });
    setDialogOpen(false);

    if (savedToSupabase) {
      toast.success("Thanks for the review!");
    } else if (saveError) {
      toast.error("Review saved on this device only", { description: saveError });
    } else {
      toast.info("Review saved on this device", { description: localNote });
    }
  }

  return (
    <section id="reviews" className="mx-auto mt-16 w-full max-w-7xl scroll-mt-24 px-4 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* Summary */}
        <div className="rounded-2xl border bg-card p-6">
          <p className="font-heading text-5xl font-semibold">{avg.toFixed(1)}</p>
          <Stars rating={avg} className="mt-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            Based on {baseCount + liveCount} verified purchases
          </p>
          <div className="mt-5 flex flex-col gap-1.5">
            {distribution.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-7 shrink-0 text-muted-foreground">{star}★</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn("block h-full rounded-full bg-foreground", "transition-all")}
                    style={{ width: `${list.length ? (count / list.length) * 100 : star === 5 ? 70 : star === 4 ? 20 : 10}%` }}
                  />
                </span>
                <span className="w-4 text-right text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={<Button className="mt-5 w-full rounded-full" />}
            >
              Write a review
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-heading">Share your experience</DialogTitle>
                <DialogDescription>
                  Your rating {isSupabaseConfigured() ? "will be saved to Supabase" : "is stored locally in demo mode"}.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="flex flex-col gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="review-name">Name</Label>
                  <Input
                    id="review-name"
                    value={composer.author}
                    onChange={(e) => setComposer((c) => ({ ...c, author: e.target.value }))}
                    placeholder="e.g. Alex J."
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Rating</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                        onClick={() => setComposer((c) => ({ ...c, rating: n }))}
                      >
                        <Star
                          className={cn(
                            "size-6 transition-colors",
                            n <= composer.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="review-body">Review</Label>
                  <Textarea
                    id="review-body"
                    required
                    rows={4}
                    value={composer.body}
                    onChange={(e) => setComposer((c) => ({ ...c, body: e.target.value }))}
                    placeholder="Fit, comfort, quality — everything helps."
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Publish review</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* List */}
        <div className="flex flex-col gap-4" role="feed">
          {list.map((r) => (
            <article key={r.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{r.author}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Stars rating={r.rating} />
                    <Badge variant="secondary" className="rounded-full text-[10px]">
                      <ThumbsUp className="mr-1 size-2.5" aria-hidden /> Verified purchase
                    </Badge>
                  </div>
                </div>
                <time className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</time>
              </div>
              {r.title && <p className="mt-3 text-sm font-medium">{r.title}</p>}
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            </article>
          ))}
          {list.length === 0 && (
            <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No written reviews yet — be the first (the {baseCount} in the score come from our
              catalogue metadata).
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
