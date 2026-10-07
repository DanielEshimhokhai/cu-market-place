import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { ConversationList } from "@/components/messages/ConversationList";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireViewer } from "@/lib/auth";
import { getInbox } from "@/lib/queries/messages";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const viewer = await requireViewer("/messages");
  const [items, sp] = await Promise.all([getInbox(viewer), searchParams]);
  return (
    <div className="pt-6 md:pt-10">
      <h1 className="text-[22px] font-semibold tracking-tight">Messages</h1>
      {sp.error === "start" && <p className="mt-3 text-sm text-danger">We couldn&apos;t open that conversation. The listing or store may no longer be available.</p>}
      {items.length ? (
        <div className="mt-4 overflow-hidden rounded-card border border-line bg-surface md:max-w-2xl">
          <ConversationList items={items} />
        </div>
      ) : (
        <EmptyState className="mt-6" icon={MessageSquare} title="No messages yet." body="Questions you ask sellers will show up here." action={{ label: "Browse the marketplace", href: "/browse" }} />
      )}
    </div>
  );
}
