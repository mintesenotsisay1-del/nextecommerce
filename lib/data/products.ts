import type { Category, Product } from "@/lib/types";

/**
 * Demo catalogue with locally stored product photography (/public/img/products).
 * Mirrors the `products` table shape in supabase/schema.sql so the same data
 * can be seeded into Supabase with supabase/seed.sql.
 */
export const PRODUCTS: Product[] = [
  {
    id: "p_am1_orange",
    slug: "air-max-1-white-orange",
    name: "Air Max 1 \u201CWhite \u00B7  Orange\u201D",
    brand: "Nike",
    category: "sneakers",
    gender: "unisex",
    color: "White / Bright Mandarin",
    colorFamily: "white",
    price: 149,
    images: ["/img/products/am1-orange-white.jpg", "/img/products/aj1-low-sbb.jpg", "/img/products/sb-names-white.jpg"],
    sizes: [
      { size: "US 7", stock: 4 },
      { size: "US 8", stock: 7 },
      { size: "US 9", stock: 9 },
      { size: "US 10", stock: 6 },
      { size: "US 11", stock: 3 },
      { size: "US 12", stock: 0 },
    ],
    rating: 4.8,
    reviewCount: 214,
    tags: ["new"],
    shortDescription: "The everyday icon with visible air cushioning.",
    description:
      "A timeless silhouette reborn in a crisp white upper with bright mandarin accents. Visible Air unit under the heel, padded collar and premium suede overlays make this an instant classic for every rotation.",
    details: ["Visible Air sole unit", "Suede + mesh upper", "Foam midsole", "Rubber outsole with herringbone grip"],
    care: "Wipe with a soft, damp cloth. Do not machine wash.",
  },
  {
    id: "p_flyknit_crimson",
    slug: "free-rn-flyknit-crimson",
    name: "Free RN Flyknit \u201CCrimson\u201D",
    brand: "Nike",
    category: "running",
    gender: "unisex",
    color: "University Red / Team Crimson",
    colorFamily: "red",
    price: 99,
    compareAtPrice: 139,
    images: ["/img/products/crimson-flyknit.jpg", "/img/products/lunar-black.jpg", "/img/products/am1-orange-white.jpg"],
    sizes: [
      { size: "US 7", stock: 6 },
      { size: "US 8", stock: 8 },
      { size: "US 9", stock: 5 },
      { size: "US 10", stock: 4 },
      { size: "US 11", stock: 8 },
      { size: "US 12", stock: 2 },
    ],
    rating: 4.6,
    reviewCount: 187,
    tags: ["sale"],
    shortDescription: "Featherweight knit runner — 29% off this week.",
    description:
      "One-piece Flyknit construction hugs your foot like a sock, while the gradient Free outsole flexes in every direction for a natural ride. Perfect for tempo days and everyday miles.",
    details: ["One-piece Flyknit upper", "Free flex-groove outsole", "Weight: 210 g", "Pull-tab heel"],
    care: "Hand wash with mild soap and air dry away from heat.",
  },
  {
    id: "p_aj1_bred_toe",
    slug: "air-jordan-1-bred-toe",
    name: "Air Jordan 1 Retro High OG \u201CBred Toe\u201D",
    brand: "Jordan",
    category: "sneakers",
    gender: "men",
    color: "Gym Red / Black / White",
    colorFamily: "black",
    price: 189,
    images: ["/img/products/aj1-bred-toe.jpg", "/img/products/aj1-low-sbb.jpg", "/img/products/street-style.jpg"],
    sizes: [
      { size: "US 8", stock: 2 },
      { size: "US 9", stock: 3 },
      { size: "US 10", stock: 5 },
      { size: "US 11", stock: 4 },
      { size: "US 12", stock: 2 },
    ],
    rating: 4.9,
    reviewCount: 431,
    tags: ["bestseller", "limited"],
    shortDescription: "The grail — leather high-top in heavy rotation since \u201985.",
    description:
      "Full-grain leather in Bred Toe blocking, encapsulated Air sole for lift, and the unmistakable wings logo. A collector-grade colourway that finishes every fit.",
    details: ["Full-grain leather upper", "Encapsulated Air-Sole", "Woven Jumpman tongue label", "Red wax laces included"],
    care: "Store away from direct sunlight. Use a leather conditioner sparingly.",
  },
  {
    id: "p_aj1_low_sbb",
    slug: "air-jordan-1-low-shattered-backboard",
    name: "Air Jordan 1 Low \u201CShattered Backboard\u201D",
    brand: "Jordan",
    category: "sneakers",
    gender: "unisex",
    color: "Black / Orange / White",
    colorFamily: "orange",
    price: 129,
    images: ["/img/products/aj1-low-sbb.jpg", "/img/products/aj1-bred-toe.jpg", "/img/products/sb-names-white.jpg"],
    sizes: [
      { size: "US 7", stock: 5 },
      { size: "US 8", stock: 9 },
      { size: "US 9", stock: 6 },
      { size: "US 10", stock: 7 },
      { size: "US 11", stock: 4 },
      { size: "US 12", stock: 5 },
    ],
    rating: 4.7,
    reviewCount: 298,
    tags: ["new"],
    shortDescription: "Street-ready low-top with university-orange accents.",
    description:
      "Inspired by the shattered backboard colourway, this low-cut AJ1 pairs tumbled leather with orange overlays and wax-print laces in tonal streetwear.",
    details: ["Low-cut collar", "Tumbled leather upper", "Zonal Air pod in heel", "Custom printed laces"],
    care: "Spot-clean only with a soft brush.",
  },
  {
    id: "p_vans_old_skool",
    slug: "vans-old-skool-port-royale",
    name: "Old Skool \u201CPort Royale\u201D",
    brand: "Vans",
    category: "sneakers",
    gender: "unisex",
    color: "Port Royale / True White",
    colorFamily: "burgundy",
    price: 69,
    images: ["/img/products/old-skool-burgundy.jpg", "/img/products/sb-names-white.jpg", "/img/products/street-style.jpg"],
    sizes: [
      { size: "US 6", stock: 7 },
      { size: "US 7", stock: 9 },
      { size: "US 8", stock: 11 },
      { size: "US 9", stock: 8 },
      { size: "US 10", stock: 9 },
      { size: "US 11", stock: 6 },
    ],
    rating: 4.5,
    reviewCount: 512,
    tags: ["bestseller"],
    shortDescription: "Where skate style was born — signature side stripe.",
    description:
      "The Old Skool in deep port royale. Durable suede and canvas uppers, the iconic Jazz stripe, and Vans\u2019 original Waffle outsole for grip that\u2019s kept it relevant for 50+ years.",
    details: ["Signature Jazz Stripe", "Suede and canvas upper", "Original Waffle Outsole", "Reinforced toe caps"],
    care: "Machine-washable on cold in a laundry bag. Air dry only.",
  },
  {
    id: "p_af1_swoosh_black",
    slug: "af1-swoosh-pack-black",
    name: "AF-1 \u201CSwoosh Pack\u201D",
    brand: "Nike",
    category: "sneakers",
    gender: "men",
    color: "Black / Sail",
    colorFamily: "black",
    price: 159,
    images: ["/img/products/af1-swoosh-black.jpg", "/img/products/street-style.jpg", "/img/products/aj1-bred-toe.jpg"],
    sizes: [
      { size: "US 7", stock: 0 },
      { size: "US 8", stock: 4 },
      { size: "US 9", stock: 6 },
      { size: "US 10", stock: 5 },
      { size: "US 11", stock: 0 },
      { size: "US 12", stock: 3 },
    ],
    rating: 4.8,
    reviewCount: 340,
    tags: ["limited"],
    shortDescription: "Statement dips on an all-black falcon leather base.",
    description:
      "Heavy tumbled black leather with a bold Sail swoosh, deconstructed branding and a specification-print inside the tongue. One of the year\u2019s most-coveted AF1s — strictly limited.",
    details: ["Limited release", "Tumbled full-grain leather", "\u201CSpecification\u201D printed tongue", "Sail Swoosh"],
    care: "Protect with a water-repellent spray before first wear.",
  },
  {
    id: "p_af1_carhartt",
    slug: "af1-carhartt-wip-tan",
    name: "AF-1 \u201CCarhartt WIP · Tan\u201D",
    brand: "Nike",
    category: "sneakers",
    gender: "men",
    color: "Leather Tan / Black",
    colorFamily: "brown",
    price: 175,
    images: ["/img/products/af1-carhartt-tan.jpg", "/img/products/timberland-brown.jpg", "/img/products/af1-swoosh-black.jpg"],
    sizes: [
      { size: "US 7", stock: 3 },
      { size: "US 8", stock: 5 },
      { size: "US 9", stock: 4 },
      { size: "US 10", stock: 6 },
      { size: "US 11", stock: 4 },
      { size: "US 12", stock: 2 },
    ],
    rating: 4.7,
    reviewCount: 156,
    tags: ["new"],
    shortDescription: "Workwear canvas meets the Force since \u201982.",
    description:
      "A crossover between the AF-1 legend and Carhartt\u2019s duck-canvas durability — tan canvas and leather on a gum-tinted tread, with sherpa lining for colder days.",
    details: ["Carhartt duck canvas", "Sherpa-lined collar", "Gum-tinted outsole", "Metal lace hardware"],
    care: "Brush off dirt; canvas can be spot-cleaned with warm water.",
  },
  {
    id: "p_lunar_black",
    slug: "lunar-epic-triple-black",
    name: "LunarEpic Flyknit \u201CTriple Black\u201D",
    brand: "Nike",
    category: "running",
    gender: "unisex",
    color: "Triple Black / Volt",
    colorFamily: "black",
    price: 109,
    compareAtPrice: 159,
    images: ["/img/products/lunar-black.jpg", "/img/products/crimson-flyknit.jpg", "/img/products/kyrie-7-black.jpg"],
    sizes: [
      { size: "US 7", stock: 8 },
      { size: "US 8", stock: 6 },
      { size: "US 9", stock: 3 },
      { size: "US 10", stock: 7 },
      { size: "US 11", stock: 9 },
      { size: "US 12", stock: 4 },
    ],
    rating: 4.4,
    reviewCount: 121,
    tags: ["sale"],
    shortDescription: "Sock-like running shoe with responsive Lunarlon foam.",
    description:
      "A milestone in Flyknit running design — completely structureless upper with a floating cable system and plush Lunarlon midsole beneath volt speckling.",
    details: ["Structureless Flyknit", "Lunarlon midsole", "Floating lace cable system", "Metered grip zones"],
    care: "Air-dry after wet runs. Avoid tumble drying.",
  },
  {
    id: "p_kyrie_7",
    slug: "kyrie-7-black",
    name: "Kyrie 7 \u201CAS \u2019em\u201D",
    brand: "Nike",
    category: "basketball",
    gender: "men",
    color: "Black / White",
    colorFamily: "black",
    price: 139,
    images: ["/img/products/kyrie-7-black.jpg", "/img/products/aj1-bred-toe.jpg", "/img/products/lunar-black.jpg"],
    sizes: [
      { size: "US 7", stock: 5 },
      { size: "US 8", stock: 8 },
      { size: "US 9", stock: 6 },
      { size: "US 10", stock: 9 },
      { size: "US 11", stock: 7 },
      { size: "US 12", stock: 5 },
    ],
    rating: 4.6,
    reviewCount: 232,
    tags: ["bestseller"],
    shortDescription: "Sharp cuts, court-concerted precision.",
    description:
      "Kyrie 7 refines the low-cut point-guard formula: layered forefoot straps lock in a batou, while a Zoom Air turbo in the heel handles hard plants at full speed.",
    details: ["Court-locked forefoot straps", "Zoom Air unit", "Multi-directional herringbone", "Elongated heel counter"],
    care: "Wipe court dust with a dry microfibre towel.",
  },
  {
    id: "p_sb_names_white",
    slug: "sb-air-max-names-white",
    name: "SB Air Max \u201CNames\u201D",
    brand: "Nike",
    category: "sneakers",
    gender: "unisex",
    color: "White / Black",
    colorFamily: "white",
    price: 109,
    images: ["/img/products/sb-names-white.jpg", "/img/products/old-skool-burgundy.jpg", "/img/products/am1-orange-white.jpg"],
    sizes: [
      { size: "US 6", stock: 4 },
      { size: "US 7", stock: 6 },
      { size: "US 8", stock: 8 },
      { size: "US 9", stock: 5 },
      { size: "US 10", stock: 6 },
      { size: "US 11", stock: 3 },
    ],
    rating: 4.5,
    reviewCount: 98,
    tags: [],
    shortDescription: "Skate-tested cushioning on a clean knit base.",
    description:
      "Names edition SB Air Max with a breathable engine-mesh upper, skate-standard reinforced shell and a unit-in-heel air bag with visible print details throughout.",
    details: ["Engineered mesh upper", "Skate Air cushioning", "Grip-tack rubber cup sole", "Reinforced toe"],
    care: "Air-dry away from direct sunlight after riding.",
  },
  {
    id: "p_timberland_premium",
    slug: "timberland-6-inch-premium",
    name: "6-Inch Premium Boot",
    brand: "Timberland",
    category: "boots",
    gender: "men",
    color: "Rust Nubuck",
    colorFamily: "brown",
    price: 199,
    images: ["/img/products/timberland-brown.jpg", "/img/products/af1-carhartt-tan.jpg", "/img/products/monk-strap-brown.jpg"],
    sizes: [
      { size: "US 7", stock: 4 },
      { size: "US 8", stock: 6 },
      { size: "US 9", stock: 7 },
      { size: "US 10", stock: 8 },
      { size: "US 11", stock: 5 },
      { size: "US 12", stock: 3 },
    ],
    rating: 4.8,
    reviewCount: 356,
    tags: ["bestseller"],
    shortDescription: "Waterproof nubuck work-boot icon.",
    description:
      "The original waterproof boot. Premium nubuck, 400 g PrimaLoft\u00AE-free insulation, seam-sealed construction and a padded collar — built to storm through winters for decades.",
    details: ["Seam-sealed waterproof construction", "Premium full-grain nubuck", "Padded collar", "Rust-proof hardware"],
    care: "Condition with a nubuck-specific wax. Use a suede brush monthly.",
  },
  {
    id: "p_aldo_pump",
    slug: "aldo-stiletto-floral",
    name: "Floral Pointed Pump",
    brand: "ALDO",
    category: "heels",
    gender: "women",
    color: "Lapis Floral",
    colorFamily: "blue",
    price: 89,
    compareAtPrice: 119,
    images: ["/img/products/floral-heels-blue.jpg"],
    sizes: [
      { size: "EU 36", stock: 3 },
      { size: "EU 37", stock: 5 },
      { size: "EU 38", stock: 6 },
      { size: "EU 39", stock: 4 },
      { size: "EU 40", stock: 5 },
      { size: "EU 41", stock: 2 },
    ],
    rating: 4.3,
    reviewCount: 87,
    tags: ["sale"],
    shortDescription: "Satin stiletto in a hand-painted floral finish.",
    description:
      "Show-stopping pointed toe in lapis satin with hand-painted florals. 10.5 cm heel with a supportive back counter so you can wear them from ceremony to after-party. Also matches a matching handbag line.",
    details: ["10.5 cm stiletto heel", "Hand-painted satin upper", "Pointed toe", "Padded insole"],
    care: "Keep away from rain. Store with a shoe tree.",
  },
  {
    id: "p_monk_strap",
    slug: "double-monk-strap-brown",
    name: "Double Monk Strap",
    brand: "Hugo Boss",
    category: "dress",
    gender: "men",
    color: "Cognac Calfskin",
    colorFamily: "brown",
    price: 249,
    images: ["/img/products/monk-strap-brown.jpg", "/img/products/timberland-brown.jpg"],
    sizes: [
      { size: "US 7", stock: 2 },
      { size: "US 8", stock: 3 },
      { size: "US 9", stock: 4 },
      { size: "US 10", stock: 4 },
      { size: "US 11", stock: 2 },
      { size: "US 12", stock: 1 },
    ],
    rating: 4.7,
    reviewCount: 64,
    tags: [],
    shortDescription: "Calfskin monk strap — hand-finished in Italy by artisans.",
    description:
      "Cognac hand-burnished calfskin with a slightly curved last and twin buckles, on a Blake-stitched leather sole. An elegant king-piece between formal and fashion.",
    details: ["Blake-stitched leather sole", "Hand-burnished finish", "Twin brushed-metal buckles", "Antibacterial leather lining"],
    care: "Polish monthly; rotate use to let the leather rest.",
  },
];

