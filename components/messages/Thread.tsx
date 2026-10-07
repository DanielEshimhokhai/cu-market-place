"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp } from "lucide-react";
import { OrderStatusBadge } from "@/components/market/OrderStatus";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/money";
import { markConversationRead, sendMessage } from "@/lib/actions/messages";
import type { Message, Thread as ThreadData } from "@/lib/queries/messages";
import { createBrowserClient } from "@/lib/supabase/client";

const PROMPTS = ["Is this available?", "Where can I pick this up?", "Can I order this today?", "Do you offer delivery?"];

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const key = (x: Date) => x.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" });
  if (key(d) === key(today)) return "Today";
  if (key(d) === key(new Date(today.getTime() - 86_400_000))) return "Yesterday";
  return d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" });
};
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });

type Pending = Message & { pending?: boolean; failed?: boolean };

export function Thread({ thread }: { thread: ThreadData }) {
  const [messages, setMessages] = useState<Pending[]>(thread.messages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Live updates: new messages in this conversation (RLS limits the stream to participants).
  useEffect(() => {
    void markConversationRead(thread.id);
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`conversation:${thread.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${thread.id}` }, (payload: { new: Record<string, unknown> }) => {
        const m = payload.new as unknown as Message;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.sender_id !== thread.viewerId) void markConversationRead(thread.id);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [thread.id, thread.viewerId]);

  const send = (body: string) => {
    const text = body.trim();
    if (!text) return;
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, sender_id: thread.viewerId, body: text, created_at: new Date().toISOString(), product_id: null, order_id: null, pending: true }]);
    setDraft("");
    setError(null);
    start(async () => {
      const r = await sendMessage(thread.id, text);
      if (!r.ok) {
        setError(r.error);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
        return;
      }
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        return withoutTemp.some((m) => m.id === r.message.id) ? withoutTemp : [...withoutTemp, r.message];
      });
    });
  };

  const showPrompts = thread.role === "buyer" && !messages.some((m) => m.sender_id !== thread.viewerId) && messages.length < 2;
  const dayHeaders = messages.map((m, i) => {
    const day = dayLabel(m.created_at);
    return i === 0 || dayLabel(messages[i - 1].created_at) !== day ? day : null;
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      {(thread.product || thread.order) && (
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
          {thread.product && (
            <Link href={`/p/${thread.product.slug}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80">
              <span className="relative size-10 shrink-0 overflow-hidden rounded-control bg-subtle">
                {thread.product.image && <Image src={thread.product.image} alt="" fill sizes="40px" className="object-cover" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-ink">{thread.product.title}</span>
                <span className="tabular block text-xs text-muted">{formatNaira(thread.product.price_kobo)}</span>
              </span>
            </Link>
          )}
          {thread.order && (
            <Link href={thread.order.href} className="flex shrink-0 items-center gap-2 text-xs text-muted hover:text-ink">
              Order #{thread.order.number} <OrderStatusBadge status={thread.order.status} />
            </Link>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            {thread.role === "buyer" ? "Ask the seller anything about this listing." : "No messages yet."}
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === thread.viewerId;
          const header = dayHeaders[i];
          return (
            <div key={m.id}>
              {header && <p className="py-2 text-center text-[11px] font-medium text-faint">{header}</p>}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[78%] rounded-card px-3 py-2 text-sm leading-5 whitespace-pre-line",
                    mine ? "bg-ink text-white" : "border border-line bg-surface text-ink",
                    m.pending && "opacity-70",
                    m.failed && "bg-danger",
                  )}
                >
                  {m.body}
                  <span className={cn("mt-0.5 block text-right text-[10px]", mine ? "text-white/60" : "text-faint")}>
                    {m.failed ? "Not sent" : m.pending ? "Sending…" : timeLabel(m.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <div className="border-t border-line bg-surface px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        {showPrompts && (
          <div className="no-scrollbar -mx-3 mb-2 flex gap-1.5 overflow-x-auto px-3">
            {PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setDraft(p);
                  textarea.current?.focus();
                }}
                className="shrink-0 rounded-full border border-line px-3 py-1 text-[13px] text-ink hover:bg-subtle"
              >
                {p}
              </button>
            ))}
          </div>
        )}
        {error && <p role="alert" className="mb-1.5 text-xs text-danger">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={textarea}
            aria-label="Message"
            rows={1}
            value={draft}
            maxLength={2000}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 768px)").matches) {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder="Write a message"
            className="max-h-[120px] min-h-10 flex-1 resize-none rounded-control border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-ink focus:bg-surface"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!draft.trim()}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-control bg-accent text-white transition-colors duration-150 hover:bg-accent-hover disabled:opacity-40"
          >
            <ArrowUp size={18} strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
}
