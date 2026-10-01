import { SearchX } from "lucide-react";
import { ShopShell } from "@/components/layout/ShopShell";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <ShopShell>
      <div className="py-12">
        <EmptyState
          icon={SearchX}
          title="Page not found"
          body="The link may be broken, or the listing was removed."
          action={{ label: "Browse the marketplace", href: "/browse" }}
        />
      </div>
    </ShopShell>
  );
}
