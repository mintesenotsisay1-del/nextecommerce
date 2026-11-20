import type { Review } from "@/lib/types";

/** Seeded demo reviews — mirrors the `reviews` table in supabase/schema.sql. */
export const REVIEWS: Review[] = [
  { id: "r1", productId: "p_am1_orange", author: "Michael T.", rating: 5, title: "Cleanest pair I own", body: "The white/orange combo is unreal in person. Sizing is true to fit and the suede feels premium. Been wearing them daily for two weeks and they still look box-fresh.", createdAt: "2026-10-18" },
  { id: "r2", productId: "p_am1_orange", author: "Sara K.", rating: 4, title: "Great, order half size down", body: "Runs a touch long. Half size down fit me perfectly. Cushioning is comfy all day.", createdAt: "2026-10-02" },
  { id: "r3", productId: "p_am1_orange", author: "Dario M.", rating: 5, title: "Fast shipping", body: "Arrived in 2 days, immaculate packaging. The Air unit genuinely addscomfort after a full work day.", createdAt: "2026-09-21" },
  { id: "r4", productId: "p_flyknit_crimson", author: "Jin W.", rating: 5, title: "Feather light", body: "My tempo-day shoe now. The knit disappears on foot and the crimson colourway pops at sunrise runs.", createdAt: "2026-10-11" },
  { id: "r5", productId: "p_flyknit_crimson", author: "Paula R.", rating: 3, title: "Bit narrow", body: "Quality is great but the toe box is snug. I sized up and it worked, just wish it came in wide.", createdAt: "2026-09-30" },
  { id: "r6", productId: "p_aj1_bred_toe", author: "Kevin L.", rating: 5, title: "Grail secured", body: "The toe-blocking is perfect. Leather is thick and creases beautifully. Worth every cent.", createdAt: "2026-10-25" },
  { id: "r7", productId: "p_aj1_bred_toe", author: "Ana P.", rating: 5, title: "Birthday gift win", body: "My boyfriend hasn't taken them off. Shipped double-boxed with wax laces included.", createdAt: "2026-10-05" },
  { id: "r8", productId: "p_aj1_low_sbb", author: "Tom H.", rating: 4, title: "Weekend rotation", body: "Orange stands out more than photos suggest. Low-cut means no break-in pain at all.", createdAt: "2026-10-15" },
  { id: "r9", productId: "p_vans_old_skool", author: "Lena F.", rating: 5, title: "Old reliable", body: "Third pair of Old Skools. Port Royale is the deepest suede I've seen from Vans.", createdAt: "2026-09-12" },
  { id: "r10", productId: "p_vans_old_skool", author: "Chris D.", rating: 4, title: "Classic", body: "Waffle sole grips even on wet tiles at school. Wish the insole was a bit softer.", createdAt: "2026-10-01" },
  { id: "r11", productId: "p_af1_swoosh_black", author: "Ray S.", rating: 5, title: "Worth the hype", body: "The chunky sail swoosh against black leather is stunning. Feels like a collector item.", createdAt: "2026-10-20" },
  { id: "r12", productId: "p_af1_swoosh_black", author: "Mia V.", rating: 4, title: "Sizing runs roomy", body: "Go half a size down if between sizes. Otherwise faultless.", createdAt: "2026-09-28" },
  { id: "r13", productId: "p_af1_carhartt", author: "Nate O.", rating: 5, title: "Autumn boot in sneaker form", body: "Sherpa lining plus the Carhartt canvas is a vibe. Matches everything tan in my closet.", createdAt: "2026-10-22" },
  { id: "r14", productId: "p_lunar_black", author: "Ivy C.", rating: 4, title: "Responsive but quiet", body: "Lunarlon spring is great for easy miles. Triple black is stealthy in the gym too.", createdAt: "2026-10-08" },
  { id: "r15", productId: "p_kyrie_7", author: "Deon W.", rating: 5, title: "Ankle lock is elite", body: "The straps genuinely keep you planted for crossovers. Traction still perfect after 20 games.", createdAt: "2026-10-30" },
  { id: "r16", productId: "p_kyrie_7", author: "Kenji A.", rating: 4, title: "Snug fit", body: "Fit like a second skin — good for guards, might be tight for bigs.", createdAt: "2026-10-09" },
  { id: "r17", productId: "p_sb_names_white", author: "Ollie N.", rating: 4, title: "Skater approved", body: "Board feel through the toe is precise, and the heel air bag softened drops.", createdAt: "2026-09-25" },
  { id: "r18", productId: "p_timberland_premium", author: "Greg B.", rating: 5, title: "Winter-ready", body: "Walked through slush all week — feet bone dry. The nubuck has aged gorgeously.", createdAt: "2026-10-17" },
  { id: "r19", productId: "p_timberland_premium", author: "Hana Y.", rating: 5, title: "Bought twice", body: "Got mine a year ago and ordered a pair for my dad for the holidays.", createdAt: "2026-10-24" },
  { id: "r20", productId: "p_aldo_pump", author: "Beatrice N.", rating: 5, title: "Wedding showstopper", body: "Danced for 5 hours in these. The heel is high but the padded insole really helps.", createdAt: "2026-10-06" },
  { id: "r21", productId: "p_aldo_pump", author: "Sofia G.", rating: 4, title: "Stunning colour", body: "The floral is richer in person. Slight scuff on arrival but support replaced it free.", createdAt: "2026-09-19" },
  { id: "r22", productId: "p_monk_strap", author: "Winston C.", rating: 5, title: "Boardroom to dinner", body: "The cognac patina turns heads. Buckles feel solid, zero break-in blisters.", createdAt: "2026-10-12" },
  { id: "r23", productId: "p_monk_strap", author: "Elias T.", rating: 4, title: "Premium but pricey", body: "You get what you pay for — Blake stitch and genuine lining. Just wish more sizes were in stock.", createdAt: "2026-09-15" },
];

