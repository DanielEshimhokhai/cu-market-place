export function slugify(text: string): string {
  const s = text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "");
  return s || "item";
}
export const withSuffix = (slug: string, suffix: string) => `${slug}-${suffix}`;
