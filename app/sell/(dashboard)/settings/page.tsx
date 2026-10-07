import type { Metadata } from "next";
import { BusinessForm } from "@/components/sell/BusinessForm";
import { LogoUploader } from "@/components/sell/LogoUploader";
import { requireSeller } from "@/lib/auth";
import { getCategories, getLocations } from "@/lib/queries/reference";
import { getSellerBusiness } from "@/lib/queries/seller";

export const metadata: Metadata = { title: "Store settings" };

export default async function StoreSettingsPage() {
  const seller = await requireSeller();
  const [business, categories, locations] = await Promise.all([getSellerBusiness(seller.businessId), getCategories(), getLocations()]);
  if (!business) return null;
  return (
    <div className="space-y-8">
      <h1 className="text-[22px] font-semibold tracking-tight">Store settings</h1>
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold">Logo</h2>
        <LogoUploader businessId={business.id} name={business.name} logoUrl={business.logo_url} />
      </section>
      <BusinessForm
        mode="update"
        categories={categories}
        locations={locations}
        initial={{
          name: business.name,
          tagline: business.tagline ?? "",
          description: business.description ?? "",
          category_id: business.category_id ?? "",
          location_id: business.location_id ?? "",
          seller_type: business.seller_type,
          offers_delivery: business.offers_delivery,
          delivery_note: business.delivery_note ?? "",
          hours: business.hours ?? {},
        }}
      />
    </div>
  );
}
