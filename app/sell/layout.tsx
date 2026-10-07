import { ShopShell } from "@/components/layout/ShopShell";

export default function SellLayout({ children }: LayoutProps<"/sell">) {
  return <ShopShell>{children}</ShopShell>;
}
