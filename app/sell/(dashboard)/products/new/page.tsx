import type { Metadata } from "next";
import { ProductForm } from "@/components/sell/ProductForm";
import { requireSeller } from "@/lib/auth";
import { getCategories, getLocations } from "@/lib/queries/reference";
import { getSellerBusiness } from "@/lib/queries/seller";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const seller = await requireSeller();
  const [business, categories, locations] = await Promise.all([getSellerBusiness(seller.businessId), getCategories(), getLocations()]);
  return (
    <div>
      <h1 className="mb-6 text-[22px] font-semibold tracking-tight">Add a listing</h1>
      <ProductForm
        businessId={seller.businessId}
        categories={categories}
        locations={locations}
        defaultLocationId={business?.location_id ?? null}
        offersDelivery={business?.offers_delivery ?? false}
      />
    </div>
  );
}
