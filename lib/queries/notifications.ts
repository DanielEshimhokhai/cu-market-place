import "server-only";
import { createClient } from "@/lib/supabase/server";

export type NotificationRow = { id: string; type: string; title: string; body: string | null; href: string | null; read_at: string | null; created_at: string };

export async function getNotifications(userId: string, limit = 60): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, href, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as NotificationRow[];
}