export function getAllProducts(): Product[] {
  return PRODUCTS;
}

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductsByIds(ids: string[]): Product[] {
  return PRODUCTS.filter((p) => ids.includes(p.id));
}

/** Curated: highest rated, low stock, or flagged limited — showcased on home page. */
export function getFeaturedProducts(count = 4): Product[] {
  const featured = [
    getProductBySlug("air-jordan-1-bred-toe")!,
    getProductBySlug("air-max-1-white-orange")!,
    getProductBySlug("aldo-stiletto-floral")!,
    getProductBySlug("af1-swoosh-pack-black")!,
  ];
  return featured.slice(0, count);
}

export function getNewArrivals(count = 8): Product[] {
  return PRODUCTS.filter((p) => p.tags.includes("new")).slice(0, count);
}

export function getBestSellers(count = 4): Product[] {
  return PRODUCTS.filter((p) => p.tags.includes("bestseller")).slice(0, count);
}

export function getOnSale(count = 4): Product[] {
  return PRODUCTS.filter((p) => !!p.compareAtPrice).slice(0, count);
}

export function getCategories(): { name: string; value: Category; image: string; count: number }[] {
  const meta: Record<Category, { label: string; image: string }> = {
    sneakers: { label: "Sneakers", image: "/img/products/aj1-bred-toe.jpg" },
    running: { label: "Running", image: "/img/products/crimson-flyknit.jpg" },
    basketball: { label: "Basketball", image: "/img/products/kyrie-7-black.jpg" },
    boots: { label: "Boots", image: "/img/products/timberland-brown.jpg" },
    dress: { label: "Dress", image: "/img/products/monk-strap-brown.jpg" },
    heels: { label: "Heels", image: "/img/products/floral-heels-blue.jpg" },
  };
  return (Object.keys(meta) as Category[]).map((c) => ({
    name: meta[c].label,
    value: c,
    image: meta[c].image,
    count: PRODUCTS.filter((p) => p.category === c).length,
  }));
}

export function getBrands(): string[] {
  return Array.from(new Set(PRODUCTS.map((p) => p.brand))).sort();
}

export function getPriceBounds(): [number, number] {
  const prices = PRODUCTS.map((p) => p.price);
  return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
}

export function totalStock(p: Product): number {
  return p.sizes.reduce((sum, s) => sum + s.stock, 0);
}
