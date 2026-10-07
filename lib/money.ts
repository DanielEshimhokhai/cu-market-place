export function formatNaira(kobo: number): string {
  const hasKobo = kobo % 100 !== 0;
  return "₦" + (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: hasKobo ? 2 : 0, maximumFractionDigits: 2 });
}
export function nairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}
