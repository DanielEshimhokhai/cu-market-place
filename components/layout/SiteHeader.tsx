import Link from "next/link";
import { MessageSquare, Search } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/market/SearchBar";
import { AccountMenu } from "./AccountMenu";
import { CartButton } from "./CartButton";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { countUnreadConversations } from "@/lib/queries/messages";
import { NotificationBell } from "./NotificationBell";

async function unreadCount(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

export async function SiteHeader() {
  const viewer = await getViewer();
  const [unread, unreadMessages] = viewer ? await Promise.all([unreadCount(viewer.id), countUnreadConversations(viewer)]) : [0, 0];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 md:h-16 md:gap-6 md:px-6">
        <Logo />
        <div className="hidden min-w-0 flex-1 md:block md:max-w-[440px]">
          <SearchBar size="md" />
        </div>
        <div className="flex-1 md:hidden" />
        <NavLinks signedIn={!!viewer} />
        <div className="flex items-center gap-1 md:ml-auto">
          <Link href="/search" aria-label="Search" className="inline-flex size-9 items-center justify-center rounded-control text-ink hover:bg-subtle md:hidden">
            <Search size={20} strokeWidth={1.75} />
          </Link>
          {viewer && (
            <>
              <Button href={viewer.businessId ? "/sell" : "/sell/onboarding"} variant="secondary" size="sm" className="mr-1 hidden md:inline-flex">
                Sell
              </Button>
              <Link
                href="/messages"
                aria-label={unreadMessages ? `Messages, ${unreadMessages} unread` : "Messages"}
                className="relative hidden size-9 items-center justify-center rounded-control text-ink hover:bg-subtle md:inline-flex"
              >
                <MessageSquare size={20} strokeWidth={1.75} />
                {unreadMessages > 0 && <span aria-hidden className="absolute top-1.5 right-1.5 size-2 rounded-full border-2 border-surface bg-accent" />}
              </Link>
              <span className="hidden md:inline-flex">
                <NotificationBell unread={unread} userId={viewer.id} />
              </span>
            </>
          )}
          <CartButton />
          {viewer ? (
            <span className="ml-1 hidden md:inline-flex">
              <AccountMenu name={viewer.fullName} email={viewer.email} hasBusiness={!!viewer.businessId} isAdmin={viewer.role === "admin"} />
            </span>
          ) : (
            <div className="ml-1 hidden items-center gap-2 md:flex">
              <Button href="/auth/sign-in" variant="ghost" size="sm">Sign in</Button>
              <Button href="/auth/sign-up" size="sm">Create account</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
