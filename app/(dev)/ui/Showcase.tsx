"use client";

import { useState } from "react";
import { Heart, PackageOpen } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { BottomSheet, Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { ToastProvider, useToast } from "@/components/ui/Toast";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-line pt-5">
      <h2 className="text-[13px] font-semibold text-muted">{title}</h2>
      {children}
    </section>
  );
}

function Inner() {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-xl font-semibold">UI primitives</h1>
      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Add to cart</Button>
          <Button variant="secondary">Message seller</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Delete</Button>
          <Button loading>Placing…</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <IconButton label="Save">
            <Heart size={18} strokeWidth={1.75} />
          </IconButton>
        </div>
      </Section>
      <Section title="Fields">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" htmlFor="f1" hint="Shown on your storefront.">
            <Input id="f1" placeholder="Daniel's Closet" />
          </Field>
          <Field label="Email" htmlFor="f2" error="Use your Covenant University email.">
            <Input id="f2" aria-invalid defaultValue="x@gmail.com" />
          </Field>
          <Field label="Category" htmlFor="f3">
            <Select id="f3">
              <option>Fashion</option>
              <option>Food</option>
            </Select>
          </Field>
          <Field label="Note" htmlFor="f4" optional>
            <Textarea id="f4" placeholder="Anything the seller should know?" />
          </Field>
        </div>
        <Checkbox label="In stock only" defaultChecked />
      </Section>
      <Section title="Badges & avatars">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Used</Badge>
          <Badge tone="accent">Confirmed</Badge>
          <Badge tone="success">Ready for pickup</Badge>
          <Badge tone="warning">Only 2 left</Badge>
          <Badge tone="danger">Cancelled</Badge>
          <Avatar name="Campus Bites" />
          <Avatar name="Daniel's Closet" size={48} square />
        </div>
      </Section>
      <Section title="Tabs">
        <Tabs
          active="products"
          tabs={[
            { id: "products", label: "Products", count: 5, href: "#" },
            { id: "reviews", label: "Reviews", count: 126, href: "#" },
            { id: "about", label: "About", href: "#" },
          ]}
        />
      </Section>
      <Section title="Overlays">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setModal(true)}>Open modal</Button>
          <Button variant="secondary" onClick={() => setSheet(true)}>Open bottom sheet</Button>
          <Button variant="secondary" onClick={() => toast.show("Added to cart", { action: { label: "View cart", href: "#" } })}>Toast</Button>
          <Dropdown
            label="Account"
            trigger={<Avatar name="Tobi Adeyemi" />}
            items={[{ label: "Account", href: "#" }, { label: "Sign out", onSelect: () => {}, danger: true }]}
          />
        </div>
        <Modal open={modal} onClose={() => setModal(false)} title="Cancel this order?" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(false)}>Keep order</Button><Button variant="danger">Cancel order</Button></div>}>
          <p className="text-sm text-muted">The seller will be notified. This can&apos;t be undone.</p>
        </Modal>
        <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Filters" footer={<Button className="w-full" onClick={() => setSheet(false)}>Show 48 results</Button>}>
          <div className="space-y-1">
            {["Fashion", "Food", "Electronics", "Beauty", "Services"].map((c) => <Checkbox key={c} type="radio" name="c" label={c} />)}
          </div>
        </BottomSheet>
      </Section>
      <Section title="Skeleton & empty state">
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="aspect-[4/5]" />
        </div>
        <EmptyState icon={PackageOpen} title="No orders yet." body="Your purchases will appear here." action={{ label: "Browse the marketplace", href: "#" }} />
      </Section>
    </div>
  );
}

export function Showcase() {
  return (
    <ToastProvider>
      <Inner />
    </ToastProvider>
  );
}
