"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/lib/queries/messages";

const sendSchema = z.object({ conversationId: z.uuid(), body: z.string().trim().min(1, "Write a message").max(2000, "Keep it under 2,000 characters") });

export async function sendMessage(conversationId: string, body: string): Promise<{ ok: true; message: Message } | { ok: false; error: string }> {
  const parsed = sendSchema.safeParse({ conversationId, body });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to send messages." };
  // RLS only lets participants insert, and only as themselves.
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: parsed.data.conversationId, sender_id: user.id, body: parsed.data.body })
    .select("id, sender_id, body, created_at, product_id, order_id")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't send. Check your connection and try again." };
  revalidatePath("/messages");
  return { ok: true, message: data as Message };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  if (!z.uuid().safeParse(conversationId).success) return;
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
}
