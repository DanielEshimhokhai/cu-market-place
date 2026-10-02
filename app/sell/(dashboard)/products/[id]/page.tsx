import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ProductForm } from "@/components/sell/ProductForm";
import { requireSeller } from "@/lib/auth";
import { getCategories, getLocations } from "@/lib/queries/reference";
import { getEditableProduct, getSellerBusiness } from "@/lib/queries/seller";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditProductPage({ params }: PageProps<"/sell/products/[id]">) {
  const { id } = await params;
  const seller = await requireSeller();
  const [product, business, categories, locations] = await Promise.all([
    getEditableProduct(seller.businessId, id),
    getSellerBusiness(seller.businessId),
    getCategories(),
    getLocations(),
  ]);
  if (!product) notFound();
  return (
    <div>
      <Link href="/sell/products" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
        <ChevronLeft size={14} aria-hidden /> Products
      </Link>
      <h1 className="mt-2 mb-6 text-[22px] font-semibold tracking-tight">Edit listing</h1>
      <ProductForm
        businessId={seller.businessId}
        categories={categories}
        locations={locations}
        defaultLocationId={business?.location_id ?? null}
        offersDelivery={business?.offers_delivery ?? false}
        product={product}
      />
    </div>
  );
}
