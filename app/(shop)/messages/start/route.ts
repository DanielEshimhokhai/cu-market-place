import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const uuid = (v: string | null) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : null);

/** Opens (or reuses) a conversation, then redirects to it. Linked from product, store and order pages. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const business = uuid(sp.get("business"));
  const product = uuid(sp.get("product"));
  const order = uuid(sp.get("order"));
  const back = (path: string) => NextResponse.redirect(new URL(path, request.nextUrl.origin));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return back(`/auth/sign-in?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`);

  const { data, error } = order
    ? await supabase.rpc("start_order_conversation", { p_order_id: order })
    : business
      ? await supabase.rpc("start_conversation", { p_business_id: business, p_product_id: product, p_order_id: null })
      : { data: null, error: { message: "NOT_FOUND" } };

  if (error) {
    if (error.message.includes("OWN_BUSINESS")) return back("/sell");
    return back("/messages?error=start");
  }
  return back(`/messages/${data as string}`);
}
