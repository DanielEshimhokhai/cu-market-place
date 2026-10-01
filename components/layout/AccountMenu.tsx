"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Dropdown, type DropdownItem } from "@/components/ui/Dropdown";
import { signOut } from "@/app/auth/actions";

type Props = { name: string; email: string; hasBusiness: boolean; isAdmin: boolean };

export function AccountMenu({ name, email, hasBusiness, isAdmin }: Props) {
  const items: DropdownItem[] = [
    { label: "Account", href: "/account" },
    { label: "Messages", href: "/messages" },
    hasBusiness ? { label: "Seller dashboard", href: "/sell" } : { label: "Start selling", href: "/sell/onboarding" },
    ...(isAdmin ? [{ label: "Admin", href: "/admin" }] : []),
    { label: "Sign out", onSelect: () => void signOut() },
  ];
  return (
    <Dropdown
      label="Account menu"
      trigger={<Avatar name={name || email} size={32} />}
      header={
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{name || "Your account"}</p>
          <p className="truncate text-xs text-muted">{email}</p>
        </div>
      }
      items={items}
    />
  );
}
