"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";

const schema = z.object({
  orderId: z.uuid(),
  status: z.enum(["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "completed", "cancelled"]),
  instructions: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(300).optional(),
});

const MESSAGES: Record<string, string> = {
  INVALID_TRANSITION: "This order has already moved on. Refresh to see its latest status.",
  NOT_ALLOWED: "You can't make that change to this order.",
  NOT_FOUND: "Order not found.",
  NOT_AUTHENTICATED: "Sign in again to continue.",
};

/** Wraps set_order_status: the database enforces who may make which transition. */
export async function updateOrderStatus(input: z.input<typeof schema>): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { orderId, status, instructions, reason } = parsed.data;
  const supabase = await createClient();
  const { data: order, error } = await supabase
    .rpc("set_order_status", { p_order_id: orderId, p_status: status, p_instructions: instructions ?? null })
    .single();
  if (error) {
    const code = Object.keys(MESSAGES).find((k) => error.message.includes(k));
    return { ok: false, error: code ? MESSAGES[code] : "Couldn't update the order. Try again." };
  }

  // A cancellation reason goes to the other party as a message on the order's conversation.
  if (status === "cancelled" && reason) {
    const o = order as { business_id: string; buyer_id: string };
    const { data: { user } } = await supabase.auth.getUser();
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("buyer_id", o.buyer_id)
      .eq("business_id", o.business_id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    let conversationId = conv?.id as string | undefined;
    if (!conversationId && user?.id === o.buyer_id) {
      const { data: started } = await supabase.rpc("start_conversation", { p_business_id: o.business_id, p_order_id: orderId });
      conversationId = started as string | undefined;
    }
    if (conversationId && user) {
      await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, body: `Order cancelled: ${reason}`, order_id: orderId });
    }
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/sell");
  revalidatePath("/sell/orders");
  revalidatePath(`/sell/orders/${orderId}`);
  return { ok: true };
}
