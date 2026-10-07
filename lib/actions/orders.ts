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
  const { error } = await supabase
    .rpc("set_order_status", { p_order_id: orderId, p_status: status, p_instructions: instructions ?? null })
    .single();
  if (error) {
    const code = Object.keys(MESSAGES).find((k) => error.message.includes(k));
    return { ok: false, error: code ? MESSAGES[code] : "Couldn't update the order. Try again." };
  }

  // A cancellation reason goes to the other party as a message on the order's conversation.
  // start_order_conversation works for buyer and seller alike and targets this order's thread.
  if (status === "cancelled" && reason) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: started } = await supabase.rpc("start_order_conversation", { p_order_id: orderId });
    const conversationId = started as string | null;
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