/** Demo orders shown on the admin dashboard when Supabase isn't configured. */
export function demoAdminOrders(): import("@/lib/types").Order[] {
  const mk = (
    id: string,
    createdAt: string,
    statuses: import("@/lib/types").OrderStatus,
    lines: Array<[string, string, number, string, number]>, // [productId, name, qty, size, price]
    total: number,
    city: string,
    name: string
  ): import("@/lib/types").Order => ({
    id,
    createdAt,
    status: statuses,
    subtotal: total,
    shipping: 0,
    total,
    items: lines.map(([productId, name, quantity, size, price], i) => ({
      key: `${id}-${i}`,
      productId,
      slug: "",
      name,
      brand: "",
      image: "",
      size,
      price,
      quantity,
    })),
    customer: {
      fullName: name,
      email: "",
      phone: "",
      address: "",
      city,
      postalCode: "",
      country: "USA",
    },
  });

  return [
    mk("DM-4821", "2026-11-02T10:24:00Z", "processing", [["p_aj1_bred_toe", "Air Jordan 1 Retro High OG \u201CBred Toe\u201D", 1, "US 10", 189], ["p_sb_names_white", "SB Air Max \u201CNames\u201D", 1, "US 9", 109]], 298, "Austin, TX", "Rachel Woods"),
    mk("DM-4820", "2026-11-01T18:42:00Z", "shipped", [["p_timberland_premium", "6-Inch Premium Boot", 1, "US 9", 199]], 199, "Denver, CO", "Owen Miller"),
    mk("DM-4819", "2026-11-01T09:05:00Z", "delivered", [["p_aldo_pump", "Floral Pointed Pump", 2, "EU 38", 89]], 178, "Miami, FL", "Sandra Ortiz"),
    mk("DM-4818", "2026-10-31T16:20:00Z", "delivered", [["p_vans_old_skool", "Old Skool \u201CPort Royale\u201D", 1, "US 10", 69], ["p_sb_names_white", "SB Air Max \u201CNames\u201D", 1, "US 10", 109]], 178, "Seattle, WA", "Jonas Reiter"),
    mk("DM-4817", "2026-10-30T12:10:00Z", "pending", [["p_monk_strap", "Double Monk Strap", 1, "US 10", 249]], 249, "Boston, MA", "Arthur Hale"),
    mk("DM-4816", "2026-10-30T08:55:00Z", "cancelled", [["p_flyknit_crimson", "Free RN Flyknit \u201CCrimson\u201D", 1, "US 8", 99]], 99, "Portland, OR", "Lily Sato"),
    mk("DM-4815", "2026-10-29T19:30:00Z", "delivered", [["p_kyrie_7", "Kyrie 7 \u201CAS \u2019em\u201D", 1, "US 10", 139], ["p_lunar_black", "LunarEpic Flyknit \u201CTriple Black\u201D", 1, "US 10", 109]], 248, "Chicago, IL", "Marcus Bell"),
    mk("DM-4814", "2026-10-28T11:00:00Z", "delivered", [["p_af1_carhartt", "AF-1 \u201CCarhartt WIP · Tan\u201D", 1, "US 9", 175]], 175, "Nashville, TN", "Tara Nguyen"),
  ];
}
