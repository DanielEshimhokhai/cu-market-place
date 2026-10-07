"use server";

import { z } from "zod";
import { getProductsByIds } from "@/lib/queries/catalog";
import type { ProductCardData } from "@/lib/types";

const ids = z.array(z.uuid()).max(24);

/** Used by the client-side "Recently viewed" rail. */
export async function getCardsByIds(input: string[]): Promise<ProductCardData[]> {
  const parsed = ids.safeParse(input);
  if (!parsed.success) return [];
  return getProductsByIds(parsed.data);
}
