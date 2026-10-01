export const DEFAULT_CU_DOMAINS = ["stu.cu.edu.ng", "covenantuniversity.edu.ng"];
export function cuDomains(): string[] {
  const raw = process.env.NEXT_PUBLIC_CU_EMAIL_DOMAINS;
  const list = raw?.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  return list && list.length ? list : DEFAULT_CU_DOMAINS;
}
export function isCuEmail(email: string, domains: string[] = cuDomains()): boolean {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1) return false;
  return domains.includes(e.slice(at + 1));
}
