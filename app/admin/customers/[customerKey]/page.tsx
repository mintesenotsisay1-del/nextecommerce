import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { CustomerDetail } from "@/components/admin/customer-detail";
import { Button } from "@/components/ui/button";
import { loadAdminOrderData } from "@/lib/data/admin-orders";
import { getCustomerSummary, ordersForCustomer } from "@/lib/data/customers";
import { getStorefrontProductEntries } from "@/lib/data/storefront-products";

export const metadata: Metadata = {
  title: "Customer profile",
  robots: { index: false },
};

type CustomerPageProps = {
  params: Promise<{ customerKey: string }>;
};

function normalizeKey(value: string) {
  try {
    return decodeURIComponent(value).trim().toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

export default async function CustomerPage({ params }: CustomerPageProps) {
  const { customerKey } = await params;
  const key = normalizeKey(customerKey);

  const [adminData, products] = await Promise.all([
    loadAdminOrderData(),
    getStorefrontProductEntries(),
  ]);
  const { orders, ordersLive, isAdmin, configured } = adminData;
  const customer = getCustomerSummary(orders, key);

  if (!customer) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <Users className="size-6 text-muted-foreground" aria-hidden />
        </span>
        <h1 className="font-heading mt-4 text-2xl font-semibold">Customer not found</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          This profile may have been removed, or the customer has no orders in the current data
          source.
        </p>
        <Button className="mt-6" render={<Link href="/admin?tab=customers" />}>
          Back to customers
        </Button>
      </div>
    );
  }

  const customerOrders = ordersForCustomer(orders, key);
  const canManage = !configured || isAdmin;

  return (
    <CustomerDetail
      customer={customer}
      initialOrders={customerOrders}
      products={products}
      ordersLive={ordersLive}
      canManage={canManage}
    />
  );
}
