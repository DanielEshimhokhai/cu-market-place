import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { NotificationList } from "@/components/layout/NotificationList";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireViewer } from "@/lib/auth";
import { getNotifications } from "@/lib/queries/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const viewer = await requireViewer("/notifications");
  const items = await getNotifications(viewer.id);
  return (
    <div className="mx-auto max-w-2xl pt-6 md:pt-10">
      <h1 className="mb-4 text-[22px] font-semibold tracking-tight">Notifications</h1>
      {items.length ? (
        <NotificationList items={items} />
      ) : (
        <EmptyState icon={Bell} title="You're all caught up." body="Order updates, replies and price drops will appear here." />
      )}
    </div>
  );
}
