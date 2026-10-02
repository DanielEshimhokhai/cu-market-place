import type { Metadata } from "next";
import { ActionButton } from "@/components/admin/AdminUi";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { toggleCategory } from "@/lib/actions/admin";
import { getAdminCategories } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();
  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-tight">Categories</h1>
      <p className="mt-1 text-sm text-muted">Lower sort numbers appear first. Hidden categories disappear from browsing and filters.</p>
      <div className="mt-4 rounded-card border border-line bg-surface p-4">
        <CategoryForm nextSort={(categories.at(-1)?.sort ?? 0) + 1} />
      </div>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {categories.map((c) => (
          <li key={c.id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${c.is_active ? "" : "opacity-60"}`}>
            <CategoryForm category={c} />
            {c.is_active ? (
              <ActionButton label="Hide" variant="ghost" action={toggleCategory.bind(null, c.id, false)} />
            ) : (
              <ActionButton label="Show" action={toggleCategory.bind(null, c.id, true)} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
