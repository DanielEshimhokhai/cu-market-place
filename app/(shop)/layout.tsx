import { ShopShell } from "@/components/layout/ShopShell";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return <ShopShell>{children}</ShopShell>;
}
