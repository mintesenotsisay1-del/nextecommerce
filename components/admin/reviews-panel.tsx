"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  MessageSquare,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";
import type { AdminProduct, Review } from "@/lib/types";
import { cn } from "@/lib/utils";

type RatingFilter = "all" | "5" | "4" | "3" | "low";
type SortOption = "newest" | "oldest" | "highest" | "lowest";

type ReviewsPanelProps = {
  reviews: Review[];
  products: AdminProduct[];
  canManage: boolean;
  onDeleteReview?: (reviewId: string) => Promise<void> | void;
};

export function ReviewsPanel({
  reviews: initialReviews,
  products,
  canManage,
  onDeleteReview,
}: ReviewsPanelProps) {
  const [reviews, setReviews] = React.useState(initialReviews);
  const [query, setQuery] = React.useState("");
  const [ratingFilter, setRatingFilter] = React.useState<RatingFilter>("all");
  const [productFilter, setProductFilter] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<SortOption>("newest");
  const [deleteTarget, setDeleteTarget] = React.useState<Review | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Index products for rapid lookup
  const productIndex = React.useMemo(() => {
    const byId = new Map<string, AdminProduct["product"]>();
    const bySourceId = new Map<string, AdminProduct["product"]>();
    for (const entry of products) {
      byId.set(entry.product.id, entry.product);
      if (entry.sourceId) bySourceId.set(entry.sourceId, entry.product);
    }
    return {
      resolve: (id: string) => byId.get(id) ?? bySourceId.get(id),
    };
  }, [products]);

  // Summary statistics
  const stats = React.useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        avg: 0,
        distribution: [0, 0, 0, 0, 0],
        positiveRatio: 0,
      };
    }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = Number((sum / total).toFixed(1));
    const dist = [0, 0, 0, 0, 0]; // 5, 4, 3, 2, 1
    let positive = 0;
    for (const r of reviews) {
      const star = Math.max(1, Math.min(5, Math.round(r.rating)));
      dist[5 - star]++;
      if (star >= 4) positive++;
    }
    const positiveRatio = Math.round((positive / total) * 100);
    return { avg, distribution: dist, positiveRatio };
  }, [reviews]);

  // Filtered and sorted reviews
  const filteredReviews = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = reviews.filter((r) => {
      const product = productIndex.resolve(r.productId);
      const matchesSearch =
        !q ||
        r.author.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (product && product.name.toLowerCase().includes(q)) ||
        (product && product.brand.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (ratingFilter === "5" && r.rating !== 5) return false;
      if (ratingFilter === "4" && r.rating !== 4) return false;
      if (ratingFilter === "3" && r.rating !== 3) return false;
      if (ratingFilter === "low" && r.rating > 2) return false;

      if (productFilter !== "all") {
        const prod = productIndex.resolve(r.productId);
        if (prod?.id !== productFilter && prod?.slug !== productFilter && r.productId !== productFilter) {
          return false;
        }
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "highest") {
        return b.rating - a.rating;
      }
      return a.rating - b.rating;
    });

    return result;
  }, [reviews, query, ratingFilter, productFilter, sortBy, productIndex]);

  // Export CSV
  function handleExportCsv() {
    if (!reviews.length) {
      toast.error("No reviews to export.");
      return;
    }
    const header = ["Review ID", "Product", "Author", "Rating", "Title", "Body", "Date"];
    const rows = filteredReviews.map((r) => {
      const prod = productIndex.resolve(r.productId);
      return [
        r.id,
        prod ? `${prod.brand} - ${prod.name}` : r.productId,
        r.author,
        r.rating,
        r.title ?? "",
        r.body,
        formatDate(r.createdAt),
      ];
    });
    saveCsv(`reviews-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
    toast.success(`Exported ${filteredReviews.length} review${filteredReviews.length === 1 ? "" : "s"}`);
  }

  // Delete review
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (onDeleteReview) {
        await onDeleteReview(deleteTarget.id);
      }
      setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success("Review deleted successfully.");
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete review.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="rounded-3xl">
      <CardContent className="flex flex-col gap-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <MessageSquare className="size-5" aria-hidden />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold sm:text-xl">Customer Reviews</h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Monitor feedback, view ratings distribution and moderate submissions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-9 gap-1.5 rounded-full text-xs"
            >
              <Download className="size-3.5" aria-hidden />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Scorecard banner */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col justify-between rounded-2xl border bg-muted/20 p-4">
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Average Rating
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-heading text-3xl font-bold">{stats.avg || "—"}</span>
              <span className="text-xs text-muted-foreground">/ 5.0</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-4",
                    i < Math.round(stats.avg) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"
                  )}
                  aria-hidden
                />
              ))}
              <span className="ml-1 text-xs text-muted-foreground">({reviews.length} total)</span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border bg-muted/20 p-4">
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Satisfaction Rate
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-heading text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.positiveRatio}%
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              4 and 5-star positive ratings across all products
            </p>
          </div>

          <div className="flex flex-col justify-center gap-1.5 rounded-2xl border bg-muted/20 p-4">
            <span className="mb-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Rating Distribution
            </span>
            {[5, 4, 3, 2, 1].map((star, idx) => {
              const count = stats.distribution[idx];
              const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-5 shrink-0 text-right font-medium text-muted-foreground">{star}★</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        star >= 4 ? "bg-amber-400" : star === 3 ? "bg-amber-500/70" : "bg-red-400"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[10px] text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by customer, review text or product…"
              className="h-9 rounded-xl pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Rating Filter */}
            <Select value={ratingFilter} onValueChange={(v) => setRatingFilter((v as RatingFilter) ?? "all")}>
              <SelectTrigger className="h-9 w-32 rounded-xl text-xs">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ratings</SelectItem>
                <SelectItem value="5">5 stars only</SelectItem>
                <SelectItem value="4">4 stars</SelectItem>
                <SelectItem value="3">3 stars</SelectItem>
                <SelectItem value="low">Critical (≤2★)</SelectItem>
              </SelectContent>
            </Select>

            {/* Product Filter */}
            <Select value={productFilter} onValueChange={(v) => setProductFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-40 rounded-xl text-xs">
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {products.map(({ product }) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy((v as SortOption) ?? "newest")}>
              <SelectTrigger className="h-9 w-32 rounded-xl text-xs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="highest">Highest rated</SelectItem>
                <SelectItem value="lowest">Lowest rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center">
            <MessageSquare className="size-8 text-muted-foreground/40" aria-hidden />
            <p className="mt-3 text-sm font-semibold">No reviews found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your search terms or filter criteria.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y rounded-2xl border">
            {filteredReviews.map((review) => {
              const product = productIndex.resolve(review.productId);
              const productImage = product?.images?.[0] || "/img/products/am1-orange-white.jpg";

              return (
                <div
                  key={review.id}
                  className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex gap-3 sm:gap-4">
                    {/* Product thumbnail */}
                    {product ? (
                      <Link
                        href={`/products/${product.slug}`}
                        target="_blank"
                        className="group relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border/50 sm:size-14"
                        title={`View ${product.name} on storefront`}
                      >
                        <Image
                          src={productImage}
                          alt={product.name}
                          fill
                          sizes="56px"
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <ExternalLink className="size-3 text-white" aria-hidden />
                        </div>
                      </Link>
                    ) : (
                      <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground sm:size-14">
                        <MessageSquare className="size-5" />
                      </div>
                    )}

                    {/* Review content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {product && (
                          <span className="truncate text-xs font-semibold text-foreground">
                            {product.brand} · {product.name}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>

                      {/* Stars & Author */}
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "size-3",
                                i < review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-muted text-muted-foreground/25"
                              )}
                              aria-hidden
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {review.author}
                        </span>
                        <Badge variant="outline" className="h-4 px-1 text-[9px] text-muted-foreground">
                          Verified
                        </Badge>
                      </div>

                      {/* Title & Body */}
                      {review.title && (
                        <p className="mt-1.5 text-xs font-semibold text-foreground">
                          {review.title}
                        </p>
                      )}
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {review.body}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {canManage && (
                    <div className="flex items-center justify-end self-end sm:self-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(review)}
                        className="size-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Delete this review"
                        aria-label="Delete review"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <DialogTitle>Delete Review</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-xs">
              Are you sure you want to delete this customer review by{" "}
              <strong>{deleteTarget?.author}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <DialogClose render={<Button variant="outline" size="sm" />} disabled={deleting}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={deleting}
              className="gap-1.5"
            >
              {deleting ? "Deleting…" : "Delete Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
