export type Category = "sneakers" | "running" | "basketball" | "boots" | "dress" | "heels";

export type SizeVariant = {
  size: string;
  stock: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: Category;
  gender: "men" | "women" | "unisex";
  color: string;
  colorFamily: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  sizes: SizeVariant[];
  rating: number;
  reviewCount: number;
  tags: ("new" | "bestseller" | "limited" | "sale")[];
  shortDescription: string;
  description: string;
  details: string[];
  care: string;
};

/** A storefront product paired with the Supabase row that owns it. */
export type AdminProduct = {
  product: Product;
  /** UUID of the matching Supabase row, or null for a local-only product. */
  sourceId: string | null;
};

export type CartLine = {
  /** product id + size + color are combined into a unique line key */
  key: string;
  productId: string;
  slug: string;
  name: string;
  brand: string;
  image: string;
  size: string;
  price: number;
  quantity: number;
};

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export type ShippingDetails = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

export type Order = {
  id: string;
  createdAt: string;
  items: CartLine[];
  subtotal: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  customer: ShippingDetails;
  userId?: string;
};

export type Review = {
  id: string;
  productId: string;
  author: string;
  rating: number;
  title?: string;
  body: string;
  createdAt: string;
};

export type AdminStats = {
  revenue: number;
  orders: number;
  avgOrderValue: number;
  unitsSold: number;
};
