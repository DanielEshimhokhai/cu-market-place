export type CartLine = { productId: string; variantId: string | null; variantLabel: string | null; quantity: number;
  title: string; productSlug: string; imageUrl: string | null; unitPriceKobo: number;
  businessId: string; businessName: string; businessSlug: string;
  maxQuantity: number | null; allowsPickup: boolean; allowsDelivery: boolean };
export const MAX_LINE_QTY = 20;
export const lineKey = (l: Pick<CartLine, "productId" | "variantId">) => `${l.productId}:${l.variantId ?? ""}`;
const clamp = (q: number, max: number | null) => Math.max(0, Math.min(q, MAX_LINE_QTY, max ?? Infinity));
export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const key = lineKey(line);
  const existing = lines.find((l) => lineKey(l) === key);
  if (!existing) return [...lines, { ...line, quantity: clamp(line.quantity, line.maxQuantity) }];
  return lines.map((l) => lineKey(l) === key ? { ...line, quantity: clamp(l.quantity + line.quantity, line.maxQuantity) } : l);
}
export function setQuantity(lines: CartLine[], key: string, qty: number): CartLine[] {
  if (qty <= 0) return removeLine(lines, key);
  return lines.map((l) => lineKey(l) === key ? { ...l, quantity: clamp(qty, l.maxQuantity) } : l);
}
export const removeLine = (lines: CartLine[], key: string) => lines.filter((l) => lineKey(l) !== key);
export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export function groupBySeller(lines: CartLine[]) {
  const map = new Map<string, { businessId: string; businessName: string; businessSlug: string; lines: CartLine[];
    subtotalKobo: number; deliveryAvailable: boolean; pickupAvailable: boolean }>();
  for (const l of lines) {
    const g = map.get(l.businessId) ?? { businessId: l.businessId, businessName: l.businessName, businessSlug: l.businessSlug,
      lines: [], subtotalKobo: 0, deliveryAvailable: true, pickupAvailable: true };
    g.lines.push(l); g.subtotalKobo += l.unitPriceKobo * l.quantity;
    g.deliveryAvailable &&= l.allowsDelivery; g.pickupAvailable &&= l.allowsPickup;
    map.set(l.businessId, g);
  }
  return [...map.values()];
}
