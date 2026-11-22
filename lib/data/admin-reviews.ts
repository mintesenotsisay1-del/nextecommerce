import { REVIEWS } from "@/lib/data/reviews";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Review } from "@/lib/types";

export type AdminReviewData = {
  reviews: Review[];
  reviewsLive: boolean;
};

export async function loadAdminReviewData(): Promise<AdminReviewData> {
  const configured = isSupabaseConfigured();
  if (configured) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("reviews")
          .select("id, product_id, author, rating, title, body, created_at")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          const reviews: Review[] = data.map((row) => ({
            id: row.id,
            productId: row.product_id,
            author: row.author || "Customer",
            rating: Number(row.rating) || 5,
            title: row.title || undefined,
            body: row.body || "",
            createdAt: row.created_at,
          }));
          return { reviews, reviewsLive: true };
        }
      } catch (err) {
        console.error("[admin] Could not fetch reviews from Supabase:", err);
      }
    }
  }

  return { reviews: REVIEWS, reviewsLive: false };
}
