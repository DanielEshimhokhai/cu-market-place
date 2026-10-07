import { NextResponse, type NextRequest } from "next/server";
import { suggest } from "@/lib/queries/search";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const data = await suggest(q);
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch {
    return NextResponse.json({ products: [], businesses: [], categories: [] }, { status: 200 });
  }
}
