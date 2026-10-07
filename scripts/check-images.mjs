// HEAD-requests every Unsplash image referenced by the seed and reports failures.
import { IMG } from "../supabase/seed/data.mjs";

export const unsplashUrl = (id) => `https://images.unsplash.com/photo-${id}?w=900&q=70&auto=format&fit=crop`;

const entries = Object.entries(IMG);
const results = await Promise.all(entries.map(async ([key, id]) => {
  try {
    const res = await fetch(unsplashUrl(id), { method: "HEAD" });
    return [key, res.status];
  } catch (e) {
    return [key, String(e.message)];
  }
}));
const bad = results.filter(([, status]) => status !== 200);
for (const [key, status] of bad) console.log(`FAIL ${key} (${IMG[key]}): ${status}`);
console.log(bad.length ? `${bad.length} of ${entries.length} images failed` : `all images OK (${entries.length})`);
