import type { Metadata } from "next";
import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { ProductsTable } from "@/components/sell/ProductsTable";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireSeller } from "@/lib/auth";
import { getSellerProducts } from "@/lib/queries/seller";

export const metadata: Metadata = { title: "Products" };

export default async function SellerProductsPage({ searchParams }: PageProps<"/sell/products">) {
  const seller = await requireSeller();
  const [products, sp] = await Promise.all([getSellerProducts(seller.businessId), searchParams]);
  const saved = typeof sp.saved === "string" ? sp.saved : null;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold tracking-tight">Products</h1>
        <Link href="/sell/products/new" className={buttonClass("primary", "md")}>
          <PackagePlus size={16} strokeWidth={1.75} aria-hidden /> Add product
        </Link>
      </div>
      {saved && <p className="rounded-card border border-success/25 bg-success-soft px-4 py-3 text-sm text-ink">Saved “{saved}”.</p>}
      {products.length ? (
        <ProductsTable products={products} />
      ) : (
        <EmptyState icon={PackagePlus} title="Add your first listing" body="Listings with clear photos and a pickup location sell faster." action={{ label: "Add product", href: "/sell/products/new" }} />
      )}
    </div>
  );
}
