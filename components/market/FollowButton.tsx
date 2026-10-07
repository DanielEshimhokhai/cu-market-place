"use client";

import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { toggleSavedBusiness } from "@/lib/actions/saved";

export function FollowButton({ businessId, following }: { businessId: string; following: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(following);
  const [, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  return (
    <button
      type="button"
      aria-pressed={optimistic}
      className={buttonClass("secondary", "sm")}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          const r = await toggleSavedBusiness(businessId);
          if (r.requiresAuth) return router.push(`/auth/sign-in?next=${encodeURIComponent(pathname)}`);
          if (!r.ok) toast.show("Couldn't update. Try again.", { tone: "danger" });
          else {
            if (r.saved) toast.show("Following. You'll hear when they list something new.");
            router.refresh();
          }
        })
      }
    >
      {optimistic ? <Check size={15} strokeWidth={1.75} aria-hidden /> : <Plus size={15} strokeWidth={1.75} aria-hidden />}
      {optimistic ? "Following" : "Follow"}
    </button>
  );
}
