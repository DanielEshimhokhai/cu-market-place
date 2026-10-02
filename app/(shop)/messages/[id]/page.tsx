import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { VerifiedBadge } from "@/components/market/VerifiedBadge";
import { ConversationList } from "@/components/messages/ConversationList";
import { Thread } from "@/components/messages/Thread";
import { Avatar } from "@/components/ui/Avatar";
import { requireViewer } from "@/lib/auth";
import { getInbox, getThread } from "@/lib/queries/messages";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer(`/messages/${id}`);
  const [thread, inbox] = await Promise.all([getThread(id, viewer), getInbox(viewer)]);
  if (!thread) notFound();
  const c = thread.counterpart;
  const name = (
    <span className="flex items-center gap-1 text-[15px] font-medium text-ink">
      {c.name}
      {c.verified && <VerifiedBadge />}
    </span>
  );

  return (
    <div className="-mx-4 md:mx-0 md:pt-6">
      <div className="grid h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-9rem)] md:grid-cols-[320px_minmax(0,1fr)] md:overflow-hidden md:rounded-card md:border md:border-line md:bg-surface">
        <aside className="hidden overflow-y-auto border-r border-line md:block">
          <ConversationList items={inbox} activeId={thread.id} />
        </aside>
        <section className="flex min-h-0 flex-col bg-canvas md:bg-canvas">
          <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
            <Link href="/messages" aria-label="Back to messages" className="-ml-1 inline-flex size-8 items-center justify-center rounded-control text-muted hover:bg-subtle md:hidden">
              <ChevronLeft size={18} />
            </Link>
            <Avatar name={c.name} src={c.avatar} size={32} square={thread.role === "buyer"} />
            <div className="min-w-0">
              {c.href ? <Link href={c.href} className="hover:underline">{name}</Link> : name}
              <p className="truncate text-xs text-muted">
                {thread.order ? `Regarding: Order #${thread.order.number}` : thread.product ? `Regarding: ${thread.product.title}` : thread.role === "seller" ? "Buyer" : "Seller"}
              </p>
            </div>
          </header>
          <Thread thread={thread} />
        </section>
      </div>
    </div>
  );
}
